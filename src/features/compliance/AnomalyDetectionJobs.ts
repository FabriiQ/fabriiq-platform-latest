/**
 * Anomaly Detection Background Jobs
 * Monitors user activity patterns and detects potential security breaches
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/server/api/utils/logger';
import { BreachDetectionService } from './BreachDetectionService';

export class AnomalyDetectionJobs {
  private breachService: BreachDetectionService;

  constructor(private prisma: PrismaClient) {
    this.breachService = new BreachDetectionService(prisma);
  }

  /**
   * Monitor user login patterns for anomalies
   */
  async detectLoginAnomalies(): Promise<void> {
    try {
      logger.info('Starting login anomaly detection job');

      // Get recent sessions (last 24 hours)
      const recentSessions = await this.prisma.session.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group sessions by user
      const sessionsByUser = new Map<string, any[]>();
      for (const session of recentSessions) {
        const userId = session.userId;
        if (!sessionsByUser.has(userId)) {
          sessionsByUser.set(userId, []);
        }
        sessionsByUser.get(userId)!.push(session);
      }

      // Analyze each user's login patterns
      for (const [userId, sessions] of sessionsByUser) {
        await this.analyzeUserLoginPattern(userId, sessions);
      }

      logger.info(`Login anomaly detection completed. Analyzed ${sessionsByUser.size} users`);

    } catch (error) {
      logger.error('Login anomaly detection job failed', { error });
    }
  }

  /**
   * Monitor data access patterns for anomalies
   */
  async detectDataAccessAnomalies(): Promise<void> {
    try {
      logger.info('Starting data access anomaly detection job');

      // Get recent audit logs (last 6 hours)
      const recentAudits = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 6 * 60 * 60 * 1000)
          },
          action: {
            in: ['VIEW', 'EXPORT', 'DOWNLOAD']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group by user and analyze patterns
      const accessByUser = new Map<string, any[]>();
      for (const audit of recentAudits) {
        const userId = audit.userId;
        if (!accessByUser.has(userId)) {
          accessByUser.set(userId, []);
        }
        accessByUser.get(userId)!.push(audit);
      }

      // Analyze each user's access patterns
      for (const [userId, accesses] of accessByUser) {
        await this.analyzeUserDataAccess(userId, accesses);
      }

      logger.info(`Data access anomaly detection completed. Analyzed ${accessByUser.size} users`);

    } catch (error) {
      logger.error('Data access anomaly detection job failed', { error });
    }
  }

  /**
   * Monitor for FERPA violations
   */
  async detectFerpaViolations(): Promise<void> {
    try {
      logger.info('Starting FERPA violation detection job');

      // Check for unauthorized access to educational records
      const suspiciousAccess = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
          },
          entityType: {
            in: ['Assessment', 'ActivityGrade', 'StudentGrade', 'Attendance']
          },
          action: 'VIEW'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true
            }
          }
        }
      });

      // Check if access is authorized
      for (const access of suspiciousAccess) {
        const isAuthorized = await this.validateEducationalRecordAccess(
          access.userId,
          access.entityType,
          access.entityId
        );

        if (!isAuthorized) {
          // Create potential FERPA violation incident
          await this.breachService.createSecurityIncident({
            incidentType: 'FERPA_VIOLATION',
            severity: 'HIGH',
            title: `Unauthorized Educational Record Access`,
            description: `User ${access.user.email} accessed ${access.entityType} ${access.entityId} without proper authorization`,
            affectedUserId: access.userId,
            affectedDataCategories: ['educational_records'],
            evidenceData: {
              auditLogId: access.id,
              entityType: access.entityType,
              entityId: access.entityId,
              timestamp: access.createdAt
            }
          });

          logger.warn('Potential FERPA violation detected', {
            userId: access.userId,
            entityType: access.entityType,
            entityId: access.entityId,
            userEmail: access.user.email
          });
        }
      }

      logger.info('FERPA violation detection completed');

    } catch (error) {
      logger.error('FERPA violation detection job failed', { error });
    }
  }

  /**
   * Check for bulk data downloads
   */
  async detectBulkDataDownloads(): Promise<void> {
    try {
      logger.info('Starting bulk data download detection job');

      // Get recent file/data access events
      const recentDownloads = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 1 * 60 * 60 * 1000) // Last hour
          },
          action: {
            in: ['DOWNLOAD', 'EXPORT']
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true
            }
          }
        }
      });

      // Group by user and check for excessive downloads
      const downloadsByUser = new Map<string, any[]>();
      for (const download of recentDownloads) {
        const userId = download.userId;
        if (!downloadsByUser.has(userId)) {
          downloadsByUser.set(userId, []);
        }
        downloadsByUser.get(userId)!.push(download);
      }

      // Check for suspicious download patterns
      for (const [userId, downloads] of downloadsByUser) {
        if (downloads.length > 50) { // More than 50 downloads in an hour
          await this.breachService.createSecurityIncident({
            incidentType: 'SUSPICIOUS_ACTIVITY',
            severity: 'MEDIUM',
            title: `Bulk Data Download Detected`,
            description: `User performed ${downloads.length} downloads in the last hour`,
            affectedUserId: userId,
            affectedDataCategories: ['bulk_data'],
            evidenceData: {
              downloadCount: downloads.length,
              timeWindow: '1 hour',
              firstDownload: downloads[0].createdAt,
              lastDownload: downloads[downloads.length - 1].createdAt
            }
          });

          logger.warn('Bulk download pattern detected', {
            userId,
            downloadCount: downloads.length,
            userEmail: downloads[0].user.email
          });
        }
      }

      logger.info('Bulk data download detection completed');

    } catch (error) {
      logger.error('Bulk data download detection job failed', { error });
    }
  }

  /**
   * Run all anomaly detection jobs
   */
  async runAllDetectionJobs(): Promise<void> {
    try {
      logger.info('Starting comprehensive anomaly detection');

      await Promise.all([
        this.detectLoginAnomalies(),
        this.detectDataAccessAnomalies(),
        this.detectFerpaViolations(),
        this.detectBulkDataDownloads()
      ]);

      // Check for 72-hour notification requirements
      await this.breachService.checkBreachNotificationRequirements();

      logger.info('Comprehensive anomaly detection completed successfully');

    } catch (error) {
      logger.error('Anomaly detection jobs failed', { error });
      throw error;
    }
  }

  // Private helper methods

  private async analyzeUserLoginPattern(userId: string, sessions: any[]): Promise<void> {
    try {
      // Check for multiple rapid logins
      if (sessions.length > 20) {
        await this.breachService.createSecurityIncident({
          incidentType: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          title: 'Excessive Login Activity',
          description: `User had ${sessions.length} login sessions in 24 hours`,
          affectedUserId: userId,
          affectedDataCategories: ['authentication'],
          evidenceData: {
            sessionCount: sessions.length,
            timeWindow: '24 hours'
          }
        });

        logger.warn('Excessive login activity detected', {
          userId,
          sessionCount: sessions.length
        });
      }

      // Check for off-hours activity (example: outside 6 AM - 11 PM)
      const offHoursSessions = sessions.filter(session => {
        const hour = session.createdAt.getHours();
        return hour < 6 || hour > 23;
      });

      if (offHoursSessions.length > 5) {
        await this.breachService.analyzeUserActivity(
          userId,
          'off_hours_login',
          {
            sessionCount: offHoursSessions.length,
            totalSessions: sessions.length,
            timeWindow: '24 hours'
          }
        );
      }

    } catch (error) {
      logger.error('Login pattern analysis failed', { error, userId });
    }
  }

  private async analyzeUserDataAccess(userId: string, accesses: any[]): Promise<void> {
    try {
      // Check for excessive data access
      if (accesses.length > 100) {
        await this.breachService.analyzeUserActivity(
          userId,
          'excessive_data_access',
          {
            accessCount: accesses.length,
            timeWindow: '6 hours',
            entityTypes: [...new Set(accesses.map(a => a.entityType))]
          }
        );
      }

      // Check for access to sensitive entities
      const sensitiveAccess = accesses.filter(access => 
        ['StudentProfile', 'Assessment', 'ActivityGrade'].includes(access.entityType)
      );

      if (sensitiveAccess.length > 20) {
        await this.breachService.analyzeUserActivity(
          userId,
          'sensitive_data_access',
          {
            sensitiveAccessCount: sensitiveAccess.length,
            totalAccesses: accesses.length,
            timeWindow: '6 hours'
          }
        );
      }

    } catch (error) {
      logger.error('Data access analysis failed', { error, userId });
    }
  }

  private async validateEducationalRecordAccess(
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          userType: true,
          activeCampuses: {
            select: { campusId: true }
          }
        }
      });

      if (!user) return false;

      // System admins and campus admins have broader access
      if (['SYSTEM_ADMIN', 'CAMPUS_ADMIN'].includes(user.userType)) {
        return true;
      }

      // Teachers can access records for their classes
      if (['TEACHER', 'CAMPUS_TEACHER'].includes(user.userType)) {
        // In a real implementation, this would check if the teacher
        // is assigned to classes that include the accessed record
        return true; // Simplified for this example
      }

      // Students can only access their own records
      if (['STUDENT'].includes(user.userType)) {
        // Would need to verify the record belongs to this student
        return false; // Simplified - assume students shouldn't access via audit log
      }

      return false;

    } catch (error) {
      logger.error('Educational record access validation failed', { error, userId, entityType, entityId });
      return false;
    }
  }
}

// Export function to create and run anomaly detection jobs
export async function runAnomalyDetectionJobs(prisma: PrismaClient): Promise<void> {
  const detector = new AnomalyDetectionJobs(prisma);
  await detector.runAllDetectionJobs();
}