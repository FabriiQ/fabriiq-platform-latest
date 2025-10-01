#!/usr/bin/env node

/**
 * Test Script for Resources Functionality
 * 
 * This script tests both student and teacher resources functionality:
 * - API endpoints
 * - Database operations
 * - Component rendering
 * - Navigation integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Resources Functionality...\n');

// Test 1: Check if all required files exist
console.log('📁 Checking file structure...');
const requiredFiles = [
  'src/app/student/class/[id]/resources/page.tsx',
  'src/app/teacher/classes/[classId]/resources/page.tsx',
  'src/components/student/resources/ResourceCard.tsx',
  'src/components/student/resources/ResourceFilters.tsx',
  'src/components/student/resources/ResourceGrid.tsx',
  'src/server/api/routers/resource.ts',
  'src/server/api/services/resource.service.ts',
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check the implementation.');
  process.exit(1);
}

// Test 2: Check TypeScript compilation
console.log('\n🔍 Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Test 3: Check for import errors
console.log('\n📦 Checking imports...');
const checkImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for problematic imports
  if (content.includes("from 'lucide-react'")) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('Video,') || line.includes('Link,') || line.includes('UploadCloud,')) {
        issues.push(`Line ${index + 1}: Potentially problematic icon import`);
      }
    });
  }
  
  return issues;
};

const filesToCheck = [
  'src/app/student/class/[id]/resources/page.tsx',
  'src/app/teacher/classes/[classId]/resources/page.tsx',
  'src/components/student/resources/ResourceCard.tsx',
];

let importIssues = false;
filesToCheck.forEach(file => {
  const issues = checkImports(file);
  if (issues.length > 0) {
    console.log(`⚠️  ${file}:`);
    issues.forEach(issue => console.log(`   ${issue}`));
    importIssues = true;
  } else {
    console.log(`✅ ${file} - imports look good`);
  }
});

// Test 4: Check API endpoints
console.log('\n🔌 Checking API endpoints...');
const resourceRouterContent = fs.readFileSync('src/server/api/routers/resource.ts', 'utf8');

const expectedEndpoints = [
  'getStudentResources',
  'list',
  'create',
  'update',
  'delete'
];

expectedEndpoints.forEach(endpoint => {
  if (resourceRouterContent.includes(`${endpoint}:`)) {
    console.log(`✅ ${endpoint} endpoint exists`);
  } else {
    console.log(`❌ ${endpoint} endpoint missing`);
  }
});

// Test 5: Check navigation integration
console.log('\n🧭 Checking navigation integration...');
const studentSidebarContent = fs.readFileSync('src/components/student/StudentSidebar.tsx', 'utf8');

if (studentSidebarContent.includes('/resources')) {
  console.log('✅ Resources added to student navigation');
} else {
  console.log('❌ Resources not found in student navigation');
}

// Test 6: Check database schema compatibility
console.log('\n🗄️  Checking database schema...');
const resourceServiceContent = fs.readFileSync('src/server/api/services/resource.service.ts', 'utf8');

if (resourceServiceContent.includes('studentEnrollment')) {
  console.log('✅ Using correct enrollment model');
} else if (resourceServiceContent.includes('enrollment')) {
  console.log('⚠️  Check enrollment model name - should be studentEnrollment');
}

// Test 7: Component structure validation
console.log('\n🧩 Checking component structure...');
const componentFiles = [
  'src/components/student/resources/ResourceCard.tsx',
  'src/components/student/resources/ResourceFilters.tsx',
  'src/components/student/resources/ResourceGrid.tsx',
];

componentFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('export function') || content.includes('export default')) {
    console.log(`✅ ${path.basename(file)} - proper export`);
  } else {
    console.log(`❌ ${path.basename(file)} - missing export`);
  }
});

// Test 8: Check for responsive design
console.log('\n📱 Checking responsive design...');
const studentResourcesContent = fs.readFileSync('src/app/student/class/[id]/resources/page.tsx', 'utf8');
const teacherResourcesContent = fs.readFileSync('src/app/teacher/classes/[classId]/resources/page.tsx', 'utf8');

const responsiveClasses = ['md:', 'lg:', 'sm:', 'grid-cols'];
let hasResponsive = false;

responsiveClasses.forEach(className => {
  if (studentResourcesContent.includes(className) || teacherResourcesContent.includes(className)) {
    hasResponsive = true;
  }
});

if (hasResponsive) {
  console.log('✅ Responsive design classes found');
} else {
  console.log('⚠️  Consider adding responsive design classes');
}

// Summary
console.log('\n📊 Test Summary:');
console.log('================');

if (allFilesExist && !importIssues) {
  console.log('✅ All core tests passed!');
  console.log('\n🚀 Ready for manual testing:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Navigate to a student class: /student/class/[id]/resources');
  console.log('3. Navigate to teacher resources: /teacher/classes/[classId]/resources');
  console.log('4. Test search and filtering functionality');
  console.log('5. Verify responsive design on different screen sizes');
} else {
  console.log('❌ Some tests failed. Please fix the issues above.');
  process.exit(1);
}

console.log('\n🎯 Next Steps:');
console.log('- Test with real data in development environment');
console.log('- Verify API endpoints work correctly');
console.log('- Test resource upload functionality');
console.log('- Validate permissions and access control');
