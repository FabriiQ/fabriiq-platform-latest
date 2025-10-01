#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { seedLateFeePolicies } from '../src/server/db/seed-data/late-fee-policies';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting late fee policies seeding...');

    // Get existing users
    const users = await prisma.user.findMany({
      where: {
        userType: {
          in: ['SYSTEM_ADMIN', 'ADMINISTRATOR'],
        },
        status: 'ACTIVE',
      },
    });

    console.log(`Found ${users.length} admin users`);

    if (users.length === 0) {
      console.log('No admin users found. Please run the main seed script first.');
      return;
    }

    // Seed late fee policies
    await seedLateFeePolicies(prisma, users);

    console.log('Late fee policies seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding late fee policies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
