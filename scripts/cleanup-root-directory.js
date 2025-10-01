#!/usr/bin/env node

/**
 * Root Directory Cleanup Script
 * 
 * This script organizes the cluttered root directory by moving documentation
 * and task files to appropriate subdirectories.
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 FabriiQ Root Directory Cleanup');
console.log('==================================');

// Define file categories and their target directories
const FILE_CATEGORIES = {
  // Implementation summaries and reports
  IMPLEMENTATION_DOCS: {
    targetDir: 'docs/implementation-reports',
    patterns: [
      /IMPLEMENTATION.*SUMMARY\.md$/i,
      /COMPLETE.*IMPLEMENTATION.*REPORT\.md$/i,
      /FINAL.*IMPLEMENTATION.*SUMMARY\.md$/i,
      /FINAL.*COMPLETE.*SUCCESS.*REPORT\.md$/i,
      /PHASE.*COMPLETION.*SUMMARY\.md$/i,
      /PHASE.*INTEGRATION.*GUIDE\.md$/i,
    ],
  },

  // Performance and optimization docs
  PERFORMANCE_DOCS: {
    targetDir: 'docs/performance',
    patterns: [
      /PERFORMANCE.*OPTIMIZATION.*\.md$/i,
      /LOGIN.*PERFORMANCE.*OPTIMIZATION.*\.md$/i,
      /STARTUP.*OPTIMIZATION.*\.md$/i,
      /BUILD.*AND.*STARTUP.*FIXES.*\.md$/i,
      /FabriQ.*Performance.*Optimization.*Plan\.md$/i,
      /FABRIQ.*PERFORMANCE.*CRISIS.*CLEANUP.*PLAN\.md$/i,
      /DEPENDENCY.*CLEANUP.*ANALYSIS\.md$/i,
    ],
  },

  // Fix summaries and critical fixes
  FIXES_DOCS: {
    targetDir: 'docs/fixes',
    patterns: [
      /.*FIXES.*SUMMARY\.md$/i,
      /CRITICAL.*FIXES.*SUMMARY\.md$/i,
      /FIXES.*APPLIED\.md$/i,
      /BUTTON.*FIXES.*TEST.*PLAN\.md$/i,
      /RUBRIC.*GRADING.*FIXES.*SUMMARY\.md$/i,
      /SOCIAL.*WALL.*FIXES.*SUMMARY\.md$/i,
      /TEACHER.*PORTAL.*FIXES.*SUMMARY\.md$/i,
    ],
  },

  // Task lists and planning docs
  TASK_DOCS: {
    targetDir: 'docs/tasks',
    patterns: [
      /Tasks_.*\.md$/,
      /.*tasklist\.md$/i,
      /.*task.*list\.md$/i,
      /.*implementation.*plan\.md$/i,
      /.*revamp.*plan\.md$/i,
      /testing.*plan\.md$/i,
      /testing.*strategy\.md$/i,
      /deployment.*plan\.md$/i,
    ],
  },

  // Gap analysis and assessment docs
  ANALYSIS_DOCS: {
    targetDir: 'docs/analysis',
    patterns: [
      /.*GAP.*ANALYSIS\.md$/i,
      /.*gap.*analysis\.md$/i,
      /.*analysis\.md$/i,
      /assessment.*alignment.*gap.*analysis\.md$/i,
      /coordinator.*portal.*analysis\.md$/i,
      /reward.*system.*integration.*review\.md$/i,
    ],
  },

  // Product and marketing docs
  PRODUCT_DOCS: {
    targetDir: 'docs/product',
    patterns: [
      /AIVY.*LXP.*Product.*Document.*\.md$/i,
      /AIVY.*LXP.*Competitive.*Analysis\.md$/i,
      /Production.*Ready.*Learning.*Management.*System.*Enhancement.*\.md$/i,
    ],
  },

  // Temporary and test files
  TEMP_FILES: {
    targetDir: 'temp',
    patterns: [
      /activity.*card.*approach.*\.jsx$/,
      /bash\.exe\.stackdump$/,
      /build.*test\.js$/,
      /.*\.log$/,
      /debug.*\.js$/,
      /debug.*\.json$/,
      /test.*\.js$/,
      /seed.*test.*\.js$/,
      /list.*users\.js$/,
      /create.*teacher.*user\.js$/,
      /fix.*teacher.*user\.js$/,
    ],
  },

  // Scripts that should be in scripts directory
  SCRIPTS: {
    targetDir: 'scripts',
    patterns: [
      /fix.*\.js$/,
      /fix.*\.ps1$/,
      /delete.*\.bat$/,
      /delete.*\.ps1$/,
      /rename.*\.ps1$/,
      /find.*\.js$/,
      /find.*\.ps1$/,
      /run.*\.bat$/,
      /deploy.*\.sh$/,
      /check.*\.js$/,
    ],
  },
};

// Files to keep in root (essential files)
const KEEP_IN_ROOT = [
  'README.md',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js',
  'jest.config.js',
  'jest.setup.js',
  'eslint.config.mjs',
  'next-env.d.ts',
  'server.js',
  'server-minimal.js',
  'langgraph.json',
  'tsconfig.tsbuildinfo',
];

// Directories to keep in root
const KEEP_DIRECTORIES = [
  'src',
  'public',
  'prisma',
  'scripts',
  'docs',
  'node_modules',
  '__tests__',
  'tests',
  'h5p',
  'database',
  'admin',
  'UAT',
];

/**
 * Create target directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

/**
 * Move file to target directory
 */
