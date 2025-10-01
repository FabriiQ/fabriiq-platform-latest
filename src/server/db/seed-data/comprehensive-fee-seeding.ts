import { PrismaClient, SystemStatus, PaymentStatusType, PaymentMethod } from '@prisma/client';

/**
 * Comprehensive fee management seeding for enrolled students
 * Creates fee structures, assigns fees to enrollments, and generates challans
 */
export async function seedComprehensiveFeeManagement(prisma: PrismaClient) {
  console.log('💰 Starting comprehensive fee management seeding...');

  try {
    // Get system admin user for created/updated by fields
    let systemAdmin = await prisma.user.findFirst({
      where: {
        userType: 'SYSTEM_ADMIN'
      }
    });

    if (!systemAdmin) {
      // Create a system admin if none exists
      systemAdmin = await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: `system.admin.${Date.now()}@system.local`,
          username: `system_admin_${Date.now()}`,
          userType: 'SYSTEM_ADMIN',
          accessScope: 'SYSTEM',
          status: SystemStatus.ACTIVE,
          password: '$2a$12$K8GpYeWkVQB.UY3QJnwGEuV0yCXDv.d/cTFp.LBKZGW0MYwY9ZYhq', // hashed 'Password123!'
        },
      });
      console.log('Created system admin user for fee management');
    }

    // Get all program campuses
    const programCampuses = await prisma.programCampus.findMany({
      include: {
        program: true,
        campus: true
      }
    });

    console.log(`Found ${programCampuses.length} program campuses`);

    // Get academic cycles
    const academicCycles = await prisma.academicCycle.findMany({
      where: {
        status: SystemStatus.ACTIVE
      }
    });

    console.log(`Found ${academicCycles.length} academic cycles`);

    // Step 1: Create Fee Structures
    const feeStructures = await createFeeStructures(prisma, programCampuses, academicCycles, systemAdmin);
    console.log(`✅ Created ${feeStructures.length} fee structures`);

    // Step 2: Get all student enrollments that need fee assignments
    const studentEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        status: SystemStatus.ACTIVE
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: {
          include: {
            programCampus: true
          }
        }
      }
    });

    console.log(`Found ${studentEnrollments.length} student enrollments`);

    // Step 3: Assign fees to enrollments
    await assignFeesToEnrollments(prisma, studentEnrollments, feeStructures, systemAdmin);
    console.log('✅ Assigned fees to all enrollments');

    console.log('🎉 Comprehensive fee management seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error in comprehensive fee management seeding:', error);
    throw error;
  }
}

/**
 * Create fee structures for different program campuses
 */
