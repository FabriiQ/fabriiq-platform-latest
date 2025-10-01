import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Targeted activity grades seeding for existing students only
 * This adds comprehensive activity grades without duplicating base data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('📝 Starting targeted activity grades seeding...');

  try {
    await seedTargetedActivityGrades();
    console.log('✅ Targeted activity grades seeding completed successfully');
  } catch (error) {
    console.error('❌ Error in targeted activity grades seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTargetedActivityGrades() {
  console.log('Generating activity grades for existing students...');

  try {
    // Get students from Year 8 C class specifically (target the boys class which has activities)
    const targetClass = await prisma.class.findFirst({
      where: {
        code: 'SIS-BOYS-Y8-C',
        status: SystemStatus.ACTIVE
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: true
              }
            }
          }
        },
        students: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                user: true
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

    console.log(`📚 Found target class: ${targetClass.name} with ${targetClass.students.length} students`);
    console.log(`📖 Available subjects: ${targetClass.courseCampus.course.subjects.map(s => s.name).join(', ')}`);

    // Check total activities available
    const totalActivities = await prisma.activity.count({
      where: {
        classId: targetClass.id,
        status: SystemStatus.ACTIVE,
        isGradable: true
      }
    });
    console.log(`🎯 Total activities available: ${totalActivities}`);

    // Extract students from the class students (limit to first 50 for demo)
    const students = targetClass.students.slice(0, 50).map(enrollment => ({
      ...enrollment.student.user,
      studentProfile: enrollment.student,
      enrollments: [{
        ...enrollment,
        class: {
          ...targetClass,
          subjects: targetClass.courseCampus.course.subjects
        }
      }]
    }));

    console.log(`Processing activity grades for ${students.length} students (limited from ${targetClass.students.length} total)`);

    let gradesCreated = 0;
    for (const student of students) {
      console.log(`Processing student: ${student.name} (${student.email})`);

      for (const enrollment of student.enrollments) {
        console.log(`  Processing class: ${enrollment.class.code}`);

        for (const subject of enrollment.class.subjects) {
          console.log(`    Processing subject: ${subject.name}`);

          // Get activities for this subject and class
          const activities = await prisma.activity.findMany({
            where: {
              subjectId: subject.id,
              classId: enrollment.classId,
              status: SystemStatus.ACTIVE,
              isGradable: true
            },
            orderBy: { createdAt: 'desc' },
            take: 12 // Take all activities per subject (4 topics × 3 activities each)
          });

          console.log(`      Found ${activities.length} activities`);

          for (const activity of activities) {
            // Check if grade already exists
            const existing = await prisma.activityGrade.findFirst({
              where: {
                studentId: student.studentProfile.id,
                activityId: activity.id
              }
            });

            if (existing) {
              console.log(`      Skipping existing grade for activity: ${activity.title}`);
              continue;
            }

            // Generate realistic performance data
            const studentPerformanceLevel = Math.random(); // 0-1 representing student ability
            
            // Base score influenced by student ability
            let baseScore = 0.6 + (studentPerformanceLevel * 0.4); // 60-100% base range
            
            // Add some randomness for realistic variation
            baseScore += (Math.random() - 0.5) * 0.3; // ±15% variation
            baseScore = Math.max(0.2, Math.min(1.0, baseScore)); // Clamp between 20-100%

            // Calculate actual scores (use activity's maxScore or default to 10)
            const activityMaxScore = activity.maxScore || 10;
            const score = Math.round(baseScore * activityMaxScore);
            
            // Time spent (influenced by performance)
            const baseTime = 20; // 20 minutes base
            const timeVariation = (1 - studentPerformanceLevel) * 15;
            const timeSpent = Math.round(baseTime + timeVariation + (Math.random() * 10));

            // Generate submission date (within last 2 months)
            const submissionDate = new Date();
            submissionDate.setDate(submissionDate.getDate() - Math.floor(Math.random() * 60));
            
            // Grading date (1-2 days after submission)
            const gradingDate = new Date(submissionDate);
            gradingDate.setDate(gradingDate.getDate() + Math.floor(Math.random() * 2) + 1);

            // Generate feedback based on performance (percentage-based)
            const scorePercentage = (score / activityMaxScore) * 100;
            let feedback = '';
            if (scorePercentage >= 90) {
              feedback = 'Excellent work! You demonstrate a strong understanding of the concepts.';
            } else if (scorePercentage >= 80) {
              feedback = 'Good job! You have a solid grasp of the material with room for minor improvements.';
            } else if (scorePercentage >= 70) {
              feedback = 'Well done! You understand the basics but could benefit from more practice.';
            } else if (scorePercentage >= 60) {
              feedback = 'You\'re on the right track. Review the concepts and try some additional practice.';
            } else {
              feedback = 'This topic needs more attention. Please review the material and ask for help if needed.';
            }

            // Determine Bloom's level
            const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
            let aiBloomsLevel = bloomsLevels[Math.floor(Math.random() * bloomsLevels.length)];
            
            // Adjust Bloom's level based on performance
            if (scorePercentage < 60) {
              aiBloomsLevel = bloomsLevels[Math.min(1, bloomsLevels.indexOf(aiBloomsLevel))];
            } else if (scorePercentage >= 90) {
              aiBloomsLevel = bloomsLevels[Math.min(bloomsLevels.length - 1, bloomsLevels.indexOf(aiBloomsLevel) + 1)];
            }

            // Generate content
            const content = {
              responses: generateStudentResponses(activity.learningType, score),
              timeSpent: timeSpent,
              attempts: 1,
              startedAt: submissionDate.toISOString(),
              submittedAt: submissionDate.toISOString()
            };

            await prisma.activityGrade.create({
              data: {
                studentId: student.studentProfile.id,
                activityId: activity.id,
                score,
                feedback,
                status: 'GRADED',
                submittedAt: submissionDate,
                gradedAt: gradingDate,
                timeSpentMinutes: timeSpent,
                content,
                gradingMethod: 'AUTO',
                aiScore: score,
                aiConfidence: Math.random() * 0.3 + 0.7,
                aiBloomsLevel,
                wordCount: activity.learningType === 'ESSAY' ? Math.floor(Math.random() * 300) + 100 : null
              }
            });

            gradesCreated++;
            console.log(`      Created grade: ${score}/${activityMaxScore} for ${activity.title}`);
          }
        }
      }
    }

    console.log(`✅ Created ${gradesCreated} activity grades for existing students`);

  } catch (error) {
    console.error('Error generating targeted activity grades:', error);
    throw error;
  }
}

function generateStudentResponses(activityType: string | null, score: number) {
  const isCorrect = score >= 70;
  
  switch (activityType) {
    case 'MULTIPLE_CHOICE':
      return {
        selectedOptions: isCorrect ? ['A', 'B', 'C'] : ['A', 'D', 'C'],
        confidence: score / 100
      };
    
    case 'TRUE_FALSE':
      return {
        answers: isCorrect ? [true, false, true] : [false, false, true],
        confidence: score / 100
      };
    
    case 'FILL_IN_THE_BLANKS':
      return {
        answers: isCorrect ? 
          ['photosynthesis', 'chlorophyll', 'glucose'] : 
          ['respiration', 'chloroplast', 'oxygen'],
        confidence: score / 100
      };
    
    case 'ESSAY':
      return {
        text: isCorrect ? 
          'This is a well-structured response that demonstrates clear understanding of the topic...' :
          'This response shows some understanding but lacks depth in analysis...',
        wordCount: Math.floor(Math.random() * 300) + 100
      };
    
    default:
      return {
        response: isCorrect ? 'Correct response' : 'Partially correct response',
        confidence: score / 100
      };
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { seedTargetedActivityGrades };
