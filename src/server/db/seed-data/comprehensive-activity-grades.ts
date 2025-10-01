import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Comprehensive activity grades seeding
 * Creates realistic activity grades for all students to populate dashboards
 */

export async function seedComprehensiveActivityGrades(prisma: PrismaClient) {
  console.log('📝 Starting comprehensive activity grades seeding...');

  try {
    // Generate activity grades for all students
    await generateActivityGrades(prisma);
    
    // Generate historical performance data
    await generateHistoricalPerformance(prisma);

    console.log('✅ Comprehensive activity grades seeding completed');

  } catch (error) {
    console.error('Error in comprehensive activity grades seeding:', error);
    throw error;
  }
}

async function generateActivityGrades(prisma: PrismaClient) {
  console.log('Generating comprehensive activity grades...');

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
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

    console.log(`Processing activity grades for ${students.length} students`);

    let gradesCreated = 0;
    for (const student of students) {
      for (const enrollment of student.enrollments) {
        for (const subject of enrollment.class.subjects) {
          // Get activities for this subject and class
          const activities = await prisma.activity.findMany({
            where: {
              subjectId: subject.id,
              classId: enrollment.classId,
              status: SystemStatus.ACTIVE,
              isGradable: true
            },
            take: 20 // Limit to 20 activities per subject
          });

          console.log(`Found ${activities.length} activities for ${subject.name} in class ${enrollment.class.code}`);

          for (const activity of activities) {
            // Check if grade already exists
            const existing = await prisma.activityGrade.findFirst({
              where: {
                studentId: student.id,
                activityId: activity.id
              }
            });

            if (existing) continue;

            // Generate realistic performance data
            const studentPerformanceLevel = Math.random(); // 0-1 representing student ability
            
            // Base score influenced by student ability and activity difficulty
            let baseScore = 0.6 + (studentPerformanceLevel * 0.4); // 60-100% base range
            
            // Add some randomness for realistic variation
            baseScore += (Math.random() - 0.5) * 0.3; // ±15% variation
            baseScore = Math.max(0.2, Math.min(1.0, baseScore)); // Clamp between 20-100%

            // Calculate actual scores
            const maxScore = 100; // Standard max score
            const score = Math.round(baseScore * maxScore);
            
            // Time spent (influenced by performance - better students often work faster)
            const baseTime = 20; // 20 minutes base
            const timeVariation = (1 - studentPerformanceLevel) * 15; // Weaker students take longer
            const timeSpent = Math.round(baseTime + timeVariation + (Math.random() * 10));

            // Generate submission date (within last 3 months)
            const submissionDate = new Date();
            submissionDate.setDate(submissionDate.getDate() - Math.floor(Math.random() * 90));
            
            // Grading date (1-3 days after submission)
            const gradingDate = new Date(submissionDate);
            gradingDate.setDate(gradingDate.getDate() + Math.floor(Math.random() * 3) + 1);

            // Generate feedback based on performance
            let feedback = '';
            if (score >= 90) {
              feedback = 'Excellent work! You demonstrate a strong understanding of the concepts.';
            } else if (score >= 80) {
              feedback = 'Good job! You have a solid grasp of the material with room for minor improvements.';
            } else if (score >= 70) {
              feedback = 'Well done! You understand the basics but could benefit from more practice.';
            } else if (score >= 60) {
              feedback = 'You\'re on the right track. Review the concepts and try some additional practice.';
            } else {
              feedback = 'This topic needs more attention. Please review the material and ask for help if needed.';
            }

            // Determine Bloom's level based on activity type and performance
            const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
            let aiBloomsLevel = bloomsLevels[Math.floor(Math.random() * bloomsLevels.length)];
            
            // Adjust Bloom's level based on performance
            if (score < 60) {
              aiBloomsLevel = bloomsLevels[Math.min(1, bloomsLevels.indexOf(aiBloomsLevel))];
            } else if (score >= 90) {
              aiBloomsLevel = bloomsLevels[Math.min(bloomsLevels.length - 1, bloomsLevels.indexOf(aiBloomsLevel) + 1)];
            }

            // Generate content (simulated student responses)
            const content = {
              responses: generateStudentResponses(activity.learningType, score),
              timeSpent: timeSpent,
              attempts: 1,
              startedAt: submissionDate.toISOString(),
              submittedAt: submissionDate.toISOString()
            };

            await prisma.activityGrade.create({
              data: {
                studentId: student.id,
                activityId: activity.id,
                score,
                maxScore,
                feedback,
                status: 'GRADED',
                submittedAt: submissionDate,
                gradedAt: gradingDate,
                timeSpentMinutes: timeSpent,
                content,
                gradingMethod: 'AUTO',
                aiScore: score,
                aiConfidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
                aiBloomsLevel,
                wordCount: activity.learningType === 'ESSAY' ? Math.floor(Math.random() * 300) + 100 : null
              }
            });

            gradesCreated++;
          }
        }
      }
    }

    console.log(`✅ Created ${gradesCreated} activity grades`);

  } catch (error) {
    console.error('Error generating activity grades:', error);
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
    
    case 'MATCHING':
      return {
        pairs: isCorrect ? 
          [['A', '1'], ['B', '2'], ['C', '3']] : 
          [['A', '2'], ['B', '1'], ['C', '3']],
        confidence: score / 100
      };
    
    default:
      return {
        response: isCorrect ? 'Correct response' : 'Partially correct response',
        confidence: score / 100
      };
  }
}

async function generateHistoricalPerformance(prisma: PrismaClient) {
  console.log('Generating historical performance data...');

  try {
    // Get all students
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT', status: SystemStatus.ACTIVE },
      include: {
        activityGrades: {
          where: { status: 'GRADED' },
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

    console.log(`Processing historical performance for ${students.length} students`);

    let historicalRecords = 0;
    for (const student of students) {
      // Group grades by subject
      const subjectGrades = new Map<string, any[]>();
      
      for (const grade of student.activityGrades) {
        if (!grade.activity?.subject) continue;
        
        const subjectId = grade.activity.subject.id;
        if (!subjectGrades.has(subjectId)) {
          subjectGrades.set(subjectId, []);
        }
        subjectGrades.get(subjectId)!.push(grade);
      }

      // Create historical performance trends for each subject
      for (const [subjectId, grades] of subjectGrades) {
        if (grades.length < 3) continue; // Need at least 3 grades for trend

        // Sort grades by date
        grades.sort((a, b) => a.gradedAt.getTime() - b.gradedAt.getTime());

        // Calculate performance trend
        const scores = grades.map(g => (g.score / g.maxScore) * 100);
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
        
        const improvement = secondAvg - firstAvg;
        const trend = improvement > 5 ? 'IMPROVING' : improvement < -5 ? 'DECLINING' : 'STABLE';

        // This would be stored in a performance trends table if it existed
        // For now, we'll just log the trend analysis
        console.log(`Student ${student.name} in subject ${subjectId}: ${trend} (${improvement.toFixed(1)}% change)`);
        
        historicalRecords++;
      }
    }

    console.log(`✅ Analyzed ${historicalRecords} historical performance trends`);

  } catch (error) {
    console.error('Error generating historical performance:', error);
  }
}
