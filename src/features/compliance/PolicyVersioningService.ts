/**
 * Policy Versioning & Acceptance Tracking Service
 * Manages privacy policy versions, user acceptance tracking, and automatic prompts
 */

import { PrismaClient, PolicyType, AcceptanceMethod } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

export interface PolicyVersionData {
  policyType: PolicyType;
  version: string;
  title: string;
  content: string;
  summary?: string;
  effectiveDate: Date;
  expiryDate?: Date;
  changesFromPrevious?: string;
  reasonForChange?: string;
  requiresAcceptance?: boolean;
  acceptanceDeadline?: Date;
}

export interface PolicyAcceptanceData {
  policyVersionId: string;
  userId: string;
  acceptanceMethod?: AcceptanceMethod;
  ipAddress?: string;
  userAgent?: string;
  userAge?: number;
  requiresParentalConsent?: boolean;
  parentalConsentBy?: string;
}

export interface UserPolicyStatus {
  userId: string;
  pendingAcceptances: Array<{
    policyVersionId: string;
    policyType: PolicyType;
    version: string;
    title: string;
    effectiveDate: Date;
    acceptanceDeadline?: Date;
    isOverdue: boolean;
  }>;
  recentAcceptances: Array<{
    policyVersionId: string;
    policyType: PolicyType;
    version: string;
    acceptedAt: Date;
    acceptanceMethod: AcceptanceMethod;
  }>;
}

/**
 * High-performance policy versioning service
 */
export class PolicyVersioningService {
  // Performance optimization: Cache active policies
  private activePoliciesCache = new LRUCache<string, any>({
    max: 500, // Cache 500 policy versions
    ttl: 60 * 60 * 1000, // 1 hour TTL
  });

  // Cache for user policy status
  private userStatusCache = new LRUCache<string, UserPolicyStatus>({
    max: 10000, // Cache 10K user statuses
    ttl: 10 * 60 * 1000, // 10 minutes TTL
  });

