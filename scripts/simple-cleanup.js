/**
 * Simple Cleanup Script
 * 
 * Uses Prisma with robust error handling and connection management
 */

const { PrismaClient } = require('@prisma/client');

// Create Prisma client with optimized settings
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const MAX_QUESTIONS_PER_SUBJECT = 10000;
const BATCH_SIZE = 200; // Smaller batches to avoid timeouts
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

console.log('🚀 Starting Simple Cleanup');
console.log('='.repeat(50));
console.log(`Max questions per subject: ${MAX_QUESTIONS_PER_SUBJECT}`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log('');

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get subjects that need cleanup
 */
async function getSubjectsNeedingCleanup() {
  console.log('📊 Getting subjects that need cleanup...');
  
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      code: true
    }
  });
  
  console.log(`Found ${subjects.length} subjects total`);
  
  const subjectsToCleanup = [];
  
  for (const subject of subjects) {
    try {
      console.log(`   Checking ${subject.name}...`);
      
      const questionCount = await prisma.question.count({
        where: { subjectId: subject.id }
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
      
      // Small delay between checks
      await sleep(100);
      
    } catch (error) {
      console.error(`   ❌ Error checking ${subject.name}: ${error.message}`);
    }
  }
  
  return subjectsToCleanup.sort((a, b) => b.excessQuestions - a.excessQuestions);
}

/**
 * Delete questions for a subject
 */
async function deleteQuestionsForSubject(subject) {
  console.log(`\n📚 Processing ${subject.name} (${subject.code})`);
  console.log(`   Target: Delete ${subject.excessQuestions.toLocaleString()} questions`);
  
  let deletedCount = 0;
  let remainingToDelete = subject.excessQuestions;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (remainingToDelete > 0 && deletedCount < subject.excessQuestions && retryCount < maxRetries) {
    try {
      const batchSize = Math.min(BATCH_SIZE, remainingToDelete);
      
      console.log(`   Getting ${batchSize} oldest questions...`);
      
      // Get oldest questions without usage stats
      const questions = await prisma.question.findMany({
        where: {
          subjectId: subject.id,
          usageStats: null
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: batchSize
      });
      
      if (questions.length === 0) {
        console.log(`   ⚠️  No more questions found to delete`);
        break;
      }
      
      console.log(`   Deleting ${questions.length} questions...`);
      
      // Delete questions
      const questionIds = questions.map(q => q.id);
      
      try {
        const result = await prisma.question.deleteMany({
          where: {
            id: { in: questionIds }
          }
        });
        
        deletedCount += result.count;
        remainingToDelete -= result.count;
        retryCount = 0; // Reset retry count on success
        
        const progress = ((deletedCount / subject.excessQuestions) * 100).toFixed(1);
        console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.excessQuestions.toLocaleString()} (${progress}%)`);
        
      } catch (deleteError) {
        console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
        
        if (deleteError.code === 'P1017' || deleteError.message.includes('connection')) {
          console.log(`   🔄 Connection lost, reconnecting...`);
          await prisma.$disconnect();
          await sleep(5000);
          retryCount++;
          continue;
        }
        
        // Try deleting individually
        console.log(`   🔄 Trying individual deletions...`);
        let individualDeleted = 0;
        
        for (const questionId of questionIds) {
          try {
            await prisma.question.delete({
              where: { id: questionId }
            });
            individualDeleted++;
            
            if (individualDeleted % 50 === 0) {
              console.log(`     Individual progress: ${individualDeleted}/${questionIds.length}`);
            }
            
            await sleep(50); // Small delay
            
          } catch (individualError) {
            console.error(`     ❌ Failed to delete question ${questionId}`);
          }
        }
        
        deletedCount += individualDeleted;
        remainingToDelete -= individualDeleted;
        
        console.log(`   Individual deletions: ${individualDeleted}/${questionIds.length} successful`);
      }
      
      // Delay between batches
      if (remainingToDelete > 0) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await sleep(DELAY_BETWEEN_BATCHES);
      }
      
    } catch (error) {
      console.error(`   ❌ Error in batch: ${error.message}`);
      
      if (error.code === 'P1017' || error.message.includes('connection')) {
        console.log(`   🔄 Connection error, reconnecting...`);
        await prisma.$disconnect();
        await sleep(5000);
        retryCount++;
      } else {
        console.error(`   ❌ Unrecoverable error, stopping cleanup for this subject`);
        break;
      }
    }
  }
  
  if (retryCount >= maxRetries) {
    console.log(`   ⚠️  Max retries reached for ${subject.name}`);
  }
  
  console.log(`   ✅ Completed ${subject.name}: ${deletedCount.toLocaleString()} questions deleted`);
  return deletedCount;
}

/**
 * Main cleanup function
 */
async function performCleanup() {
  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    const testCount = await prisma.subject.count();
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
      console.log('');
      totalToDelete += subject.excessQuestions;
    });
    
    console.log(`📊 Total questions to delete: ${totalToDelete.toLocaleString()}`);
    console.log('');
    
    // Perform cleanup
    console.log('🧹 Starting cleanup...');
    let totalDeleted = 0;
    
    for (const subject of subjectsToCleanup) {
      const deleted = await deleteQuestionsForSubject(subject);
      totalDeleted += deleted;
      
      // Longer delay between subjects
      console.log(`   ⏳ Waiting 5 seconds before next subject...`);
      await sleep(5000);
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total questions deleted: ${totalDeleted.toLocaleString()}`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
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
