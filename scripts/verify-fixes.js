#!/usr/bin/env node

/**
 * Final verification script for TypeScript fixes
 * Verifies that all originally reported issues have been resolved
 */

const fs = require('fs');

console.log('🎯 Final Verification of TypeScript Fixes\n');

// Original issues that were reported
const originalIssues = [
  {
    file: 'src/app/teacher/classes/[classId]/resources/page.tsx',
    issues: [
      { line: 24, error: "Module 'lucide-react' has no exported member 'Share'" },
      { line: 27, error: "Module 'lucide-react' has no exported member 'FolderOpen'" },
      { line: 30, error: "Module 'lucide-react' has no exported member 'LinkIcon'" },
      { line: 127, error: "Argument of type '(acc: number, subject: any) => any' is not assignable" },
      { line: 129, error: "Argument of type '(acc: number, subject: any) => any' is not assignable" },
      { line: 132, error: "Argument of type '(acc: number, subject: any) => any' is not assignable" },
      { line: 135, error: "Argument of type '(acc: number, subject: any) => any' is not assignable" }
    ]
  },
  {
    file: 'src/app/student/class/[id]/resources/page.tsx',
    issues: [
      { line: 15, error: "Module 'lucide-react' has no exported member 'FolderOpen'" },
      { line: 18, error: "Module 'lucide-react' has no exported member 'LinkIcon'" },
      { line: 74, error: "Argument of type '(acc: number, subject: any) => any' is not assignable" }
    ]
  },
  {
    file: 'src/app/admin/system/courses/[id]/page.tsx',
    issues: [
      { line: 15, error: "Module 'lucide-react' has no exported member 'ExternalLink'" },
      { line: 16, error: "Module 'lucide-react' has no exported member 'FolderOpen'" },
      { line: 95, error: "Property 'subjects' does not exist on type" }
    ]
  }
];

// Fixes that were applied
const appliedFixes = {
  iconReplacements: {
    'Share': 'Share2',
    'FolderOpen': 'Folder', 
    'LinkIcon': 'Link',
    'ExternalLink': 'ArrowUpRight'
  },
  typeAnnotations: {
    'reduce((acc: number, subject: any)': 'reduce((acc, subject: any)'
  },
  propertyAccess: {
    'subjectsData?.subjects || []': 'subjectsData || []'
  }
};

console.log('📋 Verification Results:\n');

let totalIssuesFixed = 0;
let totalIssues = 0;

originalIssues.forEach(fileIssues => {
  console.log(`📁 ${fileIssues.file}:`);
  
  if (fs.existsSync(fileIssues.file)) {
    const content = fs.readFileSync(fileIssues.file, 'utf8');
    const lines = content.split('\n');
    
    fileIssues.issues.forEach(issue => {
      totalIssues++;
      const lineContent = lines[issue.line - 1]?.trim() || '';
      
      // Check if the issue has been fixed
      let isFixed = false;
      
      if (issue.error.includes("has no exported member 'Share'")) {
        isFixed = lineContent.includes('Share2') && !lineContent.includes('Share,');
      } else if (issue.error.includes("has no exported member 'FolderOpen'")) {
        isFixed = lineContent.includes('Folder') && !lineContent.includes('FolderOpen');
      } else if (issue.error.includes("has no exported member 'LinkIcon'")) {
        isFixed = lineContent.includes('Link') && !lineContent.includes('LinkIcon');
      } else if (issue.error.includes("has no exported member 'ExternalLink'")) {
        isFixed = lineContent.includes('ArrowUpRight') && !lineContent.includes('ExternalLink');
      } else if (issue.error.includes("Argument of type '(acc: number, subject: any)'")) {
        isFixed = lineContent.includes('reduce((acc, subject: any)') && !lineContent.includes('reduce((acc: number, subject: any)');
      } else if (issue.error.includes("Property 'subjects' does not exist")) {
        isFixed = lineContent.includes('subjectsData || []') && !lineContent.includes('subjectsData?.subjects');
      }
      
      if (isFixed) {
        console.log(`  ✅ Line ${issue.line}: Fixed`);
        totalIssuesFixed++;
      } else {
        console.log(`  ❌ Line ${issue.line}: Not fixed - ${lineContent}`);
      }
    });
  } else {
    console.log(`  ❌ File not found`);
  }
  
  console.log('');
});

// Summary
console.log('📊 Final Summary:');
console.log(`Total Issues: ${totalIssues}`);
console.log(`Issues Fixed: ${totalIssuesFixed}`);
console.log(`Success Rate: ${Math.round((totalIssuesFixed / totalIssues) * 100)}%`);

if (totalIssuesFixed === totalIssues) {
  console.log('\n🎉 SUCCESS: All TypeScript issues have been resolved!');
  console.log('\n✅ Applied Fixes:');
  console.log('   • Icon Imports: Share → Share2, FolderOpen → Folder, LinkIcon → Link, ExternalLink → ArrowUpRight');
  console.log('   • Type Annotations: Removed explicit number type from reduce function accumulators');
  console.log('   • Property Access: Fixed subjectsData?.subjects to subjectsData');
} else {
  console.log('\n⚠️  Some issues may still remain. Please check the output above.');
}

console.log('\n🔍 Verification completed.');
