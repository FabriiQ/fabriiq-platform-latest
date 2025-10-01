/**
 * High-Performance Consent Verification Service
 * Optimized for 10K+ concurrent users with caching and batch operations
 */

import { PrismaClient, User, ConsentStatus, LegalBasis } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

export interface ConsentVerificationResult {
  userId: string;
  consentStatus: ConsentStatus;
  legalBasis: LegalBasis;
  consentRequired: boolean;
  consentObtained: boolean;
  lastUpdated?: Date;
}

export interface ConsentMatrix {
  allConsentsValid: boolean;
  invalidConsents: string[]; // User IDs with invalid consent
  consentResults: ConsentVerificationResult[];
  canProceed: boolean;
}

export interface ConsentData {
  userId: string;
  dataCategories: string[];
  purpose: string;
  legalBasis: LegalBasis;
  jurisdiction: string;
}

/**
 * High-performance consent verification service with caching
 */
export class ConsentService {
  // Performance optimization: Cache consent status
  private consentCache = new LRUCache<string, ConsentVerificationResult>({
    max: 50000, // Cache 50K consent records
    ttl: 10 * 60 * 1000, // 10 minutes TTL
  });

  // Batch processing cache for bulk operations
  private batchCache = new LRUCache<string, ConsentMatrix>({
    max: 5000, // Cache 5K batch results
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  });

  constructor(private prisma: PrismaClient) {}

