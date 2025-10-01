# Communication Hub — Phase 5: Scheduled Analysis (Cron) (Week 5)

Objective
- Implement non-AI scheduled analysis of recent messages for classification, moderation flagging, and audit updates.

Scope
- Cron job to analyze messages every 6 hours
- Rule-based analyzeMessage pipeline
- Audit and moderation queue updates

Key References
- Technical Plan.md: “5.1 Message Analysis Cron Job”

Tasks
1) Cron Job
- src/lib/cron/messageAnalysis.ts using CronJob
- Pull recent unanalyzed messages, run classifier, update message fields
- Create MessageAuditLog entries and moderationQueue items
- Notify moderators on CRITICAL risk

2) Configuration
- Env flag to enable/disable cron in non-prod
- Logging and error handling standards

3) Observability
- Basic metrics: analyzed count, errors, flagged count

Acceptance Criteria
- Cron runs on schedule (dev/test) and updates messages as expected
- Audit and moderation entries created consistently

Test Plan
- Unit: analyzeMessage
- Integration: seed sample messages, run cron function directly, assert DB changes

Risks & Mitigations
- Double-processing: use analyzedAt guard and idempotent updates
- Load: batch processing with pagination

