# FabriiQ LXP — Systemwide Compliance Status, Gaps, and Impact Analysis

## Executive Summary

FabriiQ has begun implementing unified GDPR, PDPL, and FERPA compliance. Two areas are partially implemented: personal resources storage and core messaging safeguards. This document consolidates current status, maps completed items to the compliance framework, identifies remaining systemwide work, and outlines business/technical impact with prioritized actions.

Status snapshot (as of 2025-09-24):
- Completed/Operational (targeted scope): Personal resources storage compliance baseline; foundational messaging safeguards; System Admin Compliance dashboard route; Consent API router (get/capture/withdraw); first-login consent modal for existing users.
- In progress/Planned: Full consent rollout (cookie banner, policy versioning, broader middleware gating), user rights portal, enhanced audit and FERPA disclosures, breach response, PDPL data localization.
- Overall readiness: 60/100 (target 95/100 after Phase 4 per `implementation-plan.md`).

## Scope and References
- Primary framework: `docs/future-development/compliance/`
- Detailed baseline: `personal-resources-compliance.md`
- Planning baselines: `current-state-analysis.md`, `gap-analysis.md`, `implementation-plan.md`, `task-list.md`, `technical-specifications.md`

## What’s Done (Mapped to Framework)

### 1) Personal Resources Storage (Complete — targeted scope)
- Private bucket storage with user isolation; signed URLs; RLS.
- Encryption in transit (TLS 1.3); AES-256 at-rest declared for storage layer.
- Audit trail structure defined and logging enabled for upload/access/delete.
- Retention scaffolding (7-year FERPA baseline + GDPR deletion flow) defined with controls.
- User rights hooks: list/export/update/delete for personal resources.

Framework alignment:
- GDPR: Art. 5, 6, 17, 20, 25, 30, 32 (partially met at feature scope).
- PDPL: Consent/security safeguards partially covered at feature scope.
- FERPA: Retention baseline and access controls at resource scope.

Gaps remaining (systemwide):
- Centralized consent registry; cross-service enforcement.
- Unified audit correlation across services and data categories.
- Automated retention execution beyond personal-resources domain.

### 2) Messaging Privacy/Safety (Foundational — partial)
- Role-scoped access; profanity/media type filtering; private storage for media; basic audit logging (send/read). 
- No public directory exposure of minors; teacher-parent boundaries enforced via RBAC.

Framework alignment:
- GDPR/PDPL: Secure processing and minimization partially covered.
- FERPA: Educational record treatment for message attachments not yet classified; disclosure logging incomplete.

Gaps remaining (systemwide):
- Consent checks for optional analytics/notifications.
- Education record classification for message content/attachments; disclosure logs.
- Retention schedules and legal hold for investigations.

## What’s Needed to be Systemwide-Ready

The following consolidate and tailor items from `gap-analysis.md` and `implementation-plan.md` to reflect current partial implementations.

### A. Consent & Privacy Notices (Critical)
- Implement unified Consent Service and DB schema across all entry points (registration, cookies, analytics, marketing). 
- Age-based flows and parental consent (<18 configurable by market). 
- Withdrawals, history, policy version linkage, and enforcement middleware on APIs/UI.

Dependencies: DB migrations; UI consent wizard; policy versioning; legal review.

### B. User Rights Platform (Critical)
- Rights portal: access, export (JSON/PDF/CSV), rectify, delete/erasure with FERPA-safe exceptions.
- Request tracking SLAs; identity verification; admin workflows.
- Data inventory completion to guarantee full export coverage.

Dependencies: Data mapping completion; audit coverage; export services.

### C. Enhanced Audit & FERPA Disclosure Logs (High)
- Standardize audit schema across services; include dataSubjectId, dataCategories, processingActivityId, legalBasis, consentId.
- FERPA disclosure logging for educational records (recipient, purpose, legitimate interest, consent reference).
- Reporting API and admin UI for audits/compliance.

Dependencies: Data classification; service instrumentation; storage scaling.

### D. Breach Detection & Incident Response (Critical)
- Anomaly detection and alerting; incident classification; 72-hour regulator/user notifications.
- Playbooks, templates, and immutable incident records; evidence retention.

Dependencies: Centralized logging/metrics; on-call runbooks; legal sign-off.

### E. Data Retention & Secure Deletion (High)
- Policy table by data category; automatic job-based enforcement; pre-deletion user notifications.
- Selective deletion with FERPA-protected academic record carve-outs.
- Secure deletion and backup purge; legal hold support.

Dependencies: Data catalog; background jobs; storage APIs; backup lifecycle.

### F. PDPL Regionalization & Transfers (High/Critical by market)
- Regional data residency configuration (KSA priority), migration tooling.
- Cross-border transfer assessments; SCCs/adequacy validation; transfer logs.

