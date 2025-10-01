-- ============================================================================
-- FabriiQ Platform - Row Level Security (RLS) Policies
-- ============================================================================
-- This script implements comprehensive RLS policies for all security-sensitive tables
-- to ensure proper data isolation and access control in the multi-tenant system.
--
-- CRITICAL: This addresses the security vulnerability of 97+ tables without RLS
-- ============================================================================

-- Enable RLS on all critical tables
-- ============================================================================

-- Core User Tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_profiles" ENABLE ROW LEVEL SECURITY;

-- Academic Structure Tables
ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "topics" ENABLE ROW LEVEL SECURITY;

-- Enrollment and Assignment Tables
ALTER TABLE "student_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "class_teachers" ENABLE ROW LEVEL SECURITY;

-- Activity and Assessment Tables
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_submissions" ENABLE ROW LEVEL SECURITY;

-- Attendance and Performance Tables
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grade_books" ENABLE ROW LEVEL SECURITY;

-- Communication Tables
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

-- Social Wall Tables
ALTER TABLE "social_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_reports" ENABLE ROW LEVEL SECURITY;

-- Analytics and Performance Tables
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "performance_analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_performance_metrics" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions for RLS Policies
-- ============================================================================

-- Function to get current user's institution ID
CREATE OR REPLACE FUNCTION get_current_user_institution_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_institution_id', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_id', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user type
CREATE OR REPLACE FUNCTION get_current_user_type()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_user_type', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() = 'SYSTEM_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is campus admin
CREATE OR REPLACE FUNCTION is_campus_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() IN ('SYSTEM_ADMIN', 'CAMPUS_ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_type() IN ('SYSTEM_ADMIN', 'CAMPUS_ADMIN', 'TEACHER');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Core User Table Policies
-- ============================================================================

-- Users can see their own data and admins can see all users in their institution
CREATE POLICY "users_select_policy" ON "users"
FOR SELECT USING (
  id = get_current_user_id() OR
  is_system_admin() OR
  (is_campus_admin() AND "institutionId" = get_current_user_institution_id())
);

-- Users can update their own data, admins can update users in their institution
CREATE POLICY "users_update_policy" ON "users"
FOR UPDATE USING (
  id = get_current_user_id() OR
  is_system_admin() OR
  (is_campus_admin() AND "institutionId" = get_current_user_institution_id())
);

-- Only system admins can insert new users (handled by registration system)
CREATE POLICY "users_insert_policy" ON "users"
FOR INSERT WITH CHECK (is_system_admin());

-- Sessions belong to the user
CREATE POLICY "sessions_policy" ON "sessions"
FOR ALL USING ("userId" = get_current_user_id());

-- ============================================================================
-- Profile Table Policies
-- ============================================================================

-- Student profiles - students see their own, teachers see their students, admins see all
CREATE POLICY "student_profiles_select_policy" ON "student_profiles"
FOR SELECT USING (
  "userId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "student_enrollments" se
    JOIN "class_teachers" ct ON se."classId" = ct."classId"
    WHERE se."studentId" = "student_profiles"."id" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- Teacher profiles - teachers see their own, admins see all in institution
CREATE POLICY "teacher_profiles_select_policy" ON "teacher_profiles"
FOR SELECT USING (
  "userId" = get_current_user_id() OR
  is_system_admin() OR
  (is_campus_admin() AND EXISTS (
    SELECT 1 FROM "users" u 
    WHERE u."id" = "teacher_profiles"."userId" 
    AND u."institutionId" = get_current_user_institution_id()
  ))
);

-- ============================================================================
-- Academic Structure Policies
-- ============================================================================

-- Institution data - users can only see their own institution
CREATE POLICY "institutions_policy" ON "institutions"
FOR SELECT USING (
  is_system_admin() OR
  "id" = get_current_user_institution_id()
);

-- Campus data - users can only see campuses in their institution
CREATE POLICY "campuses_policy" ON "campuses"
FOR SELECT USING (
  is_system_admin() OR
  "institutionId" = get_current_user_institution_id()
);

-- Class data - students see their classes, teachers see their classes, admins see all
CREATE POLICY "classes_select_policy" ON "classes"
FOR SELECT USING (
  is_system_admin() OR
  (is_campus_admin() AND EXISTS (
    SELECT 1 FROM "campuses" c 
    WHERE c."id" = "classes"."campusId" 
    AND c."institutionId" = get_current_user_institution_id()
  )) OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "classes"."id" 
    AND ct."teacherId" = get_current_user_id()
  )) OR
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "classes"."id" 
    AND se."studentId" = get_current_user_id()
  )
);

-- ============================================================================
-- Enrollment and Assignment Policies
-- ============================================================================

