/**
 * Automated Late Fee Service
 * Background service for processing late fees automatically
 */

import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { ServiceBase } from "./service-base";
import { LateFeeService } from "./late-fee.service";

export interface AutomatedLateFeeJobConfig {
  institutionId?: string;
  campusId?: string;
  policyIds?: string[];
  dryRun?: boolean;
  notifyUsers?: boolean;
  batchSize?: number;
  maxRetries?: number;
}

export interface AutomatedLateFeeJobResult {
  jobId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  endTime?: Date;
  processed: number;
  applied: number;
  skipped: number;
  errors: number;
  totalAmount: number;
  details: Array<{
    enrollmentFeeId: string;
    studentName: string;
    action: 'APPLIED' | 'SKIPPED' | 'ERROR';
    amount?: number;
    reason?: string;
  }>;
  errorLog?: string[];
}

export class AutomatedLateFeeService extends ServiceBase {
  private lateFeeService: LateFeeService;
  private runningJobs = new Map<string, AutomatedLateFeeJobResult>();

  constructor(config: { prisma: PrismaClient }) {
    super(config);
    this.lateFeeService = new LateFeeService(config);
  }

  /**
   * Schedule automated late fee processing
   */
  async scheduleLateFeeProcessing(config: AutomatedLateFeeJobConfig): Promise<string> {
    const jobId = `late-fee-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const jobResult: AutomatedLateFeeJobResult = {
      jobId,
      status: 'RUNNING',
      startTime: new Date(),
      processed: 0,
      applied: 0,
      skipped: 0,
      errors: 0,
      totalAmount: 0,
      details: [],
      errorLog: [],
    };

    this.runningJobs.set(jobId, jobResult);

    // Process in background (in a real implementation, this would be a queue job)
    this.processLateFees(jobId, config).catch((error) => {
      console.error(`Late fee job ${jobId} failed:`, error);
      const job = this.runningJobs.get(jobId);
      if (job) {
        job.status = 'FAILED';
        job.endTime = new Date();
        job.errorLog?.push(error.message);
      }
    });

    return jobId;
  }

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<AutomatedLateFeeJobResult | null> {
    return this.runningJobs.get(jobId) || null;
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.runningJobs.get(jobId);
    if (job && job.status === 'RUNNING') {
      job.status = 'CANCELLED';
      job.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get all job statuses
   */
  async getAllJobStatuses(): Promise<AutomatedLateFeeJobResult[]> {
    return Array.from(this.runningJobs.values());
  }

  /**
   * Process late fees for overdue enrollment fees
   */
  private async processLateFees(jobId: string, config: AutomatedLateFeeJobConfig): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) return;

    try {
      const batchSize = config.batchSize || 100;
      const maxRetries = config.maxRetries || 3;
      let offset = 0;
      let hasMore = true;

      while (hasMore && job.status === 'RUNNING') {
        // Get overdue fees in batches
        const overdueFees = await this.lateFeeService.getOverdueFees({
          institutionId: config.institutionId,
          campusId: config.campusId,
          excludeProcessed: true,
        });

        if (overdueFees.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        const batchFees = overdueFees.slice(offset, offset + batchSize);
        
        for (const overdueInfo of batchFees) {
          if (job.status !== 'RUNNING') break;

          let retryCount = 0;
          let processed = false;

          while (retryCount < maxRetries && !processed) {
            try {
              await this.processIndividualLateFee(jobId, overdueInfo, config);
              processed = true;
            } catch (error) {
              retryCount++;
              job.errorLog?.push(
                `Retry ${retryCount}/${maxRetries} for enrollment ${overdueInfo.enrollmentFeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
              
              if (retryCount >= maxRetries) {
                job.errors++;
                job.details.push({
                  enrollmentFeeId: overdueInfo.enrollmentFeeId,
                  studentName: overdueInfo.studentName,
                  action: 'ERROR',
                  reason: `Failed after ${maxRetries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
              }
            }
          }

          job.processed++;
        }

        offset += batchSize;
        if (batchFees.length < batchSize) {
          hasMore = false;
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mark job as completed
      if (job.status === 'RUNNING') {
        job.status = 'COMPLETED';
        job.endTime = new Date();
      }

    } catch (error) {
      job.status = 'FAILED';
      job.endTime = new Date();
      job.errorLog?.push(`Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process late fee for a single enrollment fee
   */
  private async processIndividualLateFee(
    jobId: string,
    overdueInfo: any,
    config: AutomatedLateFeeJobConfig
  ): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) return;

    try {
      // Get applicable policies
      const policiesResult = await this.lateFeeService.getPolicies({
        institutionId: config.institutionId,
        campusId: config.campusId,
      });

      if (!policiesResult.success || !policiesResult.policies) {
        job.skipped++;
        job.details.push({
          enrollmentFeeId: overdueInfo.enrollmentFeeId,
          studentName: overdueInfo.studentName,
          action: 'SKIPPED',
          reason: 'No policies found',
        });
        return;
      }

      // Filter policies if specific policy IDs are provided
      let applicablePolicies = policiesResult.policies.filter(p => p.isActive && p.autoApply);
      if (config.policyIds && config.policyIds.length > 0) {
        applicablePolicies = applicablePolicies.filter(p => config.policyIds!.includes(p.id));
      }

      if (applicablePolicies.length === 0) {
        job.skipped++;
        job.details.push({
          enrollmentFeeId: overdueInfo.enrollmentFeeId,
          studentName: overdueInfo.studentName,
          action: 'SKIPPED',
          reason: 'No applicable policies found',
        });
        return;
      }

      // Find the best matching policy (you can implement more sophisticated logic here)
      const selectedPolicy = applicablePolicies[0];

      // Calculate late fee
      const calculation = await this.lateFeeService.calculateLateFee(
        overdueInfo.enrollmentFeeId,
        selectedPolicy.id
      );

      if (calculation.amount <= 0) {
        job.skipped++;
        job.details.push({
          enrollmentFeeId: overdueInfo.enrollmentFeeId,
          studentName: overdueInfo.studentName,
          action: 'SKIPPED',
          reason: 'No late fee amount calculated',
        });
        return;
      }

      // Apply late fee (if not dry run)
      if (!config.dryRun) {
        await this.lateFeeService.applyLateFee({
          enrollmentFeeId: overdueInfo.enrollmentFeeId,
          policyId: selectedPolicy.id,
          daysOverdue: overdueInfo.daysOverdue,
          calculatedAmount: calculation.amount,
          appliedAmount: calculation.amount,
          compoundingPeriods: calculation.compoundingPeriods,
          dueDate: overdueInfo.dueDate,
          calculationDate: new Date(),
          reason: 'Automated late fee application',
          createdById: 'system',
        });
      }

      job.applied++;
      job.totalAmount += calculation.amount;
      job.details.push({
        enrollmentFeeId: overdueInfo.enrollmentFeeId,
        studentName: overdueInfo.studentName,
        action: 'APPLIED',
        amount: calculation.amount,
      });

      // Send notification if configured
      if (config.notifyUsers && !config.dryRun) {
        await this.sendLateFeeNotification(overdueInfo, calculation.amount);
      }

    } catch (error) {
      throw error; // Re-throw to be handled by retry logic
    }
  }

  /**
   * Send late fee notification to student/parent
   */
  private async sendLateFeeNotification(overdueInfo: any, amount: number): Promise<void> {
    try {
      // Create notification record
      await this.prisma.notification.create({
        data: {
          title: 'Late Fee Applied',
          content: `A late fee of $${amount.toFixed(2)} has been applied to your account for overdue payment.`,
          type: 'LATE_FEE',
          priority: 'HIGH',
          userId: overdueInfo.studentId, // This would need to be included in overdueInfo
          metadata: {
            enrollmentFeeId: overdueInfo.enrollmentFeeId,
            amount,
            daysOverdue: overdueInfo.daysOverdue,
          },
        }
      });

      // TODO: Send email/SMS notification
      // This would integrate with your notification service

    } catch (error) {
      console.error('Failed to send late fee notification:', error);
      // Don't throw error here as notification failure shouldn't stop late fee processing
    }
  }

  /**
   * Generate late fee processing report
   */
  async generateProcessingReport(
    dateFrom: Date,
    dateTo: Date,
    filters?: {
      institutionId?: string;
      campusId?: string;
    }
  ) {
    try {
      // Get late fee applications in date range
      const applications = await this.lateFeeService.getLateFeeApplications({
        dateFrom,
        dateTo,
        ...filters,
      });

      if (!applications.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch late fee applications",
        });
      }

      // Calculate summary statistics
      const summary = {
        totalApplications: applications.applications.length,
        totalAmount: applications.applications.reduce((sum, app) => sum + app.appliedAmount, 0),
        averageAmount: applications.applications.length > 0 
          ? applications.applications.reduce((sum, app) => sum + app.appliedAmount, 0) / applications.applications.length 
          : 0,
        byStatus: applications.applications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPolicy: applications.applications.reduce((acc, app) => {
          const policyName = app.policy?.name || 'Unknown Policy';
          if (!acc[policyName]) {
            acc[policyName] = { count: 0, amount: 0 };
          }
          acc[policyName].count++;
          acc[policyName].amount += app.appliedAmount;
          return acc;
        }, {} as Record<string, { count: number; amount: number }>),
      };

      return {
        success: true,
        report: {
          period: { from: dateFrom, to: dateTo },
          summary,
          applications: applications.applications,
        }
      };

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate processing report",
        cause: error,
      });
    }
  }

  /**
   * Clean up completed jobs (remove old job data)
   */
  async cleanupCompletedJobs(olderThanHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [jobId, job] of this.runningJobs.entries()) {
      if (job.status !== 'RUNNING' && job.endTime && job.endTime < cutoffTime) {
        this.runningJobs.delete(jobId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}
