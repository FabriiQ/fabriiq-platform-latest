-- ============================================================================
-- LATE FEE MANAGEMENT COMPREHENSIVE SCHEMA
-- ============================================================================
-- This script creates the complete late fee management system with:
-- 1. Late Fee Policies (configurable rules)
-- 2. Late Fee Applications (actual late fees applied)
-- 3. Late Fee Waivers (exceptions and forgiveness)
-- 4. Late Fee History (audit trail)
-- ============================================================================

-- Drop existing tables if they exist (for clean reinstall)
DROP TABLE IF EXISTS "late_fee_history" CASCADE;
DROP TABLE IF EXISTS "late_fee_waivers" CASCADE;
DROP TABLE IF EXISTS "late_fee_applications" CASCADE;
DROP TABLE IF EXISTS "late_fee_policies" CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS "LateFeeCalculationType" CASCADE;
DROP TYPE IF EXISTS "LateFeeStatus" CASCADE;
DROP TYPE IF EXISTS "WaiverStatus" CASCADE;
DROP TYPE IF EXISTS "CompoundingInterval" CASCADE;

-- Create enums for late fee management
CREATE TYPE "LateFeeCalculationType" AS ENUM (
    'FIXED',              -- Fixed amount per occurrence
    'PERCENTAGE',         -- Percentage of outstanding amount
    'DAILY_FIXED',        -- Fixed amount per day
    'DAILY_PERCENTAGE',   -- Percentage per day
    'TIERED_FIXED',       -- Different fixed amounts based on days overdue
    'TIERED_PERCENTAGE'   -- Different percentages based on days overdue
);

CREATE TYPE "LateFeeStatus" AS ENUM (
    'PENDING',            -- Late fee calculated but not yet applied
    'APPLIED',            -- Late fee has been applied to enrollment fee
    'WAIVED',             -- Late fee has been waived
    'PARTIAL_WAIVED',     -- Part of late fee has been waived
    'REVERSED',           -- Late fee has been reversed
    'PAID'                -- Late fee has been paid
);

CREATE TYPE "WaiverStatus" AS ENUM (
    'PENDING',            -- Waiver request pending approval
    'APPROVED',           -- Waiver approved and applied
    'REJECTED',           -- Waiver request rejected
    'EXPIRED'             -- Waiver request expired
);

CREATE TYPE "CompoundingInterval" AS ENUM (
    'DAILY',
    'WEEKLY', 
    'MONTHLY'
);

-- ============================================================================
-- 1. LATE FEE POLICIES TABLE
-- ============================================================================
-- Defines configurable late fee rules and policies
CREATE TABLE "late_fee_policies" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    
    -- Calculation Configuration
    "calculationType" "LateFeeCalculationType" NOT NULL DEFAULT 'FIXED',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxAmount" DOUBLE PRECISION,                    -- Maximum late fee cap
    "minAmount" DOUBLE PRECISION DEFAULT 0,          -- Minimum late fee threshold
    
    -- Grace Period Configuration
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,   -- Days before late fee applies
    "applyAfterDays" INTEGER NOT NULL DEFAULT 1,    -- Days after due date to start applying
    
    -- Compounding Configuration
    "compoundingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "compoundingInterval" "CompoundingInterval" DEFAULT 'DAILY',
    "maxCompoundingPeriods" INTEGER,                 -- Limit compounding periods
    
    -- Tiered Configuration (for tiered calculation types)
    "tieredRules" JSONB,                            -- Array of {daysFrom, daysTo, amount/percentage}
    
    -- Application Rules
    "applyOnWeekends" BOOLEAN NOT NULL DEFAULT true,
    "applyOnHolidays" BOOLEAN NOT NULL DEFAULT true,
    "autoApply" BOOLEAN NOT NULL DEFAULT true,      -- Automatically apply or require manual approval
    
    -- Scope Configuration
    "applicableToFeeTypes" TEXT[],                  -- Which fee types this applies to
    "applicableToPrograms" TEXT[],                  -- Which programs this applies to
    "applicableToClasses" TEXT[],                   -- Which classes this applies to
    
    -- Status and Audit
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    
    CONSTRAINT "late_fee_policies_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 2. LATE FEE APPLICATIONS TABLE  
