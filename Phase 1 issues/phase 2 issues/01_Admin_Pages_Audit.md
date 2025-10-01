# Admin Pages Audit (Campus Admin + System Admin)

Last updated: 2025-08-08

## Executive Summary
- Fixed an immediate client/server boundary error on /admin/campus/students/new (details below).
- Found multiple inconsistencies across Campus Admin and System Admin areas, especially around Enrollment flows:
  - Client/server mixing on server pages (now resolved for the Students New page).
  - Inconsistent tRPC client imports ("@/utils/api" vs "@/trpc/react" vs "~/trpc/react").
  - Enrollment forms passing startDate as string while API expects Date.
  - UI components imported from different module paths (card/page-header variants).
  - Missing API for email availability check referenced in the student creation form.

## Immediate Fix Applied
- File: src/app/admin/campus/students/new/page.tsx
- Problem: Server component was importing React client hooks (useState) and client-only form utilities.
- Action: Trimmed imports to server-safe modules and delegated all client logic to StudentFormClient (which is a client component with "use client").

## Campus Admin – Key Pages

1) Dashboard
- Path: src/app/admin/campus/page.tsx
- Server component fetching user/campus context and rendering CampusAdminDashboardContent.
- Status: Looks correct for server-side usage.

2) Students
- New Student
  - Path: src/app/admin/campus/students/new/page.tsx (server) + ./student-form.tsx (client)
  - Observations:
    - page.tsx originally imported client hooks/utilities; now corrected.
    - StudentFormClient uses fetch('/api/users/validate-email?...') but such route is missing (gap).
    - Uses api.user.createStudent mutation; appears aligned with server validation service.
    - Imports generateEnrollmentNumber from '@/utils/enrollment-number' but does not use it (cleanup suggested). Also note there is a separate server-side generator with a different format.

- Enroll Existing Student (per-student)
  - Path: src/app/admin/campus/students/[id]/enroll/page.tsx (+ enrollment-form.tsx client)
  - Observations:
    - Form sends startDate as string in some flows; in this form, it converts to Date before calling api.enrollment.createEnrollment (good). It also passes a 'notes' field to the mutation, which the router does not accept (inconsistency; see Enrollment section).

3) Enrollment
- List and New Enrollment (bulk/single)
  - Paths:
    - src/app/admin/campus/enrollment/page.tsx (server) + ./client.tsx (client)
    - src/app/admin/campus/enrollment/new/page.tsx (server) + ./enrollment-form.tsx (client)
  - Observations:
    - New enrollment client form passes startDate as string directly to api.enrollment.createEnrollment and bulkEnroll, which expect Date per zod schema. This will cause validation errors or runtime issues.
    - The same form sends 'notes' to createEnrollment, but the router input does not include 'notes'.

4) Classes – Enroll Students
- Path: src/app/admin/campus/classes/[id]/enroll-students/page.tsx (client)
- Observations:
  - Uses api from '@/trpc/react' (different import path than other pages using '@/utils/api'). Works, but inconsistent.

## System Admin – Key Pages

1) System Dashboard
- Path: src/app/admin/system/page.tsx
- Server component; uses caching services. Looks fine.

2) Campuses – Create / Edit / Students / Enroll
- Paths include:
  - src/app/admin/system/campuses/new/page.tsx (server)
  - src/app/admin/system/campuses/[id]/edit/page.tsx (server)
  - src/app/admin/system/campuses/[id]/students/page.tsx (server)
  - src/app/admin/system/campuses/[id]/students/new/page.tsx (server)
  - src/app/admin/system/campuses/[id]/students/enroll/page.tsx (client)
- Observations:
  - The enroll page uses EnrollStudentDialog with proper Date types (good).
  - Mixed component module paths for UI atoms (page-header) across files.

3) Background Jobs
- Path: src/app/admin/system/background-jobs/page.tsx (server)
- Appears consistent.

## Inconsistencies & Gaps (Detailed)

1) Client/Server Boundaries
- Issue: Server pages must not import client hooks (useState, useEffect), react-hook-form, or client-only components.
- Evidence: src/app/admin/campus/students/new/page.tsx originally imported useState and form libs. Fixed.
- Risk: Next.js build errors and hydration issues.
- Action: Audited key pages; recommend spot-checking others during development.

2) tRPC Client Import Paths
- Issue: Mixed usage:
  - '@/utils/api'
  - '@/trpc/react'
  - '~/trpc/react'
- Impact: Confusion, potential duplication of clients/providers, harder onboarding.
- Recommendation: Standardize on a single path (prefer '@/trpc/react') and refactor usages.

3) Enrollment API Contract vs Forms
- Issue A: startDate type mismatch.
  - Router expects z.date() (Date object). Some forms send string (e.g., campus enrollment/new/enrollment-form.tsx).
  - Impact: Zod validation failure or implicit conversion bugs.
  - Recommendation: Convert to Date in onSubmit (new Date(data.startDate)) or switch form field to Date type and ensure it returns Date.

- Issue B: Extra 'notes' field.
  - Client passes 'notes' to createEnrollment but router input excludes it.
  - Options: Either drop 'notes' from payload or extend router/schema to accept and persist notes.

4) Email Validation Endpoint Missing
- Issue: StudentFormClient calls /api/users/validate-email, but no such Next.js route exists.
- Impact: UX degrades; extra error toast; cannot preemptively block duplicates.
- Recommendation: Implement GET /api/users/validate-email that returns { isAvailable: boolean } using Prisma to check existing non-deleted users by email.

5) Enrollment Number Generation Duplication
- Client utility: src/utils/enrollment-number.ts (format INST-CAMP-YYYY-NNNN; RNG-based)
- Server utility: src/server/utils/enrollment-number.ts (format INST-CAMP-YYYYMMDD-XXX; DB-sequenced)
- Issues:
  - Divergent formats can confuse users and developers.
  - Client import in StudentFormClient is unused.
- Recommendation: Use server-side generation as source of truth; remove/limit client generator to display-only or remove entirely. Consider exposing a tRPC helper to preview suggested number if needed.

6) UI Component Path Inconsistency
- Examples:
  - '@//components/ui/data-display/card' vs '@//components/ui/card'
  - '@//components/ui/page-header' vs '@//components/ui/atoms/page-header'
- Recommendation: Consolidate to a single canonical path per component.

## Recommended Fix Plan (High Priority)
1) Enrollment Form Type Fixes (Campus Admin)
- Update src/app/admin/campus/enrollment/new/enrollment-form.tsx to:
  - Convert startDate to Date before calling createEnrollment and bulkEnroll.
  - Remove 'notes' from payload or extend server schema to include notes.

2) Student Enroll Form (Per-student)
- Verify and standardize startDate handling (already converted in that form) and align with notes policy.

3) Implement Email Validation Route
- Path: src/app/api/users/validate-email/route.ts (GET)
  - Input: email (query string)
  - Output: { isAvailable: boolean }

4) Standardize tRPC Client Import
- Choose '@/trpc/react'; refactor Campus Admin pages currently using '@/utils/api'.

5) Clean Up Unused Imports
- Remove generateEnrollmentNumber import from StudentFormClient if not used.

6) UI Module Path Cleanup
- Create an alias decision and migrate imports.

## Suggested Next Steps
- Prioritize Enrollment fixes and validation route (user-facing correctness).
- Then run a codemod/sweep for tRPC client import standardization and UI component paths.
- Add unit/integration tests for enrollment.createEnrollment and bulkEnroll to verify correct types.

---
Prepared by: Augment Agent

