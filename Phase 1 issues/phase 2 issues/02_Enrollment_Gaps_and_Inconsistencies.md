# Enrollment Gaps and Inconsistencies

Last updated: 2025-08-08

## Summary
This document highlights enrollment-related inconsistencies across Campus Admin and System Admin sections and recommends precise changes.

## API Contracts vs Client Payloads

### createEnrollment (tRPC: enrollment.createEnrollment)
- Router input (zod):
  - studentId: string
  - classId: string
  - startDate: Date (z.date())
  - endDate?: Date
  - status?: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'WITHDRAWN'
  - createdById: string
- Return: Enrollment record (no wrapper {success: ...})

Issues:
- Some clients pass startDate as string instead of Date
  - File: src/app/admin/campus/enrollment/new/enrollment-form.tsx
    - onSubmitSingle and onSubmitBulk pass data.startDate (string)
- Some clients pass an extra 'notes' field, not in schema
  - File: src/app/admin/campus/students/[id]/enroll/enrollment-form.tsx
    - onSubmit passes notes

Recommendations:
- Convert string to Date in client submitters:
  - Example: startDate: data.startDate ? new Date(data.startDate) : new Date()
- Decide on 'notes' support:
  - Option A (fast): remove notes from client payloads
  - Option B (full): extend router/schema and DB to store enrollment notes

### bulkEnroll (tRPC: enrollment.bulkEnroll)
- Router input requires startDate: Date
- Same string-vs-Date issue exists in src/app/admin/campus/enrollment/new/enrollment-form.tsx

Recommendation:
- Convert startDate string to Date before calling mutate.

## Missing Email Validation API
- Client usage: src/app/admin/campus/students/new/student-form.tsx calls GET /api/users/validate-email?email=...
- Missing route implementation.

Recommendation:
- Add Next.js route at src/app/api/users/validate-email/route.ts (GET):
  - Validate email input
  - Query Prisma user where email matches and status != 'DELETED'
  - Return { isAvailable: boolean }

## Enrollment Number Utilities Duplication
- Server: src/server/utils/enrollment-number.ts (DB-aware, canonical; format INST-CAMP-YYYYMMDD-XXX)
- Client: src/utils/enrollment-number.ts (RNG/time-based; format INST-CAMP-YYYY-NNNN)

Risks:
- Divergent formats confuse users; potential non-unique numbers if client result is saved elsewhere.

Recommendations:
- Treat server-side generator as source of truth; remove client-side generator or keep only for ephemeral display.
- If preview needed, expose server helper via tRPC to fetch a suggested number.

## Inconsistent tRPC Client Imports
- Observed imports:
  - import { api } from '@/utils/api'
  - import { api } from '@/trpc/react'
  - import { api } from '~/trpc/react'

Recommendation:
- Standardize on '@/trpc/react' and refactor other imports.

## UI Module Path Inconsistencies
- card/page-header components imported from different paths across admin pages.

Recommendation:
- Define canonical import paths and migrate usages.

## Actionable To-Do List
1) Fix startDate type in campus enrollment new form (single & bulk)
2) Decide and implement policy for 'notes' (drop or add to schema+DB)
3) Implement /api/users/validate-email (GET)
4) Remove unused generateEnrollmentNumber import from StudentFormClient
5) Standardize api client imports to '@/trpc/react'
6) Consolidate UI component import paths

---
Prepared by: Augment Agent

