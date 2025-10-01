#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addComputedColumn() {
  try {
    console.log('Adding computed column...');
    
    // Add the computed column
    await prisma.$executeRaw`
      ALTER TABLE "enrollment_fees" 
      ADD COLUMN IF NOT EXISTS "totalAmountWithLateFees" DOUBLE PRECISION 
      GENERATED ALWAYS AS ("finalAmount" + "computedLateFee") STORED
    `;
    
    console.log('✅ Computed column added successfully');
    
    // Test the column
    const testRecord = await prisma.enrollmentFee.findFirst({
      select: {
        id: true,
        finalAmount: true,
        computedLateFee: true,
        totalAmountWithLateFees: true
      }
    });
    
    if (testRecord) {
      console.log('✅ Column verification successful:', testRecord);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addComputedColumn();
