const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkActivities() {
  try {
    // Find Year 8 C class
    const targetClass = await prisma.class.findFirst({
      where: {
        name: { contains: 'Year 8 C' },
        status: 'ACTIVE'
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: true
              }
            }
          }
        }
      }
    });

    if (!targetClass) {
      console.log('❌ Year 8 C class not found');
      return;
    }

    console.log(`📚 Found class: ${targetClass.name} (ID: ${targetClass.id})`);
    console.log(`📖 Subjects: ${targetClass.courseCampus.course.subjects.map(s => s.name).join(', ')}`);

    // Check activities for this class
    const activities = await prisma.activity.findMany({
      where: {
        classId: targetClass.id,
        status: 'ACTIVE'
      },
      include: {
        subject: true
      }
    });

    console.log(`🎯 Found ${activities.length} activities for this class:`);
    
    if (activities.length > 0) {
      activities.forEach(activity => {
        console.log(`  - ${activity.title} (Subject: ${activity.subject?.name || 'Unknown'})`);
      });
    } else {
      console.log('  No activities found for this class');
      
      // Check if there are any activities in the database at all
      const totalActivities = await prisma.activity.count();
      console.log(`📊 Total activities in database: ${totalActivities}`);
      
      // Check activities by subject
      for (const subject of targetClass.courseCampus.course.subjects) {
        const subjectActivities = await prisma.activity.count({
          where: {
            subjectId: subject.id,
            status: 'ACTIVE'
          }
        });
        console.log(`  - ${subject.name}: ${subjectActivities} activities`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActivities();
