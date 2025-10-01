import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Comprehensive student achievements and points seeding
 * Creates achievements, student points, and leaderboard data
 */

export async function seedStudentAchievementsAndPoints(prisma: PrismaClient) {
  console.log('🏆 Starting student achievements and points seeding...');

  try {
    // Generate student achievements
    await generateStudentAchievements(prisma);
    
    // Generate student points
    await generateStudentPoints(prisma);
    
    // Generate student points aggregates
    await generateStudentPointsAggregates(prisma);
    
    // Generate student levels
    await generateStudentLevels(prisma);

    console.log('✅ Student achievements and points seeding completed');

  } catch (error) {
    console.error('Error in student achievements and points seeding:', error);
    throw error;
  }
}

async function generateStudentAchievements(prisma: PrismaClient) {
  console.log('Generating student achievements...');

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
        studentProfile: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: {
              include: {
                subjects: true
              }
            }
          }
        }
      }
    });

    console.log(`Processing achievements for ${students.length} students`);

    // Define achievement types
    const achievementTypes = [
      {
        type: 'login_streak',
        title: 'Daily Learner',
        description: 'Log in for 7 consecutive days',
        total: 7,
        icon: '🔥'
      },
      {
        type: 'activity_completion',
        title: 'Activity Master',
        description: 'Complete 50 activities',
        total: 50,
        icon: '📚'
      },
      {
        type: 'perfect_score',
        title: 'Perfect Score',
        description: 'Get 100% on 10 activities',
        total: 10,
        icon: '⭐'
      },
      {
        type: 'subject_mastery',
        title: 'Subject Expert',
        description: 'Achieve 90% average in a subject',
        total: 90,
        icon: '🎓'
      },
      {
        type: 'bloom_progression',
        title: 'Critical Thinker',
        description: 'Demonstrate all Bloom\'s levels',
        total: 6,
        icon: '🧠'
      },
      {
        type: 'time_investment',
        title: 'Dedicated Learner',
        description: 'Spend 100 hours learning',
        total: 6000, // 100 hours in minutes
        icon: '⏰'
      }
    ];

    let achievementsCreated = 0;
    for (const student of students) {
      for (const enrollment of student.enrollments) {
        // Class-level achievements
        for (const achievementType of achievementTypes) {
          // Check if achievement already exists
          const existing = await prisma.studentAchievement.findFirst({
            where: {
              studentId: student.studentProfile?.id,
              type: achievementType.type,
              classId: enrollment.classId
            }
          });

          if (existing) continue;

          // Calculate progress based on achievement type
          let progress = 0;
          let unlocked = false;

          switch (achievementType.type) {
            case 'login_streak':
              progress = Math.floor(Math.random() * 10); // 0-9 days
              unlocked = progress >= achievementType.total;
              break;
            case 'activity_completion':
              // Get actual activity count
              const activityCount = await prisma.activityGrade.count({
                where: {
                  studentId: student.id,
                  status: 'GRADED'
                }
              });
              progress = Math.min(activityCount, achievementType.total);
              unlocked = progress >= achievementType.total;
              break;
            case 'perfect_score':
              // Get perfect scores count
              const perfectScores = await prisma.activityGrade.count({
                where: {
                  studentId: student.id,
                  status: 'GRADED',
                  score: { gte: prisma.activityGrade.fields.maxScore }
                }
              });
              progress = Math.min(perfectScores, achievementType.total);
              unlocked = progress >= achievementType.total;
              break;
            case 'subject_mastery':
              // Check subject performance
              const subjectMetrics = await prisma.studentPerformanceMetrics.findFirst({
                where: {
                  studentId: student.id,
                  classId: enrollment.classId
                }
              });
              progress = Math.floor(subjectMetrics?.averagePercentage || 0);
              unlocked = progress >= achievementType.total;
              break;
            case 'bloom_progression':
              // Check Bloom's levels demonstrated
              const bloomsData = await prisma.bloomsProgression.findFirst({
                where: {
                  studentId: student.id
                }
              });
              if (bloomsData) {
                const levelCounts = bloomsData.levelCounts as Record<string, number>;
                progress = Object.values(levelCounts).filter(count => count > 0).length;
              }
              unlocked = progress >= achievementType.total;
              break;
            case 'time_investment':
              // Get total time spent
              const totalTime = await prisma.activityGrade.aggregate({
                where: {
                  studentId: student.id,
                  status: 'GRADED'
                },
                _sum: {
                  timeSpentMinutes: true
                }
              });
              progress = totalTime._sum.timeSpentMinutes || 0;
              unlocked = progress >= achievementType.total;
              break;
          }

          await prisma.studentAchievement.create({
            data: {
              studentId: student.studentProfile?.id || '',
              title: achievementType.title,
              description: achievementType.description,
              type: achievementType.type,
              classId: enrollment.classId,
              progress,
              total: achievementType.total,
              unlocked,
              unlockedAt: unlocked ? new Date() : null,
              icon: achievementType.icon
            }
          });

          achievementsCreated++;
        }

        // Subject-specific achievements
        for (const subject of enrollment.class.subjects) {
          const subjectAchievement = {
            type: 'subject_completion',
            title: `${subject.name} Champion`,
            description: `Complete all activities in ${subject.name}`,
            total: 20, // Assume 20 activities per subject
            icon: '🏆'
          };

          const existing = await prisma.studentAchievement.findFirst({
            where: {
              studentId: student.studentProfile?.id,
              type: subjectAchievement.type,
              subjectId: subject.id
            }
          });

          if (existing) continue;

          const subjectActivityCount = await prisma.activityGrade.count({
            where: {
              studentId: student.id,
              activity: {
                subjectId: subject.id
              },
              status: 'GRADED'
            }
          });

          const progress = Math.min(subjectActivityCount, subjectAchievement.total);
          const unlocked = progress >= subjectAchievement.total;

          await prisma.studentAchievement.create({
            data: {
              studentId: student.studentProfile?.id || '',
              title: subjectAchievement.title,
              description: subjectAchievement.description,
              type: subjectAchievement.type,
              classId: enrollment.classId,
              subjectId: subject.id,
              progress,
              total: subjectAchievement.total,
              unlocked,
              unlockedAt: unlocked ? new Date() : null,
              icon: subjectAchievement.icon
            }
          });

          achievementsCreated++;
        }
      }
    }

    console.log(`✅ Created ${achievementsCreated} student achievements`);

  } catch (error) {
    console.error('Error generating student achievements:', error);
  }
}

