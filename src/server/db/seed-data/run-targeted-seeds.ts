import { PrismaClient } from '@prisma/client';
import { seedTargetedActivityGrades } from './targeted-activity-grades';
import { seedTargetedAnalytics } from './targeted-analytics';
import { seedTargetedAchievements } from './targeted-achievements';
import { seedTargetedProfileEnhancements } from './targeted-profile-enhancements';
import { seedTargetedTopicMastery } from './targeted-topic-mastery';

/**
 * Master script to run all targeted seed files for Year 8 C class
 * This adds comprehensive student data without duplicating base data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive targeted seeding for Year 8 C class...');
  console.log('📅 Started at:', new Date().toISOString());
  
  const startTime = Date.now();

  try {
    // Step 1: Generate activity grades (foundation for all other data)
    console.log('\n📝 Step 1: Generating activity grades...');
    await seedTargetedActivityGrades();
    console.log('✅ Activity grades completed');

    // Step 2: Generate analytics based on the grades
    console.log('\n📊 Step 2: Generating analytics...');
    await seedTargetedAnalytics();
    console.log('✅ Analytics completed');

    // Step 3: Generate achievements and points based on performance
    console.log('\n🏆 Step 3: Generating achievements and points...');
    await seedTargetedAchievements();
    console.log('✅ Achievements and points completed');

    // Step 4: Generate profile enhancements
    console.log('\n👤 Step 4: Generating profile enhancements...');
    await seedTargetedProfileEnhancements();
    console.log('✅ Profile enhancements completed');

    // Step 5: Generate topic mastery and learning patterns
    console.log('\n🧠 Step 5: Generating topic mastery and learning patterns...');
    await seedTargetedTopicMastery();
    console.log('✅ Topic mastery and learning patterns completed');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n🎉 All targeted seeding completed successfully!');
    console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
    console.log('📅 Completed at:', new Date().toISOString());

    // Generate summary report
    await generateSummaryReport();

  } catch (error) {
    console.error('\n❌ Error during targeted seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateSummaryReport() {
  console.log('\n📋 Generating summary report...');

  try {
    // Get Year 8 C class info
    const targetClass = await prisma.class.findFirst({
      where: {
        name: { contains: 'Year 8 C' },
        status: 'ACTIVE'
      },
      include: {
        subjects: true,
        enrollments: {
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
      console.log('❌ Year 8 C class not found for summary');
      return;
    }

    console.log('\n📊 SEEDING SUMMARY REPORT');
    console.log('=' .repeat(50));
    console.log(`🏫 Class: ${targetClass.name}`);
    console.log(`👥 Students: ${targetClass.enrollments.length}`);
    console.log(`📚 Subjects: ${targetClass.subjects.length}`);

    // Count generated data
    const studentIds = targetClass.enrollments.map(e => e.student.userId);

    const [
      activityGradesCount,
      analyticsCount,
      achievementsCount,
      pointsCount,
      goalsCount,
      personalBestsCount,
      journeyEventsCount,
      timeRecordsCount,
      topicMasteryCount,
      learningPatternsCount
    ] = await Promise.all([
      prisma.activityGrade.count({
        where: { studentId: { in: studentIds }, status: 'GRADED' }
      }),
      prisma.performanceAnalytics.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.studentAchievement.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.studentPoints.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.learningGoal.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.personalBest.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.journeyEvent.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.learningTimeRecord.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.topicMastery.count({
        where: { studentId: { in: studentIds } }
      }),
      prisma.learningPattern.count({
        where: { studentId: { in: studentIds } }
      })
    ]);

    console.log('\n📈 DATA GENERATED:');
    console.log(`📝 Activity Grades: ${activityGradesCount}`);
    console.log(`📊 Performance Analytics: ${analyticsCount}`);
    console.log(`🏆 Student Achievements: ${achievementsCount}`);
    console.log(`💎 Student Points: ${pointsCount}`);
    console.log(`🎯 Learning Goals: ${goalsCount}`);
    console.log(`🏅 Personal Bests: ${personalBestsCount}`);
    console.log(`🗓️ Journey Events: ${journeyEventsCount}`);
    console.log(`⏱️ Learning Time Records: ${timeRecordsCount}`);
    console.log(`🧠 Topic Mastery Records: ${topicMasteryCount}`);
    console.log(`🔍 Learning Patterns: ${learningPatternsCount}`);

    const totalRecords = activityGradesCount + analyticsCount + achievementsCount + 
                        pointsCount + goalsCount + personalBestsCount + journeyEventsCount + 
                        timeRecordsCount + topicMasteryCount + learningPatternsCount;

    console.log(`\n📊 TOTAL RECORDS CREATED: ${totalRecords}`);

    // Show student details
    console.log('\n👥 STUDENTS IN CLASS:');
    for (const enrollment of targetClass.enrollments) {
      const student = enrollment.student.user;
      
      // Get student's total points
      const pointsAggregate = await prisma.studentPointsAggregate.findUnique({
        where: { studentId: student.id }
      });

      // Get student's level
      const studentLevel = await prisma.studentLevel.findUnique({
        where: { studentId: student.id }
      });

      console.log(`   • ${student.name} (${student.email})`);
      console.log(`     Points: ${pointsAggregate?.totalPoints || 0} | Level: ${studentLevel?.currentLevel || 1} (${studentLevel?.levelName || 'Beginner'})`);
      console.log(`     Rank: ${pointsAggregate?.classRank || 'N/A'} | Percentile: ${pointsAggregate?.classPercentile || 'N/A'}%`);
    }

    console.log('\n🎯 DEMO VALIDATION:');
    console.log('✅ Student Dashboard: Login with any student email above');
    console.log('✅ Teacher Dashboard: Login with math_boys@sunshine.edu');
    console.log('✅ Password for all users: Password123!');

    console.log('\n🔍 WHAT TO CHECK:');
    console.log('📊 Student Portal:');
    console.log('   • Class dashboard with performance metrics');
    console.log('   • Student profile with goals and achievements');
    console.log('   • Leaderboards with rankings and points');
    console.log('   • Learning analytics and progress tracking');
    
    console.log('🏫 Teacher Portal:');
    console.log('   • Class analytics with student performance');
    console.log('   • Bloom\'s taxonomy reports');
    console.log('   • Topic mastery heat maps');
    console.log('   • Learning pattern insights');
    console.log('   • Class leaderboards and comparisons');

  } catch (error) {
    console.error('Error generating summary report:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Master seeding script failed:', error);
    process.exit(1);
  });
}

export { main as runTargetedSeeds };
