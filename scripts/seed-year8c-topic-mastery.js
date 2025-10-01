#!/usr/bin/env node

/**
 * Individual script to seed topic mastery for Year 8 C class only
 * Usage: node scripts/seed-year8c-topic-mastery.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Seeding Topic Mastery for Year 8 C Class...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript file directly using tsx
  const scriptPath = path.join(__dirname, '../src/server/db/seed-data/targeted-topic-mastery.ts');
  
  console.log('🧠 Executing targeted topic mastery seeding...');
  execSync(`npx tsx "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ Topic mastery seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('❌ Error during topic mastery seeding:', error.message);
  process.exit(1);
}