async function createFeeStructures(
  prisma: PrismaClient,
  programCampuses: any[],
  academicCycles: any[],
  systemAdmin: any
) {
  const feeStructures = [];

  for (const programCampus of programCampuses) {
    const academicCycle = academicCycles[0]; // Use first available academic cycle

    // Check if fee structure already exists
    const existingFeeStructure = await prisma.feeStructure.findFirst({
      where: {
        programCampusId: programCampus.id,
        academicCycleId: academicCycle?.id
      }
    });

    if (existingFeeStructure) {
      feeStructures.push(existingFeeStructure);
      continue;
    }

    // Create fee structure based on program type
    const baseFee = getBaseFeeForProgram(programCampus.program.name);
    
    const feeStructure = await prisma.feeStructure.create({
      data: {
        name: `${programCampus.program.name} - ${programCampus.campus.name} Fee Structure`,
        description: `Standard fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
        programCampusId: programCampus.id,
        academicCycleId: academicCycle?.id,
        feeComponents: [
          { name: 'Tuition Fee', type: 'TUITION', amount: baseFee.tuition, description: 'Monthly tuition fee' },
          { name: 'Registration Fee', type: 'REGISTRATION', amount: baseFee.registration, description: 'One-time registration fee' },
          { name: 'Library Fee', type: 'LIBRARY', amount: baseFee.library, description: 'Library access fee' },
          { name: 'Lab Fee', type: 'LABORATORY', amount: baseFee.lab, description: 'Laboratory usage fee' },
          { name: 'Sports Fee', type: 'SPORTS', amount: baseFee.sports, description: 'Sports facilities fee' },
          { name: 'Transport Fee', type: 'TRANSPORT', amount: baseFee.transport, description: 'Transportation fee' }
        ],
        isRecurring: true,
        recurringInterval: 'MONTHLY',
        status: SystemStatus.ACTIVE,
        createdById: systemAdmin.id
      }
    });

    feeStructures.push(feeStructure);
  }

  return feeStructures;
}

/**
 * Get base fee amounts based on program type
 */
function getBaseFeeForProgram(programName: string) {
  const programType = programName.toLowerCase();
  
  if (programType.includes('primary') || programType.includes('pyp')) {
    return {
      tuition: 8000,
      registration: 2000,
      library: 300,
      lab: 500,
      sports: 200,
      transport: 1500
    };
  } else if (programType.includes('middle') || programType.includes('myp')) {
    return {
      tuition: 10000,
      registration: 2500,
      library: 400,
      lab: 800,
      sports: 300,
      transport: 1500
    };
  } else if (programType.includes('diploma') || programType.includes('dp')) {
    return {
      tuition: 15000,
      registration: 3000,
      library: 500,
      lab: 1200,
      sports: 400,
      transport: 1500
    };
  } else {
    // Default fees
    return {
      tuition: 9000,
      registration: 2200,
      library: 350,
      lab: 600,
      sports: 250,
      transport: 1500
    };
  }
}

/**
 * Assign fees to student enrollments
 */
async function assignFeesToEnrollments(
  prisma: PrismaClient,
  studentEnrollments: any[],
  feeStructures: any[],
  systemAdmin: any
) {
  let processedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  for (const enrollment of studentEnrollments) {
    try {
      // Find appropriate fee structure for this enrollment
      const feeStructure = feeStructures.find(fs => 
        fs.programCampusId === enrollment.class.programCampusId
      );

      if (!feeStructure) {
        console.log(`⚠️ No fee structure found for enrollment ${enrollment.id}`);
        skippedCount++;
        continue;
      }

      // Check if enrollment fee already exists
      const existingEnrollmentFee = await prisma.enrollmentFee.findFirst({
        where: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id
        }
      });

      if (existingEnrollmentFee) {
        skippedCount++;
        continue;
      }

      // Calculate total amount from fee components
      const feeComponents = feeStructure.feeComponents as any[];
      const totalAmount = feeComponents.reduce((sum, component) => sum + component.amount, 0);

      // Create enrollment fee
      const enrollmentFee = await prisma.enrollmentFee.create({
        data: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id,
          baseAmount: totalAmount,
          totalAmount: totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          paymentStatus: PaymentStatusType.PENDING,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: SystemStatus.ACTIVE,
          createdById: systemAdmin.id
        }
      });

      // Create a fee challan for this enrollment fee
      await prisma.feeChallan.create({
        data: {
          enrollmentFeeId: enrollmentFee.id,
          challanNo: `CH-${Date.now()}-${enrollment.id.substring(0, 8)}`,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalAmount: totalAmount,
          paidAmount: 0,
          paymentStatus: PaymentStatusType.PENDING,
          challanData: {
            studentName: enrollment.student.user.name,
            className: enrollment.class.name,
            feeComponents: feeComponents,
            totalAmount: totalAmount
          },
          status: SystemStatus.ACTIVE,
          createdById: systemAdmin.id
        }
      });

      createdCount++;
      processedCount++;

      // Log progress every 100 records
      if (processedCount % 100 === 0) {
        console.log(`📝 Processed ${processedCount}/${studentEnrollments.length} enrollments`);
      }

    } catch (error) {
      console.error(`❌ Error processing enrollment ${enrollment.id}:`, error);
      skippedCount++;
    }
  }

  console.log(`✅ Fee assignment completed:`);
  console.log(`   - Created: ${createdCount} enrollment fees`);
  console.log(`   - Skipped: ${skippedCount} enrollments`);
  console.log(`   - Total processed: ${processedCount}`);
}
