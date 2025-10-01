import { PrismaClient, SystemStatus, PaymentMethod } from '@prisma/client';

/**
 * Comprehensive fee management seeding with historical payment data
 */

export async function seedComprehensiveFees(prisma: PrismaClient) {
  console.log('💰 Starting comprehensive fee management seeding...');

  try {
    // Get all active enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: true,
        class: {
          include: {
            courseCampus: {
              include: {
                campus: true,
                course: true
              }
            }
          }
        },

      }
    });

    // Get admin user for fee operations
    const adminUser = await prisma.user.findFirst({
      where: { userType: 'ADMINISTRATOR' }
    });

    if (!adminUser) {
      console.warn('No admin user found for fee management');
      return;
    }

    console.log(`Found ${enrollments.length} enrollments for fee processing`);

    // Create fee structures for different programs and campuses
    await createFeeStructures(prisma, enrollments, adminUser.id);

    // Create fee records for each enrollment
    let feeRecordCount = 0;
    let paymentCount = 0;

    for (const enrollment of enrollments) {
      try {
        // Create annual fee record
        const annualFee = await createAnnualFeeRecord(prisma, enrollment, adminUser.id);
        if (annualFee) {
          feeRecordCount++;
          
          // Create payment history for this fee
          const payments = await createPaymentHistory(prisma, annualFee, enrollment, adminUser.id);
          paymentCount += payments;
        }

        // Create monthly fee records
        const monthlyFees = await createMonthlyFeeRecords(prisma, enrollment, adminUser.id);
        feeRecordCount += monthlyFees.length;

        // Create payments for monthly fees
        for (const monthlyFee of monthlyFees) {
          const payments = await createPaymentHistory(prisma, monthlyFee, enrollment, adminUser.id);
          paymentCount += payments;
        }

      } catch (error) {
        console.error(`Error creating fees for enrollment ${enrollment.id}:`, error);
      }
    }

    console.log(`✅ Created ${feeRecordCount} fee records with ${paymentCount} payments`);

    // Generate fee analytics
    await generateFeeAnalytics(prisma, enrollments);

    // Create additional enrollment fee assignments for testing
    await createAdditionalEnrollmentFees(prisma, enrollments, adminUser.id);

  } catch (error) {
    console.error('Error in comprehensive fee seeding:', error);
    throw error;
  }
}

async function createFeeStructures(prisma: PrismaClient, enrollments: any[], adminUserId: string) {
  console.log('Creating fee structures...');

  // Get unique program-campus combinations
  const programCampusCombinations = new Set();
  enrollments.forEach(enrollment => {
    const key = `${enrollment.class.courseCampus.course.id}-${enrollment.class.courseCampus.campus.id}`;
    programCampusCombinations.add(key);
  });

  for (const enrollment of enrollments) {
    const course = enrollment.class.courseCampus.course;
    const campus = enrollment.class.courseCampus.campus;
    
    try {
      // Create annual fee structure
      await prisma.feeStructure.upsert({
        where: {
          id: `annual-${enrollment.class.courseCampus.programCampusId}`
        },
        update: {},
        create: {
          id: `annual-${enrollment.class.courseCampus.programCampusId}`,
          name: `Annual Fee - ${course.name} at ${campus.name}`,
          description: `Annual fee for ${course.name} at ${campus.name}`,
          programCampusId: enrollment.class.courseCampus.programCampusId,
          feeComponents: {
            tuition: generateAnnualFeeAmount(course.name, campus.name),
            registration: 5000,
            activities: 3000
          },
          isRecurring: false,
          status: 'ACTIVE',
          createdById: adminUserId,
          updatedById: adminUserId
        }
      });

      // Create monthly fee structure
      await prisma.feeStructure.upsert({
        where: {
          id: `monthly-${enrollment.class.courseCampus.programCampusId}`
        },
        update: {},
        create: {
          id: `monthly-${enrollment.class.courseCampus.programCampusId}`,
          name: `Monthly Fee - ${course.name} at ${campus.name}`,
          description: `Monthly fee for ${course.name} at ${campus.name}`,
          programCampusId: enrollment.class.courseCampus.programCampusId,
          feeComponents: {
            tuition: generateMonthlyFeeAmount(course.name, campus.name),
            transport: 2000,
            meals: 1500
          },
          isRecurring: true,
          recurringInterval: 'MONTHLY',
          status: 'ACTIVE',
          createdById: adminUserId,
          updatedById: adminUserId
        }
      });

    } catch (error) {
      console.log('Fee structure creation skipped (may already exist)');
    }
  }
}

