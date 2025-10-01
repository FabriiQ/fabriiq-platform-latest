/**
 * Enhanced Fee Integration Service
 * 
 * This service resolves the critical disconnect between late fee calculations
 * and enrollment fee final amounts by providing proper integration and
 * synchronization mechanisms.
 */

import { PrismaClient, PaymentStatusType, LateFeeStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export interface EnhancedFeeIntegrationConfig {
  prisma: PrismaClient;
  enableAutomaticSync?: boolean;
  enableAuditTrail?: boolean;
}

export interface FeeCalculationResult {
  enrollmentFeeId: string;
  baseAmount: number;
  discountedAmount: number;
  finalAmount: number;
  computedLateFee: number;
  totalAmountWithLateFees: number;
  paymentStatus: PaymentStatusType;
  calculationDetails: {
    discounts: number;
    additionalCharges: number;
    arrears: number;
    lateFees: number;
    appliedWaivers: number;
  };
}

export interface LateFeeIntegrationResult {
  success: boolean;
  enrollmentFeeId: string;
  previousComputedLateFee: number;
  newComputedLateFee: number;
  totalAmountChange: number;
  affectedTransactions: string[];
  paymentStatusChanged: boolean;
  newPaymentStatus?: PaymentStatusType;
}

export class EnhancedFeeIntegrationService {
  private prisma: PrismaClient;
  private enableAutomaticSync: boolean;
  private enableAuditTrail: boolean;

  constructor(config: EnhancedFeeIntegrationConfig) {
    this.prisma = config.prisma;
    this.enableAutomaticSync = config.enableAutomaticSync ?? true;
    this.enableAuditTrail = config.enableAuditTrail ?? true;
  }

  /**
   * Recalculate and synchronize all fee components for an enrollment fee
   */
  async recalculateAndSyncFee(enrollmentFeeId: string, performedBy: string): Promise<FeeCalculationResult> {
    try {
      // Start transaction for atomic operations
      return await this.prisma.$transaction(async (tx) => {
        // Get current enrollment fee with all related data
        const enrollmentFee = await tx.enrollmentFee.findUnique({
          where: { id: enrollmentFeeId },
          include: {
            feeStructure: true,
            discounts: { where: { status: 'ACTIVE' } },
            additionalCharges: { where: { status: 'ACTIVE' } },
            arrears: { where: { status: 'ACTIVE' } },
            lateFeeApplications: { 
              where: { status: { in: [LateFeeStatus.APPLIED, LateFeeStatus.PAID] } }
            },
            transactions: { where: { status: 'ACTIVE' } }
          }
        });

        if (!enrollmentFee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment fee not found'
          });
        }

        // Calculate base amount from fee structure
        const feeComponents = enrollmentFee.feeStructure.feeComponents as any[];
        const baseAmount = feeComponents.reduce((sum, component) => sum + (component.amount || 0), 0);

        // Calculate total discounts
        const totalDiscounts = enrollmentFee.discounts.reduce((sum, discount) => sum + discount.amount, 0);
        const discountedAmount = Math.max(0, baseAmount - totalDiscounts);

        // Calculate additional charges and arrears
        const totalCharges = enrollmentFee.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
        const totalArrears = enrollmentFee.arrears.reduce((sum, arrear) => sum + arrear.amount, 0);

        // Calculate final amount (before late fees)
        const finalAmount = discountedAmount + totalCharges + totalArrears;

        // Calculate computed late fees (with waivers)
        const computedLateFee = enrollmentFee.lateFeeApplications.reduce(
          (sum, app) => sum + (app.appliedAmount - app.waivedAmount), 0
        );

        // Calculate total amount including late fees
        const totalAmountWithLateFees = finalAmount + computedLateFee;

        // Calculate total paid amount
        const totalPaid = enrollmentFee.transactions.reduce((sum, txn) => sum + txn.amount, 0);

        // Determine payment status
        let paymentStatus: PaymentStatusType;
        if (totalPaid >= totalAmountWithLateFees) {
          paymentStatus = 'PAID';
        } else if (totalPaid > 0) {
          paymentStatus = 'PARTIAL';
        } else if (enrollmentFee.dueDate && enrollmentFee.dueDate < new Date()) {
          paymentStatus = 'OVERDUE';
        } else {
          paymentStatus = 'PENDING';
        }

        // Update enrollment fee with calculated values
        const updatedFee = await tx.enrollmentFee.update({
          where: { id: enrollmentFeeId },
          data: {
            baseAmount,
            discountedAmount,
            finalAmount,
            computedLateFee,
            paymentStatus,
            lastLateFeeCalculation: new Date(),
            version: { increment: 1 },
            statusSyncedAt: new Date(),
            lockVersion: { increment: 1 },
            lastChangeReason: 'Automated fee recalculation and sync'
          } as any
        });

        // Create audit trail if enabled
        if (this.enableAuditTrail) {
          await this.createCalculationAudit(tx, {
            enrollmentFeeId,
            calculationType: 'RECALCULATION',
            previousAmount: enrollmentFee.finalAmount,
            newAmount: finalAmount,
            changeAmount: finalAmount - enrollmentFee.finalAmount,
            reason: 'Complete fee recalculation with late fee integration',
            calculationDetails: {
              baseAmount,
              discountedAmount,
              finalAmount,
              computedLateFee,
              totalAmountWithLateFees,
              discounts: totalDiscounts,
              additionalCharges: totalCharges,
              arrears: totalArrears,
              lateFees: computedLateFee,
              appliedWaivers: enrollmentFee.lateFeeApplications.reduce((sum, app) => sum + app.waivedAmount, 0)
            },
            performedBy,
            isAutomated: true
          });
        }

        // Sync related challan statuses if automatic sync is enabled
        if (this.enableAutomaticSync) {
          await this.syncRelatedChallanStatuses(tx, enrollmentFeeId, paymentStatus, totalPaid);
        }

        return {
          enrollmentFeeId,
          baseAmount,
          discountedAmount,
          finalAmount,
          computedLateFee,
          totalAmountWithLateFees,
          paymentStatus,
          calculationDetails: {
            discounts: totalDiscounts,
            additionalCharges: totalCharges,
            arrears: totalArrears,
            lateFees: computedLateFee,
            appliedWaivers: enrollmentFee.lateFeeApplications.reduce((sum, app) => sum + app.waivedAmount, 0)
          }
        };
      });
    } catch (error) {
      console.error('Error in recalculateAndSyncFee:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to recalculate and sync fee',
        cause: error
      });
    }
  }

  /**
   * Apply late fee and integrate with enrollment fee
   */
  async applyLateFeeWithIntegration(data: {
    enrollmentFeeId: string;
    lateFeeApplicationId: string;
    performedBy: string;
  }): Promise<LateFeeIntegrationResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get current enrollment fee
        const enrollmentFee = await tx.enrollmentFee.findUnique({
          where: { id: data.enrollmentFeeId },
          select: {
            id: true,
            paymentStatus: true
          } as any
        });

        if (!enrollmentFee) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment fee not found'
          });
        }

        const previousComputedLateFee = (enrollmentFee as any).computedLateFee || 0;
        const previousPaymentStatus = (enrollmentFee as any).paymentStatus;

        // Update late fee application status
        await tx.lateFeeApplication.update({
          where: { id: data.lateFeeApplicationId },
          data: {
            status: LateFeeStatus.APPLIED,
            applicationDate: new Date()
          }
        });

        // Recalculate the fee with the new late fee
        const calculationResult = await this.recalculateAndSyncFee(data.enrollmentFeeId, data.performedBy);

        // Check if payment status changed (get updated status from database)
        const updatedFee = await tx.enrollmentFee.findUnique({
          where: { id: data.enrollmentFeeId },
          select: { paymentStatus: true }
        });
        const paymentStatusChanged = previousPaymentStatus !== updatedFee?.paymentStatus;

        return {
          success: true,
          enrollmentFeeId: data.enrollmentFeeId,
          previousComputedLateFee,
          newComputedLateFee: calculationResult.computedLateFee,
          totalAmountChange: calculationResult.computedLateFee - previousComputedLateFee,
          affectedTransactions: [], // Could be populated with related transaction IDs
          paymentStatusChanged,
          newPaymentStatus: paymentStatusChanged ? calculationResult.paymentStatus : undefined
        };
      });
    } catch (error) {
      console.error('Error in applyLateFeeWithIntegration:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to apply late fee with integration',
        cause: error
      });
    }
  }

  /**
   * Synchronize payment statuses across related entities
   */
  private async syncRelatedChallanStatuses(
    tx: any,
    enrollmentFeeId: string,
    paymentStatus: PaymentStatusType,
    totalPaid: number
  ): Promise<void> {
    // Update all related challans
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
   * Create calculation audit record
   */
  private async createCalculationAudit(tx: any, data: {
    enrollmentFeeId: string;
    calculationType: string;
    previousAmount?: number;
    newAmount?: number;
    changeAmount?: number;
    reason?: string;
    calculationDetails?: any;
    performedBy: string;
    isAutomated?: boolean;
  }): Promise<void> {
    // Get a valid user ID or use system user
    let performedBy = data.performedBy;
    if (performedBy === 'system') {
      // Try to find a system user or use the first available user
      const systemUser = await tx.user.findFirst({
        where: { email: { contains: 'system' } },
        select: { id: true }
      });

      if (!systemUser) {
        // Use the first available user as fallback
        const firstUser = await tx.user.findFirst({ select: { id: true } });
        performedBy = firstUser?.id || 'system';
      } else {
        performedBy = systemUser.id;
      }
    }

    // Only create audit if we have a valid user ID
    if (performedBy !== 'system') {
      await tx.$executeRaw`
        INSERT INTO fee_calculation_audit (
          id, "enrollmentFeeId", "calculationType", "previousAmount",
          "newAmount", "changeAmount", reason, "calculationDetails",
          "performedBy", "isAutomated"
        ) VALUES (
          ${`calc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`},
          ${data.enrollmentFeeId},
          ${data.calculationType},
          ${data.previousAmount},
          ${data.newAmount},
          ${data.changeAmount},
          ${data.reason || 'Automated calculation'},
          ${JSON.stringify(data.calculationDetails || {})}::jsonb,
          ${performedBy},
          ${data.isAutomated ?? false}
        )
      `;
    } else {
      console.log('Skipping audit creation - no valid user ID available');
    }
  }

  /**
   * Bulk recalculate fees for multiple enrollment fees
   */
  async bulkRecalculateAndSyncFees(
    enrollmentFeeIds: string[],
    performedBy: string
  ): Promise<{
    successful: number;
    failed: number;
    results: FeeCalculationResult[];
    errors: string[];
  }> {
    const results: FeeCalculationResult[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    for (const enrollmentFeeId of enrollmentFeeIds) {
      try {
        const result = await this.recalculateAndSyncFee(enrollmentFeeId, performedBy);
        results.push(result);
        successful++;
      } catch (error) {
        failed++;
        errors.push(`${enrollmentFeeId}: ${(error as Error).message}`);
      }
    }

    return {
      successful,
      failed,
      results,
      errors
    };
  }

  /**
   * Get fee calculation summary with late fee integration
   */
  async getFeeCalculationSummary(enrollmentFeeId: string): Promise<{
    enrollmentFeeId: string;
    currentCalculation: FeeCalculationResult;
    recentCalculations: Array<{
      calculationType: string;
      performedAt: Date;
      changeAmount: number;
      performedBy: string;
    }>;
    paymentHistory: Array<{
      amount: number;
      date: Date;
      method: string;
      reference?: string;
    }>;
  }> {
    // Get current calculation
    const currentCalculation = await this.recalculateAndSyncFee(enrollmentFeeId, 'system');

    // Get recent calculation history using raw SQL
    const recentCalculations = await this.prisma.$queryRaw<Array<{
      calculationType: string;
      performedAt: Date;
      changeAmount: number | null;
      performedBy: string;
    }>>`
      SELECT "calculationType", "performedAt", "changeAmount", "performedBy"
      FROM fee_calculation_audit
      WHERE "enrollmentFeeId" = ${enrollmentFeeId}
      ORDER BY "performedAt" DESC
      LIMIT 10
    `;

    // Get payment history
    const paymentHistory = await this.prisma.feeTransaction.findMany({
      where: {
        enrollmentFeeId,
        status: 'ACTIVE'
      },
      orderBy: { date: 'desc' },
      select: {
        amount: true,
        date: true,
        method: true,
        reference: true
      }
    });

    return {
      enrollmentFeeId,
      currentCalculation,
      recentCalculations: recentCalculations.map(calc => ({
        calculationType: calc.calculationType,
        performedAt: calc.performedAt,
        changeAmount: calc.changeAmount || 0,
        performedBy: calc.performedBy
      })),
      paymentHistory: paymentHistory.map(payment => ({
        amount: payment.amount,
        date: payment.date,
        method: payment.method,
        reference: payment.reference || undefined
      }))
    };
  }

  /**
   * Validate fee calculation integrity
   */
  async validateFeeCalculationIntegrity(enrollmentFeeId: string): Promise<{
    isValid: boolean;
    discrepancies: string[];
    recommendations: string[];
  }> {
    const discrepancies: string[] = [];
    const recommendations: string[] = [];

    try {
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          feeStructure: true,
          discounts: { where: { status: 'ACTIVE' } },
          additionalCharges: { where: { status: 'ACTIVE' } },
          arrears: { where: { status: 'ACTIVE' } },
          lateFeeApplications: {
            where: { status: { in: [LateFeeStatus.APPLIED, LateFeeStatus.PAID] } }
          },
          transactions: { where: { status: 'ACTIVE' } }
        }
      });

      if (!enrollmentFee) {
        return {
          isValid: false,
          discrepancies: ['Enrollment fee not found'],
          recommendations: ['Verify enrollment fee ID']
        };
      }

      // Recalculate expected values
      const expectedCalculation = await this.recalculateAndSyncFee(enrollmentFeeId, 'system');

      // Check discrepancies
      if (Math.abs(enrollmentFee.finalAmount - expectedCalculation.finalAmount) > 0.01) {
        discrepancies.push(`Final amount mismatch: stored=${enrollmentFee.finalAmount}, expected=${expectedCalculation.finalAmount}`);
        recommendations.push('Run fee recalculation to fix final amount');
      }

      const storedLateFee = (enrollmentFee as any).computedLateFee || 0;
      if (Math.abs(storedLateFee - expectedCalculation.computedLateFee) > 0.01) {
        discrepancies.push(`Late fee mismatch: stored=${storedLateFee}, expected=${expectedCalculation.computedLateFee}`);
        recommendations.push('Recalculate late fees and sync with enrollment fee');
      }

      if (enrollmentFee.paymentStatus !== expectedCalculation.paymentStatus) {
        discrepancies.push(`Payment status mismatch: stored=${enrollmentFee.paymentStatus}, expected=${expectedCalculation.paymentStatus}`);
        recommendations.push('Update payment status based on current transactions');
      }

      return {
        isValid: discrepancies.length === 0,
        discrepancies,
        recommendations
      };
    } catch (error) {
      return {
        isValid: false,
        discrepancies: [`Validation error: ${(error as Error).message}`],
        recommendations: ['Check system logs and retry validation']
      };
    }
  }
}