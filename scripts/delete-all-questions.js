/**
 * Delete All Questions Script
 * 
 * Simple script to delete all questions from the database
 */

const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log('🗑️  Delete All Questions Script');
console.log('='.repeat(50));
console.log('⚠️  WARNING: This will delete ALL questions in the database!');
console.log('');

async function deleteAllQuestions() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Get current count
    console.log('📊 Checking current question count...');
    const countResult = await client.query('SELECT COUNT(*) FROM "Question"');
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`Current questions in database: ${currentCount.toLocaleString()}`);

    if (currentCount === 0) {
      console.log('✅ No questions to delete!');
      return;
    }

    console.log('\n🗑️  Deleting all questions...');
    
    // Delete all questions
    const deleteResult = await client.query('DELETE FROM "Question"');
    const deletedCount = deleteResult.rowCount;
    
    console.log(`✅ Successfully deleted ${deletedCount.toLocaleString()} questions!`);

    // Verify deletion
    const verifyResult = await client.query('SELECT COUNT(*) FROM "Question"');
    const remainingCount = parseInt(verifyResult.rows[0].count);
    
    if (remainingCount === 0) {
      console.log('✅ Verification: All questions have been deleted!');
    } else {
      console.log(`⚠️  Warning: ${remainingCount} questions still remain`);
    }

    // Optional: Reset the sequence
    console.log('\n🔄 Resetting ID sequence...');
    await client.query('ALTER SEQUENCE "Question_id_seq" RESTART WITH 1');
    console.log('✅ ID sequence reset to start from 1');

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('💾 Your database size should now be significantly reduced.');
    console.log('🌱 You can now seed new questions when ready.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the deletion
deleteAllQuestions()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
