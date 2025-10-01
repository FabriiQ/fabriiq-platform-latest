/**
 * Compliance Audit Service
 * Centralized service for GDPR, PDPL, and FERPA compliance audit logging
 * 
 * Integrates with existing audit systems:
 * - AuditLog (general audit logging)
 * - ConsentAuditLog (GDPR consent tracking)
 * - FerpaDisclosureLog (FERPA educational records)
 * - MessageAuditLog (communication audit)
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ComplianceAuditEntry {
  userId: string;
  campusId?: string;
  action: 'upload' | 'download' | 'delete' | 'access' | 'share' | 'modify';
  entityType: 'personal_resource' | 'educational_record' | 'user_data' | 'communication';
  entityId: string;
  complianceStandards: ('GDPR' | 'PDPL' | 'FERPA')[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  legalBasis?: 'consent' | 'legitimate_interest' | 'educational_purpose';
  dataCategories?: string[];
}

export interface FerpaDisclosureEntry {
  studentId: string;
  messageId: string;
  disclosedTo: string[];
  disclosurePurpose: string;
  legitimateEducationalInterest: string;
  recordsDisclosed: string[];
  consentRequired: boolean;
  consentObtained: boolean;
  disclosureMethod: string;
}

export interface ConsentAuditEntry {
  userId: string;
  action: 'granted' | 'withdrawn' | 'updated' | 'requested';
  dataCategories: string[];
  legalBasis?: 'consent' | 'legitimate_interest' | 'educational_purpose';
  purpose?: string;
  jurisdiction?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class ComplianceAuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log general compliance audit entry
   */
  async logComplianceAction(entry: ComplianceAuditEntry): Promise<void> {
    try {
      // Log to general audit log
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          campusId: entry.campusId || 'system',
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          changes: undefined,
          metadata: {
            complianceStandards: entry.complianceStandards,
            legalBasis: entry.legalBasis,
            dataCategories: entry.dataCategories,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
            ...entry.metadata,
          },
        },
      });

      // Log to application logger for monitoring
      logger.info('Compliance audit logged', {
        type: 'compliance-audit',
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        complianceStandards: entry.complianceStandards,
      });

    } catch (error) {
      logger.error('Failed to log compliance audit', {
        error,
        entry
      });
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Log FERPA educational record disclosure
   */
  async logFerpaDisclosure(entry: FerpaDisclosureEntry): Promise<void> {
    try {
      await this.prisma.ferpaDisclosureLog.create({
        data: {
          studentId: entry.studentId,
          messageId: entry.messageId,
          disclosedTo: entry.disclosedTo,
          disclosureDate: new Date(),
          disclosurePurpose: entry.disclosurePurpose,
          legitimateEducationalInterest: entry.legitimateEducationalInterest,
          recordsDisclosed: entry.recordsDisclosed,
          consentRequired: entry.consentRequired,
          consentObtained: entry.consentObtained,
          disclosureMethod: entry.disclosureMethod,
        },
      });

      logger.info('FERPA disclosure logged', {
        type: 'ferpa-disclosure',
        studentId: entry.studentId,
        disclosedTo: entry.disclosedTo,
        purpose: entry.disclosurePurpose,
      });

    } catch (error) {
      logger.error('Failed to log FERPA disclosure', {
        error,
        entry
      });
    }
  }

  /**
   * Log GDPR consent action
   */
  async logConsentAction(entry: ConsentAuditEntry): Promise<void> {
    try {
      await this.prisma.consentAuditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          dataCategories: entry.dataCategories,
          legalBasis: entry.legalBasis as any,
          purpose: entry.purpose,
          jurisdiction: entry.jurisdiction,
          reason: entry.reason,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });

      logger.info('Consent action logged', {
        type: 'consent-audit',
        userId: entry.userId,
        action: entry.action,
        dataCategories: entry.dataCategories,
      });

    } catch (error) {
      logger.error('Failed to log consent action', {
        error,
        entry
      });
    }
  }

  /**
   * Log personal resource access for compliance
   */
  async logPersonalResourceAccess(
    userId: string,
    resourcePath: string,
    action: 'upload' | 'download' | 'delete' | 'access',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logComplianceAction({
      userId,
      action,
      entityType: 'personal_resource',
      entityId: resourcePath,
      complianceStandards: ['GDPR', 'PDPL', 'FERPA'],
      legalBasis: 'educational_purpose',
      dataCategories: ['educational_content', 'personal_files'],
      metadata: {
        resourcePath,
        ...metadata,
      },
    });
  }

  /**
   * Log educational record access for FERPA compliance
   */
  async logEducationalRecordAccess(
    studentId: string,
    recordId: string,
    action: 'access' | 'modify' | 'share',
    accessedBy: string,
    purpose: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logComplianceAction({
      userId: accessedBy,
      action,
      entityType: 'educational_record',
      entityId: recordId,
      complianceStandards: ['FERPA'],
      legalBasis: 'educational_purpose',
      dataCategories: ['educational_records', 'student_data'],
      metadata: {
        studentId,
        recordId,
        purpose,
        ...metadata,
      },
    });
  }

  /**
   * Get compliance audit trail for a user
   */
  async getUserComplianceAuditTrail(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    entityType?: string
  ) {
    const whereClause: any = {
      userId,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    if (entityType) {
      whereClause.entityType = entityType;
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent large queries
    });

    return auditLogs;
  }

  /**
   * Get FERPA disclosure history for a student
   */
  async getStudentFerpaDisclosures(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const whereClause: any = {
      studentId,
    };

    if (startDate || endDate) {
      whereClause.disclosureDate = {};
      if (startDate) whereClause.disclosureDate.gte = startDate;
      if (endDate) whereClause.disclosureDate.lte = endDate;
    }

    const disclosures = await this.prisma.ferpaDisclosureLog.findMany({
      where: whereClause,
      orderBy: { disclosureDate: 'desc' },
    });

    return disclosures;
  }

  /**
   * Get consent audit history for a user
   */
  async getUserConsentHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const whereClause: any = {
      userId,
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const consentLogs = await this.prisma.consentAuditLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    });

    return consentLogs;
  }

  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    complianceStandard?: 'GDPR' | 'PDPL' | 'FERPA'
  ) {
    const report = {
      period: { startDate, endDate },
      complianceStandard,
      summary: {
        totalAuditEntries: 0,
        totalFerpaDisclosures: 0,
        totalConsentActions: 0,
        userDataAccess: 0,
        personalResourceAccess: 0,
      },
      details: {
        auditLogs: [] as any[],
        ferpaDisclosures: [] as any[],
        consentActions: [] as any[],
      },
    };

    // Get audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    report.summary.totalAuditEntries = auditLogs.length;
    report.details.auditLogs = auditLogs;

    // Get FERPA disclosures
    if (!complianceStandard || complianceStandard === 'FERPA') {
      const ferpaDisclosures = await this.prisma.ferpaDisclosureLog.findMany({
        where: {
          disclosureDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { disclosureDate: 'desc' },
      });

      report.summary.totalFerpaDisclosures = ferpaDisclosures.length;
      report.details.ferpaDisclosures = ferpaDisclosures;
    }

    // Get consent actions
    if (!complianceStandard || complianceStandard === 'GDPR') {
      const consentActions = await this.prisma.consentAuditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      report.summary.totalConsentActions = consentActions.length;
      report.details.consentActions = consentActions;
    }

    return report;
  }
}
