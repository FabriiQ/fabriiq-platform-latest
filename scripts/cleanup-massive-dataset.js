/**
 * Massive Dataset Cleanup Script
 * 
 * This script is optimized for very large datasets (hundreds of thousands of questions)
 * It uses direct SQL operations for better performance with Supabase.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const DEFAULT_OPTIONS = {
  dryRun: false,
  maxQuestionsPerSubject: 10000,
  batchSize: 2000, // Larger batches for direct deletion
  delayBetweenBatches: 1000 // 1 second delay between batches
};

/**
 * Main cleanup function optimized for massive datasets
 */
async function cleanupMassiveDataset(options = DEFAULT_OPTIONS) {
  console.log('🚀 Starting Massive Dataset Cleanup');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  console.log(`Max questions per subject: ${options.maxQuestionsPerSubject}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log('⚠️  Optimized for very large datasets!');
  console.log('');

  try {
    // Step 1: Get subjects that need cleanup
    const subjectsToCleanup = await getSubjectsNeedingCleanup(options);
    
    if (subjectsToCleanup.length === 0) {
      console.log('✅ No subjects found with excess questions.');
      return;
    }

    // Step 2: Display what will be cleaned
    displayCleanupPlan(subjectsToCleanup);

    // Step 3: Perform cleanup
    if (!options.dryRun) {
      console.log('🧹 Starting cleanup...');
      await performMassiveCleanup(subjectsToCleanup, options);
    }

    console.log('\n🎉 Massive dataset cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get subjects that need cleanup using efficient queries
 */
async function getSubjectsNeedingCleanup(options) {
  console.log('📊 Analyzing subjects with efficient queries...');
  
  // Use raw SQL for better performance with large datasets
  const subjectsWithCounts = await prisma.$queryRaw`
    SELECT 
      s.id,
      s.name,
      s.code,
      COUNT(q.id) as question_count
    FROM "Subject" s
    LEFT JOIN "Question" q ON s.id = q."subjectId"
    GROUP BY s.id, s.name, s.code
    HAVING COUNT(q.id) > ${options.maxQuestionsPerSubject}
    ORDER BY COUNT(q.id) DESC
  `;

  const results = [];
  
  for (const subject of subjectsWithCounts) {
    const questionCount = parseInt(subject.question_count);
    const excessQuestions = questionCount - options.maxQuestionsPerSubject;
    
    results.push({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      totalQuestions: questionCount,
      questionsToDelete: excessQuestions
    });
  }

  return results;
}

/**
 * Display cleanup plan
 */
function displayCleanupPlan(subjects) {
  console.log('📋 Cleanup Plan:');
  console.log('-'.repeat(80));
  
  let totalToDelete = 0;
  
  subjects.forEach((subject, index) => {
    console.log(`${index + 1}. ${subject.subjectName} (${subject.subjectCode})`);
    console.log(`   Current: ${subject.totalQuestions.toLocaleString()} questions`);
    console.log(`   Will delete: ${subject.questionsToDelete.toLocaleString()} questions`);
    console.log(`   Will keep: ${(subject.totalQuestions - subject.questionsToDelete).toLocaleString()} questions`);
    console.log('');
    
    totalToDelete += subject.questionsToDelete;
  });
  
  console.log(`📊 Total questions to delete: ${totalToDelete.toLocaleString()}`);
  console.log('');
}

/**
 * Perform massive cleanup using efficient batch operations
 */
async function performMassiveCleanup(subjects, options) {
  for (const subject of subjects) {
    console.log(`\n📚 Processing ${subject.subjectName}...`);
    console.log(`   Target: Delete ${subject.questionsToDelete.toLocaleString()} questions`);
    
    let deletedCount = 0;
    let remainingToDelete = subject.questionsToDelete;
    
    while (remainingToDelete > 0) {
      try {
        const batchSize = Math.min(options.batchSize, remainingToDelete);
        
        console.log(`   Deleting batch of ${batchSize.toLocaleString()} questions...`);
        
        // Use raw SQL for efficient deletion of oldest questions
        const result = await prisma.$executeRaw`
          DELETE FROM "Question" 
          WHERE id IN (
            SELECT id FROM "Question" 
            WHERE "subjectId" = ${subject.subjectId}
            AND "usageStats" IS NULL
            ORDER BY "createdAt" ASC 
            LIMIT ${batchSize}
          )
        `;
        
        const actualDeleted = Number(result);
        deletedCount += actualDeleted;
        remainingToDelete -= actualDeleted;
        
        const progress = ((deletedCount / subject.questionsToDelete) * 100).toFixed(1);
        console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.questionsToDelete.toLocaleString()} (${progress}%)`);
        
        // If we didn't delete as many as expected, we might be done
        if (actualDeleted < batchSize) {
          console.log(`   ⚠️  Deleted fewer questions than expected. Might be done with this subject.`);
          break;
        }
        
        // Delay between batches to prevent overwhelming the database
        if (remainingToDelete > 0) {
          console.log(`   ⏳ Waiting ${options.delayBetweenBatches}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(`   ❌ Error in batch deletion: ${error.message}`);
        
        if (error.message.includes('connection') || error.code === 'P1017') {
          console.log(`   🔄 Connection issue, waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.error(`   ❌ Stopping cleanup for this subject due to error`);
          break;
        }
      }
    }
    
    console.log(`   ✅ Completed ${subject.subjectName}: ${deletedCount.toLocaleString()} questions deleted`);
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
      case '--batch-size':
        options.batchSize = parseInt(args[++i]) || 2000;
        break;
      case '--delay':
        options.delayBetweenBatches = parseInt(args[++i]) || 1000;
        break;
      case '--help':
        console.log(`
Usage: node scripts/cleanup-massive-dataset.js [options]

Optimized for very large datasets (hundreds of thousands of questions).

Options:
  --dry-run              Run in analysis mode (no actual deletion)
  --max-questions <num>  Maximum questions per subject (default: 10000)
  --batch-size <num>     Questions to delete per batch (default: 2000)
  --delay <ms>          Delay between batches in milliseconds (default: 1000)
  --help                Show this help message

Examples:
  node scripts/cleanup-massive-dataset.js --dry-run
  node scripts/cleanup-massive-dataset.js --max-questions 5000 --batch-size 1000
  node scripts/cleanup-massive-dataset.js --batch-size 3000 --delay 500
        `);
        process.exit(0);
    }
  }
  
  await cleanupMassiveDataset(options);
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

module.exports = { cleanupMassiveDataset };
