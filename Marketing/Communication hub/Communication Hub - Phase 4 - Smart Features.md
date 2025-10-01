# Communication Hub — Phase 4: Smart (Non-AI) Features (Week 4-5)

Objective
- Add non-AI smart features: contextual recipient suggestions and template-based composition, plus privacy notices and smart notification management.

Scope
- useContextualRecipients hook (rule-based)
- MessageTemplates component
- Intelligent Privacy Notice panel (static logic based on classifier/compliance profile)
- Smart Notification Preferences (time windows, priority routing)

Key References
- Technical Plan.md: “4.1 Context-Based Recipient Suggestions”, “4.2 Template-Based Message Composition”
- Compliance-First Communication Architecture.md: “Intelligent Message Composer”, “Intelligent Privacy Notices”, “Smart Notification Management”

Tasks
1) Contextual Recipient Suggestions
- src/features/messaging/hooks/useContextualRecipients.ts per plan
- Filter by role and current context (class/activity)

2) Template-based Composition
- src/features/messaging/components/MessageTemplates.tsx per plan
- Pre-defined templates by role; context filters for assignment/grade

3) Privacy Notices (Rule-Based)
- Component: PrivacyNoticePanel that reads compliance profile (from classifier + consent)
- Show: FERPA/GDPR/PDPL badges, encryption, audit, retention summary

4) Smart Notification Management
- Preferences model: emergency (always), academic (school hours), admin (batched), social (focus-mode off)
- Delivery methods toggles: in-app, email digest, SMS (emergency only)
- UI: NotificationPreferencesPanel and backend rules to route notifications

5) Integrate into Message Composer and Inbox
- Extend composer to show templates and privacy notice
- Add preferences entry point in inbox header and settings

Acceptance Criteria
- Suggestions vary with context and role
- Selecting a template populates composer body
- Privacy notice accurately reflects compliance profile
- Notifications respect preferences and priority rules in dev/test

Test Plan
- Unit: hooks and template filtering; notification routing rules
- Storybook: components with various props
- Integration: compose message flow, verify notifications queued per preferences

Risks & Mitigations
- Overly generic suggestions: add campus-configurable lists in later phases
- Template maintenance: centralize templates and add i18n keys
- Notification complexity: start with in-app + email digest; gate SMS behind config

