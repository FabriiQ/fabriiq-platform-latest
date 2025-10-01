/**
 * Debug script to check activity ID "4040" issue
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugActivity4040() {
  try {
    console.log('🔍 Debugging activity ID "4040" issue...\n');

    // Check if activity with ID "4040" exists
    const activity4040 = await prisma.activity.findUnique({
      where: { id: '4040' },
      select: {
        id: true,
        title: true,
        classId: true,
        content: true,
        gradingConfig: true,
        createdAt: true
      }
    });

    if (activity4040) {
      console.log('✅ Activity "4040" found:');
      console.log(`   Title: ${activity4040.title}`);
      console.log(`   Class ID: ${activity4040.classId}`);
      console.log(`   Created: ${activity4040.createdAt}`);
      console.log(`   Content type: ${typeof activity4040.content}`);
      console.log(`   Grading config: ${typeof activity4040.gradingConfig}`);
      
      // Check if it's a V2 activity
      const gradingConfig = activity4040.gradingConfig;
      if (gradingConfig && typeof gradingConfig === 'object' && gradingConfig.version === '2.0') {
        console.log('   ✅ This is an Activities V2 activity');
      } else {
        console.log('   ⚠️  This is a legacy activity');
      }
    } else {
      console.log('❌ Activity "4040" not found in database');
    }

    // Check for activities with similar IDs
    const similarActivities = await prisma.activity.findMany({
      where: {
        OR: [
          { id: { contains: '4040' } },
          { id: { startsWith: '404' } },
          { id: { endsWith: '040' } }
        ]
      },
      select: {
        id: true,
        title: true,
        classId: true
      },
      take: 10
    });

    if (similarActivities.length > 0) {
      console.log('\n🔍 Found activities with similar IDs:');
      similarActivities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.id} - ${activity.title} (Class: ${activity.classId})`);
      });
    }

    // Check for any malformed activity IDs
    const allActivities = await prisma.activity.findMany({
      select: {
        id: true,
        title: true,
        classId: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log('\n📋 Recent activities:');
    allActivities.forEach((activity, index) => {
      const isValidId = /^[a-zA-Z0-9_-]+$/.test(activity.id);
      const status = isValidId ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${activity.id} - ${activity.title}`);
    });

    // Check for URL encoding issues
    const encodedId = encodeURIComponent('4040');
    const decodedId = decodeURIComponent('4040');
    console.log(`\n🔗 URL encoding check:`);
    console.log(`   Original: "4040"`);
    console.log(`   Encoded: "${encodedId}"`);
    console.log(`   Decoded: "${decodedId}"`);

    console.log('\n✅ Debug analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugActivity4040();