-- Student enrollments - students see their own, teachers see their students, admins see all
CREATE POLICY "student_enrollments_policy" ON "student_enrollments"
FOR SELECT USING (
  "studentId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "student_enrollments"."classId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- Teacher assignments - teachers see their own, admins see all
CREATE POLICY "teacher_assignments_policy" ON "teacher_assignments"
FOR SELECT USING (
  "teacherId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin()
);

-- Class teachers - same as teacher assignments
CREATE POLICY "class_teachers_policy" ON "class_teachers"
FOR SELECT USING (
  "teacherId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin()
);

-- ============================================================================
-- Activity and Assessment Policies
-- ============================================================================

-- Activities - students see activities in their classes, teachers see their class activities
CREATE POLICY "activities_select_policy" ON "activities"
FOR SELECT USING (
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "activities"."classId" 
    AND ct."teacherId" = get_current_user_id()
  )) OR
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "activities"."classId" 
    AND se."studentId" = get_current_user_id()
  )
);

-- Teachers can create/update activities in their classes
CREATE POLICY "activities_insert_policy" ON "activities"
FOR INSERT WITH CHECK (
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "activities"."classId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

CREATE POLICY "activities_update_policy" ON "activities"
FOR UPDATE USING (
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "activities"."classId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- Similar policies for assessments
CREATE POLICY "assessments_select_policy" ON "assessments"
FOR SELECT USING (
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "assessments"."classId" 
    AND ct."teacherId" = get_current_user_id()
  )) OR
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "assessments"."classId" 
    AND se."studentId" = get_current_user_id()
  )
);

-- ============================================================================
-- Grade and Submission Policies
-- ============================================================================

-- Activity grades - students see their own, teachers see their students' grades
CREATE POLICY "activity_grades_select_policy" ON "activity_grades"
FOR SELECT USING (
  "studentId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "activities" a
    JOIN "class_teachers" ct ON a."classId" = ct."classId"
    WHERE a."id" = "activity_grades"."activityId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- Students can insert their own submissions, teachers can grade
CREATE POLICY "activity_grades_insert_policy" ON "activity_grades"
FOR INSERT WITH CHECK (
  "studentId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  is_teacher()
);

-- Students can update their ungraded submissions, teachers can update grades
CREATE POLICY "activity_grades_update_policy" ON "activity_grades"
FOR UPDATE USING (
  ("studentId" = get_current_user_id() AND "gradedAt" IS NULL) OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "activities" a
    JOIN "class_teachers" ct ON a."classId" = ct."classId"
    WHERE a."id" = "activity_grades"."activityId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- ============================================================================
-- Communication Policies
-- ============================================================================

-- Notifications - users see their own notifications
CREATE POLICY "notifications_policy" ON "notifications"
FOR SELECT USING (
  "userId" = get_current_user_id() OR
  is_system_admin()
);

-- Announcements - users see announcements for their classes/institution
CREATE POLICY "announcements_policy" ON "announcements"
FOR SELECT USING (
  is_system_admin() OR
  (is_campus_admin() AND "institutionId" = get_current_user_institution_id()) OR
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "announcements"."classId" 
    AND se."studentId" = get_current_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "announcements"."classId" 
    AND ct."teacherId" = get_current_user_id()
  )
);

-- ============================================================================
-- Social Wall Policies
-- ============================================================================

-- Social posts - users see posts in their classes
CREATE POLICY "social_posts_select_policy" ON "social_posts"
FOR SELECT USING (
  is_system_admin() OR
  is_campus_admin() OR
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "social_posts"."classId" 
    AND se."studentId" = get_current_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "social_posts"."classId" 
    AND ct."teacherId" = get_current_user_id()
  )
);

-- Users can create posts in their classes
CREATE POLICY "social_posts_insert_policy" ON "social_posts"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "student_enrollments" se 
    WHERE se."classId" = "social_posts"."classId" 
    AND se."studentId" = get_current_user_id()
  ) OR
  EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "social_posts"."classId" 
    AND ct."teacherId" = get_current_user_id()
  )
);

-- Users can update/delete their own posts, moderators can moderate
CREATE POLICY "social_posts_update_policy" ON "social_posts"
FOR UPDATE USING (
  "authorId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "class_teachers" ct 
    WHERE ct."classId" = "social_posts"."classId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- ============================================================================
-- Analytics Policies (Restricted Access)
-- ============================================================================

-- Analytics events - only admins and the user themselves
CREATE POLICY "analytics_events_policy" ON "analytics_events"
FOR SELECT USING (
  "userId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin()
);

-- Performance analytics - teachers see their students, admins see all
CREATE POLICY "performance_analytics_policy" ON "performance_analytics"
FOR SELECT USING (
  "userId" = get_current_user_id() OR
  is_system_admin() OR
  is_campus_admin() OR
  (is_teacher() AND EXISTS (
    SELECT 1 FROM "student_enrollments" se
    JOIN "class_teachers" ct ON se."classId" = ct."classId"
    WHERE se."studentId" = "performance_analytics"."userId" 
    AND ct."teacherId" = get_current_user_id()
  ))
);

-- ============================================================================
-- Additional Critical Tables (Enable RLS)
-- ============================================================================

-- Enable RLS on remaining critical tables
ALTER TABLE "academic_cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_campuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_outcomes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_banks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resource_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_campus_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "additional_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_feedbacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teacher_feedbacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blooms_progression" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "performance_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verification and Maintenance Queries
-- ============================================================================

-- Check which tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check existing policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count tables with and without RLS
SELECT
    CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY rowsecurity
ORDER BY rls_status;
