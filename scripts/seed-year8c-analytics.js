#!/usr/bin/env node

/**
 * Individual script to seed analytics for Year 8 C class only
 * Usage: node scripts/seed-year8c-analytics.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Seeding Analytics for Year 8 C Class...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/targeted-analytics.ts');
  
  console.log('📊 Executing targeted analytics seeding...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Analytics seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during analytics seeding:', error.message);
  process.exit(1);
}
