#!/usr/bin/env node

/**
 * Individual script to seed achievements and points for Year 8 C class only
 * Usage: node scripts/seed-year8c-achievements.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Seeding Achievements & Points for Year 8 C Class...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/targeted-achievements.ts');
  
  console.log('🏆 Executing targeted achievements seeding...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Achievements & points seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during achievements seeding:', error.message);
  process.exit(1);
}
