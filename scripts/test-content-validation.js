/**
 * Test Content Validation
 * Tests the content security middleware to ensure it's working properly
 */

const { ContentSecurityMiddleware } = require('../src/features/social-wall/middleware/content-security.middleware.ts');

async function testContentValidation() {
  console.log('🧪 Testing content validation...\n');

  const middleware = new ContentSecurityMiddleware({
    enableLinkValidation: true,
    enableProfanityFilter: true,
    enableSpamDetection: true,
    maxLinkCount: 3,
  });

  const testCases = [
    {
      name: 'Simple text post',
      content: 'Hello everyone! How are you doing today?',
      shouldPass: true
    },
    {
      name: 'Educational link',
      content: 'Check out this great resource: https://www.khanacademy.org/math',
      shouldPass: true
    },
    {
      name: 'YouTube educational video',
      content: 'Here is a helpful video: https://www.youtube.com/watch?v=example',
      shouldPass: true
    },
    {
      name: 'GitHub repository',
      content: 'Our class project is here: https://github.com/user/project',
      shouldPass: true
    },
    {
      name: 'Localhost development',
      content: 'Check the local server: http://localhost:3000/test',
      shouldPass: true
    },
    {
      name: 'Multiple educational links',
      content: 'Resources: https://edu.example.com/course1 and https://coursera.org/course2',
      shouldPass: true
    },
    {
      name: 'Too many links',
      content: 'Links: https://site1.com https://site2.com https://site3.com https://site4.com https://site5.com',
      shouldPass: false
    },
    {
      name: 'Empty content',
      content: '',
      shouldPass: false
    },
    {
      name: 'Very long content',
      content: 'a'.repeat(5001),
      shouldPass: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await middleware.validateContent(testCase.content, 'post');
      const actuallyPassed = result.isValid;
      
      if (actuallyPassed === testCase.shouldPass) {
        console.log(`✅ ${testCase.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}, Got: ${actuallyPassed ? 'PASS' : 'FAIL'}`);
        console.log(`   Violations: ${result.violations.join(', ')}`);
        console.log(`   Risk Score: ${result.riskScore}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Content validation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Content validation may need adjustment.');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testContentValidation().catch(console.error);
}

module.exports = { testContentValidation };
