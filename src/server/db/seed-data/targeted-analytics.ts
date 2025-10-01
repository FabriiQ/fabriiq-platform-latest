import { PrismaClient } from '@prisma/client';

/**
 * Targeted analytics seeding for Year 8 C class only
 * Creates performance analytics, Bloom's progression, and student metrics
 */

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Starting targeted analytics seeding for Year 8 C...');

  try {
    await seedTargetedAnalytics();
    console.log('✅ Targeted analytics seeding completed successfully');
  } catch (error) {
    console.error('❌ Error in targeted analytics seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedTargetedAnalytics() {
  console.log('Generating analytics for students with activity grades...');

  try {
    // Get students who have activity grades (since enrollment data is broken)
    const studentsWithGrades = await prisma.studentProfile.findMany({
      where: {
        ActivityGrade: {
          some: {
            status: 'GRADED',
            gradedAt: { not: null }
          }
        }
      },
      include: {
        user: true,
        ActivityGrade: {
          where: {
            status: 'GRADED',
            gradedAt: { not: null }
          },
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
    });

    if (!studentsWithGrades.length) {
      console.log('❌ No students with activity grades found');
      return;
    }

    console.log(`📚 Processing analytics for ${studentsWithGrades.length} students with activity grades`);

    // Generate performance analytics records
    await generatePerformanceAnalyticsForStudents(studentsWithGrades);

    // Generate student performance metrics
    await generateStudentPerformanceMetricsForStudents(studentsWithGrades);

    // Generate Bloom's progression data
    await generateBloomsProgressionForStudents(studentsWithGrades);

  } catch (error) {
    console.error('Error generating targeted analytics:', error);
    throw error;
  }
}

async function generatePerformanceAnalyticsForStudents(studentsWithGrades: any[]) {
  console.log('📈 Generating performance analytics records...');

  let analyticsCreated = 0;

  for (const student of studentsWithGrades) {
    console.log(`  Processing analytics for: ${student.user.name}`);

    for (const grade of student.ActivityGrade) {
      if (!grade.activity) continue;

      // Check if performance analytics already exists
      const existing = await prisma.performanceAnalytics.findUnique({
        where: { submissionId: grade.id }
      });

      if (existing) {
        console.log(`    Skipping existing analytics for grade: ${grade.id}`);
        continue;
      }

      // Calculate performance metrics
      const maxScore = grade.activity.maxScore || 10;
      const score = grade.score || 0;
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const timeSpent = grade.timeSpentMinutes || Math.floor(Math.random() * 30) + 5;
      const engagementScore = Math.min(100, percentage + Math.random() * 20 - 10);

      // Determine Bloom's level
      const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
      const targetBloomsLevel = grade.aiBloomsLevel || bloomsLevels[Math.floor(Math.random() * bloomsLevels.length)];
      const demonstratedLevel = percentage >= 80 ? targetBloomsLevel : 
                               percentage >= 60 ? bloomsLevels[Math.max(0, bloomsLevels.indexOf(targetBloomsLevel) - 1)] :
                               bloomsLevels[Math.max(0, bloomsLevels.indexOf(targetBloomsLevel) - 2)];

      // Create bloom's level scores
      const bloomsLevelScores = bloomsLevels.reduce((acc, level) => {
        const baseScore = percentage;
        const variation = Math.random() * 20 - 10;
        acc[level] = Math.max(0, Math.min(100, baseScore + variation));
        return acc;
      }, {} as Record<string, number>);

      await prisma.performanceAnalytics.create({
        data: {
          submissionId: grade.id,
          studentId: student.user.id,
          activityId: grade.activityId,
          classId: 'cmesxnvle006wuxvpxic2pp41', // Year 8 C class
          subjectId: grade.activity.subjectId,
          topicId: grade.activity.topicId,
          score,
          maxScore,
          percentage,
          timeSpent,
          attemptCount: 1,
          engagementScore,
          bloomsLevel: targetBloomsLevel,
          demonstratedLevel,
          bloomsLevelScores,
          gradingType: grade.gradingMethod || 'AUTO',
          activityType: grade.activity.learningType || 'UNKNOWN',
          gradedAt: grade.gradedAt!,
          submittedAt: grade.submittedAt || grade.gradedAt!,
          completedAt: grade.gradedAt!
        }
      });

      analyticsCreated++;
      console.log(`    Created analytics for activity: ${grade.activity.title}`);
    }
  }

  console.log(`✅ Created ${analyticsCreated} performance analytics records`);
}

async function generateStudentPerformanceMetricsForStudents(studentsWithGrades: any[]) {
  console.log('📊 Generating student performance metrics...');

  let metricsCreated = 0;

  for (const student of studentsWithGrades) {
    console.log(`  Processing metrics for: ${student.user.name}`);

    // Get unique subjects from the student's activity grades
    const subjectMap = new Map();
    student.ActivityGrade.forEach((grade: any) => {
      if (grade.activity.subject) {
        subjectMap.set(grade.activity.subject.id, grade.activity.subject);
      }
    });
    const subjects = Array.from(subjectMap.values());

    for (const subject of subjects) {
      // Check if metrics already exist
      const existing = await prisma.studentPerformanceMetrics.findFirst({
        where: {
          studentId: student.user.id,
          subjectId: subject.id,
          classId: 'cmesxnvle006wuxvpxic2pp41' // Year 8 C class
        }
      });

      if (existing) {
        console.log(`    Skipping existing metrics for subject: ${subject.name}`);
        continue;
      }

      // Get performance analytics for this student-subject-class combination
      const analytics = await prisma.performanceAnalytics.findMany({
        where: {
          studentId: student.user.id,
          subjectId: subject.id,
          classId: 'cmesxnvle006wuxvpxic2pp41' // Year 8 C class
        }
      });

      if (analytics.length === 0) {
        console.log(`    No analytics found for subject: ${subject.name}`);
        continue;
      }

      // Calculate aggregated metrics
      const totalScore = analytics.reduce((sum, a) => sum + a.score, 0);
      const totalMaxScore = analytics.reduce((sum, a) => sum + a.maxScore, 0);
      const averageScore = totalScore / analytics.length;
      const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      const totalTimeSpent = analytics.reduce((sum, a) => sum + a.timeSpent, 0);
      const averageEngagement = analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
      const lastActivityDate = new Date(Math.max(...analytics.map(a => a.gradedAt.getTime())));

      await prisma.studentPerformanceMetrics.create({
        data: {
          studentId: student.user.id,
          subjectId: subject.id,
          classId: 'cmesxnvle006wuxvpxic2pp41', // Year 8 C class
          totalScore,
          totalMaxScore,
          activityCount: analytics.length,
          averageScore,
          averagePercentage,
          lastActivityDate,
          totalTimeSpent,
          averageEngagement
        }
      });

      metricsCreated++;
      console.log(`    Created metrics for subject: ${subject.name} (${analytics.length} activities)`);
    }
  }

  console.log(`✅ Created ${metricsCreated} student performance metrics records`);
}

async function generateBloomsProgressionForStudents(studentsWithGrades: any[]) {
  console.log('🧠 Generating Bloom\'s progression data...');

  let progressionCreated = 0;

  for (const student of studentsWithGrades) {
    console.log(`  Processing Bloom's progression for: ${student.user.name}`);

    // Get unique subjects from the student's activity grades
    const subjectMap = new Map();
    student.ActivityGrade.forEach((grade: any) => {
      if (grade.activity.subject) {
        subjectMap.set(grade.activity.subject.id, grade.activity.subject);
      }
    });
    const subjects = Array.from(subjectMap.values());

    for (const subject of subjects) {
      // Check if progression already exists
      const existing = await prisma.bloomsProgression.findUnique({
        where: {
          studentId_subjectId: {
            studentId: student.user.id,
            subjectId: subject.id
          }
        }
      });

      if (existing) {
        console.log(`    Skipping existing progression for subject: ${subject.name}`);
        continue;
      }

      // Get performance analytics for this student-subject combination
      const analytics = await prisma.performanceAnalytics.findMany({
        where: {
          studentId: student.user.id,
          subjectId: subject.id
        }
      });

      if (analytics.length === 0) {
        console.log(`    No analytics found for Bloom's progression in subject: ${subject.name}`);
        continue;
      }

      // Calculate level counts
      const levelCounts = {
        REMEMBER: analytics.filter(a => a.demonstratedLevel === 'REMEMBER').length,
        UNDERSTAND: analytics.filter(a => a.demonstratedLevel === 'UNDERSTAND').length,
        APPLY: analytics.filter(a => a.demonstratedLevel === 'APPLY').length,
        ANALYZE: analytics.filter(a => a.demonstratedLevel === 'ANALYZE').length,
        EVALUATE: analytics.filter(a => a.demonstratedLevel === 'EVALUATE').length,
        CREATE: analytics.filter(a => a.demonstratedLevel === 'CREATE').length
      };

      // Find the highest demonstrated level
      const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
      let lastDemonstratedLevel = 'REMEMBER';
      for (let i = bloomsLevels.length - 1; i >= 0; i--) {
        if (levelCounts[bloomsLevels[i] as keyof typeof levelCounts] > 0) {
          lastDemonstratedLevel = bloomsLevels[i];
          break;
        }
      }

      const lastActivityDate = new Date(Math.max(...analytics.map(a => a.gradedAt.getTime())));

      await prisma.bloomsProgression.create({
        data: {
          studentId: student.user.id,
          subjectId: subject.id,
          classId: 'cmesxnvle006wuxvpxic2pp41', // Year 8 C class
          levelCounts,
          lastDemonstratedLevel,
          lastActivityDate
        }
      });

      progressionCreated++;
      console.log(`    Created Bloom's progression for subject: ${subject.name}`);
      console.log(`      Level counts: ${JSON.stringify(levelCounts)}`);
      console.log(`      Highest level: ${lastDemonstratedLevel}`);
    }
  }

  console.log(`✅ Created ${progressionCreated} Bloom's progression records`);
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { seedTargetedAnalytics };
