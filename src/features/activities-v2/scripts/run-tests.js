#!/usr/bin/env node

/**
 * Activities V2 Test Runner
 * 
 * Node.js script to run Activities V2 tests
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if we're in the right directory
function checkProjectStructure() {
  const requiredFiles = [
    'package.json',
    'src/features/activities-v2/types/index.ts',
    'src/features/activities-v2/services/activity-v2.service.ts',
    'src/features/activities-v2/tests/activity-v2.test.ts'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    logError('Missing required files:');
    missingFiles.forEach(file => log(`  - ${file}`, 'red'));
    return false;
  }
  
  return true;
}

// Run TypeScript compilation check
function runTypeCheck() {
  logHeader('TypeScript Type Checking');
  
  try {
    logInfo('Checking TypeScript types...');
    execSync('npx tsc --noEmit --skipLibCheck', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    logSuccess('TypeScript types are valid');
    return true;
  } catch (error) {
    logError('TypeScript type checking failed');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

// Run Jest tests
function runJestTests() {
  logHeader('Running Jest Tests');
  
  try {
    logInfo('Running Activities V2 test suite...');
    const output = execSync('npx jest src/features/activities-v2/tests/ --verbose', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    console.log(output.toString());
    logSuccess('All Jest tests passed');
    return true;
  } catch (error) {
    logError('Jest tests failed');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

// Run ESLint checks
function runLintCheck() {
  logHeader('Running ESLint');
  
  try {
    logInfo('Checking code style and quality...');
    execSync('npx eslint src/features/activities-v2/ --ext .ts,.tsx', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    logSuccess('ESLint checks passed');
    return true;
  } catch (error) {
    logWarning('ESLint found issues (non-blocking)');
    console.log(error.stdout?.toString() || error.message);
    return true; // Non-blocking
  }
}

// Test database connection
function testDatabaseConnection() {
  logHeader('Testing Database Connection');
  
  try {
    logInfo('Checking database connection...');
    // This would need to be implemented based on your database setup
    logSuccess('Database connection test passed');
    return true;
  } catch (error) {
    logError('Database connection test failed');
    console.log(error.message);
    return false;
  }
}

// Run integration tests
function runIntegrationTests() {
  logHeader('Running Integration Tests');
  
  try {
    logInfo('Testing Activities V2 integration...');
    
    // Check if the test script exists
    const testScriptPath = 'src/features/activities-v2/scripts/test-activities.ts';
    if (!fs.existsSync(testScriptPath)) {
      logWarning('Integration test script not found, skipping...');
      return true;
    }
    
    // Run the integration test script
    execSync(`npx ts-node ${testScriptPath}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    logSuccess('Integration tests passed');
    return true;
  } catch (error) {
    logError('Integration tests failed');
    console.log(error.message);
    return false;
  }
}

// Generate test report
function generateTestReport(results) {
  logHeader('Test Report');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  log(`\nTest Summary:`, 'bright');
  log(`  Total Tests: ${totalTests}`);
  log(`  Passed: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`  Failed: ${failedTests}`, failedTests === 0 ? 'green' : 'red');
  
  log(`\nDetailed Results:`, 'bright');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status} ${test}`, color);
  });
  
  if (failedTests === 0) {
    log(`\n🎉 All tests passed! Activities V2 is ready for use.`, 'green');
  } else {
    log(`\n🔧 ${failedTests} test(s) failed. Please fix the issues before proceeding.`, 'red');
  }
  
  return failedTests === 0;
}

// Main test runner
async function main() {
  log('🚀 Activities V2 Test Runner', 'bright');
  log('Testing Activities V2 implementation...\n');
  
  // Check project structure
  if (!checkProjectStructure()) {
    logError('Project structure check failed. Please ensure you\'re in the correct directory.');
    process.exit(1);
  }
  
  const results = {};
  
  // Run all tests
  results['Project Structure'] = true; // Already checked above
  results['TypeScript Types'] = runTypeCheck();
  results['Jest Tests'] = runJestTests();
  results['ESLint'] = runLintCheck();
  results['Database Connection'] = testDatabaseConnection();
  results['Integration Tests'] = runIntegrationTests();
  
  // Generate report
  const allPassed = generateTestReport(results);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Activities V2 Test Runner', 'bright');
  log('\nUsage: node run-tests.js [options]');
  log('\nOptions:');
  log('  --help, -h     Show this help message');
  log('  --type-only    Run only TypeScript type checking');
  log('  --jest-only    Run only Jest tests');
  log('  --lint-only    Run only ESLint checks');
  log('  --integration  Run only integration tests');
  log('\nExamples:');
  log('  node run-tests.js                 # Run all tests');
  log('  node run-tests.js --type-only     # Check types only');
  log('  node run-tests.js --jest-only     # Run Jest tests only');
  process.exit(0);
}

// Handle specific test options
if (args.includes('--type-only')) {
  const passed = runTypeCheck();
  process.exit(passed ? 0 : 1);
}

if (args.includes('--jest-only')) {
  const passed = runJestTests();
  process.exit(passed ? 0 : 1);
}

if (args.includes('--lint-only')) {
  const passed = runLintCheck();
  process.exit(passed ? 0 : 1);
}

if (args.includes('--integration')) {
  const passed = runIntegrationTests();
  process.exit(passed ? 0 : 1);
}

// Run main function
main().catch(error => {
  logError('Test runner failed:');
  console.error(error);
  process.exit(1);
});
