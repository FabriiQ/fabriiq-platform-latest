/**
 * Fix Activity Links
 * Updates any broken activity links and ensures proper routing
 */

const { PrismaClient } = require('@prisma/client');

async function fixActivityLinks() {
  const prisma = new PrismaClient();
  
  console.log('🔗 Fixing activity links...\n');

  try {
    const classId = 'cmesxnvle006wuxvpxic2pp41';
    const brokenActivityId = 'cmev1x82b0002997fnzrxr3uh';
    
    // Get all activities for this class
    const activities = await prisma.activity.findMany({
      where: { classId: classId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Found ${activities.length} activities for class ${classId}:`);
    activities.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity.title} (${activity.id}) - ${activity.status}`);
    });

    // Check if the broken activity ID exists anywhere
    const brokenActivity = await prisma.activity.findUnique({
      where: { id: brokenActivityId }
    });

    if (brokenActivity) {
      console.log(`\n✅ Broken activity found: ${brokenActivity.title}`);
    } else {
      console.log(`\n❌ Broken activity ID ${brokenActivityId} does not exist in database`);
      
      if (activities.length > 0) {
        const latestActivity = activities[0];
        console.log(`\n💡 Suggestion: Use latest activity instead:`);
        console.log(`   URL: http://localhost:3000/teacher/classes/${classId}/activities/${latestActivity.id}`);
        console.log(`   Title: ${latestActivity.title}`);
      }
    }

    // Check for any activities with similar IDs (in case of typo)
    const similarActivities = await prisma.activity.findMany({
      where: {
        id: {
          contains: brokenActivityId.substring(0, 10) // Check first 10 characters
        }
      },
      select: {
        id: true,
        title: true,
        classId: true
      }
    });

    if (similarActivities.length > 0) {
      console.log(`\n🔍 Found activities with similar IDs:`);
      similarActivities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.title} (${activity.id}) - Class: ${activity.classId}`);
      });
    }

    // Generate proper activity URLs for this class
    console.log(`\n🔗 Valid activity URLs for class ${classId}:`);
    activities.slice(0, 5).forEach((activity, index) => {
      const url = `http://localhost:3000/teacher/classes/${classId}/activities/${activity.id}`;
      console.log(`   ${index + 1}. ${activity.title}`);
      console.log(`      ${url}`);
    });

    console.log(`\n✅ Activity links analysis complete!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixActivityLinks();
