/**
 * Database Size Analysis Script
 * 
 * This script analyzes your current database size and provides recommendations
 * for managing Supabase free tier limits.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeDatabaseSize() {
  console.log('📊 Database Size Analysis');
  console.log('='.repeat(50));

  try {
    // Get overall statistics
    const stats = await getOverallStats();
    displayOverallStats(stats);

    // Get question distribution by subject
    const subjectStats = await getSubjectQuestionStats();
    displaySubjectStats(subjectStats);

    // Get table size estimates
    await getTableSizeEstimates();

    // Provide recommendations
    provideRecommendations(stats, subjectStats);

  } catch (error) {
    console.error('❌ Error analyzing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function getOverallStats() {
  console.log('📈 Gathering overall statistics...\n');

  const [
    totalQuestions,
    totalSubjects,
    totalQuestionBanks,
    totalUsers,
    totalAssessments,
    questionsWithUsage,
    recentQuestions
  ] = await Promise.all([
    prisma.question.count(),
    prisma.subject.count(),
    prisma.questionBank.count(),
    prisma.user.count(),
    prisma.assessment.count(),
    prisma.question.count({ where: { usageStats: { isNot: null } } }),
    prisma.question.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    })
  ]);

  return {
    totalQuestions,
    totalSubjects,
    totalQuestionBanks,
    totalUsers,
    totalAssessments,
    questionsWithUsage,
    recentQuestions
  };
}

function displayOverallStats(stats) {
  console.log('📊 Overall Database Statistics:');
  console.log('-'.repeat(40));
  console.log(`Total Questions: ${stats.totalQuestions.toLocaleString()}`);
  console.log(`Total Subjects: ${stats.totalSubjects.toLocaleString()}`);
  console.log(`Total Question Banks: ${stats.totalQuestionBanks.toLocaleString()}`);
  console.log(`Total Users: ${stats.totalUsers.toLocaleString()}`);
  console.log(`Total Assessments: ${stats.totalAssessments.toLocaleString()}`);
  console.log(`Questions with Usage Stats: ${stats.questionsWithUsage.toLocaleString()}`);
  console.log(`Recent Questions (30 days): ${stats.recentQuestions.toLocaleString()}`);
  console.log('');
}

async function getSubjectQuestionStats() {
  console.log('📚 Analyzing questions by subject...\n');

  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      _count: {
        select: {
          questions: true
        }
      }
    },
    orderBy: {
      questions: {
        _count: 'desc'
      }
    }
  });

  // Get additional stats for subjects with many questions
  const detailedStats = [];
  for (const subject of subjects.slice(0, 10)) { // Top 10 subjects
    if (subject._count.questions > 0) {
      const recentCount = await prisma.question.count({
        where: {
          subjectId: subject.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const usageCount = await prisma.question.count({
        where: {
          subjectId: subject.id,
          usageStats: { isNot: null }
        }
      });

      detailedStats.push({
        ...subject,
        totalQuestions: subject._count.questions,
        recentQuestions: recentCount,
        questionsWithUsage: usageCount
      });
    }
  }

  return detailedStats;
}

function displaySubjectStats(subjectStats) {
  console.log('📚 Top Subjects by Question Count:');
  console.log('-'.repeat(80));
  
  subjectStats.forEach((subject, index) => {
    const exceedsLimit = subject.totalQuestions > 10000;
    const indicator = exceedsLimit ? '⚠️ ' : '✅ ';
    
    console.log(`${indicator}${index + 1}. ${subject.name} (${subject.code})`);
    console.log(`   Total Questions: ${subject.totalQuestions.toLocaleString()}`);
    console.log(`   Recent (30 days): ${subject.recentQuestions.toLocaleString()}`);
    console.log(`   With Usage Stats: ${subject.questionsWithUsage.toLocaleString()}`);
    
    if (exceedsLimit) {
      const excess = subject.totalQuestions - 10000;
      console.log(`   ⚠️  EXCEEDS LIMIT by ${excess.toLocaleString()} questions`);
    }
    console.log('');
  });
}

async function getTableSizeEstimates() {
  console.log('💾 Estimating table sizes...\n');

  try {
    // This is a rough estimate - actual sizes may vary
    const estimates = [
      { table: 'Questions', count: await prisma.question.count(), avgSize: 2048 },
      { table: 'Users', count: await prisma.user.count(), avgSize: 1024 },
      { table: 'Subjects', count: await prisma.subject.count(), avgSize: 512 },
      { table: 'Assessments', count: await prisma.assessment.count(), avgSize: 1536 },
      { table: 'Question Banks', count: await prisma.questionBank.count(), avgSize: 256 }
    ];

    console.log('💾 Estimated Table Sizes:');
    console.log('-'.repeat(50));
    
    let totalEstimatedSize = 0;
    estimates.forEach(est => {
      const sizeBytes = est.count * est.avgSize;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      totalEstimatedSize += sizeBytes;
      
      console.log(`${est.table}: ${est.count.toLocaleString()} records (~${sizeMB} MB)`);
    });
    
    const totalMB = (totalEstimatedSize / (1024 * 1024)).toFixed(2);
    console.log(`\nTotal Estimated Size: ~${totalMB} MB`);
    
    // Supabase free tier limit is 500MB
    const freeLimit = 500;
    const usagePercent = ((totalEstimatedSize / (1024 * 1024)) / freeLimit * 100).toFixed(1);
    
    console.log(`Supabase Free Tier Usage: ${usagePercent}% of 500MB limit`);
    
    if (usagePercent > 80) {
      console.log('⚠️  WARNING: Approaching database size limit!');
    }
    
    console.log('');
    
  } catch (error) {
    console.log('❌ Could not estimate table sizes:', error.message);
  }
}

function provideRecommendations(stats, subjectStats) {
  console.log('💡 Recommendations:');
  console.log('-'.repeat(30));

  const subjectsExceedingLimit = subjectStats.filter(s => s.totalQuestions > 10000);
  
  if (subjectsExceedingLimit.length > 0) {
    console.log('🧹 CLEANUP NEEDED:');
    console.log(`   ${subjectsExceedingLimit.length} subjects exceed 10,000 questions`);
    
    const totalExcess = subjectsExceedingLimit.reduce((sum, s) => sum + (s.totalQuestions - 10000), 0);
    console.log(`   Total excess questions: ${totalExcess.toLocaleString()}`);
    
    console.log('\n📋 Recommended Actions:');
    console.log('   1. Run: npm run cleanup:questions:dry-run');
    console.log('   2. Review the analysis results');
    console.log('   3. Run: npm run cleanup:questions');
    console.log('');
    
    console.log('🔧 Cleanup Command Options:');
    console.log('   --dry-run              Test mode (no deletion)');
    console.log('   --max-questions 5000   Set lower limit per subject');
    console.log('   --preserve-days 60     Preserve more recent questions');
    console.log('   --no-backup           Skip backup creation');
    console.log('');
  } else {
    console.log('✅ No immediate cleanup needed');
    console.log('   All subjects are within reasonable limits');
  }

  console.log('📈 Monitoring Suggestions:');
  console.log('   - Run this analysis weekly');
  console.log('   - Monitor question creation rates');
  console.log('   - Consider archiving old, unused questions');
  console.log('   - Implement question lifecycle management');
}

// Run the analysis
if (require.main === module) {
  analyzeDatabaseSize()
    .then(() => {
      console.log('🎉 Analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeDatabaseSize };
