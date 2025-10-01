-- ============================================================================
-- FEE MANAGEMENT SCHEMA FIXES FOR PRODUCTION READINESS
-- ============================================================================
-- This file contains critical fixes for fee management database schema
-- to resolve inconsistencies and make the system production-ready.
--
-- Issues Fixed:
-- 1. Missing foreign key constraints
-- 2. Inconsistent field types and constraints
-- 3. Missing performance indexes
-- 4. Late fee integration gaps
-- 5. Payment status synchronization issues
-- 6. Missing audit trail fields
-- ============================================================================

-- Set transaction isolation level for consistency
BEGIN;

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraints that are missing for referential integrity
ALTER TABLE "late_fee_policies" 
ADD CONSTRAINT "fk_late_fee_policies_institution" 
FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE;

ALTER TABLE "late_fee_policies" 
ADD CONSTRAINT "fk_late_fee_policies_campus" 
FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE CASCADE;

-- ============================================================================
-- 2. ADD COMPUTED COLUMNS FOR LATE FEE INTEGRATION
-- ============================================================================

-- Add computed late fee amount to enrollment_fees table
ALTER TABLE "enrollment_fees" 
ADD COLUMN "computedLateFee" DOUBLE PRECISION DEFAULT 0 NOT NULL;

-- Add total amount including late fees (computed column)
ALTER TABLE "enrollment_fees" 
ADD COLUMN "totalAmountWithLateFees" DOUBLE PRECISION 
GENERATED ALWAYS AS ("finalAmount" + "computedLateFee") STORED;

-- Add last late fee calculation date for tracking
ALTER TABLE "enrollment_fees" 
ADD COLUMN "lastLateFeeCalculation" TIMESTAMP;

-- Add overdue notification tracking
ALTER TABLE "enrollment_fees" 
ADD COLUMN "lastNotificationSent" TIMESTAMP;

-- Add payment reminder count
ALTER TABLE "enrollment_fees" 
ADD COLUMN "reminderCount" INTEGER DEFAULT 0;

-- ============================================================================
-- 3. ADD MISSING PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_status_due_date" 
ON "enrollment_fees" ("paymentStatus", "dueDate");

CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_overdue_lookup" 
ON "enrollment_fees" ("dueDate", "paymentStatus") 
WHERE "paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE');

CREATE INDEX IF NOT EXISTS "idx_late_fee_applications_processing" 
ON "late_fee_applications" ("status", "calculationDate", "enrollmentFeeId");

CREATE INDEX IF NOT EXISTS "idx_fee_transactions_payment_lookup" 
ON "fee_transactions" ("enrollmentFeeId", "date", "status");

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS "idx_active_late_fee_policies" 
ON "late_fee_policies" ("isActive", "effectiveFrom", "effectiveTo") 
WHERE "isActive" = true;

-- ============================================================================
-- 4. ADD AUDIT TRAIL ENHANCEMENTS
-- ============================================================================

-- Add version tracking to enrollment fees
ALTER TABLE "enrollment_fees" 
ADD COLUMN "version" INTEGER DEFAULT 1;

-- Add change reason tracking
ALTER TABLE "enrollment_fees" 
ADD COLUMN "lastChangeReason" TEXT;

-- Add automated flag to track system vs manual changes
ALTER TABLE "fee_transactions" 
ADD COLUMN "isAutomated" BOOLEAN DEFAULT false;

-- Add batch processing identifier
ALTER TABLE "late_fee_applications" 
ADD COLUMN "batchId" TEXT;

-- ============================================================================
-- 5. ADD PAYMENT STATUS SYNCHRONIZATION FIELDS
-- ============================================================================

-- Add synchronization timestamp to track when statuses were last synced
ALTER TABLE "enrollment_fees" 
ADD COLUMN "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "fee_challans" 
ADD COLUMN "statusSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add lock version for optimistic locking
ALTER TABLE "enrollment_fees" 
ADD COLUMN "lockVersion" INTEGER DEFAULT 0;

-- ============================================================================
-- 6. CREATE TRIGGERS FOR AUTOMATED CALCULATIONS
-- ============================================================================

-- Function to update computed late fee amount
CREATE OR REPLACE FUNCTION update_computed_late_fee()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the computed late fee amount when late fee applications change
    UPDATE "enrollment_fees" 
    SET 
        "computedLateFee" = (
            SELECT COALESCE(SUM("appliedAmount" - "waivedAmount"), 0) 
            FROM "late_fee_applications" 
            WHERE "enrollmentFeeId" = NEW."enrollmentFeeId" 
            AND "status" IN ('APPLIED', 'PAID')
        ),
        "lastLateFeeCalculation" = CURRENT_TIMESTAMP,
        "version" = "version" + 1,
        "statusSyncedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."enrollmentFeeId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update computed late fees
