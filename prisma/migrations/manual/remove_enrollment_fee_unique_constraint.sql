-- Migration to remove unique constraint on enrollmentId in enrollment_fees table
-- This allows multiple fee structures to be assigned to a single enrollment

-- Drop the unique constraint on enrollmentId
ALTER TABLE "enrollment_fees" DROP CONSTRAINT IF EXISTS "enrollment_fees_enrollmentId_key";

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "enrollment_fees_enrollmentId_idx" ON "enrollment_fees"("enrollmentId");
CREATE INDEX IF NOT EXISTS "enrollment_fees_enrollmentId_feeStructureId_idx" ON "enrollment_fees"("enrollmentId", "feeStructureId");

-- Add a unique constraint to prevent duplicate fee structure assignments to the same enrollment
ALTER TABLE "enrollment_fees" ADD CONSTRAINT "enrollment_fees_enrollmentId_feeStructureId_unique" 
UNIQUE ("enrollmentId", "feeStructureId");
