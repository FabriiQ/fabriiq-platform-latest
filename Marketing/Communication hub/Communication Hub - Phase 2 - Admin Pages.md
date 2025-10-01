# Communication Hub — Phase 2: Admin Portals (Week 2-3)

Objective
- Provide compliance and communications management views for System Admin and Campus Admin.
- Surface non-AI moderation, compliance stats, and campus-level controls.

Scope
- System Admin Compliance Dashboard page
- Campus Admin Communication Hub page
- Shared ComplianceDashboard and Moderation components

Key References
- Compliance-First Communication Architecture.md: “Compliance Dashboard Integration”, UI sketches
- Technical Plan.md: “2.1 System Admin Compliance Dashboard”, “2.2 Campus Admin Communication Management”, “2.3 Compliance Dashboard Components”

Tasks
1) System Admin Compliance Page
- Route: /system-admin/compliance
- Component scaffold using SystemAdminLayout
- Sections: ComplianceOverviewGrid, ComplianceDashboard(scope=system-wide), ModerationPanel(scope=all-campuses), ComplianceAnalytics

2) Campus Admin Communications Page
- Route: /campus-admin/communications
- Component scaffold using CampusAdminLayout
- Sections: CampusCommunicationStats, CampusCommunicationHub, CampusModerationPanel

3) Compliance Dashboard Component
- src/features/compliance/components/ComplianceDashboard.tsx per Technical Plan code
- Use new messaging router: api.messaging.getComplianceStats.useQuery({ scope, campusId, classId })
- Integrate with existing tRPC patterns from social wall: follows same query/mutation patterns
- Sub-components: ComplianceMetric, ComplianceBreakdown, RecentComplianceActivity, ComplianceAlerts
- Reuse existing UI components from social wall moderation where applicable

4) Permissions & Navigation
- Add menu items into existing Admin layouts, guarded by RBAC
- Ensure routes hidden when messaging feature flag disabled

Acceptance Criteria
- Both pages render under correct roles and feature flag
- ComplianceDashboard shows mocked or real stats without errors
- ModerationPanel integrates with message moderation queue

Test Plan
- Cypress/Playwright: role-based navigation to pages
- Component tests for ComplianceDashboard with mocked API
- Snapshot test for page scaffolds

Risks & Mitigations
- API availability: fall back to skeleton loaders and error states
- Permissions drift: centralize RBAC checks and add unit tests

