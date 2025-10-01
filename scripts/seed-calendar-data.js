/**
 * Seed Calendar Data Script
 * 
 * Seeds the database with:
 * - Pakistan public holidays for 2025-2027
 * - Demo educational events
 * - Working days configuration for campuses
 * - Sample personal calendar events
 */

const { PrismaClient } = require('@prisma/client');

async function seedCalendarData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🌱 Starting calendar data seeding...\n');

    // Get all active campuses
    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true }
    });

    console.log(`Found ${campuses.length} active campuses:`);
    campuses.forEach(campus => {
      console.log(`  - ${campus.name} (${campus.code})`);
    });
    console.log('');

    // 1. Seed Pakistan Holidays for 2025-2027
    console.log('1. Seeding Pakistan public holidays...');
    
    const holidays2025 = [
      { name: 'Kashmir Day', date: '2025-02-05', type: 'NATIONAL' },
      { name: 'Pakistan Day', date: '2025-03-23', type: 'NATIONAL' },
      { name: 'Eid ul-Fitr', startDate: '2025-03-30', endDate: '2025-04-01', type: 'RELIGIOUS' },
      { name: 'Easter Monday', date: '2025-04-21', type: 'RELIGIOUS' },
      { name: 'Labour Day', date: '2025-05-01', type: 'PUBLIC' },
      { name: 'Youm-e-Takbeer', date: '2025-05-28', type: 'NATIONAL' },
      { name: 'Eid ul-Azha', startDate: '2025-06-07', endDate: '2025-06-09', type: 'RELIGIOUS' },
      { name: 'Ashura', startDate: '2025-07-05', endDate: '2025-07-06', type: 'RELIGIOUS' },
      { name: 'Independence Day', date: '2025-08-14', type: 'NATIONAL' },
      { name: 'Milad un-Nabi', date: '2025-09-05', type: 'RELIGIOUS' },
      { name: 'Iqbal Day', date: '2025-11-09', type: 'NATIONAL' },
      { name: 'Christmas Day', date: '2025-12-25', type: 'RELIGIOUS' },
      { name: 'Quaid-e-Azam Day', date: '2025-12-25', type: 'NATIONAL' },
      { name: 'Day after Christmas', date: '2025-12-26', type: 'PUBLIC' }
    ];

    const holidays2026 = [
      { name: 'Kashmir Day', date: '2026-02-05', type: 'NATIONAL' },
      { name: 'Eid ul-Fitr', startDate: '2026-03-21', endDate: '2026-03-23', type: 'RELIGIOUS' },
      { name: 'Pakistan Day', date: '2026-03-23', type: 'NATIONAL' },
      { name: 'Easter Monday', date: '2026-04-06', type: 'RELIGIOUS' },
      { name: 'Labour Day', date: '2026-05-01', type: 'PUBLIC' },
      { name: 'Eid ul-Azha', startDate: '2026-05-27', endDate: '2026-05-28', type: 'RELIGIOUS' },
      { name: 'Youm-e-Takbeer', date: '2026-05-28', type: 'NATIONAL' },
      { name: 'Ashura', startDate: '2026-06-25', endDate: '2026-06-26', type: 'RELIGIOUS' },
      { name: 'Independence Day', date: '2026-08-14', type: 'NATIONAL' },
      { name: 'Milad un-Nabi', date: '2026-08-25', type: 'RELIGIOUS' },
      { name: 'Iqbal Day', date: '2026-11-09', type: 'NATIONAL' },
      { name: 'Christmas Day', date: '2026-12-25', type: 'RELIGIOUS' },
      { name: 'Quaid-e-Azam Day', date: '2026-12-25', type: 'NATIONAL' },
      { name: 'Day after Christmas', date: '2026-12-26', type: 'PUBLIC' }
    ];

    const holidays2027 = [
      { name: 'Kashmir Day', date: '2027-02-05', type: 'NATIONAL' },
      { name: 'Eid ul-Fitr', startDate: '2027-03-10', endDate: '2027-03-12', type: 'RELIGIOUS' },
      { name: 'Pakistan Day', date: '2027-03-23', type: 'NATIONAL' },
      { name: 'Easter Monday', date: '2027-03-29', type: 'RELIGIOUS' },
      { name: 'Labour Day', date: '2027-05-01', type: 'PUBLIC' },
      { name: 'Eid ul-Azha', startDate: '2027-05-17', endDate: '2027-05-18', type: 'RELIGIOUS' },
      { name: 'Youm-e-Takbeer', date: '2027-05-28', type: 'NATIONAL' },
      { name: 'Ashura', startDate: '2027-06-14', endDate: '2027-06-15', type: 'RELIGIOUS' },
      { name: 'Independence Day', date: '2027-08-14', type: 'NATIONAL' },
      { name: 'Milad un-Nabi', date: '2027-08-15', type: 'RELIGIOUS' },
      { name: 'Iqbal Day', date: '2027-11-09', type: 'NATIONAL' },
      { name: 'Christmas Day', date: '2027-12-25', type: 'RELIGIOUS' },
      { name: 'Quaid-e-Azam Day', date: '2027-12-25', type: 'NATIONAL' },
      { name: 'Day after Christmas', date: '2027-12-26', type: 'PUBLIC' }
    ];

    const allHolidays = [...holidays2025, ...holidays2026, ...holidays2027];
    let holidaysCreated = 0;

    for (const holiday of allHolidays) {
      try {
        const startDate = new Date(holiday.startDate || holiday.date);
        const endDate = new Date(holiday.endDate || holiday.date);

        const existingHoliday = await prisma.holiday.findFirst({
          where: {
            name: holiday.name,
            startDate: startDate
          }
        });

        if (!existingHoliday) {
          const createdHoliday = await prisma.holiday.create({
            data: {
              name: holiday.name,
              startDate: startDate,
              endDate: endDate,
              type: holiday.type,
              description: `${holiday.name} - Pakistan Public Holiday`,
              isRecurring: true,
              status: 'ACTIVE',
              campuses: {
                connect: campuses.map(c => ({ id: c.id }))
              }
            }
          });
          holidaysCreated++;
        }
      } catch (error) {
        console.error(`Failed to create holiday ${holiday.name}:`, error.message);
      }
    }

    console.log(`✅ Created ${holidaysCreated} holidays`);

    // 2. Seed Educational Events
    console.log('\n2. Seeding educational events...');
    
    const academicCycles = await prisma.academicCycle.findMany({
      where: { status: 'ACTIVE' },
      take: 1
    });

    if (academicCycles.length > 0) {
      const academicCycle = academicCycles[0];
      
      const educationalEvents = [
        {
          name: 'Admission Open',
          description: 'New student admissions are now open',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-02-15'),
          type: 'ADMISSION',
          priority: 'HIGH'
        },
        {
          name: 'Mid-Term Examinations',
          description: 'Mid-term examinations for all classes',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-04-15'),
          type: 'EXAMINATION',
          priority: 'HIGH'
        },
        {
          name: 'Parent-Teacher Conference',
          description: 'Quarterly parent-teacher meetings',
          startDate: new Date('2025-05-10'),
          endDate: new Date('2025-05-12'),
          type: 'MEETING',
          priority: 'MEDIUM'
        },
        {
          name: 'Annual Sports Day',
          description: 'Annual sports competition and activities',
          startDate: new Date('2025-03-20'),
          endDate: new Date('2025-03-22'),
          type: 'EVENT',
          priority: 'MEDIUM'
        },
        {
          name: 'Final Examinations',
          description: 'Final examinations for all classes',
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-20'),
          type: 'EXAMINATION',
          priority: 'HIGH'
        }
      ];

      let eventsCreated = 0;
      for (const event of educationalEvents) {
        try {
          await prisma.academicCalendarEvent.create({
            data: {
              ...event,
              academicCycleId: academicCycle.id,
              status: 'ACTIVE',
              campuses: {
                connect: campuses.map(c => ({ id: c.id }))
              }
            }
          });
          eventsCreated++;
        } catch (error) {
          console.error(`Failed to create event ${event.name}:`, error.message);
        }
      }

      console.log(`✅ Created ${eventsCreated} educational events`);
    } else {
      console.log('⚠️ No active academic cycles found, skipping educational events');
    }

    // 3. Seed Working Days Configuration
    console.log('\n3. Setting up working days configuration...');
    
    let workingDaysCreated = 0;
    for (const campus of campuses) {
      try {
        // Check if configuration already exists
        const existingConfig = await prisma.workingDaysConfig.findFirst({
          where: {
            campusId: campus.id,
            isActive: true
          }
        });

        if (!existingConfig) {
          await prisma.workingDaysConfig.create({
            data: {
              campusId: campus.id,
              pattern: 'FIVE_DAYS', // Default to 5-day work week
              workingDays: [1, 2, 3, 4, 5], // Monday to Friday
              startTime: '08:00',
              endTime: '16:00',
              breakStart: '12:00',
              breakEnd: '13:00',
              isActive: true,
              effectiveFrom: new Date()
            }
          });
          workingDaysCreated++;
        }
      } catch (error) {
        console.error(`Failed to create working days config for ${campus.name}:`, error.message);
      }
    }

    console.log(`✅ Created working days configuration for ${workingDaysCreated} campuses`);

    // 4. Seed Sample Personal Calendar Events
    console.log('\n4. Seeding sample personal calendar events...');
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { studentProfile: { isNot: null } },
          { teacherProfile: { isNot: null } }
        ]
      },
      take: 10 // Limit to first 10 users
    });

    const personalEventTypes = ['PERSONAL', 'MEETING', 'REMINDER', 'TASK'];
    let personalEventsCreated = 0;

    for (const user of users) {
      try {
        // Create 2-3 sample events per user
        const eventCount = Math.floor(Math.random() * 2) + 2;
        
        for (let i = 0; i < eventCount; i++) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30)); // Random date in next 30 days
          startDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // Random hour between 9-16
          
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1); // 1 hour duration
          
          const eventType = personalEventTypes[Math.floor(Math.random() * personalEventTypes.length)];
          
          await prisma.personalCalendarEvent.create({
            data: {
              userId: user.id,
              title: `Sample ${eventType} Event`,
              description: `This is a sample ${eventType.toLowerCase()} event for demonstration`,
              startDate: startDate,
              endDate: endDate,
              type: eventType,
              color: '#3B82F6',
              status: 'ACTIVE'
            }
          });
          personalEventsCreated++;
        }
      } catch (error) {
        console.error(`Failed to create personal events for user ${user.id}:`, error.message);
      }
    }

    console.log(`✅ Created ${personalEventsCreated} sample personal calendar events`);

    console.log('\n🎉 Calendar data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Holidays: ${holidaysCreated} created`);
    console.log(`  - Educational Events: Created for ${campuses.length} campuses`);
    console.log(`  - Working Days Config: ${workingDaysCreated} campuses configured`);
    console.log(`  - Personal Events: ${personalEventsCreated} sample events created`);

  } catch (error) {
    console.error('❌ Calendar data seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedCalendarData()
    .then(() => {
      console.log('\n✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedCalendarData };
