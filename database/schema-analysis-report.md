# Database Schema Analysis Report

## Summary
- **Analysis Date**: 2025-08-06T16:50:04.765Z
- **Total Tables**: 143
- **Analysis Type**: READ-ONLY (No changes made)

## Data Type Inconsistencies

### ID Column Types


### Timestamp Column Types


## Foreign Key Analysis

### Existing Foreign Keys
- **Total**: 348 constraints

### Potentially Missing Foreign Keys
- **Count**: 26
- archived_activity_grades.activityId
- archived_activity_grades.originalId
- archived_activity_grades.studentId
- archived_activity_grades.termId
- audit_logs.entityId
- canvases.selectedArtifactId
- conversation_participants.lastReadMessageId
- fee_arrears.previousFeeId
- fee_structures.academicCycleId
- fee_structures.termId

## Normalization Analysis

### JSON/JSONB Columns
- **Count**: 106
- CommitmentContract.metadata (jsonb)
- LearningOutcome.criteria (jsonb)
- LearningOutcome.performanceLevels (jsonb)
- ProfessionalDevelopment.certification (jsonb)
- Rubric.bloomsDistribution (jsonb)
- activities.bloomsDistribution (jsonb)
- activities.content (jsonb)
- activities.gradingConfig (jsonb)
- activity_grades.aiAnalysis (jsonb)
- activity_grades.attachments (jsonb)
- activity_grades.content (jsonb)
- ai_usage_logs.metadata (jsonb)
- analytics_events.data (jsonb)
- analytics_metrics.dimensions (jsonb)
- analytics_metrics.tags (jsonb)
- archived_activity_grades.content (jsonb)
- archived_activity_grades.summary (jsonb)
- assessment_policies.rules (jsonb)
- assessment_policies.settings (jsonb)
- assessment_results.bloomsAnalysis (jsonb)
- assessment_results.bloomsLevelScores (jsonb)
- assessment_results.criteriaScores (jsonb)
- assessment_results.learningOutcomeProgress (jsonb)
- assessment_results.performanceLevels (jsonb)
- assessment_results.rubricFeedback (jsonb)
- assessment_results.rubricResults (jsonb)
- assessment_results.topicMasteryUpdates (jsonb)
- assessment_submissions.attachments (jsonb)
- assessment_submissions.bloomsLevelScores (jsonb)
- assessment_submissions.content (jsonb)
- assessment_submissions.feedback (jsonb)
- assessment_submissions.gradingDetails (jsonb)
- assessment_submissions.learningOutcomeAchievements (jsonb)
- assessment_submissions.topicMasteryChanges (jsonb)
- assessment_templates.autoGradingRules (jsonb)
- assessment_templates.gradingConfig (jsonb)
- assessment_templates.rubric (jsonb)
- assessments.autoSelectionConfig (jsonb)
- assessments.bloomsDistribution (jsonb)
- assessments.content (jsonb)
- assessments.enhancedSettings (jsonb)
- assessments.gradingConfig (jsonb)
- assessments.questionPoolConfig (jsonb)
- assessments.rubric (jsonb)
- audit_logs.changes (jsonb)
- audit_logs.metadata (jsonb)
- blooms_progression.levelCounts (jsonb)
- campus_features.settings (jsonb)
- campuses.address (jsonb)
- campuses.contact (jsonb)
- canvases.artifacts (jsonb)
- canvases.messages (jsonb)
- canvases.preferences (jsonb)
- challan_templates.design (jsonb)
- class_performance.metadata (jsonb)
- coordinator_profiles.performance (jsonb)
- courses.settings (jsonb)
- courses.syllabus (jsonb)
- enrollment_history.details (jsonb)
- facilities.resources (jsonb)
- fee_challans.bankDetails (jsonb)
- fee_challans.challanData (jsonb)
- fee_structures.feeComponents (jsonb)
- feedback_base.attachments (jsonb)
- feedback_responses.attachments (jsonb)
- grade_books.calculationRules (jsonb)
- grading_scales.ranges (jsonb)
- h5p_content.metadata (jsonb)
- h5p_content.params (jsonb)
- institutions.metadata (jsonb)
- journey_events.metadata (jsonb)
- leaderboard_snapshots.entries (jsonb)
- leaderboard_snapshots.metadata (jsonb)
- lesson_plans.bloomsDistribution (jsonb)
- lesson_plans.content (jsonb)
- notifications.metadata (jsonb)
- performance_alerts.metadata (jsonb)
- performance_analytics.bloomsLevelScores (jsonb)
- personal_bests.metadata (jsonb)
- programs.curriculum (jsonb)
- programs.settings (jsonb)
- question_sources.metadata (jsonb)
- question_versions.content (jsonb)
- question_versions.metadata (jsonb)
- questions.content (jsonb)
- questions.metadata (jsonb)
- resource_permissions.settings (jsonb)
- resources.settings (jsonb)
- social_archives.archivedData (jsonb)
- social_posts.mediaUrls (jsonb)
- social_posts.metadata (jsonb)
- student_grades.activityGrades (jsonb)
- student_grades.assessmentGrades (jsonb)
- student_profiles.academicHistory (jsonb)
- student_profiles.guardianInfo (jsonb)
- student_profiles.specialNeeds (jsonb)
- subject_topics.bloomsDistribution (jsonb)
- subjects.bloomsDistribution (jsonb)
- subjects.syllabus (jsonb)
- system_config.value (jsonb)
- teacher_assistant_interactions.metadata (jsonb)
- teacher_assistant_searches.filters (jsonb)
- teacher_preferences.metadata (jsonb)
- teacher_preferences.value (jsonb)
- users.profileData (jsonb)
- worksheets.content (jsonb)

### Array Columns
- **Count**: 0

### Wide Tables (>20 columns)
- reward_points_config: 44 columns
- assessments: 33 columns
- activity_grades: 33 columns
- activities: 27 columns
- class_performance: 26 columns
- performance_analytics: 23 columns
- lesson_plans: 22 columns
- questions: 22 columns
- social_posts: 21 columns

## Index Coverage

### Tables with Minimal Indexing


## Recommendations

### High Priority
1. **Add missing foreign key constraints** for data integrity
2. **Standardize ID column types** (recommend TEXT for consistency)
3. **Add indexes** to tables with minimal indexing

### Medium Priority
1. **Standardize timestamp column types** (recommend timestamptz)
2. **Review JSON columns** for potential normalization
3. **Consider partitioning** for very wide tables

### Low Priority
1. **Review array columns** for normalization opportunities
2. **Optimize index usage** based on query patterns

## Next Steps

⚠️  **IMPORTANT**: Any schema changes must be done carefully:
1. Create migration scripts for each change
2. Test thoroughly in development environment
3. Plan for zero-downtime deployment
4. Update all related application code
5. Consider backward compatibility

---
*Generated by FabriiQ Schema Analysis Script*
*This was a READ-ONLY analysis - no database changes were made*
