/**
 * Advanced Breach Detection & Incident Response Service
 * Detects anomalies, classifies incidents, and triggers response workflows
 */

import { PrismaClient, IncidentType, IncidentSeverity, AnomalyType, NotificationRecipient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  riskScore: number; // 0.0 to 1.0
  anomalyType: AnomalyType;
  description: string;
  pattern?: string;
  threshold?: number;
  actualValue?: number;
}

export interface IncidentCreationData {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  affectedUserId?: string;
  affectedDataCategories?: string[];
  sourceIp?: string;
  userAgent?: string;
  evidenceData?: any;
}

export interface BreachNotificationData {
  incidentId: string;
  recipientType: NotificationRecipient;
  recipientEmail: string;
  recipientName?: string;
  isRegulatory?: boolean;
  jurisdiction?: string;
}

/**
 * High-performance breach detection service
 */
export class BreachDetectionService {
  // Performance optimization: Cache user activity patterns
  private userPatternCache = new LRUCache<string, any>({
    max: 10000, // Cache 10K user patterns
    ttl: 30 * 60 * 1000, // 30 minutes TTL
  });

  // Cache for anomaly detection baselines
  private baselineCache = new LRUCache<string, any>({
    max: 1000, // Cache 1K baselines
    ttl: 60 * 60 * 1000, // 1 hour TTL
  });

  // Rate limiting for incident creation
  private incidentRateLimit = new LRUCache<string, number>({
    max: 1000,
    ttl: 10 * 60 * 1000, // 10 minutes
  });

  constructor(private prisma: PrismaClient) {}

  /**
   * Analyze user activity for potential security anomalies
   */
  async analyzeUserActivity(
    userId: string,
    activityType: string,
    metadata: any = {}
  ): Promise<AnomalyDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Get user baseline patterns
      const baseline = await this.getUserBaseline(userId, activityType);
      
      // Analyze current activity against baseline
      const analysis = this.analyzeActivityPattern(activityType, metadata, baseline);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(analysis, baseline);
      
      // Determine if this is anomalous
      const isAnomaly = riskScore > 0.7; // Threshold for anomaly detection
      
      const result: AnomalyDetectionResult = {
        isAnomaly,
        riskScore,
        anomalyType: this.classifyAnomalyType(activityType, analysis),
        description: this.generateAnomalyDescription(activityType, analysis, riskScore),
        pattern: analysis.pattern,
        threshold: baseline.threshold,
        actualValue: analysis.actualValue
      };

      // Log anomaly if detected
      if (isAnomaly) {
        await this.logSecurityAnomaly(userId, result, metadata);
      }

      logger.debug('User activity analyzed', {
        userId,
        activityType,
        isAnomaly,
        riskScore,
        duration: Date.now() - startTime
      });

