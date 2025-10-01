-- Fee Management Performance Optimization Indexes
-- Run this script to improve query performance for fee management operations

-- ============================================================================
-- FEE STRUCTURE INDEXES
-- ============================================================================

-- Index for fee structure filtering by program campus (most common query)
CREATE INDEX IF NOT EXISTS idx_fee_structures_program_campus
ON fee_structures ("programCampusId");

-- Index for fee structure creation date ordering
CREATE INDEX IF NOT EXISTS idx_fee_structures_created
ON fee_structures ("createdAt" DESC);

-- ============================================================================
-- DISCOUNT TYPE INDEXES
-- ============================================================================

-- Index for discount type name ordering
CREATE INDEX IF NOT EXISTS idx_discount_types_name
ON discount_types (name);

-- ============================================================================
-- ENROLLMENT FEE INDEXES
-- ============================================================================

-- Index for enrollment fee lookup by enrollment (most common query)
CREATE INDEX IF NOT EXISTS idx_enrollment_fees_enrollment
ON enrollment_fees ("enrollmentId");

-- Index for enrollment fee filtering by payment status
CREATE INDEX IF NOT EXISTS idx_enrollment_fees_payment_status
ON enrollment_fees ("paymentStatus");

-- ============================================================================
-- FEE DISCOUNT INDEXES
-- ============================================================================

-- Index for fee discount lookup by enrollment fee
CREATE INDEX IF NOT EXISTS idx_fee_discounts_enrollment_fee
ON fee_discounts ("enrollmentFeeId");

-- Performance optimization complete
-- Essential indexes created for fee management system

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Enable query logging for performance monitoring (optional)
-- Uncomment the following lines if you want to monitor slow queries
-- ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries taking more than 1 second
-- ALTER SYSTEM SET log_statement = 'all'; -- Log all statements (use with caution in production)
-- SELECT pg_reload_conf(); -- Reload configuration

-- Check index usage statistics
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- AND (tablename LIKE '%fee%' OR tablename LIKE '%discount%')
-- ORDER BY idx_tup_read DESC;

-- Check table statistics
-- SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
-- FROM pg_stat_user_tables 
-- WHERE schemaname = 'public' 
-- AND (tablename LIKE '%fee%' OR tablename LIKE '%discount%')
-- ORDER BY n_live_tup DESC;
