import { PrismaClient, LateFeeCalculationType, CompoundingInterval, SystemStatus } from '@prisma/client';

export const lateFeePoliciesSeedData = [
  {
    name: 'Standard Fixed Late Fee',
    description: 'Fixed $50 late fee after 7-day grace period',
    calculationType: LateFeeCalculationType.FIXED,
    amount: 50.00,
    maxAmount: 200.00,
    minAmount: 0,
    gracePeriodDays: 7,
    applyAfterDays: 1,
    compoundingEnabled: false,
    compoundingInterval: CompoundingInterval.DAILY,
    autoApply: true,
    applyOnWeekends: true,
    applyOnHolidays: true,
    applicableToFeeTypes: [],
    applicableToPrograms: [],
    applicableToClasses: [],
    isActive: true,
  },
  {
    name: 'Percentage Compounding Late Fee',
    description: '2% daily compounding late fee with 3-day grace period',
    calculationType: LateFeeCalculationType.DAILY_PERCENTAGE,
    amount: 2.0,
    maxAmount: 500.00,
    minAmount: 0,
    gracePeriodDays: 3,
    applyAfterDays: 1,
    compoundingEnabled: true,
    compoundingInterval: CompoundingInterval.DAILY,
    maxCompoundingPeriods: 30,
    autoApply: true,
    applyOnWeekends: true,
    applyOnHolidays: true,
    applicableToFeeTypes: [],
    applicableToPrograms: [],
    applicableToClasses: [],
    isActive: true,
  },
  {
    name: 'Tiered Fixed Late Fee',
    description: 'Tiered late fee: $25 (1-15 days), $50 (16-30 days), $100 (31+ days)',
    calculationType: LateFeeCalculationType.TIERED_FIXED,
    amount: 0,
    maxAmount: 1000.00,
    minAmount: 0,
    gracePeriodDays: 5,
    applyAfterDays: 1,
    compoundingEnabled: false,
    compoundingInterval: CompoundingInterval.DAILY,
    tieredRules: [
      { daysFrom: 1, daysTo: 15, amount: 25 },
      { daysFrom: 16, daysTo: 30, amount: 50 },
      { daysFrom: 31, daysTo: 999, amount: 100 }
    ],
    autoApply: true,
    applyOnWeekends: true,
    applyOnHolidays: true,
    applicableToFeeTypes: [],
    applicableToPrograms: [],
    applicableToClasses: [],
    isActive: true,
  },
  {
    name: 'Monthly Fixed Late Fee',
    description: 'Fixed $100 late fee applied monthly after 10-day grace period',
    calculationType: LateFeeCalculationType.FIXED,
    amount: 100.00,
    maxAmount: 500.00,
    minAmount: 0,
    gracePeriodDays: 10,
    applyAfterDays: 30,
    compoundingEnabled: false,
    compoundingInterval: CompoundingInterval.MONTHLY,
    autoApply: false,
    applyOnWeekends: false,
    applyOnHolidays: false,
    applicableToFeeTypes: ['TUITION'],
    applicableToPrograms: [],
    applicableToClasses: [],
    isActive: true,
  },
];

export async function seedLateFeePolicies(
  prisma: PrismaClient,
  users: any[]
) {
  console.log('Seeding late fee policies...');

  // Find system admin user
  let adminUser = users.find(u => u.userType === 'SYSTEM_ADMIN');
  
  if (!adminUser) {
    // Find any admin user
    adminUser = users.find(u => u.userType === 'ADMINISTRATOR');
  }

  if (!adminUser) {
    console.warn('No admin user found. Creating default admin for late fee policies.');

    // Find the first institution to associate with the admin user
    const firstInstitution = await prisma.institution.findFirst({
      where: { status: SystemStatus.ACTIVE }
    });

    if (!firstInstitution) {
      throw new Error('No active institution found. Cannot create admin user for late fee policies.');
    }

    adminUser = await prisma.user.create({
      data: {
        name: 'Late Fee Admin',
        email: `latefee.admin.${Date.now()}@example.com`,
        username: `latefee_admin_${Date.now()}`,
        userType: 'SYSTEM_ADMIN',
        accessScope: 'SYSTEM',
        status: SystemStatus.ACTIVE,
        password: '$2a$12$K8GpYeWkVQB.UY3QJnwGEuV0yCXDv.d/cTFp.LBKZGW0MYwY9ZYhq', // hashed 'Password123!'
        institutionId: firstInstitution.id,
      },
    });
  }

  const createdPolicies: any[] = [];

  for (const policyData of lateFeePoliciesSeedData) {
    try {
      // Check if policy already exists
      const existingPolicy = await prisma.lateFeePolicy.findFirst({
        where: {
          name: policyData.name,
        },
      });

      if (existingPolicy) {
        console.log(`Late fee policy '${policyData.name}' already exists. Skipping.`);
        createdPolicies.push(existingPolicy);
        continue;
      }

      // Create the policy
      const policy = await prisma.lateFeePolicy.create({
        data: {
          ...policyData,
          tieredRules: policyData.tieredRules ? JSON.stringify(policyData.tieredRules) : undefined,
          createdById: adminUser.id,
          effectiveFrom: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
      });

      createdPolicies.push(policy);
      console.log(`Created late fee policy: ${policy.name}`);
    } catch (error) {
      console.error(`Error creating late fee policy '${policyData.name}':`, error);
    }
  }

  console.log(`Late fee policies seeding completed. Created ${createdPolicies.length} policies.`);
  return createdPolicies;
}
