import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Targeted profile enhancements seeding for Year 8 C class only
 * Creates learning goals, personal bests, journey events, and learning time records
 */

const prisma = new PrismaClient();

async function main() {
  console.log('👤 Starting targeted profile enhancements seeding for Year 8 C...');

  try {
    await seedTargetedProfileEnhancements();
    console.log('✅ Targeted profile enhancements seeding completed successfully');
  } catch (error) {
    console.error('❌ Error in targeted profile enhancements seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTargetedProfileEnhancements() {
  console.log('Generating profile enhancements for Year 8 C class...');

  try {
    // Get Year 8 C class with students
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

    console.log(`👤 Processing profile enhancements for ${targetClass.name} with ${targetClass.enrollments.length} students`);

    // Generate learning goals
    await generateLearningGoalsForClass(targetClass);
    
    // Generate personal bests
    await generatePersonalBestsForClass(targetClass);
    
    // Generate journey events
    await generateJourneyEventsForClass(targetClass);
    
    // Generate learning time records
    await generateLearningTimeRecordsForClass(targetClass);

  } catch (error) {
    console.error('Error generating targeted profile enhancements:', error);
    throw error;
  }
}

async function generateLearningGoalsForClass(classData: any) {
  console.log('🎯 Generating learning goals...');

  const goalTemplates = [
    { type: 'ACADEMIC', title: 'Achieve 85% average in Mathematics', description: 'Maintain consistent high performance in math activities' },
    { type: 'SKILL', title: 'Complete 20 Science activities', description: 'Engage actively with science learning materials' },
    { type: 'HABIT', title: 'Study for 30 minutes daily', description: 'Develop consistent daily learning habits' },
    { type: 'ACADEMIC', title: 'Master Bloom\'s Analysis level', description: 'Demonstrate analytical thinking skills' },
    { type: 'SKILL', title: 'Improve writing skills', description: 'Focus on English language activities' }
  ];

  let goalsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing goals for: ${student.name}`);

    // Create 2-3 goals per student
    const studentGoals = goalTemplates.slice(0, 2 + Math.floor(Math.random() * 2));

    for (const goalTemplate of studentGoals) {
      // Check if similar goal already exists
      const existing = await prisma.learningGoal.findFirst({
        where: {
          studentId: student.id,
          title: goalTemplate.title
        }
      });

      if (existing) {
        console.log(`    Skipping existing goal: ${goalTemplate.title}`);
        continue;
      }

      // Set target date (1-3 months from now)
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 1 + Math.floor(Math.random() * 2));

      // Calculate progress based on current performance
      const grades = student.activityGrades;
      let progress = 0;

      if (goalTemplate.title.includes('Mathematics')) {
        const mathGrades = grades.filter((g: any) => g.activity?.subject?.name?.includes('Math'));
        if (mathGrades.length > 0) {
          const avgPercentage = mathGrades.reduce((sum: number, g: any) => 
            sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / mathGrades.length;
          progress = Math.min(100, (avgPercentage / 85) * 100);
        }
      } else if (goalTemplate.title.includes('Science activities')) {
        const scienceGrades = grades.filter((g: any) => g.activity?.subject?.name?.includes('Science'));
        progress = Math.min(100, (scienceGrades.length / 20) * 100);
      } else {
        progress = Math.random() * 60 + 20; // 20-80% progress
      }

      await prisma.learningGoal.create({
        data: {
          studentId: student.id,
          type: goalTemplate.type,
          title: goalTemplate.title,
          description: goalTemplate.description,
          targetDate,
          progress: Math.round(progress),
          status: progress >= 100 ? 'COMPLETED' : progress >= 50 ? 'IN_PROGRESS' : 'NOT_STARTED',
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          metadata: {
            classId: classData.id,
            className: classData.name,
            currentGrades: grades.length
          }
        }
      });

      goalsCreated++;
      console.log(`    Created goal: ${goalTemplate.title} (${Math.round(progress)}% progress)`);
    }
  }

  console.log(`✅ Created ${goalsCreated} learning goals`);
}

async function generatePersonalBestsForClass(classData: any) {
  console.log('🏆 Generating personal bests...');

  let bestsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing personal bests for: ${student.name}`);

    const grades = student.activityGrades;
    if (grades.length === 0) continue;

    // Group grades by subject
    const gradesBySubject = grades.reduce((acc: any, grade: any) => {
      const subjectName = grade.activity?.subject?.name || 'Unknown';
      if (!acc[subjectName]) acc[subjectName] = [];
      acc[subjectName].push(grade);
      return acc;
    }, {});

    for (const [subjectName, subjectGrades] of Object.entries(gradesBySubject)) {
      const grades = subjectGrades as any[];

      // Highest score
      const highestScoreGrade = grades.reduce((best: any, current: any) => {
        const currentPercentage = current.maxScore > 0 ? (current.score / current.maxScore) * 100 : 0;
        const bestPercentage = best.maxScore > 0 ? (best.score / best.maxScore) * 100 : 0;
        return currentPercentage > bestPercentage ? current : best;
      });

      const highestPercentage = highestScoreGrade.maxScore > 0 ? 
        (highestScoreGrade.score / highestScoreGrade.maxScore) * 100 : 0;

      // Check if personal best already exists
      const existingScore = await prisma.personalBest.findFirst({
        where: {
          studentId: student.id,
          category: 'HIGHEST_SCORE',
          subjectName
        }
      });

      if (!existingScore) {
        await prisma.personalBest.create({
          data: {
            studentId: student.id,
            category: 'HIGHEST_SCORE',
            value: Math.round(highestPercentage),
            unit: 'percentage',
            subjectName,
            activityName: highestScoreGrade.activity?.title || 'Unknown Activity',
            achievedAt: highestScoreGrade.gradedAt || new Date(),
            metadata: {
              activityId: highestScoreGrade.activityId,
              score: highestScoreGrade.score,
              maxScore: highestScoreGrade.maxScore
            }
          }
        });

        bestsCreated++;
        console.log(`    Created highest score best: ${Math.round(highestPercentage)}% in ${subjectName}`);
      }

      // Fastest completion (if time data available)
      const gradesWithTime = grades.filter((g: any) => g.timeSpentMinutes && g.timeSpentMinutes > 0);
      if (gradesWithTime.length > 0) {
        const fastestGrade = gradesWithTime.reduce((fastest: any, current: any) => 
          current.timeSpentMinutes < fastest.timeSpentMinutes ? current : fastest
        );

        const existingTime = await prisma.personalBest.findFirst({
          where: {
            studentId: student.id,
            category: 'FASTEST_COMPLETION',
            subjectName
          }
        });

        if (!existingTime) {
          await prisma.personalBest.create({
            data: {
              studentId: student.id,
              category: 'FASTEST_COMPLETION',
              value: fastestGrade.timeSpentMinutes,
              unit: 'minutes',
              subjectName,
              activityName: fastestGrade.activity?.title || 'Unknown Activity',
              achievedAt: fastestGrade.gradedAt || new Date(),
              metadata: {
                activityId: fastestGrade.activityId,
                score: fastestGrade.score,
                maxScore: fastestGrade.maxScore
              }
            }
          });

          bestsCreated++;
          console.log(`    Created fastest completion best: ${fastestGrade.timeSpentMinutes} minutes in ${subjectName}`);
        }
      }
    }
  }

  console.log(`✅ Created ${bestsCreated} personal bests`);
}

