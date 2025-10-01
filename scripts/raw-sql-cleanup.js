/**
 * Raw SQL Cleanup Script
 * 
 * Uses direct PostgreSQL connection to bypass Prisma issues
 */

const { Client } = require('pg');
require('dotenv').config();

// Extract connection details from DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_QUESTIONS_PER_SUBJECT = 10000;
const BATCH_SIZE = 1000;

console.log('🚀 Starting Raw SQL Cleanup');
console.log('='.repeat(50));
console.log(`Database URL: ${DATABASE_URL ? 'Found' : 'Missing'}`);
console.log(`Max questions per subject: ${MAX_QUESTIONS_PER_SUBJECT}`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log('');

/**
 * Create database client
 */
function createClient() {
  return new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get subjects that need cleanup
 */
async function getSubjectsNeedingCleanup(client) {
  console.log('📊 Getting subjects that need cleanup...');
  
  const query = `
    SELECT 
      s.id,
      s.name,
      s.code,
      COUNT(q.id) as question_count
    FROM "Subject" s
    LEFT JOIN "Question" q ON s.id = q."subjectId"
    GROUP BY s.id, s.name, s.code
    HAVING COUNT(q.id) > $1
    ORDER BY COUNT(q.id) DESC
  `;
  
  const result = await client.query(query, [MAX_QUESTIONS_PER_SUBJECT]);
  
  const subjectsToCleanup = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    code: row.code,
    totalQuestions: parseInt(row.question_count),
    excessQuestions: parseInt(row.question_count) - MAX_QUESTIONS_PER_SUBJECT
  }));
  
  console.log(`Found ${subjectsToCleanup.length} subjects that need cleanup`);
  
  subjectsToCleanup.forEach((subject, index) => {
    console.log(`   ${index + 1}. ${subject.name} (${subject.code}): ${subject.totalQuestions.toLocaleString()} questions (${subject.excessQuestions.toLocaleString()} excess)`);
  });
  
  return subjectsToCleanup;
}

/**
 * Delete questions for a subject
 */
async function deleteQuestionsForSubject(client, subject) {
  console.log(`\n📚 Processing ${subject.name} (${subject.code})`);
  console.log(`   Target: Delete ${subject.excessQuestions.toLocaleString()} questions`);
  
  let deletedCount = 0;
  let batchNumber = 0;
  const totalBatches = Math.ceil(subject.excessQuestions / BATCH_SIZE);
  
  while (deletedCount < subject.excessQuestions) {
    batchNumber++;
    
    try {
      console.log(`   Batch ${batchNumber}/${totalBatches}: Deleting up to ${BATCH_SIZE} questions...`);
      
      // Delete oldest questions without usage stats
      const deleteQuery = `
        DELETE FROM "Question" 
        WHERE id IN (
          SELECT id FROM "Question" 
          WHERE "subjectId" = $1 
          AND "usageStats" IS NULL
          ORDER BY "createdAt" ASC 
          LIMIT $2
        )
      `;
      
      const result = await client.query(deleteQuery, [subject.id, BATCH_SIZE]);
      const batchDeleted = result.rowCount;
      
      if (batchDeleted === 0) {
        console.log(`   ⚠️  No more questions found to delete`);
        break;
      }
      
      deletedCount += batchDeleted;
      
      const progress = ((deletedCount / subject.excessQuestions) * 100).toFixed(1);
      console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.excessQuestions.toLocaleString()} (${progress}%) - Deleted ${batchDeleted} in this batch`);
      
      // Delay between batches
      if (deletedCount < subject.excessQuestions) {
        console.log(`   ⏳ Waiting 2 seconds before next batch...`);
        await sleep(2000);
      }
      
    } catch (error) {
      console.error(`   ❌ Error in batch ${batchNumber}: ${error.message}`);
      
      // Wait longer on errors
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
  const client = createClient();
  
  try {
    // Connect to database
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test connection
    const testResult = await client.query('SELECT COUNT(*) FROM "Subject"');
    const subjectCount = testResult.rows[0].count;
    console.log(`✅ Found ${subjectCount} subjects in database`);
    
    // Get subjects that need cleanup
    const subjectsToCleanup = await getSubjectsNeedingCleanup(client);
    
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
      console.log(`   Estimated batches: ${Math.ceil(subject.excessQuestions / BATCH_SIZE)}`);
      console.log('');
      totalToDelete += subject.excessQuestions;
    });
    
    console.log(`📊 Total questions to delete: ${totalToDelete.toLocaleString()}`);
    console.log(`📊 Estimated total batches: ${Math.ceil(totalToDelete / BATCH_SIZE)}`);
    console.log(`⏱️  Estimated time: ${Math.ceil(totalToDelete / BATCH_SIZE * 3 / 60)} minutes`);
    console.log('');
    
    // Perform cleanup
    console.log('🧹 Starting cleanup...');
    let totalDeleted = 0;
    
    for (let i = 0; i < subjectsToCleanup.length; i++) {
      const subject = subjectsToCleanup[i];
      console.log(`\n[${i+1}/${subjectsToCleanup.length}] Processing subject...`);
      
      const deleted = await deleteQuestionsForSubject(client, subject);
      totalDeleted += deleted;
      
      // Delay between subjects
      if (i < subjectsToCleanup.length - 1) {
        console.log(`   ⏳ Waiting 5 seconds before next subject...`);
        await sleep(5000);
      }
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total questions deleted: ${totalDeleted.toLocaleString()}`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    await sleep(3000); // Wait for database to settle
    
    const finalSubjects = await getSubjectsNeedingCleanup(client);
    
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
    await client.end();
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
