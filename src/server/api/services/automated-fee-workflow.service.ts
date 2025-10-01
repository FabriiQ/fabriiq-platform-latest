/**
 * Automated Fee Workflow Service
 * 
 * This service implements missing automated workflows for:
 * - Overdue fee notifications
 * - Late fee applications
 * - Payment reminders
 * - Status synchronization
 */

import { PrismaClient, PaymentStatusType, LateFeeStatus } from '@prisma/client';
import { TRPCError } from '@trpc/server';
// import { EnhancedFeeIntegrationService } from './enhanced-fee-integration.service';
import { LateFeeService } from './late-fee.service';

export interface AutomatedWorkflowConfig {
  prisma: PrismaClient;
  enableNotifications?: boolean;
  enableLateFeeApplication?: boolean;
  enableStatusSync?: boolean;
  notificationSettings?: {
    overdueReminderDays: number[];
    escalationDays: number;
    maxReminders: number;
  };
}

export interface WorkflowExecutionResult {
  totalProcessed: number;
  notificationsSent: number;
  lateFeesApplied: number;
  statusesUpdated: number;
  errors: string[];
  executionTime: number;
}

export interface OverdueFeeRecord {
  enrollmentFeeId: string;
  studentName: string;
  studentEmail: string;
  daysOverdue: number;
  outstandingAmount: number;
  dueDate: Date;
  lastNotificationSent?: Date;
  reminderCount: number;
}

export class AutomatedFeeWorkflowService {
  private prisma: PrismaClient;
  // private feeIntegrationService: EnhancedFeeIntegrationService;
  private lateFeeService: LateFeeService;
  private config: AutomatedWorkflowConfig;

  constructor(config: AutomatedWorkflowConfig) {
    this.prisma = config.prisma;
    this.config = config;

    // TODO: Re-enable after fixing import paths
    // this.feeIntegrationService = new EnhancedFeeIntegrationService({
    //   prisma: this.prisma,
    //   enableAutomaticSync: true,
    //   enableAuditTrail: true
    // });

    this.lateFeeService = new LateFeeService(this.prisma);
  }

  /**
   * Execute complete automated workflow for fee management
   */
  async executeAutomatedWorkflow(options?: {
    campusId?: string;
    dryRun?: boolean;
    asOfDate?: Date;
  }): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const result: WorkflowExecutionResult = {
      totalProcessed: 0,
      notificationsSent: 0,
      lateFeesApplied: 0,
      statusesUpdated: 0,
      errors: [],
      executionTime: 0
    };

