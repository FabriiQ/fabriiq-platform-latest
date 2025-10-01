import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Student profile enhancement seeding
 * Creates learning goals, personal bests, journey events, and learning time records
 */

export async function seedStudentProfileEnhancements(prisma: PrismaClient) {
  console.log('🎯 Starting student profile enhancements seeding...');

  try {
    // Generate learning goals
    await generateLearningGoals(prisma);
    
    // Generate personal bests
    await generatePersonalBests(prisma);
    
    // Generate journey events
    await generateJourneyEvents(prisma);
    
    // Generate learning time records
    await generateLearningTimeRecords(prisma);

    console.log('✅ Student profile enhancements seeding completed');

  } catch (error) {
    console.error('Error in student profile enhancements seeding:', error);
    throw error;
  }
}

async function generateLearningGoals(prisma: PrismaClient) {
  console.log('Generating learning goals...');

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

    console.log(`Processing learning goals for ${students.length} students`);

    // Define goal templates
    const goalTemplates = [
      {
        type: 'ACADEMIC',
        title: 'Improve Math Performance',
        description: 'Achieve 85% average in Mathematics',
        targetValue: 85,
        unit: 'percentage'
      },
      {
        type: 'SKILL',
        title: 'Master Problem Solving',
        description: 'Complete 20 problem-solving activities',
        targetValue: 20,
        unit: 'activities'
      },
      {
        type: 'HABIT',
        title: 'Daily Learning Streak',
        description: 'Study for 30 minutes daily for 30 days',
        targetValue: 30,
        unit: 'days'
      },
      {
        type: 'ACADEMIC',
        title: 'Science Excellence',
        description: 'Score above 90% in next Science test',
        targetValue: 90,
        unit: 'percentage'
      },
      {
        type: 'SKILL',
        title: 'Reading Comprehension',
        description: 'Complete 15 reading activities with 80%+ score',
        targetValue: 15,
        unit: 'activities'
      }
    ];

    let goalsCreated = 0;
    for (const student of students) {
      if (!student.studentProfile) continue;

      // Create 2-3 goals per student
      const numGoals = Math.floor(Math.random() * 2) + 2; // 2-3 goals
      const selectedGoals = goalTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numGoals);

      for (const goalTemplate of selectedGoals) {
        // Check if similar goal already exists
        const existing = await prisma.learningGoal.findFirst({
          where: {
            studentId: student.studentProfile.id,
            title: goalTemplate.title
          }
        });

        if (existing) continue;

        // Calculate current progress
        let currentValue = 0;
        let isCompleted = false;

        switch (goalTemplate.type) {
          case 'ACADEMIC':
            // Get average performance in relevant subject
            const subjectName = goalTemplate.title.includes('Math') ? 'Mathematics' : 'Science';
            const subject = student.enrollments[0]?.class.subjects.find(s => 
              s.name.toLowerCase().includes(subjectName.toLowerCase())
            );
            
            if (subject) {
              const metrics = await prisma.studentPerformanceMetrics.findFirst({
                where: {
                  studentId: student.id,
                  subjectId: subject.id
                }
              });
              currentValue = Math.floor(metrics?.averagePercentage || 0);
            }
            break;
            
          case 'SKILL':
            // Count completed activities
            currentValue = Math.floor(Math.random() * goalTemplate.targetValue);
            break;
            
          case 'HABIT':
            // Random progress for habit goals
            currentValue = Math.floor(Math.random() * goalTemplate.targetValue);
            break;
        }

        isCompleted = currentValue >= goalTemplate.targetValue;

        // Set deadline (1-3 months from now)
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + Math.floor(Math.random() * 3) + 1);

        await prisma.learningGoal.create({
          data: {
            studentId: student.studentProfile.id,
            title: goalTemplate.title,
            description: goalTemplate.description,
            type: goalTemplate.type,
            targetValue: goalTemplate.targetValue,
            currentValue,
            unit: goalTemplate.unit,
            deadline,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
            priority: Math.floor(Math.random() * 3) + 1, // 1-3 priority
            isPublic: Math.random() > 0.5 // 50% public goals
          }
        });

        goalsCreated++;
      }
    }

    console.log(`✅ Created ${goalsCreated} learning goals`);

  } catch (error) {
    console.error('Error generating learning goals:', error);
  }
}

