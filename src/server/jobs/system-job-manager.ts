/**
 * System Job Manager
 * 
 * This module provides background jobs for system-wide tasks, including:
 * - Database maintenance
 * - Cache cleanup
 * - Session cleanup
 * - System health checks
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../api/utils/logger';
import { BackgroundJobSystem, JobFrequency, JobDefinition } from './background-job-system';
import { ActivityCacheService } from '../api/services/activity-cache.service';
import { ActivityArchivingService } from '../api/services/activity-archiving.service';
import { RuleBasedMessageClassifier } from '../../features/messaging/core/RuleBasedClassifier';
import { FERPAComplianceEngine } from '../../features/compliance/FERPAComplianceEngine';
import { AuditLogService } from '../../features/compliance/AuditLogService';

export class SystemJobManager {
  private prisma: PrismaClient;
  private jobSystem: BackgroundJobSystem;
  private messageClassifier: RuleBasedMessageClassifier;
  private ferpaEngine: FERPAComplianceEngine;
  private auditService: AuditLogService;

  constructor(prisma: PrismaClient, jobSystem: BackgroundJobSystem) {
    this.prisma = prisma;
    this.jobSystem = jobSystem;
    this.messageClassifier = new RuleBasedMessageClassifier();
    this.ferpaEngine = new FERPAComplianceEngine();
    this.auditService = new AuditLogService(prisma);
  }

  /**
   * Register all system jobs
   */
  registerJobs(): void {
    logger.info('Registering system background jobs');

    // Register cache cleanup jobs
    this.registerCacheCleanupJobs();

    // Register database maintenance jobs
    this.registerDatabaseMaintenanceJobs();

    // Register activity archiving jobs
    this.registerActivityArchivingJobs();

    // Register performance optimization jobs
    this.registerPerformanceOptimizationJobs();

    // Register message analysis jobs
    this.registerMessageAnalysisJobs();
  }

  /**
   * Register cache cleanup jobs
   */
  private registerCacheCleanupJobs(): void {
    // Hourly cache cleanup
    const hourlyCacheCleanupJob: JobDefinition = {
      id: 'system-hourly-cache-cleanup',
      name: 'Hourly Cache Cleanup',
      description: 'Cleans up expired cache entries',
      frequency: JobFrequency.HOURLY,
      handler: async () => {
        logger.info('Running hourly cache cleanup');
        
        // Clean up activity cache
        ActivityCacheService.cleanup();
        
        return { success: true };
      },
      priority: 8,
      timeout: 5 * 60 * 1000, // 5 minutes
      retryCount: 2,
      retryDelay: 10 * 60 * 1000, // 10 minutes
      enabled: true
    };
    this.jobSystem.registerJob(hourlyCacheCleanupJob);
  }

  /**
   * Register database maintenance jobs
   */
  private registerDatabaseMaintenanceJobs(): void {
    // Daily session cleanup
    const dailySessionCleanupJob: JobDefinition = {
      id: 'system-daily-session-cleanup',
      name: 'Daily Session Cleanup',
      description: 'Cleans up expired sessions from the database',
      frequency: JobFrequency.DAILY,
      handler: async () => {
        logger.info('Running daily session cleanup');
        
        // Delete expired sessions (older than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const result = await this.prisma.session.deleteMany({
          where: {
            expires: {
              lt: thirtyDaysAgo
            }
          }
        });
        
        logger.info(`Deleted ${result.count} expired sessions`);
        
        return { deletedSessions: result.count };
      },
      priority: 3,
      timeout: 10 * 60 * 1000, // 10 minutes
      retryCount: 2,
      retryDelay: 30 * 60 * 1000, // 30 minutes
      enabled: true
    };
    this.jobSystem.registerJob(dailySessionCleanupJob);

    // Weekly database vacuum
    const weeklyDatabaseVacuumJob: JobDefinition = {
      id: 'system-weekly-database-vacuum',
      name: 'Weekly Database Vacuum',
      description: 'Performs database vacuum to reclaim space and update statistics',
      frequency: JobFrequency.WEEKLY,
      handler: async () => {
        logger.info('Running weekly database vacuum');
        
        // This would typically run a database-specific vacuum command
        // For PostgreSQL, it would be something like:
        // await this.prisma.$executeRaw`VACUUM ANALYZE;`;
        
        // Since we can't directly execute raw SQL for all database types safely,
        // we'll just log a message for now
        logger.info('Database vacuum operation would run here');
        
        return { success: true };
      },
      priority: 1,
      timeout: 60 * 60 * 1000, // 1 hour
      retryCount: 1,
      retryDelay: 2 * 60 * 60 * 1000, // 2 hours
      enabled: true
    };
    this.jobSystem.registerJob(weeklyDatabaseVacuumJob);
  }

  /**
   * Register activity archiving jobs
   */
  private registerActivityArchivingJobs(): void {
    // Monthly activity archiving
    const monthlyActivityArchivingJob: JobDefinition = {
      id: 'system-monthly-activity-archiving',
      name: 'Monthly Activity Archiving',
      description: 'Archives old activity grades to maintain database performance',
      frequency: JobFrequency.MONTHLY,
      handler: async () => {
        logger.info('Running monthly activity archiving');
        
        // Create archiving service
        const archivingService = new ActivityArchivingService(this.prisma, {
          ageThresholdDays: 365, // Archive activities older than 1 year
          batchSize: 100,
          preserveDetailedResults: false
        });
        
        // Archive old grades
        const result = await archivingService.archiveOldGrades({
          // No specific class or user, archive all eligible grades
          dryRun: false
        });
        
        logger.info(`Archived ${result.totalArchived} activity grades, ${result.totalFailed} failed`);
        
        return result;
      },
      priority: 2,
      timeout: 60 * 60 * 1000, // 1 hour
      retryCount: 2,
      retryDelay: 2 * 60 * 60 * 1000, // 2 hours
      enabled: true
    };
    this.jobSystem.registerJob(monthlyActivityArchivingJob);
  }

  /**
   * Run all system jobs manually
   * @returns Results of all jobs
   */
  async runAllJobs(): Promise<Record<string, any>> {
    logger.info('Manually running all system jobs');
    
    const results: Record<string, any> = {};
    
    // Get all system job IDs
    const systemJobIds = Array.from(this.jobSystem.getAllJobs().keys())
      .filter(id => id.startsWith('system-'));
    
    // Execute each job
    for (const jobId of systemJobIds) {
      try {
        results[jobId] = await this.jobSystem.executeJob(jobId);
      } catch (error) {
        logger.error(`Error executing job ${jobId}`, { error });
        results[jobId] = { error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Register performance optimization jobs
   */
  private registerPerformanceOptimizationJobs(): void {
    // Session cleanup job (every 15 minutes)
    const sessionCleanupJob: JobDefinition = {
      id: 'system-session-cleanup',
      name: 'Session Cleanup',
      description: 'Cleans up expired NextAuth sessions and verification tokens',
      frequency: JobFrequency.CUSTOM,
      customInterval: 15 * 60 * 1000, // 15 minutes
      handler: async () => {
        logger.info('Running session cleanup');

        // Clean up expired NextAuth sessions
        const sessionResult = await this.prisma.session.deleteMany({
          where: {
            expires: {
              lt: new Date()
            }
          }
        });

        // Note: No VerificationToken model in schema; only clean up sessions
        logger.info(`Cleaned up ${sessionResult.count} expired sessions`);

        return {
          deletedSessions: sessionResult.count
        };
      },
      priority: 7,
      timeout: 5 * 60 * 1000, // 5 minutes
      retryCount: 2,
      retryDelay: 5 * 60 * 1000, // 5 minutes
      enabled: true
    };
    this.jobSystem.registerJob(sessionCleanupJob);

    // Performance monitoring job (every 5 minutes)
    const performanceMonitoringJob: JobDefinition = {
      id: 'system-performance-monitoring',
      name: 'Performance Monitoring',
      description: 'Monitors system performance metrics and logs warnings',
      frequency: JobFrequency.CUSTOM,
      customInterval: 5 * 60 * 1000, // 5 minutes
      handler: async () => {
        logger.debug('Running performance monitoring');

        let memoryUsageMB = 0;
        let uptime = 0;

        // Monitor memory usage (if available)
        if (typeof process !== 'undefined') {
          if (process.memoryUsage) {
            const memoryUsage = process.memoryUsage();
            memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

            if (memoryUsageMB > 512) { // 512MB threshold
              logger.warn(`High memory usage detected: ${memoryUsageMB}MB`);
            }
          }

          if (process.uptime) {
            uptime = Math.round(process.uptime());
          }
        }

        // Monitor database connections (simplified)
        // In a real implementation, you might query pg_stat_activity
        const connectionCount = 0; // Placeholder

        if (connectionCount > 50) { // Threshold for warning
          logger.warn(`High database connection count: ${connectionCount}`);
        }

        return {
          memoryUsageMB,
          uptime,
          connectionCount,
          timestamp: new Date().toISOString()
        };
      },
      priority: 9,
      timeout: 2 * 60 * 1000, // 2 minutes
      retryCount: 1,
      retryDelay: 1 * 60 * 1000, // 1 minute
      enabled: process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
    };
    this.jobSystem.registerJob(performanceMonitoringJob);
  }

  /**
   * Register message analysis jobs
   */
  private registerMessageAnalysisJobs(): void {
    // Message analysis job - runs every 6 hours
    const messageAnalysisJob: JobDefinition = {
      id: 'system-message-analysis',
      name: 'Message Analysis',
      description: 'Analyzes unprocessed messages for classification, moderation flagging, and audit updates',
      frequency: JobFrequency.CUSTOM,
      customInterval: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
      handler: async () => {
        logger.info('Running message analysis job');

        const startTime = Date.now();
        let totalProcessed = 0;
        let flaggedMessages = 0;
        let criticalMessages = 0;
        let errors = 0;

        try {
          // Process messages in batches to avoid memory issues
          const batchSize = parseInt(process.env.MESSAGE_ANALYSIS_BATCH_SIZE || '100');
          let offset = 0;
          let hasMoreMessages = true;

          while (hasMoreMessages) {
            const batch = await this.getUnanalyzedMessages(batchSize, offset);

            if (batch.length === 0) {
              hasMoreMessages = false;
              break;
            }

            for (const message of batch) {
              try {
                await this.analyzeMessage(message);
                totalProcessed++;
              } catch (error) {
                errors++;
                logger.error('Failed to analyze message', {
                  messageId: message.id,
                  error
                });
              }
            }

            offset += batchSize;

            // Prevent infinite loops
            if (offset > 10000) {
              logger.warn('Reached maximum offset limit, stopping analysis');
              break;
            }
          }

          // Count flagged and critical messages from this run
          const flaggedCount = await this.prisma.moderationQueue.count({
            where: {
              createdAt: {
                gte: new Date(startTime)
              }
            }
          });

          const criticalCount = await this.prisma.socialPost.count({
            where: {
              riskLevel: 'CRITICAL',
              analyzedAt: {
                gte: new Date(startTime)
              }
            }
          });

          flaggedMessages = flaggedCount;
          criticalMessages = criticalCount;

          const processingTimeMs = Date.now() - startTime;

          logger.info('Message analysis completed', {
            totalProcessed,
            flaggedMessages,
            criticalMessages,
            errors,
            processingTimeMs
          });

          // Notify moderators if there are critical messages
          if (criticalMessages > 0) {
            logger.warn('Critical messages detected - moderators should be notified', {
              criticalCount: criticalMessages,
              totalFlagged: flaggedMessages
            });
          }

          return {
            success: true,
            totalProcessed,
            flaggedMessages,
            criticalMessages,
            errors,
            processingTimeMs
          };

        } catch (error) {
          logger.error('Message analysis job failed', { error });
          throw error;
        }
      },
      priority: 5,
      timeout: 30 * 60 * 1000, // 30 minutes
      retryCount: 2,
      retryDelay: 60 * 60 * 1000, // 1 hour
      enabled: process.env.MESSAGE_ANALYSIS_CRON_ENABLED !== 'false'
    };

    this.jobSystem.registerJob(messageAnalysisJob);
  }

  /**
   * Get unanalyzed messages from the database
   */
  private async getUnanalyzedMessages(limit: number, offset: number) {
    try {
      const messages = await this.prisma.socialPost.findMany({
        where: {
          analyzedAt: null, // Only get unanalyzed messages
          messageType: { not: null }, // Only messages (not regular posts)
        },
        include: {
          author: {
            select: { id: true, name: true, userType: true }
          },
          class: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      });

      return messages;
    } catch (error) {
      logger.error('Failed to fetch unanalyzed messages', { error, limit, offset });
      throw error;
    }
  }

  /**
   * Analyze a single message
   */
  private async analyzeMessage(message: any): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Classify the message
      const classification = this.messageClassifier.classifyMessage(message.content, {
        sender: message.author,
        recipients: [], // We don't have recipients in the message record
        classId: message.classId
      });

      // 2. FERPA compliance check (align with FERPAComplianceEngine API)
      const ferpaClassification = this.ferpaEngine.classifyFERPARequirements(
        message.content,
        message.author,
        []
      );

      // 3. Update message with analysis results
      await this.prisma.socialPost.update({
        where: { id: message.id },
        data: {
          // Update classification fields
          contentCategory: classification.contentCategory,
          riskLevel: classification.riskLevel,
          isEducationalRecord: ferpaClassification.isEducationalRecord,
          encryptionLevel: classification.encryptionLevel,
          auditRequired: classification.auditRequired || ferpaClassification.disclosureLoggingRequired,
          legalBasis: classification.legalBasis,
          flaggedKeywords: classification.flaggedKeywords || [],

          // Mark as analyzed
          analyzedAt: new Date()
        }
      });

      // 4. Create audit log entry
      await this.auditService.log(
        message.id,
        'ANALYZED',
        'system',
        {
          classification,
          ferpaClassification,
          processingTimeMs: Date.now() - startTime,
          cronJobRun: true
        }
      );

      // 5. Create moderation queue entry if needed
      if (classification.moderationRequired || classification.riskLevel === 'CRITICAL') {
        await this.createModerationQueueEntry(message, classification);
      }

    } catch (error) {
      logger.error('Message analysis failed', {
        messageId: message.id,
        error
      });
      throw error;
    }
  }

  /**
   * Create moderation queue entry
   */
  private async createModerationQueueEntry(message: any, classification: any): Promise<void> {
    try {
      // Check if already in moderation queue to avoid duplicates
      const existing = await this.prisma.moderationQueue.findFirst({
        where: { messageId: message.id }
      });

      if (existing) {
        logger.debug('Message already in moderation queue', { messageId: message.id });
        return;
      }

      await this.prisma.moderationQueue.create({
        data: {
          messageId: message.id,
          reason: `Flagged by automated analysis: ${classification.riskLevel} risk`,
          flaggedKeywords: classification.flaggedKeywords || [],
          priority: this.mapRiskToPriority(classification.riskLevel),
          status: 'PENDING',
          createdAt: new Date()
        }
      });

      logger.info('Created moderation queue entry', {
        messageId: message.id,
        riskLevel: classification.riskLevel
      });

    } catch (error) {
      logger.error('Failed to create moderation queue entry', {
        messageId: message.id,
        error
      });
      throw error;
    }
  }

  /**
   * Map risk level to moderation priority
   */
  private mapRiskToPriority(riskLevel: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (riskLevel) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }


}
