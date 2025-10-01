import { PrismaClient, SystemStatus } from '@prisma/client';

/**
 * Targeted topic mastery seeding for Year 8 C class only
 * Creates topic mastery and learning patterns data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🧠 Starting targeted topic mastery seeding for Year 8 C...');

  try {
    await seedTargetedTopicMastery();
    console.log('✅ Targeted topic mastery seeding completed successfully');
  } catch (error) {
    console.error('❌ Error in targeted topic mastery seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTargetedTopicMastery() {
  console.log('Generating topic mastery for Year 8 C class...');

  try {
    // Get Year 8 C class with students and their performance data
    const targetClass = await prisma.class.findFirst({
      where: {
        name: { contains: 'Year 8 C' },
        status: SystemStatus.ACTIVE
      },
      include: {
        subjects: {
          include: {
            topics: {
              where: { status: SystemStatus.ACTIVE }
            }
          }
        },
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
                          include: {
                            subject: true,
                            topic: true
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
      }
    });

    if (!targetClass) {
      console.log('❌ Year 8 C class not found');
      return;
    }

    console.log(`🧠 Processing topic mastery for ${targetClass.name} with ${targetClass.enrollments.length} students`);

    // Generate topic mastery for each student
    await generateTopicMasteryForClass(targetClass);
    
    // Generate learning patterns
    await generateLearningPatternsForClass(targetClass);

  } catch (error) {
    console.error('Error generating targeted topic mastery:', error);
    throw error;
  }
}

async function generateTopicMasteryForClass(classData: any) {
  console.log('📚 Generating topic mastery records...');

  let masteryCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing topic mastery for: ${student.name}`);

    const grades = student.activityGrades;

    // Group grades by topic
    const gradesByTopic = grades.reduce((acc: any, grade: any) => {
      if (!grade.activity?.topic) return acc;
      
      const topicId = grade.activity.topic.id;
      if (!acc[topicId]) {
        acc[topicId] = {
          topic: grade.activity.topic,
          subject: grade.activity.subject,
          grades: []
        };
      }
      acc[topicId].grades.push(grade);
      return acc;
    }, {});

    for (const [topicId, topicData] of Object.entries(gradesByTopic)) {
      const data = topicData as any;
      
      // Check if topic mastery already exists
      const existing = await prisma.topicMastery.findUnique({
        where: {
          studentId_topicId: {
            studentId: student.id,
            topicId
          }
        }
      });

      if (existing) {
        console.log(`    Skipping existing mastery for topic: ${data.topic.title}`);
        continue;
      }

      // Calculate mastery metrics
      const topicGrades = data.grades;
      const totalScore = topicGrades.reduce((sum: number, g: any) => sum + g.score, 0);
      const totalMaxScore = topicGrades.reduce((sum: number, g: any) => sum + g.maxScore, 0);
      const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

      // Calculate Bloom's level distribution
      const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
      const bloomsDistribution = bloomsLevels.reduce((acc, level) => {
        const levelGrades = topicGrades.filter((g: any) => g.aiBloomsLevel === level);
        const levelScore = levelGrades.length > 0 ? 
          levelGrades.reduce((sum: number, g: any) => sum + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / levelGrades.length : 0;
        acc[level] = Math.round(levelScore);
        return acc;
      }, {} as Record<string, number>);

      // Determine mastery level
      let masteryLevel = 'BEGINNER';
      if (averagePercentage >= 90) masteryLevel = 'MASTERED';
      else if (averagePercentage >= 80) masteryLevel = 'PROFICIENT';
      else if (averagePercentage >= 70) masteryLevel = 'DEVELOPING';
      else if (averagePercentage >= 60) masteryLevel = 'EMERGING';

      // Find highest demonstrated Bloom's level
      let highestBloomsLevel = 'REMEMBER';
      for (let i = bloomsLevels.length - 1; i >= 0; i--) {
        if (bloomsDistribution[bloomsLevels[i]] >= 60) { // 60% threshold for demonstration
          highestBloomsLevel = bloomsLevels[i];
          break;
        }
      }

      const lastActivityDate = new Date(Math.max(...topicGrades.map((g: any) => g.gradedAt?.getTime() || 0)));

      await prisma.topicMastery.create({
        data: {
          studentId: student.id,
          topicId,
          subjectId: data.subject.id,
          classId: classData.id,
          masteryLevel,
          masteryPercentage: Math.round(averagePercentage),
          bloomsDistribution,
          highestBloomsLevel,
          activitiesCompleted: topicGrades.length,
          totalTimeSpent: topicGrades.reduce((sum: number, g: any) => sum + (g.timeSpentMinutes || 0), 0),
          lastActivityDate,
          metadata: {
            topicTitle: data.topic.title,
            subjectName: data.subject.name,
            className: classData.name,
            averageScore: Math.round(averagePercentage),
            totalActivities: topicGrades.length
          }
        }
      });

      masteryCreated++;
      console.log(`    Created mastery for topic: ${data.topic.title} (${masteryLevel} - ${Math.round(averagePercentage)}%)`);
    }
  }

  console.log(`✅ Created ${masteryCreated} topic mastery records`);
}

async function generateLearningPatternsForClass(classData: any) {
  console.log('🔍 Generating learning patterns...');

  let patternsCreated = 0;

  for (const enrollment of classData.enrollments) {
    const student = enrollment.student.user;
    console.log(`  Processing learning patterns for: ${student.name}`);

    // Check if learning pattern already exists
    const existing = await prisma.learningPattern.findUnique({
      where: { studentId: student.id }
    });

    if (existing) {
      console.log(`    Skipping existing pattern for: ${student.name}`);
      continue;
    }

    const grades = student.activityGrades;
    if (grades.length === 0) {
      console.log(`    No grades found for: ${student.name}`);
      continue;
    }

    // Analyze learning patterns
    const patterns = analyzeLearningPatterns(grades);

    await prisma.learningPattern.create({
      data: {
        studentId: student.id,
        classId: classData.id,
        preferredDifficulty: patterns.preferredDifficulty,
        strongSubjects: patterns.strongSubjects,
        improvementAreas: patterns.improvementAreas,
        learningVelocity: patterns.learningVelocity,
        consistencyScore: patterns.consistencyScore,
        peakPerformanceTime: patterns.peakPerformanceTime,
        lastAnalyzedAt: new Date(),
        metadata: {
          totalActivities: grades.length,
          averageScore: patterns.averageScore,
          className: classData.name,
          analysisDate: new Date().toISOString()
        }
      }
    });

    patternsCreated++;
    console.log(`    Created learning pattern for: ${student.name}`);
    console.log(`      Preferred difficulty: ${patterns.preferredDifficulty}`);
    console.log(`      Strong subjects: ${patterns.strongSubjects.join(', ')}`);
    console.log(`      Learning velocity: ${patterns.learningVelocity}`);
  }

  console.log(`✅ Created ${patternsCreated} learning patterns`);
}

function analyzeLearningPatterns(grades: any[]) {
  // Group grades by subject
  const gradesBySubject = grades.reduce((acc: any, grade: any) => {
    const subjectName = grade.activity?.subject?.name || 'Unknown';
    if (!acc[subjectName]) acc[subjectName] = [];
    acc[subjectName].push(grade);
    return acc;
  }, {});

  // Calculate subject performance
  const subjectPerformance = Object.entries(gradesBySubject).map(([subject, subjectGrades]) => {
    const grades = subjectGrades as any[];
    const totalScore = grades.reduce((sum: number, g: any) => sum + g.score, 0);
    const totalMaxScore = grades.reduce((sum: number, g: any) => sum + g.maxScore, 0);
    const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    
    return {
      subject,
      percentage,
      count: grades.length
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Determine strong subjects (top performers)
  const strongSubjects = subjectPerformance
    .filter(s => s.percentage >= 75)
    .slice(0, 3)
    .map(s => s.subject);

  // Determine improvement areas (bottom performers)
  const improvementAreas = subjectPerformance
    .filter(s => s.percentage < 70)
    .slice(0, 2)
    .map(s => s.subject);

  // Calculate overall metrics
  const totalScore = grades.reduce((sum: number, g: any) => sum + g.score, 0);
  const totalMaxScore = grades.reduce((sum: number, g: any) => sum + g.maxScore, 0);
  const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  // Determine preferred difficulty (based on performance patterns)
  let preferredDifficulty = 'MEDIUM';
  if (averageScore >= 85) preferredDifficulty = 'HARD';
  else if (averageScore <= 60) preferredDifficulty = 'EASY';

  // Calculate learning velocity (activities per week)
  const dateRange = grades.length > 1 ? 
    (Math.max(...grades.map(g => g.gradedAt?.getTime() || 0)) - 
     Math.min(...grades.map(g => g.gradedAt?.getTime() || 0))) / (1000 * 60 * 60 * 24 * 7) : 1;
  const learningVelocity = Math.round((grades.length / Math.max(dateRange, 1)) * 10) / 10;

  // Calculate consistency score (standard deviation of scores)
  const percentages = grades.map(g => g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0);
  const mean = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length;
  const standardDeviation = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.min(100, 100 - standardDeviation));

  // Determine peak performance time (simplified)
  const peakPerformanceTime = averageScore >= 80 ? 'MORNING' : 
                             averageScore >= 70 ? 'AFTERNOON' : 'EVENING';

  return {
    preferredDifficulty,
    strongSubjects,
    improvementAreas,
    learningVelocity,
    consistencyScore: Math.round(consistencyScore),
    peakPerformanceTime,
    averageScore: Math.round(averageScore)
  };
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { seedTargetedTopicMastery };
