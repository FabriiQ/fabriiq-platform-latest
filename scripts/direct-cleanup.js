/**
 * Direct HTTP Cleanup Script
 * 
 * Uses direct HTTP requests to Supabase REST API to delete excess questions
 * This is the most reliable approach for massive datasets.
 */

const https = require('https');
const http = require('http');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_QUESTIONS_PER_SUBJECT = 10000;
const BATCH_SIZE = 500;
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds

console.log('🚀 Starting Direct HTTP Cleanup');
console.log('='.repeat(50));
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Max questions per subject: ${MAX_QUESTIONS_PER_SUBJECT}`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log('');

/**
 * Make HTTP request to Supabase
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = responseData ? JSON.parse(responseData) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: result, count: res.headers['content-range'] });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        } catch (error) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: null, count: res.headers['content-range'] });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get count from content-range header
 */
function getCountFromHeader(contentRange) {
  if (!contentRange) return 0;
  const match = contentRange.match(/\/(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Get subjects that need cleanup
 */
async function getSubjectsNeedingCleanup() {
  console.log('📊 Getting subjects...');
  
  try {
    const { data: subjects } = await makeRequest('GET', '/Subject?select=id,name,code');
    console.log(`Found ${subjects.length} subjects`);
    
    const subjectsToCleanup = [];
    
    for (const subject of subjects) {
      console.log(`   Checking ${subject.name}...`);
      
      try {
        const { count } = await makeRequest('GET', `/Question?subjectId=eq.${subject.id}&select=id`, null);
        const questionCount = getCountFromHeader(count);
        
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
      } catch (error) {
        console.error(`   ❌ Error checking ${subject.name}: ${error.message}`);
      }
    }
    
    return subjectsToCleanup.sort((a, b) => b.excessQuestions - a.excessQuestions);
    
  } catch (error) {
    console.error('❌ Error getting subjects:', error.message);
    throw error;
  }
}

/**
 * Delete questions for a subject
 */
async function deleteQuestionsForSubject(subject) {
  console.log(`\n📚 Processing ${subject.name} (${subject.code})`);
  console.log(`   Target: Delete ${subject.excessQuestions.toLocaleString()} questions`);
  
  let deletedCount = 0;
  let remainingToDelete = subject.excessQuestions;
  
  while (remainingToDelete > 0 && deletedCount < subject.excessQuestions) {
    try {
      const batchSize = Math.min(BATCH_SIZE, remainingToDelete);
      
      console.log(`   Getting ${batchSize} oldest questions...`);
      
      // Get oldest questions without usage stats
      const { data: questions } = await makeRequest('GET', 
        `/Question?subjectId=eq.${subject.id}&usageStats=is.null&select=id&order=createdAt.asc&limit=${batchSize}`
      );
      
      if (!questions || questions.length === 0) {
        console.log(`   ⚠️  No more questions found to delete`);
        break;
      }
      
      console.log(`   Deleting ${questions.length} questions...`);
      
      // Delete questions by ID
      const questionIds = questions.map(q => q.id);
      
      // Use IN filter for deletion
      const deleteFilter = `id=in.(${questionIds.join(',')})`;
      
      try {
        await makeRequest('DELETE', `/Question?${deleteFilter}`);
        
        deletedCount += questions.length;
        remainingToDelete -= questions.length;
        
        const progress = ((deletedCount / subject.excessQuestions) * 100).toFixed(1);
        console.log(`   Progress: ${deletedCount.toLocaleString()}/${subject.excessQuestions.toLocaleString()} (${progress}%)`);
        
      } catch (deleteError) {
        console.error(`   ❌ Error deleting batch: ${deleteError.message}`);
        
        // Try deleting one by one if batch fails
        console.log(`   🔄 Trying individual deletions...`);
        let individualDeleted = 0;
        
        for (const questionId of questionIds) {
          try {
            await makeRequest('DELETE', `/Question?id=eq.${questionId}`);
            individualDeleted++;
            
            if (individualDeleted % 10 === 0) {
              console.log(`     Individual progress: ${individualDeleted}/${questionIds.length}`);
            }
            
            // Small delay between individual deletions
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (individualError) {
            console.error(`     ❌ Failed to delete question ${questionId}: ${individualError.message}`);
          }
        }
        
        deletedCount += individualDeleted;
        remainingToDelete -= individualDeleted;
        
        console.log(`   Individual deletions: ${individualDeleted}/${questionIds.length} successful`);
      }
      
      // Delay between batches
      if (remainingToDelete > 0) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
      
    } catch (error) {
      console.error(`   ❌ Error in batch: ${error.message}`);
      
      // Increase delay on errors
      console.log(`   🔄 Increasing delay and retrying...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES * 2));
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
    // Test connection
    console.log('🔗 Testing connection...');
    await makeRequest('GET', '/Subject?select=id&limit=1');
    console.log('✅ Connection successful!');
    
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
    }
    
    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📊 Total questions deleted: ${totalDeleted.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
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