    try {
      console.log('Starting automated fee workflow execution...');

      // Step 1: Identify overdue fees
      const overdueFees = await this.identifyOverdueFees({
        campusId: options?.campusId,
        asOfDate: options?.asOfDate || new Date()
      });

      result.totalProcessed = overdueFees.length;
      console.log(`Found ${overdueFees.length} overdue fees to process`);

      // Step 2: Process notifications
      if (this.config.enableNotifications) {
        const notificationResults = await this.processOverdueNotifications(overdueFees, options?.dryRun);
        result.notificationsSent = notificationResults.sent;
        result.errors.push(...notificationResults.errors);
      }

      // Step 3: Apply late fees
      if (this.config.enableLateFeeApplication) {
        const lateFeeResults = await this.processLateFeeApplications(overdueFees, options?.dryRun);
        result.lateFeesApplied = lateFeeResults.applied;
        result.errors.push(...lateFeeResults.errors);
      }

      // Step 4: Synchronize payment statuses
      if (this.config.enableStatusSync) {
        const syncResults = await this.synchronizePaymentStatuses(overdueFees, options?.dryRun);
        result.statusesUpdated = syncResults.updated;
        result.errors.push(...syncResults.errors);
      }

      result.executionTime = Date.now() - startTime;
      console.log(`Automated workflow completed in ${result.executionTime}ms`);

      return result;
    } catch (error) {
      result.errors.push(`Workflow execution failed: ${(error as Error).message}`);
      result.executionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Identify overdue fees that need processing
   */
  private async identifyOverdueFees(options: {
    campusId?: string;
    asOfDate: Date;
  }): Promise<OverdueFeeRecord[]> {
    try {
      // Get overdue fees using Prisma query (simplified for now)
      const overdueFees = await this.prisma.enrollmentFee.findMany({
        where: {
          paymentStatus: { in: ['OVERDUE', 'PARTIAL'] },
          dueDate: { lt: options.asOfDate },
          ...(options.campusId && {
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
          enrollment: {
            include: {
              student: {
                include: {
                  user: { select: { name: true, email: true } }
                }
              }
            }
          },
          transactions: { where: { status: 'ACTIVE' } }
        },
        take: 100 // Limit for safety
      });

      // Transform to OverdueFeeRecord format
      const transformedFees: OverdueFeeRecord[] = overdueFees.map(fee => {
        const totalPaid = fee.transactions.reduce((sum, txn) => sum + txn.amount, 0);
        const outstandingAmount = fee.finalAmount - totalPaid;
        const daysOverdue = fee.dueDate
          ? Math.floor((options.asOfDate.getTime() - fee.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          enrollmentFeeId: fee.id,
          studentName: fee.enrollment.student.user.name || 'Unknown',
          studentEmail: fee.enrollment.student.user.email || '',
          daysOverdue,
          outstandingAmount,
          dueDate: fee.dueDate || new Date(),
          lastNotificationSent: (fee as any).lastNotificationSent || undefined,
          reminderCount: (fee as any).reminderCount || 0
        };
      });

      return transformedFees;
    } catch (error) {
      console.error('Error identifying overdue fees:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to identify overdue fees',
        cause: error
      });
    }
  }

  /**
   * Process overdue notifications
   */
  private async processOverdueNotifications(
    overdueFees: OverdueFeeRecord[],
    dryRun?: boolean
  ): Promise<{ sent: number; errors: string[] }> {
    const result = { sent: 0, errors: [] as string[] };
    const reminderDays = this.config.notificationSettings?.overdueReminderDays || [1, 7, 14, 30];
    const maxReminders = this.config.notificationSettings?.maxReminders || 5;

    for (const fee of overdueFees) {
      try {
        // Check if notification should be sent
        const shouldSendNotification = this.shouldSendNotification(fee, reminderDays, maxReminders);
        
        if (!shouldSendNotification) {
          continue;
        }

        if (!dryRun) {
          // Send notification
          await this.sendOverdueNotification(fee);
          
          // Update reminder count and last notification date
          await this.prisma.enrollmentFee.update({
            where: { id: fee.enrollmentFeeId },
            data: {
              lastNotificationSent: new Date(),
              reminderCount: { increment: 1 }
            } as any
          });
        }

        result.sent++;
      } catch (error) {
        result.errors.push(`Notification failed for ${fee.enrollmentFeeId}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Process late fee applications
   */
  private async processLateFeeApplications(
    overdueFees: OverdueFeeRecord[],
    dryRun?: boolean
  ): Promise<{ applied: number; errors: string[] }> {
    const result = { applied: 0, errors: [] as string[] };

    for (const fee of overdueFees) {
      try {
        // Check if late fee should be applied
        const shouldApplyLateFee = await this.shouldApplyLateFee(fee);
        
        if (!shouldApplyLateFee.apply) {
          continue;
        }

        if (!dryRun) {
          // Calculate and apply late fee
          const lateFeeCalculation = await this.lateFeeService.calculateLateFee(
            fee.enrollmentFeeId,
            shouldApplyLateFee.policyId!,
            new Date()
          );

          if (lateFeeCalculation.amount > 0) {
            await this.lateFeeService.applyLateFee({
              enrollmentFeeId: fee.enrollmentFeeId,
              policyId: shouldApplyLateFee.policyId!,
              daysOverdue: fee.daysOverdue,
              calculatedAmount: lateFeeCalculation.amount,
              appliedAmount: lateFeeCalculation.amount,
              compoundingPeriods: lateFeeCalculation.compoundingPeriods,
              dueDate: fee.dueDate,
              calculationDate: new Date(),
              reason: 'Automated late fee application',
              createdById: 'system'
            });
          }
        }

        result.applied++;
      } catch (error) {
        result.errors.push(`Late fee application failed for ${fee.enrollmentFeeId}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Synchronize payment statuses
   */
  private async synchronizePaymentStatuses(
    overdueFees: OverdueFeeRecord[],
    dryRun?: boolean
  ): Promise<{ updated: number; errors: string[] }> {
    const result = { updated: 0, errors: [] as string[] };

    for (const fee of overdueFees) {
      try {
        if (!dryRun) {
          // Use the database function to sync payment statuses
          await this.prisma.$executeRaw`SELECT sync_payment_statuses(${fee.enrollmentFeeId}::TEXT)`;
        }
        result.updated++;
      } catch (error) {
        result.errors.push(`Status sync failed for ${fee.enrollmentFeeId}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Check if notification should be sent
   */
  private shouldSendNotification(
    fee: OverdueFeeRecord,
    reminderDays: number[],
    maxReminders: number
  ): boolean {
    // Don't send if already reached max reminders
    if (fee.reminderCount >= maxReminders) {
      return false;
    }

    // Check if enough time has passed since last notification
    if (fee.lastNotificationSent) {
      const daysSinceLastNotification = Math.floor(
        (Date.now() - fee.lastNotificationSent.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Find the appropriate reminder interval
      const nextReminderDay = reminderDays.find(day => day > daysSinceLastNotification);
      return nextReminderDay !== undefined && fee.daysOverdue >= nextReminderDay;
    }

    // First notification - send if overdue matches any reminder day
    return reminderDays.includes(fee.daysOverdue);
  }

  /**
   * Check if late fee should be applied
   */
  private async shouldApplyLateFee(fee: OverdueFeeRecord): Promise<{
    apply: boolean;
    policyId?: string;
    reason?: string;
  }> {
    try {
      // Check if late fee already applied for this fee
      const existingLateFee = await this.prisma.lateFeeApplication.findFirst({
        where: {
          enrollmentFeeId: fee.enrollmentFeeId,
          status: { in: [LateFeeStatus.APPLIED, LateFeeStatus.PAID] }
        }
      });

      if (existingLateFee) {
        return { apply: false, reason: 'Late fee already applied' };
      }

      // Find applicable late fee policy
      const applicablePolicy = await this.prisma.lateFeePolicy.findFirst({
        where: {
          isActive: true,
          applyAfterDays: { lte: fee.daysOverdue },
          gracePeriodDays: { lt: fee.daysOverdue }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!applicablePolicy) {
        return { apply: false, reason: 'No applicable late fee policy found' };
      }

      return { apply: true, policyId: applicablePolicy.id };
    } catch (error) {
      console.error('Error checking late fee applicability:', error);
      return { apply: false, reason: 'Error checking late fee policy' };
    }
  }

  /**
   * Send overdue notification
   */
  private async sendOverdueNotification(fee: OverdueFeeRecord): Promise<void> {
    const subject = `Payment Overdue - ${fee.daysOverdue} days`;
    const message = `Dear ${fee.studentName},\n\nYour payment of $${fee.outstandingAmount.toFixed(2)} is ${fee.daysOverdue} days overdue. Please make payment as soon as possible to avoid additional late fees.\n\nDue Date: ${fee.dueDate.toLocaleDateString()}\nAmount Due: $${fee.outstandingAmount.toFixed(2)}\n\nThank you.`;

    // Create notification record (using raw SQL since table name doesn't match Prisma model)
    await this.prisma.$executeRaw`
      INSERT INTO fee_notifications (
        id, "enrollmentFeeId", "notificationType", "recipientEmail",
        "recipientName", subject, message, status, metadata
      ) VALUES (
        ${`notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`},
        ${fee.enrollmentFeeId},
        'OVERDUE',
        ${fee.studentEmail},
        ${fee.studentName},
        ${subject},
        ${message},
        'SENT',
        ${JSON.stringify({
          daysOverdue: fee.daysOverdue,
          outstandingAmount: fee.outstandingAmount,
          reminderCount: fee.reminderCount + 1
        })}::jsonb
      )
    `;

    // TODO: Integrate with actual email service
    console.log(`Overdue notification sent to ${fee.studentEmail} for ${fee.enrollmentFeeId}`);
  }
}