  // Cache for policy content (for performance)
  private policyContentCache = new LRUCache<string, string>({
    max: 100, // Cache 100 policy contents
    ttl: 30 * 60 * 1000, // 30 minutes TTL
  });

  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new policy version
   */
  async createPolicyVersion(
    policyData: PolicyVersionData,
    createdBy: string,
    autoPublish: boolean = false
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Check if version already exists
      const existingPolicy = await this.prisma.policyVersion.findUnique({
        where: {
          policyType_version: {
            policyType: policyData.policyType,
            version: policyData.version
          }
        }
      });

      if (existingPolicy) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Policy version ${policyData.version} already exists for ${policyData.policyType}`
        });
      }

      // Create the policy version
      const policyVersion = await this.prisma.policyVersion.create({
        data: {
          policyType: policyData.policyType,
          version: policyData.version,
          title: policyData.title,
          content: policyData.content,
          summary: policyData.summary,
          effectiveDate: policyData.effectiveDate,
          expiryDate: policyData.expiryDate,
          changesFromPrevious: policyData.changesFromPrevious,
          reasonForChange: policyData.reasonForChange,
          requiresAcceptance: policyData.requiresAcceptance ?? true,
          acceptanceDeadline: policyData.acceptanceDeadline,
          createdById: createdBy,
          isActive: autoPublish,
          publishedAt: autoPublish ? new Date() : null
        }
      });

      // If auto-publishing, deactivate previous versions
      if (autoPublish) {
        await this.deactivatePreviousVersions(policyData.policyType, policyVersion.id);
      }

      // Clear relevant caches
      this.clearCacheForPolicyType(policyData.policyType);

      logger.info('Policy version created', {
        policyVersionId: policyVersion.id,
        policyType: policyData.policyType,
        version: policyData.version,
        autoPublish,
        duration: Date.now() - startTime
      });

      return policyVersion.id;

    } catch (error) {
      logger.error('Policy version creation error', { error, policyData });
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create policy version'
      });
    }
  }

  /**
   * Publish a policy version (make it active)
   */
  async publishPolicyVersion(
    policyVersionId: string,
    approvedBy: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get the policy version
      const policyVersion = await this.prisma.policyVersion.findUnique({
        where: { id: policyVersionId }
      });

      if (!policyVersion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy version not found'
        });
      }

      await this.prisma.$transaction(async (tx) => {
        // Deactivate previous versions
        await tx.policyVersion.updateMany({
          where: {
            policyType: policyVersion.policyType,
            isActive: true,
            id: { not: policyVersionId }
          },
          data: { isActive: false }
        });

        // Activate the new version
        await tx.policyVersion.update({
          where: { id: policyVersionId },
          data: {
            isActive: true,
            publishedAt: new Date(),
            approvedById: approvedBy,
            approvedAt: new Date()
          }
        });
      });

      // Clear caches
      this.clearCacheForPolicyType(policyVersion.policyType);

      logger.info('Policy version published', {
        policyVersionId,
        policyType: policyVersion.policyType,
        version: policyVersion.version,
        approvedBy,
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Policy version publication error', { error, policyVersionId });
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to publish policy version'
      });
    }
  }

  /**
   * Record user acceptance of a policy version
   */
  async recordPolicyAcceptance(
    acceptanceData: PolicyAcceptanceData
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if user has already accepted this policy version
      const existingAcceptance = await this.prisma.policyAcceptance.findUnique({
        where: {
          policyVersionId_userId: {
            policyVersionId: acceptanceData.policyVersionId,
            userId: acceptanceData.userId
          }
        }
      });

      if (existingAcceptance) {
        logger.debug('User already accepted this policy version', {
          policyVersionId: acceptanceData.policyVersionId,
          userId: acceptanceData.userId
        });
        return;
      }

      // Get policy version details for validation
      const policyVersion = await this.prisma.policyVersion.findUnique({
        where: { id: acceptanceData.policyVersionId }
      });

      if (!policyVersion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Policy version not found'
        });
      }

      if (!policyVersion.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot accept inactive policy version'
        });
      }

      // Record the acceptance
      await this.prisma.policyAcceptance.create({
        data: {
          policyVersionId: acceptanceData.policyVersionId,
          userId: acceptanceData.userId,
          acceptanceMethod: acceptanceData.acceptanceMethod || 'CLICK_THROUGH',
          ipAddress: acceptanceData.ipAddress,
          userAgent: acceptanceData.userAgent,
          userAge: acceptanceData.userAge,
          requiresParentalConsent: acceptanceData.requiresParentalConsent || false,
          parentalConsentGiven: acceptanceData.parentalConsentBy ? true : false,
          parentalConsentBy: acceptanceData.parentalConsentBy
        }
      });

      // Clear user status cache
      this.userStatusCache.delete(acceptanceData.userId);

      logger.info('Policy acceptance recorded', {
        policyVersionId: acceptanceData.policyVersionId,
        userId: acceptanceData.userId,
        policyType: policyVersion.policyType,
        version: policyVersion.version,
        acceptanceMethod: acceptanceData.acceptanceMethod,
        duration: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Policy acceptance recording error', { error, acceptanceData });
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to record policy acceptance'
      });
    }
  }

  /**
   * Get user's policy status (pending acceptances, recent acceptances)
   */
  async getUserPolicyStatus(userId: string): Promise<UserPolicyStatus> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.userStatusCache.get(userId);
      if (cached) {
        logger.debug('User policy status cache hit', { userId, duration: Date.now() - startTime });
        return cached;
      }

      // Get all active policies that require acceptance
      const activePolicies = await this.prisma.policyVersion.findMany({
        where: {
          isActive: true,
          requiresAcceptance: true,
          effectiveDate: { lte: new Date() }
        },
        select: {
          id: true,
          policyType: true,
          version: true,
          title: true,
          effectiveDate: true,
          acceptanceDeadline: true
        }
      });

      // Get user's existing acceptances
      const userAcceptances = await this.prisma.policyAcceptance.findMany({
        where: { userId },
        include: {
          policyVersion: {
            select: {
              policyType: true,
              version: true,
              title: true
            }
          }
        },
        orderBy: { acceptedAt: 'desc' },
        take: 10 // Last 10 acceptances
      });

      // Determine pending acceptances
      const acceptedPolicyIds = new Set(userAcceptances.map(a => a.policyVersionId));
      const now = new Date();

      const pendingAcceptances = activePolicies
        .filter(policy => !acceptedPolicyIds.has(policy.id))
        .map(policy => ({
          policyVersionId: policy.id,
          policyType: policy.policyType,
          version: policy.version,
          title: policy.title,
          effectiveDate: policy.effectiveDate,
          acceptanceDeadline: policy.acceptanceDeadline,
          isOverdue: policy.acceptanceDeadline ? now > policy.acceptanceDeadline : false
        }));

      const recentAcceptances = userAcceptances.map(acceptance => ({
        policyVersionId: acceptance.policyVersionId,
        policyType: acceptance.policyVersion.policyType,
        version: acceptance.policyVersion.version,
        acceptedAt: acceptance.acceptedAt,
        acceptanceMethod: acceptance.acceptanceMethod
      }));

      const status: UserPolicyStatus = {
        userId,
        pendingAcceptances,
        recentAcceptances
      };

      // Cache the result
      this.userStatusCache.set(userId, status);

      logger.debug('User policy status computed', {
        userId,
        pendingCount: pendingAcceptances.length,
        recentCount: recentAcceptances.length,
        duration: Date.now() - startTime
      });

      return status;

    } catch (error) {
      logger.error('Get user policy status error', { error, userId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user policy status'
      });
    }
  }

  /**
   * Get active policy version by type
   */
  async getActivePolicyVersion(policyType: PolicyType): Promise<any> {
    try {
      const cacheKey = `active-${policyType}`;
      let policy = this.activePoliciesCache.get(cacheKey);

      if (!policy) {
        policy = await this.prisma.policyVersion.findFirst({
          where: {
            policyType,
            isActive: true,
            effectiveDate: { lte: new Date() }
          },
          orderBy: { effectiveDate: 'desc' }
        });

        if (policy) {
          this.activePoliciesCache.set(cacheKey, policy);
        }
      }

      return policy;

    } catch (error) {
      logger.error('Get active policy version error', { error, policyType });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get active policy version'
      });
    }
  }

  /**
   * Get users who need to accept policies (for notifications)
   */
  async getUsersNeedingPolicyAcceptance(
    policyType?: PolicyType,
    overdueOnly: boolean = false
  ): Promise<Array<{ userId: string; policyVersionId: string; acceptanceDeadline?: Date }>> {
    try {
      const whereClause: any = {
        isActive: true,
        requiresAcceptance: true,
        effectiveDate: { lte: new Date() }
      };

      if (policyType) {
        whereClause.policyType = policyType;
      }

      if (overdueOnly) {
        whereClause.acceptanceDeadline = { lt: new Date() };
      }

      // Get active policies requiring acceptance
      const policies = await this.prisma.policyVersion.findMany({
        where: whereClause,
        select: { id: true, acceptanceDeadline: true }
      });

      if (policies.length === 0) return [];

      const policyIds = policies.map(p => p.id);

      // Get all users who haven't accepted these policies
      const usersWithoutAcceptance = await this.prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          policyAcceptances: {
            none: {
              policyVersionId: { in: policyIds }
            }
          }
        },
        select: { id: true }
      });

      // Create result mapping
      const result: Array<{ userId: string; policyVersionId: string; acceptanceDeadline?: Date }> = [];
      
      for (const user of usersWithoutAcceptance) {
        for (const policy of policies) {
          result.push({
            userId: user.id,
            policyVersionId: policy.id,
            acceptanceDeadline: policy.acceptanceDeadline
          });
        }
      }

      return result;

    } catch (error) {
      logger.error('Get users needing policy acceptance error', { error, policyType, overdueOnly });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get users needing policy acceptance'
      });
    }
  }

  /**
   * Get policy acceptance statistics
   */
  async getPolicyAcceptanceStatistics(policyVersionId?: string): Promise<any> {
    try {
      const whereClause: any = {};
      if (policyVersionId) {
        whereClause.policyVersionId = policyVersionId;
      }

      const [
        totalAcceptances,
        acceptancesByMethod,
        acceptancesByDay,
        parentalConsents
      ] = await Promise.all([
        this.prisma.policyAcceptance.count({ where: whereClause }),
        this.prisma.policyAcceptance.groupBy({
          by: ['acceptanceMethod'],
          where: whereClause,
          _count: true
        }),
        this.prisma.policyAcceptance.groupBy({
          by: ['acceptedAt'],
          where: {
            ...whereClause,
            acceptedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          },
          _count: true
        }),
        this.prisma.policyAcceptance.count({
          where: { ...whereClause, requiresParentalConsent: true }
        })
      ]);

      return {
        totalAcceptances,
        acceptancesByMethod: Object.fromEntries(
          acceptancesByMethod.map(item => [item.acceptanceMethod, item._count])
        ),
        acceptancesByDay: acceptancesByDay.map(item => ({
          date: item.acceptedAt,
          count: item._count
        })),
        parentalConsents
      };

    } catch (error) {
      logger.error('Get policy acceptance statistics error', { error, policyVersionId });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get policy acceptance statistics'
      });
    }
  }

  // Private helper methods

  private async deactivatePreviousVersions(policyType: PolicyType, excludeId: string): Promise<void> {
    await this.prisma.policyVersion.updateMany({
      where: {
        policyType,
        isActive: true,
        id: { not: excludeId }
      },
      data: { isActive: false }
    });
  }

  private clearCacheForPolicyType(policyType: PolicyType): void {
    const cacheKey = `active-${policyType}`;
    this.activePoliciesCache.delete(cacheKey);
    
    // Clear user status cache (all users might be affected)
    this.userStatusCache.clear();
  }

  /**
   * Get service statistics for monitoring
   */
  getServiceStats() {
    return {
      activePoliciesCache: {
        size: this.activePoliciesCache.size,
        max: this.activePoliciesCache.max
      },
      userStatusCache: {
        size: this.userStatusCache.size,
        max: this.userStatusCache.max
      },
      policyContentCache: {
        size: this.policyContentCache.size,
        max: this.policyContentCache.max
      }
    };
  }

  /**
   * Clear all caches (for testing or maintenance)
   */
  clearCaches(): void {
    this.activePoliciesCache.clear();
    this.userStatusCache.clear();
    this.policyContentCache.clear();
  }
}