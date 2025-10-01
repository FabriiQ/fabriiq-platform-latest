const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedFeeManagementQuick() {
  console.log('💰 Starting quick fee management seeding...');

  try {
    // Get system admin user
    let systemAdmin = await prisma.user.findFirst({
      where: {
        userType: 'SYSTEM_ADMIN'
      }
    });

    if (!systemAdmin) {
      systemAdmin = await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: `system.admin.${Date.now()}@system.local`,
          username: `system_admin_${Date.now()}`,
          userType: 'SYSTEM_ADMIN',
          accessScope: 'SYSTEM',
          status: 'ACTIVE',
          password: '$2a$12$K8GpYeWkVQB.UY3QJnwGEuV0yCXDv.d/cTFp.LBKZGW0MYwY9ZYhq',
        },
      });
      console.log('Created system admin user');
    }

    // Get program campuses
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
        status: 'ACTIVE'
      }
    });

    // Create fee structures
    const feeStructures = [];
    for (const programCampus of programCampuses) {
      const academicCycle = academicCycles[0];

      const existingFeeStructure = await prisma.feeStructure.findFirst({
        where: {
          programCampusId: programCampus.id
        }
      });

      if (existingFeeStructure) {
        feeStructures.push(existingFeeStructure);
        continue;
      }

      const feeStructure = await prisma.feeStructure.create({
        data: {
          name: `${programCampus.program.name} - ${programCampus.campus.name} Fee Structure`,
          description: `Standard fee structure for ${programCampus.program.name}`,
          programCampusId: programCampus.id,
          academicCycleId: academicCycle?.id,
          feeComponents: [
            { name: 'Tuition Fee', type: 'TUITION', amount: 8000, description: 'Monthly tuition fee' },
            { name: 'Registration Fee', type: 'REGISTRATION', amount: 2000, description: 'Registration fee' },
            { name: 'Library Fee', type: 'LIBRARY', amount: 300, description: 'Library access fee' },
            { name: 'Lab Fee', type: 'LABORATORY', amount: 500, description: 'Laboratory usage fee' }
          ],
          isRecurring: true,
          recurringInterval: 'MONTHLY',
          status: 'ACTIVE',
          createdById: systemAdmin.id
        }
      });

      feeStructures.push(feeStructure);
    }

    console.log(`✅ Created/found ${feeStructures.length} fee structures`);

    // Get sample student enrollments (limit to 50 for quick testing)
    const studentEnrollments = await prisma.studentEnrollment.findMany({
      where: {
        status: 'ACTIVE'
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
      },
      take: 50
    });

    console.log(`Found ${studentEnrollments.length} student enrollments (limited to 50)`);

    // Assign fees to enrollments
    let createdFees = 0;
    for (const enrollment of studentEnrollments) {
      const feeStructure = feeStructures.find(fs => 
        fs.programCampusId === enrollment.class.programCampusId
      );

      if (!feeStructure) continue;

      const existingEnrollmentFee = await prisma.enrollmentFee.findFirst({
        where: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id
        }
      });

      if (existingEnrollmentFee) continue;

      const feeComponents = feeStructure.feeComponents;
      const totalAmount = feeComponents.reduce((sum, component) => sum + component.amount, 0);

      await prisma.enrollmentFee.create({
        data: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id,
          baseAmount: totalAmount,
          totalAmount: totalAmount,
          discountedAmount: 0,
          paidAmount: 0,
          balanceAmount: totalAmount,
          paymentStatus: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          createdById: systemAdmin.id
        }
      });

      // Create challan
      await prisma.feeChallan.create({
        data: {
          enrollmentFeeId: enrollment.id,
          challanNo: `CH-${Date.now()}-${enrollment.id.substring(0, 8)}`,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalAmount: totalAmount,
          paidAmount: 0,
          paymentStatus: 'PENDING',
          challanData: {
            studentName: enrollment.student.user.name,
            className: enrollment.class.name,
            feeComponents: feeComponents,
            totalAmount: totalAmount
          },
          status: 'ACTIVE',
          createdById: systemAdmin.id
        }
      });

      createdFees++;
    }

    console.log(`✅ Fee management seeding completed: Created ${createdFees} enrollment fees`);

    // Final verification
    const feeStructureCount = await prisma.feeStructure.count();
    const enrollmentFeeCount = await prisma.enrollmentFee.count();
    const challanCount = await prisma.feeChallan.count();
    
    console.log('\n📊 Final fee management counts:');
    console.log(`   - Fee structures: ${feeStructureCount}`);
    console.log(`   - Enrollment fees: ${enrollmentFeeCount}`);
    console.log(`   - Fee challans: ${challanCount}`);

  } catch (error) {
    console.error('❌ Error in fee management seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedFeeManagementQuick();
