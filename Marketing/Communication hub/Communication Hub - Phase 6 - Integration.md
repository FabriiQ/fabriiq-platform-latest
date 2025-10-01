# Communication Hub — Phase 6: Portal‑wise Integration & Rollout (Week 6+)

Objective
- Deliver Communications as dedicated pages per portal (System Admin, Campus Admin, Teacher, Student) and remove any dependency on the Social Wall UI for messaging. Provide header access points (icon + unread badge) where applicable. Ensure the final UX from the Architecture doc is achieved with minimal code impact and maximum functional clarity.

Scope
- Dedicated Communications pages by role
- Header message icon (Student, Teacher) linking to Communications page
- Role-optimized inboxes, composer, privacy indicators
- System Admin and Campus Admin Communication page link in navigation bar
- Cross‑portal deep linking and shared data services
- Training and rollout plan

Key References
- Compliance-First Communication Architecture.md: “Enhanced Unified Communication Hub”, “Role-Based Message Interfaces”, “Multi-Portal Unified Inbox”, “Intelligent Message Composer”, “Smart Notification Management”
- Technical Plan.md: Admin pages, dashboard, moderation, and shared components

Tasks
1) Routing & RBAC (Minimal Impact)
- Define routes:
  - /system-admin/communications
  - /campus-admin/communications (already planned in Phase 2)
  - /teacher/communications
  - /student/communications
- Guard by role and feature flag MESSAGING_ENABLED
- Keep existing compliance pages intact; link between compliance and communications where appropriate

2) Header Entry Points (Student & Teacher)
- StudentLayout header: add Messages icon next to Notifications with unread badge; on click -> /student/communications
- TeacherLayout header: add Messages icon next to Notifications with unread badge; on click -> /teacher/communications
- Unread badge fed by a lightweight useUnreadMessagesCount(roleContext) hook backed by message read receipts

3) Communications Pages by Role (Reuse Components)
- System Admin Communications (/system-admin/communications)
  - Global overview of communications, quick links to Compliance Dashboard and Moderation
  - KPIs and filters across campuses
- Campus Admin Communications (/campus-admin/communications)
  - As per Phase 2: stats, unified hub, campus moderation panel
- Teacher Communications (/teacher/communications)
  - “Teaching Hub” UX: inbox groups (Student Questions, Parent Communications, Admin Updates), quick actions (Send Feedback, Class Announcement), message analytics
  - Composer with templates and privacy notice
- Student Communications (/student/communications)
  - “Student Inbox” UX: Priority, Academic, School Updates groupings; Focus Mode entry; templates for help requests, absence, etc.

4) Deep Links, Context, and Reuse (No Social Wall UI Changes)
- Support query params (classId, activityId, threadId) so actions from class/grade pages open Communications page in the right context
- Reuse existing social wall infrastructure:
  - Database models: extend SocialPost for messages (additive changes only)
  - tRPC patterns: follow existing social-wall router structure
  - Service layer: extend SocialWallService patterns for messaging
  - Authentication: use existing protectedProcedure and roleProtectedProcedure
  - Moderation: extend existing ModerationQueue and moderation workflows
- Shared components: MessageInterface, Inbox filters, Threads, Composer, PrivacyNoticePanel
- NO changes to existing Social Wall UI components (SocialWallContainer, PostFeed, etc.)

5) Analytics, Notifications, and Counters
- Wire dashboards to the same message event stream for consistency
- Ensure Smart Notification Preferences (Phase 4) drive delivery; header badge reflects unread count respecting focus mode and priority rules

6) Rollout & Training
- Quick-start guides per role (Student, Teacher, Campus Admin, System Admin)
- In-app tips for Focus Mode, Privacy badges, Templates

Acceptance Criteria
- Social Wall remains unchanged; there is no Messages tab in Social Wall
- Student and Teacher headers show a Messages icon with accurate unread counts and navigate to their Communications pages
- Each Communications page renders role-optimized UX as defined in the Architecture doc (inboxes, quick actions, privacy indicators)
- Feature flag off: routes hidden and header entry points disabled; no regressions to existing pages
- Admin dashboards reflect communications activity; moderation actions immediately affect visible state in pages

Test Plan
- Navigation/E2E per role: header icon (student/teacher) -> communications page; perform send/reply -> unread counts update
- Deep link tests: open /teacher/communications?classId=...&threadId=... lands on correct thread with context
- Regression: Social Wall pages unaffected; no new tabs or UI changes there
- Feature flag tests: off/on states for routes and header icons
- Accessibility: header controls have labels/tooltips; pages meet basic a11y checks

Risks & Mitigations
- Navigation clutter: use concise labels and tooltips; place icon adjacent to Notifications only (student/teacher)
- Unread count performance: use cached counters + periodic refresh; lazy-load thread detail
- Cross‑portal inconsistencies: centralize data access via shared messaging services and types
