#!/usr/bin/env node

/**
 * Build Scripts Consolidation
 * 
 * This script consolidates the 50+ npm scripts into essential production and development scripts.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FabriiQ Build Scripts Consolidation');
console.log('======================================');

// Define essential scripts categories
const ESSENTIAL_SCRIPTS = {
  // Core development and production scripts
  CORE: {
    "dev": "node server.js",
    "dev:next": "next dev",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "NODE_ENV=production node server.js",
    "start:next": "next start",
  },

  // Testing scripts
  TESTING: {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "next lint",
  },

  // Database scripts (consolidated)
  DATABASE: {
    "db:seed": "ts-node --compiler-options \"{\\\"module\\\":\\\"CommonJS\\\"}\" src/server/db/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "db:studio": "prisma studio",
  },

  // Utility scripts
  UTILITIES: {
    "analyze-bundle": "node scripts/analyze-bundle.js",
    "cleanup": "node scripts/cleanup-root-directory.js",
    "clear-sessions": "node scripts/clear-sessions.js",
  },
};

// Scripts to archive (move to separate file for reference)
const ARCHIVE_SCRIPTS = {
  // Build variants (keep only essential ones)
  BUILD_VARIANTS: [
    "build:optimized",
    "build:memory", 
    "build:no-lint",
    "build:force",
    "dev:fast",
  ],

  // Database seeding variants (consolidate into single seed script)
  DB_SEEDING: [
    "db:seed-subjects",
    "db:check-subjects", 
    "db:simple-seed",
    "db:robust-seed",
    "db:learning-content-seed",
    "db:complete-seed",
    "db:teacher-assignments-seed",
    "db:seed-subject-topics",
    "db:simple-seed-topics",
    "db:seed-activities-by-type",
    "db:seed-bulk-students",
    "db:check-class-activities",
    "db:add-activities-to-class",
    "db:simple-add-activities",
    "db:cleanup-activities",
    "db:add-seeded-activities-to-class",
  ],

  // Migration scripts (keep for reference but not in main scripts)
  MIGRATIONS: [
    "migrate:term-structure",
    "migrate:reward-system",
    "migrate:supabase",
  ],

  // Auth cleanup scripts (temporary, can be archived)
  AUTH_CLEANUP: [
    "cleanup-auth",
    "consolidate-auth", 
    "cleanup-expired-sessions",
    "assign-primary-campus",
  ],

  // Test variants (consolidate into main test script)
  TEST_VARIANTS: [
    "test:class-overview",
    "test:class-overview:unit",
    "test:class-overview:integration", 
    "test:class-overview:e2e",
    "test:class-overview:performance",
  ],

  // Question bank scripts (can be run manually when needed)
  QUESTION_BANKS: [
    "create-question-banks",
    "db:create-question-banks",
  ],

  // Canvas/LangGraph (development only)
  CANVAS: [
    "canvas:server",
  ],

  // Server variants
  SERVER_VARIANTS: [
    "server",
  ],
};

/**
 * Create consolidated scripts object
 */
function createConsolidatedScripts() {
  const consolidated = {};
  
  // Add all essential scripts
  Object.values(ESSENTIAL_SCRIPTS).forEach(category => {
    Object.assign(consolidated, category);
  });
  
  return consolidated;
}

/**
 * Create archived scripts file for reference
 */
function createArchivedScriptsFile() {
  const archivedScripts = {};
  
  // Collect all archived scripts
  Object.values(ARCHIVE_SCRIPTS).forEach(scriptList => {
    scriptList.forEach(scriptName => {
      // We'll need to get the actual script content from package.json
      archivedScripts[scriptName] = `# Archived script: ${scriptName}`;
    });
  });
  
  const archiveContent = `# Archived NPM Scripts

This file contains scripts that were removed during the build scripts consolidation.
These scripts can be restored if needed by copying them back to package.json.

## How to use archived scripts:
1. Copy the script you need from this file
2. Add it to the "scripts" section in package.json
3. Run with \`npm run <script-name>\`

## Archived Scripts:

${Object.entries(archivedScripts).map(([name, description]) => 
  `### ${name}\n${description}\n`
).join('\n')}

---
*This file was generated during build scripts consolidation.*
`;
  
  fs.writeFileSync('scripts/archived-scripts.md', archiveContent);
  console.log('📄 Created archived scripts reference: scripts/archived-scripts.md');
}

/**
 * Update package.json with consolidated scripts
 */
function updatePackageJson() {
  console.log('\n📦 Updating package.json...\n');
  
  try {
    // Read current package.json
    const packagePath = 'package.json';
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Get current scripts for archiving
    const currentScripts = packageJson.scripts || {};
    const consolidatedScripts = createConsolidatedScripts();
    
    // Count scripts
    const originalCount = Object.keys(currentScripts).length;
    const consolidatedCount = Object.keys(consolidatedScripts).length;
    
    console.log(`📊 Original scripts: ${originalCount}`);
    console.log(`📊 Consolidated scripts: ${consolidatedCount}`);
    console.log(`📉 Reduction: ${originalCount - consolidatedCount} scripts (${Math.round((1 - consolidatedCount/originalCount) * 100)}%)\n`);
    
    // Create detailed archive with actual script content
    const archivedScriptsWithContent = {};
    Object.keys(currentScripts).forEach(scriptName => {
      if (!consolidatedScripts[scriptName]) {
        archivedScriptsWithContent[scriptName] = currentScripts[scriptName];
      }
    });
    
    // Save archived scripts with actual content
    const detailedArchiveContent = `# Archived NPM Scripts

