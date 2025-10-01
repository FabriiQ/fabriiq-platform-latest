const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCoordinatorDashboard() {
  console.log('🧪 Testing coordinator dashboard functionality...');

  try {
    // Test 1: Verify coordinator exists and has proper assignments
    console.log('\n1️⃣ Testing coordinator assignments...');
    
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

    console.log(`✅ Coordinator: ${coordinator.name} (${coordinator.username})`);
    console.log(`✅ Managed Programs: ${managedPrograms.length}`);
    console.log(`✅ Managed Courses: ${managedCourses.length}`);

    if (managedPrograms.length === 0) {
      console.log('❌ No managed programs - dashboard will be empty');
      return;
    }

    if (managedCourses.length === 0) {
      console.log('❌ No managed courses - students/teachers queries will fail');
      return;
    }

    // Test 2: Test students access
    console.log('\n2️⃣ Testing student access...');
    
    const programIds = [...new Set(managedPrograms.map(p => p.programId))];
    const campusIds = [...new Set(managedPrograms.map(p => p.campusId))];

    // Get courses for these programs
    const courses = await prisma.course.findMany({
      where: {
        programId: { in: programIds },
        status: 'ACTIVE'
      }
    });

    const courseIds = courses.map(c => c.id);

    // Get classes for these courses at managed campuses
    const classes = await prisma.class.findMany({
      where: {
        courseCampus: {
          courseId: { in: courseIds },
          campusId: { in: campusIds }
        },
        status: 'ACTIVE'
      }
    });

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
            user: true
          }
        }
      }
    });

    const uniqueStudents = new Set(studentEnrollments.map(e => e.studentId)).size;
    console.log(`✅ Students accessible: ${uniqueStudents}`);

    // Test 3: Test teachers access
    console.log('\n3️⃣ Testing teacher access...');

    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE'
      },
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    const uniqueTeachers = new Set(teacherAssignments.map(a => a.teacherId)).size;
    console.log(`✅ Teachers accessible: ${uniqueTeachers}`);

    // Test 4: Test programs available for assignment
    console.log('\n4️⃣ Testing programs available for assignment...');

    const allPrograms = await prisma.program.findMany({
      where: { status: 'ACTIVE' },
      include: {
        campusOfferings: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    const assignedProgramIds = managedPrograms.map(p => p.programId);
    const availablePrograms = allPrograms.filter(p => 
      !assignedProgramIds.includes(p.id) && p.campusOfferings.length > 0
    );

    console.log(`✅ Total programs: ${allPrograms.length}`);
    console.log(`✅ Assigned programs: ${assignedProgramIds.length}`);
    console.log(`✅ Available for assignment: ${availablePrograms.length}`);

    // Test 5: Test campus data
    console.log('\n5️⃣ Testing campus data...');

    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' }
    });

    console.log(`✅ Active campuses: ${campuses.length}`);
    campuses.forEach(campus => {
      const isManaged = campusIds.includes(campus.id);
      console.log(`   ${campus.name} (${campus.code}): ${isManaged ? '✅ Managed' : '⚪ Not managed'}`);
    });

    // Test 6: Summary for dashboard functionality
    console.log('\n📊 Dashboard Functionality Summary:');
    console.log(`   Coordinator: ${coordinator.name}`);
    console.log(`   Programs: ${managedPrograms.length} managed`);
    console.log(`   Courses: ${managedCourses.length} managed`);
    console.log(`   Classes: ${classes.length} accessible`);
    console.log(`   Students: ${uniqueStudents} accessible`);
    console.log(`   Teachers: ${uniqueTeachers} accessible`);
    console.log(`   Campuses: ${campuses.length} total, ${campusIds.length} managed`);

    console.log('\n✅ All dashboard components should now work properly!');

    // Test 7: Verify unassign functionality will work
    console.log('\n6️⃣ Testing unassign functionality...');
    
    // Check if coordinator can be found with both userType options
    const coordinatorForUnassign = await prisma.user.findUnique({
      where: {
        id: coordinator.id,
        OR: [
          { userType: 'CAMPUS_COORDINATOR' },
          { userType: 'COORDINATOR' }
        ]
      },
      include: {
        coordinatorProfile: true
      }
    });

    if (coordinatorForUnassign) {
      console.log('✅ Coordinator can be found for unassign operations');
    } else {
      console.log('❌ Coordinator cannot be found for unassign operations');
    }

  } catch (error) {
    console.error('❌ Error testing coordinator dashboard:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCoordinatorDashboard()
  .then(() => {
    console.log('\n🎉 Coordinator dashboard test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator dashboard test:', error);
    process.exit(1);
  });
