const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCoordinatorFix() {
  console.log('✅ Verifying coordinator fix...');

  try {
    // Find coordinator user
    const coordinator = await prisma.user.findFirst({
      where: {
        OR: [
          { userType: 'COORDINATOR' },
          { userType: 'CAMPUS_COORDINATOR' }
        ]
      },
      include: {
        coordinatorProfile: true
      }
    });

    if (!coordinator || !coordinator.coordinatorProfile) {
      console.log('❌ No coordinator or coordinator profile found');
      return;
    }

    const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
    const managedCourses = coordinator.coordinatorProfile.managedCourses || [];

    console.log(`👤 Coordinator: ${coordinator.name}`);
    console.log(`📚 Managed Programs: ${managedPrograms.length}`);
    console.log(`📖 Managed Courses: ${managedCourses.length}`);

    let totalClasses = 0;
    managedCourses.forEach(course => {
      console.log(`  Course: ${course.courseName} (${course.courseCode})`);
      console.log(`    Classes: ${course.classes ? course.classes.length : 0}`);
      totalClasses += course.classes ? course.classes.length : 0;
    });

    console.log(`🏫 Total Classes: ${totalClasses}`);

    // Count students in managed classes
    const allClassIds = [];
    managedCourses.forEach(course => {
      if (course.classes) {
        course.classes.forEach(cls => {
          allClassIds.push(cls.classId);
        });
      }
    });

    if (allClassIds.length > 0) {
      const studentCount = await prisma.studentEnrollment.count({
        where: {
          classId: { in: allClassIds },
          status: 'ACTIVE'
        }
      });

      console.log(`👥 Total Students: ${studentCount}`);
    }

    console.log('\n🎉 Coordinator should now be able to see:');
    console.log(`   - ${managedPrograms.length} programs`);
    console.log(`   - ${managedCourses.length} courses`);
    console.log(`   - ${totalClasses} classes`);
    console.log(`   - Students in those classes`);

  } catch (error) {
    console.error('❌ Error verifying coordinator fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyCoordinatorFix()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during verification:', error);
    process.exit(1);
  });
