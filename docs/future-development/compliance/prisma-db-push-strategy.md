# Prisma db push Strategy — Additive, Non-Destructive Schema for Compliance

## Context
- No signup flow; accounts are created by admin. Consent capture starts with admin-created accounts (policy acceptance + cookie banner at first login) rather than registration.
- Shadow DB issues prevent using Prisma Migrate safely; we will use `prisma db push` with strictly additive changes.

## Principles
- Additive only: new tables/columns/indexes; no drops/renames; required fields must have defaults or be nullable.
- Backwards compatible: code tolerates columns not present yet (capability checks) until push completes.
- Data safety: never use `--accept-data-loss`; perform backups and dry-runs.

## Minimal Models (Additive)
Add the following to `schema.prisma` (names align with earlier docs):

```prisma
model UserConsent {
  id                 String   @id @default(cuid())
  userId             String
  consentType        String   // 'essential' | 'analytics' | 'marketing' | 'cookies'
  consentGiven       Boolean
  consentDate        DateTime @default(now())
  withdrawalDate     DateTime?
  legalBasis         String?  // 'consent' | 'contract' | 'legitimate_interest'
  processingPurpose  String?
  ipAddress          String?
  userAgent          String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([userId, consentType])
  @@map("user_consents")
}

model DataProcessingActivity {
  id                String   @id @default(cuid())
  activityName      String   @unique
  processingPurpose String
  legalBasis        String
  dataCategories    String[]
  retentionPeriod   String   // ISO 8601 duration
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("data_processing_activities")
}

model EducationalRecordDisclosure {
  id             String   @id @default(cuid())
  studentId      String
  disclosedTo    String
  disclosureDate DateTime @default(now())
  disclosurePurpose String
  legitimateEducationalInterest String
  recordsDisclosed String[]
  consentRequired Boolean
  consentObtained Boolean?
  method         String   // 'SYSTEM_ACCESS' | 'EXPORT' | 'VERBAL' | 'WRITTEN'
  createdAt      DateTime @default(now())

  @@index([studentId, disclosureDate])
  @@map("educational_record_disclosures")
}

// Extend existing audit model additively (example fields)
// model AuditLog { ... existing ...
//   dataSubjectId       String?
//   processingActivityId String?
//   legalBasis          String?
//   consentId           String?
//   dataCategories      String[]
//   accessReason        String?
// }
```

## Safe Rollout Steps
1. Backup database and validate restore.
2. `npx prisma format && npx prisma validate && npx prisma generate`.
3. `npx prisma db pull` to sync local with production.
4. Apply changes locally; deploy code that tolerates missing columns (try/catch, optional selects).
5. Run `npx prisma db push` in staging, then production during low-traffic window.
6. Run idempotent backfills (small batches):
   - Populate `DataProcessingActivity` rows.
   - Annotate recent `AuditLog` with `legalBasis` where determinable.
7. Turn on feature flags per-tenant after verification.

## Admin-Created Accounts — Consent Handling
- On first login, show consent wizard and policy acceptance. Store `UserConsent` records.
- Cookie banner active for all; analytics/marketing scripts gated by consent middleware.
- No data deletion occurs by default; user rights flows will handle erasure/export upon request.

## Reversibility
- Since changes are additive, rollback is code-level (hide features) or drop unused tables later via proper maintenance window (not during rollout).

## Monitoring
- Track error rates around new queries; alert on missing table/column errors.
- Audit logs should capture consent changes and disclosures once services are enabled.
