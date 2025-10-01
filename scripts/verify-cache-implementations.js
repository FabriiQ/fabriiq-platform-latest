#!/usr/bin/env node

/**
 * Cache Implementation Verification Script
 * 
 * This script verifies that all cache implementations are working correctly
 * and not conflicting with each other.
 */

console.log('🔍 FabriiQ Cache Implementation Verification');
console.log('==========================================');

/**
 * Test cache implementations
 */
async function verifyCacheImplementations() {
  const results = {
    advancedCache: false,
    staticDataCache: false,
    apiCacheMiddleware: false,
    memoryManagement: false,
    errors: [],
  };

  try {
    console.log('\n📦 Testing Advanced Cache...');
    
    // Test advanced cache
    try {
      const { advancedCache } = require('../src/lib/advanced-cache');
      
      // Test basic operations
      await advancedCache.set('test-key', { data: 'test' });
      const retrieved = await advancedCache.get('test-key');
      
      if (retrieved && retrieved.data === 'test') {
        console.log('  ✅ Advanced cache basic operations working');
        results.advancedCache = true;
      } else {
        console.log('  ❌ Advanced cache basic operations failed');
        results.errors.push('Advanced cache basic operations failed');
      }
      
      // Test cache statistics
      const stats = advancedCache.getCacheStats();
      if (stats && typeof stats === 'object') {
        console.log('  ✅ Advanced cache statistics working');
        console.log(`     Memory cache: ${stats.memory.size}/${stats.memory.max}`);
        console.log(`     Query cache: ${stats.query.size}/${stats.query.max}`);
        console.log(`     Static cache: ${stats.static.size}/${stats.static.max}`);
        console.log(`     Redis connected: ${stats.redis.connected}`);
      }
      
    } catch (error) {
      console.log('  ❌ Advanced cache test failed:', error.message);
      results.errors.push(`Advanced cache: ${error.message}`);
    }

    console.log('\n📊 Testing Static Data Cache...');
    
    // Test static data cache
    try {
      const { staticDataCache } = require('../src/lib/static-data-cache');
      
      // Test timezone data
      const timezones = staticDataCache.getTimezones();
      if (Array.isArray(timezones) && timezones.length > 0) {
        console.log('  ✅ Static data cache timezone data working');
        console.log(`     Loaded ${timezones.length} timezones`);
        results.staticDataCache = true;
      } else {
        console.log('  ❌ Static data cache timezone data failed');
        results.errors.push('Static data cache timezone data failed');
      }
      
      // Test user types
      const userTypes = staticDataCache.getUserTypes();
      if (Array.isArray(userTypes) && userTypes.length > 0) {
        console.log('  ✅ Static data cache user types working');
        console.log(`     Loaded ${userTypes.length} user types`);
      }
      
    } catch (error) {
      console.log('  ❌ Static data cache test failed:', error.message);
      results.errors.push(`Static data cache: ${error.message}`);
    }

    console.log('\n🔧 Testing API Cache Middleware...');
    
    // Test API cache middleware
    try {
      const { API_CACHE_CONFIG } = require('../src/lib/api-cache-middleware');
      
      if (API_CACHE_CONFIG && typeof API_CACHE_CONFIG === 'object') {
        const configKeys = Object.keys(API_CACHE_CONFIG);
        console.log('  ✅ API cache middleware configuration loaded');
        console.log(`     Configured routes: ${configKeys.length}`);
        console.log(`     Sample routes: ${configKeys.slice(0, 3).join(', ')}`);
        results.apiCacheMiddleware = true;
      } else {
        console.log('  ❌ API cache middleware configuration failed');
        results.errors.push('API cache middleware configuration failed');
      }
      
    } catch (error) {
      console.log('  ❌ API cache middleware test failed:', error.message);
      results.errors.push(`API cache middleware: ${error.message}`);
    }

    console.log('\n🧠 Testing Memory Management...');
    
    // Test memory management
    try {
      const { getMemoryManagementStatus } = require('../src/lib/memory-management');
      
      const status = getMemoryManagementStatus();
      if (status && typeof status === 'object') {
        console.log('  ✅ Memory management status working');
        console.log(`     Monitoring: ${status.monitoring}`);
        console.log(`     Cache cleanup: ${status.cacheCleanup}`);
        console.log(`     Memory usage: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB`);
        
        if (status.cacheStats && Object.keys(status.cacheStats).length > 0) {
          console.log('     Cache statistics:');
          Object.entries(status.cacheStats).forEach(([name, stats]) => {
            console.log(`       ${name}: ${stats.size}/${stats.maxSize} (${stats.usage})`);
          });
        }
        
        results.memoryManagement = true;
      } else {
        console.log('  ❌ Memory management status failed');
        results.errors.push('Memory management status failed');
      }
      
    } catch (error) {
      console.log('  ❌ Memory management test failed:', error.message);
      results.errors.push(`Memory management: ${error.message}`);
    }

    console.log('\n🔍 Testing Cache Namespace Separation...');
    
    // Test that caches don't conflict
    try {
      const { advancedCache } = require('../src/lib/advanced-cache');
      
      // Set data in different cache tiers
      await advancedCache.set('test-memory', { source: 'memory' }, { tier: 'memory' });
      await advancedCache.set('test-static', { source: 'static' }, { tier: 'static' });
      
      // Retrieve and verify separation
      const memoryData = await advancedCache.get('test-memory');
      const staticData = await advancedCache.get('test-static');
      
      if (memoryData?.source === 'memory' && staticData?.source === 'static') {
        console.log('  ✅ Cache namespace separation working');
      } else {
        console.log('  ❌ Cache namespace separation failed');
        results.errors.push('Cache namespace separation failed');
      }
      
    } catch (error) {
      console.log('  ❌ Cache namespace test failed:', error.message);
      results.errors.push(`Cache namespace: ${error.message}`);
    }

    return results;
    
  } catch (error) {
    console.error('\n💥 Cache verification failed:', error.message);
    results.errors.push(`General error: ${error.message}`);
    return results;
  }
}

