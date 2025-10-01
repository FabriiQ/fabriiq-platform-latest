const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCalendarData() {
  console.log('🔍 Checking calendar data...\n');

  try {
    // Check institutions
    const institutions = await prisma.institution.findMany({
      select: { id: true, name: true, code: true }
    });
    console.log(`📚 Institutions: ${institutions.length}`);
    institutions.forEach(inst => console.log(`  - ${inst.name} (${inst.code})`));
    console.log('');

    // Check academic cycles
    const academicCycles = await prisma.academicCycle.findMany({
      select: { id: true, name: true, code: true, status: true, institutionId: true }
    });
    console.log(`📅 Academic Cycles: ${academicCycles.length}`);
    academicCycles.forEach(cycle => console.log(`  - ${cycle.name} (${cycle.code}) - ${cycle.status}`));
    console.log('');

    // Check academic calendar events
    const academicEvents = await prisma.academicCalendarEvent.findMany({
      select: { id: true, name: true, type: true, status: true, startDate: true, endDate: true }
    });
    console.log(`🎯 Academic Calendar Events: ${academicEvents.length}`);
    academicEvents.forEach(event => console.log(`  - ${event.name} (${event.type}) - ${event.status}`));
    console.log('');

    // Check holidays
    const holidays = await prisma.holiday.findMany({
      select: { id: true, name: true, type: true, status: true, startDate: true, endDate: true }
    });
    console.log(`🎉 Holidays: ${holidays.length}`);
    holidays.forEach(holiday => console.log(`  - ${holiday.name} (${holiday.type}) - ${holiday.status}`));
    console.log('');

    // Check users (admin users)
    const adminUsers = await prisma.user.findMany({
      where: { userType: { in: ['SYSTEM_ADMIN', 'CAMPUS_ADMIN'] } },
      select: { id: true, name: true, userType: true, institutionId: true }
    });
    console.log(`👤 Admin Users: ${adminUsers.length}`);
    adminUsers.forEach(user => console.log(`  - ${user.name} (${user.userType})`));
    console.log('');

    // If we have institutions and admin users but no academic cycles, create one
    if (institutions.length > 0 && adminUsers.length > 0 && academicCycles.length === 0) {
      console.log('🌱 Creating a sample academic cycle...');
      
      const institution = institutions[0];
      const adminUser = adminUsers[0];
      
      const newCycle = await prisma.academicCycle.create({
        data: {
          name: 'Academic Year 2024-2025',
          code: 'AY2024-25',
          description: 'Main academic year for 2024-2025',
          institutionId: institution.id,
          startDate: new Date('2024-09-01'),
          endDate: new Date('2025-06-30'),
          status: 'ACTIVE',
          type: 'ANNUAL',
          duration: 10,
          createdBy: adminUser.id
        }
      });
      
      console.log(`✅ Created academic cycle: ${newCycle.name}`);
      
      // Now create some sample academic events
      const sampleEvents = [
        {
          name: 'Fall Semester Registration',
          description: 'Registration period for fall semester courses',
          startDate: new Date('2024-08-15'),
          endDate: new Date('2024-08-30'),
          type: 'REGISTRATION',
        },
        {
          name: 'Fall Semester Orientation',
          description: 'New student orientation for fall semester',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-09-03'),
          type: 'ORIENTATION',
        },
        {
          name: 'Mid-term Examinations',
          description: 'Mid-term examination period',
          startDate: new Date('2024-11-15'),
          endDate: new Date('2024-11-22'),
          type: 'EXAMINATION',
        }
      ];
      
      console.log('🎯 Creating sample academic events...');
      for (const eventData of sampleEvents) {
        try {
          const event = await prisma.academicCalendarEvent.create({
            data: {
              ...eventData,
              academicCycleId: newCycle.id,
              createdBy: adminUser.id,
              status: 'ACTIVE'
            }
          });
          console.log(`✅ Created event: ${event.name}`);
        } catch (error) {
          console.log(`❌ Failed to create event ${eventData.name}:`, error.message);
        }
      }
    }

    // If we have academic cycles but no events, create some sample events
    if (academicCycles.length > 0 && academicEvents.length === 0 && adminUsers.length > 0) {
      console.log('🎯 Creating sample academic events...');
      
      const cycle = academicCycles[0];
      const adminUser = adminUsers[0];
      
      const sampleEvents = [
        {
          name: 'Spring Semester Registration',
          description: 'Registration period for spring semester courses',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-30'),
          type: 'REGISTRATION',
        },
        {
          name: 'Spring Semester Orientation',
          description: 'New student orientation for spring semester',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-03'),
          type: 'ORIENTATION',
        },
        {
          name: 'Final Examinations',
          description: 'Final examination period',
          startDate: new Date('2025-05-15'),
          endDate: new Date('2025-05-30'),
          type: 'EXAMINATION',
        }
      ];
      
      for (const eventData of sampleEvents) {
        try {
          const event = await prisma.academicCalendarEvent.create({
            data: {
              ...eventData,
              academicCycleId: cycle.id,
              createdBy: adminUser.id,
              status: 'ACTIVE'
            }
          });
          console.log(`✅ Created event: ${event.name}`);
        } catch (error) {
          console.log(`❌ Failed to create event ${eventData.name}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Calendar data check completed!');

  } catch (error) {
    console.error('❌ Error checking calendar data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
if (require.main === module) {
  checkCalendarData()
    .then(() => {
      console.log('✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkCalendarData };
