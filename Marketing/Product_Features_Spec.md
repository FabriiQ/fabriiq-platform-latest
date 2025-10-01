## FabrriQ AI — Product Features Specification (Marketing Overview)

### Scope
Unified SIS + LXP supporting multi-campus operations, teacher classroom tools, student portal (offline-ready), and analytics.

### 1) Curriculum Management
- Structure: Subject → Units/Topics → Learning Outcomes → Criteria
- Bloom Analytics: tag outcomes to Bloom levels; visualize distribution and mastery
- Rubrics: criteria with weightings and descriptors; reusable templates
- Content mapping: link activities and assessments to outcomes and rubrics
- Versioning: draft → review → publish; change log

### 2) Enrollment System
- Flows: self-serve application, admin-assisted enrollment, bulk imports
- Student profiles: demographics, guardians, docs (Supabase storage)
- Class assignment: class-based workflow replacing standalone student tab
- Documents & approvals: status tracking, e-sign support (future)
- Invoices tab: download/share via Supabase storage; archiving & partitioning

### 3) Fee Management
- Fee structures: tuition, transport, custom components; recurring and one-time
- Discounts: recurring and single-time; per-student or cohort
- Late fee policies: unified configuration page (/admin/system/fee-management/unified)
  - Currency: Middle East/Asia/SEA presets + custom symbol
  - Due date settings editable and applied globally
  - Automated late fee rules + manual policy selection
- Receipts: generation and storage; share & print chalan
- Financial reports: collections, aging, revenue by campus/class

### 4) Attendance Management
- Class-based workflow: on class selection, show bulk and per-student options
- Offline-first capture for teachers with sync on reconnect
- Analytics: attendance trends, anomalies, per-student heatmaps

### 5) Activities & Assessments
- Activities: assignments, projects, quizzes, observations
- Assessments: rubric-based, auto-calculated scores by criteria
- Feedback: qualitative comments, evidence files (Supabase)
- Rewards: badges/points integrated into class leaderboard

### 6) Reports & Analytics
- Real-time dashboards: class, cohort, campus
- Bloom analytics: outcome coverage, mastery by Bloom level
- Finance: fee collection, dues, discounts impact
- Attendance: compliance, punctuality, absence reasons
- Exports: CSV/PDF; schedule email reports; role-based access

### 7) Multi-Campus Management
- Campus hierarchy; program/class structures per campus
- Data partitioning and archiving for large invoice volumes
- Cross-campus rollups for academics, attendance, finance
- Role-based access with campus scoping

### 8) Learning Experience Platform (LXP)
- Content: lessons, resources, playlists mapped to outcomes
- Learning path: personalized recommendations
- Time-on-task tracking; learning time investment analytics
- Social learning: posts, comments; moderation hooks

### 9) Teacher Portal & Classroom Tools
- Class overview: roster, schedule, upcoming activities, quick insights
- Tools: attendance, activities, assessments, rewards, announcements
- Class reports: progress, mastery, Bloom analytics; export/share
- Leaderboard: configurable rules; celebrate achievements
- Classroom UX: upload dialogs (not separate pages) for files (Supabase)

### 10) Student & Parent Portal
- Student: achievements, goals, time investment, progress by outcomes
- Offline support: work and view content offline; background sync
- Psychology-informed nudges: streaks, goals, reminders (ethical design)
- Social media wall: class/community posts with safe moderation
- Parent view: attendance, grades, fees, notifications

### 11) Security, Permissions, and Compliance
- Role-based access (student, parent, teacher, admin, finance)
- Audit logs; consent tracking for guardians
- Data residency awareness; privacy controls

### 12) Integrations & Platform
- Supabase: auth, RLS policies, storage for documents/media
- Notifications: email/SMS/in-app; actual notifications, not mock
- Localization: currencies and RTL readiness
- API: webhooks for enrollment/fees events

### Non-Functional Notes
- Performance: real-time charts and visualizations; offline caching
- Reliability: retries, conflict resolution on sync
- Accessibility: WCAG compliant

