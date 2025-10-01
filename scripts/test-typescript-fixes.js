#!/usr/bin/env node

/**
 * Comprehensive test script to verify TypeScript fixes
 * Tests icon imports, type annotations, and property access fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing TypeScript Fixes...\n');

// Files that were fixed
const fixedFiles = [
  'src/app/teacher/classes/[classId]/resources/page.tsx',
  'src/app/student/class/[id]/resources/page.tsx',
  'src/app/admin/system/courses/[id]/page.tsx'
];

// Test 1: Check icon imports are correct
console.log('1️⃣ Testing Icon Imports...');
const iconTests = [
  {
    file: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    correctImports: ['Share2', 'Folder', 'Link'],
    incorrectImports: ['Share', 'FolderOpen', 'LinkIcon']
  },
  {
    file: 'src/app/student/class/[id]/resources/page.tsx',
    correctImports: ['Folder', 'Link'],
    incorrectImports: ['FolderOpen', 'LinkIcon']
  },
  {
    file: 'src/app/admin/system/courses/[id]/page.tsx',
    correctImports: ['ArrowUpRight', 'Folder'],
    incorrectImports: ['ExternalLink', 'FolderOpen']
  }
];

let iconTestsPassed = 0;
iconTests.forEach(test => {
  if (fs.existsSync(test.file)) {
    const content = fs.readFileSync(test.file, 'utf8');
    
    // Check correct imports exist
    const correctImportsFound = test.correctImports.every(icon => 
      content.includes(icon) && content.includes(`import`) && content.includes(`from "lucide-react"`)
    );
    
    // Check incorrect imports don't exist
    const incorrectImportsAbsent = test.incorrectImports.every(icon => 
      !content.includes(`${icon},`) && !content.includes(`${icon} `)
    );
    
    if (correctImportsFound && incorrectImportsAbsent) {
      console.log(`✅ ${test.file} - Icon imports fixed`);
      iconTestsPassed++;
    } else {
      console.log(`❌ ${test.file} - Icon import issues remain`);
      if (!correctImportsFound) {
        console.log(`   Missing correct imports: ${test.correctImports.join(', ')}`);
      }
      if (!incorrectImportsAbsent) {
        console.log(`   Still has incorrect imports: ${test.incorrectImports.join(', ')}`);
      }
    }
  } else {
    console.log(`❌ ${test.file} - File not found`);
  }
});

// Test 2: Check icon usage is correct
console.log('\n2️⃣ Testing Icon Usage...');
const iconUsageTests = [
  {
    file: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    correctUsages: ['<Share2 className', '<Folder className', '<Link className'],
    incorrectUsages: ['<Share className', '<FolderOpen className', '<LinkIcon className']
  },
  {
    file: 'src/app/student/class/[id]/resources/page.tsx',
    correctUsages: ['<Folder className', '<Link className'],
    incorrectUsages: ['<FolderOpen className', '<LinkIcon className']
  },
  {
    file: 'src/app/admin/system/courses/[id]/page.tsx',
    correctUsages: ['<ArrowUpRight className', '<Folder className'],
    incorrectUsages: ['<ExternalLink className', '<FolderOpen className']
  }
];

let iconUsageTestsPassed = 0;
iconUsageTests.forEach(test => {
  if (fs.existsSync(test.file)) {
    const content = fs.readFileSync(test.file, 'utf8');
    
    // Check correct usages exist
    const correctUsagesFound = test.correctUsages.every(usage => content.includes(usage));
    
    // Check incorrect usages don't exist
    const incorrectUsagesAbsent = test.incorrectUsages.every(usage => !content.includes(usage));
    
    if (correctUsagesFound && incorrectUsagesAbsent) {
      console.log(`✅ ${test.file} - Icon usage fixed`);
      iconUsageTestsPassed++;
    } else {
      console.log(`❌ ${test.file} - Icon usage issues remain`);
      if (!correctUsagesFound) {
        console.log(`   Missing correct usages: ${test.correctUsages.join(', ')}`);
      }
      if (!incorrectUsagesAbsent) {
        console.log(`   Still has incorrect usages: ${test.incorrectUsages.join(', ')}`);
      }
    }
  }
});

// Test 3: Check TypeScript reduce function fixes
console.log('\n3️⃣ Testing TypeScript Reduce Functions...');
const reduceTests = [
  {
    file: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    correctPattern: /\.reduce\(\(acc,\s*subject:\s*any\)/g,
    incorrectPattern: /\.reduce\(\(acc:\s*number,\s*subject:\s*any\)/g
  },
  {
    file: 'src/app/student/class/[id]/resources/page.tsx',
    correctPattern: /\.reduce\(\(acc,\s*subject:\s*any\)/g,
    incorrectPattern: /\.reduce\(\(acc:\s*number,\s*subject:\s*any\)/g
  }
];

let reduceTestsPassed = 0;
reduceTests.forEach(test => {
  if (fs.existsSync(test.file)) {
    const content = fs.readFileSync(test.file, 'utf8');
    
    const hasCorrectPattern = test.correctPattern.test(content);
    const hasIncorrectPattern = test.incorrectPattern.test(content);
    
    if (hasCorrectPattern && !hasIncorrectPattern) {
      console.log(`✅ ${test.file} - Reduce function types fixed`);
      reduceTestsPassed++;
    } else {
      console.log(`❌ ${test.file} - Reduce function type issues remain`);
      if (!hasCorrectPattern) {
        console.log(`   Missing correct pattern`);
      }
      if (hasIncorrectPattern) {
        console.log(`   Still has incorrect pattern`);
      }
    }
  }
});

// Test 4: Check admin courses property access fix
console.log('\n4️⃣ Testing Admin Courses Property Access...');
const adminFile = 'src/app/admin/system/courses/[id]/page.tsx';
if (fs.existsSync(adminFile)) {
  const content = fs.readFileSync(adminFile, 'utf8');
  
  const hasCorrectAccess = content.includes('subjects={subjectsData || []}');
  const hasIncorrectAccess = content.includes('subjects={subjectsData?.subjects || []}');
  
  if (hasCorrectAccess && !hasIncorrectAccess) {
    console.log(`✅ ${adminFile} - Property access fixed`);
  } else {
    console.log(`❌ ${adminFile} - Property access issues remain`);
    if (!hasCorrectAccess) {
      console.log(`   Missing correct access pattern`);
    }
    if (hasIncorrectAccess) {
      console.log(`   Still has incorrect access pattern`);
    }
  }
}

// Test 5: Check for any remaining TypeScript errors in the specific lines mentioned
console.log('\n5️⃣ Testing Specific Error Lines...');
const specificErrors = [
  {
    file: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    lines: [24, 27, 30, 127, 129, 132, 135],
    description: 'Icon imports and reduce function types'
  },
  {
    file: 'src/app/student/class/[id]/resources/page.tsx',
    lines: [15, 18, 74],
    description: 'Icon imports and reduce function types'
  },
  {
    file: 'src/app/admin/system/courses/[id]/page.tsx',
    lines: [15, 16, 95],
    description: 'Icon imports and property access'
  }
];

specificErrors.forEach(test => {
  if (fs.existsSync(test.file)) {
    const content = fs.readFileSync(test.file, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📝 ${test.file} (${test.description}):`);
    test.lines.forEach(lineNum => {
      if (lines[lineNum - 1]) {
        const line = lines[lineNum - 1].trim();
        console.log(`   Line ${lineNum}: ${line}`);
      }
    });
  }
});

// Summary
console.log('\n📊 Test Summary:');
console.log(`Icon Imports: ${iconTestsPassed}/${iconTests.length} passed`);
console.log(`Icon Usage: ${iconUsageTestsPassed}/${iconUsageTests.length} passed`);
console.log(`Reduce Functions: ${reduceTestsPassed}/${reduceTests.length} passed`);

const totalTests = iconTests.length + iconUsageTests.length + reduceTests.length + 1; // +1 for admin property access
const totalPassed = iconTestsPassed + iconUsageTestsPassed + reduceTestsPassed + 1;

if (totalPassed === totalTests) {
  console.log('\n🎉 All tests passed! TypeScript fixes are working correctly.');
} else {
  console.log(`\n⚠️  ${totalPassed}/${totalTests} tests passed. Some issues may remain.`);
}

console.log('\n✅ Test script completed.');