-- ============================================================================
-- Records actual late fees calculated and applied to enrollment fees
CREATE TABLE "late_fee_applications" (
    "id" TEXT NOT NULL,
    "enrollmentFeeId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    
    -- Calculation Details
    "daysOverdue" INTEGER NOT NULL,
    "calculatedAmount" DOUBLE PRECISION NOT NULL,
    "appliedAmount" DOUBLE PRECISION NOT NULL,       -- May differ from calculated due to caps/waivers
    "compoundingPeriods" INTEGER DEFAULT 0,
    
    -- Date Information
    "dueDate" TIMESTAMP(3) NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,
    "applicationDate" TIMESTAMP(3),
    "paymentDate" TIMESTAMP(3),
    
    -- Status and Management
    "status" "LateFeeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    
    -- Waiver Information
    "waivedAmount" DOUBLE PRECISION DEFAULT 0,
    "waivedBy" TEXT,
    "waivedDate" TIMESTAMP(3),
    "waiverReason" TEXT,
    
    -- Audit Trail
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    
    CONSTRAINT "late_fee_applications_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 3. LATE FEE WAIVERS TABLE
-- ============================================================================
-- Manages late fee waiver requests and approvals
CREATE TABLE "late_fee_waivers" (
    "id" TEXT NOT NULL,
    "lateFeeApplicationId" TEXT NOT NULL,
    "enrollmentFeeId" TEXT NOT NULL,
    
    -- Waiver Details
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION DEFAULT 0,
    "reason" TEXT NOT NULL,
    "justification" TEXT,
    "supportingDocuments" JSONB,                     -- Array of document references
    
    -- Approval Workflow
    "status" "WaiverStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedDate" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    
    -- Expiry Management
    "expiresAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit Trail
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "late_fee_waivers_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. LATE FEE HISTORY TABLE
-- ============================================================================
-- Comprehensive audit trail for all late fee activities
CREATE TABLE "late_fee_history" (
    "id" TEXT NOT NULL,
    "enrollmentFeeId" TEXT NOT NULL,
    "lateFeeApplicationId" TEXT,
    "waiverRequestId" TEXT,
    
    -- Action Details
    "action" TEXT NOT NULL,                          -- 'CALCULATED', 'APPLIED', 'WAIVED', 'REVERSED', 'PAID'
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "amount" DOUBLE PRECISION,
    "details" JSONB,                                 -- Additional action-specific details
    
    -- Context Information
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "systemGenerated" BOOLEAN NOT NULL DEFAULT false,
    
    CONSTRAINT "late_fee_history_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Late Fee Policies Indexes
CREATE INDEX "idx_late_fee_policies_institution" ON "late_fee_policies"("institutionId");
CREATE INDEX "idx_late_fee_policies_campus" ON "late_fee_policies"("campusId");
CREATE INDEX "idx_late_fee_policies_active" ON "late_fee_policies"("isActive");
CREATE INDEX "idx_late_fee_policies_effective" ON "late_fee_policies"("effectiveFrom", "effectiveTo");

-- Late Fee Applications Indexes
CREATE INDEX "idx_late_fee_applications_enrollment" ON "late_fee_applications"("enrollmentFeeId");
CREATE INDEX "idx_late_fee_applications_policy" ON "late_fee_applications"("policyId");
CREATE INDEX "idx_late_fee_applications_status" ON "late_fee_applications"("status");
CREATE INDEX "idx_late_fee_applications_due_date" ON "late_fee_applications"("dueDate");
CREATE INDEX "idx_late_fee_applications_calculation_date" ON "late_fee_applications"("calculationDate");
CREATE INDEX "idx_late_fee_applications_days_overdue" ON "late_fee_applications"("daysOverdue");

-- Late Fee Waivers Indexes
CREATE INDEX "idx_late_fee_waivers_application" ON "late_fee_waivers"("lateFeeApplicationId");
CREATE INDEX "idx_late_fee_waivers_enrollment" ON "late_fee_waivers"("enrollmentFeeId");
CREATE INDEX "idx_late_fee_waivers_status" ON "late_fee_waivers"("status");
CREATE INDEX "idx_late_fee_waivers_requested_by" ON "late_fee_waivers"("requestedBy");
CREATE INDEX "idx_late_fee_waivers_reviewed_by" ON "late_fee_waivers"("reviewedBy");

-- Late Fee History Indexes
CREATE INDEX "idx_late_fee_history_enrollment" ON "late_fee_history"("enrollmentFeeId");
CREATE INDEX "idx_late_fee_history_application" ON "late_fee_history"("lateFeeApplicationId");
CREATE INDEX "idx_late_fee_history_action" ON "late_fee_history"("action");
CREATE INDEX "idx_late_fee_history_performed_at" ON "late_fee_history"("performedAt");
CREATE INDEX "idx_late_fee_history_performed_by" ON "late_fee_history"("performedBy");

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Late Fee Policies Foreign Keys
ALTER TABLE "late_fee_policies"
ADD CONSTRAINT "late_fee_policies_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_policies"
ADD CONSTRAINT "late_fee_policies_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Late Fee Applications Foreign Keys
ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "late_fee_applications_enrollmentFeeId_fkey"
FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "late_fee_applications_policyId_fkey"
FOREIGN KEY ("policyId") REFERENCES "late_fee_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "late_fee_applications_waivedBy_fkey"
FOREIGN KEY ("waivedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "late_fee_applications_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_applications"
ADD CONSTRAINT "late_fee_applications_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Late Fee Waivers Foreign Keys
ALTER TABLE "late_fee_waivers"
ADD CONSTRAINT "late_fee_waivers_lateFeeApplicationId_fkey"
FOREIGN KEY ("lateFeeApplicationId") REFERENCES "late_fee_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_waivers"
ADD CONSTRAINT "late_fee_waivers_enrollmentFeeId_fkey"
FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_waivers"
ADD CONSTRAINT "late_fee_waivers_requestedBy_fkey"
FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_waivers"
ADD CONSTRAINT "late_fee_waivers_reviewedBy_fkey"
FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "late_fee_waivers"
ADD CONSTRAINT "late_fee_waivers_approvedBy_fkey"
FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Late Fee History Foreign Keys
ALTER TABLE "late_fee_history"
ADD CONSTRAINT "late_fee_history_enrollmentFeeId_fkey"
FOREIGN KEY ("enrollmentFeeId") REFERENCES "enrollment_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_history"
ADD CONSTRAINT "late_fee_history_lateFeeApplicationId_fkey"
FOREIGN KEY ("lateFeeApplicationId") REFERENCES "late_fee_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_history"
ADD CONSTRAINT "late_fee_history_waiverRequestId_fkey"
FOREIGN KEY ("waiverRequestId") REFERENCES "late_fee_waivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "late_fee_history"
ADD CONSTRAINT "late_fee_history_performedBy_fkey"
FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Sample Late Fee Policies
INSERT INTO "late_fee_policies" (
    "id", "name", "description", "calculationType", "amount", "maxAmount",
    "gracePeriodDays", "applyAfterDays", "compoundingEnabled", "compoundingInterval",
    "autoApply", "isActive", "createdById"
) VALUES
(
    'policy-standard-fixed',
    'Standard Fixed Late Fee',
    'Fixed $50 late fee after 7-day grace period',
    'FIXED', 50.00, 200.00, 7, 1, false, 'DAILY', true, true, 'system'
),
(
    'policy-percentage-compound',
    'Percentage Compounding Late Fee',
    '2% daily compounding late fee with 3-day grace period',
    'DAILY_PERCENTAGE', 2.0, 500.00, 3, 1, true, 'DAILY', true, true, 'system'
),
(
    'policy-tiered-fixed',
    'Tiered Fixed Late Fee',
    'Tiered late fee: $25 (1-15 days), $50 (16-30 days), $100 (31+ days)',
    'TIERED_FIXED', 0, 1000.00, 5, 1, false, 'DAILY', true, true, 'system'
);

-- Update tiered rules for the tiered policy
UPDATE "late_fee_policies"
SET "tieredRules" = '[
    {"daysFrom": 1, "daysTo": 15, "amount": 25},
    {"daysFrom": 16, "daysTo": 30, "amount": 50},
    {"daysFrom": 31, "daysTo": 999, "amount": 100}
]'::jsonb
WHERE "id" = 'policy-tiered-fixed';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to calculate late fee based on policy
CREATE OR REPLACE FUNCTION calculate_late_fee(
    policy_id TEXT,
    days_overdue INTEGER,
    outstanding_amount DOUBLE PRECISION,
    existing_late_fees DOUBLE PRECISION DEFAULT 0
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    policy RECORD;
    calculated_amount DOUBLE PRECISION := 0;
    tier RECORD;
BEGIN
    -- Get policy details
    SELECT * INTO policy FROM late_fee_policies WHERE id = policy_id AND "isActive" = true;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Apply grace period
    IF days_overdue <= policy.gracePeriodDays THEN
        RETURN 0;
    END IF;

    -- Calculate based on type
    CASE policy.calculationType
        WHEN 'FIXED' THEN
            calculated_amount := policy.amount;

        WHEN 'PERCENTAGE' THEN
            calculated_amount := (outstanding_amount * policy.amount) / 100;

        WHEN 'DAILY_FIXED' THEN
            calculated_amount := policy.amount * (days_overdue - policy.gracePeriodDays);

        WHEN 'DAILY_PERCENTAGE' THEN
            IF policy.compoundingEnabled THEN
                -- Compound daily
                calculated_amount := outstanding_amount * (POWER(1 + policy.amount/100, days_overdue - policy.gracePeriodDays) - 1);
            ELSE
                -- Simple daily
                calculated_amount := (outstanding_amount * policy.amount * (days_overdue - policy.gracePeriodDays)) / 100;
            END IF;

        WHEN 'TIERED_FIXED', 'TIERED_PERCENTAGE' THEN
            -- Find applicable tier
            FOR tier IN
                SELECT * FROM jsonb_to_recordset(policy.tieredRules) AS x(daysFrom INTEGER, daysTo INTEGER, amount DOUBLE PRECISION)
                WHERE days_overdue >= daysFrom AND days_overdue <= daysTo
            LOOP
                IF policy.calculationType = 'TIERED_FIXED' THEN
                    calculated_amount := tier.amount;
                ELSE
                    calculated_amount := (outstanding_amount * tier.amount) / 100;
                END IF;
                EXIT;
            END LOOP;
    END CASE;

    -- Apply minimum amount
    IF calculated_amount < policy.minAmount THEN
        calculated_amount := policy.minAmount;
    END IF;

    -- Apply maximum amount cap
    IF policy.maxAmount IS NOT NULL AND (calculated_amount + existing_late_fees) > policy.maxAmount THEN
        calculated_amount := policy.maxAmount - existing_late_fees;
        IF calculated_amount < 0 THEN
            calculated_amount := 0;
        END IF;
    END IF;

    RETURN calculated_amount;
END;
$$ LANGUAGE plpgsql;
