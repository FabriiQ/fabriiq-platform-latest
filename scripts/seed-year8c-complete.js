#!/usr/bin/env node

/**
 * Master script to run all Year 8 C targeted seeding
 * Usage: node scripts/seed-year8c-complete.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Complete Year 8 C Seeding...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the master TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/run-targeted-seeds.ts');
  
  console.log('🎯 Executing complete targeted seeding for Year 8 C...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Complete Year 8 C seeding finished successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during complete seeding:', error.message);
  process.exit(1);
}
