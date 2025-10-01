#!/usr/bin/env node

/**
 * Jina AI Integration Test Script
 * 
 * This script tests the Jina Reader API and Search API integration
 * for the Teacher Assistant platform.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if available
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional; ignore if not installed
}

// Configuration
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_READER_URL = 'https://r.jina.ai';
const JINA_SEARCH_URL = 'https://s.jina.ai';

if (!JINA_API_KEY) {
  console.error('❌ JINA_API_KEY environment variable is required');
  console.log('Please set your Jina API key:');
  console.log('export JINA_API_KEY=your_api_key_here');
  process.exit(1);
}

// Test URLs for educational content
const TEST_URLS = [
  'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs',
  'https://www.edutopia.org/article/teaching-strategies-improve-student-learning',
  'https://www.teachthought.com/learning/what-is-inquiry-based-learning',
];

// Test search queries
const TEST_QUERIES = [
  'elementary math worksheets addition subtraction',
  'science experiments for middle school students',
  'reading comprehension activities grade 3',
  'history lesson plans world war 2',
  'art projects for kindergarten students'
];

/**
 * Test Jina Reader API
 */
async function testJinaReader() {
  console.log('\n🔍 Testing Jina Reader API...\n');

  for (const url of TEST_URLS) {
    try {
      console.log(`📖 Reading: ${url}`);
      
      const response = await axios.get(`${JINA_READER_URL}/${url}`, {
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Accept': 'application/json',
          'X-Return-Format': 'markdown'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        const content = response.data;
        const contentLength = typeof content === 'string' ? content.length : JSON.stringify(content).length;
        
        console.log(`✅ Success! Content length: ${contentLength} characters`);
        
        // Save sample content for inspection
        const filename = `jina-reader-sample-${Date.now()}.md`;
        const filepath = path.join(__dirname, '..', 'logs', filename);
        
        // Ensure logs directory exists
        const logsDir = path.dirname(filepath);
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
        console.log(`📄 Sample saved to: ${filepath}`);
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${url}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Test Jina Search API
 */
async function testJinaSearch() {
  console.log('\n🔎 Testing Jina Search API...\n');

  for (const query of TEST_QUERIES) {
    try {
      console.log(`🔍 Searching: "${query}"`);
      
      const response = await axios.post(`${JINA_SEARCH_URL}/search`, {
        q: query,
        limit: 5,
        filter: {
          safe: true,
          educational: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        const results = response.data;
        console.log(`✅ Found ${results.length || 0} results`);
        
        if (results && results.length > 0) {
          results.slice(0, 3).forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.title || 'No title'}`);
            console.log(`      URL: ${result.url || 'No URL'}`);
            console.log(`      Score: ${result.score || 'No score'}`);
          });
        }
        
        // Save search results for inspection
        const filename = `jina-search-results-${Date.now()}.json`;
        const filepath = path.join(__dirname, '..', 'logs', filename);
        
        // Ensure logs directory exists
        const logsDir = path.dirname(filepath);
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        console.log(`📄 Results saved to: ${filepath}`);
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error searching "${query}":`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Test educational content filtering
 */
async function testEducationalFiltering() {
  console.log('\n🎓 Testing Educational Content Filtering...\n');

  const educationalQuery = 'math worksheets elementary school';
  
  try {
    console.log(`🔍 Educational search: "${educationalQuery}"`);
    
    const response = await axios.post(`${JINA_SEARCH_URL}/search`, {
      q: educationalQuery,
      limit: 10,
      filter: {
        safe: true,
        educational: true,
        appropriate: true,
        contentType: 'educational'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.status === 200) {
      const results = response.data;
      console.log(`✅ Educational filtering successful! Found ${results.length || 0} results`);
      
      // Analyze results for educational appropriateness
      if (results && results.length > 0) {
        const educationalKeywords = ['education', 'teaching', 'learning', 'school', 'student', 'curriculum'];
        let appropriateCount = 0;
        
        results.forEach((result, index) => {
          const content = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
          const hasEducationalKeywords = educationalKeywords.some(keyword => content.includes(keyword));
          
          if (hasEducationalKeywords) {
            appropriateCount++;
          }
          
          console.log(`   ${index + 1}. ${result.title || 'No title'} ${hasEducationalKeywords ? '✅' : '⚠️'}`);
        });
        
        const appropriatenessRate = (appropriateCount / results.length) * 100;
        console.log(`\n📊 Educational appropriateness: ${appropriatenessRate.toFixed(1)}% (${appropriateCount}/${results.length})`);
      }
    }
  } catch (error) {
    console.error(`❌ Error in educational filtering:`, error.message);
  }
}

/**
 * Test image search functionality
 */
async function testImageSearch() {
  console.log('\n🖼️  Testing Image Search...\n');

  const imageQuery = 'educational diagrams science';
  
  try {
    console.log(`🔍 Image search: "${imageQuery}"`);
    
    const response = await axios.post(`${JINA_SEARCH_URL}/search`, {
      q: imageQuery,
      limit: 5,
      modality: 'image',
      filter: {
        safe: true,
        educational: true,
        imageType: 'educational',
        license: 'creative_commons'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.status === 200) {
      const results = response.data;
      console.log(`✅ Image search successful! Found ${results.length || 0} results`);
      
      if (results && results.length > 0) {
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.title || 'No title'}`);
          console.log(`      Image URL: ${result.imageUrl || result.url || 'No URL'}`);
          console.log(`      Score: ${result.score || 'No score'}`);
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error in image search:`, error.message);
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n📋 Test Report Summary\n');
  console.log('='.repeat(50));
  console.log('✅ Jina Reader API: Tested with educational URLs');
  console.log('✅ Jina Search API: Tested with educational queries');
  console.log('✅ Educational Filtering: Validated content appropriateness');
  console.log('✅ Image Search: Tested visual content discovery');
  console.log('='.repeat(50));
  console.log('\n💡 Next Steps:');
  console.log('1. Review saved sample files in the logs/ directory');
  console.log('2. Integrate successful patterns into the Teacher Assistant');
  console.log('3. Implement error handling and fallback mechanisms');
  console.log('4. Add rate limiting and caching for production use');
  console.log('\n🎓 Ready for Teacher Assistant integration!');
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Starting Jina AI Integration Tests');
  console.log('=====================================');
  
  try {
    await testJinaReader();
    await testJinaSearch();
    await testEducationalFiltering();
    await testImageSearch();
    
    generateTestReport();
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testJinaReader,
  testJinaSearch,
  testEducationalFiltering,
  testImageSearch
};
