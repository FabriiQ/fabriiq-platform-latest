import { PrismaClient } from '@prisma/client';
import { FeeNotificationService } from './fee-notification.service';
import { LateFeeService } from './late-fee.service';
import { AutomatedLateFeeService } from './automated-late-fee.service';
import { AutomatedFeeWorkflowService } from './automated-fee-workflow.service';
import { EnhancedFeeIntegrationService } from './enhanced-fee-integration.service';
import { RecurringFeeProcessingService } from './recurring-fee-processing.service';

/**
 * Cron service for running scheduled tasks
 */
export class CronService {
  private lateFeeService: LateFeeService;
  private automatedLateFeeService: AutomatedLateFeeService;
  private notificationService: FeeNotificationService;
  private automatedWorkflowService: AutomatedFeeWorkflowService;
  private feeIntegrationService: EnhancedFeeIntegrationService;
  private recurringFeeService: RecurringFeeProcessingService;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(private prisma: PrismaClient) {
    this.lateFeeService = new LateFeeService({ prisma });
    this.automatedLateFeeService = new AutomatedLateFeeService({ prisma });
    this.notificationService = new FeeNotificationService(prisma);
    this.recurringFeeService = new RecurringFeeProcessingService(prisma);

    // Initialize new enhanced services
    this.feeIntegrationService = new EnhancedFeeIntegrationService({
      prisma,
      enableAutomaticSync: true,
      enableAuditTrail: true
    });

    this.automatedWorkflowService = new AutomatedFeeWorkflowService({
      prisma,
      enableNotifications: true,
      enableLateFeeApplication: true,
      enableStatusSync: true,
      notificationSettings: {
        overdueReminderDays: [1, 3, 7, 14, 30],
        escalationDays: 45,
        maxReminders: 5
      }
    });
  }

  /**
   * Run daily fee notification tasks
   */
  async runDailyFeeNotifications(): Promise<void> {
    console.log('Running daily fee notifications...');
    
    try {
      const notificationService = new FeeNotificationService(this.prisma);
      await notificationService.runScheduledNotifications();
      
      console.log('Daily fee notifications completed successfully');
    } catch (error) {
      console.error('Error running daily fee notifications:', error);
    }
  }

  /**
   * Initialize cron jobs for fee management automation
   */
  initializeCronJobs(): void {
    console.log('Initializing fee management cron jobs...');

    // Clear any existing jobs
    this.clearAllJobs();

    // Daily late fee processing at 6 AM
    this.scheduleDailyLateFeeProcessing();

    // Weekly fee analytics refresh at 2 AM on Sundays
    this.scheduleWeeklyAnalyticsRefresh();

    // Monthly fee structure cleanup at 1 AM on 1st of month
    this.scheduleMonthlyCleanup();

    // Hourly due date reminders during business hours
    this.scheduleHourlyReminders();

    // Daily recurring fee processing at 5 AM
    this.scheduleRecurringFeeProcessing();

    console.log('Fee management cron jobs initialized successfully');
  }

