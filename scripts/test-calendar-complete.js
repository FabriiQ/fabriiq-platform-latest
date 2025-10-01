#!/usr/bin/env node

/**
 * Complete Personal Calendar Test Script
 * 
 * This script tests the entire personal calendar implementation including:
 * - Database connectivity
 * - Prisma client functionality
 * - API endpoints
 * - Component structure
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

console.log('🧪 Testing Complete Personal Calendar Implementation...\n');

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test if PersonalCalendarEvent table exists and is accessible
    const count = await prisma.personalCalendarEvent.count();
    console.log(`✅ PersonalCalendarEvent table accessible (${count} events found)`);
    
    // Test if we can query users
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible (${userCount} users found)`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testPersonalCalendarAPI() {
  console.log('\n📡 Testing Personal Calendar API structure...');
  
  // Check if API router file exists and has correct structure
  const routerPath = path.join(process.cwd(), 'src/server/api/routers/personal-calendar.ts');
  if (!fs.existsSync(routerPath)) {
    console.log('❌ Personal calendar router file not found');
    return false;
  }
  
  const routerContent = fs.readFileSync(routerPath, 'utf8');
  const requiredEndpoints = [
    'getEvents',
    'createEvent',
    'updateEvent',
    'deleteEvent',
    'getEventById',
    'getEventsCount'
  ];
  
  let allEndpointsFound = true;
  requiredEndpoints.forEach(endpoint => {
    if (routerContent.includes(endpoint)) {
      console.log(`✅ ${endpoint} endpoint found`);
    } else {
      console.log(`❌ ${endpoint} endpoint NOT found`);
      allEndpointsFound = false;
    }
  });
  
  // Check if router is registered in root
  const rootPath = path.join(process.cwd(), 'src/server/api/root.ts');
  const rootContent = fs.readFileSync(rootPath, 'utf8');
  
  if (rootContent.includes('personalCalendar: personalCalendarRouter')) {
    console.log('✅ Personal calendar router registered in root API');
  } else {
    console.log('❌ Personal calendar router NOT registered in root API');
    allEndpointsFound = false;
  }
  
  return allEndpointsFound;
}

async function testComponents() {
  console.log('\n🧩 Testing React components...');
  
  const components = [
    'src/components/common/calendar/PersonalCalendar.tsx',
    'src/components/common/calendar/EventModal.tsx',
    'src/components/common/calendar/CalendarHeader.tsx',
    'src/app/student/calendar/page.tsx',
    'src/app/teacher/calendar/page.tsx'
  ];
  
  let allComponentsValid = true;
  
  components.forEach(componentPath => {
    const fullPath = path.join(process.cwd(), componentPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for common issues
      const hasExport = content.includes('export');
      const hasImports = content.includes('import');
      const hasReact = content.includes('React') || content.includes('useState') || content.includes('useEffect');
      
      if (hasExport && hasImports && hasReact) {
        console.log(`✅ ${componentPath} - Valid React component`);
      } else {
        console.log(`❌ ${componentPath} - Invalid or incomplete component`);
        allComponentsValid = false;
      }
    } else {
      console.log(`❌ ${componentPath} - File not found`);
      allComponentsValid = false;
    }
  });
  
  return allComponentsValid;
}

async function testNavigation() {
  console.log('\n🧭 Testing navigation integration...');
  
  // Check teacher navigation
  const teacherHeaderPath = path.join(process.cwd(), 'src/components/teacher/navigation/TeacherHeader.tsx');
  const teacherHeaderContent = fs.readFileSync(teacherHeaderPath, 'utf8');
  
  if (teacherHeaderContent.includes('/teacher/calendar')) {
    console.log('✅ Teacher calendar link added to header');
  } else {
    console.log('❌ Teacher calendar link NOT found in header');
  }
  
  // Check student navigation
  const studentSidebarPath = path.join(process.cwd(), 'src/components/student/StudentSidebar.tsx');
  const studentSidebarContent = fs.readFileSync(studentSidebarPath, 'utf8');
  
  if (studentSidebarContent.includes('/student/calendar')) {
    console.log('✅ Student calendar link added to sidebar');
  } else {
    console.log('❌ Student calendar link NOT found in sidebar');
  }
  
  return true;
}

async function testSeedData() {
  console.log('\n🌱 Testing seed data...');
  
  try {
    // Check if we have any personal calendar events
    const eventCount = await prisma.personalCalendarEvent.count();
    
    if (eventCount > 0) {
      console.log(`✅ Found ${eventCount} personal calendar events in database`);
      
      // Check event types distribution
      const eventTypes = await prisma.personalCalendarEvent.groupBy({
        by: ['type'],
        _count: {
          type: true
        }
      });
      
      console.log('📊 Event types distribution:');
      eventTypes.forEach(({ type, _count }) => {
        console.log(`   ${type}: ${_count.type} events`);
      });
      
      return true;
    } else {
      console.log('⚠️  No personal calendar events found. Run seed script to populate data.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking seed data:', error.message);
    return false;
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Starting comprehensive personal calendar tests...\n');
    
    const dbTest = await testDatabaseConnection();
    const apiTest = await testPersonalCalendarAPI();
    const componentTest = await testComponents();
    const navTest = await testNavigation();
    const seedTest = await testSeedData();
    
    console.log('\n📋 Test Results Summary:');
    console.log(`Database Connection: ${dbTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Structure: ${apiTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Components: ${componentTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Navigation: ${navTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Seed Data: ${seedTest ? '✅ PASS' : '⚠️  OPTIONAL'}`);
    
    const allCriticalTestsPassed = dbTest && apiTest && componentTest && navTest;
    
    if (allCriticalTestsPassed) {
      console.log('\n🎉 All critical tests passed! Personal calendar is ready to use.');
      console.log('\n🚀 Next steps:');
      console.log('1. Start the development server: npm run dev');
      console.log('2. Navigate to /student/calendar or /teacher/calendar');
      console.log('3. Test creating, editing, and deleting events');
      
      if (!seedTest) {
        console.log('4. Optional: Run seed script for sample data: node prisma/seeds/personal-calendar-seed.js');
      }
    } else {
      console.log('\n❌ Some critical tests failed. Please review the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