/**
 * Generate verification report
 */
function generateVerificationReport(results) {
  const report = `# Cache Implementation Verification Report

## Test Results
- **Advanced Cache**: ${results.advancedCache ? '✅ PASSED' : '❌ FAILED'}
- **Static Data Cache**: ${results.staticDataCache ? '✅ PASSED' : '❌ FAILED'}
- **API Cache Middleware**: ${results.apiCacheMiddleware ? '✅ PASSED' : '❌ FAILED'}
- **Memory Management**: ${results.memoryManagement ? '✅ PASSED' : '❌ FAILED'}

## Summary
- **Total Tests**: 4
- **Passed**: ${Object.values(results).filter(v => v === true).length}
- **Failed**: ${results.errors.length}

${results.errors.length > 0 ? `
## Errors
${results.errors.map(error => `- ${error}`).join('\n')}
` : ''}

## Recommendations

${results.errors.length === 0 ? `
### ✅ All Tests Passed
The cache implementation is working correctly with no conflicts detected.

**Next Steps:**
1. Deploy to production with confidence
2. Monitor cache performance in production
3. Set up alerts for cache failures
4. Review cache hit rates regularly
` : `
### ⚠️ Issues Detected
Some cache implementations have issues that need to be addressed.

**Action Required:**
1. Review and fix the errors listed above
2. Re-run verification after fixes
3. Test in development environment
4. Monitor closely during deployment
`}

---
*Generated by FabriiQ Cache Verification Script*
*Timestamp: ${new Date().toISOString()}*
`;

  require('fs').writeFileSync('cache-verification-report.md', report);
  return report;
}

/**
 * Main verification function
 */
async function runVerification() {
  try {
    console.log('🚀 Starting cache implementation verification...\n');
    
    const results = await verifyCacheImplementations();
    
    console.log('\n📄 Generating verification report...');
    const report = generateVerificationReport(results);
    
    console.log('\n🎉 CACHE VERIFICATION COMPLETED!');
    console.log('================================');
    console.log(`✅ Passed: ${Object.values(results).filter(v => v === true).length}/4`);
    console.log(`❌ Failed: ${results.errors.length}`);
    
    if (results.errors.length === 0) {
      console.log('\n🎯 All cache implementations are working correctly!');
      console.log('✅ No conflicts detected');
      console.log('✅ Memory management operational');
      console.log('✅ Ready for production deployment');
    } else {
      console.log('\n⚠️  Some issues detected:');
      results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      console.log('\n📋 Please review and fix the issues before deployment');
    }
    
    console.log('\n📄 Detailed report saved: cache-verification-report.md');
    
    // Exit with appropriate code
    process.exit(results.errors.length === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Verification script failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification };
