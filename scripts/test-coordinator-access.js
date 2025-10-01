const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCoordinatorAccess() {
  console.log('🧪 Testing coordinator access to data...');

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

    console.log(`👤 Testing access for: ${coordinator.name} (${coordinator.username})`);

    const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
    const managedCourses = coordinator.coordinatorProfile.managedCourses || [];

    console.log(`📚 Managed Programs: ${managedPrograms.length}`);
    console.log(`📖 Managed Courses: ${managedCourses.length}`);

    if (managedPrograms.length === 0) {
      console.log('❌ No managed programs - coordinator will not see any data');
      return;
    }

    // Test 1: Check if coordinator can access students
    console.log('\n🧑‍🎓 Testing student access...');
    
    const programIds = [...new Set(managedPrograms.map(p => p.programId))];
    const campusIds = [...new Set(managedPrograms.map(p => p.campusId))];

    // Get courses for these programs
    const courses = await prisma.course.findMany({
      where: {
        programId: { in: programIds },
        status: 'ACTIVE'
      },
      select: { id: true, name: true }
    });

    console.log(`  Found ${courses.length} courses in managed programs`);

    if (courses.length === 0) {
      console.log('  ❌ No courses found - students query will return empty');
      return;
    }

    const courseIds = courses.map(c => c.id);

    // Get classes for these courses at managed campuses
    const classes = await prisma.class.findMany({
      where: {
        courseCampus: {
          courseId: { in: courseIds },
          campusId: { in: campusIds }
        },
        status: 'ACTIVE'
      },
      select: { id: true, name: true }
    });

    console.log(`  Found ${classes.length} classes in managed courses`);

    if (classes.length === 0) {
      console.log('  ❌ No classes found - students query will return empty');
      return;
    }

    const classIds = classes.map(c => c.id);

    // Get students in these classes
    const studentEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE'
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true
              }
            }
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

    console.log(`  ✅ Found ${studentEnrollments.length} student enrollments`);
    console.log(`  ✅ Unique students: ${new Set(studentEnrollments.map(e => e.studentId)).size}`);

    // Test 2: Check if coordinator can access teachers
    console.log('\n👨‍🏫 Testing teacher access...');

    // Get teacher assignments for managed classes
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE'
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true
              }
            }
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

    console.log(`  ✅ Found ${teacherAssignments.length} teacher assignments`);
    console.log(`  ✅ Unique teachers: ${new Set(teacherAssignments.map(a => a.teacherId)).size}`);

    // Test 3: Summary
    console.log('\n📊 Access Summary:');
    console.log(`  Programs: ${managedPrograms.length}`);
    console.log(`  Courses: ${courses.length}`);
    console.log(`  Classes: ${classes.length}`);
    console.log(`  Students: ${new Set(studentEnrollments.map(e => e.studentId)).size}`);
    console.log(`  Teachers: ${new Set(teacherAssignments.map(a => a.teacherId)).size}`);

    console.log('\n✅ Coordinator should now be able to access all this data through the dashboard!');

  } catch (error) {
    console.error('❌ Error testing coordinator access:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCoordinatorAccess()
  .then(() => {
    console.log('\n🎉 Coordinator access test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator access test:', error);
    process.exit(1);
  });
