const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedFeeStructuresOnly() {
  try {
    console.log('🌱 Starting Fee Structures Seeding...');
    console.log('=' .repeat(50));

    // 1. Get the enrollment and its program campus
    const enrollmentId = 'cmet1bl2x0ktbqfis2aa71bfu';
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
          },
        },
      },
    });

    if (!enrollment) {
      console.log('❌ Enrollment not found!');
      return;
    }

    const programCampusId = enrollment.class.programCampusId;
    const programCampus = enrollment.class.programCampus;

    console.log('✅ Found enrollment:');
    console.log(`  - Program: ${programCampus.program.name}`);
    console.log(`  - Campus: ${programCampus.campus.name}`);
    console.log(`  - Program Campus ID: ${programCampusId}`);

    // 2. Get admin user for creating fee structures
    let adminUser = await prisma.user.findFirst({
      where: {
        userType: 'ADMINISTRATOR',
        status: 'ACTIVE'
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found!');
      return;
    }

    console.log(`✅ Using admin user: ${adminUser.name} (${adminUser.email})`);

    // 3. Get academic cycle
    const academicCycle = await prisma.academicCycle.findFirst({
      where: {
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Using academic cycle: ${academicCycle?.name || 'None'}`);

    // 4. Create fee structures for this program campus
    const feeStructuresData = [
      {
        name: `${programCampus.program.name} - Annual Fee Structure`,
        description: `Annual fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
        feeComponents: [
          { name: 'Tuition Fee', type: 'TUITION', amount: 50000, description: 'Annual tuition fee' },
          { name: 'Admission Fee', type: 'ADMISSION', amount: 5000, description: 'One-time admission fee' },
          { name: 'Library Fee', type: 'LIBRARY', amount: 2000, description: 'Library access fee' },
          { name: 'Laboratory Fee', type: 'LABORATORY', amount: 3000, description: 'Laboratory usage fee' },
          { name: 'Sports Fee', type: 'SPORTS', amount: 1500, description: 'Sports facilities fee' },
          { name: 'Examination Fee', type: 'EXAMINATION', amount: 2500, description: 'Examination fee' }
        ],
        isRecurring: false,
        status: 'ACTIVE',
      },
      {
        name: `${programCampus.program.name} - Monthly Fee Structure`,
        description: `Monthly fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
        feeComponents: [
          { name: 'Monthly Tuition', type: 'TUITION', amount: 4500, description: 'Monthly tuition fee' },
          { name: 'Transport Fee', type: 'TRANSPORT', amount: 1000, description: 'Monthly transport fee' },
          { name: 'Meal Fee', type: 'MEALS', amount: 800, description: 'Monthly meal fee' },
          { name: 'Activity Fee', type: 'ACTIVITIES', amount: 500, description: 'Monthly activity fee' }
        ],
        isRecurring: true,
        recurringInterval: 'MONTHLY',
        status: 'ACTIVE',
      },
      {
        name: `${programCampus.program.name} - Quarterly Fee Structure`,
        description: `Quarterly fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
        feeComponents: [
          { name: 'Quarterly Tuition', type: 'TUITION', amount: 13000, description: 'Quarterly tuition fee' },
          { name: 'Books & Materials', type: 'MATERIALS', amount: 1500, description: 'Books and materials fee' },
          { name: 'Field Trips', type: 'ACTIVITIES', amount: 1000, description: 'Field trips fee' }
        ],
        isRecurring: true,
        recurringInterval: 'QUARTERLY',
        status: 'ACTIVE',
      }
    ];

    console.log('\n🏗️  Creating fee structures...');

    const createdFeeStructures = [];

    for (const feeStructureData of feeStructuresData) {
      // Check if fee structure already exists
      const existing = await prisma.feeStructure.findFirst({
        where: {
          name: feeStructureData.name,
          programCampusId: programCampusId
        }
      });

      if (existing) {
        console.log(`⚠️  Fee structure "${feeStructureData.name}" already exists, skipping...`);
        createdFeeStructures.push(existing);
        continue;
      }

      const created = await prisma.feeStructure.create({
        data: {
          name: feeStructureData.name,
          description: feeStructureData.description,
          programCampusId: programCampusId,
          academicCycleId: academicCycle?.id,
          feeComponents: feeStructureData.feeComponents,
          isRecurring: feeStructureData.isRecurring,
          recurringInterval: feeStructureData.recurringInterval,
          status: feeStructureData.status,
          createdById: adminUser.id,
        },
      });

      console.log(`✅ Created fee structure: ${created.name}`);
      console.log(`   - ID: ${created.id}`);
      console.log(`   - Components: ${feeStructureData.feeComponents.length}`);
      console.log(`   - Total Amount: Rs. ${feeStructureData.feeComponents.reduce((sum, comp) => sum + comp.amount, 0).toLocaleString()}`);

      createdFeeStructures.push(created);
    }

    // 5. Create discount types if they don't exist
    console.log('\n💰 Creating discount types...');

    const discountTypesData = [
      {
        name: 'Early Payment Discount',
        description: 'Discount for fees paid before due date',
        discountValue: 5,
        isPercentage: true,
        maxAmount: 2500,
        applicableFor: ['EARLY_PAYMENT'],
        status: 'ACTIVE',
      },
      {
        name: 'Sibling Discount',
        description: 'Discount for families with multiple children',
        discountValue: 10,
        isPercentage: true,
        maxAmount: 5000,
        applicableFor: ['SIBLING'],
        status: 'ACTIVE',
      },
      {
        name: 'Merit Scholarship',
        description: 'Merit-based scholarship discount',
        discountValue: 15,
        isPercentage: true,
        maxAmount: 10000,
        applicableFor: ['MERIT'],
        status: 'ACTIVE',
      }
    ];

    for (const discountData of discountTypesData) {
      const existing = await prisma.discountType.findFirst({
        where: { name: discountData.name }
      });

      if (existing) {
        console.log(`⚠️  Discount type "${discountData.name}" already exists, skipping...`);
        continue;
      }

      const created = await prisma.discountType.create({
        data: {
          ...discountData,
          createdById: adminUser.id,
        },
      });

      console.log(`✅ Created discount type: ${created.name}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Fee Structures Seeding Completed!');
    console.log(`✅ Created ${createdFeeStructures.length} fee structures`);
    console.log(`✅ Program Campus: ${programCampus.program.name} at ${programCampus.campus.name}`);
    console.log('\n📋 Summary:');
    createdFeeStructures.forEach((fs, index) => {
      const components = fs.feeComponents as any[];
      const totalAmount = components.reduce((sum, comp) => sum + comp.amount, 0);
      console.log(`  ${index + 1}. ${fs.name}`);
      console.log(`     - Total: Rs. ${totalAmount.toLocaleString()}`);
      console.log(`     - Recurring: ${fs.isRecurring ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('❌ Error seeding fee structures:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedFeeStructuresOnly();
