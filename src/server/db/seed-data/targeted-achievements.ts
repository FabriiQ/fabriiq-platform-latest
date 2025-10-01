import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Targeted achievements and points seeding for Year 8 C class only
 * Creates student achievements, points, and leaderboard data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🏆 Starting targeted achievements seeding for Year 8 C...');

  try {
    await seedTargetedAchievements();
    console.log('✅ Targeted achievements seeding completed successfully');
  } catch (error) {
    console.error('❌ Error in targeted achievements seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTargetedAchievements() {
  console.log('Generating achievements for Year 8 C class...');

  try {
    // Get Year 8 C class with students and their performance data
    const targetClass = await prisma.class.findFirst({
      where: {
        name: { contains: 'Year 8 C' },
        status: SystemStatus.ACTIVE
      },
      include: {
        subjects: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                user: {
                  include: {
                    activityGrades: {
                      where: { status: 'GRADED' },
                      include: {
                        activity: {
                          include: { subject: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!targetClass) {
      console.log('❌ Year 8 C class not found');
      return;
    }

    console.log(`🏆 Processing achievements for ${targetClass.name} with ${targetClass.enrollments.length} students`);

    // Generate achievements for each student
    await generateStudentAchievementsForClass(targetClass);
    
    // Generate points based on performance
    await generateStudentPointsForClass(targetClass);
    
    // Generate points aggregates and leaderboard
    await generatePointsAggregatesForClass(targetClass);
    
    // Generate student levels
    await generateStudentLevelsForClass(targetClass);

  } catch (error) {
    console.error('Error generating targeted achievements:', error);
    throw error;
  }
}

async function generateStudentAchievementsForClass(classData: any) {
  console.log('🏅 Generating student achievements...');

  const achievementTypes = [
    { type: 'LOGIN_STREAK', name: 'Consistent Learner', description: 'Logged in for 7 consecutive days' },
    { type: 'ACTIVITY_COMPLETION', name: 'Task Master', description: 'Completed 10 activities' },
    { type: 'PERFECT_SCORE', name: 'Perfectionist', description: 'Achieved perfect score on an activity' },
    { type: 'SUBJECT_MASTERY', name: 'Subject Expert', description: 'Mastered a subject' },
    { type: 'BLOOMS_PROGRESSION', name: 'Critical Thinker', description: 'Reached higher-order thinking levels' },
    { type: 'TIME_INVESTMENT', name: 'Dedicated Student', description: 'Spent significant time learning' }
  ];

  let achievementsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing achievements for: ${student.name}`);

    const grades = student.activityGrades;
    const completedActivities = grades.length;
    const perfectScores = grades.filter((g: any) => g.score === g.maxScore).length;
    const averageScore = grades.length > 0 ? grades.reduce((sum: number, g: any) => sum + g.score, 0) / grades.length : 0;

    // Generate 3-5 achievements per student based on their performance
    const studentAchievements = [];

    // Login streak achievement (everyone gets this)
    studentAchievements.push({
      type: 'LOGIN_STREAK',
      name: 'Consistent Learner',
      description: 'Logged in for 7 consecutive days',
      earnedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
    });

    // Activity completion achievement
    if (completedActivities >= 5) {
      studentAchievements.push({
        type: 'ACTIVITY_COMPLETION',
        name: 'Task Master',
        description: `Completed ${completedActivities} activities`,
        earnedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
      });
    }

    // Perfect score achievement
    if (perfectScores > 0) {
      studentAchievements.push({
        type: 'PERFECT_SCORE',
        name: 'Perfectionist',
        description: `Achieved ${perfectScores} perfect score${perfectScores > 1 ? 's' : ''}`,
        earnedAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
      });
    }

    // Subject mastery achievement (for high performers)
    if (averageScore >= 80) {
      studentAchievements.push({
        type: 'SUBJECT_MASTERY',
        name: 'Subject Expert',
        description: 'Demonstrated mastery across subjects',
        earnedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
      });
    }

    // Bloom's progression achievement (for analytical thinkers)
    if (averageScore >= 70) {
      studentAchievements.push({
        type: 'BLOOMS_PROGRESSION',
        name: 'Critical Thinker',
        description: 'Demonstrated higher-order thinking skills',
        earnedAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000)
      });
    }

    // Create achievements in database
    for (const achievement of studentAchievements) {
      // Check if achievement already exists
      const existing = await prisma.studentAchievement.findFirst({
        where: {
          studentId: student.id,
          type: achievement.type
        }
      });

      if (existing) {
        console.log(`    Skipping existing achievement: ${achievement.name}`);
        continue;
      }

      await prisma.studentAchievement.create({
        data: {
          studentId: student.id,
          type: achievement.type,
          name: achievement.name,
          description: achievement.description,
          earnedAt: achievement.earnedAt,
          metadata: {
            classId: classData.id,
            className: classData.name,
            completedActivities,
            perfectScores,
            averageScore: Math.round(averageScore)
          }
        }
      });

      achievementsCreated++;
      console.log(`    Created achievement: ${achievement.name}`);
    }
  }

  console.log(`✅ Created ${achievementsCreated} student achievements`);
}

async function generateStudentPointsForClass(classData: any) {
  console.log('💎 Generating student points...');

  let pointsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing points for: ${student.name}`);

    const grades = student.activityGrades;

    for (const grade of grades) {
      // Check if points already exist for this grade
      const existing = await prisma.studentPoints.findFirst({
        where: {
          studentId: student.id,
          sourceType: 'ACTIVITY_GRADE',
          sourceId: grade.id
        }
      });

      if (existing) {
        console.log(`    Skipping existing points for grade: ${grade.id}`);
        continue;
      }

      // Calculate points based on performance
      const percentage = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
      let points = 0;

      if (percentage >= 90) points = 15; // Excellent
      else if (percentage >= 80) points = 12; // Good
      else if (percentage >= 70) points = 8;  // Satisfactory
      else if (percentage >= 60) points = 5;  // Needs improvement
      else points = 2; // Attempted

      // Bonus for perfect scores
      if (grade.score === grade.maxScore && grade.maxScore > 0) {
        points += 5;
      }

      await prisma.studentPoints.create({
        data: {
          studentId: student.id,
          points,
          sourceType: 'ACTIVITY_GRADE',
          sourceId: grade.id,
          description: `Activity: ${grade.activity?.title || 'Unknown'} (${Math.round(percentage)}%)`,
          earnedAt: grade.gradedAt || new Date(),
          metadata: {
            activityId: grade.activityId,
            subjectId: grade.activity?.subjectId,
            score: grade.score,
            maxScore: grade.maxScore,
            percentage: Math.round(percentage)
          }
        }
      });

      pointsCreated++;
      console.log(`    Created ${points} points for activity: ${grade.activity?.title || 'Unknown'}`);
    }

    // Add achievement bonus points
    const achievements = await prisma.studentAchievement.findMany({
      where: { studentId: student.id }
    });

    for (const achievement of achievements) {
      // Check if achievement points already exist
      const existing = await prisma.studentPoints.findFirst({
        where: {
          studentId: student.id,
          sourceType: 'ACHIEVEMENT',
          sourceId: achievement.id
        }
      });

      if (existing) continue;

      await prisma.studentPoints.create({
        data: {
          studentId: student.id,
          points: 25, // Bonus points for achievements
          sourceType: 'ACHIEVEMENT',
          sourceId: achievement.id,
          description: `Achievement: ${achievement.name}`,
          earnedAt: achievement.earnedAt,
          metadata: {
            achievementType: achievement.type,
            achievementName: achievement.name
          }
        }
      });

      pointsCreated++;
      console.log(`    Created 25 bonus points for achievement: ${achievement.name}`);
    }
  }

  console.log(`✅ Created ${pointsCreated} student points records`);
}

async function generatePointsAggregatesForClass(classData: any) {
  console.log('📊 Generating points aggregates and leaderboard...');

  let aggregatesCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;

    // Check if aggregate already exists
    const existing = await prisma.studentPointsAggregate.findUnique({
      where: { studentId: student.id }
    });

    if (existing) {
      console.log(`  Skipping existing aggregate for: ${student.name}`);
      continue;
    }

    // Calculate total points
    const pointsRecords = await prisma.studentPoints.findMany({
      where: { studentId: student.id }
    });

    const totalPoints = pointsRecords.reduce((sum, p) => sum + p.points, 0);
    const lastEarnedAt = pointsRecords.length > 0 ? 
      new Date(Math.max(...pointsRecords.map(p => p.earnedAt.getTime()))) : 
      new Date();

    await prisma.studentPointsAggregate.create({
      data: {
        studentId: student.id,
        totalPoints,
        lastEarnedAt,
        classRank: 1, // Will be updated after all aggregates are created
        campusRank: 1,
        classPercentile: 100,
        campusPercentile: 100
      }
    });

    aggregatesCreated++;
    console.log(`  Created aggregate for: ${student.name} (${totalPoints} points)`);
  }

  // Update rankings
  await updateClassRankings(classData.id);

  console.log(`✅ Created ${aggregatesCreated} points aggregates with rankings`);
}

async function updateClassRankings(classId: string) {
  console.log('🏆 Updating class rankings...');

  // Get all students in the class with their points
  const classStudents = await prisma.studentEnrollment.findMany({
    where: { 
      classId,
      status: 'ACTIVE'
    },
    include: {
      student: {
        include: {
          user: {
            include: {
              pointsAggregate: true
            }
          }
        }
      }
    }
  });

  // Sort by total points (descending)
  const sortedStudents = classStudents
    .filter(e => e.student.user.pointsAggregate)
    .sort((a, b) => b.student.user.pointsAggregate!.totalPoints - a.student.user.pointsAggregate!.totalPoints);

  // Update rankings
  for (let i = 0; i < sortedStudents.length; i++) {
    const student = sortedStudents[i];
    const rank = i + 1;
    const percentile = Math.round(((sortedStudents.length - rank + 1) / sortedStudents.length) * 100);

    await prisma.studentPointsAggregate.update({
      where: { studentId: student.student.userId },
      data: {
        classRank: rank,
        classPercentile: percentile,
        campusRank: rank, // Simplified for demo
        campusPercentile: percentile
      }
    });

    console.log(`  Updated ranking for ${student.student.user.name}: Rank ${rank} (${percentile}th percentile)`);
  }
}

async function generateStudentLevelsForClass(classData: any) {
  console.log('🎯 Generating student levels...');

  let levelsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;

    // Check if level already exists
    const existing = await prisma.studentLevel.findUnique({
      where: { studentId: student.id }
    });

    if (existing) {
      console.log(`  Skipping existing level for: ${student.name}`);
      continue;
    }

    // Get total points to determine level
    const pointsAggregate = await prisma.studentPointsAggregate.findUnique({
      where: { studentId: student.id }
    });

    const totalPoints = pointsAggregate?.totalPoints || 0;

    // Determine level based on points
    let level = 1;
    let levelName = 'Beginner';
    
    if (totalPoints >= 500) { level = 7; levelName = 'Master'; }
    else if (totalPoints >= 400) { level = 6; levelName = 'Expert'; }
    else if (totalPoints >= 300) { level = 5; levelName = 'Advanced'; }
    else if (totalPoints >= 200) { level = 4; levelName = 'Proficient'; }
    else if (totalPoints >= 100) { level = 3; levelName = 'Intermediate'; }
    else if (totalPoints >= 50) { level = 2; levelName = 'Novice'; }

    const pointsToNext = level < 7 ? [50, 100, 200, 300, 400, 500, 1000][level] - totalPoints : 0;

    await prisma.studentLevel.create({
      data: {
        studentId: student.id,
        currentLevel: level,
        levelName,
        totalPoints,
        pointsToNextLevel: Math.max(0, pointsToNext),
        lastLevelUpAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }
    });

    levelsCreated++;
    console.log(`  Created level for: ${student.name} - Level ${level} (${levelName}) with ${totalPoints} points`);
  }

  console.log(`✅ Created ${levelsCreated} student levels`);
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { seedTargetedAchievements };