Dependencies: Cloud/provider capabilities; tenant routing; contract updates.

### G. Educational-Specific Controls (FERPA) (High)
- Directory information classification + opt-out and policy UX.
- Parental rights flows and 18+ rights transfer; parental dashboards.
- Educational record classification across features (grades, assessments, messages/attachments), with privileged access controls.

Dependencies: Data taxonomy; UI controls; RBAC policies; disclosure logs.

## Impact Analysis

### Legal/Regulatory Impact
- EU markets blocked without consent/user-rights and breach response. 
- KSA institutions require data localization; non-compliance blocks sales/deployment.
- US institutions require FERPA disclosure logs, directory opt-outs, and parental rights.

### Product/UX Impact
- Registration adds consent steps and age checks (slight friction, higher trust).
- New dashboards for rights, audits, and privacy settings.
- Cookie banner and preferences; periodic policy acceptance prompts.

### Engineering Impact
- Cross-cutting DB migrations and services (consent, audit, retention). 
- Middleware integration across API routes; classification of data entities.
- Observability uplift (logs/metrics), background processors, storage lifecycle.

### Operational Impact
- On-call incident response readiness and training.
- Legal and customer success workflows for rights requests and disclosures.
- Vendor contract updates for cross-border transfers.

### Performance/Cost Impact
- Expected <5% overhead from additional checks/logging (per plan). 
- Storage growth from immutable audit/disclosure logs; budget for regional replicas.
- Infra spend for monitoring, key management, and data residency.

## Systemwide Readiness Checklist (Actionable)

- [x] Deploy unified Consent Service, DB tables, and UI flows platform-wide. (Base API + first-login modal shipped; broader rollout pending)
- [x] Add System Admin Compliance dashboard page and navigation entry.
- [ ] Gate analytics/marketing/cookie processing on consent middleware.
- [x] Roll out cookie banner with consent capture for 'cookies'.
- [ ] Launch User Rights portal (access/export/rectify/erase with FERPA exceptions).
  - [x] User data export (JSON) for Admin via rights API and UI.
- [ ] Complete data catalog and category tagging across all entities and files.
- [ ] Instrument Enhanced Audit fields across APIs, including consent changes.
- [ ] Implement FERPA Disclosure Logs and directory info opt-out flows.
- [ ] Implement retention policies and secure deletion + backup purge.
- [ ] Stand up breach detection, on-call runbooks, and notification templates.
- [ ] Enable PDPL regional data residency (KSA) with migration tooling.
- [ ] Roll out privacy policy versioning, acceptance tracking, cookie banner.
- [ ] Staff training: developers, support, and incident response.

## Mapping to Existing Plans
- Direct alignment with Phase 1–4 milestones in `implementation-plan.md`.
- Mirrors `task-list.md` critical path: Schema → Consent → Rights → Audit → Breach → Localization.
- Refines `gap-analysis.md` with concrete coverage from personal resources and messaging.

## Risks and Mitigations
- Schema changes across services → Plan staged migrations and backfills; feature flags.
- Performance regressions from audit/consent checks → Cache consents; batch audit writes.
- Data classification errors → Introduce data taxonomy tests and owner reviews.
- Legal misalignment → Maintain recurring counsel review and policy updates.

## Next Steps (Immediate)
1. Approve DB migrations for consent, audit, and processing activities.
2. Implement consent middleware in top-5 data processing endpoints.
3. Ship rights portal MVP (read/export) while classification completes.
4. Begin FERPA disclosure logging for assessment and messaging records.
5. Kick off PDPL residency design and vendor feasibility.

---

Last Updated: 2025-09-24
Owner: Compliance Engineering
 
## Status Matrix — What’s Done vs Remaining
 
| Area | Done | Remaining | How We’ll Implement |
|---|---|---|---|
| Personal resources storage | Private buckets, RLS, signed URLs, audit, retention scaffolding | Central consent enforcement; cross-service audit; global retention automation | Reuse storage patterns; add consent middleware and shared audit service |
| Messaging safeguards | RBAC boundaries; private media; basic audit | Educational-record classification; disclosure logs; retention/legal hold | Classify attachments; add FERPA disclosure model and UI; retention jobs |
| Consent management | — | Unified consent DB/service; UI wizard; cookie banner; withdrawals | Add `UserConsent` tables; `ConsentService`; middleware on sensitive endpoints; banner |
| User rights | Exports exist in places | Rights portal (access/export/rectify/erase w/ FERPA exceptions) | Build `DataAccessService` + portal; admin review for rectification |
| Audit & monitoring | Basic audit present | Enhanced fields; FERPA disclosure logs; reports | Implement `ComplianceAuditService`; standardized schema; reporting UI |
| Breach response | — | Detection, workflows, notifications | Add detection jobs; incident playbooks; notification templates |
| Retention/deletion | Resource-level plan | Policy table; secure deletion; backup purge; legal hold | Policy engine + jobs; verify storage and backup lifecycle |
| PDPL localization | — | KSA residency; transfer controls/logs | Tenant residency config; regional storage; transfer assessment records |
| FERPA specifics | — | Directory info opt-out; parental rights & 18+ handover | Directory info service; parental dashboards; age-based flow |

