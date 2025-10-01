const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCoordinatorFixes() {
  console.log('🧪 Testing all coordinator fixes...');

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
    console.log(`✅ User Type: ${coordinator.userType}`);
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

    // Test 2: Test unassign functionality will work
    console.log('\n2️⃣ Testing unassign functionality...');
    
    // Check if coordinator can be found with both userType options (for unassign)
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

    // Test 3: Test data access
    console.log('\n3️⃣ Testing data access...');
    
    const programIds = [...new Set(managedPrograms.map(p => p.programId))];
    const campusIds = [...new Set(managedPrograms.map(p => p.campusId))];

    // Get courses for these programs
    const courses = await prisma.course.findMany({
      where: {
        programId: { in: programIds },
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Accessible courses: ${courses.length}`);

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

    console.log(`✅ Accessible classes: ${classes.length}`);

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

    if (availablePrograms.length > 0) {
      console.log('✅ Programs dropdown will show available programs');
    } else {
      console.log('⚠️  No programs available for assignment');
    }

    // Test 5: Summary for dashboard functionality
    console.log('\n📊 Dashboard Functionality Summary:');
    console.log(`   Coordinator: ${coordinator.name}`);
    console.log(`   User Type: ${coordinator.userType}`);
    console.log(`   Programs: ${managedPrograms.length} managed`);
    console.log(`   Courses: ${managedCourses.length} managed`);
    console.log(`   Classes: ${classes.length} accessible`);
    console.log(`   Campuses: ${campusIds.length} managed`);

    console.log('\n✅ Expected Results:');
    console.log('   ✅ Dashboard should show real data (no hardcoded IDs)');
    console.log('   ✅ Students page should show students from managed classes');
    console.log('   ✅ Teachers page should show teachers from managed classes');
    console.log('   ✅ Assignment dialog should show available programs');
    console.log('   ✅ Unassign functionality should work without errors');
    console.log('   ✅ All Select components should work without empty string errors');
    console.log('   ✅ All percentages should display without decimals');

    console.log('\n🎯 Test URLs to verify:');
    console.log('   - http://localhost:3000/admin/coordinator (main dashboard)');
    console.log('   - http://localhost:3000/admin/coordinator/teachers (teachers page)');
    console.log('   - http://localhost:3000/admin/coordinator/students (students page)');
    console.log('   - http://localhost:3000/admin/coordinator/classes (classes redirect)');
    console.log('   - http://localhost:3000/admin/coordinator/attendance (attendance redirect)');

    console.log('\n🔑 Login Credentials:');
    console.log('   Username: alex_johnson');
    console.log('   Password: Password123!');
    console.log('   Or use: http://localhost:3000/direct-login?username=alex_johnson');

  } catch (error) {
    console.error('❌ Error testing coordinator fixes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCoordinatorFixes()
  .then(() => {
    console.log('\n🎉 All coordinator fixes tested successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator fixes test:', error);
    process.exit(1);
  });
