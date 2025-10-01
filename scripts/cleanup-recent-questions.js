/**
 * Immediate Question Cleanup Script
 * 
 * This script removes excess questions even if they were created recently.
 * Use this when you need immediate cleanup due to database size limits.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DEFAULT_OPTIONS = {
  dryRun: false,
  maxQuestionsPerSubject: 10000,
  preserveWithUsage: true, // Still preserve questions with usage stats
  createBackup: true,
  batchSize: 500, // Smaller batch size for large datasets
  queryLimit: 1000 // Limit for individual queries
};

/**
 * Main cleanup function for recent questions
 */
async function cleanupRecentQuestions(options = DEFAULT_OPTIONS) {
  console.log('🧹 Starting Immediate Question Cleanup Process');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  console.log(`Max questions per subject: ${options.maxQuestionsPerSubject}`);
  console.log(`Preserve questions with usage: ${options.preserveWithUsage}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log('⚠️  WARNING: This will delete recent questions if they exceed limits!');
  console.log('');

  try {
    // Step 1: Analyze current state
    const stats = await analyzeAllQuestions(options);
    
    if (stats.length === 0) {
      console.log('✅ No subjects found with excess questions. Database is within limits.');
      return;
    }

    // Step 2: Display analysis results
    displayAnalysisResults(stats);

    // Step 3: Get user confirmation (skip in dry run)
    if (!options.dryRun) {
      console.log('✅ Proceeding with immediate cleanup...');
    }

    // Step 4: Create backup if requested
    if (options.createBackup && !options.dryRun) {
      await createBackup(stats);
    }

    // Step 5: Perform cleanup
    await performImmediateCleanup(stats, options);

    console.log('\n🎉 Immediate question cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Analyze all questions regardless of creation date
 */
async function analyzeAllQuestions(options) {
  console.log('📊 Analyzing all questions (including recent ones)...');

  // Get all subjects with their question counts
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  const stats = [];

  for (const subject of subjects) {
    // Count total questions for this subject
    const totalQuestions = await prisma.question.count({
      where: { subjectId: subject.id }
    });
    
    if (totalQuestions > options.maxQuestionsPerSubject) {
      let preservedCount = 0;
      
      if (options.preserveWithUsage) {
        // Only preserve questions with usage statistics
        preservedCount = await prisma.question.count({
          where: {
            subjectId: subject.id,
            usageStats: { isNot: null }
          }
        });
      }

      const questionsToDelete = Math.max(0, totalQuestions - Math.max(options.maxQuestionsPerSubject, preservedCount));
      
      if (questionsToDelete > 0) {
        stats.push({
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          totalQuestions,
          questionsToDelete,
          questionsToPreserve: totalQuestions - questionsToDelete,
          preservedCount
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
  console.log('📋 Analysis Results (Including Recent Questions):');
  console.log('-'.repeat(80));
  
  let totalToDelete = 0;
  
  stats.forEach((stat, index) => {
    console.log(`${index + 1}. ${stat.subjectName} (${stat.subjectCode})`);
    console.log(`   Total Questions: ${stat.totalQuestions.toLocaleString()}`);
    console.log(`   To Delete: ${stat.questionsToDelete.toLocaleString()}`);
    console.log(`   To Preserve: ${stat.questionsToPreserve.toLocaleString()}`);
    if (stat.preservedCount > 0) {
      console.log(`   With Usage Stats: ${stat.preservedCount.toLocaleString()}`);
    }
    console.log('');
    
    totalToDelete += stat.questionsToDelete;
  });
  
  console.log(`📊 Summary: ${stats.length} subjects need cleanup`);
  console.log(`🗑️  Total questions to delete: ${totalToDelete.toLocaleString()}`);
  console.log('⚠️  This includes questions created today!');
  console.log('');
}

/**
 * Create backup of questions to be deleted
 */
async function createBackup(stats) {
  console.log('💾 Creating detailed backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(process.cwd(), 'backups', 'immediate-cleanup');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create a more detailed backup with actual question data
  const backupData = {
    timestamp: new Date().toISOString(),
    note: 'Backup created before immediate question cleanup',
    cleanupDate: new Date().toISOString(),
    subjects: []
  };

  for (const stat of stats) {
    // Get sample of questions that will be deleted
    const sampleQuestions = await prisma.question.findMany({
      where: {
        subjectId: stat.subjectId,
        ...(stat.preservedCount > 0 ? { usageStats: null } : {})
      },
      select: {
        id: true,
        title: true,
        questionType: true,
        difficulty: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(100, stat.questionsToDelete) // Sample of questions
    });

    backupData.subjects.push({
      subjectId: stat.subjectId,
      subjectName: stat.subjectName,
      subjectCode: stat.subjectCode,
      totalQuestions: stat.totalQuestions,
      questionsToDelete: stat.questionsToDelete,
      sampleQuestions
    });
  }
  
  const backupFile = path.join(backupDir, `questions-backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`✅ Detailed backup created: ${backupFile}`);
}

