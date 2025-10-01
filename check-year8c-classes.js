const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkYear8CClasses() {
  try {
    // Find all classes with "Year 8 C" in the name
    const classes = await prisma.class.findMany({
      where: {
        name: { contains: 'Year 8 C' }
      },
      include: {
        courseCampus: {
          include: {
            course: true
          }
        },
        students: {
          take: 3,
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    console.log(`📚 Found ${classes.length} classes with "Year 8 C" in name:`);
    
    for (const cls of classes) {
      console.log(`\n🏫 Class: ${cls.name}`);
      console.log(`   ID: ${cls.id}`);
      console.log(`   Code: ${cls.code}`);
      console.log(`   Status: ${cls.status}`);
      console.log(`   Course: ${cls.courseCampus?.course?.name || 'Unknown'}`);
      console.log(`   Students: ${cls.students.length} (showing first 3)`);
      
      cls.students.slice(0, 3).forEach(enrollment => {
        console.log(`     - ${enrollment.student.user.name} (${enrollment.student.user.email})`);
      });

      // Check activities for this class
      const activities = await prisma.activity.count({
        where: {
          classId: cls.id,
          status: 'ACTIVE'
        }
      });
      console.log(`   Activities: ${activities}`);
    }

    // Also check the specific class ID from activities
    const activityClassId = 'cmesxnvle006wuxvpxic2pp41';
    const activityClass = await prisma.class.findUnique({
      where: { id: activityClassId },
      include: {
        courseCampus: {
          include: {
            course: true
          }
        }
      }
    });

    if (activityClass) {
      console.log(`\n🎯 Class from activities (ID: ${activityClassId}):`);
      console.log(`   Name: ${activityClass.name}`);
      console.log(`   Code: ${activityClass.code}`);
      console.log(`   Status: ${activityClass.status}`);
      console.log(`   Course: ${activityClass.courseCampus?.course?.name || 'Unknown'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYear8CClasses();
