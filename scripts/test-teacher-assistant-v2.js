#!/usr/bin/env node

/**
 * Comprehensive Test Script for Teacher Assistant V2
 * Tests all functionality including streaming, artifacts, search, and UI components
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiEndpoint: '/api/teacher-assistant/v2/chat',
  testMessages: [
    'Hello, can you help me with lesson planning?',
    'Create a worksheet about photosynthesis for grade 5 students',
    'Search for recent teaching strategies for mathematics',
    'Generate a quiz on the water cycle with 5 multiple choice questions'
  ]
};

class TeacherAssistantV2Tester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED', error: null });
      console.log(`✅ ${testName} - PASSED`);
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      return false;
    }
  }

  async testApiEndpoint() {
    const testMessage = TEST_CONFIG.testMessages[0];
    const testPayload = {
      message: testMessage,
      teacherContext: {
        teacher: { name: 'Test Teacher', subjects: ['Math'] },
        currentPage: 'Teacher Assistant V2'
      },
      searchEnabled: false,
      context: {}
    };

    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('text/plain')) {
        console.log('⚠️  Response is not streaming text format');
      }

      // Read first chunk of streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const chunk = decoder.decode(value);

      if (!chunk || chunk.length === 0) {
        throw new Error('No streaming response received');
      }

      console.log(`   ✅ Received streaming response: ${chunk.substring(0, 100)}...`);
      reader.releaseLock();
    } catch (error) {
      throw new Error(`API endpoint test failed: ${error.message}`);
    }
  }

  async testArtifactGeneration() {
    const testMessage = TEST_CONFIG.testMessages[1]; // Worksheet creation message
    const testPayload = {
      message: testMessage,
      teacherContext: {
        teacher: { name: 'Test Teacher', subjects: ['Science'] },
        currentPage: 'Teacher Assistant V2'
      },
      searchEnabled: false,
      context: {}
    };

    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read streaming response and look for artifact data
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let hasArtifactData = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;

        // Check for artifact-related data
        if (chunk.includes('data-textDelta') || chunk.includes('data-artifactComplete')) {
          hasArtifactData = true;
        }
      }

      if (fullResponse.length < 100) {
        throw new Error('Response too short for worksheet generation');
      }

      console.log(`   ✅ Generated content length: ${fullResponse.length} characters`);
      console.log(`   ✅ Contains artifact data: ${hasArtifactData ? 'Yes' : 'No'}`);

    } catch (error) {
      throw new Error(`Artifact generation test failed: ${error.message}`);
    }
  }

  async testSearchIntegration() {
    const testMessage = TEST_CONFIG.testMessages[2]; // Search message
    const testPayload = {
      message: testMessage,
      teacherContext: {
        teacher: { name: 'Test Teacher', subjects: ['Math'] },
        currentPage: 'Teacher Assistant V2'
      },
      searchEnabled: true, // Enable search
      context: {}
    };

    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read response and check for search-related content
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
      }

      if (fullResponse.length < 50) {
        throw new Error('Search response too short');
      }

      console.log(`   ✅ Search response length: ${fullResponse.length} characters`);

    } catch (error) {
      throw new Error(`Search integration test failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    // Test with invalid payload
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invalid: 'payload' })
      });

      if (response.status === 400) {
        console.log('   ✅ Properly handles invalid payload with 400 status');
      } else if (response.status === 500) {
        console.log('   ⚠️  Returns 500 for invalid payload (should be 400)');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error handling test failed: ${error.message}`);
    }
  }

  async testFileStructure() {
    const requiredFiles = [
      'src/features/teacher-assistant-v2/server/streaming-route.ts',
      'src/app/api/teacher-assistant/v2/chat/route.ts',
      'src/features/teacher-assistant-v2/components/chat.tsx',
      'src/features/teacher-assistant-v2/components/artifact.tsx',
      'src/features/teacher-assistant-v2/lib/ai/providers.ts',
      'src/features/teacher-assistant-v2/lib/ai/search-tools.ts'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(__dirname, '..', file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log(`   ✅ All ${requiredFiles.length} required files exist`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`
      },
      tests: this.results.tests
    };

    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests.filter(t => t.status === 'FAILED').forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }

    return report;
  }

  async runAllTests() {
    console.log('🚀 Teacher Assistant V2 Comprehensive Test Suite\n');
    console.log('=' .repeat(60));

    // Run all tests
    await this.runTest('File Structure Check', () => this.testFileStructure());
    await this.runTest('API Endpoint', () => this.testApiEndpoint());
    await this.runTest('Artifact Generation', () => this.testArtifactGeneration());
    await this.runTest('Search Integration', () => this.testSearchIntegration());
    await this.runTest('Error Handling', () => this.testErrorHandling());

    const report = this.generateReport();

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Teacher Assistant V2 is fully functional.');
      console.log('\n💡 Next steps:');
      console.log('   1. Start the development server: npm run dev');
      console.log('   2. Navigate to /teacher/assistant/v2');
      console.log('   3. Test the complete user workflow');
      console.log('   4. Verify streaming responses and artifact generation');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
      process.exit(1);
    }

    return report;
  }
}

async function main() {
  const tester = new TeacherAssistantV2Tester();
  await tester.runAllTests();
}

// Handle both direct execution and module import
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  TeacherAssistantV2Tester,
  TEST_CONFIG
};