async function generateJourneyEventsForClass(classData: any) {
  console.log('🗓️ Generating journey events...');

  let eventsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing journey events for: ${student.name}`);

    const events = [
      {
        type: 'MILESTONE',
        title: 'First Perfect Score',
        description: 'Achieved your first 100% score on an activity',
        date: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'ACHIEVEMENT',
        title: 'Consistent Learner',
        description: 'Completed activities for 7 consecutive days',
        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'MILESTONE',
        title: 'Subject Mastery',
        description: 'Demonstrated mastery in a subject area',
        date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const event of events) {
      // Check if similar event already exists
      const existing = await prisma.journeyEvent.findFirst({
        where: {
          studentId: student.id,
          title: event.title
        }
      });

      if (existing) {
        console.log(`    Skipping existing event: ${event.title}`);
        continue;
      }

      await prisma.journeyEvent.create({
        data: {
          studentId: student.id,
          type: event.type,
          title: event.title,
          description: event.description,
          eventDate: event.date,
          metadata: {
            classId: classData.id,
            className: classData.name
          }
        }
      });

      eventsCreated++;
      console.log(`    Created journey event: ${event.title}`);
    }
  }

  console.log(`✅ Created ${eventsCreated} journey events`);
}

async function generateLearningTimeRecordsForClass(classData: any) {
  console.log('⏱️ Generating learning time records...');

  let recordsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing learning time for: ${student.name}`);

    // Generate time records for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Check if record already exists for this date
      const existing = await prisma.learningTimeRecord.findFirst({
        where: {
          studentId: student.id,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
          }
        }
      });

      if (existing) continue;

      // Skip some days randomly (students don't study every day)
      if (Math.random() < 0.3) continue;

      const timeSpent = Math.floor(Math.random() * 60) + 15; // 15-75 minutes
      const focusScore = Math.floor(Math.random() * 30) + 70; // 70-100 focus score
      const efficiency = Math.floor(Math.random() * 20) + 80; // 80-100 efficiency

      await prisma.learningTimeRecord.create({
        data: {
          studentId: student.id,
          date,
          timeSpent,
          focusScore,
          efficiency,
          activitiesCompleted: Math.floor(Math.random() * 3) + 1,
          metadata: {
            classId: classData.id,
            className: classData.name,
            sessionType: 'regular_study'
          }
        }
      });

      recordsCreated++;
    }

    console.log(`    Created learning time records for: ${student.name}`);
  }

  console.log(`✅ Created ${recordsCreated} learning time records`);
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { seedTargetedProfileEnhancements };