async function generateStudentPoints(prisma: PrismaClient) {
  console.log('Generating student points...');

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
        studentProfile: true,
        enrollments: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    console.log(`Processing points for ${students.length} students`);

    let pointsCreated = 0;
    for (const student of students) {
      // Get student's activity grades to calculate points
      const activityGrades = await prisma.activityGrade.findMany({
        where: {
          studentId: student.id,
          status: 'GRADED',
          gradedAt: { not: null }
        },
        include: {
          activity: true
        }
      });

      for (const grade of activityGrades) {
        // Check if points already exist for this grade
        const existing = await prisma.studentPoints.findFirst({
          where: {
            studentId: student.studentProfile?.id || '',
            activityId: grade.activityId,
            source: 'ACTIVITY_COMPLETION'
          }
        });

        if (existing) continue;

        // Calculate points based on performance
        const percentage = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
        let points = 0;

        if (percentage >= 90) points = 10;
        else if (percentage >= 80) points = 8;
        else if (percentage >= 70) points = 6;
        else if (percentage >= 60) points = 4;
        else points = 2; // Participation points

        // Bonus points for perfect scores
        if (percentage === 100) points += 5;

        await prisma.studentPoints.create({
          data: {
            studentId: student.studentProfile?.id || '',
            points,
            source: 'ACTIVITY_COMPLETION',
            description: `Completed ${grade.activity?.title || 'activity'} with ${percentage.toFixed(1)}%`,
            activityId: grade.activityId,
            earnedAt: grade.gradedAt!
          }
        });

        pointsCreated++;
      }

      // Add bonus points for achievements
      const achievements = await prisma.studentAchievement.findMany({
        where: {
          studentId: student.studentProfile?.id || '',
          unlocked: true
        }
      });

      for (const achievement of achievements) {
        const existing = await prisma.studentPoints.findFirst({
          where: {
            studentId: student.studentProfile?.id || '',
            source: 'ACHIEVEMENT',
            description: { contains: achievement.title }
          }
        });

        if (existing) continue;

        const achievementPoints = 25; // Standard achievement points

        await prisma.studentPoints.create({
          data: {
            studentId: student.studentProfile?.id || '',
            points: achievementPoints,
            source: 'ACHIEVEMENT',
            description: `Unlocked achievement: ${achievement.title}`,
            earnedAt: achievement.unlockedAt || new Date()
          }
        });

        pointsCreated++;
      }
    }

    console.log(`✅ Created ${pointsCreated} student points records`);

  } catch (error) {
    console.error('Error generating student points:', error);
  }
}

