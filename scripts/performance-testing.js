#!/usr/bin/env node

/**
 * Automated Performance Testing Suite for FabriiQ Platform
 * 
 * This script provides comprehensive performance testing including
 * load testing, API benchmarks, and performance regression detection.
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

console.log('🚀 FabriiQ Performance Testing Suite');
console.log('====================================');

/**
 * Performance test configuration
 */
const TEST_CONFIG = {
  // Test endpoints
  ENDPOINTS: [
    { path: '/api/health', method: 'GET', expectedStatus: 200 },
    { path: '/api/user/profile', method: 'GET', expectedStatus: 401 }, // No auth
    { path: '/api/classes', method: 'GET', expectedStatus: 401 }, // No auth
    { path: '/api/subjects', method: 'GET', expectedStatus: 200 },
  ],
  
  // Load test parameters
  LOAD_TEST: {
    concurrent: 10,
    requests: 100,
    duration: 30000, // 30 seconds
  },
  
  // Performance thresholds
  THRESHOLDS: {
    responseTime: 1000, // 1 second
    errorRate: 5, // 5%
    throughput: 50, // requests per second
  },
  
  // Test environment
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
};

/**
 * Performance test result interface
 */
class PerformanceTestResult {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.tests = [];
    this.summary = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      averageResponseTime: 0,
      totalRequests: 0,
      errorRate: 0,
    };
  }
  
  addTest(test) {
    this.tests.push(test);
    this.summary.totalTests++;
    
    if (test.passed) {
      this.summary.passed++;
    } else {
      this.summary.failed++;
    }
  }
  
  finalize() {
    const totalResponseTime = this.tests.reduce((sum, test) => sum + test.responseTime, 0);
    this.summary.averageResponseTime = totalResponseTime / this.tests.length;
    this.summary.totalRequests = this.tests.reduce((sum, test) => sum + (test.requests || 1), 0);
    
    const errors = this.tests.reduce((sum, test) => sum + (test.errors || 0), 0);
    this.summary.errorRate = (errors / this.summary.totalRequests) * 100;
  }
}

/**
 * HTTP client for testing
 */
class TestHttpClient {
  async request(url, options = {}) {
    const startTime = performance.now();
    
    try {
      // Use dynamic import for fetch in Node.js
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FabriiQ-Performance-Test/1.0',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        timeout: 10000, // 10 second timeout
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      let responseData = null;
      try {
        responseData = await response.json();
      } catch (e) {
        // Response is not JSON
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        responseTime,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      };
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      return {
        status: 0,
        statusText: 'Network Error',
        responseTime,
        error: error.message,
      };
    }
  }
}

/**
 * Single endpoint performance test
 */
async function testEndpoint(client, endpoint) {
  console.log(`📊 Testing ${endpoint.method} ${endpoint.path}...`);
  
  const url = `${TEST_CONFIG.BASE_URL}${endpoint.path}`;
  const response = await client.request(url, { method: endpoint.method });
  
  const passed = response.status === endpoint.expectedStatus && 
                 response.responseTime < TEST_CONFIG.THRESHOLDS.responseTime;
  
  const test = {
    endpoint: endpoint.path,
    method: endpoint.method,
    expectedStatus: endpoint.expectedStatus,
    actualStatus: response.status,
    responseTime: Math.round(response.responseTime),
    passed,
    error: response.error,
    headers: response.headers,
  };
  
  if (passed) {
    console.log(`  ✅ ${endpoint.path}: ${response.status} (${test.responseTime}ms)`);
  } else {
    console.log(`  ❌ ${endpoint.path}: ${response.status} (${test.responseTime}ms) - Expected ${endpoint.expectedStatus}`);
  }
  
  return test;
}

/**
 * Load testing for a single endpoint
 */