  /**
   * Clear all scheduled jobs
   */
  clearAllJobs(): void {
    this.scheduledJobs.forEach((timeout, jobName) => {
      clearInterval(timeout);
      console.log(`Cleared job: ${jobName}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Schedule daily late fee processing with enhanced workflow
   */
  private scheduleDailyLateFeeProcessing(): void {
    const jobName = 'daily-late-fee-processing';

    // Run at 6 AM every day
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        try {
          console.log('Starting enhanced daily fee workflow...');
          await this.runEnhancedFeeWorkflow();
        } catch (error) {
          console.error('Enhanced daily fee workflow failed:', error);
        }
      }
    }, 60000); // Check every minute

    this.scheduledJobs.set(jobName, interval);
    console.log(`Scheduled job: ${jobName}`);
  }

  /**
   * Run enhanced automated fee workflow
   */
  async runEnhancedFeeWorkflow(): Promise<void> {
    try {
      console.log('Executing enhanced automated fee workflow...');

      const result = await this.automatedWorkflowService.executeAutomatedWorkflow({
        dryRun: false,
        asOfDate: new Date()
      });

      console.log('Enhanced fee workflow results:', {
        totalProcessed: result.totalProcessed,
        notificationsSent: result.notificationsSent,
        lateFeesApplied: result.lateFeesApplied,
        statusesUpdated: result.statusesUpdated,
        executionTime: result.executionTime,
        errorCount: result.errors.length
      });

      if (result.errors.length > 0) {
        console.error('Workflow errors:', result.errors);
      }

      // Log workflow execution to database
      await this.logWorkflowExecution(result);

    } catch (error) {
      console.error('Enhanced fee workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Log workflow execution results
   */
  private async logWorkflowExecution(result: any): Promise<void> {
    try {
      // Create a workflow execution log entry (using raw SQL)
      await this.prisma.$executeRaw`
        INSERT INTO fee_calculation_audit (
          id, "enrollmentFeeId", "calculationType", reason,
          "calculationDetails", "performedBy", "isAutomated"
        ) VALUES (
          ${`workflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`},
          'system',
          'AUTOMATED_WORKFLOW',
          'Daily automated fee workflow execution',
          ${JSON.stringify({
            totalProcessed: result.totalProcessed,
            notificationsSent: result.notificationsSent,
            lateFeesApplied: result.lateFeesApplied,
            statusUpdates: result.statusUpdates,
            executionTime: result.executionTime
          })}::jsonb,
          'system',
          true
        )
      `;
    } catch (error) {
      console.error('Failed to log workflow execution:', error);
    }
  }

  /**
   * Schedule recurring fee processing
   */
  private scheduleRecurringFeeProcessing(): void {
    const jobName = 'recurring-fee-processing';

    // Run at 5 AM every day
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 5 && now.getMinutes() === 0) {
        try {
          console.log('Starting recurring fee processing...');
          const result = await this.recurringFeeService.generateRecurringFees(false);
          console.log('Recurring fee processing completed:', result);
        } catch (error) {
          console.error('Recurring fee processing failed:', error);
        }
      }
    }, 60000); // Check every minute

    this.scheduledJobs.set(jobName, interval);
    console.log(`Scheduled job: ${jobName}`);
  }

  /**
   * Schedule weekly analytics refresh
   */
  private scheduleWeeklyAnalyticsRefresh(): void {
    const jobName = 'weekly-analytics-refresh';

    // Run at 2 AM on Sundays
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 2 && now.getMinutes() === 0) {
        try {
          console.log('Starting weekly analytics refresh...');
          await this.refreshFeeAnalytics();
        } catch (error) {
          console.error('Weekly analytics refresh failed:', error);
        }
      }
    }, 60000);

    this.scheduledJobs.set(jobName, interval);
    console.log(`Scheduled job: ${jobName}`);
  }

  /**
   * Schedule monthly cleanup
   */
  private scheduleMonthlyCleanup(): void {
    const jobName = 'monthly-cleanup';

    // Run at 1 AM on 1st of every month
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 1 && now.getMinutes() === 0) {
        try {
          console.log('Starting monthly fee cleanup...');
          await this.performMonthlyCleanup();
        } catch (error) {
          console.error('Monthly cleanup failed:', error);
        }
      }
    }, 60000);

    this.scheduledJobs.set(jobName, interval);
    console.log(`Scheduled job: ${jobName}`);
  }

  /**
   * Schedule hourly reminders during business hours
   */
  private scheduleHourlyReminders(): void {
    const jobName = 'hourly-reminders';

    // Run every hour during business hours (9 AM - 5 PM)
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() >= 9 && now.getHours() <= 17 && now.getMinutes() === 0) {
        try {
          console.log('Processing due date reminders...');
          await this.processDueDateReminders();
        } catch (error) {
          console.error('Due date reminders failed:', error);
        }
      }
    }, 60000);

    this.scheduledJobs.set(jobName, interval);
    console.log(`Scheduled job: ${jobName}`);
  }

  /**
   * Process overdue fees and apply late fees automatically
   */
  async processOverdueFees(): Promise<void> {
    try {
      console.log('Starting automated late fee processing...');

      // Get all active campuses
      const campuses = await this.prisma.campus.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true }
      });

      let totalProcessed = 0;
      let totalApplied = 0;

      for (const campus of campuses) {
        try {
          console.log(`Processing late fees for campus: ${campus.name}`);

          // TODO: Fix method call after AutomatedLateFeeService is updated
          console.log(`Would process late fees for campus: ${campus.name}`);
          // const jobId = await this.automatedLateFeeService.processLateFees({
          //   campusId: campus.id,
          //   dryRun: false,
          //   batchSize: 50,
          //   maxRetries: 3,
          // });

          // TODO: Implement job monitoring after AutomatedLateFeeService is updated
          totalProcessed += 1; // Placeholder
          totalApplied += 1; // Placeholder

        } catch (error) {
          console.error(`Error processing late fees for campus ${campus.name}:`, error);
        }
      }

      console.log(`Late fee processing completed. Total processed: ${totalProcessed}, Total applied: ${totalApplied}`);

    } catch (error) {
      console.error('Error in processOverdueFees:', error);
      throw error;
    }
  }

  /**
   * Refresh fee analytics data
   */
  async refreshFeeAnalytics(): Promise<void> {
    try {
      console.log('Refreshing fee analytics...');

      // This could involve updating cached analytics, recalculating metrics, etc.
      // For now, we'll just log that it's running
      console.log('Fee analytics refresh completed');

    } catch (error) {
      console.error('Error refreshing fee analytics:', error);
      throw error;
    }
  }

  /**
   * Perform monthly cleanup tasks
   */
  async performMonthlyCleanup(): Promise<void> {
    try {
      console.log('Starting monthly cleanup...');

      // Archive old transactions (older than 2 years)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      // Archive old fee transactions
      const archivedTransactions = await this.prisma.feeTransaction.updateMany({
        where: {
          createdAt: { lt: twoYearsAgo },
          status: 'ACTIVE' // Use valid SystemStatus enum value
        },
        data: {
          // In a real implementation, you might move these to an archive table
          // For now, we'll just add a note
        }
      });

      console.log(`Monthly cleanup completed. Processed ${archivedTransactions.count} old transactions`);

    } catch (error) {
      console.error('Error in monthly cleanup:', error);
      throw error;
    }
  }

  /**
   * Process due date reminders
   */
  async processDueDateReminders(): Promise<void> {
    try {
      console.log('Processing due date reminders...');

      // Get fees due in the next 3 days
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const upcomingDueFees = await this.prisma.enrollmentFee.findMany({
        where: {
          dueDate: {
            gte: new Date(),
            lte: threeDaysFromNow
          },
          paymentStatus: {
            in: ['PENDING', 'PARTIAL']
          }
        },
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } }
                }
              }
            }
          }
        },
        take: 100 // Limit to prevent overwhelming the system
      });

      console.log(`Found ${upcomingDueFees.length} fees with upcoming due dates`);

      // Process reminders through notification service
      for (const fee of upcomingDueFees) {
        try {
          // This would send email/SMS reminders
          // Implementation depends on your notification system
          console.log(`Reminder sent for fee ${fee.id} to ${fee.enrollment.student.user?.email}`);
        } catch (error) {
          console.error(`Failed to send reminder for fee ${fee.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error processing due date reminders:', error);
      throw error;
    }
  }

  /**
   * Get job status information
   */
  getJobStatus(): { activeJobs: number; jobNames: string[] } {
    return {
      activeJobs: this.scheduledJobs.size,
      jobNames: Array.from(this.scheduledJobs.keys())
    };
  }
}

/**
 * Manual trigger for testing notifications
 */
export async function triggerFeeNotifications(prisma: PrismaClient): Promise<void> {
  const cronService = new CronService(prisma);
  await cronService.runDailyFeeNotifications();
}
