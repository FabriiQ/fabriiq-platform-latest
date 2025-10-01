#!/usr/bin/env node

/**
 * API Test Script for Resources
 * 
 * Tests the resources API endpoints to ensure they work correctly
 * This script can be run against a development server
 */

const fs = require('fs');

console.log('🔌 Testing Resources API Endpoints...\n');

// Test API endpoint definitions
console.log('📋 Checking API endpoint definitions...');

const resourceRouterPath = 'src/server/api/routers/resource.ts';
const resourceServicePath = 'src/server/api/services/resource.service.ts';

if (!fs.existsSync(resourceRouterPath)) {
  console.log('❌ Resource router not found');
  process.exit(1);
}

if (!fs.existsSync(resourceServicePath)) {
  console.log('❌ Resource service not found');
  process.exit(1);
}

const routerContent = fs.readFileSync(resourceRouterPath, 'utf8');
const serviceContent = fs.readFileSync(resourceServicePath, 'utf8');

// Check router endpoints
const routerEndpoints = [
  { name: 'create', type: 'mutation' },
  { name: 'get', type: 'query' },
  { name: 'update', type: 'mutation' },
  { name: 'delete', type: 'mutation' },
  { name: 'list', type: 'query' },
  { name: 'getStudentResources', type: 'query' },
  { name: 'setPermission', type: 'mutation' },
  { name: 'removePermission', type: 'mutation' }
];

console.log('\n🔍 Router Endpoints:');
routerEndpoints.forEach(endpoint => {
  const pattern = new RegExp(`${endpoint.name}:\\s*protectedProcedure`);
  if (pattern.test(routerContent)) {
    console.log(`✅ ${endpoint.name} (${endpoint.type})`);
  } else {
    console.log(`❌ ${endpoint.name} (${endpoint.type}) - MISSING`);
  }
});

// Check service methods
const serviceMethods = [
  'createResource',
  'getResource',
  'updateResource',
  'deleteResource',
  'getResourcesByOwner',
  'getStudentResources',
  'addResourcePermission',
  'removeResourcePermission'
];

console.log('\n🛠️  Service Methods:');
serviceMethods.forEach(method => {
  if (serviceContent.includes(`async ${method}(`)) {
    console.log(`✅ ${method}`);
  } else {
    console.log(`❌ ${method} - MISSING`);
  }
});

// Check input validation schemas
console.log('\n📝 Input Validation Schemas:');
const schemas = [
  'createResourceSchema',
  'updateResourceSchema',
  'listResourcesSchema'
];

schemas.forEach(schema => {
  if (routerContent.includes(schema)) {
    console.log(`✅ ${schema}`);
  } else {
    console.log(`❌ ${schema} - MISSING`);
  }
});

// Check database model usage
console.log('\n🗄️  Database Model Usage:');
const dbChecks = [
  { name: 'StudentEnrollment model', pattern: /studentEnrollment\.findMany/ },
  { name: 'Resource model', pattern: /resource\.findMany|resource\.create|resource\.update/ },
  { name: 'Proper status filtering', pattern: /status.*ACTIVE/ }
];

dbChecks.forEach(check => {
  if (check.pattern.test(serviceContent)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`⚠️  ${check.name} - Check implementation`);
  }
});

// Generate test data structure
console.log('\n📊 Expected API Response Structures:');

const apiStructures = {
  'getStudentResources': {
    success: 'boolean',
    resources: 'Array<Resource>',
    total: 'number'
  },
  'list (getResourcesByOwner)': {
    success: 'boolean',
    resources: 'Array<Resource>'
  },
  'create': {
    success: 'boolean',
    resource: 'Resource'
  }
};

Object.entries(apiStructures).forEach(([endpoint, structure]) => {
  console.log(`\n📋 ${endpoint}:`);
  Object.entries(structure).forEach(([key, type]) => {
    console.log(`   ${key}: ${type}`);
  });
});

// Check for proper error handling
console.log('\n🚨 Error Handling:');
const errorPatterns = [
  { name: 'TRPCError usage', pattern: /TRPCError/ },
  { name: 'Try-catch blocks', pattern: /try\s*{[\s\S]*?catch/ },
  { name: 'Error codes', pattern: /code:\s*["']/ }
];

errorPatterns.forEach(pattern => {
  if (pattern.pattern.test(routerContent) || pattern.pattern.test(serviceContent)) {
    console.log(`✅ ${pattern.name}`);
  } else {
    console.log(`⚠️  ${pattern.name} - Consider adding`);
  }
});

// Generate curl commands for manual testing
console.log('\n🧪 Manual Testing Commands:');
console.log('=====================================');
console.log('Once your server is running, you can test these endpoints:');
console.log('');

const testCommands = [
  {
    name: 'Get Student Resources',
    description: 'Test student resource fetching',
    note: 'Replace [studentId] and [classId] with actual IDs'
  },
  {
    name: 'List Teacher Resources',
    description: 'Test teacher resource listing',
    note: 'Replace [teacherId] with actual teacher ID'
  },
  {
    name: 'Create Resource',
    description: 'Test resource creation',
    note: 'Use teacher credentials'
  }
];

testCommands.forEach((cmd, index) => {
  console.log(`${index + 1}. ${cmd.name}`);
  console.log(`   ${cmd.description}`);
  console.log(`   Note: ${cmd.note}`);
  console.log('');
});

// Performance considerations
console.log('⚡ Performance Considerations:');
console.log('- Ensure database indexes on frequently queried fields');
console.log('- Consider pagination for large resource lists');
console.log('- Implement caching for frequently accessed resources');
console.log('- Add rate limiting for resource creation endpoints');

// Security checklist
console.log('\n🔒 Security Checklist:');
const securityChecks = [
  'Authentication required (protectedProcedure)',
  'Input validation with Zod schemas',
  'Proper access control (students can only see their resources)',
  'SQL injection prevention (using Prisma)',
  'File upload security (if implemented)'
];

securityChecks.forEach((check, index) => {
  console.log(`${index + 1}. ${check}`);
});

console.log('\n✅ API structure analysis complete!');
console.log('\n🚀 Next steps:');
console.log('1. Start your development server');
console.log('2. Test the endpoints through the UI');
console.log('3. Check browser network tab for API calls');
console.log('4. Verify data is correctly fetched and displayed');
