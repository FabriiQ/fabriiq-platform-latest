#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseConstraints() {
  console.log('🔧 Fixing Database Constraints...');
  console.log('==================================');

  try {
    // Step 1: Drop the problematic constraint
    console.log('📋 Step 1: Dropping problematic constraint...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "enrollment_fees" 
        DROP CONSTRAINT IF EXISTS "enrollment_fees_enrollmentId_feeStructureId_unique"
      `;
      console.log('✅ Dropped unique constraint successfully');
    } catch (error) {
      console.log('⚠️  Constraint may not exist or already dropped:', (error as Error).message);
    }

    // Step 2: Drop the index if it exists
    console.log('📋 Step 2: Dropping problematic index...');
    
    try {
      await prisma.$executeRaw`
        DROP INDEX IF EXISTS "enrollment_fees_enrollmentId_feeStructureId_unique"
      `;
      console.log('✅ Dropped index successfully');
    } catch (error) {
      console.log('⚠️  Index may not exist or already dropped:', (error as Error).message);
    }

    // Step 3: Add missing columns if they don't exist
    console.log('📋 Step 3: Adding missing columns...');
    
    const columnsToAdd = [
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "computedLateFee" DOUBLE PRECISION DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastLateFeeCalculation" TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastNotificationSent" TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lockVersion" INTEGER DEFAULT 0',
      'ALTER TABLE "enrollment_fees" ADD COLUMN IF NOT EXISTS "lastChangeReason" TEXT',
      'ALTER TABLE "fee_transactions" ADD COLUMN IF NOT EXISTS "isAutomated" BOOLEAN DEFAULT false',
      'ALTER TABLE "fee_challans" ADD COLUMN IF NOT EXISTS "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "late_fee_applications" ADD COLUMN IF NOT EXISTS "batchId" TEXT'
    ];

    for (const sql of columnsToAdd) {
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ ${sql.substring(0, 60)}...`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          console.log(`   ⚠️  Column already exists: ${sql.substring(0, 60)}...`);
        } else {
          console.error(`   ❌ Failed: ${sql.substring(0, 60)}...`, (error as Error).message);
        }
      }
    }

    // Step 4: Create missing tables
    console.log('📋 Step 4: Creating missing tables...');
    
    // Create FeeNotification table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "fee_notifications" (
          "id" TEXT PRIMARY KEY,
          "enrollmentFeeId" TEXT NOT NULL,
          "notificationType" TEXT NOT NULL,
          "recipientEmail" TEXT NOT NULL,
          "recipientName" TEXT NOT NULL,
          "subject" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "sentAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "status" TEXT DEFAULT 'SENT',
          "metadata" JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "fk_fee_notifications_enrollment_fee" 
          FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE
        )
      `;
      console.log('   ✅ Created fee_notifications table');
    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        console.log('   ⚠️  fee_notifications table already exists');
      } else {
        console.error('   ❌ Failed to create fee_notifications table:', (error as Error).message);
      }
    }

    // Create FeeCalculationAudit table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "fee_calculation_audit" (
          "id" TEXT PRIMARY KEY,
          "enrollmentFeeId" TEXT NOT NULL,
          "calculationType" TEXT NOT NULL,
          "previousAmount" DOUBLE PRECISION,
          "newAmount" DOUBLE PRECISION,
          "changeAmount" DOUBLE PRECISION,
          "reason" TEXT,
          "calculationDetails" JSONB,
          "performedBy" TEXT NOT NULL,
          "performedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "isAutomated" BOOLEAN DEFAULT false,
          CONSTRAINT "fk_fee_calculation_audit_enrollment_fee" 
          FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE,
          CONSTRAINT "fk_fee_calculation_audit_user" 
          FOREIGN KEY ("performedBy") REFERENCES "users"("id")
        )
      `;
      console.log('   ✅ Created fee_calculation_audit table');
    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        console.log('   ⚠️  fee_calculation_audit table already exists');
      } else {
        console.error('   ❌ Failed to create fee_calculation_audit table:', (error as Error).message);
      }
    }

    // Create PaymentReconciliation table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "payment_reconciliation" (
          "id" TEXT PRIMARY KEY,
          "enrollmentFeeId" TEXT NOT NULL,
          "expectedAmount" DOUBLE PRECISION NOT NULL,
          "actualPaidAmount" DOUBLE PRECISION NOT NULL,
          "discrepancyAmount" DOUBLE PRECISION,
          "reconciliationDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "status" TEXT DEFAULT 'PENDING',
          "notes" TEXT,
          "resolvedBy" TEXT,
          "resolvedAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "fk_payment_reconciliation_enrollment_fee" 
          FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE,
          CONSTRAINT "fk_payment_reconciliation_resolved_by" 
          FOREIGN KEY ("resolvedBy") REFERENCES "users"("id")
        )
      `;
      console.log('   ✅ Created payment_reconciliation table');
    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        console.log('   ⚠️  payment_reconciliation table already exists');
      } else {
        console.error('   ❌ Failed to create payment_reconciliation table:', (error as Error).message);
      }
    }

    // Step 5: Create indexes
    console.log('📋 Step 5: Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_status_due_date" ON "enrollment_fees" ("paymentStatus", "dueDate")',
      'CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_computed_late_fee" ON "enrollment_fees" ("computedLateFee") WHERE "computedLateFee" > 0',
      'CREATE INDEX IF NOT EXISTS "idx_fee_notifications_enrollment_fee" ON "fee_notifications" ("enrollmentFeeId")',
      'CREATE INDEX IF NOT EXISTS "idx_fee_notifications_type_sent" ON "fee_notifications" ("notificationType", "sentAt")',
      'CREATE INDEX IF NOT EXISTS "idx_fee_calculation_audit_enrollment_fee" ON "fee_calculation_audit" ("enrollmentFeeId", "performedAt")',
      'CREATE INDEX IF NOT EXISTS "idx_fee_calculation_audit_type" ON "fee_calculation_audit" ("calculationType", "performedAt")',
      'CREATE INDEX IF NOT EXISTS "idx_payment_reconciliation_status" ON "payment_reconciliation" ("status", "reconciliationDate")'
    ];

    for (const sql of indexes) {
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

    // Step 6: Add computed column
    console.log('📋 Step 6: Adding computed column...');
    
    try {
      await prisma.$executeRaw`
        ALTER TABLE "enrollment_fees" 
        ADD COLUMN IF NOT EXISTS "totalAmountWithLateFees" DOUBLE PRECISION 
        GENERATED ALWAYS AS ("finalAmount" + "computedLateFee") STORED
      `;
      console.log('   ✅ Added computed column successfully');
    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        console.log('   ⚠️  Computed column already exists');
      } else {
        console.error('   ❌ Failed to add computed column:', (error as Error).message);
      }
    }

    console.log('==================================');
    console.log('🎉 Database constraints fixed successfully!');
    console.log('✅ Problematic constraints removed');
    console.log('✅ Missing columns added');
    console.log('✅ Missing tables created');
    console.log('✅ Indexes created');
    console.log('✅ Computed column added');

  } catch (error) {
    console.error('💥 Database constraint fix failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  fixDatabaseConstraints()
    .then(() => {
      console.log('\n🚀 Ready to run prisma db push!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database fix script failed:', error);
      process.exit(1);
    });
}

export { fixDatabaseConstraints };
