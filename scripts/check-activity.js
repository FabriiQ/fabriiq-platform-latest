/**
 * Check Activity by ID
 * Checks if a specific activity exists and shows its details
 */

const { PrismaClient } = require('@prisma/client');

async function checkActivity() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Checking activity...\n');

  try {
    const activityId = 'cmev1x82b0002997fnzrxr3uh';
    
    // Check if activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        subject: {
          select: {
            id: true,
            name: true
          }
        },
        topic: {
          select: {
            id: true,
            title: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (activity) {
      console.log('✅ Activity found:');
      console.log(`   ID: ${activity.id}`);
      console.log(`   Title: ${activity.title}`);
      console.log(`   Purpose: ${activity.purpose}`);
      console.log(`   Learning Type: ${activity.learningType}`);
      console.log(`   Status: ${activity.status}`);
      console.log(`   Subject: ${activity.subject?.name || 'N/A'}`);
      console.log(`   Topic: ${activity.topic?.title || 'N/A'}`);
      console.log(`   Class: ${activity.class?.name || 'N/A'}`);
      console.log(`   Created: ${activity.createdAt}`);
    } else {
      console.log('❌ Activity not found');
      
      // Check if there are any activities for this class
      const classActivities = await prisma.activity.findMany({
        where: { classId: 'cmesxnvle006wuxvpxic2pp41' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`\n📋 Found ${classActivities.length} activities for this class:`);
      classActivities.forEach((act, index) => {
        console.log(`   ${index + 1}. ${act.title} (${act.id}) - ${act.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivity();
