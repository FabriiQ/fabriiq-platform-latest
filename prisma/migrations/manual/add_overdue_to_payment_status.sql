-- Migration to add OVERDUE to PaymentStatusType enum
-- This ensures the database enum matches the schema definition

-- Add OVERDUE to the PaymentStatusType enum if it doesn't exist
DO $$
BEGIN
    -- Check if OVERDUE already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'OVERDUE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentStatusType')
    ) THEN
        -- Add OVERDUE to the enum
        ALTER TYPE "PaymentStatusType" ADD VALUE 'OVERDUE';
    END IF;
END
$$;
