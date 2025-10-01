/**
 * Simplified High-Performance Audit Log Service
 * Works with existing schema and follows tRPC patterns
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

// Define types that match our schema enums
type AuditAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'VIEWED' | 'SENT' | 'RECEIVED' | 'MODERATED' | 'ESCALATED' | 'ANALYZED';
type LegalBasis = 'CONSENT' | 'LEGITIMATE_INTEREST' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTERESTS' | 'PUBLIC_TASK';

export interface AuditLogEntry {
  messageId: string;
  action: AuditAction;
  actorId: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  legalBasis?: LegalBasis;
  dataCategories?: string[];
}

export interface AuditLogOptions {
  batchSize: number;
  flushInterval: number;
  enableBatching: boolean;
}

/**
 * Simplified audit log service that works with existing schema
 */
export class AuditLogService {
  private auditQueue: AuditLogEntry[] = [];
  private batchProcessingInterval: NodeJS.Timeout | null = null;
  
  // Performance optimization: Cache recent audit entries
  private auditCache = new LRUCache<string, AuditLogEntry[]>({
    max: 1000, // Cache 1K audit entries
    ttl: 10 * 60 * 1000, // 10 minutes TTL
  });

  private options: AuditLogOptions = {
    batchSize: 100,
    flushInterval: 30000, // 30 seconds
    enableBatching: true
  };

  constructor(private prisma: PrismaClient, options?: Partial<AuditLogOptions>) {
    this.options = { ...this.options, ...options };
    
    if (this.options.enableBatching) {
      this.startBatchProcessing();
    }
  }

  /**
   * Log an audit entry (simplified)
   */
  async log(
    messageId: string,
    action: AuditAction,
    actorId: string,
    details: any = {},
    ipAddress?: string,
    userAgent?: string,
    legalBasis: LegalBasis = 'LEGITIMATE_INTEREST'
  ): Promise<void> {
    const entry: AuditLogEntry = {
      messageId,
      action,
      actorId,
      details,
      ipAddress,
      userAgent,
      legalBasis,
      dataCategories: ['messaging']
    };

    if (this.options.enableBatching) {
      // Add to batch queue
      this.auditQueue.push(entry);
      
      // Process immediately if queue is full
      if (this.auditQueue.length >= this.options.batchSize) {
        await this.processBatch();
      }
    } else {
      // Process immediately
      await this.processEntry(entry);
    }
  }

  /**
   * Log FERPA disclosure (simplified)
   */
  async logFERPADisclosure(
    messageId: string,
    studentId: string,
    disclosedTo: string[],
    disclosurePurpose: string,
    legitimateEducationalInterest: string,
    actorId: string
  ): Promise<void> {
    const entry: AuditLogEntry = {
      messageId,
      action: 'VIEWED',
      actorId,
      details: {
        studentId,
        disclosedTo,
        disclosurePurpose,
        legitimateEducationalInterest,
        ferpaCompliance: true
      },
      legalBasis: 'LEGITIMATE_INTEREST',
      dataCategories: ['educational_records']
    };

    await this.log(
      messageId,
      'VIEWED',
      actorId,
      entry.details,
      undefined,
      undefined,
      'LEGITIMATE_INTEREST'
    );
  }

  /**
   * Process a single audit entry (simplified)
   */
  private async processEntry(entry: AuditLogEntry): Promise<void> {
    try {
      // Log the audit entry (simplified - just logging)
      logger.info('Audit entry processed', {
        messageId: entry.messageId,
        action: entry.action,
        actorId: entry.actorId,
        legalBasis: entry.legalBasis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Audit entry processing error', { error, entry });
    }
  }

  /**
   * Start batch processing
   */
  private startBatchProcessing(): void {
    this.batchProcessingInterval = setInterval(async () => {
      if (this.auditQueue.length > 0) {
        await this.processBatch();
      }
    }, this.options.flushInterval);
  }

  /**
   * Process batch of audit entries (simplified)
   */
  private async processBatch(): Promise<void> {
    if (this.auditQueue.length === 0) return;

    const batch = this.auditQueue.splice(0, this.options.batchSize);

    try {
      // Write to database using createMany for performance
      await this.prisma.messageAuditLog.createMany({
        data: batch.map(entry => ({
          messageId: entry.messageId,
          action: entry.action,
          actorId: entry.actorId,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          legalBasis: entry.legalBasis || 'LEGITIMATE_INTEREST',
          dataCategories: entry.dataCategories || ['messaging'],
          timestamp: new Date()
        })),
        skipDuplicates: true
      });

      logger.info('Audit log batch processed', {
        batchSize: batch.length,
        queueSize: this.auditQueue.length
      });

    } catch (error) {
      logger.error('Audit batch processing error', { error });
      // Re-add failed entries to queue for retry
      this.auditQueue.unshift(...batch);
    }
  }

  /**
   * Get audit trail for a specific message (simplified)
   */
  async getMessageAuditTrail(messageId: string): Promise<any[]> {
    // In a real implementation, this would query the audit log table
    // For now, return empty array
    logger.info('Audit trail requested', { messageId });
    return [];
  }

  /**
   * Get audit trail for a specific user's actions (simplified)
   */
  async getUserAuditTrail(
    actorId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    // In a real implementation, this would query the audit log table
    // For now, return empty array
    logger.info('User audit history requested', { actorId, startDate, endDate, limit });
    return [];
  }

  /**
   * Get compliance statistics (simplified)
   */
  async getComplianceStats(
    _startDate: Date,
    _endDate: Date
  ): Promise<{
    totalAudits: number;
    ferpaDisclosures: number;
    complianceActions: number;
    auditsByAction: Record<string, number>;
  }> {
    // In a real implementation, this would query the audit log table
    // For now, return mock data
    return {
      totalAudits: 1250,
      ferpaDisclosures: 45,
      complianceActions: 230,
      auditsByAction: {
        CREATE: 800,
        VIEW: 300,
        UPDATE: 100,
        DELETE: 50
      }
    };
  }

  /**
   * Flush all pending audit entries
   */
  async flush(): Promise<void> {
    if (this.auditQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      queueSize: this.auditQueue.length,
      batchSize: this.options.batchSize,
      flushInterval: this.options.flushInterval,
      auditCache: {
        size: this.auditCache.size,
        max: this.auditCache.max
      }
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
      this.batchProcessingInterval = null;
    }
    
    // Flush remaining entries
    this.flush().catch(error => {
      logger.error('Error flushing audit entries during cleanup', { error });
    });
    
    this.auditCache.clear();
    logger.info('Audit log service destroyed');
  }
}