async function generatePersonalBests(prisma: PrismaClient) {
  console.log('Generating personal bests...');

  try {
    // Get all students with their performance data
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

    console.log(`Processing personal bests for ${students.length} students`);

    let bestsCreated = 0;
    for (const student of students) {
      if (!student.studentProfile) continue;

      for (const enrollment of student.enrollments) {
        for (const subject of enrollment.class.subjects) {
          // Get student's best performance in this subject
          const bestGrade = await prisma.activityGrade.findFirst({
            where: {
              studentId: student.id,
              activity: {
                subjectId: subject.id
              },
              status: 'GRADED'
            },
            orderBy: {
              score: 'desc'
            },
            include: {
              activity: true
            }
          });

          if (!bestGrade || !bestGrade.activity) continue;

          // Check if personal best already exists
          const existing = await prisma.personalBest.findFirst({
            where: {
              studentId: student.studentProfile.id,
              subjectId: subject.id,
              metric: 'HIGHEST_SCORE'
            }
          });

          if (existing) continue;

          const percentage = bestGrade.maxScore > 0 ? 
            (bestGrade.score / bestGrade.maxScore) * 100 : 0;

          await prisma.personalBest.create({
            data: {
              studentId: student.studentProfile.id,
              subjectId: subject.id,
              activityId: bestGrade.activityId,
              metric: 'HIGHEST_SCORE',
              value: percentage,
              unit: 'percentage',
              achievedAt: bestGrade.gradedAt!,
              description: `Best score in ${subject.name}: ${percentage.toFixed(1)}% on "${bestGrade.activity.title}"`
            }
          });

          bestsCreated++;

          // Create time-based personal best
          const fastestGrade = await prisma.activityGrade.findFirst({
            where: {
              studentId: student.id,
              activity: {
                subjectId: subject.id
              },
              status: 'GRADED',
              timeSpentMinutes: { gt: 0 }
            },
            orderBy: {
              timeSpentMinutes: 'asc'
            },
            include: {
              activity: true
            }
          });

          if (fastestGrade && fastestGrade.activity) {
            const existingTime = await prisma.personalBest.findFirst({
              where: {
                studentId: student.studentProfile.id,
                subjectId: subject.id,
                metric: 'FASTEST_COMPLETION'
              }
            });

            if (!existingTime) {
              await prisma.personalBest.create({
                data: {
                  studentId: student.studentProfile.id,
                  subjectId: subject.id,
                  activityId: fastestGrade.activityId,
                  metric: 'FASTEST_COMPLETION',
                  value: fastestGrade.timeSpentMinutes || 0,
                  unit: 'minutes',
                  achievedAt: fastestGrade.gradedAt!,
                  description: `Fastest completion in ${subject.name}: ${fastestGrade.timeSpentMinutes} minutes on "${fastestGrade.activity.title}"`
                }
              });

              bestsCreated++;
            }
          }
        }
      }
    }

    console.log(`✅ Created ${bestsCreated} personal bests`);

  } catch (error) {
    console.error('Error generating personal bests:', error);
  }
}

async function generateJourneyEvents(prisma: PrismaClient) {
  console.log('Generating journey events...');

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

    console.log(`Processing journey events for ${students.length} students`);

    // Define event types
    const eventTypes = [
      {
        type: 'MILESTONE',
        title: 'First Perfect Score',
        description: 'Achieved 100% on an activity for the first time',
        icon: '🎯'
      },
      {
        type: 'ACHIEVEMENT',
        title: 'Level Up',
        description: 'Advanced to the next learning level',
        icon: '⬆️'
      },
      {
        type: 'STREAK',
        title: 'Learning Streak',
        description: 'Completed activities for 7 consecutive days',
        icon: '🔥'
      },
      {
        type: 'IMPROVEMENT',
        title: 'Grade Improvement',
        description: 'Improved average grade by 10%',
        icon: '📈'
      },
      {
        type: 'PARTICIPATION',
        title: 'Active Learner',
        description: 'Completed 10 activities in a week',
        icon: '💪'
      }
    ];

    let eventsCreated = 0;
    for (const student of students) {
      if (!student.studentProfile) continue;

      // Create 3-5 journey events per student
      const numEvents = Math.floor(Math.random() * 3) + 3; // 3-5 events
      
      for (let i = 0; i < numEvents; i++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        // Generate event date (within last 3 months)
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() - Math.floor(Math.random() * 90));

        await prisma.journeyEvent.create({
          data: {
            studentId: student.studentProfile.id,
            type: eventType.type,
            title: eventType.title,
            description: eventType.description,
            icon: eventType.icon,
            points: Math.floor(Math.random() * 20) + 5, // 5-25 points
            occurredAt: eventDate,
            metadata: {
              category: eventType.type,
              importance: Math.floor(Math.random() * 3) + 1 // 1-3 importance
            }
          }
        });

        eventsCreated++;
      }
    }

    console.log(`✅ Created ${eventsCreated} journey events`);

  } catch (error) {
    console.error('Error generating journey events:', error);
  }
}

async function generateLearningTimeRecords(prisma: PrismaClient) {
  console.log('Generating learning time records...');

  try {
    // Get all students with their activity grades
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
        studentProfile: true,
        activityGrades: {
          where: {
            status: 'GRADED',
            gradedAt: { not: null }
          },
          include: {
            activity: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    console.log(`Processing learning time records for ${students.length} students`);

    let recordsCreated = 0;
    for (const student of students) {
      if (!student.studentProfile) continue;

      for (const grade of student.activityGrades) {
        if (!grade.activity) continue;

        // Check if learning time record already exists
        const existing = await prisma.learningTimeRecord.findFirst({
          where: {
            studentId: student.studentProfile.id,
            activityId: grade.activityId
          }
        });

        if (existing) continue;

        const timeSpent = grade.timeSpentMinutes || Math.floor(Math.random() * 30) + 5; // 5-35 minutes
        const focusScore = Math.min(100, Math.max(60, 100 - (timeSpent - 15) * 2)); // Better focus for optimal time

        // Calculate efficiency based on score and time
        const percentage = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
        const efficiency = Math.min(100, (percentage / timeSpent) * 10); // Points per minute * 10

        await prisma.learningTimeRecord.create({
          data: {
            studentId: student.studentProfile.id,
            activityId: grade.activityId,
            subjectId: grade.activity.subjectId,
            timeSpent,
            focusScore,
            efficiency,
            sessionDate: grade.gradedAt!,
            metadata: {
              activityType: grade.activity.learningType,
              score: grade.score,
              maxScore: grade.maxScore,
              percentage: percentage
            }
          }
        });

        recordsCreated++;
      }
    }

    console.log(`✅ Created ${recordsCreated} learning time records`);

  } catch (error) {
    console.error('Error generating learning time records:', error);
  }
}
