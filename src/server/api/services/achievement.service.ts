import { PrismaClient, SystemStatus, StudentAchievement } from '@prisma/client';

export interface AchievementServiceContext {
  prisma: PrismaClient;
}

export interface CreateAchievementInput {
  studentId: string;
  title: string;
  description: string;
  type: string;
  classId?: string;
  subjectId?: string;
  progress: number;
  total: number;
  icon?: string;
}

export interface UpdateAchievementProgressInput {
  id: string;
  progress: number;
  unlocked?: boolean;
}

export class AchievementService {
  private prisma: PrismaClient;

  constructor({ prisma }: AchievementServiceContext) {
    this.prisma = prisma;
  }

  /**
   * Create a new achievement for a student
   */
  async createAchievement(data: CreateAchievementInput): Promise<StudentAchievement> {
    const { studentId, title, description, type, classId, subjectId, progress, total, icon } = data;

    // Check if achievement already exists
    const existingAchievement = await this.prisma.studentAchievement.findFirst({
      where: {
        studentId,
        title,
        type,
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        status: SystemStatus.ACTIVE,
      },
    });

    if (existingAchievement) {
      return existingAchievement;
    }

    // Create new achievement
    return this.prisma.studentAchievement.create({
      data: {
        studentId,
        title,
        description,
        type,
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        progress,
        total,
        unlocked: progress >= total,
        unlockedAt: progress >= total ? new Date() : null,
        icon,
      },
    });
  }

  /**
   * Update achievement progress
   */
  async updateAchievementProgress(data: UpdateAchievementProgressInput): Promise<StudentAchievement> {
    const { id, progress, unlocked } = data;

    const achievement = await this.prisma.studentAchievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      throw new Error(`Achievement with ID ${id} not found`);
    }

    const wasUnlocked = achievement.unlocked;
    const isNowUnlocked = unlocked !== undefined ? unlocked : progress >= achievement.total;
    const unlockedNow = !wasUnlocked && isNowUnlocked;

    return this.prisma.studentAchievement.update({
      where: { id },
      data: {
        progress,
        unlocked: isNowUnlocked,
        ...(unlockedNow && { unlockedAt: new Date() }),
      },
    });
  }

  /**
   * Get achievements for a student
   */
  async getStudentAchievements(studentId: string, options?: {
    type?: string;
    classId?: string;
    subjectId?: string;
    unlocked?: boolean;
  }): Promise<StudentAchievement[]> {
    const { type, classId, subjectId, unlocked } = options || {};

    return this.prisma.studentAchievement.findMany({
      where: {
        studentId,
        ...(type && { type }),
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
        ...(unlocked !== undefined && { unlocked }),
        status: SystemStatus.ACTIVE,
      },
      orderBy: [
        { unlocked: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  /**
   * Get a specific achievement by ID
   */
  async getAchievementById(id: string): Promise<StudentAchievement | null> {
    return this.prisma.studentAchievement.findUnique({
      where: { id },
    });
  }

  /**
   * Check and update achievement progress
   * Returns true if the achievement was unlocked during this update
   */
  async checkAndUpdateProgress(
    achievementId: string,
    progressIncrement: number = 1
  ): Promise<{ achievement: StudentAchievement; newlyUnlocked: boolean }> {
    const achievement = await this.prisma.studentAchievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      throw new Error(`Achievement with ID ${achievementId} not found`);
    }

    const wasUnlocked = achievement.unlocked;
    const newProgress = Math.min(achievement.progress + progressIncrement, achievement.total);
    const isNowUnlocked = newProgress >= achievement.total;
    const newlyUnlocked = !wasUnlocked && isNowUnlocked;

    const updatedAchievement = await this.prisma.studentAchievement.update({
      where: { id: achievementId },
      data: {
        progress: newProgress,
        unlocked: isNowUnlocked,
        ...(newlyUnlocked && { unlockedAt: new Date() }),
      },
    });

    return { achievement: updatedAchievement, newlyUnlocked };
  }

  /**
   * Delete an achievement
   */
  async deleteAchievement(id: string): Promise<StudentAchievement> {
    return this.prisma.studentAchievement.update({
      where: { id },
      data: { status: SystemStatus.DELETED },
    });
  }

  /**
   * Check and award achievements when a student completes an activity
   */
  async checkAndAwardActivityAchievements(data: {
    studentId: string;
    activityId: string;
    classId: string;
    score?: number;
    maxScore?: number;
    timeSpentMinutes?: number;
  }): Promise<StudentAchievement[]> {
    const { studentId, activityId, classId, score, maxScore, timeSpentMinutes } = data;
    const newAchievements: StudentAchievement[] = [];

    try {
      // Get activity details
      const activity = await this.prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          subject: { select: { name: true } }
        }
      });

      if (!activity) {
        return newAchievements;
      }

      const activityMaxScore = maxScore || activity.maxScore || 100;
      const scorePercentage = score ? (score / activityMaxScore) * 100 : 0;

      // 1. First Activity Completion Achievement
      const completedActivitiesCount = await this.prisma.activityGrade.count({
        where: {
          studentId,
          activity: { classId },
          status: { in: ['SUBMITTED', 'GRADED', 'COMPLETED'] }
        }
      });

      if (completedActivitiesCount === 1) {
        const firstActivityAchievement = await this.createAchievement({
          studentId,
          title: "Getting Started",
          description: "Completed your first activity!",
          type: "first_activity",
          classId,
          progress: 1,
          total: 1,
          icon: "🎯"
        });
        newAchievements.push(firstActivityAchievement);
      }

      // 2. Perfect Score Achievement
      if (scorePercentage >= 100) {
        const perfectScoreAchievement = await this.createAchievement({
          studentId,
          title: "Perfect Score!",
          description: `Achieved 100% on ${activity.title}`,
          type: "perfect_score",
          classId,
          subjectId: activity.subjectId,
          progress: 1,
          total: 1,
          icon: "💯"
        });
        newAchievements.push(perfectScoreAchievement);
      }

      // 3. High Achiever (90%+)
      if (scorePercentage >= 90 && scorePercentage < 100) {
        const highAchieverAchievement = await this.createAchievement({
          studentId,
          title: "High Achiever",
          description: `Scored 90%+ on ${activity.title}`,
          type: "high_achiever",
          classId,
          subjectId: activity.subjectId,
          progress: 1,
          total: 1,
          icon: "⭐"
        });
        newAchievements.push(highAchieverAchievement);
      }

      // 4. Speed Demon (completed in < 5 minutes)
      if (timeSpentMinutes && timeSpentMinutes < 5) {
        const speedDemonAchievement = await this.createAchievement({
          studentId,
          title: "Speed Demon",
          description: `Completed ${activity.title} in under 5 minutes!`,
          type: "speed_demon",
          classId,
          progress: 1,
          total: 1,
          icon: "⚡"
        });
        newAchievements.push(speedDemonAchievement);
      }

      // 5. Milestone Achievements (5, 10, 25, 50 activities)
      const milestones = [5, 10, 25, 50];
      for (const milestone of milestones) {
        if (completedActivitiesCount === milestone) {
          const milestoneAchievement = await this.createAchievement({
            studentId,
            title: `${milestone} Activities Completed`,
            description: `Great progress! You've completed ${milestone} activities.`,
            type: "activity_milestone",
            classId,
            progress: milestone,
            total: milestone,
            icon: milestone >= 50 ? "🏆" : milestone >= 25 ? "🥇" : milestone >= 10 ? "🥈" : "🥉"
          });
          newAchievements.push(milestoneAchievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking and awarding achievements:', error);
      return newAchievements;
    }
  }
}
