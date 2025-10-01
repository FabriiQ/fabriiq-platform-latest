/**
 * Master Calendar Data Seeding Script
 * Runs all calendar-related seeding operations in the correct order
 */

import { PrismaClient } from '@prisma/client';
import { seedPakistanHolidays } from './seed-pakistan-holidays';
import { seedAcademicEvents, seedSchedulePatterns } from './seed-academic-events';
import { CalendarTester } from './test-calendar-functionality';

const prisma = new PrismaClient();

interface SeedingSummary {
  holidays: { created: number; updated: number; errors: string[] };
  academicEvents: { created: number; updated: number; errors: string[] };
  schedulePatterns: { created: number; updated: number; errors: string[] };
  totalTime: number;
  success: boolean;
}

async function createBasicInstitutionData() {
  console.log('🏫 Ensuring basic institution data exists...');
  
  try {
    // Check if institution exists
    let institution = await prisma.institution.findFirst();
    
    if (!institution) {
      console.log('Creating default institution...');
      institution = await prisma.institution.create({
        data: {
          name: 'Sample Educational Institution',
          code: 'SEI',
          type: 'UNIVERSITY',
          status: 'ACTIVE',
          address: {
            street: '123 Education Street',
            city: 'Karachi',
            state: 'Sindh',
            country: 'Pakistan',
            zipCode: '75000'
          },
          contact: {
            phone: '+92-21-1234567',
            email: 'info@sample-edu.pk',
            website: 'https://sample-edu.pk'
          }
        }
      });
    }

    // Check if campus exists
    let campus = await prisma.campus.findFirst({
      where: { institutionId: institution.id }
    });

    if (!campus) {
      console.log('Creating default campus...');
      campus = await prisma.campus.create({
        data: {
          name: 'Main Campus',
          code: 'MAIN',
          institutionId: institution.id,
          status: 'ACTIVE',
          address: {
            street: '123 Education Street',
            city: 'Karachi',
            state: 'Sindh',
            country: 'Pakistan',
            zipCode: '75000'
          },
          contact: {
            phone: '+92-21-1234567',
            email: 'main@sample-edu.pk'
          }
        }
      });
    }

    // Check if system user exists
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@sample-edu.pk' }
    });

    if (!systemUser) {
      console.log('Creating system user...');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@sample-edu.pk',
          name: 'System Administrator',
          userType: 'SYSTEM_ADMIN',
          status: 'ACTIVE',
          institutionId: institution.id,
          primaryCampusId: campus.id
        }
      });
    }

    console.log('✅ Basic institution data ready');
    return { institution, campus, systemUser };
    
  } catch (error) {
    console.error('❌ Error creating basic institution data:', error);
    throw error;
  }
}

async function seedAllCalendarData(): Promise<SeedingSummary> {
  const startTime = Date.now();
  console.log('🚀 Starting comprehensive calendar data seeding...\n');
  
  try {
    // Ensure basic data exists
    await createBasicInstitutionData();
    
    // Seed holidays
    console.log('\n📅 Step 1: Seeding Pakistan Holidays...');
    const holidaysResult = await seedPakistanHolidays();
    
    // Seed academic events
    console.log('\n📚 Step 2: Seeding Academic Events...');
    const academicEventsResult = await seedAcademicEvents();
    
    // Seed schedule patterns
    console.log('\n⏰ Step 3: Seeding Schedule Patterns...');
    const schedulePatternsResult = await seedSchedulePatterns();
    
    const totalTime = Date.now() - startTime;
    
    const summary: SeedingSummary = {
      holidays: holidaysResult,
      academicEvents: academicEventsResult,
      schedulePatterns: schedulePatternsResult,
      totalTime,
      success: true
    };
    
    // Print summary
    console.log('\n🎉 Calendar data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`  🎉 Holidays: ${summary.holidays.created} created, ${summary.holidays.updated} updated`);
    console.log(`  📚 Academic Events: ${summary.academicEvents.created} created, ${summary.academicEvents.updated} updated`);
    console.log(`  ⏰ Schedule Patterns: ${summary.schedulePatterns.created} created, ${summary.schedulePatterns.updated} updated`);
    console.log(`  ⏱️  Total Time: ${(totalTime / 1000).toFixed(2)} seconds`);
    
    // Check for errors
    const allErrors = [
      ...summary.holidays.errors,
      ...summary.academicEvents.errors,
      ...summary.schedulePatterns.errors
    ];
    
    if (allErrors.length > 0) {
      console.log(`\n⚠️  ${allErrors.length} errors encountered:`);
      allErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    return {
      holidays: { created: 0, updated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] },
      academicEvents: { created: 0, updated: 0, errors: [] },
      schedulePatterns: { created: 0, updated: 0, errors: [] },
      totalTime: Date.now() - startTime,
      success: false
    };
  }
}

async function runWithTesting() {
  console.log('🧪 Running seeding with comprehensive testing...\n');
  
  try {
    // Run seeding
    const seedingResult = await seedAllCalendarData();
    
    if (!seedingResult.success) {
      console.log('❌ Seeding failed, skipping tests');
      return;
    }
    
    // Run tests
    console.log('\n🔍 Running functionality tests...');
    const tester = new CalendarTester();
    const testResult = await tester.runAllTests();
    
    // Final summary
    console.log('\n📋 Final Summary:');
    console.log(`✅ Seeding: ${seedingResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Testing: ${testResult.failed === 0 ? 'ALL PASSED' : `${testResult.failed} FAILED`}`);
    console.log(`⏱️  Total Time: ${(seedingResult.totalTime / 1000).toFixed(2)} seconds`);
    
    if (seedingResult.success && testResult.failed === 0) {
      console.log('\n🎉 Calendar system is fully functional and ready to use!');
    } else {
      console.log('\n⚠️  Some issues were found. Please review the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const runTests = args.includes('--test') || args.includes('-t');
  
  try {
    if (runTests) {
      await runWithTesting();
    } else {
      await seedAllCalendarData();
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedAllCalendarData, createBasicInstitutionData };