async function createAnnualFeeRecord(prisma: PrismaClient, enrollment: any, adminUserId: string) {
  try {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        id: `annual-${enrollment.class.courseCampus.programCampusId}`
      }
    });

    if (!feeStructure) return null;

    const baseAmount = (feeStructure.feeComponents as any).tuition +
                      (feeStructure.feeComponents as any).registration +
                      (feeStructure.feeComponents as any).activities;

    const discountAmount = Math.random() > 0.7 ? baseAmount * 0.1 : 0; // 30% chance of 10% discount
    const finalAmount = baseAmount - discountAmount;

    const feeRecord = await prisma.enrollmentFee.create({
      data: {
        enrollmentId: enrollment.id,
        feeStructureId: feeStructure.id,
        baseAmount: baseAmount,
        discountedAmount: discountAmount,
        finalAmount: finalAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentStatus: Math.random() > 0.3 ? 'PAID' : Math.random() > 0.5 ? 'PARTIAL' : 'PENDING',
        createdById: adminUserId,
        updatedById: adminUserId
      }
    });

    return feeRecord;
  } catch (error) {
    console.log('Annual fee record creation failed');
    return null;
  }
}

async function createMonthlyFeeRecords(prisma: PrismaClient, enrollment: any, adminUserId: string) {
  const feeRecords: any[] = [];
  
  try {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        id: `monthly-${enrollment.class.courseCampus.programCampusId}`
      }
    });

    if (!feeStructure) return [];

    // Create fee records for the last 6 months
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() - monthOffset);
      dueDate.setDate(5); // 5th of each month

      const baseAmount = (feeStructure.feeComponents as any).tuition +
                        (feeStructure.feeComponents as any).transport +
                        (feeStructure.feeComponents as any).meals;

      const discountAmount = Math.random() > 0.8 ? baseAmount * 0.05 : 0; // 20% chance of 5% discount
      const finalAmount = baseAmount - discountAmount;

      const feeRecord = await prisma.enrollmentFee.create({
        data: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id,
          baseAmount: baseAmount,
          discountedAmount: discountAmount,
          finalAmount: finalAmount,
          dueDate: dueDate,
          paymentStatus: monthOffset > 1 ? 'PAID' : Math.random() > 0.2 ? 'PAID' : 'PENDING', // Recent months more likely to be pending
          createdById: adminUserId,
          updatedById: adminUserId
        }
      });

      feeRecords.push(feeRecord);
    }
  } catch (error) {
    console.log('Monthly fee records creation failed');
  }

  return feeRecords;
}

