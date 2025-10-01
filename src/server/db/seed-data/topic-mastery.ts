import { PrismaClient } from '@prisma/client';

/**
 * Comprehensive topic mastery and learning patterns seeding
 * Creates realistic mastery records and learning pattern analytics for all students
 */
export async function seedTopicMastery(prisma: PrismaClient) {
  console.log('🧠 Starting TopicMastery seeding...');

  try {
    // Get all students (users with userType STUDENT)
    const students = await prisma.user.findMany({
      where: {
        userType: 'STUDENT'
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`Found ${students.length} students`);

    // Get all subject topics
    const subjectTopics = await prisma.subjectTopic.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        subjectId: true,
        subject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${subjectTopics.length} subject topics`);

    if (students.length === 0 || subjectTopics.length === 0) {
      console.log('⚠️ No students or topics found. Skipping TopicMastery seeding.');
      return;
    }

    // Check existing TopicMastery records to avoid duplicates
    const existingMasteries = await prisma.topicMastery.findMany({
      select: {
        studentId: true,
        topicId: true
      }
    });

    const existingKeys = new Set(
      existingMasteries.map(m => `${m.studentId}-${m.topicId}`)
    );

    console.log(`Found ${existingMasteries.length} existing TopicMastery records`);

    // Create TopicMastery records for each student-topic combination
    const masteryRecords: any[] = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      for (const topic of subjectTopics) {
        const key = `${student.id}-${topic.id}`;
        
        if (existingKeys.has(key)) {
          skippedCount++;
          continue;
        }

        // Generate realistic mastery levels based on student performance
        const studentPerformance = await getStudentPerformanceLevel(prisma, student.id, topic.subjectId);

        // Base mastery levels on actual performance data
        const baseLevel = studentPerformance * 60; // 0-60% base range

        // Generate progressive mastery levels (higher levels should be lower)
        const rememberLevel = Math.min(100, baseLevel + Math.random() * 30);
        const understandLevel = Math.min(100, rememberLevel * 0.8 + Math.random() * 20);
        const applyLevel = Math.min(100, understandLevel * 0.7 + Math.random() * 15);
        const analyzeLevel = Math.min(100, applyLevel * 0.6 + Math.random() * 10);
        const evaluateLevel = Math.min(100, analyzeLevel * 0.5 + Math.random() * 8);
        const createLevel = Math.min(100, evaluateLevel * 0.4 + Math.random() * 5);

        // Calculate overall mastery as weighted average
        const overallMastery = (
          rememberLevel * 0.15 +
          understandLevel * 0.20 +
          applyLevel * 0.25 +
          analyzeLevel * 0.20 +
          evaluateLevel * 0.15 +
          createLevel * 0.05
        );

        masteryRecords.push({
          id: `mastery_${student.id}_${topic.id}`.substring(0, 30),
          studentId: student.id,
          topicId: topic.id,
          subjectId: topic.subjectId,
          rememberLevel: Math.round(rememberLevel),
          understandLevel: Math.round(understandLevel),
          applyLevel: Math.round(applyLevel),
          analyzeLevel: Math.round(analyzeLevel),
          evaluateLevel: Math.round(evaluateLevel),
          createLevel: Math.round(createLevel),
          overallMastery: Math.round(overallMastery),
          lastAssessmentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        });

        createdCount++;

        // Batch insert every 1000 records to avoid memory issues
        if (masteryRecords.length >= 1000) {
          await prisma.topicMastery.createMany({
            data: masteryRecords,
            skipDuplicates: true
          });
          console.log(`📝 Created ${masteryRecords.length} TopicMastery records (batch)`);
          masteryRecords.length = 0; // Clear array
        }
      }
    }

    // Insert remaining records
    if (masteryRecords.length > 0) {
      await prisma.topicMastery.createMany({
        data: masteryRecords,
        skipDuplicates: true
      });
      console.log(`📝 Created ${masteryRecords.length} TopicMastery records (final batch)`);
    }

    console.log(`✅ TopicMastery seeding completed:`);
    console.log(`   - Created: ${createdCount} new records`);
    console.log(`   - Skipped: ${skippedCount} existing records`);
    console.log(`   - Total students: ${students.length}`);
    console.log(`   - Total topics: ${subjectTopics.length}`);

  } catch (error) {
    console.error('❌ Error seeding TopicMastery:', error);
    throw error;
  }
}

/**
 * Seed TopicMastery records for specific students and topics
 * Useful for targeted seeding or when adding new students/topics
 */
export async function seedTopicMasteryForStudents(
  prisma: PrismaClient,
  studentIds: string[],
  topicIds?: string[]
) {
  console.log('🧠 Starting targeted TopicMastery seeding...');

  try {
    // Get specified students
    const students = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        userType: 'STUDENT'
      },
      select: {
        id: true,
        name: true
      }
    });

    // Get topics (all if not specified)
    const topicFilter = topicIds ? { id: { in: topicIds } } : {};
    const subjectTopics = await prisma.subjectTopic.findMany({
      where: {
        ...topicFilter,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        subjectId: true
      }
    });

    console.log(`Targeting ${students.length} students and ${subjectTopics.length} topics`);

    // Check existing records
    const existingMasteries = await prisma.topicMastery.findMany({
      where: {
        studentId: { in: studentIds },
        ...(topicIds && { topicId: { in: topicIds } })
      },
      select: {
        studentId: true,
        topicId: true
      }
    });

    const existingKeys = new Set(
      existingMasteries.map(m => `${m.studentId}-${m.topicId}`)
    );

    // Create missing records
    const masteryRecords: any[] = [];
    for (const student of students) {
      for (const topic of subjectTopics) {
        const key = `${student.id}-${topic.id}`;

        if (existingKeys.has(key)) continue;

        masteryRecords.push({
          studentId: student.id,
          topicId: topic.id,
          subjectId: topic.subjectId,
          rememberLevel: 0,
          understandLevel: 0,
          applyLevel: 0,
          analyzeLevel: 0,
          evaluateLevel: 0,
          createLevel: 0,
          overallMastery: 0,
          lastAssessmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    if (masteryRecords.length > 0) {
      await prisma.topicMastery.createMany({
        data: masteryRecords,
        skipDuplicates: true
      });
      console.log(`✅ Created ${masteryRecords.length} targeted TopicMastery records`);
    } else {
      console.log('ℹ️ No new TopicMastery records needed');
    }

    // Generate learning patterns analytics
    await generateLearningPatterns(prisma);

  } catch (error) {
    console.error('❌ Error in targeted TopicMastery seeding:', error);
    throw error;
  }
}

/**
 * Get student performance level based on their activity grades
 */
async function getStudentPerformanceLevel(prisma: PrismaClient, studentId: string, subjectId: string): Promise<number> {
  try {
    const grades = await prisma.activityGrade.findMany({
      where: {
        studentId,
        activity: {
          subjectId
        },
        status: 'GRADED'
      }
    });

    if (grades.length === 0) {
      return Math.random() * 0.5 + 0.3; // 30-80% for students with no grades
    }

    const averagePercentage = grades.reduce((sum, grade) => {
      return sum + (grade.score && grade.score > 0 ? (grade.score / 100) : 0);
    }, 0) / grades.length;

    return Math.min(1, Math.max(0.2, averagePercentage)); // Clamp between 20-100%

  } catch (error) {
    console.error('Error getting student performance level:', error);
    return 0.5; // Default to 50%
  }
}

/**
 * Seed realistic topic mastery data for specific student
 */
export async function seedTopicMasteryForSpecificStudent(
  prisma: PrismaClient,
  studentId: string = 'cmeuysuiv01yp13ishghtf531'
) {
  console.log(`🧠 Seeding realistic topic mastery for student: ${studentId}`);

  try {
    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true }
    });

    if (!student) {
      console.log(`❌ Student ${studentId} not found`);
      return;
    }

    // Get all subject topics
    const subjectTopics = await prisma.subjectTopic.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        subjectId: true,
        subject: {
          select: { id: true, name: true }
        }
      },
      take: 10 // Limit to 10 topics for demo
    });

    console.log(`Found ${subjectTopics.length} topics to create mastery for`);

    // Delete existing mastery records for this student
    await prisma.topicMastery.deleteMany({
      where: { studentId }
    });

    // Create realistic mastery records
    const masteryRecords: any[] = [];

    for (const topic of subjectTopics) {
      // Generate realistic mastery levels (30 to 90 range for percentage)
      const baseLevel = 30 + Math.random() * 60;
      const variation = 10;

      const rememberLevel = Math.min(95, Math.max(20, baseLevel + (Math.random() - 0.5) * variation));
      const understandLevel = Math.min(90, Math.max(15, baseLevel * 0.9 + (Math.random() - 0.5) * variation));
      const applyLevel = Math.min(85, Math.max(10, baseLevel * 0.8 + (Math.random() - 0.5) * variation));
      const analyzeLevel = Math.min(80, Math.max(5, baseLevel * 0.7 + (Math.random() - 0.5) * variation));
      const evaluateLevel = Math.min(75, Math.max(5, baseLevel * 0.6 + (Math.random() - 0.5) * variation));
      const createLevel = Math.min(70, Math.max(5, baseLevel * 0.5 + (Math.random() - 0.5) * variation));

      const overallMastery = (rememberLevel + understandLevel + applyLevel + analyzeLevel + evaluateLevel + createLevel) / 6;

      masteryRecords.push({
        studentId,
        topicId: topic.id,
        subjectId: topic.subjectId,
        rememberLevel,
        understandLevel,
        applyLevel,
        analyzeLevel,
        evaluateLevel,
        createLevel,
        overallMastery,
        lastAssessmentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Insert the records
    await prisma.topicMastery.createMany({
      data: masteryRecords,
      skipDuplicates: true
    });

    console.log(`✅ Created ${masteryRecords.length} realistic topic mastery records for ${student.name}`);

    // Log some sample data
    masteryRecords.slice(0, 3).forEach(record => {
      console.log(`   Topic: ${subjectTopics.find(t => t.id === record.topicId)?.title} - Overall: ${Math.round(record.overallMastery)}%`);
    });

  } catch (error) {
    console.error('❌ Error seeding specific student mastery:', error);
    throw error;
  }
}

/**
 * Generate learning patterns analytics for students
 */
async function generateLearningPatterns(prisma: PrismaClient) {
  console.log('🧠 Generating learning patterns analytics...');

  try {
    // Get all students with their performance data
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT' },
      include: {
        ActivityGrade: {
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

    console.log(`Processing learning patterns for ${students.length} students`);

    let patternsCreated = 0;
    for (const student of students) {
      // Analyze learning patterns
      const patterns = analyzeLearningPatterns(student.ActivityGrade);

      // This would be stored in a learning patterns table if it existed
      // For now, we'll log the analysis
      console.log(`Student ${student.name} learning patterns:`, {
        preferredDifficulty: patterns.preferredDifficulty,
        strongSubjects: patterns.strongSubjects,
        improvementAreas: patterns.improvementAreas,
        learningVelocity: patterns.learningVelocity,
        consistencyScore: patterns.consistencyScore
      });

      patternsCreated++;
    }

    console.log(`✅ Analyzed learning patterns for ${patternsCreated} students`);

  } catch (error) {
    console.error('Error generating learning patterns:', error);
  }
}

/**
 * Analyze learning patterns from student activity grades
 */
function analyzeLearningPatterns(grades: any[]) {
  if (grades.length === 0) {
    return {
      preferredDifficulty: 'MEDIUM',
      strongSubjects: [],
      improvementAreas: [],
      learningVelocity: 'AVERAGE',
      consistencyScore: 50
    };
  }

  // Group by subject
  const subjectPerformance = new Map<string, number[]>();
  const timeSpentData: number[] = [];
  const scores: number[] = [];

  for (const grade of grades) {
    if (!grade.activity?.subject) continue;

    const subjectName = grade.activity.subject.name;
    const percentage = grade.score ? (grade.score / 100) * 100 : 0;

    if (!subjectPerformance.has(subjectName)) {
      subjectPerformance.set(subjectName, []);
    }
    subjectPerformance.get(subjectName)!.push(percentage);

    scores.push(percentage);
    if (grade.timeSpentMinutes) {
      timeSpentData.push(grade.timeSpentMinutes);
    }
  }

  // Calculate metrics
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
  const consistencyScore = Math.max(0, 100 - Math.sqrt(scoreVariance));

  // Determine preferred difficulty
  const highScores = scores.filter(s => s >= 80).length;
  const totalScores = scores.length;
  const successRate = highScores / totalScores;

  let preferredDifficulty = 'MEDIUM';
  if (successRate >= 0.8) preferredDifficulty = 'HARD';
  else if (successRate <= 0.4) preferredDifficulty = 'EASY';

  // Find strong subjects and improvement areas
  const subjectAverages = Array.from(subjectPerformance.entries()).map(([subject, scores]) => ({
    subject,
    average: scores.reduce((sum, score) => sum + score, 0) / scores.length
  }));

  subjectAverages.sort((a, b) => b.average - a.average);

  const strongSubjects = subjectAverages.slice(0, 2).map(s => s.subject);
  const improvementAreas = subjectAverages.slice(-2).map(s => s.subject);

  // Determine learning velocity
  const averageTime = timeSpentData.length > 0 ?
    timeSpentData.reduce((sum, time) => sum + time, 0) / timeSpentData.length : 20;

  let learningVelocity = 'AVERAGE';
  if (averageTime < 15) learningVelocity = 'FAST';
  else if (averageTime > 30) learningVelocity = 'SLOW';

  return {
    preferredDifficulty,
    strongSubjects,
    improvementAreas,
    learningVelocity,
    consistencyScore: Math.round(consistencyScore)
  };
}