This file contains the actual scripts that were removed during consolidation.
You can restore any of these by copying them back to package.json.

## Archived Scripts:

${Object.entries(archivedScriptsWithContent).map(([name, script]) => 
  `### ${name}\n\`\`\`json\n"${name}": "${script}"\n\`\`\`\n`
).join('\n')}

## Script Categories:

### Build Variants
These were consolidated into the main \`build\` script:
${ARCHIVE_SCRIPTS.BUILD_VARIANTS.map(name => `- ${name}`).join('\n')}

### Database Seeding
These were consolidated into \`db:seed\`:
${ARCHIVE_SCRIPTS.DB_SEEDING.map(name => `- ${name}`).join('\n')}

### Test Variants  
These were consolidated into main test scripts:
${ARCHIVE_SCRIPTS.TEST_VARIANTS.map(name => `- ${name}`).join('\n')}

---
*Generated during build scripts consolidation on ${new Date().toISOString()}*
`;
    
    fs.writeFileSync('scripts/archived-scripts.md', detailedArchiveContent);
    
    // Update package.json with consolidated scripts
    packageJson.scripts = consolidatedScripts;
    
    // Write updated package.json
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Successfully updated package.json');
    console.log('📄 Archived scripts saved to: scripts/archived-scripts.md');
    
    return { originalCount, consolidatedCount };
    
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    return null;
  }
}

/**
 * Create npm scripts documentation
 */
function createScriptsDocumentation() {
  const docContent = `# NPM Scripts Documentation

This document describes the consolidated npm scripts for the FabriiQ platform.

## Core Scripts

### Development
- \`npm run dev\` - Start development server with custom server
- \`npm run dev:next\` - Start Next.js development server only
- \`npm run build\` - Build for production
- \`npm run build:analyze\` - Build with bundle analysis
- \`npm run start\` - Start production server
- \`npm run start:next\` - Start Next.js production server

### Testing
- \`npm run test\` - Run all tests
- \`npm run test:watch\` - Run tests in watch mode
- \`npm run test:coverage\` - Run tests with coverage report
- \`npm run lint\` - Run ESLint

### Database
- \`npm run db:seed\` - Seed database with sample data
- \`npm run db:migrate\` - Run database migrations
- \`npm run db:reset\` - Reset database (careful!)
- \`npm run db:studio\` - Open Prisma Studio

### Utilities
- \`npm run analyze-bundle\` - Analyze bundle size
- \`npm run cleanup\` - Clean up root directory
- \`npm run clear-sessions\` - Clear expired sessions

## Archived Scripts

Many scripts were archived during consolidation. See \`scripts/archived-scripts.md\` for the complete list of removed scripts and how to restore them if needed.

## Adding New Scripts

When adding new scripts, follow these guidelines:

1. **Keep it essential** - Only add scripts that are frequently used
2. **Use clear names** - Script names should be self-explanatory
3. **Group by purpose** - Use prefixes like \`db:\`, \`test:\`, \`build:\`
4. **Document thoroughly** - Update this file when adding new scripts

## Script Naming Conventions

- \`dev:*\` - Development-related scripts
- \`build:*\` - Build-related scripts  
- \`test:*\` - Testing-related scripts
- \`db:*\` - Database-related scripts
- No prefix - Core scripts (dev, build, start, test, lint)

---
*Last updated: ${new Date().toISOString()}*
`;
  
  fs.writeFileSync('docs/npm-scripts.md', docContent);
  console.log('📚 Created scripts documentation: docs/npm-scripts.md');
}

/**
 * Main consolidation function
 */
function runConsolidation() {
  console.log('Starting build scripts consolidation...\n');
  
  const result = updatePackageJson();
  
  if (result) {
    createScriptsDocumentation();
    
    console.log('\n✅ CONSOLIDATION SUMMARY');
    console.log('========================');
    console.log(`📊 Scripts before: ${result.originalCount}`);
    console.log(`📊 Scripts after: ${result.consolidatedCount}`);
    console.log(`📉 Reduction: ${result.originalCount - result.consolidatedCount} scripts`);
    console.log(`📈 Efficiency gain: ${Math.round((1 - result.consolidatedCount/result.originalCount) * 100)}%`);
    
    console.log('\n🎯 Build scripts are now consolidated!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the essential scripts to ensure they work');
    console.log('2. Review archived scripts if you need any specific functionality');
    console.log('3. Update CI/CD pipelines to use the new script names');
    console.log('4. Update documentation references to old script names');
  }
}

// Run consolidation if this script is executed directly
if (require.main === module) {
  runConsolidation();
}

module.exports = { runConsolidation, ESSENTIAL_SCRIPTS, ARCHIVE_SCRIPTS };
