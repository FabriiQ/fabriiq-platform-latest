## FabriiQ Platform Overview

### What is FabriiQ?
FabriiQ is a modern Learning eXperience Platform (LXP) for K–12 and higher education that unifies teaching, learning, assessment, engagement, and administration. It combines structured pedagogy (Bloom-aligned outcomes, rubrics) with practical school operations (enrollment, fees, attendance) and AI-powered assistants for teachers and students.

### Who is it for?
- Institutions and multi-campus groups
- Campus administrators and coordinators
- Teachers and support staff
- Students (and parents, read-only where applicable)

### Key outcomes
- Better learning outcomes through Bloom-aligned curriculum, mastery analytics, and meaningful grading
- Higher engagement via rewards, leaderboards, learning journeys, and social communication
- Operational efficiency across enrollment, fee management, attendance, messaging, and reports

---

### Architecture & Foundations (implemented)
- Web app: Next.js App Router (src/app) with role-based portals for admin, campus-admin, teacher, and student
- API layer: tRPC endpoints (src/app/api/trpc, additional API routes for challans, reports, files)
- Data: Prisma with Postgres; analytics and feature-specific Prisma schemas (e.g., teacher-assistant, analytics, question usage)
- Content: H5P editor/manager/player (src/app/h5p-*) for interactive content
- AI runtime: AIVY multi-agent orchestration (src/features/agents, teacher-assistant, student-assistant) with memories and specialized tools
- Security & compliance: Role-based access, audit logging, consent/retention, message privacy engines; row-level security policies in SQL; FERPA-aligned safeguards
- Multi-tenant & hierarchy: Institution → Campus → Classes; coordinator and campus-admin portals; institutional URLs supported
- Internationalization (i18n) & RTL: implementation docs and runtime support present
- Offline support: teacher-offline and coordinator offline capabilities for unreliable connectivity
- Notifications & messaging: messaging hub with channels and UI components

---

### Core product pillars
- Teach: Activities, assessments, rubric grading, content studio, lesson plans, class management
- Learn: Student portal with activities, calendar, resources, achievements, points
- Administer: Enrollment, fees (structures, discounts, challans, late fees), attendance, reporting
- Engage: Rewards, levels, achievements, leaderboards, social wall, communications
- Analyze: Gradebook, Bloom analytics, topic mastery, dashboards and reports

---

### Implemented modules (high level)
- Enrollment & Fee Management: fee structures, discounts, challans/invoices, late fee policies, financial reports
- Attendance: teacher and student attendance components; standardization work under docs/componentsrevamp/attendance*
- Activities & Assessments: unified activity data structure, assessment types (including quiz/essay), manual and rubric grading
- Question Bank: banked items with Bloom mapping, authoring and reuse workflows, analytics on usage
- Curriculum & Outcomes: Bloom alignment, rubric templates, topic mastery analysis, lesson plan tooling
- Gradebook & Reports: consolidated grading, class/term results, teacher performance views
- Resources & Content Studio: interactive H5P content authoring/management and resource distribution
- Calendar: unified system calendar with personal calendars for roles; campus-level calendar
- Messaging & Notifications: communications hub for teacher/student portals; privacy and moderation controls
- Rewards & Gamification: points, levels, achievements; student-facing achievements and leaderboard
- AI Assistants (AIVY): Teacher Assistant (planning, assessment support), Student Companion (study guidance, retrieval, nudges)
- Compliance & Privacy: FERPA-oriented engines, consent/retention, audit logs
- Internationalization & RTL: developer and testing guides; runtime support
- Offline modes: teacher/coordinator offline workflows

---

### User portals & roles (implemented routes)
- Institution/System Admin: /admin (system setup, academic/campus, fee/enrollment configuration)
- Campus Admin: /(dashboard)/campus-admin with calendar and campus oversight
- Coordinator: coordinator portal modules (with offline support and implementation docs)
- Teacher: /teacher (dashboard, classes, content studio, communications, calendar/schedule, learning patterns)
- Student: /student (activities, calendar, grades, resources, communications, points, achievements)
- Parent (optional read-only): /parent dashboard exists for select use cases

---

### Data, analytics, and mastery
- Bloom analytics and topic mastery reports (docs/features, bloom/*)
- Gradebook integration and scoring with rubrics
- Teacher and class performance dashboards; assessment dashboards

### Extensibility
- H5P content ecosystem; social wall; notifications; real-time sockets; pluggable agent tools

### Current status
- Alpha complete: above modules are implemented in the working codebase and internal builds
- Next: hardening, UI polish, marketing site content, and GA onboarding collateral

