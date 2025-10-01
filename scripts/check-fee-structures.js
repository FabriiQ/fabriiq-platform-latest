const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFeeStructures() {
  try {
    console.log('🔍 Checking fee structures and program campuses...');

    // Get all fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      include: {
        programCampus: {
          include: {
            program: { select: { name: true } },
            campus: { select: { name: true } }
          }
        }
      }
    });

    console.log(`\n📊 Found ${feeStructures.length} fee structures:`);
    feeStructures.forEach(fs => {
      console.log(`  - ${fs.name}`);
      console.log(`    ID: ${fs.id}`);
      console.log(`    Program Campus: ${fs.programCampus.program.name} at ${fs.programCampus.campus.name}`);
      console.log(`    Program Campus ID: ${fs.programCampusId}`);
      console.log(`    Status: ${fs.status}`);
      console.log('');
    });

    // Get all program campuses
    const programCampuses = await prisma.programCampus.findMany({
      include: {
        program: { select: { name: true } },
        campus: { select: { name: true } },
        classes: { select: { id: true, name: true } }
      }
    });

    console.log(`\n🏫 Found ${programCampuses.length} program campuses:`);
    programCampuses.forEach(pc => {
      console.log(`  - ${pc.program.name} at ${pc.campus.name}`);
      console.log(`    ID: ${pc.id}`);
      console.log(`    Classes: ${pc.classes.length}`);
      if (pc.classes.length > 0) {
        pc.classes.forEach(cls => {
          console.log(`      - ${cls.name} (${cls.id})`);
        });
      }
      console.log('');
    });

    // Check specific enrollment
    const enrollment = await prisma.studentEnrollment.findUnique({
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
        },
        student: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    if (enrollment) {
      console.log(`\n👤 Enrollment Details:`);
      console.log(`  Student: ${enrollment.student.user?.name}`);
      console.log(`  Class: ${enrollment.class?.name}`);
      console.log(`  Program Campus: ${enrollment.class?.programCampus?.program.name} at ${enrollment.class?.programCampus?.campus.name}`);
      console.log(`  Program Campus ID: ${enrollment.class?.programCampusId}`);

      // Check if there are fee structures for this program campus
      const matchingFeeStructures = feeStructures.filter(fs => fs.programCampusId === enrollment.class?.programCampusId);
      console.log(`  Matching Fee Structures: ${matchingFeeStructures.length}`);
      matchingFeeStructures.forEach(fs => {
        console.log(`    - ${fs.name} (${fs.id})`);
      });
    } else {
      console.log('\n❌ Enrollment not found');
    }

  } catch (error) {
    console.error('❌ Error checking fee structures:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeeStructures();
