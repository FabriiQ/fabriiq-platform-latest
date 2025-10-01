/**
 * Standardized Fee Calculation Engine
 * 
 * This service provides a single, consistent calculation engine for all fee-related
 * calculations across the system, eliminating inconsistencies and ensuring accuracy.
 */

import { PrismaClient, PaymentStatusType, LateFeeStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export interface FeeCalculationInput {
  enrollmentFeeId: string;
  feeStructure: {
    id: string;
    feeComponents: any[];
    baseAmount?: number;
  };
  discounts: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
  additionalCharges: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
  arrears: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
  lateFeeApplications: Array<{
    id: string;
    appliedAmount: number;
    waivedAmount: number;
    status: string;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    status: string;
  }>;
  dueDate?: Date;
}

export interface StandardizedFeeCalculation {
  enrollmentFeeId: string;
  baseAmount: number;
  totalDiscounts: number;
  discountedAmount: number;
  totalAdditionalCharges: number;
  totalArrears: number;
  finalAmount: number;
  totalLateFees: number;
  totalWaivedLateFees: number;
  netLateFees: number;
  totalAmountDue: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: PaymentStatusType;
  calculationBreakdown: {
    feeComponents: Array<{ name: string; amount: number }>;
    discounts: Array<{ id: string; amount: number }>;
    charges: Array<{ id: string; amount: number }>;
    arrears: Array<{ id: string; amount: number }>;
    lateFees: Array<{ id: string; applied: number; waived: number; net: number }>;
    transactions: Array<{ id: string; amount: number }>;
  };
  calculatedAt: Date;
  calculationVersion: string;
}

export class StandardizedFeeCalculationService {
  private prisma: PrismaClient;
  private readonly CALCULATION_VERSION = '2.0.0';

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Calculate comprehensive fee breakdown using standardized logic
   */
  async calculateFee(input: FeeCalculationInput): Promise<StandardizedFeeCalculation> {
    try {
      // Step 1: Calculate base amount from fee structure
      const baseAmount = this.calculateBaseAmount(input.feeStructure);

      // Step 2: Calculate total discounts (only active ones)
      const activeDiscounts = input.discounts.filter(d => d.status === 'ACTIVE');
      const totalDiscounts = activeDiscounts.reduce((sum, discount) => sum + discount.amount, 0);

      // Step 3: Calculate discounted amount (cannot be negative)
      const discountedAmount = Math.max(0, baseAmount - totalDiscounts);

      // Step 4: Calculate additional charges (only active ones)
      const activeCharges = input.additionalCharges.filter(c => c.status === 'ACTIVE');
      const totalAdditionalCharges = activeCharges.reduce((sum, charge) => sum + charge.amount, 0);

      // Step 5: Calculate arrears (only active ones)
      const activeArrears = input.arrears.filter(a => a.status === 'ACTIVE');
      const totalArrears = activeArrears.reduce((sum, arrear) => sum + arrear.amount, 0);

      // Step 6: Calculate final amount (before late fees)
      const finalAmount = discountedAmount + totalAdditionalCharges + totalArrears;

      // Step 7: Calculate late fees (only applied/paid ones)
      const applicableLateFees = input.lateFeeApplications.filter(
        lf => lf.status === LateFeeStatus.APPLIED || lf.status === LateFeeStatus.PAID
      );
      const totalLateFees = applicableLateFees.reduce((sum, lf) => sum + lf.appliedAmount, 0);
      const totalWaivedLateFees = applicableLateFees.reduce((sum, lf) => sum + lf.waivedAmount, 0);
      const netLateFees = totalLateFees - totalWaivedLateFees;

      // Step 8: Calculate total amount due
      const totalAmountDue = finalAmount + netLateFees;

      // Step 9: Calculate total paid (only active transactions)
      const activeTransactions = input.transactions.filter(t => t.status === 'ACTIVE');
      const totalPaid = activeTransactions.reduce((sum, txn) => sum + txn.amount, 0);

      // Step 10: Calculate remaining balance
      const remainingBalance = Math.max(0, totalAmountDue - totalPaid);

      // Step 11: Determine payment status
      const paymentStatus = this.determinePaymentStatus(
        totalPaid, 
        totalAmountDue, 
        input.dueDate
      );

      // Step 12: Create detailed breakdown
      const calculationBreakdown = {
        feeComponents: this.extractFeeComponents(input.feeStructure),
        discounts: activeDiscounts.map(d => ({ id: d.id, amount: d.amount })),
        charges: activeCharges.map(c => ({ id: c.id, amount: c.amount })),
        arrears: activeArrears.map(a => ({ id: a.id, amount: a.amount })),
        lateFees: applicableLateFees.map(lf => ({
          id: lf.id,
          applied: lf.appliedAmount,
          waived: lf.waivedAmount,
          net: lf.appliedAmount - lf.waivedAmount
        })),
        transactions: activeTransactions.map(t => ({ id: t.id, amount: t.amount }))
      };

      return {
        enrollmentFeeId: input.enrollmentFeeId,
        baseAmount,
        totalDiscounts,
        discountedAmount,
        totalAdditionalCharges,
        totalArrears,
        finalAmount,
        totalLateFees,
        totalWaivedLateFees,
        netLateFees,
        totalAmountDue,
        totalPaid,
        remainingBalance,
        paymentStatus,
        calculationBreakdown,
        calculatedAt: new Date(),
        calculationVersion: this.CALCULATION_VERSION
      };

    } catch (error) {
      console.error('Standardized fee calculation failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate fee using standardized engine',
        cause: error
      });
    }
  }

  /**
   * Calculate fee for enrollment fee ID (fetches data automatically)
   */
  async calculateFeeById(enrollmentFeeId: string): Promise<StandardizedFeeCalculation> {
    try {
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          feeStructure: true,
          discounts: true,
          additionalCharges: true,
          arrears: true,
          lateFeeApplications: true,
          transactions: true
        }
      });

      if (!enrollmentFee) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment fee not found'
        });
      }

      const input: FeeCalculationInput = {
        enrollmentFeeId,
        feeStructure: {
          id: enrollmentFee.feeStructure.id,
          feeComponents: enrollmentFee.feeStructure.feeComponents as any[],
          baseAmount: (enrollmentFee.feeStructure as any).baseAmount
        },
        discounts: enrollmentFee.discounts,
        additionalCharges: enrollmentFee.additionalCharges,
        arrears: enrollmentFee.arrears,
        lateFeeApplications: enrollmentFee.lateFeeApplications,
        transactions: enrollmentFee.transactions,
        dueDate: enrollmentFee.dueDate || undefined
      };

      return this.calculateFee(input);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error('Error calculating fee by ID:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate fee',
        cause: error
      });
    }
  }

  /**
   * Bulk calculate fees for multiple enrollment fee IDs
   */
  async bulkCalculateFees(enrollmentFeeIds: string[]): Promise<{
    successful: number;
    failed: number;
    calculations: StandardizedFeeCalculation[];
    errors: string[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      calculations: [] as StandardizedFeeCalculation[],
      errors: [] as string[]
    };

    for (const enrollmentFeeId of enrollmentFeeIds) {
      try {
        const calculation = await this.calculateFeeById(enrollmentFeeId);
        results.calculations.push(calculation);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${enrollmentFeeId}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Validate calculation against stored values
   */
  async validateCalculation(enrollmentFeeId: string): Promise<{
    isValid: boolean;
    discrepancies: Array<{
      field: string;
      stored: number;
      calculated: number;
      difference: number;
    }>;
    recommendation: string;
  }> {
    try {
      const storedFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId }
      });

      if (!storedFee) {
        return {
          isValid: false,
          discrepancies: [],
          recommendation: 'Enrollment fee not found'
        };
      }

      const calculation = await this.calculateFeeById(enrollmentFeeId);
      const discrepancies: Array<{
        field: string;
        stored: number;
        calculated: number;
        difference: number;
      }> = [];

      // Check base amount
      if (Math.abs(storedFee.baseAmount - calculation.baseAmount) > 0.01) {
        discrepancies.push({
          field: 'baseAmount',
          stored: storedFee.baseAmount,
          calculated: calculation.baseAmount,
          difference: calculation.baseAmount - storedFee.baseAmount
        });
      }

      // Check discounted amount
      if (Math.abs(storedFee.discountedAmount - calculation.discountedAmount) > 0.01) {
        discrepancies.push({
          field: 'discountedAmount',
          stored: storedFee.discountedAmount,
          calculated: calculation.discountedAmount,
          difference: calculation.discountedAmount - storedFee.discountedAmount
        });
      }

      // Check final amount
      if (Math.abs(storedFee.finalAmount - calculation.finalAmount) > 0.01) {
        discrepancies.push({
          field: 'finalAmount',
          stored: storedFee.finalAmount,
          calculated: calculation.finalAmount,
          difference: calculation.finalAmount - storedFee.finalAmount
        });
      }

      // Check computed late fee (use type assertion for new field)
      const storedLateFee = (storedFee as any).computedLateFee || 0;
      if (Math.abs(storedLateFee - calculation.netLateFees) > 0.01) {
        discrepancies.push({
          field: 'computedLateFee',
          stored: storedLateFee,
          calculated: calculation.netLateFees,
          difference: calculation.netLateFees - storedLateFee
        });
      }

      // Check payment status
      if (storedFee.paymentStatus !== calculation.paymentStatus) {
        discrepancies.push({
          field: 'paymentStatus',
          stored: 0, // Status comparison
          calculated: 1,
          difference: 1
        });
      }

      const isValid = discrepancies.length === 0;
      const recommendation = isValid 
        ? 'All calculations are accurate'
        : 'Recalculate and update stored values to fix discrepancies';

      return {
        isValid,
        discrepancies,
        recommendation
      };
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        isValid: false,
        discrepancies: [],
        recommendation: 'Validation failed due to error'
      };
    }
  }

  /**
   * Calculate base amount from fee structure
   */
  private calculateBaseAmount(feeStructure: { feeComponents: any[]; baseAmount?: number }): number {
    // First try to get from fee structure components
    if (feeStructure.feeComponents && Array.isArray(feeStructure.feeComponents)) {
      return feeStructure.feeComponents.reduce((sum, component) => {
        return sum + (component.amount || 0);
      }, 0);
    }

    // If no components, return 0 (will be calculated from other sources)
    return 0;
  }

  /**
   * Extract fee components for breakdown
   */
  private extractFeeComponents(feeStructure: { feeComponents: any[] }): Array<{ name: string; amount: number }> {
    if (!feeStructure.feeComponents || !Array.isArray(feeStructure.feeComponents)) {
      return [];
    }

    return feeStructure.feeComponents.map(component => ({
      name: component.name || component.type || 'Unknown Component',
      amount: component.amount || 0
    }));
  }

  /**
   * Determine payment status based on amounts and due date
   */
  private determinePaymentStatus(
    totalPaid: number, 
    totalAmountDue: number, 
    dueDate?: Date
  ): PaymentStatusType {
    if (totalPaid >= totalAmountDue) {
      return 'PAID';
    } else if (totalPaid > 0) {
      return 'PARTIAL';
    } else if (dueDate && dueDate < new Date()) {
      return 'OVERDUE';
    } else {
      return 'PENDING';
    }
  }
}
