-- Simple Advanced Assessment Sessions Table Creation
-- Run this manually if the automated script has connection issues

-- Create the table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_activity_student" 
ON "advanced_assessment_sessions"("activityId", "studentId");

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_student_active" 
ON "advanced_assessment_sessions"("studentId", "isActive");

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_last_accessed" 
ON "advanced_assessment_sessions"("lastAccessedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_assessment_mode" 
ON "advanced_assessment_sessions"("assessmentMode", "isActive");

CREATE INDEX IF NOT EXISTS "idx_advanced_sessions_active_only" 
ON "advanced_assessment_sessions"("activityId", "studentId", "startedAt" DESC);

-- Add foreign key constraints (optional, may fail if referenced tables don't exist)
-- ALTER TABLE "advanced_assessment_sessions" 
-- ADD CONSTRAINT "fk_advanced_sessions_activity" 
-- FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE;

-- ALTER TABLE "advanced_assessment_sessions" 
-- ADD CONSTRAINT "fk_advanced_sessions_student" 
-- FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE;

-- Update table statistics
ANALYZE "advanced_assessment_sessions";
