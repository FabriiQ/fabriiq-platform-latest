/**
 * Late Fee Router
 * TRPC router for late fee management operations
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { LateFeeService } from "@/server/api/services/late-fee.service";

// Input schemas for late fee operations
const createLateFeeSchema = z.object({
  enrollmentFeeId: z.string(),
  amount: z.number().min(0),
  reason: z.string(),
  daysOverdue: z.number().int().min(0),
  dueDate: z.date(),
});

const lateFeeSettingsSchema = z.object({
  enableLateFees: z.boolean().default(true),
  gracePeriodDays: z.number().int().min(0).default(7),
  lateFeeAmount: z.number().min(0).default(50),
  lateFeeType: z.enum(['FIXED', 'PERCENTAGE']).default('FIXED'),
  maxLateFeeAmount: z.number().min(0).optional(),
  autoApply: z.boolean().default(false),
  notificationEnabled: z.boolean().default(true),
});

export const lateFeeRouter = createTRPCRouter({

  // ========================================================================
  // LATE FEE SETTINGS
  // ========================================================================

  getSettings: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        // Get late fee settings from system config
        const settings = await ctx.prisma.systemConfig.findFirst({
          where: {
            key: 'late_fee_settings',
            category: 'fee_management',
          }
        });

        const defaultSettings = {
          enableLateFees: true,
          gracePeriodDays: 7,
          lateFeeAmount: 50,
          lateFeeType: 'FIXED' as const,
          maxLateFeeAmount: 500,
          autoApply: false,
          notificationEnabled: true,
        };

        return {
          success: true,
          settings: settings?.value ? { ...defaultSettings, ...(settings.value as object) } : defaultSettings,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch late fee settings",
        });
      }
    }),

  updateSettings: protectedProcedure
    .input(z.object({
      settings: lateFeeSettingsSchema,
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.systemConfig.upsert({
          where: {
            key: 'late_fee_settings'
          },
          create: {
            key: 'late_fee_settings',
            value: input.settings,
            description: 'Late fee management settings',
            category: 'fee_management',
            createdById: ctx.session.user.id,
          },
          update: {
            value: input.settings,
            updatedById: ctx.session.user.id,
            updatedAt: new Date(),
          }
        });

        return {
          success: true,
          message: "Late fee settings updated successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update late fee settings",
        });
      }
    }),

  // ========================================================================
  // OVERDUE FEES MANAGEMENT
  // ========================================================================

  getOverdueFees: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const today = new Date();

        const overdueFees = await ctx.prisma.enrollmentFee.findMany({
          where: {
            dueDate: {
              lt: today
            },
            paymentStatus: {
              in: ['PENDING', 'PARTIAL']
            },
            ...(input?.campusId && {
              enrollment: {
                class: {
                  campusId: input.campusId
                }
              }
            }),
          },
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                },
                class: {
                  select: {
                    id: true,
                    name: true,
                    campus: { select: { id: true, name: true } }
                  }
                }
              }
            },
            feeStructure: { select: { id: true, name: true } }
          },
          orderBy: { dueDate: 'asc' },
          take: input?.limit || 50,
          skip: input?.offset || 0,
        });

        const formattedFees = overdueFees.map(fee => ({
          id: fee.id,
          studentName: fee.enrollment.student.user?.name || 'Unknown',
          studentEmail: fee.enrollment.student.user?.email || '',
          className: fee.enrollment.class.name,
          campusName: fee.enrollment.class.campus.name,
          feeStructureName: fee.feeStructure.name,
          baseAmount: fee.baseAmount,
          finalAmount: fee.finalAmount,
          dueDate: fee.dueDate,
          daysOverdue: Math.floor((today.getTime() - (fee.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
          hasLateFees: false, // Will be implemented when late fee applications are created
          lateFeeAmount: 0, // Will be calculated when late fee applications exist
        }));

        const total = await ctx.prisma.enrollmentFee.count({
          where: {
            dueDate: { lt: today },
            paymentStatus: { in: ['PENDING', 'PARTIAL'] },
            ...(input?.campusId && {
              enrollment: {
                class: { campusId: input.campusId }
              }
            }),
          }
        });

        return {
          success: true,
          fees: formattedFees,
          pagination: {
            total,
            limit: input?.limit || 50,
            offset: input?.offset || 0,
            hasMore: (input?.offset || 0) + formattedFees.length < total,
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch overdue fees",
        });
      }
    }),

  // ========================================================================
  // LATE FEE APPLICATION
  // ========================================================================

  applyLateFee: protectedProcedure
    .input(createLateFeeSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if enrollment fee exists
        const enrollmentFee = await ctx.prisma.enrollmentFee.findUnique({
          where: { id: input.enrollmentFeeId },
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
          }
        });

        if (!enrollmentFee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Enrollment fee not found",
          });
        }

        // Create additional charge for late fee (using existing schema)
        const lateFeeCharge = await ctx.prisma.additionalCharge.create({
          data: {
            enrollmentFeeId: input.enrollmentFeeId,
            name: 'Late Fee',
            amount: input.amount,
            reason: `Late fee applied - ${input.reason}`,
            createdById: ctx.session.user.id,
          }
        });

        // Update enrollment fee final amount
        await ctx.prisma.enrollmentFee.update({
          where: { id: input.enrollmentFeeId },
          data: {
            finalAmount: enrollmentFee.finalAmount + input.amount,
          }
        });

        return {
          success: true,
          lateFeeCharge,
          message: `Late fee of $${input.amount.toFixed(2)} applied successfully`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to apply late fee",
        });
      }
    }),

  // ========================================================================
  // LATE FEE ANALYTICS
  // ========================================================================

  getAnalytics: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const dateFrom = input?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = input?.dateTo || new Date();

        // Get late fee charges (using additional charges with name 'Late Fee')
        const [totalCharges, totalAmount] = await Promise.all([
          ctx.prisma.additionalCharge.count({
            where: {
              name: 'Late Fee',
              createdAt: { gte: dateFrom, lte: dateTo },
              ...(input?.campusId && {
                enrollmentFee: {
                  enrollment: {
                    class: { campusId: input.campusId }
                  }
                }
              }),
            }
          }),
          ctx.prisma.additionalCharge.aggregate({
            where: {
              name: 'Late Fee',
              createdAt: { gte: dateFrom, lte: dateTo },
              ...(input?.campusId && {
                enrollmentFee: {
                  enrollment: {
                    class: { campusId: input.campusId }
                  }
                }
              }),
            },
            _sum: { amount: true }
          }),
        ]);

        return {
          success: true,
          analytics: {
            totalLateFees: totalCharges,
            totalAmount: totalAmount._sum.amount || 0,
            averageLateFee: totalCharges > 0 ? (totalAmount._sum.amount || 0) / totalCharges : 0,
            period: { from: dateFrom, to: dateTo }
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch late fee analytics",
        });
      }
    }),

  // ========================================================================
  // LATE FEE POLICY MANAGEMENT
  // ========================================================================

  getPolicies: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      isActive: z.boolean().optional(),
      includeInactive: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const lateFeeService = new LateFeeService({ prisma: ctx.prisma });

        // Handle includeInactive parameter
        const filters = input ? {
          institutionId: input.institutionId,
          campusId: input.campusId,
          isActive: input.includeInactive ? undefined : (input.isActive ?? true),
        } : undefined;

        return await lateFeeService.getPolicies(filters);
      } catch (error) {
        console.error("Error fetching late fee policies:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch late fee policies",
        });
      }
    }),

  createPolicy: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      calculationType: z.enum(['FIXED', 'PERCENTAGE', 'DAILY_FIXED', 'DAILY_PERCENTAGE', 'TIERED_FIXED', 'TIERED_PERCENTAGE']),
      amount: z.number().min(0).default(0),
      maxAmount: z.number().min(0).optional(),
      minAmount: z.number().min(0).default(0),
      gracePeriodDays: z.number().int().min(0).default(0),
      applyAfterDays: z.number().int().min(1).default(1),
      compoundingEnabled: z.boolean().default(false),
      compoundingInterval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
      maxCompoundingPeriods: z.number().int().min(1).optional(),
      tieredRules: z.array(z.object({
        daysFrom: z.number().int().min(1),
        daysTo: z.number().int().min(1),
        amount: z.number().min(0)
      })).optional(),
      applyOnWeekends: z.boolean().default(true),
      applyOnHolidays: z.boolean().default(true),
      autoApply: z.boolean().default(true),
      applicableToFeeTypes: z.array(z.string()).default([]),
      applicableToPrograms: z.array(z.string()).default([]),
      applicableToClasses: z.array(z.string()).default([]),
      isActive: z.boolean().default(true),
      effectiveFrom: z.date().optional(),
      effectiveTo: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const lateFeeService = new LateFeeService({ prisma: ctx.prisma });
        return await lateFeeService.createPolicy({
          ...input,
          createdById: ctx.session.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create late fee policy",
        });
      }
    }),

  updatePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      calculationType: z.enum(['FIXED', 'PERCENTAGE', 'DAILY_FIXED', 'DAILY_PERCENTAGE', 'TIERED_FIXED', 'TIERED_PERCENTAGE']).optional(),
      amount: z.number().min(0).optional(),
      maxAmount: z.number().min(0).optional(),
      gracePeriodDays: z.number().int().min(0).optional(),
      compoundingEnabled: z.boolean().optional(),
      compoundingInterval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
      maxCompoundingPeriods: z.number().int().min(0).optional(),
      tieredRules: z.array(z.object({
        daysFrom: z.number().int().min(1),
        daysTo: z.number().int().min(1),
        amount: z.number().min(0)
      })).optional(),
      isActive: z.boolean().optional(),
      autoApply: z.boolean().optional(),
      effectiveFrom: z.date().optional(),
      effectiveTo: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const lateFeeService = new LateFeeService({ prisma: ctx.prisma });
        return await lateFeeService.updatePolicy({
          ...input,
          updatedById: ctx.session.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update late fee policy",
        });
      }
    }),

  deactivatePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const lateFeeService = new LateFeeService({ prisma: ctx.prisma });
        return await lateFeeService.deactivatePolicy(input.id, ctx.session.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deactivate late fee policy",
        });
      }
    }),

  // ========================================================================
  // LATE FEE WAIVER REQUESTS
  // ========================================================================

  createWaiverRequest: protectedProcedure
    .input(z.object({
      enrollmentFeeId: z.string(),
      reason: z.string().min(10, "Reason must be at least 10 characters"),
      requestedAmount: z.number().min(0),
      supportingDocuments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify enrollment fee exists
        const enrollmentFee = await ctx.prisma.enrollmentFee.findUnique({
          where: { id: input.enrollmentFeeId },
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        });

        if (!enrollmentFee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Enrollment fee not found",
          });
        }

        // Create waiver request (using system config table for now)
        const waiverRequest = await ctx.prisma.systemConfig.create({
          data: {
            key: `waiver_request_${Date.now()}`,
            value: {
              enrollmentFeeId: input.enrollmentFeeId,
              studentId: enrollmentFee.enrollment.student.id,
              studentName: enrollmentFee.enrollment.student.user?.name,
              reason: input.reason,
              requestedAmount: input.requestedAmount,
              supportingDocuments: input.supportingDocuments || [],
              status: 'PENDING',
              requestedAt: new Date().toISOString(),
            },
            description: `Late fee waiver request for ${enrollmentFee.enrollment.student.user?.name}`,
            category: 'waiver_requests',
            createdById: ctx.session.user.id,
          }
        });

        return {
          success: true,
          waiverRequest,
          message: "Waiver request submitted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create waiver request",
        });
      }
    }),

  // ========================================================================
  // AUGMENTED (NON-BREAKING) ENDPOINTS
  // ========================================================================

  /**
   * Preview calculation for a specific enrollment fee and policy without applying it
   */
  previewCalculation: protectedProcedure
    .input(z.object({
      enrollmentFeeId: z.string(),
      policyId: z.string(),
      asOfDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new LateFeeService({ prisma: ctx.prisma });
      const result = await service.calculateLateFee(
        input.enrollmentFeeId,
        input.policyId,
        input.asOfDate || new Date()
      );
      return { success: true, result };
    }),

  /**
   * Process automatic late fees with optional dryRun (no DB writes)
   */
  processAutomatic: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      policyIds: z.array(z.string()).optional(),
      asOfDate: z.date().optional(),
      dryRun: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new LateFeeService({ prisma: ctx.prisma });
      const res = await service.processAutomaticLateFees({
        institutionId: input.institutionId,
        campusId: input.campusId,
        policyIds: input.policyIds,
        asOfDate: input.asOfDate,
        dryRun: input.dryRun,
      });
      return res;
    }),

  /**
   * Create waiver request using LateFeeWaiver model (v2)
   */
  createWaiverV2: protectedProcedure
    .input(z.object({
      lateFeeApplicationId: z.string(),
      enrollmentFeeId: z.string(),
      requestedAmount: z.number().min(0),
      reason: z.string().min(10),
      justification: z.string().optional(),
      supportingDocuments: z.array(z.object({ name: z.string(), url: z.string(), type: z.string() })).optional(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new LateFeeService({ prisma: ctx.prisma });
      const waiver = await service.createWaiverRequest({
        lateFeeApplicationId: input.lateFeeApplicationId,
        enrollmentFeeId: input.enrollmentFeeId,
        requestedAmount: input.requestedAmount,
        reason: input.reason,
        justification: input.justification,
        supportingDocuments: input.supportingDocuments,
        expiresAt: input.expiresAt,
        requestedBy: ctx.session.user.id,
      });
      return waiver;
    }),

  /**
   * Enhanced overdue listing via service for UI (uses same logic as service)
   */
  getOverdueFeesEnhanced: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      programId: z.string().optional(),
      asOfDate: z.date().optional(),
      excludeProcessed: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = new LateFeeService({ prisma: ctx.prisma });
      const overdue = await service.getOverdueFees({
        institutionId: input?.institutionId,
        campusId: input?.campusId,
        programId: input?.programId,
        asOfDate: input?.asOfDate,
        excludeProcessed: input?.excludeProcessed,
      });

      const total = overdue.length;
      const sliced = overdue.slice(input?.offset || 0, (input?.offset || 0) + (input?.limit || 50));
      return {
        success: true,
        fees: sliced,
        pagination: {
          total,
          limit: input?.limit || 50,
          offset: input?.offset || 0,
          hasMore: ((input?.offset || 0) + sliced.length) < total,
        }
      };
    }),

});
