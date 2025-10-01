-- ============================================================================
-- Advanced Assessment Sessions Schema
-- ============================================================================
-- This schema adds database persistence for CAT and advanced assessment sessions
-- to prevent session loss on server restarts and improve reliability.
-- ============================================================================

-- Create advanced assessment sessions table
CREATE TABLE IF NOT EXISTS "advanced_assessment_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "activityId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assessmentMode" TEXT NOT NULL DEFAULT 'standard',
  "sessionData" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_activity_student" 
ON "advanced_assessment_sessions"("activityId", "studentId");

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_student_active" 
ON "advanced_assessment_sessions"("studentId", "isActive") 
WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_last_accessed" 
ON "advanced_assessment_sessions"("lastAccessedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_assessment_mode" 
ON "advanced_assessment_sessions"("assessmentMode", "isActive") 
WHERE "isActive" = true;

-- Create partial index for active sessions only
CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_active_only" 
ON "advanced_assessment_sessions"("activityId", "studentId", "startedAt" DESC) 
WHERE "isActive" = true AND "completedAt" IS NULL;

-- Add foreign key constraints (if tables exist)
DO $$
BEGIN
  -- Add foreign key to activities table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    ALTER TABLE "advanced_assessment_sessions" 
    ADD CONSTRAINT "fk_advanced_sessions_activity" 
    FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE;
  END IF;

  -- Add foreign key to student_profiles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_profiles') THEN
    ALTER TABLE "advanced_assessment_sessions" 
    ADD CONSTRAINT "fk_advanced_sessions_student" 
    FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraints already exist, continue
    NULL;
END $$;

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_advanced_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS "trigger_update_advanced_sessions_updated_at" ON "advanced_assessment_sessions";
CREATE TRIGGER "trigger_update_advanced_sessions_updated_at"
  BEFORE UPDATE ON "advanced_assessment_sessions"
  FOR EACH ROW
  EXECUTE FUNCTION update_advanced_sessions_updated_at();

-- Create cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_advanced_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions older than 7 days that are completed or inactive
  DELETE FROM "advanced_assessment_sessions"
  WHERE (
    ("completedAt" IS NOT NULL AND "completedAt" < NOW() - INTERVAL '7 days')
    OR ("isActive" = false AND "updatedAt" < NOW() - INTERVAL '7 days')
    OR ("lastAccessedAt" < NOW() - INTERVAL '24 hours' AND "completedAt" IS NULL)
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for cleanup function performance
CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_cleanup" 
ON "advanced_assessment_sessions"("completedAt", "isActive", "lastAccessedAt") 
WHERE "completedAt" IS NOT NULL OR "isActive" = false;

-- Update table statistics
ANALYZE "advanced_assessment_sessions";

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON "advanced_assessment_sessions" TO your_app_user;

-- ============================================================================
-- Verification and Maintenance
-- ============================================================================

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'advanced_assessment_sessions'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'advanced_assessment_sessions'
ORDER BY indexname;

-- Example cleanup command (run periodically)
-- SELECT cleanup_expired_advanced_sessions();

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example: Find active sessions for a student
-- SELECT * FROM "advanced_assessment_sessions" 
-- WHERE "studentId" = 'student_id_here' 
-- AND "isActive" = true 
-- AND "completedAt" IS NULL;

-- Example: Get session statistics
-- SELECT 
--   "assessmentMode",
--   COUNT(*) as total_sessions,
--   COUNT("completedAt") as completed_sessions,
--   AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))/60) as avg_duration_minutes
-- FROM "advanced_assessment_sessions"
-- WHERE "startedAt" > NOW() - INTERVAL '30 days'
-- GROUP BY "assessmentMode";
