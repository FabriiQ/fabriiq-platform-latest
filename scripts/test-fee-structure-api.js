const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFeeStructureAPI() {
  try {
    console.log('Testing fee structure API...');
    
    // Get the enrollment
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: 'cmedy2g9v0007fmjzlz1pu8jg' },
      include: {
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true
              }
            }
          }
        },
        student: {
          include: {
            user: true
          }
        }
      }
    });
    
    if (!enrollment) {
      console.log('❌ Enrollment not found');
      return;
    }
    
    console.log('✅ Enrollment found:', {
      id: enrollment.id,
      student: enrollment.student.user.name,
      class: enrollment.class.name,
      programCampus: enrollment.class.programCampus ? {
        id: enrollment.class.programCampus.id,
        program: enrollment.class.programCampus.program.name,
        campus: enrollment.class.programCampus.campus.name
      } : null,
      programCampusId: enrollment.class.programCampusId
    });
    
    // Test the fee structure query
    const programCampusId = enrollment.class.programCampusId;
    if (!programCampusId) {
      console.log('❌ No programCampusId found');
      return;
    }
    
    console.log('\n🔍 Querying fee structures for programCampusId:', programCampusId);
    
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        programCampusId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log('✅ Fee structures found:', feeStructures.length);
    feeStructures.forEach((fs, index) => {
      console.log(`  ${index + 1}. ${fs.name} (ID: ${fs.id})`);
      console.log(`     Status: ${fs.status}`);
      console.log(`     Components: ${JSON.stringify(fs.feeComponents)}`);
      console.log(`     Created: ${fs.createdAt}`);
      console.log('');
    });
    
    // Check if there are any existing enrollment fees
    const existingFees = await prisma.enrollmentFee.findMany({
      where: { enrollmentId: enrollment.id },
      include: {
        feeStructure: true
      }
    });
    
    console.log('📋 Existing enrollment fees:', existingFees.length);
    existingFees.forEach((fee, index) => {
      console.log(`  ${index + 1}. ${fee.feeStructure.name} - ${fee.paymentStatus}`);
      console.log(`     Amount: Rs. ${fee.finalAmount}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing fee structure API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFeeStructureAPI();
