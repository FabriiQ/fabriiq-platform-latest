/**
 * Supabase API Direct Cleanup Script
 * 
 * This script uses Supabase REST API directly to avoid Prisma connection issues
 * when dealing with massive datasets.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_OPTIONS = {
  dryRun: false,
  maxQuestionsPerSubject: 10000,
  batchSize: 1000,
  delayBetweenBatches: 2000 // 2 seconds delay
};

/**
 * Main cleanup function using Supabase API
 */
async function cleanupWithSupabaseAPI(options = DEFAULT_OPTIONS) {
  console.log('🚀 Starting Supabase API Direct Cleanup');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE CLEANUP'}`);
  console.log(`Max questions per subject: ${options.maxQuestionsPerSubject}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log('⚡ Using Supabase REST API directly');
  console.log('');

  try {
    // Test connection first
    await testConnection();

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
      await performSupabaseCleanup(subjectsToCleanup, options);
    }

    console.log('\n🎉 Supabase API cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  }
}

/**
 * Test Supabase connection
 */
async function testConnection() {
  console.log('🔗 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('Subject')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
    
    console.log('✅ Connection successful!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    throw error;
  }
}

/**
 * Get subjects that need cleanup using Supabase API
 */
async function getSubjectsNeedingCleanup(options) {
  console.log('📊 Analyzing subjects...');
  
  // Get all subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('Subject')
    .select('id, name, code');
  
  if (subjectsError) {
    throw new Error(`Failed to fetch subjects: ${subjectsError.message}`);
  }

  const results = [];
  
  // Check question count for each subject
  for (const subject of subjects) {
    console.log(`   Checking ${subject.name}...`);
    
    const { count, error } = await supabase
      .from('Question')
      .select('*', { count: 'exact', head: true })
      .eq('subjectId', subject.id);
    
    if (error) {
      console.error(`   ❌ Error counting questions for ${subject.name}: ${error.message}`);
      continue;
    }
    
    if (count > options.maxQuestionsPerSubject) {
      const excessQuestions = count - options.maxQuestionsPerSubject;
      
      results.push({
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        totalQuestions: count,
        questionsToDelete: excessQuestions
      });
      
      console.log(`   ⚠️  ${subject.name}: ${count.toLocaleString()} questions (${excessQuestions.toLocaleString()} excess)`);
    } else {
      console.log(`   ✅ ${subject.name}: ${count.toLocaleString()} questions (within limit)`);
    }
  }

  return results.sort((a, b) => b.questionsToDelete - a.questionsToDelete);
}

/**
 * Display cleanup plan
 */
function displayCleanupPlan(subjects) {
  console.log('\n📋 Cleanup Plan:');
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
 * Perform cleanup using Supabase API
 */
async function performSupabaseCleanup(subjects, options) {
  for (const subject of subjects) {
    console.log(`\n📚 Processing ${subject.subjectName}...`);
    console.log(`   Target: Delete ${subject.questionsToDelete.toLocaleString()} questions`);
    
    let deletedCount = 0;
    let remainingToDelete = subject.questionsToDelete;
    
    while (remainingToDelete > 0 && deletedCount < subject.questionsToDelete) {
      try {
        const batchSize = Math.min(options.batchSize, remainingToDelete);
        
        console.log(`   Fetching ${batchSize} oldest questions...`);
        
        // Get oldest questions without usage stats
        const { data: questionsToDelete, error: fetchError } = await supabase
          .from('Question')
          .select('id')
          .eq('subjectId', subject.subjectId)
          .is('usageStats', null)
          .order('createdAt', { ascending: true })
          .limit(batchSize);
        
        if (fetchError) {
          console.error(`   ❌ Error fetching questions: ${fetchError.message}`);
          break;
        }
        
        if (!questionsToDelete || questionsToDelete.length === 0) {
          console.log(`   ⚠️  No more questions found to delete`);
          break;
        }
        
        console.log(`   Deleting ${questionsToDelete.length} questions...`);
        
        // Delete the questions
        const questionIds = questionsToDelete.map(q => q.id);
        const { error: deleteError } = await supabase
          .from('Question')
          .delete()
          .in('id', questionIds);
        
        if (deleteError) {
          console.error(`   ❌ Error deleting questions: ${deleteError.message}`);
          
          // Try smaller batches if we get an error
          if (options.batchSize > 100) {
            console.log(`   🔄 Trying smaller batch size...`);
            options.batchSize = Math.max(100, Math.floor(options.batchSize / 2));
            continue;
          } else {
            break;
          }
        }
        
        const actualDeleted = questionsToDelete.length;
        deletedCount += actualDeleted;
        remainingToDelete -= actualDeleted;
        
        const progress = ((deletedCount / subject.questionsToDelete) * 100).toFixed(1);
        console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.questionsToDelete.toLocaleString()} (${progress}%)`);
        
        // Delay between batches
        if (remainingToDelete > 0) {
          console.log(`   ⏳ Waiting ${options.delayBetweenBatches}ms...`);
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
        
      } catch (error) {
        console.error(`   ❌ Error in batch: ${error.message}`);
        
        // Increase delay on errors
        console.log(`   🔄 Increasing delay and retrying...`);
        options.delayBetweenBatches = Math.min(10000, options.delayBetweenBatches * 1.5);
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
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
        options.batchSize = parseInt(args[++i]) || 1000;
        break;
      case '--delay':
        options.delayBetweenBatches = parseInt(args[++i]) || 2000;
        break;
      case '--help':
        console.log(`
Usage: node scripts/cleanup-with-supabase-api.js [options]

Uses Supabase REST API directly to avoid Prisma connection issues.

Options:
  --dry-run              Run in analysis mode (no actual deletion)
  --max-questions <num>  Maximum questions per subject (default: 10000)
  --batch-size <num>     Questions to delete per batch (default: 1000)
  --delay <ms>          Delay between batches in milliseconds (default: 2000)
  --help                Show this help message

Examples:
  node scripts/cleanup-with-supabase-api.js --dry-run
  node scripts/cleanup-with-supabase-api.js --max-questions 5000
  node scripts/cleanup-with-supabase-api.js --batch-size 500 --delay 3000
        `);
        process.exit(0);
    }
  }
  
  await cleanupWithSupabaseAPI(options);
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

module.exports = { cleanupWithSupabaseAPI };
