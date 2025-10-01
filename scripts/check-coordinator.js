const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCoordinator() {
  console.log('🔍 Checking coordinator data...');

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

    if (!coordinator) {
      console.log('❌ No coordinator user found');
      return;
    }

    console.log('👤 Coordinator User:');
    console.log(`  ID: ${coordinator.id}`);
    console.log(`  Name: ${coordinator.name}`);
    console.log(`  Username: ${coordinator.username}`);
    console.log(`  Email: ${coordinator.email}`);
    console.log(`  UserType: ${coordinator.userType}`);
    console.log(`  Status: ${coordinator.status}`);

    if (coordinator.coordinatorProfile) {
      console.log('\n📋 Coordinator Profile:');
      console.log(`  ID: ${coordinator.coordinatorProfile.id}`);
      console.log(`  Department: ${coordinator.coordinatorProfile.department}`);
      console.log(`  Responsibilities: ${JSON.stringify(coordinator.coordinatorProfile.responsibilities, null, 2)}`);
      
      const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
      console.log(`  Managed Programs: ${managedPrograms.length} programs`);
      
      if (managedPrograms.length > 0) {
        managedPrograms.forEach((program, index) => {
          console.log(`    Program ${index + 1}:`);
          console.log(`      ID: ${program.programId}`);
          console.log(`      Name: ${program.programName}`);
          console.log(`      Code: ${program.programCode}`);
          console.log(`      Campus: ${program.campusName} (${program.campusId})`);
        });
      }

      const managedCourses = coordinator.coordinatorProfile.managedCourses || [];
      console.log(`  Managed Courses: ${managedCourses.length} courses`);
    } else {
      console.log('\n❌ No coordinator profile found');
    }

    // Check what programs exist
    console.log('\n📚 Available Programs:');
    const programs = await prisma.program.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        status: true
      }
    });

    programs.forEach((program, index) => {
      console.log(`  Program ${index + 1}: ${program.name} (${program.code}) - ${program.id}`);
    });

    // Check what campuses exist
    console.log('\n🏫 Available Campuses:');
    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        code: true,
        status: true
      }
    });

    campuses.forEach((campus, index) => {
      console.log(`  Campus ${index + 1}: ${campus.name} (${campus.code}) - ${campus.id}`);
    });

  } catch (error) {
    console.error('❌ Error checking coordinator:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCoordinator()
  .then(() => {
    console.log('\n✅ Coordinator check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator check:', error);
    process.exit(1);
  });
