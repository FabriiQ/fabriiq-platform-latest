#!/usr/bin/env node

/**
 * Individual script to seed profile enhancements for Year 8 C class only
 * Usage: node scripts/seed-year8c-profiles.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Seeding Profile Enhancements for Year 8 C Class...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/targeted-profile-enhancements.ts');
  
  console.log('👤 Executing targeted profile enhancements seeding...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Profile enhancements seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during profile enhancements seeding:', error.message);
  process.exit(1);
}
