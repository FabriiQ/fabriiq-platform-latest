## FabriiQ Platform Features (Implemented)

### 1) Enrollment & Fee Management
- Fee structure builder: term-wise, program/class configurable tables
- Discounts: percentage and fixed; scholarship and ad-hoc discounts
- Challans/Invoices: generation, re-issue, and status tracking (api/challan)
- Late fee policies: rules, daily/periodic accrual; automation scripts and SQL policies
- Payments & reconciliation: import helpers, validation scripts, CSV templates
- Financial reporting: receivables, paid/outstanding by class/student/program; campus rollups
- Admin tooling: System Admin and Campus Admin configuration screens
- Implementation artifacts: docs/unified-fee-management.md, FEE_MANAGEMENT_* summaries, SQL migrations and indexes

### 2) Attendance Management
- Teacher attendance flows and components (docs/features/TeacherAttendanceImplementation.md)
- Student attendance components (docs/componentsrevamp/attendance*)
- Class/session-level attendance with calendar integration
- Export/reporting hooks for daily and term rollups

### 3) Question Bank
- Item authoring and review; Bloom taxonomy tagging and outcomes mapping
- Reuse across activities/assessments; question usage analytics schema
- Search, filter, and selection UI; structured metadata (difficulty, topic)
- Implementation: src/features/question-bank/* with architecture/docs/task-list

### 4) Curriculum & Learning Outcomes (Bloom)
- Outcome definitions at topic/unit/term; rubric templates
- Bloom-aligned activity/assessment mapping; consistent scoring
- Topic mastery analytics and dashboards; remediation cues
- Teacher planning: lesson plan documentation and training guides
- Implementation: src/features/bloom/* (ARCHITECTURE, templates, analytics)

### 5) Activities & Assessments
- Unified activity data model across types (interactive, quiz, essay, offline)
- Assessment types with grading modes: score, rubric-based, hybrid
- Manual and automated grading workflows; moderation support
- AI-assisted item/criteria generation via AI Question Generator
- Implementation: src/features/activties/* and src/features/assessments/*; docs/assessment_*.md

### 6) Grading, Gradebook & Analytics
- Gradebook views: per class, per student, per term
- Rubrics integration with Bloom levels for consistent evaluation
- Bloom analytics: mastery by topic/outcome, heatmaps, trends
- Term results and reports; teacher performance dashboards
- Implementation: src/features/gradebook/*; docs/features/GradingAndRewardSystem.md, analytics guides

### 7) Resources & Content Studio
- Content authoring and management (Content Studio)
- Course subjectwise reources 
- Class Resources
- Student resources access under student portal
- 

### 8) System Calendar & Personalized Calendars
- Unified institution/campus calendar with Holidays and events
- Personalized calendars for teachers and students (class schedules, deadlines)
- Campus-admin calendar management
- Implementation: multiple calendar status reports and unified calendar docs; routes in /student/calendar, /teacher/schedule, /campus-admin/calendar

### 9) Messaging & Notifications
- Teacher and student communications hubs (portals include communications routes)
- Channels, moderation, and privacy controls; message privacy engine
- Notifications and in-app messaging components
- Implementation: src/features/messaging/* and compliance privacy engines

### 10) Rewards & Gamification
- Points, levels, achievements tied to activities/assessments
- Student achievements and points pages; leaderboards (class/institution)
- Analytics on engagement, streaks, and goals
- Class rewads given by teacher

### 11) Reports & Dashboards
- Financial reports: fee collection, receivables, outstanding, discounts
- Academic reports: grades, mastery, topic outcomes, class performance
- Engagement reports: activities completed, rewards, leaderboard snapshots
- Access by role (institution/campus/teacher) with appropriate aggregation

### 12) Compliance & Privacy
- FERPA-aligned privacy posture
- Consent management, retention service, message privacy engine
- Audit logs for sensitive actions
- Row-level security policies in SQL; RBAC in app layer
- Implementation: src/features/compliance/*; database/row-level-security-policies.sql

### 13) Internationalization (i18n) & RTL
- End-to-end plan, developer guides, testing guides, and RTL support
- Language resource organization and runtime hooks
- Implementation: docs/internationalization/*

### 14) Offline Experiences
- Teacher-offline flows for classrooms with limited connectivity
- Coordinator offline support for key workflows
- Implementation: src/features/teacher-offline/* and coordinator offline

### 15) AI: AIVY Multi-Agent Orchestration
- Teacher Assistant: planning, assessment support, analytics insights
- Student Companion: study guidance, goal tracking, micro-nudges
- Memory-enabled agents with specialized tools and safety rails
- Implementation: src/features/agents/*, teacher-assistant*, student-assistant*

---

## Cross-cutting capabilities
- Multi-campus hierarchy with institutional URLs
- Role-based portals (Admin, Campus Admin, Coordinator, Teacher, Student)
- Real-time updates where applicable (e.g., sockets)
- Extensible content  and agent tools
- Comprehensive testing scripts and data seeding for demos

## Implementation evidence (selected)
- Routes: /admin, /(dashboard)/campus-admin, /teacher/*, /student/*, /parent/*, /api/trpc, /api/challan
- Feature directories: src/features/[assessments, rewards, leaderboard, question-bank, bloom, messaging, gradebook, agents, teacher-assistant, student-assistant, teacher-offline]
- Docs: fee management, calendar, assessments, Bloom, leaderboard, teacher portal, internationalization, compliance, and implementation summaries

