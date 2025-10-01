const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedFeeManagementData() {
  try {
    console.log('🌱 Seeding fee management data...');

    // Get the system admin user
    const systemAdmin = await prisma.user.findFirst({
      where: { userType: 'SYSTEM_ADMIN' }
    });

    if (!systemAdmin) {
      console.error('❌ No system admin user found');
      return;
    }

    console.log('👤 Using system admin:', systemAdmin.name);

    // Get or create a default institution
    let institution = await prisma.institution.findFirst({
      where: { code: 'DEFAULT' }
    });

    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          code: 'DEFAULT',
          name: 'Default Institution',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Created default institution:', institution.name);
    } else {
      console.log('⏭️  Using existing institution:', institution.name);
    }

    // Create discount types
    const discountTypes = [
      {
        name: 'Sibling Discount',
        description: 'Discount for students with siblings in the institution',
        discountValue: 10,
        isPercentage: true,
        maxAmount: 5000,
        applicableFor: ['SIBLING']
      },
      {
        name: 'Merit Scholarship',
        description: 'Merit-based scholarship for high-achieving students',
        discountValue: 25,
        isPercentage: true,
        maxAmount: 15000,
        applicableFor: ['MERIT', 'SCHOLARSHIP']
      },
      {
        name: 'Staff Discount',
        description: 'Discount for staff members and their children',
        discountValue: 20,
        isPercentage: true,
        maxAmount: 10000,
        applicableFor: ['STAFF']
      },
      {
        name: 'Early Payment Discount',
        description: 'Discount for payments made before due date',
        discountValue: 5,
        isPercentage: true,
        maxAmount: 2000,
        applicableFor: ['EARLY_PAYMENT']
      },
      {
        name: 'Financial Aid',
        description: 'Need-based financial assistance',
        discountValue: 50,
        isPercentage: true,
        maxAmount: 25000,
        applicableFor: ['FINANCIAL_AID']
      }
    ];

    for (const discountType of discountTypes) {
      const existing = await prisma.discountType.findFirst({
        where: { name: discountType.name }
      });

      if (!existing) {
        const created = await prisma.discountType.create({
          data: {
            ...discountType,
            createdBy: {
              connect: { id: systemAdmin.id }
            }
          }
        });
        console.log('✅ Created discount type:', created.name);
      } else {
        console.log('⏭️  Discount type already exists:', discountType.name);
      }
    }

    // Create academic cycles
    const currentYear = new Date().getFullYear();
    const academicCycles = [
      {
        code: `AC${currentYear}`,
        name: `Academic Year ${currentYear}-${currentYear + 1}`,
        description: `Academic cycle for ${currentYear}-${currentYear + 1}`,
        type: 'ANNUAL',
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${currentYear + 1}-06-30`),
        institutionId: institution.id,
        createdBy: systemAdmin.id,
        status: 'ACTIVE'
      },
      {
        code: `AC${currentYear + 1}`,
        name: `Academic Year ${currentYear + 1}-${currentYear + 2}`,
        description: `Academic cycle for ${currentYear + 1}-${currentYear + 2}`,
        type: 'ANNUAL',
        startDate: new Date(`${currentYear + 1}-09-01`),
        endDate: new Date(`${currentYear + 2}-06-30`),
        institutionId: institution.id,
        createdBy: systemAdmin.id,
        status: 'ACTIVE'
      }
    ];

    for (const cycle of academicCycles) {
      const existing = await prisma.academicCycle.findFirst({
        where: { code: cycle.code, institutionId: cycle.institutionId }
      });

      if (!existing) {
        const created = await prisma.academicCycle.create({
          data: {
            ...cycle,
            duration: 10 // 10 months
          }
        });
        console.log('✅ Created academic cycle:', created.name);
      } else {
        console.log('⏭️  Academic cycle already exists:', cycle.code);
      }
    }

    // Note: Terms creation skipped as it requires courses and academic cycles to be properly linked

    // Create fee structures for existing program campuses
    const programCampuses = await prisma.programCampus.findMany({
      where: { status: 'ACTIVE' },
      include: {
        program: { select: { name: true } },
        campus: { select: { name: true } }
      }
    });

    console.log(`📚 Found ${programCampuses.length} program campuses`);

    // Get the first academic cycle we created
    const academicCycle = await prisma.academicCycle.findFirst({
      where: { institutionId: institution.id }
    });

    for (const programCampus of programCampuses) {
      const feeStructureName = `${programCampus.program.name} - ${programCampus.campus.name} Fee Structure`;

      const existing = await prisma.feeStructure.findFirst({
        where: {
          name: feeStructureName,
          programCampusId: programCampus.id
        }
      });

      if (!existing) {
        const created = await prisma.feeStructure.create({
          data: {
            name: feeStructureName,
            description: `Fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
            programCampusId: programCampus.id,
            academicCycleId: academicCycle?.id,
            feeComponents: [
              { name: 'Tuition Fee', type: 'TUITION', amount: 5000, description: 'Monthly tuition fee' },
              { name: 'Library Fee', type: 'LIBRARY', amount: 200, description: 'Library access fee' },
              { name: 'Lab Fee', type: 'LABORATORY', amount: 300, description: 'Laboratory usage fee' },
              { name: 'Sports Fee', type: 'SPORTS', amount: 150, description: 'Sports facilities fee' }
            ],
            isRecurring: true,
            recurringInterval: 'MONTHLY',
            status: 'ACTIVE',
            createdById: systemAdmin.id
          }
        });
        console.log('✅ Created fee structure:', created.name);
      } else {
        console.log('⏭️  Fee structure already exists:', feeStructureName);
      }
    }

    console.log('🎉 Fee management data seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding fee management data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedFeeManagementData();
