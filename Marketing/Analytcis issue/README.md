# Analytics Wiring Fixes (Production Ready)

This document describes the issues found in analytics, Bloom analytics (Topic Mastery), and grading workflows, and the changes applied to make updates consistent across student, teacher, and class portals.

## Summary of Issues

1. Manual grading didn’t trigger analytics updates.
2. Student submissions (direct or batch) didn’t trigger analytics on completion.
3. Topic Mastery wasn’t updated from activity grades (only from assessments), leaving "Topic Master" stale.
4. Student dashboard updates used studentProfile.id instead of user.id, causing real-time update mismatches.
5. Real-time Bloom analytics service existed but wasn’t wired into these flows.

## Changes Applied

- Manual grading pipeline now triggers event-driven analytics and topic mastery update:
  - File: src/server/api/routers/activityGrade.ts
  - After updating a grade, we call EventDrivenAnalyticsService.processGradeEvent(...)
  - If the activity has a topic, we update gradebook and recompute topic mastery for the student/topic

- Student submission pipeline (high priority path) now triggers analytics and topic mastery upon graded result:
  - File: src/server/api/routers/activity.ts (submitActivity mutation)
  - After processActivitySubmission, if graded, call EventDrivenAnalyticsService and update topic mastery

- Batch submission processing now triggers analytics and topic mastery per graded item:
  - File: src/server/api/services/activity-batch.service.ts
  - After processing each queued submission, if graded, call EventDrivenAnalyticsService and update topic mastery

- Student dashboard event user mapping aligned with auth user id:
  - File: src/server/api/services/event-driven-analytics.ts
  - Lookup studentProfile.userId; fallback to studentProfile.id if not available

- Service support to recompute topic mastery from graded activity history:
  - File: src/server/api/services/gradebook-bloom-integration.service.ts
  - Added updateTopicMasteryForStudentTopic(studentId, classId, topicId)

All new calls are best-effort (wrapped in try/catch) and won’t block grading or submission.

## Affected Files (key excerpts)

- src/server/api/routers/activityGrade.ts
- src/server/api/routers/activity.ts
- src/server/api/services/activity-batch.service.ts
- src/server/api/services/event-driven-analytics.ts
- src/server/api/services/gradebook-bloom-integration.service.ts

## How the new workflow behaves

- Teacher portal (manual grading):
  - After grading, analytics are updated (unified performance, Bloom progression) and Topic Mastery recomputed for the specific student/topic.

- Student portal (submission):
  - On graded submission (client-graded or server-graded), analytics and Topic Mastery are updated.

- Class portal / dashboards:
  - Real-time updates are emitted with the correct user id mapping. Dashboards reading from topicMastery and performance tables will reflect updates.

## Validation Checklist

- Manual grading triggers: verify activityGrade updated, topicMastery upserted, and analytics entries/metrics updated.
- Student submission triggers: same verifications after a student submits and the item is graded (both direct and batch paths).
- Dashboards: ensure class portal Topic Master and Bloom distributions reflect changes after grading/submissions.

## Notes & Follow-ups

- UnifiedAnalyticsService writes to optional tables (performanceAnalytics, studentPerformanceMetrics, bloomsProgression). If these models are not present in the Prisma schema, updates will no-op but won’t break the flow. Dashboards relying on topicMastery and gradebook will still work with changes above.
- If you want deeper real-time Bloom analytics, consider wiring RealtimeBloomsAnalyticsService after grading.
- Consider adding integration tests to lock behavior.