DROP TRIGGER IF EXISTS "trigger_update_computed_late_fee" ON "late_fee_applications";
CREATE TRIGGER "trigger_update_computed_late_fee"
    AFTER INSERT OR UPDATE OR DELETE ON "late_fee_applications"
    FOR EACH ROW
    EXECUTE FUNCTION update_computed_late_fee();

-- ============================================================================
-- 7. CREATE PAYMENT STATUS SYNCHRONIZATION FUNCTION
-- ============================================================================

-- Function to synchronize payment statuses across related entities
CREATE OR REPLACE FUNCTION sync_payment_statuses(enrollment_fee_id TEXT)
RETURNS VOID AS $$
DECLARE
    fee_record RECORD;
    total_paid DOUBLE PRECISION;
    new_status TEXT;
BEGIN
    -- Get enrollment fee details
    SELECT * INTO fee_record 
    FROM "enrollment_fees" 
    WHERE "id" = enrollment_fee_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate total paid amount
    SELECT COALESCE(SUM("amount"), 0) INTO total_paid
    FROM "fee_transactions"
    WHERE "enrollmentFeeId" = enrollment_fee_id 
    AND "status" = 'ACTIVE';
    
    -- Determine new payment status
    IF total_paid >= fee_record."totalAmountWithLateFees" THEN
        new_status := 'PAID';
    ELSIF total_paid > 0 THEN
        new_status := 'PARTIAL';
    ELSIF fee_record."dueDate" < CURRENT_DATE THEN
        new_status := 'OVERDUE';
    ELSE
        new_status := 'PENDING';
    END IF;
    
    -- Update enrollment fee status
    UPDATE "enrollment_fees"
    SET 
        "paymentStatus" = new_status::payment_status_type,
        "statusSyncedAt" = CURRENT_TIMESTAMP,
        "lockVersion" = "lockVersion" + 1
    WHERE "id" = enrollment_fee_id;
    
    -- Update related challan statuses
    UPDATE "fee_challans"
    SET 
        "paymentStatus" = new_status::payment_status_type,
        "paidAmount" = total_paid,
        "statusSyncedAt" = CURRENT_TIMESTAMP
    WHERE "enrollmentFeeId" = enrollment_fee_id;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CREATE OVERDUE FEE IDENTIFICATION FUNCTION
-- ============================================================================