function moveFile(sourcePath, targetDir, fileName) {
  ensureDirectoryExists(targetDir);
  const targetPath = path.join(targetDir, fileName);
  
  try {
    fs.renameSync(sourcePath, targetPath);
    console.log(`📄 Moved: ${fileName} → ${targetDir}`);
    return true;
  } catch (error) {
    console.error(`❌ Error moving ${fileName}:`, error.message);
    return false;
  }
}

/**
 * Check if file matches any pattern in a category
 */
function matchesCategory(fileName, category) {
  return category.patterns.some(pattern => pattern.test(fileName));
}

/**
 * Organize files by category
 */
function organizeFiles() {
  console.log('\n🔍 Scanning root directory...\n');
  
  const rootFiles = fs.readdirSync('.')
    .filter(item => {
      const stat = fs.statSync(item);
      return stat.isFile() && !item.startsWith('.') && !KEEP_IN_ROOT.includes(item);
    });
  
  console.log(`📊 Found ${rootFiles.length} files to organize\n`);
  
  let movedCount = 0;
  let skippedCount = 0;
  
  // Process each file
  rootFiles.forEach(fileName => {
    let moved = false;
    
    // Check each category
    for (const [categoryName, category] of Object.entries(FILE_CATEGORIES)) {
      if (matchesCategory(fileName, category)) {
        const sourcePath = path.join('.', fileName);
        if (moveFile(sourcePath, category.targetDir, fileName)) {
          movedCount++;
          moved = true;
          break;
        }
      }
    }
    
    if (!moved) {
      console.log(`⏭️  Skipped: ${fileName} (no matching category)`);
      skippedCount++;
    }
  });
  
  return { movedCount, skippedCount };
}

/**
 * Clean up empty directories that might be left behind
 */
function cleanupEmptyDirectories() {
  console.log('\n🧹 Cleaning up empty directories...\n');
  
  const rootItems = fs.readdirSync('.')
    .filter(item => {
      const stat = fs.statSync(item);
      return stat.isDirectory() && !item.startsWith('.') && !KEEP_DIRECTORIES.includes(item);
    });
  
  rootItems.forEach(dirName => {
    const dirPath = path.join('.', dirName);
    try {
      const contents = fs.readdirSync(dirPath);
      if (contents.length === 0) {
        fs.rmdirSync(dirPath);
        console.log(`🗑️  Removed empty directory: ${dirName}`);
      } else {
        console.log(`📁 Keeping non-empty directory: ${dirName} (${contents.length} items)`);
      }
    } catch (error) {
      console.error(`❌ Error checking directory ${dirName}:`, error.message);
    }
  });
}

/**
 * Create index files for organized directories
 */
function createIndexFiles() {
  console.log('\n📝 Creating index files...\n');
  
  Object.entries(FILE_CATEGORIES).forEach(([categoryName, category]) => {
    const indexPath = path.join(category.targetDir, 'README.md');
    
    if (fs.existsSync(category.targetDir) && !fs.existsSync(indexPath)) {
      const files = fs.readdirSync(category.targetDir).filter(f => f.endsWith('.md'));
      
      const indexContent = `# ${categoryName.replace(/_/g, ' ')} Documentation

This directory contains ${files.length} documentation files organized from the root directory cleanup.

## Files in this directory:

${files.map(file => `- [${file}](./${file})`).join('\n')}

---
*This index was automatically generated during root directory cleanup.*
`;
      
      fs.writeFileSync(indexPath, indexContent);
      console.log(`📄 Created index: ${indexPath}`);
    }
  });
}

/**
 * Main cleanup function
 */
function runCleanup() {
  console.log('Starting root directory cleanup...\n');
  
  const { movedCount, skippedCount } = organizeFiles();
  cleanupEmptyDirectories();
  createIndexFiles();
  
  console.log('\n✅ CLEANUP SUMMARY');
  console.log('==================');
  console.log(`📄 Files moved: ${movedCount}`);
  console.log(`⏭️  Files skipped: ${skippedCount}`);
  console.log(`📁 Essential files kept in root: ${KEEP_IN_ROOT.length}`);
  console.log(`📁 Essential directories kept in root: ${KEEP_DIRECTORIES.length}`);
  
  console.log('\n🎯 Root directory is now clean and organized!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the organized files in their new locations');
  console.log('2. Update any references to moved files');
  console.log('3. Consider archiving old implementation reports');
  console.log('4. Update documentation links in README.md');
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  runCleanup();
}

module.exports = { runCleanup, FILE_CATEGORIES };
