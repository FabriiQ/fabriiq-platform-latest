/**
 * Efficient Cleanup Script
 * 
 * Optimized for connection pool limits and large datasets
 */

const { PrismaClient } = require('@prisma/client');

// Create single Prisma client with optimized connection settings
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const MAX_QUESTIONS_PER_SUBJECT = 10000;
const SMALL_BATCH_SIZE = 100; // Very small batches to avoid timeouts
const DELAY_BETWEEN_OPERATIONS = 1000; // 1 second delay

console.log('🚀 Starting Efficient Cleanup');
console.log('='.repeat(50));
console.log(`Max questions per subject: ${MAX_QUESTIONS_PER_SUBJECT}`);
console.log(`Batch size: ${SMALL_BATCH_SIZE}`);
console.log('⚡ Optimized for connection pool limits');
console.log('');

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute with retry logic
 */
async function executeWithRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`   Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait longer between retries
      await sleep(attempt * 2000);
    }
  }
}

/**
 * Get subjects one by one to avoid connection pool issues
 */
async function getSubjectsNeedingCleanup() {
  console.log('📊 Getting subjects that need cleanup...');
  
  const subjects = await executeWithRetry(async () => {
    return await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    });
  });
  
  console.log(`Found ${subjects.length} subjects total`);
  
  const subjectsToCleanup = [];
  
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    
    try {
      console.log(`   [${i+1}/${subjects.length}] Checking ${subject.name}...`);
      
      const questionCount = await executeWithRetry(async () => {
        return await prisma.question.count({
          where: { subjectId: subject.id }
        });
      });
      
      if (questionCount > MAX_QUESTIONS_PER_SUBJECT) {
        const excess = questionCount - MAX_QUESTIONS_PER_SUBJECT;
        subjectsToCleanup.push({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          totalQuestions: questionCount,
          excessQuestions: excess
        });
        console.log(`   ⚠️  ${subject.name}: ${questionCount.toLocaleString()} questions (${excess.toLocaleString()} excess)`);
      } else {
        console.log(`   ✅ ${subject.name}: ${questionCount.toLocaleString()} questions (OK)`);
      }
      
      // Delay between checks to avoid overwhelming the connection pool
      await sleep(500);
      
    } catch (error) {
      console.error(`   ❌ Error checking ${subject.name}: ${error.message}`);
    }
  }
  
  return subjectsToCleanup.sort((a, b) => b.excessQuestions - a.excessQuestions);
}

/**
 * Delete questions for a subject with very small batches
 */
async function deleteQuestionsForSubject(subject) {
  console.log(`\n📚 Processing ${subject.name} (${subject.code})`);
  console.log(`   Target: Delete ${subject.excessQuestions.toLocaleString()} questions`);
  
  let deletedCount = 0;
  let batchNumber = 0;
  const totalBatches = Math.ceil(subject.excessQuestions / SMALL_BATCH_SIZE);
  
  while (deletedCount < subject.excessQuestions) {
    batchNumber++;
    
    try {
      console.log(`   Batch ${batchNumber}/${totalBatches}: Getting ${SMALL_BATCH_SIZE} questions...`);
      
      // Get a small batch of questions to delete
      const questions = await executeWithRetry(async () => {
        return await prisma.question.findMany({
          where: {
            subjectId: subject.id,
            usageStats: null
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take: SMALL_BATCH_SIZE
        });
      });
      
      if (questions.length === 0) {
        console.log(`   ⚠️  No more questions found to delete`);
        break;
      }
      
      console.log(`   Deleting ${questions.length} questions...`);
      
      // Delete questions one by one to avoid connection pool issues
      let batchDeleted = 0;
      
      for (const question of questions) {
        try {
          await executeWithRetry(async () => {
            return await prisma.question.delete({
              where: { id: question.id }
            });
          });
          
          batchDeleted++;
          deletedCount++;
          
          // Small delay between individual deletions
          await sleep(50);
          
        } catch (deleteError) {
          console.error(`     ❌ Failed to delete question ${question.id}: ${deleteError.message}`);
        }
      }
      
      const progress = ((deletedCount / subject.excessQuestions) * 100).toFixed(1);
      console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.excessQuestions.toLocaleString()} (${progress}%) - Deleted ${batchDeleted}/${questions.length} in this batch`);
      
      // Longer delay between batches
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_OPERATIONS}ms before next batch...`);
      await sleep(DELAY_BETWEEN_OPERATIONS);
      
    } catch (error) {
      console.error(`   ❌ Error in batch ${batchNumber}: ${error.message}`);
      
      // Longer delay on errors
      console.log(`   🔄 Error occurred, waiting 5 seconds before retry...`);
      await sleep(5000);
    }
  }
  
  console.log(`   ✅ Completed ${subject.name}: ${deletedCount.toLocaleString()} questions deleted`);
  return deletedCount;
}

/**
 * Main cleanup function
 */
async function performCleanup() {
  try {
    // Test connection with a simple query
    console.log('🔗 Testing database connection...');
    const testCount = await executeWithRetry(async () => {
      return await prisma.subject.count();
    });
    console.log(`✅ Connection successful! Found ${testCount} subjects`);
    
    // Get subjects that need cleanup
    const subjectsToCleanup = await getSubjectsNeedingCleanup();
    
    if (subjectsToCleanup.length === 0) {
      console.log('✅ No subjects need cleanup!');
      return;
    }
    
    // Display cleanup plan
    console.log('\n📋 Cleanup Plan:');
    console.log('-'.repeat(80));
    let totalToDelete = 0;
    
    subjectsToCleanup.forEach((subject, index) => {
      console.log(`${index + 1}. ${subject.name} (${subject.code})`);
      console.log(`   Current: ${subject.totalQuestions.toLocaleString()} questions`);
      console.log(`   Will delete: ${subject.excessQuestions.toLocaleString()} questions`);
      console.log(`   Will keep: ${(subject.totalQuestions - subject.excessQuestions).toLocaleString()} questions`);
      console.log(`   Estimated batches: ${Math.ceil(subject.excessQuestions / SMALL_BATCH_SIZE)}`);
      console.log('');
      totalToDelete += subject.excessQuestions;
    });
    
    console.log(`📊 Total questions to delete: ${totalToDelete.toLocaleString()}`);
    console.log(`📊 Estimated total batches: ${Math.ceil(totalToDelete / SMALL_BATCH_SIZE)}`);
    console.log(`⏱️  Estimated time: ${Math.ceil(totalToDelete / SMALL_BATCH_SIZE * 2 / 60)} minutes`);
    console.log('');
    
    // Perform cleanup
    console.log('🧹 Starting cleanup...');
    let totalDeleted = 0;
    
    for (let i = 0; i < subjectsToCleanup.length; i++) {
      const subject = subjectsToCleanup[i];
      console.log(`\n[${i+1}/${subjectsToCleanup.length}] Processing subject...`);
      
      const deleted = await deleteQuestionsForSubject(subject);
      totalDeleted += deleted;
      
      // Longer delay between subjects
      if (i < subjectsToCleanup.length - 1) {
        console.log(`   ⏳ Waiting 10 seconds before next subject...`);
        await sleep(10000);
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total questions deleted: ${totalDeleted.toLocaleString()}`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    await sleep(5000); // Wait for database to settle
    
    const finalSubjects = await getSubjectsNeedingCleanup();
    
    if (finalSubjects.length === 0) {
      console.log('✅ All subjects are now within limits!');
    } else {
      console.log(`⚠️  ${finalSubjects.length} subjects still need cleanup`);
      finalSubjects.forEach(subject => {
        console.log(`   ${subject.name}: ${subject.excessQuestions.toLocaleString()} excess questions remaining`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
performCleanup()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
