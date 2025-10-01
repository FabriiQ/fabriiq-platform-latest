const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixClassProgramCampus() {
  try {
    console.log('🔧 Fixing class program campus assignments...');

    // Get the enrollment we're working with
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: 'cmcd6fjgt00guvl4rhragm2lg' },
      include: {
        class: true,
        student: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (!enrollment) {
      console.log('❌ Enrollment not found');
      return;
    }

    console.log(`👤 Found enrollment for: ${enrollment.student.user?.name}`);
    console.log(`📚 Class: ${enrollment.class?.name}`);
    console.log(`🏫 Current Program Campus ID: ${enrollment.class?.programCampusId}`);

    // Get all program campuses to choose from
    const programCampuses = await prisma.programCampus.findMany({
      include: {
        program: { select: { name: true } },
        campus: { select: { name: true } }
      }
    });

    console.log('\n🏫 Available Program Campuses:');
    programCampuses.forEach((pc, index) => {
      console.log(`  ${index + 1}. ${pc.program.name} at ${pc.campus.name} (${pc.id})`);
    });

    // For Grade 1, let's assign it to Elementary Program at Main Campus
    const elementaryProgramCampus = programCampuses.find(pc => 
      pc.program.name === 'Elementary Program' && pc.campus.name === 'Main Campus'
    );

    if (!elementaryProgramCampus) {
      console.log('❌ Elementary Program at Main Campus not found');
      return;
    }

    console.log(`\n🎯 Assigning class to: ${elementaryProgramCampus.program.name} at ${elementaryProgramCampus.campus.name}`);

    // Update the class
    const updatedClass = await prisma.class.update({
      where: { id: enrollment.class.id },
      data: {
        programCampusId: elementaryProgramCampus.id
      }
    });

    console.log('✅ Class updated successfully!');
    console.log(`📚 Class: ${updatedClass.name}`);
    console.log(`🏫 New Program Campus ID: ${updatedClass.programCampusId}`);

    // Verify the change
    const verifyEnrollment = await prisma.studentEnrollment.findUnique({
      where: { id: 'cmcd6fjgt00guvl4rhragm2lg' },
      include: {
        class: {
          include: {
            programCampus: {
              include: {
                program: { select: { name: true } },
                campus: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    console.log('\n✅ Verification:');
    console.log(`📚 Class: ${verifyEnrollment.class?.name}`);
    console.log(`🏫 Program Campus: ${verifyEnrollment.class?.programCampus?.program.name} at ${verifyEnrollment.class?.programCampus?.campus.name}`);
    console.log(`🆔 Program Campus ID: ${verifyEnrollment.class?.programCampusId}`);

    // Check how many fee structures are available for this program campus
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        programCampusId: elementaryProgramCampus.id,
        status: 'ACTIVE'
      }
    });

    console.log(`💰 Available Fee Structures: ${feeStructures.length}`);
    feeStructures.forEach(fs => {
      console.log(`  - ${fs.name}`);
    });

  } catch (error) {
    console.error('❌ Error fixing class program campus:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClassProgramCampus();
