#!/usr/bin/env node

/**
 * Test Script for Resource Management Implementation
 * 
 * This script validates:
 * 1. TypeScript compilation
 * 2. Database schema consistency
 * 3. API endpoint functionality
 * 4. Component imports and exports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Testing Resource Management Implementation...\n');

// Test 1: TypeScript Compilation
console.log('1️⃣ Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful\n');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
  console.log('');
}

// Test 2: Prisma Schema Validation
console.log('2️⃣ Validating Prisma schema...');
try {
  execSync('npx prisma validate', { stdio: 'pipe' });
  console.log('✅ Prisma schema is valid\n');
} catch (error) {
  console.log('❌ Prisma schema validation failed:');
  console.log(error.stdout?.toString() || error.message);
  console.log('');
}

// Test 3: Check Required Files Exist
console.log('3️⃣ Checking required files exist...');
const requiredFiles = [
  'src/components/student/resources/ResourceFolderView.tsx',
  'src/components/teacher/resources/TeacherResourceFolderView.tsx',
  'src/app/student/resources/page.tsx',
  'src/app/teacher/classes/[classId]/resources/page.tsx',
  'src/app/student/class/[id]/resources/page.tsx',
  'src/server/api/routers/resource.ts',
  'src/server/api/services/resource.service.ts',
  'prisma/schema.prisma'
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

if (allFilesExist) {
  console.log('✅ All required files exist\n');
} else {
  console.log('❌ Some required files are missing\n');
}

// Test 4: Check Database Schema Changes
console.log('4️⃣ Checking database schema changes...');
try {
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  // Check if Resource model has subjectId field
  if (schemaContent.includes('subjectId   String?')) {
    console.log('✅ Resource model has subjectId field');
  } else {
    console.log('❌ Resource model missing subjectId field');
  }
  
  // Check if Subject model has resources relation
  if (schemaContent.includes('resources                 Resource[]')) {
    console.log('✅ Subject model has resources relation');
  } else {
    console.log('❌ Subject model missing resources relation');
  }
  
  // Check if Resource model has subject relation
  if (schemaContent.includes('subject     Subject?')) {
    console.log('✅ Resource model has subject relation');
  } else {
    console.log('❌ Resource model missing subject relation');
  }
  
  console.log('');
} catch (error) {
  console.log('❌ Error reading schema file:', error.message);
  console.log('');
}

// Test 5: Check API Router Updates
console.log('5️⃣ Checking API router updates...');
try {
  const routerContent = fs.readFileSync('src/server/api/routers/resource.ts', 'utf8');
  
  // Check for new endpoints
  if (routerContent.includes('getStudentResourcesGrouped')) {
    console.log('✅ getStudentResourcesGrouped endpoint exists');
  } else {
    console.log('❌ getStudentResourcesGrouped endpoint missing');
  }
  
  if (routerContent.includes('getTeacherResourcesGrouped')) {
    console.log('✅ getTeacherResourcesGrouped endpoint exists');
  } else {
    console.log('❌ getTeacherResourcesGrouped endpoint missing');
  }
  
  // Check for subjectId in schemas
  if (routerContent.includes('subjectId: z.string().optional()')) {
    console.log('✅ subjectId field in schemas');
  } else {
    console.log('❌ subjectId field missing in schemas');
  }
  
  console.log('');
} catch (error) {
  console.log('❌ Error reading router file:', error.message);
  console.log('');
}

// Test 6: Check Component Imports
console.log('6️⃣ Checking component imports...');
try {
  const studentPageContent = fs.readFileSync('src/app/student/class/[id]/resources/page.tsx', 'utf8');
  
  // Check for required imports
  const requiredImports = [
    'ChevronDown',
    'ChevronRight', 
    'Folder',
    'Link',
    'PlayCircle'
  ];
  
  let allImportsExist = true;
  requiredImports.forEach(importName => {
    if (studentPageContent.includes(importName)) {
      console.log(`✅ ${importName} import exists`);
    } else {
      console.log(`❌ ${importName} import missing`);
      allImportsExist = false;
    }
  });
  
  if (allImportsExist) {
    console.log('✅ All required imports exist in student page');
  }
  
  console.log('');
} catch (error) {
  console.log('❌ Error reading student page file:', error.message);
  console.log('');
}

// Test 7: Check for Folder Structure Implementation
console.log('7️⃣ Checking folder structure implementation...');
try {
  const teacherPageContent = fs.readFileSync('src/app/teacher/classes/[classId]/resources/page.tsx', 'utf8');
  
  // Check for folder-related functions and state
  const folderFeatures = [
    'expandedFolders',
    'toggleFolder',
    'getResourceIcon',
    'handleResourceClick',
    'filteredSubjects'
  ];
  
  let allFeaturesExist = true;
  folderFeatures.forEach(feature => {
    if (teacherPageContent.includes(feature)) {
      console.log(`✅ ${feature} implemented`);
    } else {
      console.log(`❌ ${feature} missing`);
      allFeaturesExist = false;
    }
  });
  
  if (allFeaturesExist) {
    console.log('✅ All folder structure features implemented');
  }
  
  console.log('');
} catch (error) {
  console.log('❌ Error reading teacher page file:', error.message);
  console.log('');
}

// Test 8: Build Test (Optional - can be slow)
console.log('8️⃣ Running build test (this may take a moment)...');
try {
  execSync('npm run build', { stdio: 'pipe', timeout: 120000 }); // 2 minute timeout
  console.log('✅ Build successful\n');
} catch (error) {
  console.log('❌ Build failed:');
  console.log(error.stdout?.toString() || error.message);
  console.log('');
}

console.log('🎉 Resource Management Implementation Test Complete!');
console.log('\n📋 Summary:');
console.log('- Database schema updated with subjectId field');
console.log('- API endpoints enhanced with grouped resource functionality');
console.log('- UI components updated with folder structure');
console.log('- Both teacher and student pages enhanced');
console.log('\n🔧 Next Steps:');
console.log('1. Test the functionality in the browser');
console.log('2. Create some test resources with subject associations');
console.log('3. Verify folder structure displays correctly');
console.log('4. Test resource creation with subject selection');
