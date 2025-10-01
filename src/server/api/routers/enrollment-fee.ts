import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  FeeService,
  createEnrollmentFeeSchema,
  updateEnrollmentFeeSchema,
  addDiscountSchema,
  addChargeSchema,
  addArrearSchema,
  addTransactionSchema
} from "../services/fee.service";
import { MultipleFeeAssignmentService } from "../services/multiple-fee-assignment.service";
import { DueDateManagementService } from "../services/due-date-management.service";
import { EnhancedFeeAnalyticsService } from "../services/enhanced-fee-analytics.service";
import { RecurringFeeProcessingService } from "../services/recurring-fee-processing.service";

export const enrollmentFeeRouter = createTRPCRouter({
  // Get fee collection statistics
  getFeeCollectionStats: protectedProcedure
    .query(async ({ ctx }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getFeeCollectionStats();
    }),
  create: protectedProcedure
    .input(createEnrollmentFeeSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.createEnrollmentFee({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  assignAdditionalFee: protectedProcedure
    .input(createEnrollmentFeeSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.assignAdditionalFee({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getByEnrollment: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getEnrollmentFeeByEnrollment(input.enrollmentId);
    }),

  getAllByEnrollment: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getEnrollmentFeesByEnrollment(input.enrollmentId);
    }),

  getAvailableFeeStructures: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getAvailableFeeStructuresForEnrollment(input.enrollmentId);
    }),

  update: protectedProcedure
    .input(updateEnrollmentFeeSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.updateEnrollmentFee({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  addDiscount: protectedProcedure
    .input(addDiscountSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.addDiscount({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  removeDiscount: protectedProcedure
    .input(z.object({ discountId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.removeDiscount(input.discountId);
    }),

  addCharge: protectedProcedure
    .input(addChargeSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.addAdditionalCharge({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  removeCharge: protectedProcedure
    .input(z.object({ chargeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.removeAdditionalCharge(input.chargeId);
    }),

  addArrear: protectedProcedure
    .input(addArrearSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.addArrear({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  removeArrear: protectedProcedure
    .input(z.object({ arrearId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.removeArrear(input.arrearId);
    }),

  addTransaction: protectedProcedure
    .input(addTransactionSchema)
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.addTransaction({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  updatePaymentStatus: protectedProcedure
    .input(z.object({
      enrollmentFeeId: z.string(),
      paymentStatus: z.string(),
      paidAmount: z.number().optional(),
      paymentMethod: z.string().optional(),
      transactionReference: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.updatePaymentStatus({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  getTransactions: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getTransactions(input.enrollmentFeeId);
    }),

  generateReceipt: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.generateReceipt(input.transactionId);
    }),

  recalculateFee: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.recalculateEnrollmentFee(input.enrollmentFeeId);
    }),

  // Get fee analytics for campus admin
  getFeeAnalytics: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      timeframe: z.enum(["week", "month", "term", "year"]).default("month"),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const feeService = new FeeService({ prisma: ctx.prisma });

        // Build where clause for campus filtering
        const whereClause = input.campusId ? {
          enrollment: {
            class: {
              courseCampus: {
                campusId: input.campusId
              }
            }
          }
        } : {};

        // Calculate date range based on timeframe
        const now = new Date();
        let startDate: Date;
        switch (input.timeframe) {
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "term":
            startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get fee collection statistics
        const totalCollected = await ctx.prisma.feeTransaction.aggregate({
          where: {
            ...whereClause,
            createdAt: {
              gte: startDate
            }
          },
          _sum: {
            amount: true,
          },
        });

        // Get pending fees
        const pendingFees = await ctx.prisma.enrollmentFee.findMany({
          where: {
            ...whereClause,
            paymentStatus: {
              in: ["PENDING", "PARTIAL"],
            },
          },
          select: {
            finalAmount: true,
            transactions: {
              select: {
                amount: true,
              },
            },
          },
        });

        let totalPending = 0;
        for (const fee of pendingFees) {
          const paidAmount = fee.transactions.reduce((sum, t) => sum + t.amount, 0);
          totalPending += fee.finalAmount - paidAmount;
        }

        // Get collection trends (last 12 periods)
        const collectionTrends: Array<{ period: string; amount: number }> = [];
        for (let i = 11; i >= 0; i--) {
          const periodStart = new Date(startDate.getTime() + i * (now.getTime() - startDate.getTime()) / 12);
          const periodEnd = new Date(startDate.getTime() + (i + 1) * (now.getTime() - startDate.getTime()) / 12);

          const periodCollection = await ctx.prisma.feeTransaction.aggregate({
            where: {
              ...whereClause,
              createdAt: {
                gte: periodStart,
                lt: periodEnd
              }
            },
            _sum: {
              amount: true,
            },
          });

          collectionTrends.push({
            period: periodStart.toISOString().split('T')[0],
            amount: periodCollection._sum.amount || 0,
          });
        }

        // Get payment method distribution
        const paymentMethods = await ctx.prisma.feeTransaction.groupBy({
          by: ['method'],
          where: {
            ...whereClause,
            createdAt: {
              gte: startDate
            }
          },
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        });

        return {
          totalCollected: totalCollected._sum.amount || 0,
          totalPending,
          collectionRate: totalCollected._sum.amount && totalPending
            ? ((totalCollected._sum.amount || 0) / ((totalCollected._sum.amount || 0) + totalPending)) * 100
            : 0,
          collectionTrends,
          paymentMethods: paymentMethods.map(pm => ({
            method: pm.method,
            amount: pm._sum?.amount || 0,
            count: pm._count?.id || 0,
          })),
        };
      } catch (error) {
        console.error('Error fetching fee analytics:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch fee analytics",
        });
      }
    }),

  // Multiple Fee Assignment Endpoints
  assignMultipleFees: protectedProcedure
    .input(z.object({
      enrollmentId: z.string(),
      feeAssignments: z.array(z.object({
        feeStructureId: z.string(),
        dueDate: z.date().optional(),
        notes: z.string().optional(),
        discounts: z.array(z.object({
          discountTypeId: z.string(),
          amount: z.number().positive()
        })).optional()
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      const multipleFeeService = new MultipleFeeAssignmentService(ctx.prisma);
      return multipleFeeService.assignMultipleFees({
        ...input,
        createdById: ctx.session.user.id
      });
    }),

  getEnrollmentFeeAssignments: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const multipleFeeService = new MultipleFeeAssignmentService(ctx.prisma);
      return multipleFeeService.getEnrollmentFeeAssignments(input.enrollmentId);
    }),

  removeFeeAssignment: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const multipleFeeService = new MultipleFeeAssignmentService(ctx.prisma);
      return multipleFeeService.removeFeeAssignment(input.enrollmentFeeId, ctx.session.user.id);
    }),

  getAvailableFeeStructuresForAssignment: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const multipleFeeService = new MultipleFeeAssignmentService(ctx.prisma);
      return multipleFeeService.getAvailableFeeStructures(input.enrollmentId);
    }),

  // Due Date Management Endpoints
  setAutomatedDueDates: protectedProcedure
    .input(z.object({
      enrollmentFeeIds: z.array(z.string()).optional(),
      campusId: z.string().optional(),
      programId: z.string().optional(),
      academicCycleId: z.string().optional(),
      dueDatePolicy: z.object({
        daysFromEnrollment: z.number().optional(),
        daysFromTermStart: z.number().optional(),
        specificDate: z.date().optional(),
        installmentSchedule: z.array(z.object({
          installmentNumber: z.number(),
          daysOffset: z.number(),
          percentage: z.number()
        })).optional()
      }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const dueDateService = new DueDateManagementService(ctx.prisma);
      return dueDateService.setAutomatedDueDates(input);
    }),

  getOverdueFees: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      programId: z.string().optional(),
      gracePeriodDays: z.number().optional(),
      includeEscalationLevels: z.boolean().optional()
    }))
    .query(async ({ input, ctx }) => {
      const dueDateService = new DueDateManagementService(ctx.prisma);
      return dueDateService.getOverdueFees(input);
    }),

  getUpcomingDueDates: protectedProcedure
    .input(z.object({
      daysAhead: z.number().optional(),
      campusId: z.string().optional(),
      programId: z.string().optional(),
      reminderTypes: z.array(z.enum(['EMAIL', 'SMS', 'PUSH'])).optional()
    }))
    .query(async ({ input, ctx }) => {
      const dueDateService = new DueDateManagementService(ctx.prisma);
      return dueDateService.getUpcomingDueDates(input);
    }),

  updatePaymentStatuses: protectedProcedure
    .input(z.object({
      enrollmentFeeIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const dueDateService = new DueDateManagementService(ctx.prisma);
      return dueDateService.updatePaymentStatuses(input.enrollmentFeeIds);
    }),

  // Enhanced Analytics Endpoints
  getFeeCollectionDashboard: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      programId: z.string().optional(),
      academicCycleId: z.string().optional(),
      dateRange: z.object({
        startDate: z.date(),
        endDate: z.date()
      }).optional()
    }))
    .query(async ({ input, ctx }) => {
      const analyticsService = new EnhancedFeeAnalyticsService(ctx.prisma);
      return analyticsService.getFeeCollectionDashboard(input);
    }),

  getFinancialMetrics: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      programId: z.string().optional(),
      academicCycleId: z.string().optional(),
      compareWithPrevious: z.boolean().optional()
    }))
    .query(async ({ input, ctx }) => {
      const analyticsService = new EnhancedFeeAnalyticsService(ctx.prisma);
      return analyticsService.getFinancialMetrics(input);
    }),

  getLateFeeAnalytics: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      programId: z.string().optional(),
      dateRange: z.object({
        startDate: z.date(),
        endDate: z.date()
      }).optional()
    }))
    .query(async ({ input, ctx }) => {
      const analyticsService = new EnhancedFeeAnalyticsService(ctx.prisma);
      return analyticsService.getLateFeeAnalytics(input);
    }),

  // Process enrollment fees with recurring logic
  processEnrollmentFeesWithRecurring: protectedProcedure
    .input(z.object({
      enrollmentId: z.string(),
      feeStructureId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const recurringFeeService = new RecurringFeeProcessingService(ctx.prisma);
      return recurringFeeService.processEnrollmentFees(
        input.enrollmentId,
        input.feeStructureId,
        ctx.session.user.id
      );
    }),

  // Get fee breakdown for enrollment
  getFeeBreakdown: protectedProcedure
    .input(z.object({ enrollmentId: z.string() }))
    .query(async ({ input, ctx }) => {
      const recurringFeeService = new RecurringFeeProcessingService(ctx.prisma);
      return recurringFeeService.getFeeBreakdown(input.enrollmentId);
    }),

  // Manually trigger recurring fee generation (admin only)
  generateRecurringFees: protectedProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) => {
      // Check admin permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only system administrators can trigger recurring fee generation",
        });
      }

      const recurringFeeService = new RecurringFeeProcessingService(ctx.prisma);
      return recurringFeeService.generateRecurringFees(input.dryRun);
    }),
});
