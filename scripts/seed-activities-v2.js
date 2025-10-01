#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Activities v2 Comprehensive Seeding...');
console.log('📅 Started at:', new Date().toISOString());

try {
  // Run the TypeScript seeding script
  const seedScript = path.join(__dirname, '..', 'src', 'server', 'db', 'seed-data', 'run-activities-v2-seed.ts');
  
  console.log('🎯 Executing Activities v2 comprehensive seeding...');
  execSync(`npx tsx "${seedScript}"`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Activities v2 seeding completed successfully!');
  console.log('📅 Completed at:', new Date().toISOString());
  
} catch (error) {
  console.error('\n❌ Error during Activities v2 seeding:', error.message);
  console.log('📅 Failed at:', new Date().toISOString());
  process.exit(1);
}
