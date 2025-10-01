/**
 * High-Performance Compliance Service
 * Handles compliance statistics, audit trails, and retention management
 * Optimized for 10K+ concurrent users
 */

import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { AuditLogService } from '@/features/compliance/AuditLogService';
import { RetentionService } from '@/features/compliance/RetentionService';
import { logger } from '../utils/logger';
import { LRUCache } from 'lru-cache';

export interface ComplianceStatsInput {
  scope: 'system-wide' | 'campus' | 'class';
  campusId?: string;
  classId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ComplianceStats {
  totalMessages: number;
  educationalRecords: number;
  encryptedMessages: number;
  auditedMessages: number;
  moderatedMessages: number;
  retentionScheduled: number;
  messagesToday: number;
  activeUsers: number;
  complianceBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  riskLevelBreakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  ferpaDisclosures: number;
}

export interface FerpaDisclosureInput {
  studentId?: string;
  startDate?: Date;
  endDate?: Date;
  limit: number;
}

/**
 * High-performance compliance service with caching
 */
export class ComplianceService {
  private auditService: AuditLogService;
  private retentionService: RetentionService;

  // Performance optimization: Cache compliance statistics
  private statsCache = new LRUCache<string, ComplianceStats>({
    max: 1000, // Cache 1K stat queries
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  });

  constructor(private prisma: PrismaClient) {
    this.auditService = new AuditLogService(prisma);
    this.retentionService = new RetentionService(prisma);
  }

  /**
   * Get comprehensive compliance statistics
   */
  async getComplianceStats(input: ComplianceStatsInput): Promise<ComplianceStats> {
    const startTime = Date.now();
    
    try {
      // Create cache key
      const cacheKey = this.createStatsCacheKey(input);
      const cached = this.statsCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Compliance stats cache hit', { cacheKey, duration: Date.now() - startTime });
        return cached;
      }

      // Build base where clause
      const where = this.buildWhereClause(input);

      // Execute parallel queries for better performance
      const [
        totalMessages,
        educationalRecords,
        encryptedMessages,
        auditedMessages,
        moderatedMessages,
        messagesToday,
        activeUsers,
        complianceBreakdown,
        riskLevelBreakdown,
        ferpaDisclosures,
        retentionStats
      ] = await Promise.all([
        // Total messages
        this.prisma.socialPost.count({ where }),

        // Educational records
        this.prisma.socialPost.count({
          where: { ...where, isEducationalRecord: true }
        }),

        // Encrypted messages
        this.prisma.socialPost.count({
          where: { ...where, encryptionLevel: { not: 'STANDARD' } }
        }),

        // Audited messages
        this.prisma.socialPost.count({
          where: { ...where, auditRequired: true }
        }),

        // Moderated messages (using isModerated field)
        this.prisma.socialPost.count({
          where: { ...where, isModerated: true }
        }),

        // Messages today
        this.prisma.socialPost.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),

        // Active users (users who posted today)
        this.prisma.user.count({
          where: {
            socialPosts: {
              some: {
                createdAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        }),

        // Compliance level breakdown
        this.getComplianceBreakdown(where),

        // Risk level breakdown
        this.getRiskLevelBreakdown(where),

        // FERPA disclosures
        this.getFerpaDisclosureCount(input),

        // Retention statistics
        this.retentionService.getRetentionStats()
      ]);

      const stats: ComplianceStats = {
        totalMessages,
        educationalRecords,
        encryptedMessages,
        auditedMessages,
        moderatedMessages,
        messagesToday,
        activeUsers,
        retentionScheduled: retentionStats.totalScheduled,
        complianceBreakdown,
        riskLevelBreakdown,
        ferpaDisclosures
      };

      // Cache the results
      this.statsCache.set(cacheKey, stats);

      logger.info('Compliance statistics generated', {
        scope: input.scope,
        totalMessages,
        educationalRecords,
        duration: Date.now() - startTime
      });

      return stats;

    } catch (error) {
      logger.error('Compliance stats error', { error, input, duration: Date.now() - startTime });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve compliance statistics'
      });
    }
  }

  /**
   * Get message audit trail
   */
  async getMessageAuditTrail(messageId: string): Promise<any[]> {
    try {
      return await this.auditService.getMessageAuditTrail(messageId);
    } catch (error) {
      logger.error('Audit trail retrieval error', { error, messageId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve audit trail'
      });
    }
  }

  /**
   * Get FERPA disclosure logs
   */
  async getFerpaDisclosures(input: FerpaDisclosureInput): Promise<any[]> {
    try {
      const where: any = {};

      if (input.studentId) {
        where.studentId = input.studentId;
      }

      if (input.startDate && input.endDate) {
        where.disclosureDate = {
          gte: input.startDate,
          lte: input.endDate
        };
      }

      return await this.prisma.ferpaDisclosureLog.findMany({
        where,
        include: {
          student: {
            select: { id: true, name: true, email: true }
          },
          message: {
            select: { id: true, content: true, createdAt: true }
          }
        },
        orderBy: { disclosureDate: 'desc' },
        take: input.limit
      });

    } catch (error) {
      logger.error('FERPA disclosure retrieval error', { error, input });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve FERPA disclosures'
      });
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<any> {
    try {
      return await this.retentionService.getRetentionStats();
    } catch (error) {
      logger.error('Retention stats error', { error });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve retention statistics'
      });
    }
  }

  /**
   * Update message retention period
   */
  async updateRetentionPeriod(messageId: string, retentionPeriod: number, reason: string): Promise<void> {
    try {
      // Schedule new retention period using existing method
      await this.retentionService.scheduleMessageRetention(messageId, retentionPeriod);

      // Log the retention period update
      logger.info('Retention period updated', { messageId, retentionPeriod, reason });

      // Invalidate stats cache
      this.statsCache.clear();

    } catch (error) {
      logger.error('Retention period update error', { error, messageId, retentionPeriod });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update retention period'
      });
    }
  }

  /**
   * Build where clause based on scope
   */
  private buildWhereClause(input: ComplianceStatsInput): any {
    const where: any = {
      messageType: { not: null }, // Only messaging posts
      deletedAt: null // Exclude deleted messages
    };

    if (input.startDate && input.endDate) {
      where.createdAt = {
        gte: input.startDate,
        lte: input.endDate
      };
    }

    switch (input.scope) {
      case 'class':
        if (!input.classId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Class ID required for class scope'
          });
        }
        where.classId = input.classId;
        break;
        
      case 'campus':
        if (!input.campusId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Campus ID required for campus scope'
          });
        }
        where.class = { campusId: input.campusId };
        break;
        
      case 'system-wide':
        // No additional filters needed
        break;
    }

    return where;
  }

  /**
   * Get compliance level breakdown
   */
  private async getComplianceBreakdown(where: any): Promise<ComplianceStats['complianceBreakdown']> {
    // This would require a computed field or additional logic
    // For now, return a simplified breakdown based on risk levels
    const [low, medium, high, critical] = await Promise.all([
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'LOW' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'MEDIUM' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'HIGH' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'CRITICAL' } })
    ]);

    return { low, medium, high, critical };
  }

  /**
   * Get risk level breakdown
   */
  private async getRiskLevelBreakdown(where: any): Promise<ComplianceStats['riskLevelBreakdown']> {
    const [LOW, MEDIUM, HIGH, CRITICAL] = await Promise.all([
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'LOW' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'MEDIUM' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'HIGH' } }),
      this.prisma.socialPost.count({ where: { ...where, riskLevel: 'CRITICAL' } })
    ]);

    return { LOW, MEDIUM, HIGH, CRITICAL };
  }

  /**
   * Get FERPA disclosure count
   */
  private async getFerpaDisclosureCount(input: ComplianceStatsInput): Promise<number> {
    const where: any = {};

    if (input.startDate && input.endDate) {
      where.disclosureDate = {
        gte: input.startDate,
        lte: input.endDate
      };
    }

    // Add scope-based filtering if needed
    if (input.scope === 'class' && input.classId) {
      where.message = { classId: input.classId };
    } else if (input.scope === 'campus' && input.campusId) {
      where.message = { class: { campusId: input.campusId } };
    }

    return await this.prisma.ferpaDisclosureLog.count({ where });
  }

  /**
   * Create cache key for statistics
   */
  private createStatsCacheKey(input: ComplianceStatsInput): string {
    const parts = [
      input.scope,
      input.campusId || 'all',
      input.classId || 'all',
      input.startDate?.toISOString() || 'all',
      input.endDate?.toISOString() || 'all'
    ];
    return `stats-${parts.join('-')}`;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      statsCache: {
        size: this.statsCache.size,
        max: this.statsCache.max,
        calculatedSize: this.statsCache.calculatedSize,
      }
    };
  }

  /**
   * Clear caches (for testing or maintenance)
   */
  clearCaches(): void {
    this.statsCache.clear();
  }
}
