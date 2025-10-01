-- Migration: Database-Schema Synchronization
-- Generated: 2025-08-06T17:01:13.124Z
-- 
-- This migration documents the RLS policies and indexes that were applied
-- directly to the database and are now reflected in the Prisma schema.

-- ============================================================================
-- Row Level Security (RLS) Status
-- ============================================================================

-- Tables with RLS enabled (27):
-- ✅ academic_calendar_events
-- ✅ activity_grades
-- ✅ additional_charges
-- ✅ ai_usage_logs
-- ✅ assessment_submissions
-- ✅ assessments
-- ✅ blooms_progression
-- ✅ campuses
-- ✅ classes
-- ✅ grade_books
-- ✅ messages
-- ✅ performance_alerts
-- ✅ performance_analytics
-- ✅ question_banks
-- ✅ resource_permissions
-- ✅ resources
-- ✅ social_comments
-- ✅ social_reports
-- ✅ student_grades
-- ✅ student_performance_metrics
-- ✅ student_profiles
-- ✅ subjects
-- ✅ teacher_assignments
-- ✅ teacher_profiles
-- ✅ terms
-- ✅ user_campus_access
-- ✅ user_permissions

-- Tables without RLS (116):
-- ❌ ActivityOutcome
-- ❌ ActivityTemplate
-- ❌ AssessmentOutcome
-- ❌ CommitmentContract
-- ❌ CriteriaLevel
-- ❌ LearningOutcome
-- ❌ LessonPlanOutcome
-- ❌ PerformanceLevel
-- ❌ ProfessionalDevelopment
-- ❌ Rubric
-- ... and 106 more

-- ============================================================================
-- Applied RLS Policies (0)
-- ============================================================================



-- ============================================================================
-- Applied Performance Indexes (24)
-- ============================================================================

-- Index: idx_activities_class_status on activities
-- Index: idx_activities_subject_topic on activities
-- Index: idx_activity_grades_activity_student_status on activity_grades
-- Index: idx_activity_grades_student_activity on activity_grades
-- Index: idx_assessment_submissions_student on assessment_submissions
-- Index: idx_active_assessments_class_due on assessments
-- Index: idx_assessments_class_due_date on assessments
-- Index: idx_assessments_subject_active on assessments
-- Index: idx_attendance_class_date on attendance
-- Index: idx_attendance_student_class_date on attendance
-- Index: idx_classes_institution_lookup on classes
-- Index: idx_classes_teacher_status on classes
-- Index: idx_notifications_user_type_created on notifications
-- Index: idx_social_comments_post_created on social_comments
-- Index: idx_social_posts_author_class on social_posts
-- Index: idx_active_student_enrollments_class on student_enrollments
-- Index: idx_student_enrollments_class_student_active on student_enrollments
-- Index: idx_student_enrollments_student_class on student_enrollments
-- Index: idx_teacher_assignments_teacher_status on teacher_assignments
-- Index: idx_users_email_lower on users
-- Index: idx_users_institution_email on users
-- Index: idx_users_institution_username on users
-- Index: idx_users_primary_campus on users
-- Index: idx_users_type_status on users

-- ============================================================================
-- Maintenance Commands
-- ============================================================================

-- To reapply RLS policies:
-- npm run db:rls

-- To reapply performance indexes:
-- npm run db:indexes

-- To check current status:
-- npm run db:analyze-schema

-- ============================================================================
-- Notes
-- ============================================================================

-- This migration is for documentation purposes only.
-- The actual RLS policies and indexes are managed through separate scripts.
-- 
-- RLS policies are defined in: /database/row-level-security-policies.sql
-- Performance indexes are defined in: /database/performance-indexes.sql
