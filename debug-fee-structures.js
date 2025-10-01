const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugFeeStructures() {
  try {
    console.log('🔍 Debugging Fee Structure Assignment Issue');
    console.log('=' .repeat(50));
    
    const enrollmentId = 'cmet1bl2x0ktbqfis2aa71bfu';
    
    // 1. Get enrollment details
    console.log('\n1. Fetching enrollment details...');
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true,
              },
            },
            courseCampus: {
              include: {
                course: true,
                campus: true,
                programCampus: {
                  include: {
                    program: true,
                    campus: true,
                  },
                },
              },
            },
          },
        },
        fees: {
          include: {
            feeStructure: true
          }
        }
      },
    });

    if (!enrollment) {
      console.log('❌ Enrollment not found!');
      return;
    }

    console.log('✅ Enrollment found:');
    console.log('  - ID:', enrollment.id);
    console.log('  - Student ID:', enrollment.studentId);
    console.log('  - Class ID:', enrollment.classId);
    console.log('  - Class Name:', enrollment.class?.name);
    console.log('  - Direct Program Campus ID:', enrollment.class?.programCampusId);
    console.log('  - Course Campus Program Campus ID:', enrollment.class?.courseCampus?.programCampusId);
    console.log('  - Existing Fees Count:', enrollment.fees?.length || 0);

    // 2. Determine program campus ID
    const programCampusId = enrollment.class?.programCampusId || enrollment.class?.courseCampus?.programCampusId;
    const programCampus = enrollment.class?.programCampus || enrollment.class?.courseCampus?.programCampus;

    console.log('\n2. Program Campus Details:');
    console.log('  - Program Campus ID:', programCampusId);
    console.log('  - Program Name:', programCampus?.program?.name);
    console.log('  - Campus Name:', programCampus?.campus?.name);

    if (!programCampusId) {
      console.log('❌ No program campus ID found!');
      return;
    }

    // 3. Get all fee structures for this program campus
    console.log('\n3. Fetching all fee structures for program campus...');
    const allFeeStructures = await prisma.feeStructure.findMany({
      where: {
        programCampusId: programCampusId,
      },
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('✅ All fee structures found:', allFeeStructures.length);
    allFeeStructures.forEach((fs, index) => {
      console.log(`  ${index + 1}. ${fs.name}`);
      console.log(`     - ID: ${fs.id}`);
      console.log(`     - Status: ${fs.status}`);
      console.log(`     - Components: ${JSON.stringify(fs.feeComponents)}`);
      console.log(`     - Created: ${fs.createdAt}`);
    });

    // 4. Get active fee structures only
    console.log('\n4. Fetching ACTIVE fee structures only...');
    const activeFeeStructures = await prisma.feeStructure.findMany({
      where: {
        programCampusId: programCampusId,
        status: 'ACTIVE',
      },
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('✅ Active fee structures found:', activeFeeStructures.length);
    activeFeeStructures.forEach((fs, index) => {
      console.log(`  ${index + 1}. ${fs.name}`);
      console.log(`     - ID: ${fs.id}`);
      console.log(`     - Status: ${fs.status}`);
    });

    // 5. Get assigned fee structure IDs
    const assignedFeeStructureIds = enrollment.fees?.map(fee => fee.feeStructureId) || [];
    console.log('\n5. Already assigned fee structure IDs:', assignedFeeStructureIds);

    // 6. Get available fee structures (excluding assigned ones)
    console.log('\n6. Fetching available fee structures (excluding assigned)...');
    const whereClause = {
      status: 'ACTIVE',
      programCampusId: programCampusId,
    };

    if (assignedFeeStructureIds.length > 0) {
      whereClause.id = {
        notIn: assignedFeeStructureIds
      };
    }

    console.log('   Where clause:', JSON.stringify(whereClause, null, 2));

    const availableFeeStructures = await prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('✅ Available fee structures found:', availableFeeStructures.length);
    availableFeeStructures.forEach((fs, index) => {
      console.log(`  ${index + 1}. ${fs.name}`);
      console.log(`     - ID: ${fs.id}`);
      console.log(`     - Status: ${fs.status}`);
    });

    // 7. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`  - Enrollment ID: ${enrollmentId}`);
    console.log(`  - Program Campus ID: ${programCampusId}`);
    console.log(`  - Total Fee Structures: ${allFeeStructures.length}`);
    console.log(`  - Active Fee Structures: ${activeFeeStructures.length}`);
    console.log(`  - Assigned Fee Structures: ${assignedFeeStructureIds.length}`);
    console.log(`  - Available Fee Structures: ${availableFeeStructures.length}`);

    if (availableFeeStructures.length === 0 && activeFeeStructures.length > 0) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('   All active fee structures are already assigned to this enrollment.');
    } else if (activeFeeStructures.length === 0) {
      console.log('\n⚠️  ISSUE IDENTIFIED:');
      console.log('   No active fee structures found for this program campus.');
      console.log('   Check if fee structures exist and have status = "ACTIVE"');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFeeStructures();
