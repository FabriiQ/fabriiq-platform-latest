#!/usr/bin/env node

/**
 * Personal Calendar Seed Script
 * 
 * This script seeds the database with sample personal calendar events
 * for existing students and teachers.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Starting Personal Calendar Seeding...\n');

try {
  // Compile TypeScript seed file
  console.log('📦 Compiling TypeScript seed file...');
  execSync('npx tsc prisma/seeds/personal-calendar-seed.ts --outDir prisma/seeds/compiled --target es2020 --module commonjs --esModuleInterop --skipLibCheck', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Run the compiled seed file
  console.log('🚀 Running personal calendar seed...');
  execSync('node prisma/seeds/compiled/personal-calendar-seed.js', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n✅ Personal calendar seeding completed successfully!');
  console.log('\n📋 What was seeded:');
  console.log('• Study sessions for students');
  console.log('• Assignment deadlines');
  console.log('• Exam preparation events');
  console.log('• Meeting schedules for teachers');
  console.log('• Personal and professional development events');
  console.log('• Reminders and break times');
  
  console.log('\n🎯 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Navigate to /student/calendar or /teacher/calendar');
  console.log('3. View the seeded events and test the calendar functionality');

} catch (error) {
  console.error('❌ Error during seeding:', error.message);
  process.exit(1);
}