async function loadTestEndpoint(client, endpoint) {
  console.log(`🔥 Load testing ${endpoint.method} ${endpoint.path}...`);
  
  const url = `${TEST_CONFIG.BASE_URL}${endpoint.path}`;
  const { concurrent, requests } = TEST_CONFIG.LOAD_TEST;
  
  const results = [];
  const errors = [];
  const startTime = performance.now();
  
  // Create batches of concurrent requests
  const batchSize = concurrent;
  const totalBatches = Math.ceil(requests / batchSize);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const batchRequests = Math.min(batchSize, requests - (batch * batchSize));
    const promises = [];
    
    for (let i = 0; i < batchRequests; i++) {
      promises.push(client.request(url, { method: endpoint.method }));
    }
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.status >= 400) {
          errors.push(result.value);
        }
      } else {
        errors.push({ error: result.reason.message });
      }
    });
    
    // Small delay between batches to avoid overwhelming the server
    if (batch < totalBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  // Calculate statistics
  const responseTimes = results.map(r => r.responseTime);
  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  const throughput = (results.length / totalTime) * 1000; // requests per second
  const errorRate = (errors.length / results.length) * 100;
  
  const loadTest = {
    endpoint: endpoint.path,
    method: endpoint.method,
    requests: results.length,
    errors: errors.length,
    totalTime: Math.round(totalTime),
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime: Math.round(minResponseTime),
    maxResponseTime: Math.round(maxResponseTime),
    throughput: Math.round(throughput * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    passed: errorRate < TEST_CONFIG.THRESHOLDS.errorRate && 
            averageResponseTime < TEST_CONFIG.THRESHOLDS.responseTime &&
            throughput > TEST_CONFIG.THRESHOLDS.throughput,
  };
  
  if (loadTest.passed) {
    console.log(`  ✅ Load test passed: ${loadTest.throughput} req/s, ${loadTest.averageResponseTime}ms avg`);
  } else {
    console.log(`  ❌ Load test failed: ${loadTest.throughput} req/s, ${loadTest.averageResponseTime}ms avg, ${loadTest.errorRate}% errors`);
  }
  
  return loadTest;
}

/**
 * Memory usage test
 */
function testMemoryUsage() {
  console.log('🧠 Testing memory usage...');
  
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const rssMB = usage.rss / 1024 / 1024;
  
  const memoryTest = {
    heapUsed: Math.round(heapUsedMB),
    heapTotal: Math.round(heapTotalMB),
    rss: Math.round(rssMB),
    heapUsagePercent: Math.round((heapUsedMB / heapTotalMB) * 100),
    passed: heapUsedMB < 512 && rssMB < 1024, // Less than 512MB heap, 1GB RSS
  };
  
  if (memoryTest.passed) {
    console.log(`  ✅ Memory usage: ${memoryTest.heapUsed}MB heap, ${memoryTest.rss}MB RSS`);
  } else {
    console.log(`  ❌ High memory usage: ${memoryTest.heapUsed}MB heap, ${memoryTest.rss}MB RSS`);
  }
  
  return memoryTest;
}

/**
 * Generate performance report
 */
function generateReport(results) {
  const report = `# FabriiQ Performance Test Report

## Test Summary
- **Timestamp**: ${results.timestamp}
- **Total Tests**: ${results.summary.totalTests}
- **Passed**: ${results.summary.passed}
- **Failed**: ${results.summary.failed}
- **Average Response Time**: ${Math.round(results.summary.averageResponseTime)}ms
- **Total Requests**: ${results.summary.totalRequests}
- **Error Rate**: ${Math.round(results.summary.errorRate * 100) / 100}%

## Individual Test Results

${results.tests.map(test => `
### ${test.endpoint || 'Memory Test'} ${test.method || ''}
- **Status**: ${test.passed ? '✅ PASSED' : '❌ FAILED'}
- **Response Time**: ${test.responseTime || test.averageResponseTime || 'N/A'}ms
- **Expected Status**: ${test.expectedStatus || 'N/A'}
- **Actual Status**: ${test.actualStatus || 'N/A'}
${test.throughput ? `- **Throughput**: ${test.throughput} req/s` : ''}
${test.errorRate !== undefined ? `- **Error Rate**: ${test.errorRate}%` : ''}
${test.heapUsed ? `- **Heap Used**: ${test.heapUsed}MB` : ''}
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('\n')}

## Performance Thresholds
- **Response Time**: < ${TEST_CONFIG.THRESHOLDS.responseTime}ms
- **Error Rate**: < ${TEST_CONFIG.THRESHOLDS.errorRate}%
- **Throughput**: > ${TEST_CONFIG.THRESHOLDS.throughput} req/s

## Recommendations

${results.summary.failed > 0 ? `
### Issues Found
- ${results.summary.failed} test(s) failed
- Review failed endpoints and optimize performance
- Check error logs for detailed error information
` : ''}

${results.summary.averageResponseTime > TEST_CONFIG.THRESHOLDS.responseTime ? `
### Performance Optimization
- Average response time (${Math.round(results.summary.averageResponseTime)}ms) exceeds threshold
- Consider implementing caching strategies
- Optimize database queries and API endpoints
` : ''}

${results.summary.errorRate > TEST_CONFIG.THRESHOLDS.errorRate ? `
### Error Rate Concerns
- Error rate (${Math.round(results.summary.errorRate * 100) / 100}%) exceeds threshold
- Investigate error causes and implement fixes
- Add better error handling and monitoring
` : ''}

---
*Generated by FabriiQ Performance Testing Suite*
`;

  return report;
}

/**
 * Main performance testing function
 */
async function runPerformanceTests() {
  const results = new PerformanceTestResult();
  const client = new TestHttpClient();
  
  try {
    console.log(`🎯 Testing against: ${TEST_CONFIG.BASE_URL}\n`);
    
    // Test individual endpoints
    console.log('📊 Running endpoint tests...\n');
    for (const endpoint of TEST_CONFIG.ENDPOINTS) {
      try {
        const test = await testEndpoint(client, endpoint);
        results.addTest(test);
      } catch (error) {
        console.error(`❌ Error testing ${endpoint.path}:`, error.message);
        results.addTest({
          endpoint: endpoint.path,
          method: endpoint.method,
          passed: false,
          error: error.message,
          responseTime: 0,
        });
      }
    }
    
    console.log('\n🔥 Running load tests...\n');
    
    // Load test critical endpoints
    const criticalEndpoints = TEST_CONFIG.ENDPOINTS.filter(e => 
      e.path === '/api/health' || e.path === '/api/subjects'
    );
    
    for (const endpoint of criticalEndpoints) {
      try {
        const loadTest = await loadTestEndpoint(client, endpoint);
        results.addTest(loadTest);
      } catch (error) {
        console.error(`❌ Error load testing ${endpoint.path}:`, error.message);
        results.addTest({
          endpoint: endpoint.path,
          method: endpoint.method,
          passed: false,
          error: error.message,
          responseTime: 0,
        });
      }
    }
    
    console.log('\n🧠 Running memory tests...\n');
    
    // Test memory usage
    const memoryTest = testMemoryUsage();
    results.addTest(memoryTest);
    
    // Finalize results
    results.finalize();
    
    // Generate and save report
    const report = generateReport(results);
    const reportPath = path.join(process.cwd(), 'performance-test-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log('\n🎉 PERFORMANCE TESTING COMPLETED!');
    console.log('==================================');
    console.log(`📊 Total Tests: ${results.summary.totalTests}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⏱️  Average Response Time: ${Math.round(results.summary.averageResponseTime)}ms`);
    console.log(`📈 Total Requests: ${results.summary.totalRequests}`);
    console.log(`💥 Error Rate: ${Math.round(results.summary.errorRate * 100) / 100}%`);
    console.log(`📄 Report saved: ${reportPath}`);
    
    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n💥 Performance testing failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { runPerformanceTests };