async function generateStudentPointsAggregates(prisma: PrismaClient) {
  console.log('Generating student points aggregates...');

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
        studentProfile: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: true
          }
        }
      }
    });

    console.log(`Processing points aggregates for ${students.length} students`);

    let aggregatesCreated = 0;
    for (const student of students) {
      if (!student.studentProfile) continue;

      // Calculate total points for this student
      const totalPoints = await prisma.studentPoints.aggregate({
        where: {
          studentId: student.studentProfile.id
        },
        _sum: {
          points: true
        }
      });

      const points = totalPoints._sum.points || 0;

      for (const enrollment of student.enrollments) {
        // Check if aggregate already exists
        const existing = await prisma.studentPointsAggregate.findFirst({
          where: {
            studentId: student.studentProfile.id,
            classId: enrollment.classId,
            timeframe: 'all-time'
          }
        });

        if (existing) continue;

        // Calculate class-specific points
        const classPoints = await prisma.studentPoints.aggregate({
          where: {
            studentId: student.studentProfile.id,
            activity: {
              classId: enrollment.classId
            }
          },
          _sum: {
            points: true
          }
        });

        const classPointsTotal = classPoints._sum.points || 0;

        // Create aggregate records for different timeframes
        const timeframes = ['all-time', 'month', 'week'];

        for (const timeframe of timeframes) {
          let timeframePoints = classPointsTotal;

          // Adjust points based on timeframe
          if (timeframe === 'month') {
            timeframePoints = Math.floor(classPointsTotal * 0.3); // Assume 30% earned this month
          } else if (timeframe === 'week') {
            timeframePoints = Math.floor(classPointsTotal * 0.1); // Assume 10% earned this week
          }

          await prisma.studentPointsAggregate.create({
            data: {
              studentId: student.studentProfile.id,
              classId: enrollment.classId,
              timeframe,
              totalPoints: timeframePoints,
              rank: 1, // Will be updated later
              percentile: 50, // Will be updated later
              lastUpdated: new Date()
            }
          });

          aggregatesCreated++;
        }
      }

      // Update student profile total points
      await prisma.studentProfile.update({
        where: { id: student.studentProfile.id },
        data: { totalPoints: points }
      });
    }

    // Update ranks and percentiles
    await updateRanksAndPercentiles(prisma);

    console.log(`✅ Created ${aggregatesCreated} student points aggregates`);

  } catch (error) {
    console.error('Error generating student points aggregates:', error);
  }
}

async function updateRanksAndPercentiles(prisma: PrismaClient) {
  console.log('Updating ranks and percentiles...');

  try {
    // Get all classes
    const classes = await prisma.class.findMany({
      where: { status: SystemStatus.ACTIVE }
    });

    for (const classItem of classes) {
      const timeframes = ['all-time', 'month', 'week'];

      for (const timeframe of timeframes) {
        // Get all aggregates for this class and timeframe, ordered by points
        const aggregates = await prisma.studentPointsAggregate.findMany({
          where: {
            classId: classItem.id,
            timeframe
          },
          orderBy: {
            totalPoints: 'desc'
          }
        });

        // Update ranks and percentiles
        for (let i = 0; i < aggregates.length; i++) {
          const rank = i + 1;
          const percentile = aggregates.length > 1 ?
            Math.round(((aggregates.length - rank) / (aggregates.length - 1)) * 100) : 100;

          await prisma.studentPointsAggregate.update({
            where: { id: aggregates[i].id },
            data: {
              rank,
              percentile
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('Error updating ranks and percentiles:', error);
  }
}

async function generateStudentLevels(prisma: PrismaClient) {
  console.log('Generating student levels...');

  try {
    // Get all students with their total points
    const students = await prisma.studentProfile.findMany({
      where: {
        user: {
          userType: 'STUDENT',
          status: SystemStatus.ACTIVE
        }
      },
      include: {
        user: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {
                class: true
              }
            }
          }
        }
      }
    });

    console.log(`Processing levels for ${students.length} students`);

    // Define level thresholds
    const levelThresholds = [
      { level: 1, minPoints: 0, title: 'Beginner', icon: '🌱' },
      { level: 2, minPoints: 100, title: 'Learner', icon: '📚' },
      { level: 3, minPoints: 250, title: 'Explorer', icon: '🔍' },
      { level: 4, minPoints: 500, title: 'Scholar', icon: '🎓' },
      { level: 5, minPoints: 1000, title: 'Expert', icon: '⭐' },
      { level: 6, minPoints: 2000, title: 'Master', icon: '👑' },
      { level: 7, minPoints: 4000, title: 'Legend', icon: '🏆' }
    ];

    let levelsCreated = 0;
    for (const student of students) {
      // Determine current level based on total points
      let currentLevel = 1;
      let currentLevelData = levelThresholds[0];

      for (const threshold of levelThresholds) {
        if (student.totalPoints >= threshold.minPoints) {
          currentLevel = threshold.level;
          currentLevelData = threshold;
        }
      }

      // Update student profile with current level
      await prisma.studentProfile.update({
        where: { id: student.id },
        data: { currentLevel }
      });

      for (const enrollment of student.user.enrollments) {
        // Check if level record already exists
        const existing = await prisma.studentLevel.findFirst({
          where: {
            studentId: student.id,
            classId: enrollment.classId,
            level: currentLevel
          }
        });

        if (existing) continue;

        // Create level record
        await prisma.studentLevel.create({
          data: {
            studentId: student.id,
            classId: enrollment.classId,
            level: currentLevel,
            title: currentLevelData.title,
            pointsRequired: currentLevelData.minPoints,
            pointsEarned: student.totalPoints,
            achievedAt: new Date(),
            icon: currentLevelData.icon
          }
        });

        levelsCreated++;
      }
    }

    console.log(`✅ Created ${levelsCreated} student level records`);

  } catch (error) {
    console.error('Error generating student levels:', error);
  }
}
