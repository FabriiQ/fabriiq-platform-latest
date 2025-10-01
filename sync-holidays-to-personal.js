const { PrismaClient } = require('@prisma/client');

async function syncHolidaysToPersonal() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Syncing holidays to personal calendars...');
    
    // Get all active holidays
    const holidays = await prisma.holiday.findMany({
      where: { status: 'ACTIVE' },
      include: {
        campuses: {
          include: {
            userAccess: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, email: true, status: true }
                }
              }
            }
          }
        }
      }
    });
    
    console.log(`📅 Found ${holidays.length} holidays to sync`);
    
    let totalSynced = 0;
    let totalSkipped = 0;
    
    for (const holiday of holidays) {
      console.log(`\n🏠 Processing holiday: ${holiday.name}`);
      
      // Get all users from associated campuses
      const allUsers = [];
      holiday.campuses.forEach(campus => {
        campus.userAccess.forEach(access => {
          if (access.user.status === 'ACTIVE' && !allUsers.find(u => u.id === access.user.id)) {
            allUsers.push(access.user);
          }
        });
      });
      
      console.log(`👥 Found ${allUsers.length} users across ${holiday.campuses.length} campuses`);
      
      for (const user of allUsers) {
        try {
          // Check if personal event already exists
          const existingEvent = await prisma.personalCalendarEvent.findFirst({
            where: {
              userId: user.id,
              sourceEventId: holiday.id,
              sourceType: 'holiday'
            }
          });
          
          if (existingEvent) {
            totalSkipped++;
            continue;
          }
          
          // Create personal calendar event
          await prisma.personalCalendarEvent.create({
            data: {
              title: holiday.name,
              description: holiday.description || `${holiday.type} holiday`,
              startDate: holiday.startDate,
              endDate: holiday.endDate,
              isAllDay: true,
              type: 'PERSONAL',
              color: holiday.type === 'RELIGIOUS' ? '#10B981' : 
                     holiday.type === 'NATIONAL' ? '#3B82F6' : '#6B7280',
              userId: user.id,
              sourceEventId: holiday.id,
              sourceType: 'holiday',
              isReadOnly: true,
              status: 'ACTIVE'
            }
          });
          
          totalSynced++;
          
        } catch (error) {
          console.error(`❌ Error syncing holiday ${holiday.name} to user ${user.email}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Holiday sync completed!');
    console.log(`📊 Results: ${totalSynced} synced, ${totalSkipped} skipped`);
    
    // Verify sync results
    const personalEvents = await prisma.personalCalendarEvent.findMany({
      where: { sourceType: 'holiday' },
      include: {
        user: { select: { email: true } }
      }
    });
    
    console.log(`✅ Total personal holiday events: ${personalEvents.length}`);
    
    // Show sample events
    if (personalEvents.length > 0) {
      console.log('\n📋 Sample synced events:');
      personalEvents.slice(0, 5).forEach(event => {
        console.log(`  - ${event.title} for ${event.user.email} on ${event.startDate.toDateString()}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Fatal error during sync:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncHolidaysToPersonal();
