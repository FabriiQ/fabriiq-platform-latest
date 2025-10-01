/**
 * Payment Status Synchronization Service
 * 
 * This service fixes payment status inconsistencies between enrollment fees,
 * challans, and transactions with proper atomic updates and conflict resolution.
 */

import { PrismaClient, PaymentStatusType } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export interface PaymentStatusSyncConfig {
  prisma: PrismaClient;
  enableOptimisticLocking?: boolean;
  enableConflictResolution?: boolean;
  maxRetries?: number;
}

export interface PaymentStatusSyncResult {
  enrollmentFeeId: string;
  previousStatus: PaymentStatusType;
  newStatus: PaymentStatusType;
  totalPaid: number;
  totalDue: number;
  syncedAt: Date;
  conflictsResolved: number;
  retryCount: number;
}

export interface BulkSyncResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: PaymentStatusSyncResult[];
  errors: string[];
  executionTime: number;
}

export class PaymentStatusSyncService {
  private prisma: PrismaClient;
  private config: PaymentStatusSyncConfig;

  constructor(config: PaymentStatusSyncConfig) {
    this.prisma = config.prisma;
    this.config = {
      enableOptimisticLocking: true,
      enableConflictResolution: true,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Synchronize payment status for a single enrollment fee with atomic updates
   */
  async syncPaymentStatus(
    enrollmentFeeId: string,
    options?: { forceSync?: boolean; retryCount?: number }
  ): Promise<PaymentStatusSyncResult> {
    const retryCount = options?.retryCount || 0;
    const maxRetries = this.config.maxRetries || 3;

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get enrollment fee with lock version for optimistic locking
        const enrollmentFee = await tx.enrollmentFee.findUnique({
          where: { id: enrollmentFeeId },
          include: {
            transactions: { where: { status: 'ACTIVE' } },
            lateFeeApplications: { 
              where: { status: { in: ['APPLIED', 'PAID'] } }
            }
          }
        });

        if (!enrollmentFee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment fee not found'
          });
        }

        const previousStatus = enrollmentFee.paymentStatus;

        // Calculate total paid amount
        const totalPaid = enrollmentFee.transactions.reduce(
          (sum, txn) => sum + txn.amount, 0
        );

        // Calculate total due amount (including late fees)
        const lateFeeAmount = enrollmentFee.lateFeeApplications.reduce(
          (sum, app) => sum + (app.appliedAmount - app.waivedAmount), 0
        );
        const totalDue = enrollmentFee.finalAmount + lateFeeAmount;

        // Determine correct payment status
        let newStatus: PaymentStatusType;
        if (totalPaid >= totalDue) {
          newStatus = 'PAID';
        } else if (totalPaid > 0) {
          newStatus = 'PARTIAL';
        } else if (enrollmentFee.dueDate && enrollmentFee.dueDate < new Date()) {
          newStatus = 'OVERDUE';
        } else {
          newStatus = 'PENDING';
        }

        let conflictsResolved = 0;

        // Update enrollment fee with optimistic locking
        try {
          const updatedFee = await tx.enrollmentFee.update({
            where: {
              id: enrollmentFeeId,
              ...(this.config.enableOptimisticLocking && {
                lockVersion: (enrollmentFee as any).lockVersion || 0
              })
            },
            data: {
              paymentStatus: newStatus,
              ...(lateFeeAmount !== undefined && { computedLateFee: lateFeeAmount } as any),
              statusSyncedAt: new Date(),
              lockVersion: { increment: 1 }
            } as any
          });

          // Sync related challans
          await this.syncRelatedChallans(tx, enrollmentFeeId, newStatus, totalPaid);

          return {
            enrollmentFeeId,
            previousStatus,
            newStatus,
            totalPaid,
            totalDue,
            syncedAt: new Date(),
            conflictsResolved,
            retryCount
          };

        } catch (error: any) {
          // Handle optimistic locking conflicts
          if (this.config.enableConflictResolution && 
              error.code === 'P2025' && 
              retryCount < maxRetries) {
            
            console.log(`Optimistic lock conflict for ${enrollmentFeeId}, retrying...`);
            conflictsResolved++;
            
            // Retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
            return this.syncPaymentStatus(enrollmentFeeId, { 
              forceSync: true, 
              retryCount: retryCount + 1 
            });
          }
          throw error;
        }
      });

    } catch (error) {
      console.error(`Payment status sync failed for ${enrollmentFeeId}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to synchronize payment status',
        cause: error
      });
    }
  }

  /**
   * Bulk synchronize payment statuses for multiple enrollment fees
   */
  async bulkSyncPaymentStatuses(
    enrollmentFeeIds: string[],
    options?: { batchSize?: number; continueOnError?: boolean }
  ): Promise<BulkSyncResult> {
    const startTime = Date.now();
    const batchSize = options?.batchSize || 50;
    const continueOnError = options?.continueOnError ?? true;

    const result: BulkSyncResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      results: [],
      errors: [],
      executionTime: 0
    };

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < enrollmentFeeIds.length; i += batchSize) {
      const batch = enrollmentFeeIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (enrollmentFeeId) => {
        try {
          const syncResult = await this.syncPaymentStatus(enrollmentFeeId);
          result.results.push(syncResult);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push(`${enrollmentFeeId}: ${(error as Error).message}`);
          
          if (!continueOnError) {
            throw error;
          }
        }
        result.totalProcessed++;
      });

      // Wait for current batch to complete
      await Promise.allSettled(batchPromises);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Identify and fix payment status inconsistencies
   */
  async identifyAndFixInconsistencies(options?: {
    campusId?: string;
    limit?: number;
    autoFix?: boolean;
  }): Promise<{
    inconsistencies: Array<{
      enrollmentFeeId: string;
      currentStatus: PaymentStatusType;
      expectedStatus: PaymentStatusType;
      totalPaid: number;
      totalDue: number;
      discrepancy: string;
    }>;
    fixedCount: number;
    errors: string[];
  }> {
    const limit = options?.limit || 1000;
    const autoFix = options?.autoFix ?? false;

    // Query to find potential inconsistencies
    const enrollmentFees = await this.prisma.enrollmentFee.findMany({
      where: {
        ...(options?.campusId && {
          enrollment: {
            class: {
              programCampus: {
                campusId: options.campusId
              }
            }
          }
        })
      },
      include: {
        transactions: { where: { status: 'ACTIVE' } },
        lateFeeApplications: { 
          where: { status: { in: ['APPLIED', 'PAID'] } }
        }
      },
      take: limit
    });

    const inconsistencies: Array<{
      enrollmentFeeId: string;
      currentStatus: PaymentStatusType;
      expectedStatus: PaymentStatusType;
      totalPaid: number;
      totalDue: number;
      discrepancy: string;
    }> = [];
    const errors: string[] = [];
    let fixedCount = 0;

    for (const fee of enrollmentFees) {
      try {
        // Calculate expected values
        const totalPaid = fee.transactions.reduce((sum, txn) => sum + txn.amount, 0);
        const lateFeeAmount = fee.lateFeeApplications.reduce(
          (sum, app) => sum + (app.appliedAmount - app.waivedAmount), 0
        );
        const totalDue = fee.finalAmount + lateFeeAmount;

        // Determine expected status
        let expectedStatus: PaymentStatusType;
        if (totalPaid >= totalDue) {
          expectedStatus = 'PAID';
        } else if (totalPaid > 0) {
          expectedStatus = 'PARTIAL';
        } else if (fee.dueDate && fee.dueDate < new Date()) {
          expectedStatus = 'OVERDUE';
        } else {
          expectedStatus = 'PENDING';
        }

        // Check for inconsistencies
        const storedLateFee = (fee as any).computedLateFee || 0;
        if (fee.paymentStatus !== expectedStatus ||
            Math.abs(storedLateFee - lateFeeAmount) > 0.01) {

          const discrepancy: string[] = [];
          if (fee.paymentStatus !== expectedStatus) {
            discrepancy.push(`Status: ${fee.paymentStatus} → ${expectedStatus}`);
          }
          if (Math.abs(storedLateFee - lateFeeAmount) > 0.01) {
            discrepancy.push(`Late fee: ${storedLateFee} → ${lateFeeAmount}`);
          }

          inconsistencies.push({
            enrollmentFeeId: fee.id,
            currentStatus: fee.paymentStatus,
            expectedStatus,
            totalPaid,
            totalDue,
            discrepancy: discrepancy.join(', ')
          });

          // Auto-fix if enabled
          if (autoFix) {
            try {
              await this.syncPaymentStatus(fee.id);
              fixedCount++;
            } catch (error) {
              errors.push(`Failed to fix ${fee.id}: ${(error as Error).message}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Error processing ${fee.id}: ${(error as Error).message}`);
      }
    }

    return {
      inconsistencies,
      fixedCount,
      errors
    };
  }

  /**
   * Sync related challan statuses
   */
  private async syncRelatedChallans(
    tx: any,
    enrollmentFeeId: string,
    paymentStatus: PaymentStatusType,
    totalPaid: number
  ): Promise<void> {
    await tx.feeChallan.updateMany({
      where: { enrollmentFeeId },
      data: {
        paymentStatus,
        paidAmount: totalPaid,
        statusSyncedAt: new Date()
      }
    });
  }

  /**
   * Create payment reconciliation record for discrepancies
   */
  async createReconciliationRecord(
    enrollmentFeeId: string,
    expectedAmount: number,
    actualPaidAmount: number,
    notes?: string
  ): Promise<void> {
    // TODO: Implement after PaymentReconciliation table is created
    console.log('Payment reconciliation record needed:', {
      enrollmentFeeId,
      expectedAmount,
      actualPaidAmount,
      notes: notes || 'Automated reconciliation record'
    });
  }

  /**
   * Detect payment status inconsistencies across the system
   */
  async detectInconsistencies(options: {
    campusId?: string;
    autoFix?: boolean;
  } = {}): Promise<{
    inconsistencies: Array<{
      enrollmentFeeId: string;
      currentStatus: PaymentStatusType;
      expectedStatus: PaymentStatusType;
      totalPaid: number;
      totalDue: number;
      discrepancy: string;
    }>;
    fixed: number;
    errors: string[];
  }> {
    const result = await this.identifyAndFixInconsistencies({
      campusId: options.campusId,
      autoFix: options.autoFix || false
    });

    return {
      inconsistencies: result.inconsistencies,
      fixed: result.fixedCount,
      errors: result.errors
    };
  }

  /**
   * Get payment status sync statistics
   */
  async getSyncStatistics(campusId?: string): Promise<{
    totalFees: number;
    statusDistribution: Record<PaymentStatusType, number>;
    lastSyncedCount: number;
    inconsistentCount: number;
    averageSyncAge: number;
  }> {
    const whereClause = campusId ? {
      enrollment: {
        class: {
          programCampus: {
            campusId
          }
        }
      }
    } : {};

    const totalFees = await this.prisma.enrollmentFee.count({ where: whereClause });

    const statusDistribution = await this.prisma.enrollmentFee.groupBy({
      by: ['paymentStatus'],
      where: whereClause,
      _count: true
    });

    // TODO: Implement after statusSyncedAt field is available in Prisma client
    const recentlySynced = 0; // Placeholder until field is available

    // TODO: Implement after statusSyncedAt field is available in Prisma client
    const avgSyncAge = { _avg: { statusSyncedAt: null } }; // Placeholder

    const statusDist: Record<PaymentStatusType, number> = {
      PENDING: 0,
      PARTIAL: 0,
      PAID: 0,
      OVERDUE: 0,
      WAIVED: 0
    };

    statusDistribution.forEach(item => {
      statusDist[item.paymentStatus] = item._count;
    });

    return {
      totalFees,
      statusDistribution: statusDist,
      lastSyncedCount: recentlySynced,
      inconsistentCount: 0, // Would need complex query to calculate
      averageSyncAge: avgSyncAge._avg.statusSyncedAt ? 
        Date.now() - new Date(avgSyncAge._avg.statusSyncedAt).getTime() : 0
    };
  }
}
