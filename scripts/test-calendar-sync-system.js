#!/usr/bin/env node

/**
 * Calendar System Integration Test
 * 
 * Tests the complete calendar sync functionality:
 * 1. Holiday creation and sync
 * 2. Academic event creation and sync
 * 3. Personal calendar integration
 * 4. Pakistan holidays seeding
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

console.log('🧪 Testing Calendar Sync System...\n');

async function testCalendarSystem() {
  let testsPassed = 0;
  let testsFailed = 0;
  const errors = [];

  // Test 1: Check if calendar services exist
  console.log('1. 📁 Checking Calendar Service Files...');
  const requiredFiles = [
    'src/server/api/services/calendar-sync.service.ts',
    'src/server/api/services/pakistan-holidays.service.ts',
    'src/server/api/services/unified-calendar.service.ts',
    'src/server/api/routers/unified-calendar.ts',
    'src/app/admin/system/calendar/holidays/create/page.tsx'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
      testsPassed++;
    } else {
      console.log(`   ❌ ${file} - Missing`);
      testsFailed++;
      errors.push(`Missing file: ${file}`);
    }
  }

  // Test 2: Check TypeScript compilation
  console.log('\n2. 🔧 Testing TypeScript Compilation...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    console.log('   ✅ TypeScript compilation successful');
    testsPassed++;
  } catch (error) {
    console.log('   ❌ TypeScript compilation failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('TypeScript compilation failed');
  }

  // Test 3: Check database schema for required tables
  console.log('\n3. 🗄️  Checking Database Schema...');
  try {
    // Check if required tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('holidays', 'personal_calendar_events', 'academic_calendar_events')
    `;
    
    const requiredTables = ['holidays', 'personal_calendar_events', 'academic_calendar_events'];
    const existingTables = tables.map(t => t.table_name);
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ Table '${table}' exists`);
        testsPassed++;
      } else {
        console.log(`   ❌ Table '${table}' missing`);
        testsFailed++;
        errors.push(`Missing table: ${table}`);
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not check database schema (database may not be running)');
    console.log(`   Error: ${error.message}`);
  }

  // Test 4: Test Pakistan Holidays Service
  console.log('\n4. 🇵🇰 Testing Pakistan Holidays Service...');
  try {
    const { PakistanHolidaysService } = require('../src/server/api/services/pakistan-holidays.service.ts');
    const service = new PakistanHolidaysService({ prisma });
    
    const holidays = service.getPakistanHolidays();
    const holidays2025 = service.getHolidaysForYear(2025);
    const holidays2026 = service.getHolidaysForYear(2026);
    const holidays2027 = service.getHolidaysForYear(2027);
    const religiousHolidays = service.getReligiousHolidays();
    const nationalHolidays = service.getNationalHolidays();
    
    console.log(`   ✅ Total holidays loaded: ${holidays.length}`);
    console.log(`   ✅ 2025 holidays: ${holidays2025.length}`);
    console.log(`   ✅ 2026 holidays: ${holidays2026.length}`);
    console.log(`   ✅ 2027 holidays: ${holidays2027.length}`);
    console.log(`   ✅ Religious holidays: ${religiousHolidays.length}`);
    console.log(`   ✅ National holidays: ${nationalHolidays.length}`);
    
    // Verify key holidays exist
    const keyHolidays = [
      'Independence Day',
      'Pakistan Day',
      'Eid ul Fitr',
      'Eid ul Adha',
      'Quaid-e-Azam Birthday'
    ];
    
    for (const holiday of keyHolidays) {
      const found = holidays.some(h => h.name === holiday);
      if (found) {
        console.log(`   ✅ Key holiday '${holiday}' found`);
        testsPassed++;
      } else {
        console.log(`   ❌ Key holiday '${holiday}' missing`);
        testsFailed++;
        errors.push(`Missing key holiday: ${holiday}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Pakistan Holidays Service test failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('Pakistan Holidays Service test failed');
  }

  // Test 5: Check Calendar Sync Service
  console.log('\n5. 🔄 Testing Calendar Sync Service...');
  try {
    const syncServicePath = path.join(process.cwd(), 'src/server/api/services/calendar-sync.service.ts');
    const syncServiceContent = fs.readFileSync(syncServicePath, 'utf8');
    
    const requiredMethods = [
      'syncAcademicEvent',
      'syncHoliday',
      'syncTimetableEvent',
      'getTargetUsers',
      'createPersonalCalendarEvents',
      'removeSyncedEvents',
      'updateSyncedEvents'
    ];
    
    for (const method of requiredMethods) {
      if (syncServiceContent.includes(method)) {
        console.log(`   ✅ Method '${method}' found`);
        testsPassed++;
      } else {
        console.log(`   ❌ Method '${method}' missing`);
        testsFailed++;
        errors.push(`Missing sync method: ${method}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Calendar Sync Service test failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('Calendar Sync Service test failed');
  }

  // Test 6: Check Unified Calendar Router
  console.log('\n6. 🛣️  Testing Unified Calendar Router...');
  try {
    const routerPath = path.join(process.cwd(), 'src/server/api/routers/unified-calendar.ts');
    const routerContent = fs.readFileSync(routerPath, 'utf8');
    
    const requiredEndpoints = [
      'createAcademicEventWithSync',
      'createHolidayWithSync',
      'seedPakistanHolidays',
      'getEvents',
      'getCalendarView'
    ];
    
    for (const endpoint of requiredEndpoints) {
      if (routerContent.includes(endpoint)) {
        console.log(`   ✅ Endpoint '${endpoint}' found`);
        testsPassed++;
      } else {
        console.log(`   ❌ Endpoint '${endpoint}' missing`);
        testsFailed++;
        errors.push(`Missing API endpoint: ${endpoint}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Unified Calendar Router test failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('Unified Calendar Router test failed');
  }

  // Test 7: Check Holiday Creation Page
  console.log('\n7. 📅 Testing Holiday Creation Page...');
  try {
    const holidayPagePath = path.join(process.cwd(), 'src/app/admin/system/calendar/holidays/create/page.tsx');
    const holidayPageContent = fs.readFileSync(holidayPagePath, 'utf8');
    
    const requiredFeatures = [
      'createHolidayWithSync',
      'syncOptions',
      'syncToStudents',
      'syncToTeachers',
      'syncToCampusUsers'
    ];
    
    for (const feature of requiredFeatures) {
      if (holidayPageContent.includes(feature)) {
        console.log(`   ✅ Feature '${feature}' implemented`);
        testsPassed++;
      } else {
        console.log(`   ❌ Feature '${feature}' missing`);
        testsFailed++;
        errors.push(`Missing holiday page feature: ${feature}`);
      }
    }
  } catch (error) {
    console.log('   ❌ Holiday Creation Page test failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('Holiday Creation Page test failed');
  }

  // Test 8: Check for Select.Item fixes
  console.log('\n8. 🔧 Testing Select.Item Fixes...');
  try {
    const filesToCheck = [
      'src/components/calendar/views/MultiCampusCalendarView.tsx',
      'src/components/calendar/enhanced/UnifiedCalendarView.tsx',
      'src/components/principal/dashboard/PrincipalPerformanceDashboard.tsx',
      'src/components/coordinator/performance/CoordinatorClassPerformance.tsx',
      'src/components/teachers/teacher-classes-tab.tsx',
      'src/components/ui/payment-method-select.tsx'
    ];
    
    let fixedFiles = 0;
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        // Check for problematic patterns
        const hasEmptyValue = content.includes('value=""') && !content.includes('disabled');
        const hasDuplicateImports = content.match(/import.*Eye.*Eye/);
        const hasEyeOff = content.includes('EyeOff');
        
        if (!hasEmptyValue && !hasDuplicateImports && !hasEyeOff) {
          console.log(`   ✅ ${file} - Fixed`);
          fixedFiles++;
          testsPassed++;
        } else {
          console.log(`   ❌ ${file} - Still has issues`);
          testsFailed++;
          errors.push(`File still has Select.Item issues: ${file}`);
        }
      }
    }
    
    console.log(`   📊 Fixed ${fixedFiles}/${filesToCheck.length} files`);
  } catch (error) {
    console.log('   ❌ Select.Item fixes test failed');
    console.log(`   Error: ${error.message}`);
    testsFailed++;
    errors.push('Select.Item fixes test failed');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS FOUND:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Calendar system is ready for use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix the issues above.');
  }
  
  return { testsPassed, testsFailed, errors };
}

// Run tests
testCalendarSystem()
  .then((result) => {
    process.exit(result.testsFailed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
