/**
 * Enhanced Fee Management Router
 * 
 * This router exposes all the enhanced fee management functionality
 * including standardized calculations, automated workflows, and testing.
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { StandardizedFeeCalculationService } from "../services/standardized-fee-calculation.service";
import { EnhancedFeeIntegrationService } from "../services/enhanced-fee-integration.service";
import { PaymentStatusSyncService } from "../services/payment-status-sync.service";
import { AutomatedFeeWorkflowService } from "../services/automated-fee-workflow.service";
import { EnhancedTransactionManagementService } from "../services/enhanced-transaction-management.service";
import { FeeManagementTestingService } from "../services/fee-management-testing.service";

export const enhancedFeeManagementRouter = createTRPCRouter({
  // ============================================================================
  // STANDARDIZED FEE CALCULATIONS
  // ============================================================================

  calculateFee: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const calculationService = new StandardizedFeeCalculationService(ctx.prisma);
      return calculationService.calculateFeeById(input.enrollmentFeeId);
    }),

  bulkCalculateFees: protectedProcedure
    .input(z.object({ enrollmentFeeIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const calculationService = new StandardizedFeeCalculationService(ctx.prisma);
      return calculationService.bulkCalculateFees(input.enrollmentFeeIds);
    }),

  validateCalculation: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const calculationService = new StandardizedFeeCalculationService(ctx.prisma);
      return calculationService.validateCalculation(input.enrollmentFeeId);
    }),

  // ============================================================================
  // ENHANCED FEE INTEGRATION
  // ============================================================================

  recalculateAndSyncFee: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integrationService = new EnhancedFeeIntegrationService({
        prisma: ctx.prisma,
        enableAutomaticSync: true,
        enableAuditTrail: true
      });
      return integrationService.recalculateAndSyncFee(input.enrollmentFeeId, ctx.session.user.id);
    }),

  bulkRecalculateAndSyncFees: protectedProcedure
    .input(z.object({ enrollmentFeeIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const integrationService = new EnhancedFeeIntegrationService({
        prisma: ctx.prisma,
        enableAutomaticSync: true,
        enableAuditTrail: true
      });
      return integrationService.bulkRecalculateAndSyncFees(input.enrollmentFeeIds, ctx.session.user.id);
    }),

  getFeeCalculationSummary: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const integrationService = new EnhancedFeeIntegrationService({
        prisma: ctx.prisma,
        enableAutomaticSync: true,
        enableAuditTrail: true
      });
      return integrationService.getFeeCalculationSummary(input.enrollmentFeeId);
    }),

  validateFeeIntegrity: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const integrationService = new EnhancedFeeIntegrationService({
        prisma: ctx.prisma,
        enableAutomaticSync: true,
        enableAuditTrail: true
      });
      return integrationService.validateFeeCalculationIntegrity(input.enrollmentFeeId);
    }),

  // ============================================================================
  // PAYMENT STATUS SYNCHRONIZATION
  // ============================================================================

  syncPaymentStatus: protectedProcedure
    .input(z.object({ 
      enrollmentFeeId: z.string(),
      forceSync: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const statusSyncService = new PaymentStatusSyncService({
        prisma: ctx.prisma,
        enableOptimisticLocking: true,
        enableConflictResolution: true
      });
      return statusSyncService.syncPaymentStatus(input.enrollmentFeeId, { 
        forceSync: input.forceSync 
      });
    }),

  bulkSyncPaymentStatuses: protectedProcedure
    .input(z.object({ 
      enrollmentFeeIds: z.array(z.string()),
      batchSize: z.number().optional(),
      continueOnError: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const statusSyncService = new PaymentStatusSyncService({
        prisma: ctx.prisma,
        enableOptimisticLocking: true,
        enableConflictResolution: true
      });
      return statusSyncService.bulkSyncPaymentStatuses(input.enrollmentFeeIds, {
        batchSize: input.batchSize,
        continueOnError: input.continueOnError
      });
    }),

  identifyStatusInconsistencies: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      limit: z.number().optional(),
      autoFix: z.boolean().optional()
    }))
    .query(async ({ ctx, input }) => {
      const statusSyncService = new PaymentStatusSyncService({
        prisma: ctx.prisma,
        enableOptimisticLocking: true,
        enableConflictResolution: true
      });
      return statusSyncService.identifyAndFixInconsistencies(input);
    }),

  getSyncStatistics: protectedProcedure
    .input(z.object({ campusId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const statusSyncService = new PaymentStatusSyncService({
        prisma: ctx.prisma,
        enableOptimisticLocking: true,
        enableConflictResolution: true
      });
      return statusSyncService.getSyncStatistics(input.campusId);
    }),

  // ============================================================================
  // AUTOMATED WORKFLOWS
  // ============================================================================

  executeAutomatedWorkflow: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      dryRun: z.boolean().optional(),
      asOfDate: z.date().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const workflowService = new AutomatedFeeWorkflowService({
        prisma: ctx.prisma,
        enableNotifications: true,
        enableLateFeeApplication: true,
        enableStatusSync: true,
        notificationSettings: {
          overdueReminderDays: [1, 3, 7, 14, 30],
          escalationDays: 45,
          maxReminders: 5
        }
      });
      return workflowService.executeAutomatedWorkflow(input);
    }),

  // ============================================================================
  // ENHANCED TRANSACTION MANAGEMENT
  // ============================================================================

  processTransaction: protectedProcedure
    .input(z.object({
      enrollmentFeeId: z.string(),
      amount: z.number().positive(),
      method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE_BANKING', 'JAZZ_CASH', 'EASY_PAISA', 'ON_CAMPUS_COUNTER']),
      date: z.date(),
      reference: z.string().optional(),
      notes: z.string().optional(),
      challanId: z.string().optional(),
      receiptUrl: z.string().optional(),
      metadata: z.record(z.any()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const transactionService = new EnhancedTransactionManagementService(ctx.prisma);
      return transactionService.processTransaction({
        ...input,
        createdById: ctx.session.user.id
      });
    }),

  processBulkTransactions: protectedProcedure
    .input(z.object({
      transactions: z.array(z.object({
        enrollmentFeeId: z.string(),
        amount: z.number().positive(),
        method: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE_BANKING', 'JAZZ_CASH', 'EASY_PAISA', 'ON_CAMPUS_COUNTER']),
        date: z.date(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        challanId: z.string().optional(),
        receiptUrl: z.string().optional(),
        metadata: z.record(z.any()).optional()
      })),
      validateBeforeProcessing: z.boolean().optional(),
      continueOnError: z.boolean().optional(),
      createRollbackPoint: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const transactionService = new EnhancedTransactionManagementService(ctx.prisma);
      return transactionService.processBulkTransactions({
        transactions: input.transactions.map(t => ({
          ...t,
          createdById: ctx.session.user.id
        })),
        validateBeforeProcessing: input.validateBeforeProcessing,
        continueOnError: input.continueOnError,
        createRollbackPoint: input.createRollbackPoint
      });
    }),

  rollbackTransaction: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const transactionService = new EnhancedTransactionManagementService(ctx.prisma);
      return transactionService.rollbackTransaction(
        input.transactionId, 
        input.reason, 
        ctx.session.user.id
      );
    }),

  // ============================================================================
  // TESTING AND VALIDATION
  // ============================================================================

  runComprehensiveValidation: protectedProcedure
    .mutation(async ({ ctx }) => {
      const testingService = new FeeManagementTestingService(ctx.prisma);
      return testingService.runComprehensiveValidation();
    }),

  // ============================================================================
  // SYSTEM HEALTH AND MONITORING
  // ============================================================================

  getSystemHealthStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Check database connectivity
        const dbCheck = await ctx.prisma.enrollmentFee.count();
        
        // Check service availability
        const calculationService = new StandardizedFeeCalculationService(ctx.prisma);
        const statusSyncService = new PaymentStatusSyncService({
          prisma: ctx.prisma,
          enableOptimisticLocking: true,
          enableConflictResolution: true
        });

        // Get sync statistics
        const syncStats = await statusSyncService.getSyncStatistics();

        return {
          status: 'HEALTHY',
          timestamp: new Date(),
          checks: {
            database: { status: 'OK', recordCount: dbCheck },
            calculationService: { status: 'OK' },
            statusSyncService: { status: 'OK' },
            syncStatistics: syncStats
          }
        };
      } catch (error) {
        return {
          status: 'UNHEALTHY',
          timestamp: new Date(),
          error: (error as Error).message,
          checks: {
            database: { status: 'ERROR', error: (error as Error).message }
          }
        };
      }
    }),

  getPerformanceMetrics: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['hour', 'day', 'week', 'month']).default('day')
    }))
    .query(async ({ input }) => {
      // Get performance metrics from audit logs
      const timeframeDays = {
        hour: 1/24,
        day: 1,
        week: 7,
        month: 30
      };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays[input.timeframe]);

      // TODO: Implement after audit table is created
      const auditRecords: Array<{
        calculationType: string;
        performedAt: Date;
        isAutomated: boolean;
      }> = []; // Placeholder until audit table is available

      const metrics = {
        totalOperations: auditRecords.length,
        automatedOperations: auditRecords.filter(r => r.isAutomated).length,
        manualOperations: auditRecords.filter(r => !r.isAutomated).length,
        operationTypes: auditRecords.reduce((acc, record) => {
          acc[record.calculationType] = (acc[record.calculationType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        timeframe: input.timeframe,
        startDate,
        endDate: new Date()
      };

      return metrics;
    })
});
