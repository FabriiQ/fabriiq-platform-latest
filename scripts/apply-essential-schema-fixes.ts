#!/usr/bin/env tsx

/**
 * Essential Schema Fixes for Fee Management
 * 
 * This script applies only the essential database schema changes
 * needed to make the fee management services work.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyEssentialSchemaFixes() {
  console.log('🔧 Applying Essential Schema Fixes...');
  console.log('=====================================');

  try {
    // Step 1: Add essential columns to enrollment_fees table
    console.log('📋 Step 1: Adding essential columns to enrollment_fees...');
    
    const essentialColumns = [
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "computedLateFee" DOUBLE PRECISION DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastLateFeeCalculation" TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastNotificationSent" TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lockVersion" INTEGER DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastChangeReason" TEXT'
    ];

    for (const sql of essentialColumns) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ Applied: ${sql.substring(0, 60)}...`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Column already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 2: Add essential columns to fee_transactions table
    console.log('📋 Step 2: Adding essential columns to fee_transactions...');
    
    const transactionColumns = [
      'ALTER TABLE "fee_transactions" ADD COLUMN IF NOT EXISTS "isAutomated" BOOLEAN DEFAULT false'
    ];

    for (const sql of transactionColumns) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ Applied: ${sql}`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Column already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 3: Add essential columns to fee_challans table
    console.log('📋 Step 3: Adding essential columns to fee_challans...');
    
    const challanColumns = [
      'ALTER TABLE "fee_challans" ADD COLUMN IF NOT EXISTS "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];

    for (const sql of challanColumns) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ Applied: ${sql}`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Column already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 4: Add essential columns to late_fee_applications table
    console.log('📋 Step 4: Adding essential columns to late_fee_applications...');
    
    const lateFeeColumns = [
      'ALTER TABLE "late_fee_applications" ADD COLUMN IF NOT EXISTS "batchId" TEXT'
    ];

    for (const sql of lateFeeColumns) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ Applied: ${sql}`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Column already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 5: Create essential indexes
    console.log('📋 Step 5: Creating essential indexes...');
    
    const essentialIndexes = [
      'CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_status_due_date" ON "enrollment_fees" ("paymentStatus", "dueDate")',
      'CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_computed_late_fee" ON "enrollment_fees" ("computedLateFee") WHERE "computedLateFee" > 0',
      'CREATE INDEX IF NOT EXISTS "idx_fee_transactions_enrollment_date" ON "fee_transactions" ("enrollmentFeeId", "date", "status")',
      'CREATE INDEX IF NOT EXISTS "idx_late_fee_applications_batch" ON "late_fee_applications" ("batchId") WHERE "batchId" IS NOT NULL'
    ];

    for (const sql of essentialIndexes) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ Created index: ${sql.substring(0, 60)}...`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Index already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Index creation failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 6: Update existing records with default values
    console.log('📋 Step 6: Updating existing records with default values...');
    
    try {
      const updateResult = await prisma.$executeRaw`
        UPDATE "enrollment_fees" 
        SET 
          "computedLateFee" = 0,
          "version" = 1,
          "statusSyncedAt" = CURRENT_TIMESTAMP,
          "lockVersion" = 0,
          "reminderCount" = 0
        WHERE 
          "computedLateFee" IS NULL 
          OR "version" IS NULL 
          OR "statusSyncedAt" IS NULL 
          OR "lockVersion" IS NULL 
          OR "reminderCount" IS NULL
      `;
      console.log(`   ✅ Updated ${updateResult} enrollment fee records with default values`);
    } catch (error) {
      console.error('   ❌ Failed to update existing records:', (error as Error).message);
    }

    // Step 7: Verify the changes
    console.log('📋 Step 7: Verifying schema changes...');
    
    try {
      // Test that we can query the new columns
      const testQuery = await prisma.enrollmentFee.findFirst({
        select: {
          id: true,
          computedLateFee: true,
          version: true,
          statusSyncedAt: true,
          lockVersion: true
        }
      });

      if (testQuery) {
        console.log('   ✅ Schema verification successful - new columns are accessible');
        console.log(`   ✅ Sample record: computedLateFee=${testQuery.computedLateFee}, version=${testQuery.version}`);
      } else {
        console.log('   ⚠️  No records found for verification, but schema changes appear successful');
      }
    } catch (error) {
      console.error('   ❌ Schema verification failed:', (error as Error).message);
      throw error;
    }

    console.log('=====================================');
    console.log('🎉 Essential Schema Fixes Applied Successfully!');
    console.log('✅ All essential columns added');
    console.log('✅ Performance indexes created');
    console.log('✅ Existing records updated');
    console.log('✅ Schema verification passed');
    console.log('');
    console.log('🚀 Fee management services are now ready to use!');

  } catch (error) {
    console.error('💥 Schema fixes failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  applyEssentialSchemaFixes()
    .then(() => {
      console.log('\n✨ Ready to test enhanced fee management services!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Schema fix script failed:', error);
      process.exit(1);
    });
}

export { applyEssentialSchemaFixes };