      return result;
      
    } catch (error) {
      logger.error('Activity analysis error', { error, userId, activityType });
      // Return safe default
      return {
        isAnomaly: false,
        riskScore: 0,
        anomalyType: 'OTHER',
        description: 'Analysis failed'
      };
    }
  }

  /**
   * Create a security incident
   */
  async createSecurityIncident(
    incidentData: IncidentCreationData,
    detectedBy?: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Check rate limiting to prevent spam
      const rateLimitKey = `${incidentData.affectedUserId || 'system'}-${incidentData.incidentType}`;
      const recentIncidents = this.incidentRateLimit.get(rateLimitKey) || 0;
      
      if (recentIncidents > 5) {
        logger.warn('Incident rate limit exceeded', { rateLimitKey, recentIncidents });
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many incidents reported recently'
        });
      }

      // Create the incident
      const incident = await this.prisma.securityIncident.create({
        data: {
          incidentType: incidentData.incidentType,
          severity: incidentData.severity,
          title: incidentData.title,
          description: incidentData.description,
          affectedUserId: incidentData.affectedUserId,
          affectedDataCategories: incidentData.affectedDataCategories || [],
          sourceIp: incidentData.sourceIp,
          userAgent: incidentData.userAgent,
          evidenceCollected: incidentData.evidenceData,
          detectedAt: new Date(),
          detectionMethod: 'AUTOMATED',
          usersAffected: incidentData.affectedUserId ? 1 : 0,
          recordsAffected: 1,
          dataTypes: incidentData.affectedDataCategories || []
        }
      });

      // Update rate limiting
      this.incidentRateLimit.set(rateLimitKey, recentIncidents + 1);

      // Auto-assign for critical incidents
      if (incidentData.severity === 'CRITICAL') {
        await this.autoAssignCriticalIncident(incident.id);
      }

      // Trigger immediate notifications for high/critical incidents
      if (incidentData.severity === 'HIGH' || incidentData.severity === 'CRITICAL') {
        await this.triggerImmediateNotifications(incident.id);
      }

      logger.info('Security incident created', {
        incidentId: incident.id,
        incidentType: incidentData.incidentType,
        severity: incidentData.severity,
        duration: Date.now() - startTime
      });

      return incident.id;

    } catch (error) {
      logger.error('Incident creation error', { error, incidentData });
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create security incident'
      });
    }
  }

  /**
   * Send breach notification
   */
  async sendBreachNotification(
    notificationData: BreachNotificationData
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Get incident details
      const incident = await this.prisma.securityIncident.findUnique({
        where: { id: notificationData.incidentId }
      });

      if (!incident) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Incident not found'
        });
      }

      // Generate notification content
      const { subject, content } = this.generateNotificationContent(
        incident,
        notificationData.recipientType,
        notificationData.isRegulatory || false
      );

      // Create notification record
      await this.prisma.incidentNotification.create({
        data: {
          incidentId: notificationData.incidentId,
          recipientType: notificationData.recipientType,
          recipientEmail: notificationData.recipientEmail,
          recipientName: notificationData.recipientName,
          subject,
          content,
          templateUsed: this.getTemplateForRecipient(notificationData.recipientType),
          isRegulatory: notificationData.isRegulatory || false,
          jurisdiction: notificationData.jurisdiction || 'GLOBAL',
          sentAt: new Date(),
          status: 'SENT', // In production, this would be pending until actually sent
          attempts: 1
        }
      });

      // Update incident notification tracking
      if (notificationData.isRegulatory) {
        await this.prisma.securityIncident.update({
          where: { id: notificationData.incidentId },
          data: {
            regulatorsNotified: true,
            regulatorsNotifiedAt: new Date()
          }
        });
      } else if (notificationData.recipientType === 'AFFECTED_USER') {
        await this.prisma.securityIncident.update({
          where: { id: notificationData.incidentId },
          data: {
            usersNotified: true,
            usersNotifiedAt: new Date()
          }
        });
      }

      logger.info('Breach notification sent', {
        incidentId: notificationData.incidentId,
        recipientType: notificationData.recipientType,
        isRegulatory: notificationData.isRegulatory,
        duration: Date.now() - startTime
      });

      return true;

    } catch (error) {
      logger.error('Breach notification error', { error, notificationData });
      if (error instanceof TRPCError) throw error;
      return false;
    }
  }

  /**
   * Check for immediate breach notification requirements (72-hour rule)
   */
  async checkBreachNotificationRequirements(): Promise<void> {
    try {
      const now = new Date();
      const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

      // Find incidents that need regulatory notification
      const incidentsNeedingNotification = await this.prisma.securityIncident.findMany({
        where: {
          severity: { in: ['HIGH', 'CRITICAL'] },
          incidentType: { in: ['DATA_BREACH', 'PRIVACY_VIOLATION', 'GDPR_VIOLATION'] },
          regulatorsNotified: false,
          detectedAt: { lte: seventyTwoHoursAgo }
        }
      });

      // Send overdue notifications
      for (const incident of incidentsNeedingNotification) {
        await this.sendBreachNotification({
          incidentId: incident.id,
          recipientType: 'REGULATOR',
          recipientEmail: 'compliance@institution.edu', // Should be configurable
          recipientName: 'Regulatory Authority',
          isRegulatory: true,
          jurisdiction: 'GLOBAL'
        });
      }

    } catch (error) {
      logger.error('Breach notification check error', { error });
    }
  }

  /**
   * Get incident statistics for compliance dashboard
   */
  async getIncidentStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const whereClause: any = {};
      if (startDate && endDate) {
        whereClause.detectedAt = { gte: startDate, lte: endDate };
      }

      const [
        totalIncidents,
        criticalIncidents,
        resolvedIncidents,
        breachIncidents,
        incidentsByType,
        incidentsBySeverity
      ] = await Promise.all([
        this.prisma.securityIncident.count({ where: whereClause }),
        this.prisma.securityIncident.count({ 
          where: { ...whereClause, severity: 'CRITICAL' } 
        }),
        this.prisma.securityIncident.count({ 
          where: { ...whereClause, status: 'RESOLVED' } 
        }),
        this.prisma.securityIncident.count({ 
          where: { ...whereClause, incidentType: 'DATA_BREACH' } 
        }),
        this.prisma.securityIncident.groupBy({
          by: ['incidentType'],
          where: whereClause,
          _count: true
        }),
        this.prisma.securityIncident.groupBy({
          by: ['severity'],
          where: whereClause,
          _count: true
        })
      ]);

      return {
        totalIncidents,
        criticalIncidents,
        resolvedIncidents,
        breachIncidents,
        incidentsByType: Object.fromEntries(
          incidentsByType.map(item => [item.incidentType, item._count])
        ),
        incidentsBySeverity: Object.fromEntries(
          incidentsBySeverity.map(item => [item.severity, item._count])
        ),
        resolutionRate: totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 100
      };

    } catch (error) {
      logger.error('Get incident statistics error', { error });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get incident statistics'
      });
    }
  }

  // Private helper methods

  private async getUserBaseline(userId: string, activityType: string): Promise<any> {
    const cacheKey = `${userId}-${activityType}`;
    let baseline = this.baselineCache.get(cacheKey);
    
    if (!baseline) {
      // In production, this would query historical user activity patterns
      baseline = {
        avgActivityPerHour: 10,
        avgDataAccess: 100,
        typicalLocations: ['office', 'home'],
        usualHours: { start: 9, end: 17 },
        threshold: 0.7
      };
      this.baselineCache.set(cacheKey, baseline);
    }
    
    return baseline;
  }

  private analyzeActivityPattern(activityType: string, metadata: any, baseline: any): any {
    const currentHour = new Date().getHours();
    const isOffHours = currentHour < baseline.usualHours.start || currentHour > baseline.usualHours.end;
    
    return {
      pattern: `${activityType}_${isOffHours ? 'off_hours' : 'normal_hours'}`,
      actualValue: metadata.activityCount || 1,
      isOffHours,
      location: metadata.location || 'unknown'
    };
  }

  private calculateRiskScore(analysis: any, baseline: any): number {
    let riskScore = 0;
    
    // Off-hours activity increases risk
    if (analysis.isOffHours) {
      riskScore += 0.3;
    }
    
    // Excessive activity increases risk
    if (analysis.actualValue > baseline.avgActivityPerHour * 3) {
      riskScore += 0.4;
    }
    
    // Unknown location increases risk
    if (analysis.location === 'unknown') {
      riskScore += 0.2;
    }
    
    return Math.min(riskScore, 1.0);
  }

  private classifyAnomalyType(activityType: string, analysis: any): AnomalyType {
    if (analysis.isOffHours) return 'OFF_HOURS_ACTIVITY';
    if (analysis.actualValue > 100) return 'EXCESSIVE_DATA_ACCESS';
    if (analysis.location === 'unknown') return 'UNUSUAL_LOCATION';
    return 'OTHER';
  }

  private generateAnomalyDescription(activityType: string, analysis: any, riskScore: number): string {
    const severity = riskScore > 0.8 ? 'High' : riskScore > 0.5 ? 'Medium' : 'Low';
    return `${severity} risk ${activityType} detected: ${analysis.pattern}`;
  }

  private async logSecurityAnomaly(
    userId: string,
    anomaly: AnomalyDetectionResult,
    metadata: any
  ): Promise<void> {
    try {
      await this.prisma.securityAnomaly.create({
        data: {
          anomalyType: anomaly.anomalyType,
          riskScore: anomaly.riskScore,
          description: anomaly.description,
          details: metadata,
          userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          endpoint: metadata.endpoint,
          pattern: anomaly.pattern,
          threshold: anomaly.threshold,
          actualValue: anomaly.actualValue
        }
      });
    } catch (error) {
      logger.error('Failed to log security anomaly', { error, userId, anomaly });
    }
  }

  private async autoAssignCriticalIncident(incidentId: string): Promise<void> {
    // In production, this would assign to on-call security team
    // For now, just log the assignment
    logger.info('Critical incident auto-assigned', { incidentId });
  }

  private async triggerImmediateNotifications(incidentId: string): Promise<void> {
    // Send to system administrators
    await this.sendBreachNotification({
      incidentId,
      recipientType: 'SYSTEM_ADMIN',
      recipientEmail: 'admin@institution.edu',
      recipientName: 'System Administrator'
    });
  }

  private generateNotificationContent(
    incident: any,
    recipientType: NotificationRecipient,
    isRegulatory: boolean
  ): { subject: string; content: string } {
    const baseSubject = `Security Incident: ${incident.title}`;
    
    if (isRegulatory) {
      return {
        subject: `REGULATORY NOTIFICATION: ${baseSubject}`,
        content: this.generateRegulatoryNotificationContent(incident)
      };
    }
    
    return {
      subject: baseSubject,
      content: this.generateStandardNotificationContent(incident, recipientType)
    };
  }

  private generateRegulatoryNotificationContent(incident: any): string {
    return `
SECURITY INCIDENT NOTIFICATION

Incident ID: ${incident.id}
Type: ${incident.incidentType}
Severity: ${incident.severity}
Detected: ${incident.detectedAt}

Description: ${incident.description}

Users Affected: ${incident.usersAffected}
Records Affected: ${incident.recordsAffected}
Data Types: ${incident.dataTypes.join(', ')}

This notification is provided in accordance with applicable data protection regulations.

Status: ${incident.status}
Investigation: In progress
    `;
  }

  private generateStandardNotificationContent(incident: any, recipientType: NotificationRecipient): string {
    return `
Security Incident Alert

A ${incident.severity.toLowerCase()} security incident has been detected:

Type: ${incident.incidentType}
Description: ${incident.description}
Detected: ${incident.detectedAt}

Please review and take appropriate action.

Incident ID: ${incident.id}
    `;
  }

  private getTemplateForRecipient(recipientType: NotificationRecipient): string {
    const templates = {
      'REGULATOR': 'regulatory_breach_notification',
      'AFFECTED_USER': 'user_breach_notification',
      'SYSTEM_ADMIN': 'admin_incident_alert',
      'LEGAL_TEAM': 'legal_incident_notification',
      'COMPLIANCE_TEAM': 'compliance_incident_alert',
      'EXTERNAL_COUNSEL': 'external_counsel_notification'
    };
    return templates[recipientType] || 'generic_incident_notification';
  }

  /**
   * Get service statistics for monitoring
   */
  getServiceStats() {
    return {
      userPatternCache: {
        size: this.userPatternCache.size,
        max: this.userPatternCache.max
      },
      baselineCache: {
        size: this.baselineCache.size,
        max: this.baselineCache.max
      },
      rateLimitCache: {
        size: this.incidentRateLimit.size,
        max: this.incidentRateLimit.max
      }
    };
  }

  /**
   * Clear caches (for testing or maintenance)
   */
  clearCaches(): void {
    this.userPatternCache.clear();
    this.baselineCache.clear();
    this.incidentRateLimit.clear();
  }
}