import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Enhanced Due Date Management Service
 * Handles automated due date setting, reminders, and overdue tracking
 */
export class DueDateManagementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Set due dates for enrollment fees based on academic calendar and policies
   */
  async setAutomatedDueDates(input: {
    enrollmentFeeIds?: string[];
    campusId?: string;
    programId?: string;
    academicCycleId?: string;
    dueDatePolicy?: {
      daysFromEnrollment?: number;
      daysFromTermStart?: number;
      specificDate?: Date;
    };
  }) {
    const { enrollmentFeeIds, dueDatePolicy } = input;

    // Simple approach: if specific fee IDs provided, use them; otherwise get all pending fees
    let whereClause: any = {};
    if (enrollmentFeeIds) {
      whereClause.id = { in: enrollmentFeeIds };
    } else {
      whereClause.paymentStatus = { in: ['PENDING', 'PARTIAL'] };
    }

    // Get enrollment fees to update (simplified query)
    const enrollmentFees = await this.prisma.enrollmentFee.findMany({
      where: whereClause,
      select: {
        id: true,
        dueDate: true,
        createdAt: true,
        enrollmentId: true
      }
    });

    const results: Array<{
      enrollmentFeeId: string;
      previousDueDate?: Date | null;
      newDueDate?: Date;
      error?: string;
      success: boolean;
    }> = [];

    for (const fee of enrollmentFees) {
      try {
        let calculatedDueDate: Date;

        if (dueDatePolicy?.specificDate) {
          calculatedDueDate = dueDatePolicy.specificDate;
        } else if (dueDatePolicy?.daysFromEnrollment) {
          calculatedDueDate = new Date(fee.createdAt);
          calculatedDueDate.setDate(calculatedDueDate.getDate() + dueDatePolicy.daysFromEnrollment);
        } else {
          // Default: 30 days from fee creation
          calculatedDueDate = new Date(fee.createdAt);
          calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);
        }

        // Update the enrollment fee
        await this.prisma.enrollmentFee.update({
          where: { id: fee.id },
          data: { dueDate: calculatedDueDate }
        });

        results.push({
          enrollmentFeeId: fee.id,
          previousDueDate: fee.dueDate,
          newDueDate: calculatedDueDate,
          success: true
        });

      } catch (error) {
        results.push({
          enrollmentFeeId: fee.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    return {
      totalProcessed: enrollmentFees.length,
      successfulUpdates: results.filter(r => r.success).length,
      results
    };
  }

  /**
   * Get overdue fees with escalation levels (simplified)
   */
  async getOverdueFees(input: {
    campusId?: string;
    programId?: string;
    gracePeriodDays?: number;
    includeEscalationLevels?: boolean;
  } = {}) {
    const { gracePeriodDays = 0, includeEscalationLevels = true } = input;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const gracePeriodDate = new Date(today);
    gracePeriodDate.setDate(gracePeriodDate.getDate() - gracePeriodDays);

    // Simplified query
    const overdueFees = await this.prisma.enrollmentFee.findMany({
      where: {
        dueDate: { lt: gracePeriodDate },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] }
      },
      select: {
        id: true,
        dueDate: true,
        finalAmount: true,
        paymentStatus: true,
        enrollmentId: true,
        feeStructureId: true
      },
      orderBy: { dueDate: 'asc' }
    });

    const processedFees = overdueFees.map(fee => {
      const daysOverdue = fee.dueDate ? Math.floor((today.getTime() - fee.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      let escalationLevel = 'NONE';
      if (includeEscalationLevels) {
        if (daysOverdue >= 90) escalationLevel = 'CRITICAL';
        else if (daysOverdue >= 60) escalationLevel = 'HIGH';
        else if (daysOverdue >= 30) escalationLevel = 'MEDIUM';
        else if (daysOverdue >= 7) escalationLevel = 'LOW';
      }

      return {
        id: fee.id,
        dueDate: fee.dueDate,
        daysOverdue,
        finalAmount: fee.finalAmount,
        paymentStatus: fee.paymentStatus,
        escalationLevel,
        enrollmentId: fee.enrollmentId,
        feeStructureId: fee.feeStructureId
      };
    });

    // Group by escalation level
    const summary = {
      total: processedFees.length,
      totalOutstanding: processedFees.reduce((sum, fee) => sum + fee.finalAmount, 0),
      byEscalation: {
        CRITICAL: processedFees.filter(f => f.escalationLevel === 'CRITICAL').length,
        HIGH: processedFees.filter(f => f.escalationLevel === 'HIGH').length,
        MEDIUM: processedFees.filter(f => f.escalationLevel === 'MEDIUM').length,
        LOW: processedFees.filter(f => f.escalationLevel === 'LOW').length,
        NONE: processedFees.filter(f => f.escalationLevel === 'NONE').length
      }
    };

    return {
      summary,
      overdueFees: processedFees
    };
  }

  /**
   * Get upcoming due dates for reminder system (simplified)
   */
  async getUpcomingDueDates(input: {
    daysAhead?: number;
    campusId?: string;
    programId?: string;
    reminderTypes?: Array<'EMAIL' | 'SMS' | 'PUSH'>;
  } = {}) {
    const { daysAhead = 7 } = input;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingFees = await this.prisma.enrollmentFee.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: futureDate
        },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] }
      },
      select: {
        id: true,
        dueDate: true,
        finalAmount: true,
        paymentStatus: true,
        enrollmentId: true,
        feeStructureId: true
      },
      orderBy: { dueDate: 'asc' }
    });

    const processedFees = upcomingFees.map(fee => {
      const daysUntilDue = fee.dueDate ? Math.ceil((fee.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      let urgencyLevel = 'LOW';
      if (daysUntilDue <= 1) urgencyLevel = 'CRITICAL';
      else if (daysUntilDue <= 3) urgencyLevel = 'HIGH';
      else if (daysUntilDue <= 7) urgencyLevel = 'MEDIUM';

      return {
        id: fee.id,
        dueDate: fee.dueDate,
        daysUntilDue,
        finalAmount: fee.finalAmount,
        paymentStatus: fee.paymentStatus,
        urgencyLevel,
        enrollmentId: fee.enrollmentId,
        feeStructureId: fee.feeStructureId
      };
    });

    // Group by urgency level
    const summary = {
      total: processedFees.length,
      totalOutstanding: processedFees.reduce((sum, fee) => sum + fee.finalAmount, 0),
      byUrgency: {
        CRITICAL: processedFees.filter(f => f.urgencyLevel === 'CRITICAL').length,
        HIGH: processedFees.filter(f => f.urgencyLevel === 'HIGH').length,
        MEDIUM: processedFees.filter(f => f.urgencyLevel === 'MEDIUM').length,
        LOW: processedFees.filter(f => f.urgencyLevel === 'LOW').length
      }
    };

    return {
      summary,
      upcomingFees: processedFees
    };
  }

  /**
   * Update payment status based on transactions (simplified)
   */
  async updatePaymentStatuses(enrollmentFeeIds?: string[]) {
    let whereClause: any = {};
    if (enrollmentFeeIds) {
      whereClause.id = { in: enrollmentFeeIds };
    }

    // Get fees that need status updates
    const fees = await this.prisma.enrollmentFee.findMany({
      where: whereClause,
      select: {
        id: true,
        finalAmount: true,
        paymentStatus: true
      }
    });

    const updates: Array<{
      enrollmentFeeId: string;
      previousStatus: string;
      newStatus: string;
      finalAmount: number;
    }> = [];

    for (const fee of fees) {
      // Get total paid amount for this fee (using ACTIVE status for completed transactions)
      const totalPaidResult = await this.prisma.feeTransaction.aggregate({
        where: {
          enrollmentFeeId: fee.id,
          status: 'ACTIVE' // ACTIVE means the transaction is valid/completed
        },
        _sum: {
          amount: true
        }
      });

      const totalPaid = totalPaidResult._sum?.amount || 0;
      let newStatus: 'PENDING' | 'PARTIAL' | 'PAID';

      if (totalPaid >= fee.finalAmount) {
        newStatus = 'PAID';
      } else if (totalPaid > 0) {
        newStatus = 'PARTIAL';
      } else {
        newStatus = 'PENDING';
      }

      if (newStatus !== fee.paymentStatus) {
        await this.prisma.enrollmentFee.update({
          where: { id: fee.id },
          data: { paymentStatus: newStatus }
        });

        updates.push({
          enrollmentFeeId: fee.id,
          previousStatus: fee.paymentStatus,
          newStatus,
          finalAmount: fee.finalAmount
        });
      }
    }

    return {
      totalProcessed: fees.length,
      updatesApplied: updates.length,
      updates
    };
  }
}