async function createPaymentHistory(prisma: PrismaClient, feeRecord: any, enrollment: any, adminUserId: string) {
  let paymentCount = 0;

  try {
    if (feeRecord.paymentStatus === 'PAID') {
      // Create full payment transaction
      await prisma.feeTransaction.create({
        data: {
          enrollmentFeeId: feeRecord.id,
          amount: feeRecord.finalAmount,
          date: new Date(feeRecord.dueDate!.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000), // Paid within 10 days of due date
          method: getRandomPaymentMethod(),
          reference: generateTransactionId(),
          status: SystemStatus.ACTIVE,
          notes: 'Fee payment received',
          createdById: adminUserId
        }
      });
      paymentCount = 1;
    } else if (feeRecord.paymentStatus === 'PARTIAL') {
      // Create partial payment transaction
      const partialAmount = Math.floor(feeRecord.finalAmount * (0.3 + Math.random() * 0.4)); // 30-70% of total

      await prisma.feeTransaction.create({
        data: {
          enrollmentFeeId: feeRecord.id,
          amount: partialAmount,
          date: new Date(feeRecord.dueDate!.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          method: getRandomPaymentMethod(),
          reference: generateTransactionId(),
          status: SystemStatus.ACTIVE,
          notes: 'Partial fee payment',
          createdById: adminUserId
        }
      });
      paymentCount = 1;
    }
  } catch (error) {
    console.log('Payment transaction creation failed');
  }

  return paymentCount;
}

function generateAnnualFeeAmount(courseName: string, campusName: string): number {
  const baseFee = 50000; // PKR 50,000 base
  const courseMultiplier = courseName.includes('Primary') ? 1 : 1.2;
  const campusMultiplier = campusName.includes('Boys') || campusName.includes('Girls') ? 1 : 1.1;
  
  return Math.floor(baseFee * courseMultiplier * campusMultiplier);
}

function generateMonthlyFeeAmount(courseName: string, campusName: string): number {
  const baseFee = 8000; // PKR 8,000 base
  const courseMultiplier = courseName.includes('Primary') ? 1 : 1.2;
  const campusMultiplier = campusName.includes('Boys') || campusName.includes('Girls') ? 1 : 1.1;
  
  return Math.floor(baseFee * courseMultiplier * campusMultiplier);
}

function getRandomPaymentMethod(): PaymentMethod {
  const methods = [
    PaymentMethod.CASH,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.JAZZ_CASH,
    PaymentMethod.EASY_PAISA,
    PaymentMethod.ON_CAMPUS_COUNTER,
    PaymentMethod.CREDIT_CARD
  ];
  return methods[Math.floor(Math.random() * methods.length)];
}

function generateTransactionId(): string {
  return 'TXN' + Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

async function generateFeeAnalytics(prisma: PrismaClient, enrollments: any[]) {
  console.log('📊 Generating fee analytics...');

  try {
    // Calculate fee collection statistics
    const feeRecords = await prisma.enrollmentFee.findMany({
      include: {
        transactions: true
      }
    });

    const totalFees = feeRecords.reduce((sum, fee) => sum + fee.finalAmount, 0);
    const totalCollected = feeRecords.reduce((sum, fee) => {
      const paidAmount = fee.transactions.reduce((pSum, transaction) => pSum + transaction.amount, 0);
      return sum + paidAmount;
    }, 0);

    const collectionRate = totalFees > 0 ? (totalCollected / totalFees) * 100 : 0;
    const pendingAmount = totalFees - totalCollected;

    console.log(`Fee Analytics: Total: ${totalFees}, Collected: ${totalCollected}, Rate: ${collectionRate.toFixed(2)}%`);
  } catch (error) {
    console.log('Fee analytics generation skipped');
  }
}

/**
 * Create additional enrollment fee assignments for testing the assign fee dialog
 */
async function createAdditionalEnrollmentFees(prisma: PrismaClient, enrollments: any[], adminUserId: string) {
  console.log('Creating additional enrollment fee assignments...');

  let assignmentCount = 0;
  let transactionCount = 0;

  for (const enrollment of enrollments.slice(0, 10)) { // Process first 10 enrollments
    try {
      // Get available fee structures for this enrollment's program campus
      const programCampusId = enrollment.class.courseCampus.programCampusId;

      const feeStructures = await prisma.feeStructure.findMany({
        where: {
          programCampusId,
          status: 'ACTIVE'
        }
      });

      // Assign 1-2 fee structures to each enrollment
      const structuresToAssign = feeStructures.slice(0, Math.floor(Math.random() * 2) + 1);

      for (const feeStructure of structuresToAssign) {
        // Check if already assigned
        const existingFee = await prisma.enrollmentFee.findFirst({
          where: {
            enrollmentId: enrollment.id,
            feeStructureId: feeStructure.id
          }
        });

        if (existingFee) continue;

        // Calculate fee amount from components
        const components = feeStructure.feeComponents as any;
        const componentValues = Object.values(components || {}) as number[];
        const calculatedBaseAmount: number = componentValues.reduce((sum: number, amount: number) => sum + (Number(amount) || 0), 0);
        const isPaid = Math.random() > 0.3;

        // Create enrollment fee
        const enrollmentFee = await prisma.enrollmentFee.create({
          data: {
            enrollmentId: enrollment.id,
            feeStructureId: feeStructure.id,
            baseAmount: calculatedBaseAmount,
            discountedAmount: 0, // No discount for now
            finalAmount: calculatedBaseAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            paymentStatus: isPaid ? 'PAID' : 'PENDING',
            paymentMethod: getRandomPaymentMethod().toString(),
            notes: `Assigned fee structure: ${feeStructure.name}`,
            createdById: adminUserId,
            updatedById: adminUserId
          }
        });

        assignmentCount++;

        // Create payment transactions for paid fees
        if (isPaid) {
          const paymentAmount = calculatedBaseAmount * (0.8 + Math.random() * 0.2); // 80-100% payment

          await prisma.feeTransaction.create({
            data: {
              enrollmentFeeId: enrollmentFee.id,
              amount: paymentAmount,
              date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
              method: getRandomPaymentMethod(),
              reference: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              notes: `Payment for ${feeStructure.name}`,
              status: 'ACTIVE',
              createdById: adminUserId
            }
          });

          transactionCount++;
        }
      }
    } catch (error) {
      console.error(`Error creating additional fees for enrollment ${enrollment.id}:`, error);
    }
  }

  console.log(`✅ Created ${assignmentCount} additional enrollment fee assignments with ${transactionCount} transactions`);
}


