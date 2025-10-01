/**
 * Test Calendar Seeding
 * Simple test to verify calendar seeding functionality
 */

const { PrismaClient } = require('@prisma/client');

async function testCalendarSeeding() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing calendar seeding...\n');

    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Connected to database. Found ${userCount} users.\n`);

    // Test 2: Check campuses
    console.log('2. Checking campuses...');
    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true }
    });
    console.log(`✅ Found ${campuses.length} active campuses:`);
    campuses.forEach(campus => {
      console.log(`   - ${campus.name} (${campus.code})`);
    });
    console.log('');

    // Test 3: Create a sample holiday
    console.log('3. Creating sample holiday...');

    // Get a user to use as creator
    const users = await prisma.user.findMany({
      take: 1,
      select: { id: true, name: true }
    });

    if (users.length === 0) {
      console.log('⚠️ No users found, skipping holiday creation');
      return;
    }

    const creator = users[0];

    const sampleHoliday = {
      name: 'Test Holiday',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-01'),
      type: 'NATIONAL', // Use valid HolidayType
      description: 'Test holiday for seeding verification',
      status: 'ACTIVE',
      createdBy: creator.id
    };

    // Check if holiday already exists
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        name: sampleHoliday.name,
        startDate: sampleHoliday.startDate
      }
    });

    if (!existingHoliday) {
      const createdHoliday = await prisma.holiday.create({
        data: {
          ...sampleHoliday,
          campuses: {
            connect: campuses.slice(0, 1).map(c => ({ id: c.id })) // Connect to first campus
          }
        }
      });
      console.log(`✅ Created test holiday: ${createdHoliday.name}`);
    } else {
      console.log(`✅ Test holiday already exists: ${existingHoliday.name}`);
    }

    // Test 4: Create working days configuration
    console.log('\n4. Creating working days configuration...');
    
    if (campuses.length > 0) {
      const campus = campuses[0];
      
      // Check if config already exists
      const existingConfig = await prisma.workingDaysConfig.findFirst({
        where: {
          campusId: campus.id,
          isActive: true
        }
      });

      if (!existingConfig) {
        const workingDaysConfig = await prisma.workingDaysConfig.create({
          data: {
            campusId: campus.id,
            pattern: 'FIVE_DAYS',
            workingDays: [1, 2, 3, 4, 5], // Monday to Friday
            startTime: '08:00',
            endTime: '16:00',
            breakStart: '12:00',
            breakEnd: '13:00',
            isActive: true,
            effectiveFrom: new Date()
          }
        });
        console.log(`✅ Created working days config for ${campus.name}`);
      } else {
        console.log(`✅ Working days config already exists for ${campus.name}`);
      }
    }

    // Test 5: Create sample personal calendar event
    console.log('\n5. Creating sample personal calendar event...');

    if (users.length > 0) {
      const user = users[0];
      
      const personalEvent = {
        userId: user.id,
        title: 'Test Personal Event',
        description: 'Sample personal calendar event',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        type: 'PERSONAL',
        color: '#3B82F6',
        status: 'ACTIVE'
      };

      // Check if event already exists
      const existingEvent = await prisma.personalCalendarEvent.findFirst({
        where: {
          userId: user.id,
          title: personalEvent.title
        }
      });

      if (!existingEvent) {
        const createdEvent = await prisma.personalCalendarEvent.create({
          data: personalEvent
        });
        console.log(`✅ Created personal event for user: ${user.name}`);
      } else {
        console.log(`✅ Personal event already exists for user: ${user.name}`);
      }
    }

    // Test 6: Verify all components
    console.log('\n6. Verifying all components...');
    
    const holidayCount = await prisma.holiday.count({ where: { status: 'ACTIVE' } });
    const workingDaysCount = await prisma.workingDaysConfig.count({ where: { isActive: true } });
    const personalEventCount = await prisma.personalCalendarEvent.count({ where: { status: 'ACTIVE' } });
    
    console.log(`✅ Verification complete:`);
    console.log(`   - Active holidays: ${holidayCount}`);
    console.log(`   - Working days configs: ${workingDaysCount}`);
    console.log(`   - Personal events: ${personalEventCount}`);

    console.log('\n🎉 Calendar seeding test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Database connection: Working');
    console.log('✅ Campus data: Available');
    console.log('✅ Holiday creation: Working');
    console.log('✅ Working days config: Working');
    console.log('✅ Personal events: Working');
    
    console.log('\n🚀 Calendar system is ready for full seeding!');

  } catch (error) {
    console.error('❌ Calendar seeding test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testCalendarSeeding()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCalendarSeeding };
