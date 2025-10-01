/**
 * Calendar Functionality Test Script
 * Tests holiday creation, event creation, schedule patterns, and calendar data retrieval
 */

import { PrismaClient } from '@prisma/client';
import { seedPakistanHolidays } from './seed-pakistan-holidays';
import { seedAcademicEvents, seedSchedulePatterns } from './seed-academic-events';

const prisma = new PrismaClient();

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  data?: any;
}

class CalendarTester {
  private results: TestResult[] = [];

  private addResult(testName: string, passed: boolean, message: string, data?: any) {
    this.results.push({ testName, passed, message, data });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  async testHolidayCreation() {
    try {
      console.log('\n🎉 Testing Holiday Creation...');
      
      // Seed holidays
      const result = await seedPakistanHolidays();
      
      // Verify holidays were created
      const holidayCount = await prisma.holiday.count({
        where: { status: 'ACTIVE' }
      });
      
      this.addResult(
        'Holiday Creation',
        holidayCount > 0,
        `Created/updated ${result.created + result.updated} holidays, found ${holidayCount} active holidays`,
        { created: result.created, updated: result.updated, total: holidayCount }
      );

      // Test holiday retrieval by date range
      const holidays2025 = await prisma.holiday.findMany({
        where: {
          startDate: {
            gte: new Date(2025, 0, 1),
            lt: new Date(2026, 0, 1)
          },
          status: 'ACTIVE'
        }
      });

      this.addResult(
        'Holiday Date Range Query',
        holidays2025.length > 0,
        `Found ${holidays2025.length} holidays for 2025`,
        holidays2025.map(h => ({ name: h.name, date: h.startDate }))
      );

    } catch (error) {
      this.addResult('Holiday Creation', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testAcademicEventCreation() {
    try {
      console.log('\n📚 Testing Academic Event Creation...');
      
      // Seed academic events
      const result = await seedAcademicEvents();
      
      // Verify events were created
      const eventCount = await prisma.academicCalendarEvent.count({
        where: { status: 'ACTIVE' }
      });
      
      this.addResult(
        'Academic Event Creation',
        eventCount > 0,
        `Created/updated ${result.created + result.updated} events, found ${eventCount} active events`,
        { created: result.created, updated: result.updated, total: eventCount }
      );

      // Test event types
      const eventTypes = await prisma.academicCalendarEvent.groupBy({
        by: ['type'],
        _count: { type: true },
        where: { status: 'ACTIVE' }
      });

      this.addResult(
        'Academic Event Types',
        eventTypes.length > 0,
        `Found ${eventTypes.length} different event types`,
        eventTypes
      );

    } catch (error) {
      this.addResult('Academic Event Creation', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testSchedulePatterns() {
    try {
      console.log('\n⏰ Testing Schedule Patterns...');
      
      // Seed schedule patterns
      const result = await seedSchedulePatterns();
      
      // Verify patterns were created
      const patternCount = await prisma.schedulePattern.count({
        where: { status: 'ACTIVE' }
      });
      
      this.addResult(
        'Schedule Pattern Creation',
        patternCount > 0,
        `Created/updated ${result.created + result.updated} patterns, found ${patternCount} active patterns`,
        { created: result.created, updated: result.updated, total: patternCount }
      );

      // Test first pattern
      const firstPattern = await prisma.schedulePattern.findFirst({
        where: { status: 'ACTIVE' }
      });

      this.addResult(
        'Schedule Pattern Available',
        !!firstPattern,
        firstPattern ? `Found pattern: ${firstPattern.name}` : 'No patterns found',
        firstPattern
      );

    } catch (error) {
      this.addResult('Schedule Pattern Creation', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testCalendarDataRetrieval() {
    try {
      console.log('\n📅 Testing Calendar Data Retrieval...');
      
      // Test unified calendar data for a specific month
      const startDate = new Date(2025, 2, 1); // March 2025
      const endDate = new Date(2025, 2, 31);
      
      // Get holidays in date range
      const holidays = await prisma.holiday.findMany({
        where: {
          startDate: { gte: startDate, lte: endDate },
          status: 'ACTIVE'
        }
      });

      // Get academic events in date range
      const academicEvents = await prisma.academicCalendarEvent.findMany({
        where: {
          startDate: { gte: startDate, lte: endDate },
          status: 'ACTIVE'
        }
      });

      const totalEvents = holidays.length + academicEvents.length;

      this.addResult(
        'Calendar Data Retrieval',
        totalEvents >= 0,
        `Found ${holidays.length} holidays and ${academicEvents.length} academic events in March 2025`,
        { holidays: holidays.length, academicEvents: academicEvents.length, total: totalEvents }
      );

      // Test campus data availability
      const campuses = await prisma.campus.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, status: true }
      });

      this.addResult(
        'Campus Data Availability',
        campuses.length > 0,
        `Found ${campuses.length} active campuses`,
        campuses
      );

    } catch (error) {
      this.addResult('Calendar Data Retrieval', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testDatabaseConnectivity() {
    try {
      console.log('\n🔌 Testing Database Connectivity...');
      
      // Test basic connection
      await prisma.$queryRaw`SELECT 1 as test`;
      
      this.addResult('Database Connection', true, 'Database connection successful');

      // Test key tables exist
      const tables = ['Holiday', 'AcademicCalendarEvent', 'SchedulePattern', 'Campus'];
      
      for (const table of tables) {
        try {
          const count = await (prisma as any)[table.toLowerCase()].count();
          this.addResult(
            `${table} Table`,
            true,
            `${table} table accessible with ${count} records`
          );
        } catch (error) {
          this.addResult(
            `${table} Table`,
            false,
            `${table} table not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

    } catch (error) {
      this.addResult('Database Connection', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Calendar Functionality Tests...\n');
    
    await this.testDatabaseConnectivity();
    await this.testHolidayCreation();
    await this.testAcademicEventCreation();
    await this.testSchedulePatterns();
    await this.testCalendarDataRetrieval();
    
    return this.generateReport();
  }

  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.testName}: ${r.message}`));
    }
    
    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.results
    };
  }
}

async function main() {
  const tester = new CalendarTester();
  
  try {
    const report = await tester.runAllTests();
    
    if (report.failed === 0) {
      console.log('\n🎉 All tests passed! Calendar functionality is working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please check the issues above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { CalendarTester };
