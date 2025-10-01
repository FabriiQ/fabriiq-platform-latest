const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkActivityStructure() {
  try {
    // Get a few sample activities to see their structure
    const activities = await prisma.activity.findMany({
      take: 5,
      include: {
        subject: true,
        class: true
      }
    });

    console.log(`📊 Sample activities structure:`);
    
    activities.forEach((activity, index) => {
      console.log(`\n${index + 1}. ${activity.title}`);
      console.log(`   Subject: ${activity.subject?.name || 'None'} (ID: ${activity.subjectId || 'None'})`);
      console.log(`   Class: ${activity.class?.name || 'None'} (ID: ${activity.classId || 'None'})`);
      console.log(`   Status: ${activity.status}`);
      console.log(`   Is Gradable: ${activity.isGradable}`);
    });

    // Check if activities are linked to classes or just subjects
    const activitiesWithClass = await prisma.activity.count({
      where: {
        classId: { not: null }
      }
    });

    const activitiesWithoutClass = await prisma.activity.count({
      where: {
        classId: null
      }
    });

    console.log(`\n📈 Activity distribution:`);
    console.log(`   With class assignment: ${activitiesWithClass}`);
    console.log(`   Without class assignment: ${activitiesWithoutClass}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivityStructure();
