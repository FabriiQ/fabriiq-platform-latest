# Compliance Dashboard — System Admin Implementation Notes

## Overview
A minimal, non-breaking System Admin dashboard is available at `/admin/system/compliance`. It renders the existing `ComplianceDashboard` and is role-gated to `SYSTEM_ADMIN`. Feature flags are not required for initial visibility.

## UI Entry Points
- Navigation: Added a `Compliance` entry under System Admin menu.
- Route: `src/app/admin/system/compliance/page.tsx` (client page, lazy-loads dashboard component).
- Component: `src/features/compliance/components/ComplianceDashboard.tsx`.

## Data Sources (v1)
- Uses existing API hooks from `api.messaging.*` for:
  - `getComplianceStats` (compliance and risk breakdowns)
  - `getRetentionStats` (scheduled deletions, due, processed)
- These queries should already be resilient; the dashboard displays loading/empty states if data is absent.

## Non-Breaking Principles
- Additive UI only; no changes to existing flows.
- Role guard ensures only `SYSTEM_ADMIN` can access.
- Client-only, lazy-loaded to reduce initial bundle.

## Next Increments (Optional)
- Wire enhanced audit once `ComplianceAuditService` is live.
- Add FERPA disclosure list view and filters.
- Add policy version acceptance stats once policy system is enabled.

## Testing Checklist
- [ ] System Admin can see the Compliance link and open the page.
- [ ] Page renders with loading states and without runtime errors.
- [ ] Charts render when API returns data; show fallbacks when empty.
- [ ] Non-admin users cannot access the route (render null).

## Files Touched
- `src/components/navigation/role-based-nav-items.tsx` (nav item)
- `src/app/admin/system/compliance/page.tsx` (page)
- `src/features/compliance/components/ComplianceDashboard.tsx` (already existed)
