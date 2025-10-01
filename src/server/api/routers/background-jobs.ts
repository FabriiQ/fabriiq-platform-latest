/**
 * Background Jobs Router
 *
 * This router provides API endpoints for managing background jobs.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  getBackgroundJobSystem,
  getRewardJobManager,
  getSystemJobManager,
  initializeBackgroundJobs
} from "../../jobs";
import { updateClassPerformanceMetrics, updateClassPerformanceMetricsForClass } from "../jobs/update-class-performance";
import { JobStatus } from "../../jobs/background-job-system";
import { CronService } from "../services/cron.service";
import { feeAutomationStartup } from "../../startup/fee-automation-startup";

// Define allowed admin roles
const ADMIN_ROLES = [
  'SYSTEM_ADMIN',
  'CAMPUS_ADMIN',
] as const;

export const backgroundJobsRouter = createTRPCRouter({
  // Get all jobs
  getAllJobs: protectedProcedure
    .query(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

      // Get all jobs
      const jobs = Array.from(jobSystem.getAllJobs().entries()).map(([id, job]) => {
        const status = jobSystem.getJobStatus(id);
        return {
          id: job.id,
          name: job.name,
          description: job.description,
          frequency: job.frequency,
          priority: job.priority,
          enabled: job.enabled,
          isRunning: status.isRunning,
          lastRun: status.lastResult?.startTime,
          lastStatus: status.lastResult?.status,
          lastDuration: status.lastResult?.duration,
        };
      });

      return jobs;
    }),

  // Get job details
  getJobDetails: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

      // Get job details
      const status = jobSystem.getJobStatus(input.jobId);

      if (!status.job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Job with ID ${input.jobId} not found`,
        });
      }

      // Get job history
      const history = jobSystem.getJobHistory(input.jobId);

      return {
        job: {
          id: status.job.id,
          name: status.job.name,
          description: status.job.description,
          frequency: status.job.frequency,
          customInterval: status.job.customInterval,
          priority: status.job.priority,
          timeout: status.job.timeout,
          retryCount: status.job.retryCount,
          retryDelay: status.job.retryDelay,
          enabled: status.job.enabled,
        },
        status: {
          isRunning: status.isRunning,
          lastResult: status.lastResult,
        },
        history,
      };
    }),

  // Run a job
  runJob: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

      // Check if job exists
      const status = jobSystem.getJobStatus(input.jobId);

      if (!status.job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Job with ID ${input.jobId} not found`,
        });
      }

      // Check if job is already running
      if (status.isRunning) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Job ${input.jobId} is already running`,
        });
      }

      // Run the job
      const result = await jobSystem.executeJob(input.jobId);

      return result;
    }),

  // Enable/disable a job
  setJobEnabled: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

      // Check if job exists
      const status = jobSystem.getJobStatus(input.jobId);

      if (!status.job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Job with ID ${input.jobId} not found`,
        });
      }

      // Enable or disable the job
      let result: boolean;
      if (input.enabled) {
        result = jobSystem.enableJob(input.jobId);
      } else {
        result = jobSystem.disableJob(input.jobId);
      }

      return {
        success: result,
        jobId: input.jobId,
        enabled: input.enabled,
      };
    }),

  // Run all reward jobs
  runAllRewardJobs: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { rewardJobManager } = initializeBackgroundJobs(ctx.prisma);

      // Run all reward jobs
      const results = await rewardJobManager.runAllJobs();

      return results;
    }),

  // Run all system jobs
  runAllSystemJobs: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { systemJobManager } = initializeBackgroundJobs(ctx.prisma);

      // Run all system jobs
      const results = await systemJobManager.runAllJobs();

      return results;
    }),

  // Get running jobs
  getRunningJobs: protectedProcedure
    .query(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Initialize job system if not already initialized
      const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

      // Get running jobs
      const runningJobIds = jobSystem.getRunningJobs();

      // Get details for each running job
      const runningJobs = runningJobIds.map(jobId => {
        const status = jobSystem.getJobStatus(typeof jobId === 'string' ? jobId : jobId.id);
        return {
          id: typeof jobId === 'string' ? jobId : jobId.id,
          name: status.job?.name || (typeof jobId === 'string' ? jobId : jobId.name),
          startTime: status.lastResult?.startTime?.getTime(),
          duration: status.lastResult ?
            Date.now() - status.lastResult.startTime.getTime() :
            undefined,
        };
      });

      return runningJobs;
    }),

  // Run class performance update job
  updateClassPerformance: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // Run the job
        await updateClassPerformanceMetrics();

        return {
          success: true,
          message: "Class performance update job started successfully"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start class performance update job",
          cause: error
        });
      }
    }),

  // Update class performance for a specific class
  updateClassPerformanceForClass: protectedProcedure
    .input(z.object({
      classId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // Run the job
        await updateClassPerformanceMetricsForClass(input.classId);

        return {
          success: true,
          message: `Class performance update for class ${input.classId} started successfully`
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start class performance update for class ${input.classId}`,
          cause: error
        });
      }
    }),

  // Fee Automation Management
  getFeeAutomationStatus: protectedProcedure
    .query(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view fee automation status",
        });
      }

      try {
        return feeAutomationStartup.getStatus();
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get fee automation status",
          cause: error
        });
      }
    }),

  initializeFeeAutomation: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to initialize fee automation",
        });
      }

      try {
        await feeAutomationStartup.initialize();
        return {
          success: true,
          message: "Fee automation initialized successfully"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initialize fee automation",
          cause: error
        });
      }
    }),

  shutdownFeeAutomation: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to shutdown fee automation",
        });
      }

      try {
        await feeAutomationStartup.shutdown();
        return {
          success: true,
          message: "Fee automation shutdown successfully"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to shutdown fee automation",
          cause: error
        });
      }
    }),

  triggerLateFeeProcessing: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to trigger late fee processing",
        });
      }

      try {
        await feeAutomationStartup.triggerLateFeeProcessing();
        return {
          success: true,
          message: "Late fee processing triggered successfully"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger late fee processing",
          cause: error
        });
      }
    }),

  triggerDueDateReminders: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to trigger due date reminders",
        });
      }

      try {
        await feeAutomationStartup.triggerDueDateReminders();
        return {
          success: true,
          message: "Due date reminders triggered successfully"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger due date reminders",
          cause: error
        });
      }
    }),

  // Message Analysis Endpoints
  runMessageAnalysis: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        // Initialize job system if not already initialized
        const { jobSystem } = initializeBackgroundJobs(ctx.prisma);

        // Run the message analysis job
        const result = await jobSystem.executeJob('system-message-analysis');

        return {
          success: true,
          message: 'Message analysis completed successfully',
          result
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to run message analysis",
          cause: error
        });
      }
    }),

  getMessageAnalysisStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(7)
    }))
    .query(async ({ ctx, input }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        const [
          totalAnalyzed,
          riskBreakdown,
          moderationQueue,
          auditLogs
        ] = await Promise.all([
          // Total analyzed messages
          ctx.prisma.socialPost.count({
            where: {
              analyzedAt: { gte: startDate },
              messageType: { not: null }
            }
          }),

          // Risk level breakdown
          ctx.prisma.socialPost.groupBy({
            by: ['riskLevel'],
            where: {
              analyzedAt: { gte: startDate },
              messageType: { not: null }
            },
            _count: { id: true }
          }),

          // Moderation queue entries
          ctx.prisma.moderationQueue.count({
            where: {
              createdAt: { gte: startDate }
            }
          }),

          // Audit log entries
          ctx.prisma.messageAuditLog.count({
            where: {
              timestamp: { gte: startDate },
              action: 'ANALYZED'
            }
          })
        ]);

        // Process risk breakdown
        const riskStats = {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0
        };

        riskBreakdown.forEach(item => {
          if (item.riskLevel && item.riskLevel in riskStats) {
            riskStats[item.riskLevel as keyof typeof riskStats] = item._count.id;
          }
        });

        return {
          period: {
            days: input.days,
            startDate,
            endDate: new Date()
          },
          totalAnalyzed,
          riskBreakdown: riskStats,
          moderationQueueEntries: moderationQueue,
          auditLogEntries: auditLogs,
          averagePerDay: Math.round(totalAnalyzed / input.days)
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get message analysis statistics",
          cause: error
        });
      }
    }),

  getUnanalyzedMessageCount: protectedProcedure
    .query(async ({ ctx }) => {
      // Check permissions
      if (!ADMIN_ROLES.includes(ctx.session.user.userType as any)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const count = await ctx.prisma.socialPost.count({
          where: {
            analyzedAt: null,
            messageType: { not: null }
          }
        });

        return { count };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_SERVER",
          message: "Failed to get unanalyzed message count",
          cause: error
        });
      }
    }),
});
