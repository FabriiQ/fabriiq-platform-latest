import { prisma } from "@/server/db";
import { CronService } from "@/server/api/services/cron.service";

/**
 * Fee Management Automation Startup Service
 * Initializes all automated fee management processes
 */
export class FeeAutomationStartup {
  private static instance: FeeAutomationStartup;
  private cronService: CronService;
  private isInitialized = false;

  private constructor() {
    this.cronService = new CronService(prisma);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FeeAutomationStartup {
    if (!FeeAutomationStartup.instance) {
      FeeAutomationStartup.instance = new FeeAutomationStartup();
    }
    return FeeAutomationStartup.instance;
  }

  /**
   * Initialize fee automation systems
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Fee automation already initialized');
      return;
    }

    try {
      console.log('Initializing fee management automation...');

      // Initialize cron jobs
      this.cronService.initializeCronJobs();

      // Verify database connectivity
      await this.verifyDatabaseConnection();

      // Check for any pending late fee applications
      await this.checkPendingLateFees();

      this.isInitialized = true;
      console.log('Fee management automation initialized successfully');

    } catch (error) {
      console.error('Failed to initialize fee automation:', error);
      throw error;
    }
  }

  /**
   * Shutdown fee automation systems
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down fee automation...');
      
      // Clear all scheduled jobs
      this.cronService.clearAllJobs();
      
      this.isInitialized = false;
      console.log('Fee automation shutdown complete');
      
    } catch (error) {
      console.error('Error during fee automation shutdown:', error);
    }
  }

  /**
   * Verify database connection
   */
  private async verifyDatabaseConnection(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection verified');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error('Database connection required for fee automation');
    }
  }

  /**
   * Check for any pending late fee applications
   */
  private async checkPendingLateFees(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueFees = await prisma.enrollmentFee.count({
        where: {
          dueDate: { lt: today },
          paymentStatus: { in: ['PENDING', 'PARTIAL'] }
        }
      });

      if (overdueFees > 0) {
        console.log(`Found ${overdueFees} overdue fees that may need late fee processing`);
      } else {
        console.log('No overdue fees found');
      }

    } catch (error) {
      console.error('Error checking pending late fees:', error);
    }
  }

  /**
   * Get automation status
   */
  getStatus(): {
    initialized: boolean;
    jobStatus: { activeJobs: number; jobNames: string[] };
  } {
    return {
      initialized: this.isInitialized,
      jobStatus: this.cronService.getJobStatus()
    };
  }

  /**
   * Manually trigger late fee processing (for testing/admin use)
   */
  async triggerLateFeeProcessing(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Fee automation not initialized');
    }

    console.log('Manually triggering late fee processing...');
    await this.cronService.processOverdueFees();
  }

  /**
   * Manually trigger due date reminders (for testing/admin use)
   */
  async triggerDueDateReminders(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Fee automation not initialized');
    }

    console.log('Manually triggering due date reminders...');
    await this.cronService.processDueDateReminders();
  }
}

// Export singleton instance
export const feeAutomationStartup = FeeAutomationStartup.getInstance();

// Auto-initialize when module is loaded (in production)
if (process.env.NODE_ENV === 'production') {
  feeAutomationStartup.initialize().catch(error => {
    console.error('Failed to auto-initialize fee automation:', error);
  });
}
