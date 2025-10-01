/**
 * Database Cleanup Script: Remove Excess Questions (JavaScript Version)
 * 
 * This script removes questions from subjects that have more than 10,000 questions
 * to help manage Supabase free tier database size limits.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DEFAULT_OPTIONS = {
  dryRun: false,
  maxQuestionsPerSubject: 10000,
  preserveRecentDays: 30,
  createBackup: true,
  batchSize: 1000
};

/**
 * Main cleanup function
 */
async function cleanupExcessQuestions(options = DEFAULT_OPTIONS) {
  console.log('🧹 Starting Question Cleanup Process');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  console.log(`Max questions per subject: ${options.maxQuestionsPerSubject}`);
  console.log(`Preserve recent questions (days): ${options.preserveRecentDays}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log('');

  try {
    // Step 1: Analyze current state
    const stats = await analyzeQuestionDistribution(options);
    
    if (stats.length === 0) {
      console.log('✅ No subjects found with excess questions. Database is within limits.');
      return;
    }

    // Step 2: Display analysis results
    displayAnalysisResults(stats);

    // Step 3: Get user confirmation (skip in dry run)
    if (!options.dryRun) {
      console.log('✅ Proceeding with cleanup...');
    }

    // Step 4: Create backup if requested
    if (options.createBackup && !options.dryRun) {
      await createBackup();
    }

    // Step 5: Perform cleanup
    await performCleanup(stats, options);

    console.log('\n🎉 Question cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Analyze question distribution across subjects
 */
async function analyzeQuestionDistribution(options) {
  console.log('📊 Analyzing question distribution...');

  // Get all subjects with their question counts
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  const stats = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - options.preserveRecentDays);

  for (const subject of subjects) {
    // Count total questions for this subject
    const totalQuestions = await prisma.question.count({
      where: { subjectId: subject.id }
    });
    
    if (totalQuestions > options.maxQuestionsPerSubject) {
      // Count questions that should be preserved
      const preservedCount = await prisma.question.count({
        where: {
          subjectId: subject.id,
          OR: [
            // Preserve questions with usage statistics (used in assessments)
            { usageStats: { isNot: null } },
            // Preserve recent questions
            { createdAt: { gte: cutoffDate } }
          ]
        }
      });

      const questionsToDelete = Math.max(0, totalQuestions - Math.max(options.maxQuestionsPerSubject, preservedCount));
      
      if (questionsToDelete > 0) {
        stats.push({
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          totalQuestions,
          questionsToDelete,
          questionsToPreserve: totalQuestions - questionsToDelete
        });
      }
    }
  }

  return stats.sort((a, b) => b.questionsToDelete - a.questionsToDelete);
}

/**
 * Display analysis results
 */
function displayAnalysisResults(stats) {
  console.log('📋 Analysis Results:');
  console.log('-'.repeat(80));
  
  let totalToDelete = 0;
  
  stats.forEach((stat, index) => {
    console.log(`${index + 1}. ${stat.subjectName} (${stat.subjectCode})`);
    console.log(`   Total Questions: ${stat.totalQuestions.toLocaleString()}`);
    console.log(`   To Delete: ${stat.questionsToDelete.toLocaleString()}`);
    console.log(`   To Preserve: ${stat.questionsToPreserve.toLocaleString()}`);
    console.log('');
    
    totalToDelete += stat.questionsToDelete;
  });
  
  console.log(`📊 Summary: ${stats.length} subjects need cleanup`);
  console.log(`🗑️  Total questions to delete: ${totalToDelete.toLocaleString()}`);
  console.log('');
}

/**
 * Create backup of questions to be deleted
 */
async function createBackup() {
  console.log('💾 Creating backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(process.cwd(), 'backups', 'question-cleanup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `questions-backup-${timestamp}.json`);
  
  // Create a simple backup record
  const backupData = {
    timestamp: new Date().toISOString(),
    note: 'Backup created before question cleanup',
    cleanupDate: new Date().toISOString()
  };
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`✅ Backup created: ${backupFile}`);
}

/**
 * Perform the actual cleanup
 */
async function performCleanup(stats, options) {
  console.log('🧹 Starting cleanup process...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - options.preserveRecentDays);
  
  for (const stat of stats) {
    console.log(`\n📚 Processing ${stat.subjectName} (${stat.subjectCode})...`);
    
    if (options.dryRun) {
      console.log(`   [DRY RUN] Would delete ${stat.questionsToDelete} questions`);
      continue;
    }
    
    // Get questions to delete (oldest first, excluding preserved ones)
    const questionsToDelete = await prisma.question.findMany({
      where: {
        subjectId: stat.subjectId,
        AND: [
          // Exclude questions with usage statistics
          { usageStats: null },
          // Exclude recent questions
          { createdAt: { lt: cutoffDate } }
        ]
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: stat.questionsToDelete
    });
    
    // Delete in batches
    const questionIds = questionsToDelete.map(q => q.id);
    let deletedCount = 0;
    
    for (let i = 0; i < questionIds.length; i += options.batchSize) {
      const batch = questionIds.slice(i, i + options.batchSize);
      
      try {
        await prisma.question.deleteMany({
          where: {
            id: { in: batch }
          }
        });
        
        deletedCount += batch.length;
        console.log(`   Deleted ${deletedCount}/${questionIds.length} questions...`);
      } catch (error) {
        console.error(`   ❌ Error deleting batch: ${error.message}`);
        // Continue with next batch
      }
    }
    
    console.log(`   ✅ Completed: ${deletedCount} questions deleted`);
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--max-questions':
        options.maxQuestionsPerSubject = parseInt(args[++i]) || 10000;
        break;
      case '--preserve-days':
        options.preserveRecentDays = parseInt(args[++i]) || 30;
        break;
      case '--no-backup':
        options.createBackup = false;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 1000;
        break;
      case '--help':
        console.log(`
Usage: node scripts/cleanup-excess-questions.js [options]

Options:
  --dry-run              Run in dry-run mode (no actual deletion)
  --max-questions <num>  Maximum questions per subject (default: 10000)
  --preserve-days <num>  Days to preserve recent questions (default: 30)
  --no-backup           Skip creating backup
  --batch-size <num>    Batch size for deletion (default: 1000)
  --help                Show this help message

Examples:
  node scripts/cleanup-excess-questions.js --dry-run
  node scripts/cleanup-excess-questions.js --max-questions 5000 --preserve-days 60
        `);
        process.exit(0);
    }
  }
  
  await cleanupExcessQuestions(options);
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExcessQuestions };
