# Communication Hub — Phase 1: Core Infrastructure and Compliance Foundations (Week 1-2)

Objective
- Extend existing Social Wall data model to support messaging and compliance without breaking current features.
- Establish rule-based classification, consent verification, privacy engine (incl. FERPA), and audit logging foundations.

Scope
- Database schema extensions (Message, MessageRecipient, audit logs, retention policies)
- Rule-based classifier core
- Consent verification layer (stubs if needed)
- Privacy Engine (encryption, retention, audit hook) with FERPA protections
- Basic audit logging and retention scaffolding

Key References
- Compliance-First Communication Architecture.md: sections “Enhanced Data Model”, “Smart Message Classification Engine”, "Compliance Infrastructure", "Educational Record Protection (FERPA)"
- Technical Plan.md: sections “1.1 Database Schema Extensions”, “1.2 Rule-Based Message Classification Engine”

Tasks
1) Schema Extensions (reuse Social Wall base)
- prisma/schema.prisma: extend existing SocialPost model to support messaging:
  ```prisma
  model SocialPost {
    // ... existing fields

    // New messaging fields (additive only)
    messageType        MessageType?     @default(PUBLIC)
    threadId          String?
    parentMessageId   String?

    // Compliance fields
    consentRequired       Boolean      @default(false)
    consentObtained      Boolean      @default(true)
    legalBasis           LegalBasis   @default(LEGITIMATE_INTEREST)
    dataCategories       String[]     @default([])
    retentionPolicyId    String?
    encryptionLevel      EncryptionLevel @default(STANDARD)
    auditRequired        Boolean      @default(false)
    crossBorderTransfer  Boolean      @default(false)

    // Classification fields
    contentCategory      ContentCategory @default(GENERAL)
    riskLevel           RiskLevel    @default(LOW)
    flaggedKeywords     String[]     @default([])

    // Educational compliance
    isEducationalRecord         Boolean @default(false)
    directoryInformationLevel   DirectoryLevel @default(PUBLIC)
    parentalConsentRequired    Boolean @default(false)
    disclosureLoggingRequired  Boolean @default(false)

    // New relations
    messageRecipients   MessageRecipient[]
    messageAuditLogs   MessageAuditLog[]
    retentionPolicy    RetentionPolicy? @relation(fields: [retentionPolicyId], references: [id])
  }

  enum MessageType {
    PUBLIC
    PRIVATE
    GROUP
    BROADCAST
    SYSTEM
  }
  ```
- Create new models: MessageRecipient, MessageAuditLog, RetentionPolicy (aligned with existing AuditLog pattern)

2) Rule-Based Classifier Core
- src/features/messaging/core/RuleBasedClassifier.ts implementing classifyMessage(content, sender, recipients)
- Category/risk keyword dictionaries from Technical Plan
- Return: contentCategory, riskLevel, complianceLevel, isEducationalRecord, flaggedKeywords, moderationRequired, auditRequired

3) Consent Verification Layer
- src/features/compliance/ConsentService.ts with:
  - getUserConsentStatus(userId, dataCategory)
  - verifyMessageConsents(recipients, dataCategories) -> throws or returns matrix
- Integrate into message creation flow (service/controller)

4) Privacy Engine & FERPA Protection
- src/features/compliance/MessagePrivacyEngine.ts:
  - processMessage(message): classify compliance, verify consents, apply encryption by level, create audit entry, schedule retention
- src/features/compliance/FERPAComplianceEngine.ts:
  - detectEducationalRecords(content) and set isEducationalRecord, enforce encryptionLevel=EDUCATIONAL_RECORD, disclosureLoggingRequired=true, parentalConsentRequired for minors, log disclosures
- Wire into message creation/update pipeline

5) Basic Audit Logging & Retention with liner archiving
- src/features/compliance/AuditLogService.ts:
  - log(action, actorId, messageId, details)
- src/features/compliance/RetentionService.ts:
  - schedule(messageId, retentionPolicyId)
- Add DB tables if not present

6) Developer Docs
- docs/communication-hub/phase-1-setup.md: migration steps, env flags, toggle to disable messaging if needed

Acceptance Criteria
- Prisma compiles; migrations generate and apply locally
- Unit tests for RuleBasedClassifier with sample inputs
- ConsentService returns expected statuses for mock users
- PrivacyEngine applies encryption level and retention; FERPA engine flags educational records and creates disclosure logs
- Message creation flow rejects when consent missing and logs audit entries when succeed

Test Plan
- Run prisma generate/migrate
- Jest/Vitest unit tests for classifier, consent, and FERPA detection
- Integration test: create message with/without consent; verify audit log and retention scheduling; send educational-record content and verify FERPA protections

Risks & Mitigations
- Breaking Social Wall: use additive schema changes; feature flag `MESSAGING_ENABLED`
- Compliance gaps: log all decisions; add TODOs for Phase 2+ UI exposure