-- Function to identify overdue fees that need late fee processing
CREATE OR REPLACE FUNCTION get_overdue_fees_for_processing(
    as_of_date DATE DEFAULT CURRENT_DATE,
    campus_id TEXT DEFAULT NULL,
    exclude_processed BOOLEAN DEFAULT true
)
RETURNS TABLE (
    enrollment_fee_id TEXT,
    student_name TEXT,
    student_email TEXT,
    days_overdue INTEGER,
    outstanding_amount DOUBLE PRECISION,
    due_date DATE,
    last_notification_sent TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ef."id" as enrollment_fee_id,
        u."name" as student_name,
        u."email" as student_email,
        (as_of_date - ef."dueDate"::DATE)::INTEGER as days_overdue,
        ef."totalAmountWithLateFees" as outstanding_amount,
        ef."dueDate"::DATE as due_date,
        ef."lastNotificationSent" as last_notification_sent
    FROM "enrollment_fees" ef
    JOIN "student_enrollments" se ON ef."enrollmentId" = se."id"
    JOIN "students" s ON se."studentId" = s."id"
    JOIN "users" u ON s."userId" = u."id"
    LEFT JOIN "classes" c ON se."classId" = c."id"
    LEFT JOIN "program_campuses" pc ON c."programCampusId" = pc."id"
    WHERE 
        ef."dueDate"::DATE < as_of_date
        AND ef."paymentStatus" IN ('PENDING', 'PARTIAL', 'OVERDUE')
        AND (campus_id IS NULL OR pc."campusId" = campus_id)
        AND (
            NOT exclude_processed 
            OR NOT EXISTS (
                SELECT 1 FROM "late_fee_applications" lfa 
                WHERE lfa."enrollmentFeeId" = ef."id" 
                AND lfa."status" IN ('APPLIED', 'PAID')
                AND lfa."calculationDate"::DATE = as_of_date
            )
        );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- 9. CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Indexes for new computed columns
CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_computed_late_fee"
ON "enrollment_fees" ("computedLateFee") WHERE "computedLateFee" > 0;

CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_total_with_late_fees"
ON "enrollment_fees" ("totalAmountWithLateFees");

CREATE INDEX IF NOT EXISTS "idx_enrollment_fees_last_notification"
ON "enrollment_fees" ("lastNotificationSent") WHERE "lastNotificationSent" IS NOT NULL;

-- Index for batch processing
CREATE INDEX IF NOT EXISTS "idx_late_fee_applications_batch"
ON "late_fee_applications" ("batchId") WHERE "batchId" IS NOT NULL;

-- ============================================================================
-- 10. ADD CONSTRAINTS FOR DATA INTEGRITY
-- ============================================================================

-- Ensure amounts are non-negative
ALTER TABLE "enrollment_fees"
ADD CONSTRAINT "chk_enrollment_fees_amounts_positive"
CHECK ("baseAmount" >= 0 AND "discountedAmount" >= 0 AND "finalAmount" >= 0 AND "computedLateFee" >= 0);

-- Ensure due date is reasonable (not too far in past or future)
ALTER TABLE "enrollment_fees"
ADD CONSTRAINT "chk_enrollment_fees_due_date_reasonable"
CHECK ("dueDate" IS NULL OR ("dueDate" >= '2020-01-01' AND "dueDate" <= '2030-12-31'));

-- Ensure late fee applications have valid amounts
ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "chk_late_fee_applications_amounts"
CHECK ("calculatedAmount" >= 0 AND "appliedAmount" >= 0 AND "waivedAmount" >= 0 AND "appliedAmount" >= "waivedAmount");

-- Ensure transaction amounts are positive
ALTER TABLE "fee_transactions"
ADD CONSTRAINT "chk_fee_transactions_amount_positive"
CHECK ("amount" > 0);

-- ============================================================================
-- 11. CREATE NOTIFICATION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "fee_notifications" (
    "id" TEXT PRIMARY KEY,
    "enrollmentFeeId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL, -- 'OVERDUE', 'REMINDER', 'LATE_FEE_APPLIED'
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT', -- 'SENT', 'FAILED', 'BOUNCED'
    "metadata" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_fee_notifications_enrollment_fee"
    FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE
);

-- Indexes for notification tracking
CREATE INDEX IF NOT EXISTS "idx_fee_notifications_enrollment_fee"
ON "fee_notifications" ("enrollmentFeeId");

CREATE INDEX IF NOT EXISTS "idx_fee_notifications_type_sent"
ON "fee_notifications" ("notificationType", "sentAt");

-- ============================================================================
-- 12. CREATE FEE CALCULATION AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "fee_calculation_audit" (
    "id" TEXT PRIMARY KEY,
    "enrollmentFeeId" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL, -- 'INITIAL', 'RECALCULATION', 'LATE_FEE', 'DISCOUNT', 'CHARGE'
    "previousAmount" DOUBLE PRECISION,
    "newAmount" DOUBLE PRECISION,
    "changeAmount" DOUBLE PRECISION,
    "reason" TEXT,
    "calculationDetails" JSONB,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAutomated" BOOLEAN DEFAULT false,

    CONSTRAINT "fk_fee_calculation_audit_enrollment_fee"
    FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE,

    CONSTRAINT "fk_fee_calculation_audit_user"
    FOREIGN KEY ("performedBy") REFERENCES "users"("id")
);

-- Indexes for calculation audit
CREATE INDEX IF NOT EXISTS "idx_fee_calculation_audit_enrollment_fee"
ON "fee_calculation_audit" ("enrollmentFeeId", "performedAt");

CREATE INDEX IF NOT EXISTS "idx_fee_calculation_audit_type"
ON "fee_calculation_audit" ("calculationType", "performedAt");

-- ============================================================================
-- 13. CREATE PAYMENT RECONCILIATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payment_reconciliation" (
    "id" TEXT PRIMARY KEY,
    "enrollmentFeeId" TEXT NOT NULL,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "actualPaidAmount" DOUBLE PRECISION NOT NULL,
    "discrepancyAmount" DOUBLE PRECISION GENERATED ALWAYS AS ("expectedAmount" - "actualPaidAmount") STORED,
    "reconciliationDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'ESCALATED'
    "notes" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fk_payment_reconciliation_enrollment_fee"
    FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE,

    CONSTRAINT "fk_payment_reconciliation_resolved_by"
    FOREIGN KEY ("resolvedBy") REFERENCES "users"("id")
);

-- Index for payment reconciliation
CREATE INDEX IF NOT EXISTS "idx_payment_reconciliation_status"
ON "payment_reconciliation" ("status", "reconciliationDate");

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Fee Management Schema Fixes Applied Successfully!';
    RAISE NOTICE 'New Features Added:';
    RAISE NOTICE '- Computed late fee integration';
    RAISE NOTICE '- Payment status synchronization';
    RAISE NOTICE '- Enhanced audit trails';
    RAISE NOTICE '- Performance indexes';
    RAISE NOTICE '- Data integrity constraints';
    RAISE NOTICE '- Automated calculation triggers';
    RAISE NOTICE '- Notification tracking';
    RAISE NOTICE '- Payment reconciliation';
END $$;
