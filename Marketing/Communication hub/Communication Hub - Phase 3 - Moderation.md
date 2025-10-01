# Communication Hub — Phase 3: Moderation Enhancements (Week 3-4)

Objective
- Extend existing moderation to include messages with risk- and category-aware workflows.

Scope
- MessageModerationPanel UI
- Moderation queue extensions for messages
- Audit and escalation paths

Key References
- Technical Plan.md: Section “3.1 Extend Existing Moderation for Messages”
- Compliance-First Communication Architecture.md: “Psychological Design Principles”, “Smart Notification Management”

Tasks
1) API & DB Integration
- Extend existing SocialModerationLog model to support messages (add messageId field)
- Reuse existing moderation queue infrastructure from social wall
- New tRPC endpoints: api.messaging.getFlaggedMessages, api.messaging.moderateMessage
- Leverage existing moderation patterns from src/server/api/routers/social-wall.ts (moderateReport procedure)

2) Message Moderation Panel UI insystem admin 
- Implement MessageModerationPanel with filter/search
- MessageModerationCard shows risk badges, content, flagged keywords, FERPA badge
- Actions: Approve, Block, Escalate, View Thread

3) Audit & Notifications in system admin panel
- On moderation action, create MessageAuditLog entries
- If CRITICAL risk, notify moderators and campus admins

4) RBAC & Visibility
- Ensure only permitted roles see moderation items for their scope

Acceptance Criteria
- Flagged messages appear in queue with correct metadata
- Actions transition moderationStatus and persist audit entries
- Escalations recorded and notify recipients

Test Plan
- Unit: reducers/hooks
- Integration: simulate flagged message lifecycle
- E2E: moderator approves/blocks/escalates from admin pages

Risks & Mitigations
- Over-flagging: tune keyword lists; add allowlist and feedback loop
- Latency: paginate moderation queue and lazy load threads