## Non-Breaking Rollout Plan
 
1) Feature-flag everything
 - Introduce per-tenant flags: `consent.enabled`, `audit.enhanced`, `ferpa.disclosure`, `retention.enforced`, `policy.versioning`, `pdpl.residency`.
 - Default OFF; enable in staging and pilot tenants first.
 
2) Backwards-compatible schema changes
 - Only additive columns/tables/indexes. No renames/drops during rollout.
 - Use nullable fields and safe defaults. Fill via background backfills.
 
3) Incremental API middleware adoption
 - Start with read-only endpoints (low risk), then writes for high-value domains (assessments, profiles, messaging), then the rest.
 
4) Dual-write audit logs (temporary)
 - Write to existing audit + new compliance audit; verify parity before switching reads.
 
5) Shadow validation without migrations
 - Since migrations are blocked, ship code that tolerates missing columns (try/catch + capability checks) until `db push` lands.
 
6) Staged enablement timeline
 - Week 1-2: Consent + policy (pilot). Week 3-4: Rights portal read/export. Week 5-6: Audit/disclosure. Week 7-8: Retention + breach. Week 9+: PDPL/FERPA advanced.

## Database Strategy — Prisma db push (No Data Loss)
 
Answer: Existing data will not be removed by design.
 - We will use additive schema changes only, executed via `prisma db push` (non-destructive sync) instead of migrations.
 - No table drops/renames; no required columns without defaults.
 - Pre-flight: backup DB; run `prisma validate` and `prisma db pull` to sync; dry-run `db push` in staging. 
 - Post-push: run idempotent backfill scripts to populate new columns (e.g., `legalBasis`, `processingActivityId`).
 
Safe `db push` checklist
 - [ ] Backup database and verify restore.
 - [ ] Ensure schema changes are additive/nullable with sensible defaults.
 - [ ] `prisma format` → `prisma validate` → `prisma generate`.
 - [ ] `prisma db pull` to align local schema with prod.
 - [ ] Apply `prisma db push --accept-data-loss` NEVER used; if prompted, redesign change.
 - [ ] Deploy code that tolerates missing columns (gradual rollout), then run `db push`.
 - [ ] Backfill with scripts guarded by feature flags.
 - [ ] Monitor error rates and audit write success.

## How We’ll Implement (Step-by-Step)
 
1. Schema (additive)
 - `UserConsent`, `DataProcessingActivity`, `EducationalRecordDisclosure` tables.
 - Extend `AuditLog` with nullable compliance fields.
 
2. Services
 - `ConsentService`, `ComplianceAuditService`, `DataAccessService`, `DirectoryInfoService`, `BreachDetectionService`, `RetentionPolicyEngine`.
 
3. Middleware/UI
 - API consent guard; privacy policy versioning and banner; rights portal; audit/disclosure admin UIs.
 
4. Ops/Process
 - Incident playbooks; DSR handling SOP; vendor transfer registry; staff training.

## Task List (Aligned to Rollout)
 
Phase 0 — Preparations
 - [ ] Add feature flags and tenant config for compliance features.
 - [ ] Draft DB additive schema in Prisma; lint and validate.
 - [ ] Create backfill job framework (idempotent, chunked).
 
Phase 1 — Consent & Policy
- [x] Add `UserConsent`/`DataProcessingActivity` models; `prisma db push`. (Models already present in schema)
- [x] Implement Consent API (get/capture/withdraw) and first-login consent modal for existing users.
- [x] UI: Cookie banner (accept/reject minimal).
- [ ] Policy versioning/acceptance tracking.
 
Phase 2 — Rights & Audit
 - [ ] Implement `DataAccessService` and rights portal (read/export first).
 - [ ] Extend `AuditLog` + `ComplianceAuditService` (dual-write).
 - [ ] Start backfill for audit fields; reporting UI.
 
Phase 3 — FERPA & Retention
 - [ ] `EducationalRecordDisclosure` + `DirectoryInfoService` + opt-out UX.
 - [ ] Retention policy engine + secure deletion + backup purge hooks.
 - [ ] Legal hold toggles and admin workflows.
 
Phase 4 — Breach & PDPL
 - [ ] `BreachDetectionService` + incident workflows + templates.
 - [ ] PDPL residency config + regional storage + transfer assessment logs.
 - [ ] Turn on enforcement flags per tenant after pilot sign-off.
