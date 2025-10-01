/**
 * Policy Acceptance Tracking Service
 * Monitors and tracks user acceptance of privacy policies and consent
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/server/api/utils/logger';

export interface PolicyAcceptanceMetrics {
  totalPolicies: number;
  acceptedPolicies: number;
  pendingPolicies: number;
  rejectedPolicies: number;
  acceptanceRate: number;
  avgTimeToAccept: number;
  complianceScore: number;
}

export interface UserAcceptanceStatus {
  userId: string;
  userType: string;
  totalRequired: number;
  accepted: number;
  pending: number;
  rejected: number;
  isCompliant: boolean;
  lastAcceptance?: Date;
  missedDeadlines: number;
}

export class PolicyAcceptanceTrackingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Track policy acceptance by a user
   */
  async trackPolicyAcceptance(
    userId: string,
    policyVersionId: string,
    acceptanceData: {
      ipAddress?: string;
      userAgent?: string;
      consentCategories: string[];
      acceptanceMethod: 'CLICK' | 'DIGITAL_SIGNATURE' | 'VERBAL' | 'IMPLIED';
    }
  ): Promise<void> {
    try {
      // Check if already accepted
      const existingAcceptance = await this.prisma.policyAcceptance.findFirst({
        where: {
          userId,
          policyVersionId,
          status: 'ACCEPTED'
        }
      });

      if (existingAcceptance) {
        logger.warn('Policy already accepted by user', { userId, policyVersionId });
        return;
      }

      // Record the acceptance
      await this.prisma.policyAcceptance.create({
        data: {
          userId,
          policyVersionId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          ipAddress: acceptanceData.ipAddress,
          userAgent: acceptanceData.userAgent,
          acceptanceMethod: acceptanceData.acceptanceMethod,
          consentCategories: acceptanceData.consentCategories,
          metadata: {
            trackingId: `accept_${Date.now()}_${userId}`,
            source: 'web_application'
          }
        }
      });

      // Update user compliance status
      await this.updateUserComplianceStatus(userId);

      logger.info('Policy acceptance tracked', {
        userId,
        policyVersionId,
        method: acceptanceData.acceptanceMethod,
        categories: acceptanceData.consentCategories.length
      });

    } catch (error) {
      logger.error('Failed to track policy acceptance', { error, userId, policyVersionId });
      throw error;
    }
  }

  /**
   * Track policy rejection
   */
  async trackPolicyRejection(
    userId: string,
    policyVersionId: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.prisma.policyAcceptance.create({
        data: {
          userId,
          policyVersionId,
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
          metadata: {
            trackingId: `reject_${Date.now()}_${userId}`,
            source: 'web_application'
          }
        }
      });

      // Update compliance status
      await this.updateUserComplianceStatus(userId);

      logger.info('Policy rejection tracked', { userId, policyVersionId, reason });

    } catch (error) {
      logger.error('Failed to track policy rejection', { error, userId, policyVersionId });
      throw error;
    }
  }

  /**
   * Get comprehensive acceptance metrics for a policy version
   */
  async getPolicyAcceptanceMetrics(policyVersionId: string): Promise<PolicyAcceptanceMetrics> {
    try {
      const acceptances = await this.prisma.policyAcceptance.findMany({
        where: { policyVersionId },
        include: {
          user: {
            select: { userType: true }
          }
        }
      });

      const totalPolicies = acceptances.length;
      const acceptedPolicies = acceptances.filter(a => a.status === 'ACCEPTED').length;
      const pendingPolicies = acceptances.filter(a => a.status === 'PENDING').length;
      const rejectedPolicies = acceptances.filter(a => a.status === 'REJECTED').length;

      // Calculate average time to accept
      const acceptedWithTime = acceptances.filter(a => 
        a.status === 'ACCEPTED' && a.acceptedAt && a.createdAt
      );
      
      const avgTimeToAccept = acceptedWithTime.length > 0 
        ? acceptedWithTime.reduce((sum, a) => {
            const timeDiff = a.acceptedAt!.getTime() - a.createdAt.getTime();
            return sum + timeDiff;
          }, 0) / acceptedWithTime.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      const acceptanceRate = totalPolicies > 0 ? (acceptedPolicies / totalPolicies) * 100 : 0;
      const complianceScore = this.calculateComplianceScore(acceptances);

      return {
        totalPolicies,
        acceptedPolicies,
        pendingPolicies,
        rejectedPolicies,
        acceptanceRate,
        avgTimeToAccept,
        complianceScore
      };

    } catch (error) {
      logger.error('Failed to get policy acceptance metrics', { error, policyVersionId });
      throw error;
    }
  }

  /**
   * Get user-specific acceptance status
   */
  async getUserAcceptanceStatus(userId: string): Promise<UserAcceptanceStatus> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { userType: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get all policy acceptances for the user
      const acceptances = await this.prisma.policyAcceptance.findMany({
        where: { userId },
        include: {
          policyVersion: {
            select: {
              effectiveDate: true,
              expiresAt: true,
              isActive: true
            }
          }
        }
      });

      // Get required policies for the user type
      const requiredPolicies = await this.prisma.policyVersion.findMany({
        where: {
          isActive: true,
          targetUserTypes: {
            has: user.userType
          }
        }
      });

      const totalRequired = requiredPolicies.length;
      const accepted = acceptances.filter(a => a.status === 'ACCEPTED').length;
      const pending = acceptances.filter(a => a.status === 'PENDING').length;
      const rejected = acceptances.filter(a => a.status === 'REJECTED').length;

      // Check for missed deadlines
      const missedDeadlines = acceptances.filter(a => {
        if (!a.policyVersion.expiresAt) return false;
        return a.status === 'PENDING' && new Date() > a.policyVersion.expiresAt;
      }).length;

      const isCompliant = accepted === totalRequired && missedDeadlines === 0;

      const lastAcceptance = acceptances
        .filter(a => a.status === 'ACCEPTED' && a.acceptedAt)
        .sort((a, b) => b.acceptedAt!.getTime() - a.acceptedAt!.getTime())[0]?.acceptedAt;

      return {
        userId,
        userType: user.userType,
        totalRequired,
        accepted,
        pending,
        rejected,
        isCompliant,
        lastAcceptance,
        missedDeadlines
      };

    } catch (error) {
      logger.error('Failed to get user acceptance status', { error, userId });
      throw error;
    }
  }

  /**
   * Get users who need to accept policies (compliance report)
   */
  async getUsersNeedingAcceptance(): Promise<{
    overdue: UserAcceptanceStatus[];
    dueSoon: UserAcceptanceStatus[];
    nonCompliant: UserAcceptanceStatus[];
  }> {
    try {
      // Get all active users
      const activeUsers = await this.prisma.user.findMany({
        where: { 
          status: 'ACTIVE',
          userType: {
            notIn: ['SYSTEM_ADMIN'] // Exclude system admins from compliance tracking
          }
        },
        select: { id: true }
      });

      const results = {
        overdue: [] as UserAcceptanceStatus[],
        dueSoon: [] as UserAcceptanceStatus[],
        nonCompliant: [] as UserAcceptanceStatus[]
      };

      for (const user of activeUsers) {
        const status = await this.getUserAcceptanceStatus(user.id);
        
        if (status.missedDeadlines > 0) {
          results.overdue.push(status);
        } else if (!status.isCompliant) {
          results.nonCompliant.push(status);
        } else if (status.pending > 0) {
          results.dueSoon.push(status);
        }
      }

      logger.info('Generated compliance report', {
        overdue: results.overdue.length,
        dueSoon: results.dueSoon.length,
        nonCompliant: results.nonCompliant.length
      });

      return results;

    } catch (error) {
      logger.error('Failed to generate compliance report', { error });
      throw error;
    }
  }

  /**
   * Send reminders for pending acceptances
   */
  async sendPendingAcceptanceReminders(): Promise<void> {
    try {
      const report = await this.getUsersNeedingAcceptance();
      
      // Send reminders to overdue users
      for (const user of report.overdue) {
        await this.sendComplianceReminder(user.userId, 'OVERDUE', user.missedDeadlines);
      }

      // Send reminders to users due soon
      for (const user of report.dueSoon) {
        await this.sendComplianceReminder(user.userId, 'DUE_SOON', user.pending);
      }

      logger.info('Sent compliance reminders', {
        overdue: report.overdue.length,
        dueSoon: report.dueSoon.length
      });

    } catch (error) {
      logger.error('Failed to send compliance reminders', { error });
      throw error;
    }
  }

  /**
   * Generate compliance dashboard data
   */
  async getComplianceDashboardData(): Promise<{
    overallCompliance: number;
    totalUsers: number;
    compliantUsers: number;
    overdueUsers: number;
    recentAcceptances: number;
    policyMetrics: Record<string, PolicyAcceptanceMetrics>;
  }> {
    try {
      const report = await this.getUsersNeedingAcceptance();
      
      // Get total user count
      const totalUsers = await this.prisma.user.count({
        where: { 
          status: 'ACTIVE',
          userType: { notIn: ['SYSTEM_ADMIN'] }
        }
      });

      const compliantUsers = totalUsers - report.overdue.length - report.nonCompliant.length;
      const overallCompliance = totalUsers > 0 ? (compliantUsers / totalUsers) * 100 : 0;

      // Get recent acceptances (last 7 days)
      const recentAcceptances = await this.prisma.policyAcceptance.count({
        where: {
          status: 'ACCEPTED',
          acceptedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      // Get metrics for all active policies
      const activePolicies = await this.prisma.policyVersion.findMany({
        where: { isActive: true },
        select: { id: true, title: true }
      });

      const policyMetrics: Record<string, PolicyAcceptanceMetrics> = {};
      for (const policy of activePolicies) {
        policyMetrics[policy.title] = await this.getPolicyAcceptanceMetrics(policy.id);
      }

      return {
        overallCompliance,
        totalUsers,
        compliantUsers,
        overdueUsers: report.overdue.length,
        recentAcceptances,
        policyMetrics
      };

    } catch (error) {
      logger.error('Failed to generate compliance dashboard data', { error });
      throw error;
    }
  }

  // Private helper methods

  private calculateComplianceScore(acceptances: any[]): number {
    if (acceptances.length === 0) return 0;

    const weights = {
      ACCEPTED: 1,
      PENDING: 0.3,
      REJECTED: 0
    };

    const totalScore = acceptances.reduce((sum, acceptance) => {
      return sum + (weights[acceptance.status as keyof typeof weights] || 0);
    }, 0);

    return (totalScore / acceptances.length) * 100;
  }

  private async updateUserComplianceStatus(userId: string): Promise<void> {
    try {
      const status = await this.getUserAcceptanceStatus(userId);
      
      // Update user record with compliance status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            compliance: {
              isCompliant: status.isCompliant,
              lastUpdated: new Date(),
              acceptanceRate: status.totalRequired > 0 ? 
                (status.accepted / status.totalRequired) * 100 : 0
            }
          }
        }
      });

    } catch (error) {
      logger.error('Failed to update user compliance status', { error, userId });
    }
  }

  private async sendComplianceReminder(
    userId: string, 
    type: 'OVERDUE' | 'DUE_SOON',
    count: number
  ): Promise<void> {
    try {
      // In a real implementation, this would send an email or notification
      logger.info('Sending compliance reminder', { userId, type, count });
      
      // Could integrate with email service, push notifications, etc.
      // For now, just log the reminder
      
    } catch (error) {
      logger.error('Failed to send compliance reminder', { error, userId, type });
    }
  }
}

// Export utility function
export async function generateComplianceReport(prisma: PrismaClient): Promise<void> {
  const tracker = new PolicyAcceptanceTrackingService(prisma);
  const dashboard = await tracker.getComplianceDashboardData();
  
  logger.info('Compliance Report Generated', {
    overallCompliance: dashboard.overallCompliance.toFixed(2) + '%',
    totalUsers: dashboard.totalUsers,
    compliantUsers: dashboard.compliantUsers,
    overdueUsers: dashboard.overdueUsers,
    recentAcceptances: dashboard.recentAcceptances
  });
}