  /**
   * Get user consent status with high-performance caching
   */
  async getUserConsentStatus(
    userId: string, 
    dataCategories: string[]
  ): Promise<ConsentVerificationResult> {
    const startTime = Date.now();
    
    try {
      // Create cache key
      const cacheKey = `${userId}-${dataCategories.sort().join(',')}`;
      const cached = this.consentCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Consent cache hit', { userId, cacheKey, duration: Date.now() - startTime });
        return cached;
      }

      // Fetch from database
      const result = await this.fetchUserConsent(userId, dataCategories);
      
      // Cache result
      this.consentCache.set(cacheKey, result);
      
      logger.debug('Consent verified', { 
        userId, 
        result: result.consentStatus,
        duration: Date.now() - startTime 
      });

      return result;
    } catch (error) {
      logger.error('Consent verification error', { error, userId, dataCategories });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify consent'
      });
    }
  }

  /**
   * Verify consents for multiple recipients (batch operation)
   */
  async verifyMessageConsents(
    recipients: User[],
    dataCategories: string[],
    purpose: string = 'messaging'
  ): Promise<ConsentMatrix> {
    const startTime = Date.now();
    
    try {
      // Create batch cache key
      const recipientIds = recipients.map(r => r.id).sort();
      const batchKey = `${recipientIds.join(',')}-${dataCategories.sort().join(',')}-${purpose}`;
      const cached = this.batchCache.get(batchKey);
      
      if (cached) {
        logger.debug('Batch consent cache hit', { 
          recipientCount: recipients.length, 
          duration: Date.now() - startTime 
        });
        return cached;
      }

      // Perform batch verification
      const consentResults = await Promise.all(
        recipients.map(recipient => 
          this.getUserConsentStatus(recipient.id, dataCategories)
        )
      );

      // Analyze results
      const invalidConsents = consentResults
        .filter(result => !result.consentObtained && result.consentRequired)
        .map(result => result.userId);

      const matrix: ConsentMatrix = {
        allConsentsValid: invalidConsents.length === 0,
        invalidConsents,
        consentResults,
        canProceed: invalidConsents.length === 0
      };

      // Cache batch result
      this.batchCache.set(batchKey, matrix);

      logger.info('Batch consent verification completed', {
        recipientCount: recipients.length,
        validConsents: consentResults.length - invalidConsents.length,
        invalidConsents: invalidConsents.length,
        canProceed: matrix.canProceed,
        duration: Date.now() - startTime
      });

      return matrix;
    } catch (error) {
      logger.error('Batch consent verification error', { 
        error, 
        recipientCount: recipients.length,
        dataCategories 
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify recipient consents'
      });
    }
  }

  /**
   * Capture user consent (with audit logging)
   */
  async captureConsent(consentData: ConsentData): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.prisma.$transaction(async (tx) => {
        // Create or update consent record
        await tx.userConsent.upsert({
          where: {
            userId_dataCategory: {
              userId: consentData.userId,
              dataCategory: consentData.dataCategories.join(',')
            }
          },
          update: {
            consentGiven: true,
            legalBasis: consentData.legalBasis,
            purpose: consentData.purpose,
            jurisdiction: consentData.jurisdiction,
            updatedAt: new Date()
          },
          create: {
            userId: consentData.userId,
            dataCategory: consentData.dataCategories.join(','),
            consentGiven: true,
            legalBasis: consentData.legalBasis,
            purpose: consentData.purpose,
            jurisdiction: consentData.jurisdiction,
            consentDate: new Date()
          }
        });

        // Create audit log
        await tx.consentAuditLog.create({
          data: {
            userId: consentData.userId,
            action: 'CONSENT_GIVEN',
            dataCategories: consentData.dataCategories,
            legalBasis: consentData.legalBasis,
            purpose: consentData.purpose,
            jurisdiction: consentData.jurisdiction,
            timestamp: new Date()
          }
        });
      });

      // Invalidate cache for this user
      this.invalidateUserCache(consentData.userId);

      logger.info('Consent captured', {
        userId: consentData.userId,
        dataCategories: consentData.dataCategories,
        legalBasis: consentData.legalBasis,
        duration: Date.now() - startTime
      });
    } catch (error) {
      logger.error('Consent capture error', { error, consentData });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to capture consent'
      });
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(
    userId: string, 
    dataCategories: string[],
    reason?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.prisma.$transaction(async (tx) => {
        // Update consent record
        await tx.userConsent.updateMany({
          where: {
            userId,
            dataCategory: { in: dataCategories.map(cat => cat) }
          },
          data: {
            consentGiven: false,
            withdrawnAt: new Date(),
            withdrawalReason: reason,
            updatedAt: new Date()
          }
        });

        // Create audit log
        await tx.consentAuditLog.create({
          data: {
            userId,
            action: 'CONSENT_WITHDRAWN',
            dataCategories,
            reason,
            timestamp: new Date()
          }
        });
      });

      // Invalidate cache
      this.invalidateUserCache(userId);

      logger.info('Consent withdrawn', {
        userId,
        dataCategories,
        reason,
        duration: Date.now() - startTime
      });
    } catch (error) {
      logger.error('Consent withdrawal error', { error, userId, dataCategories });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to withdraw consent'
      });
    }
  }

  /**
   * Fetch user consent from database
   */
  private async fetchUserConsent(
    userId: string, 
    dataCategories: string[]
  ): Promise<ConsentVerificationResult> {
    // For educational messaging, we often rely on legitimate interest
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true, dateOfBirth: true }
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Check if user is a minor (requires parental consent)
    const isMinor = user.dateOfBirth ? 
      (new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()) < 18 : false;

    // For educational contexts, we can often rely on legitimate interest
    const isEducationalContext = dataCategories.some(cat => 
      ['academic', 'educational', 'learning'].includes(cat.toLowerCase())
    );

    // Simplified consent logic for educational messaging
    if (isEducationalContext && !isMinor) {
      return {
        userId,
        consentStatus: 'NOT_REQUIRED',
        legalBasis: 'LEGITIMATE_INTEREST',
        consentRequired: false,
        consentObtained: true,
        lastUpdated: new Date()
      };
    }

    // For minors or non-educational content, check explicit consent
    const consentRecord = await this.prisma.userConsent.findFirst({
      where: {
        userId,
        dataCategory: { in: dataCategories }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return {
      userId,
      consentStatus: consentRecord?.consentGiven ? 'OBTAINED' : 'REQUIRED',
      legalBasis: consentRecord?.legalBasis || 'CONSENT',
      consentRequired: !consentRecord?.consentGiven,
      consentObtained: consentRecord?.consentGiven || false,
      lastUpdated: consentRecord?.updatedAt
    };
  }

  /**
   * Invalidate cache for a specific user
   */
  private invalidateUserCache(userId: string): void {
    // Remove all cache entries for this user
    for (const key of this.consentCache.keys()) {
      if (key.startsWith(userId)) {
        this.consentCache.delete(key);
      }
    }
    
    // Clear batch cache (simpler approach)
    this.batchCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      consentCache: {
        size: this.consentCache.size,
        max: this.consentCache.max,
        calculatedSize: this.consentCache.calculatedSize,
      },
      batchCache: {
        size: this.batchCache.size,
        max: this.batchCache.max,
        calculatedSize: this.batchCache.calculatedSize,
      }
    };
  }

  /**
   * Clear all caches (for testing or maintenance)
   */
  clearCaches(): void {
    this.consentCache.clear();
    this.batchCache.clear();
  }
}
