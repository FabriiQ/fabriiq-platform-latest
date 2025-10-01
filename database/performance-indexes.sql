-- ============================================================================
-- Performance Optimization Indexes for FabriQ Platform
-- ============================================================================
-- This script adds critical indexes to improve query performance and support
-- Row Level Security (RLS) policies efficiently.
--
-- IMPORTANT: Run this after implementing RLS policies for optimal performance
-- ============================================================================

-- ============================================================================
-- CRITICAL INDEXES FOR TEACHER ROUTER PERFORMANCE
-- ============================================================================

-- Index for teacher_assignments table (used in getClassById - 9790ms)
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_teacher
ON "teacher_assignments"("classId", "teacherId");

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_status
ON "teacher_assignments"("teacherId", "status");

-- Index for student_enrollments table (used in class metrics - 9647ms)
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_active
ON "student_enrollments"("classId", "status");

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_class
ON "student_enrollments"("studentId", "classId", "status");

-- Index for activities table (used in getRecentClassActivities - 9651ms)
CREATE INDEX IF NOT EXISTS idx_activities_class_status_created
ON "activities"("classId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_activities_class_status
ON "activities"("classId", "status");

-- Index for activity_grades table (used in class metrics)
CREATE INDEX IF NOT EXISTS idx_activity_grades_activity_status
ON "activity_grades"("activityId", "status");

CREATE INDEX IF NOT EXISTS idx_activity_grades_student_activity
ON "activity_grades"("studentId", "activityId", "status");

-- Index for assessments table (used in getUpcomingClassAssessments - 8362ms)
CREATE INDEX IF NOT EXISTS idx_assessments_class_status_due
ON "assessments"("classId", "status", "dueDate" ASC);

CREATE INDEX IF NOT EXISTS idx_assessments_class_due_date
ON "assessments"("classId", "dueDate" ASC) WHERE "status" = 'ACTIVE';

-- Index for assessment_submissions table
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment
ON "assessment_submissions"("assessmentId", "status");

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student
ON "assessment_submissions"("studentId", "assessmentId", "status");

-- Index for attendance table (used in class metrics)
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
ON "attendance"("classId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_student_class_date
ON "attendance"("studentId", "classId", "createdAt" DESC);

-- ============================================================================
-- INDEXES FOR USER AND SESSION PERFORMANCE
-- ============================================================================

-- Index for users table lookups
CREATE INDEX IF NOT EXISTS idx_users_email_type
ON "users"("email", "userType");

CREATE INDEX IF NOT EXISTS idx_users_type_status
ON "users"("userType", "status");

-- Index for teacher_profiles table
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user
ON "teacher_profiles"("userId");

-- Index for student_profiles table
CREATE INDEX IF NOT EXISTS idx_student_profiles_user
ON "student_profiles"("userId");

-- ============================================================================
-- INDEXES FOR NOTIFICATION PERFORMANCE
-- ============================================================================

-- Index for notifications table (already optimized but ensuring coverage)
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created
ON "notifications"("userId", "status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
ON "notifications"("userId", "type", "createdAt" DESC);

-- ============================================================================
-- INDEXES FOR CLASS AND SUBJECT PERFORMANCE
-- ============================================================================

-- Index for classes table
CREATE INDEX IF NOT EXISTS idx_classes_status_created
ON "classes"("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_status
ON "classes"("classTeacherId", "status");

-- Index for subjects table
CREATE INDEX IF NOT EXISTS idx_subjects_status
ON "subjects"("status");

-- Index for classes by campus and term
CREATE INDEX IF NOT EXISTS idx_classes_campus_term
ON "classes"("campusId", "termId") WHERE "status" = 'ACTIVE';

-- ============================================================================
-- INDEXES FOR ANALYTICS AND REPORTING
-- ============================================================================

-- Index for teacher_performance_metrics table
CREATE INDEX IF NOT EXISTS idx_teacher_performance_metrics_teacher_timeframe
ON "teacher_performance_metrics"("teacherId", "timeframe", "createdAt" DESC);

-- Index for student_performance_metrics table
CREATE INDEX IF NOT EXISTS idx_student_performance_metrics_student_timeframe
ON "student_performance_metrics"("studentId", "timeframe", "createdAt" DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Composite index for class activities with grades
CREATE INDEX IF NOT EXISTS idx_activities_class_status_created_with_grades
ON "activities"("classId", "status", "createdAt" DESC)
INCLUDE ("title", "maxScore");

-- Composite index for assessments with submissions
CREATE INDEX IF NOT EXISTS idx_assessments_class_due_with_submissions
ON "assessments"("classId", "dueDate" ASC, "status")
INCLUDE ("title", "maxScore");

-- Composite index for student enrollment with user data
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_status_with_user
ON "student_enrollments"("classId", "status")
INCLUDE ("studentId", "createdAt");

-- ============================================================================
-- PARTIAL INDEXES FOR ACTIVE RECORDS ONLY
-- ============================================================================

-- Partial indexes for active records only (more efficient)
CREATE INDEX IF NOT EXISTS idx_active_activities_class_created
ON "activities"("classId", "createdAt" DESC)
WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_active_assessments_class_due
ON "assessments"("classId", "dueDate" ASC)
WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_active_student_enrollments_class
ON "student_enrollments"("classId")
WHERE "status" = 'ACTIVE';

-- ============================================================================
-- CRITICAL ACTIVITY V2 PERFORMANCE INDEXES
-- ============================================================================

-- Critical indexes for ActivityV2 getById performance (currently 10955ms)
CREATE INDEX IF NOT EXISTS idx_activities_id_with_relations
ON "activities"("id")
INCLUDE ("title", "content", "gradingConfig", "subjectId", "topicId", "classId", "createdById");

-- Critical indexes for ActivityGrade performance queries
CREATE INDEX IF NOT EXISTS idx_activity_grades_activity_student_performance
ON "activity_grades"("activityId", "studentId", "status")
INCLUDE ("score", "timeSpentMinutes", "createdAt", "feedback");

CREATE INDEX IF NOT EXISTS idx_activity_grades_student_performance_lookup
ON "activity_grades"("studentId", "activityId")
INCLUDE ("score", "timeSpentMinutes", "createdAt", "status");

-- Index for class comparison queries (getClassComparison - 1575ms)
CREATE INDEX IF NOT EXISTS idx_activity_grades_activity_score_comparison
ON "activity_grades"("activityId", "score" DESC)
WHERE "score" IS NOT NULL;

-- Index for student attempts queries (getAttempts - 2127ms)
CREATE INDEX IF NOT EXISTS idx_activity_grades_attempts_lookup
ON "activity_grades"("activityId", "studentId", "createdAt" DESC)
INCLUDE ("score", "status", "timeSpentMinutes");

-- Composite index for student performance analytics
CREATE INDEX IF NOT EXISTS idx_activity_grades_performance_analytics
ON "activity_grades"("studentId", "createdAt" DESC)
INCLUDE ("activityId", "score", "timeSpentMinutes", "status");

-- ============================================================================
-- MAINTENANCE COMMANDS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE "users";
ANALYZE "teacher_profiles";
ANALYZE "student_profiles";
ANALYZE "classes";
ANALYZE "activities";
ANALYZE "assessments";
ANALYZE "student_enrollments";
ANALYZE "teacher_assignments";
ANALYZE "activity_grades";
ANALYZE "assessment_submissions";
ANALYZE "attendance";
ANALYZE "notifications";

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check table sizes and index usage
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
    AND tablename IN ('users', 'classes', 'activities', 'assessments', 'student_enrollments')
ORDER BY tablename, attname;

-- ============================================================================
-- RLS-OPTIMIZED INDEXES (Added for Row Level Security Performance)
-- ============================================================================

-- Users table - Critical for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_institution_type_status
ON "users"("institutionId", "userType", "status");

CREATE INDEX IF NOT EXISTS idx_users_institution_email
ON "users"("institutionId", "email") WHERE "email" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_institution_username
ON "users"("institutionId", "username");

CREATE INDEX IF NOT EXISTS idx_users_primary_campus
ON "users"("primaryCampusId") WHERE "primaryCampusId" IS NOT NULL;

-- Student profiles - For RLS student data access
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_enrollment
ON "student_profiles"("userId", "enrollmentNumber");

-- Teacher profiles - For RLS teacher data access
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_institution
ON "teacher_profiles"("userId");

-- Institutions and campuses - For RLS institution filtering
CREATE INDEX IF NOT EXISTS idx_campuses_institution
ON "campuses"("institutionId", "status");

-- Classes - Enhanced for RLS performance
CREATE INDEX IF NOT EXISTS idx_classes_campus_status
ON "classes"("campusId", "status");

CREATE INDEX IF NOT EXISTS idx_classes_institution_lookup
ON "classes"("campusId")
INCLUDE ("id", "name", "status");

-- Class teachers - Critical for teacher access control
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_class_status
ON "class_teachers"("teacherId", "classId", "status");

CREATE INDEX IF NOT EXISTS idx_class_teachers_class_active
ON "class_teachers"("classId") WHERE "status" = 'ACTIVE';

-- Student enrollments - Enhanced for RLS
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_status
ON "student_enrollments"("studentId", "status");

CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_student_active
ON "student_enrollments"("classId", "studentId") WHERE "status" = 'ACTIVE';

-- Activities - RLS-optimized for class-based access
CREATE INDEX IF NOT EXISTS idx_activities_class_created_status
ON "activities"("classId", "createdAt" DESC, "status");

CREATE INDEX IF NOT EXISTS idx_activities_subject_topic
ON "activities"("subjectId", "topicId") WHERE "status" = 'ACTIVE';

-- Activity grades - Critical for student/teacher access
CREATE INDEX IF NOT EXISTS idx_activity_grades_student_graded
ON "activity_grades"("studentId", "gradedAt" DESC) WHERE "gradedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_grades_activity_student_status
ON "activity_grades"("activityId", "studentId", "status");

-- Assessments - RLS-optimized
CREATE INDEX IF NOT EXISTS idx_assessments_class_term_due
ON "assessments"("classId", "termId", "dueDate" ASC);

CREATE INDEX IF NOT EXISTS idx_assessments_subject_active
ON "assessments"("subjectId", "status") WHERE "status" = 'ACTIVE';

-- Assessment submissions - For grade access control
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_student_submitted
ON "assessment_submissions"("studentId", "submittedAt" DESC);

-- Notifications - User-specific access
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON "notifications"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_status
ON "notifications"("userId", "isRead", "createdAt" DESC);

-- Social wall - Class-based access control
CREATE INDEX IF NOT EXISTS idx_social_posts_class_created
ON "social_posts"("classId", "createdAt" DESC) WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_social_posts_author_class
ON "social_posts"("authorId", "classId", "status");

CREATE INDEX IF NOT EXISTS idx_social_comments_post_created
ON "social_comments"("postId", "createdAt" ASC) WHERE "status" = 'ACTIVE';

-- Attendance - Student and class access
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
ON "attendance"("studentId", "date" DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
ON "attendance"("classId", "date" DESC);

-- Analytics - User-specific performance data
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp
ON "analytics_events"("userId", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_performance_analytics_user_date
ON "performance_analytics"("userId", "date" DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Teacher dashboard queries
CREATE INDEX IF NOT EXISTS idx_teacher_dashboard_composite
ON "class_teachers"("teacherId", "status")
INCLUDE ("classId");

-- Student dashboard queries
CREATE INDEX IF NOT EXISTS idx_student_dashboard_composite
ON "student_enrollments"("studentId", "status")
INCLUDE ("classId");

-- Class activity summary queries
CREATE INDEX IF NOT EXISTS idx_class_activity_summary
ON "activities"("classId", "status", "activityType")
INCLUDE ("title", "createdAt");

-- Grade book queries
CREATE INDEX IF NOT EXISTS idx_gradebook_composite
ON "activity_grades"("activityId", "status")
INCLUDE ("studentId", "score", "gradedAt");

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_active_by_institution
ON "users"("institutionId", "userType")
WHERE "status" = 'ACTIVE';

-- Active classes only
CREATE INDEX IF NOT EXISTS idx_classes_active_by_campus
ON "classes"("campusId", "termId")
WHERE "status" = 'ACTIVE';

-- Pending grades only
CREATE INDEX IF NOT EXISTS idx_activity_grades_pending
ON "activity_grades"("activityId", "studentId")
WHERE "gradedAt" IS NULL AND "status" = 'SUBMITTED';

-- Unread notifications only
CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON "notifications"("userId", "createdAt" DESC)
WHERE "isRead" = false;

-- ============================================================================
-- EXPRESSION INDEXES FOR SEARCH FUNCTIONALITY
-- ============================================================================

-- Case-insensitive user search
CREATE INDEX IF NOT EXISTS idx_users_name_search
ON "users" USING gin(to_tsvector('english', COALESCE("name", '')));

CREATE INDEX IF NOT EXISTS idx_users_email_lower
ON "users"(lower("email")) WHERE "email" IS NOT NULL;

-- Activity search
CREATE INDEX IF NOT EXISTS idx_activities_title_search
ON "activities" USING gin(to_tsvector('english', "title"));

-- Class search
CREATE INDEX IF NOT EXISTS idx_classes_name_search
ON "classes" USING gin(to_tsvector('english', "name"));

-- ============================================================================
-- MAINTENANCE AND MONITORING
-- ============================================================================

-- Update statistics for all indexed tables
ANALYZE "users";
ANALYZE "student_profiles";
ANALYZE "teacher_profiles";
ANALYZE "classes";
ANALYZE "class_teachers";
ANALYZE "student_enrollments";
ANALYZE "activities";
ANALYZE "activity_grades";
ANALYZE "assessments";
ANALYZE "assessment_submissions";
ANALYZE "notifications";
ANALYZE "social_posts";
ANALYZE "social_comments";
ANALYZE "attendance";
ANALYZE "analytics_events";
ANALYZE "performance_analytics";
