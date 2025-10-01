const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeedingResults() {
  try {
    console.log('🔍 Checking seeding results...\n');

    // Check Activities v2 created
    const activitiesCount = await prisma.activity.count({
      where: {
        classId: 'cmesxnvle006wuxvpxic2pp41' // SIS-BOYS-Y8-C
      }
    });
    console.log(`📚 Total activities in SIS-BOYS-Y8-C: ${activitiesCount}`);

    // Check by subject
    const activitiesBySubject = await prisma.activity.groupBy({
      by: ['subjectId'],
      where: {
        classId: 'cmesxnvle006wuxvpxic2pp41'
      },
      _count: {
        id: true
      }
    });

    console.log('\n📊 Activities by subject:');
    for (const group of activitiesBySubject) {
      const subject = await prisma.subject.findUnique({
        where: { id: group.subjectId },
        select: { name: true }
      });
      console.log(`  ${subject?.name}: ${group._count.id} activities`);
    }

    // Check activity grades
    const gradesCount = await prisma.activityGrade.count({
      where: {
        activity: {
          classId: 'cmesxnvle006wuxvpxic2pp41'
        }
      }
    });
    console.log(`\n📝 Total activity grades: ${gradesCount}`);

    // Check students in the class
    const studentsCount = await prisma.studentEnrollment.count({
      where: {
        classId: 'cmesxnvle006wuxvpxic2pp41',
        status: 'ACTIVE'
      }
    });
    console.log(`👥 Students in SIS-BOYS-Y8-C: ${studentsCount}`);

    // Check recent activities created
    const recentActivities = await prisma.activity.findMany({
      where: {
        classId: 'cmesxnvle006wuxvpxic2pp41'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        title: true,
        learningType: true,
        createdAt: true,
        subject: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('\n🆕 Recent activities created:');
    recentActivities.forEach(activity => {
      console.log(`  ${activity.title} (${activity.learningType}) - ${activity.subject.name} - ${activity.createdAt.toISOString()}`);
    });

    // Check if demo users exist
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['john.smith@example.com', 'math_boys@sunshine.edu']
        }
      },
      select: {
        email: true,
        name: true,
        userType: true
      }
    });

    console.log('\n👤 Demo users:');
    demoUsers.forEach(user => {
      console.log(`  ${user.name} (${user.email}) - ${user.userType}`);
    });

  } catch (error) {
    console.error('❌ Error checking seeding results:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeedingResults();
