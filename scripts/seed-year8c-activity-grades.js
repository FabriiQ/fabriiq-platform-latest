#!/usr/bin/env node

/**
 * Individual script to seed activity grades for Year 8 C class only
 * Usage: node scripts/seed-year8c-activity-grades.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Seeding Activity Grades for Year 8 C Class...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/targeted-activity-grades.ts');
  
  console.log('📝 Executing targeted activity grades seeding...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Activity grades seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during activity grades seeding:', error.message);
  process.exit(1);
}