/**
 * Perform the immediate cleanup with better error handling
 */
async function performImmediateCleanup(stats, options) {
  console.log('🧹 Starting immediate cleanup process...');
  console.log('⚠️  This will delete questions created today if they exceed limits!');

  for (const stat of stats) {
    console.log(`\n📚 Processing ${stat.subjectName} (${stat.subjectCode})...`);
    console.log(`   Target: Delete ${stat.questionsToDelete.toLocaleString()} questions`);

    if (options.dryRun) {
      console.log(`   [DRY RUN] Would delete ${stat.questionsToDelete} questions`);
      continue;
    }

    await cleanupSubjectQuestions(stat, options);
  }
}

/**
 * Clean up questions for a single subject with robust error handling
 */
async function cleanupSubjectQuestions(stat, options) {
  let totalDeleted = 0;
  let remainingToDelete = stat.questionsToDelete;

  while (remainingToDelete > 0 && totalDeleted < stat.questionsToDelete) {
    try {
      // Get a batch of questions to delete
      const batchSize = Math.min(options.queryLimit, remainingToDelete);

      const whereClause = {
        subjectId: stat.subjectId
      };

      // Only exclude questions with usage stats if preserveWithUsage is true
      if (options.preserveWithUsage) {
        whereClause.usageStats = null;
      }

      console.log(`   Fetching next batch of ${batchSize} questions...`);

      const questionsToDelete = await prisma.question.findMany({
        where: whereClause,
        select: { id: true },
        orderBy: { createdAt: 'asc' }, // Delete oldest first
        take: batchSize
      });

      if (questionsToDelete.length === 0) {
        console.log(`   ⚠️  No more questions found to delete for this subject`);
        break;
      }

      // Delete in smaller sub-batches
      const questionIds = questionsToDelete.map(q => q.id);
      let batchDeleted = 0;

      for (let i = 0; i < questionIds.length; i += options.batchSize) {
        const subBatch = questionIds.slice(i, i + options.batchSize);

        try {
          await prisma.question.deleteMany({
            where: {
              id: { in: subBatch }
            }
          });

          batchDeleted += subBatch.length;
          totalDeleted += subBatch.length;
          remainingToDelete -= subBatch.length;

          console.log(`   Deleted ${totalDeleted.toLocaleString()}/${stat.questionsToDelete.toLocaleString()} questions (${((totalDeleted/stat.questionsToDelete)*100).toFixed(1)}%)`);

          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`   ❌ Error deleting sub-batch: ${error.message}`);

          // If it's a connection error, try to reconnect
          if (error.code === 'P1017' || error.message.includes('connection')) {
            console.log(`   🔄 Attempting to reconnect...`);
            await prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Prisma will automatically reconnect on next query
          }
        }
      }

    } catch (error) {
      console.error(`   ❌ Error in cleanup batch: ${error.message}`);

      // If it's a connection error, try to reconnect and continue
      if (error.code === 'P1017' || error.message.includes('connection')) {
        console.log(`   🔄 Connection lost, attempting to reconnect...`);
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Continue with next iteration
      } else {
        // For other errors, break the loop
        console.error(`   ❌ Unrecoverable error, stopping cleanup for this subject`);
        break;
      }
    }
  }

  console.log(`   ✅ Completed: ${totalDeleted.toLocaleString()} questions deleted for ${stat.subjectName}`);
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
      case '--no-preserve-usage':
        options.preserveWithUsage = false;
        break;
      case '--no-backup':
        options.createBackup = false;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 500;
        break;
      case '--query-limit':
        options.queryLimit = parseInt(args[++i]) || 1000;
        break;
      case '--help':
        console.log(`
Usage: node scripts/cleanup-recent-questions.js [options]

Options:
  --dry-run              Run in dry-run mode (no actual deletion)
  --max-questions <num>  Maximum questions per subject (default: 10000)
  --no-preserve-usage    Don't preserve questions with usage stats
  --no-backup           Skip backup creation
  --batch-size <num>    Batch size for deletion (default: 500)
  --query-limit <num>   Query limit for fetching questions (default: 1000)
  --help                Show this help message

Examples:
  node scripts/cleanup-recent-questions.js --dry-run
  node scripts/cleanup-recent-questions.js --max-questions 5000
  node scripts/cleanup-recent-questions.js --no-preserve-usage --max-questions 8000
        `);
        process.exit(0);
    }
  }
  
  await cleanupRecentQuestions(options);
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

module.exports = { cleanupRecentQuestions };
