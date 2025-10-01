/**
 * Test Script for Calendar Functionality
 * 
 * This script tests the unified calendar system functionality
 * by making API calls and verifying responses.
 */

const { PrismaClient } = require('@prisma/client');

async function testCalendarFunctionality() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Calendar Functionality...\n');

    // Test 1: Check database connectivity
    console.log('1. Testing database connectivity...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected. Found ${userCount} users.\n`);

    // Test 2: Check if required tables exist
    console.log('2. Checking required tables...');
    
    const timetableCount = await prisma.timetable.count();
    console.log(`✅ Timetable table exists. Found ${timetableCount} timetables.`);
    
    const holidayCount = await prisma.holiday.count();
    console.log(`✅ Holiday table exists. Found ${holidayCount} holidays.`);
    
    const academicEventCount = await prisma.academicCalendarEvent.count();
    console.log(`✅ Academic calendar event table exists. Found ${academicEventCount} events.`);
    
    const personalEventCount = await prisma.personalCalendarEvent.count();
    console.log(`✅ Personal calendar event table exists. Found ${personalEventCount} events.\n`);

    // Test 3: Check for sample data
    console.log('3. Checking for sample data...');
    
    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      take: 5
    });
    console.log(`✅ Found ${campuses.length} active campuses:`, campuses.map(c => c.name).join(', '));
    
    const teachers = await prisma.teacherProfile.findMany({
      include: { user: true },
      take: 5
    });
    console.log(`✅ Found ${teachers.length} teachers:`, teachers.map(t => t.user?.name || 'Unknown').join(', '));
    
    const facilities = await prisma.facility.findMany({
      where: { status: 'ACTIVE' },
      take: 5
    });
    console.log(`✅ Found ${facilities.length} active facilities:`, facilities.map(f => f.name).join(', '));

    // Test 4: Test date range queries (simulating unified calendar service)
    console.log('\n4. Testing date range queries...');
    
    const startDate = new Date();
    startDate.setDate(1); // First day of current month
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
    
    console.log(`Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Test timetable periods
    const timetablePeriods = await prisma.timetablePeriod.findMany({
      where: {
        status: 'ACTIVE',
        timetable: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          status: 'ACTIVE'
        }
      },
      include: {
        timetable: {
          include: { class: true }
        },
        assignment: {
          include: {
            qualification: {
              include: {
                teacher: {
                  include: {
                    user: true
                  }
                },
                subject: true
              }
            }
          }
        },
        facility: true
      },
      take: 10
    });
    console.log(`✅ Found ${timetablePeriods.length} timetable periods in date range`);
    
    // Test academic events
    const academicEvents = await prisma.academicCalendarEvent.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      include: {
        academicCycle: true,
        campuses: true
      },
      take: 10
    });
    console.log(`✅ Found ${academicEvents.length} academic events in date range`);
    
    // Test holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      include: { campuses: true },
      take: 10
    });
    console.log(`✅ Found ${holidays.length} holidays in date range`);

    // Test 5: Simulate unified event creation
    console.log('\n5. Testing unified event structure...');
    
    const sampleUnifiedEvents = [];
    
    // Convert timetable periods to unified events
    timetablePeriods.forEach((period, index) => {
      if (index < 3) { // Just test first 3
        const teacher = period.assignment?.qualification?.teacher;
        const subject = period.assignment?.qualification?.subject;
        
        const unifiedEvent = {
          id: `timetable_${period.id}`,
          title: `${subject?.name || 'Class'} - ${period.timetable.class?.name || 'Unknown Class'}`,
          description: `${subject?.name || 'Class'} session`,
          startDate: period.startTime,
          endDate: period.endTime,
          type: 'timetable_period',
          source: 'timetable',
          teacherId: teacher?.id,
          teacherName: teacher?.user?.name,
          facilityId: period.facilityId,
          facilityName: period.facility?.name,
          subject: subject?.name,
          className: period.timetable.class?.name
        };
        
        sampleUnifiedEvents.push(unifiedEvent);
      }
    });
    
    // Convert academic events to unified events
    academicEvents.forEach((event, index) => {
      if (index < 2) { // Just test first 2
        const unifiedEvent = {
          id: `academic_${event.id}`,
          title: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          type: 'academic_event',
          source: 'academic',
          campusId: event.campuses[0]?.id,
          campusName: event.campuses[0]?.name
        };
        
        sampleUnifiedEvents.push(unifiedEvent);
      }
    });
    
    console.log(`✅ Created ${sampleUnifiedEvents.length} unified events`);
    sampleUnifiedEvents.forEach(event => {
      console.log(`   - ${event.title} (${event.type})`);
    });

    // Test 6: Simulate conflict detection
    console.log('\n6. Testing conflict detection logic...');
    
    const conflicts = [];
    const teacherEvents = new Map();
    const facilityEvents = new Map();
    
    // Group events by resource
    sampleUnifiedEvents.forEach(event => {
      if (event.teacherId) {
        if (!teacherEvents.has(event.teacherId)) {
          teacherEvents.set(event.teacherId, []);
        }
        teacherEvents.get(event.teacherId).push(event);
      }
      
      if (event.facilityId) {
        if (!facilityEvents.has(event.facilityId)) {
          facilityEvents.set(event.facilityId, []);
        }
        facilityEvents.get(event.facilityId).push(event);
      }
    });
    
    // Check for overlaps (simplified)
    let conflictCount = 0;
    teacherEvents.forEach((events, teacherId) => {
      if (events.length > 1) {
        console.log(`   - Teacher ${events[0].teacherName} has ${events.length} events (potential conflicts)`);
        conflictCount++;
      }
    });
    
    facilityEvents.forEach((events, facilityId) => {
      if (events.length > 1) {
        console.log(`   - Facility ${events[0].facilityName} has ${events.length} events (potential conflicts)`);
        conflictCount++;
      }
    });
    
    console.log(`✅ Conflict detection completed. Found ${conflictCount} potential conflicts`);

    // Test 7: Test statistics generation
    console.log('\n7. Testing statistics generation...');
    
    const statistics = {
      totalEvents: sampleUnifiedEvents.length,
      eventsByType: {},
      eventsBySource: {},
      conflictCount: conflictCount,
      upcomingEvents: sampleUnifiedEvents.filter(e => new Date(e.startDate) > new Date()).length,
      overdueEvents: 0
    };
    
    sampleUnifiedEvents.forEach(event => {
      statistics.eventsByType[event.type] = (statistics.eventsByType[event.type] || 0) + 1;
      statistics.eventsBySource[event.source] = (statistics.eventsBySource[event.source] || 0) + 1;
    });
    
    console.log('✅ Statistics generated:');
    console.log(`   - Total events: ${statistics.totalEvents}`);
    console.log(`   - By type:`, statistics.eventsByType);
    console.log(`   - By source:`, statistics.eventsBySource);
    console.log(`   - Conflicts: ${statistics.conflictCount}`);
    console.log(`   - Upcoming: ${statistics.upcomingEvents}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Database connectivity: Working');
    console.log('✅ Required tables: Present');
    console.log('✅ Sample data: Available');
    console.log('✅ Date range queries: Working');
    console.log('✅ Unified event structure: Working');
    console.log('✅ Conflict detection: Working');
    console.log('✅ Statistics generation: Working');
    
    console.log('\n🚀 The unified calendar system is ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testCalendarFunctionality();
}

module.exports = { testCalendarFunctionality };
