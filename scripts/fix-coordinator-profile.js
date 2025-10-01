const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCoordinatorProfile() {
  console.log('🔧 Fixing coordinator profile...');

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

    console.log(`📋 Found coordinator: ${coordinator.name} (${coordinator.username})`);

    // Check if coordinator profile exists
    if (coordinator.coordinatorProfile) {
      console.log('✅ Coordinator profile already exists');
      
      // Check if managedPrograms is empty
      const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
      if (Array.isArray(managedPrograms) && managedPrograms.length === 0) {
        console.log('📝 Coordinator profile exists but has no managed programs. Adding programs...');
        
        // Get first program and campus
        const program = await prisma.program.findFirst({
          where: { status: 'ACTIVE' }
        });
        
        const campus = await prisma.campus.findFirst({
          where: { status: 'ACTIVE' }
        });

        if (program && campus) {
          await prisma.coordinatorProfile.update({
            where: { userId: coordinator.id },
            data: {
              managedPrograms: [
                {
                  programId: program.id,
                  programName: program.name,
                  programCode: program.code,
                  campusId: campus.id,
                  campusName: campus.name,
                  role: 'Program Coordinator',
                  responsibilities: ['Academic oversight', 'Program management'],
                  assignedAt: new Date().toISOString(),
                }
              ]
            }
          });
          console.log('✅ Added managed programs to coordinator profile');
        }
      } else {
        console.log('✅ Coordinator already has managed programs');
      }
      return;
    }

    // Create coordinator profile
    console.log('🆕 Creating coordinator profile...');
    
    // Get first program and campus for assignment
    const program = await prisma.program.findFirst({
      where: { status: 'ACTIVE' }
    });
    
    const campus = await prisma.campus.findFirst({
      where: { status: 'ACTIVE' }
    });

    const profileData = {
      userId: coordinator.id,
      department: 'Academic Affairs',
      qualifications: [
        {
          degree: 'Master of Education',
          institution: 'University of Education',
          year: 2018
        }
      ],
      responsibilities: [
        'Program coordination',
        'Academic planning',
        'Teacher supervision',
        'Student progress monitoring'
      ],
      managedPrograms: [],
      managedCourses: []
    };

    // Add managed programs if we have program and campus
    if (program && campus) {
      profileData.managedPrograms = [
        {
          programId: program.id,
          programName: program.name,
          programCode: program.code,
          campusId: campus.id,
          campusName: campus.name,
          role: 'Program Coordinator',
          responsibilities: ['Academic oversight', 'Program management'],
          assignedAt: new Date().toISOString(),
        }
      ];
    }

    await prisma.coordinatorProfile.create({
      data: profileData
    });

    console.log('✅ Coordinator profile created successfully!');
    
    if (program && campus) {
      console.log(`📋 Assigned program: ${program.name} (${program.code}) at ${campus.name}`);
    }

  } catch (error) {
    console.error('❌ Error fixing coordinator profile:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCoordinatorProfile()
  .then(() => {
    console.log('🎉 Coordinator profile fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator profile fix:', error);
    process.exit(1);
  });
