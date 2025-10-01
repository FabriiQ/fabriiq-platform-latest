const { PrismaClient } = require('@prisma/client');

async function testHolidayDisplay() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing holiday display...');
    
    // Get all holidays
    const holidays = await prisma.holiday.findMany({
      where: { status: 'ACTIVE' },
      include: {
        campuses: {
          select: { id: true, name: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`📅 Found ${holidays.length} active holidays:`);
    
    holidays.forEach(holiday => {
      console.log(`  - ${holiday.name} (${holiday.type})`);
      console.log(`    Date: ${holiday.startDate.toDateString()} - ${holiday.endDate.toDateString()}`);
      console.log(`    Campuses: ${holiday.campuses.map(c => c.name).join(', ')}`);
      console.log('');
    });
    
    // Test unified calendar query
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    
    console.log('🔍 Testing unified calendar query...');
    
    // Get holidays in date range
    const holidaysInRange = await prisma.holiday.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      include: {
        campuses: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`📊 Holidays in 2025: ${holidaysInRange.length}`);
    
    // Get personal calendar events (synced holidays)
    const personalEvents = await prisma.personalCalendarEvent.findMany({
      where: {
        sourceType: 'holiday',
        startDate: { gte: startDate, lte: endDate }
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });
    
    console.log(`👤 Personal calendar events (synced): ${personalEvents.length}`);
    
    if (personalEvents.length > 0) {
      console.log('Sample synced events:');
      personalEvents.slice(0, 5).forEach(event => {
        console.log(`  - ${event.title} for ${event.user.email}`);
      });
    }
    
    console.log('\n✅ Holiday display test completed!');
    
  } catch (error) {
    console.error('❌ Error testing holiday display:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testHolidayDisplay();
