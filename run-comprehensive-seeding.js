const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import seeding functions
async function seedTopicMastery() {
  console.log('🧠 Starting TopicMastery seeding...');

  try {
    // Get all student profiles (which have the userId that TopicMastery references)
    const studentProfiles = await prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            userType: true
          }
        }
      }
    });

    console.log(`Found ${studentProfiles.length} student profiles`);

    // Get all subject topics
    const subjectTopics = await prisma.subjectTopic.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        subjectId: true,
        subject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${subjectTopics.length} subject topics`);

    if (studentProfiles.length === 0 || subjectTopics.length === 0) {
      console.log('⚠️ No student profiles or topics found. Skipping TopicMastery seeding.');
      return;
    }

    // Check existing TopicMastery records to avoid duplicates
    const existingMasteries = await prisma.topicMastery.findMany({
      select: {
        studentId: true,
        topicId: true
      }
    });

    const existingKeys = new Set(
      existingMasteries.map(m => `${m.studentId}-${m.topicId}`)
    );

    console.log(`Found ${existingMasteries.length} existing TopicMastery records`);

    // Create TopicMastery records for each student-topic combination
    const masteryRecords = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const studentProfile of studentProfiles) {
      for (const topic of subjectTopics) {
        const key = `${studentProfile.userId}-${topic.id}`;
        
        if (existingKeys.has(key)) {
          skippedCount++;
          continue;
        }

        // Generate initial mastery levels (random values between 0-40 to simulate beginner level)
        const rememberLevel = Math.random() * 40;
        const understandLevel = Math.random() * 35;
        const applyLevel = Math.random() * 30;
        const analyzeLevel = Math.random() * 25;
        const evaluateLevel = Math.random() * 20;
        const createLevel = Math.random() * 15;
        
        // Calculate overall mastery as weighted average
        const overallMastery = (
          rememberLevel * 0.15 +
          understandLevel * 0.20 +
          applyLevel * 0.25 +
          analyzeLevel * 0.20 +
          evaluateLevel * 0.15 +
          createLevel * 0.05
        );

        masteryRecords.push({
          studentId: studentProfile.userId, // Use userId from StudentProfile
          topicId: topic.id,
          subjectId: topic.subjectId,
          rememberLevel: Math.round(rememberLevel * 100) / 100,
          understandLevel: Math.round(understandLevel * 100) / 100,
          applyLevel: Math.round(applyLevel * 100) / 100,
          analyzeLevel: Math.round(analyzeLevel * 100) / 100,
          evaluateLevel: Math.round(evaluateLevel * 100) / 100,
          createLevel: Math.round(createLevel * 100) / 100,
          overallMastery: Math.round(overallMastery * 100) / 100,
          lastAssessmentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        });

        createdCount++;

        // Batch insert every 1000 records to avoid memory issues
        if (masteryRecords.length >= 1000) {
          await prisma.topicMastery.createMany({
            data: masteryRecords,
            skipDuplicates: true
          });
          console.log(`📝 Created ${masteryRecords.length} TopicMastery records (batch)`);
          masteryRecords.length = 0; // Clear array
        }
      }
    }

    // Insert remaining records
    if (masteryRecords.length > 0) {
      await prisma.topicMastery.createMany({
        data: masteryRecords,
        skipDuplicates: true
      });
      console.log(`📝 Created ${masteryRecords.length} TopicMastery records (final batch)`);
    }

    console.log(`✅ TopicMastery seeding completed:`);
    console.log(`   - Created: ${createdCount} new records`);
    console.log(`   - Skipped: ${skippedCount} existing records`);
    console.log(`   - Total student profiles: ${studentProfiles.length}`);
    console.log(`   - Total topics: ${subjectTopics.length}`);

  } catch (error) {
    console.error('❌ Error seeding TopicMastery:', error);
    throw error;
  }
}

async function seedFeeManagement() {
  console.log('💰 Starting fee management seeding...');

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
          status: 'ACTIVE',
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
        status: 'ACTIVE'
      }
    });

    console.log(`Found ${academicCycles.length} academic cycles`);

    // Create fee structures for each program campus
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

      // Create fee structure
      const feeStructure = await prisma.feeStructure.create({
        data: {
          name: `${programCampus.program.name} - ${programCampus.campus.name} Fee Structure`,
          description: `Standard fee structure for ${programCampus.program.name} at ${programCampus.campus.name}`,
          programCampusId: programCampus.id,
          academicCycleId: academicCycle?.id,
          feeComponents: [
            { name: 'Tuition Fee', type: 'TUITION', amount: 8000, description: 'Monthly tuition fee' },
            { name: 'Registration Fee', type: 'REGISTRATION', amount: 2000, description: 'One-time registration fee' },
            { name: 'Library Fee', type: 'LIBRARY', amount: 300, description: 'Library access fee' },
            { name: 'Lab Fee', type: 'LABORATORY', amount: 500, description: 'Laboratory usage fee' },
            { name: 'Sports Fee', type: 'SPORTS', amount: 200, description: 'Sports facilities fee' },
            { name: 'Transport Fee', type: 'TRANSPORT', amount: 1500, description: 'Transportation fee' }
          ],
          isRecurring: true,
          recurringInterval: 'MONTHLY',
          status: 'ACTIVE',
          createdById: systemAdmin.id
        }
      });

      feeStructures.push(feeStructure);
    }

    console.log(`✅ Created ${feeStructures.length} fee structures`);

    // Get student enrollments and assign fees
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
      take: 100 // Limit to first 100 for testing
    });

    console.log(`Found ${studentEnrollments.length} student enrollments (limited to 100 for testing)`);

    let createdFees = 0;
    for (const enrollment of studentEnrollments) {
      // Find appropriate fee structure
      const feeStructure = feeStructures.find(fs => 
        fs.programCampusId === enrollment.class.programCampusId
      );

      if (!feeStructure) continue;

      // Check if enrollment fee already exists
      const existingEnrollmentFee = await prisma.enrollmentFee.findFirst({
        where: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id
        }
      });

      if (existingEnrollmentFee) continue;

      // Calculate total amount
      const feeComponents = feeStructure.feeComponents;
      const totalAmount = feeComponents.reduce((sum, component) => sum + component.amount, 0);

      // Create enrollment fee
      await prisma.enrollmentFee.create({
        data: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id,
          baseAmount: totalAmount,
          totalAmount: totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          paymentStatus: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'ACTIVE',
          createdById: systemAdmin.id
        }
      });

      createdFees++;
    }

    console.log(`✅ Fee management seeding completed: Created ${createdFees} enrollment fees`);

  } catch (error) {
    console.error('❌ Error seeding fee management:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive seeding...');
  
  try {
    // Run TopicMastery seeding
    await seedTopicMastery();
    
    // Run fee management seeding
    await seedFeeManagement();
    
    console.log('🎉 Comprehensive seeding completed successfully!');
    
    // Final verification
    const topicMasteryCount = await prisma.topicMastery.count();
    const feeStructureCount = await prisma.feeStructure.count();
    const enrollmentFeeCount = await prisma.enrollmentFee.count();
    
    console.log('\n📊 Final counts:');
    console.log(`   - TopicMastery records: ${topicMasteryCount}`);
    console.log(`   - Fee structures: ${feeStructureCount}`);
    console.log(`   - Enrollment fees: ${enrollmentFeeCount}`);
    
  } catch (error) {
    console.error('❌ Error in comprehensive seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
