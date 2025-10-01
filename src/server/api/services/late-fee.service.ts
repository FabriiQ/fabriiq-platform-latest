/**
 * Late Fee Service
 * Comprehensive service for managing late fees, policies, calculations, and applications
 */

import { PrismaClient, LateFeeCalculationType, LateFeeStatus, WaiverStatus, CompoundingInterval } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ServiceBase } from "./service-base";
import { EnhancedFeeIntegrationService } from "./enhanced-fee-integration.service";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createLateFeePolicy = z.object({
  institutionId: z.string().optional(),
  campusId: z.string().optional(),
  name: z.string().min(1, "Policy name is required"),
  description: z.string().optional(),
  calculationType: z.nativeEnum(LateFeeCalculationType).default(LateFeeCalculationType.FIXED),
  amount: z.number().min(0, "Amount must be non-negative").default(0),
  maxAmount: z.number().min(0).optional(),
  minAmount: z.number().min(0).default(0),
  gracePeriodDays: z.number().int().min(0).default(0),
  applyAfterDays: z.number().int().min(1).default(1),
  compoundingEnabled: z.boolean().default(false),
  compoundingInterval: z.nativeEnum(CompoundingInterval).optional(),
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
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
  createdById: z.string(),
});

export const updateLateFeePolicy = createLateFeePolicy.partial().extend({
  id: z.string(),
  updatedById: z.string(),
});

export const createLateFeeApplication = z.object({
  enrollmentFeeId: z.string(),
  policyId: z.string(),
  daysOverdue: z.number().int().min(0),
  calculatedAmount: z.number().min(0),
  appliedAmount: z.number().min(0),
  compoundingPeriods: z.number().int().min(0).default(0),
  dueDate: z.date(),
  calculationDate: z.date(),
  applicationDate: z.date().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  createdById: z.string(),
});

export const createWaiverRequest = z.object({
  lateFeeApplicationId: z.string(),
  enrollmentFeeId: z.string(),
  requestedAmount: z.number().min(0),
  reason: z.string().min(1, "Reason is required"),
  justification: z.string().optional(),
  supportingDocuments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
  })).optional(),
  expiresAt: z.date().optional(),
  requestedBy: z.string(),
});

// ============================================================================
// INTERFACES
// ============================================================================

export interface LateFeeCalculationResult {
  amount: number;
  compoundingPeriods: number;
  details: {
    baseAmount: number;
    daysOverdue: number;
    gracePeriodApplied: boolean;
    calculationType: LateFeeCalculationType;
    tiersApplied?: Array<{
      daysFrom: number;
      daysTo: number;
      amount: number;
    }>;
    compoundingDetails?: {
      enabled: boolean;
      interval: CompoundingInterval;
      periods: number;
      compoundedAmount: number;
    };
  };
}

export interface OverdueFeeInfo {
  enrollmentFeeId: string;
  studentName: string;
  studentEmail: string;
  dueDate: Date;
  daysOverdue: number;
  outstandingAmount: number;
  feeStructureName: string;
  programName: string;
  className: string;
}

// ============================================================================
// LATE FEE SERVICE CLASS
// ============================================================================

export class LateFeeService extends ServiceBase {
  private feeIntegrationService: EnhancedFeeIntegrationService;

  constructor(options: { prisma: PrismaClient }) {
    super(options);
    this.feeIntegrationService = new EnhancedFeeIntegrationService({
      prisma: options.prisma,
      enableAutomaticSync: true,
      enableAuditTrail: true
    });
  }

  // ========================================================================
  // POLICY MANAGEMENT
  // ========================================================================

  /**
   * Create a new late fee policy
   */
  async createPolicy(data: z.infer<typeof createLateFeePolicy>) {
    try {
      const policy = await this.prisma.lateFeePolicy.create({
        data: {
          ...data,
          tieredRules: data.tieredRules ? JSON.stringify(data.tieredRules) : undefined,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return {
        success: true,
        policy,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create late fee policy",
        cause: error,
      });
    }
  }

  /**
   * Update an existing late fee policy
   */
  async updatePolicy(data: z.infer<typeof updateLateFeePolicy>) {
    try {
      const { id, ...updateData } = data;

      const policy = await this.prisma.lateFeePolicy.update({
        where: { id },
        data: {
          ...updateData,
          tieredRules: updateData.tieredRules ? JSON.stringify(updateData.tieredRules) : undefined,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return {
        success: true,
        policy,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update late fee policy",
        cause: error,
      });
    }
  }

  /**
   * Get all active late fee policies
   */
  async getPolicies(filters?: {
    institutionId?: string;
    campusId?: string;
    isActive?: boolean;
  }) {
    try {
      const policies = await this.prisma.lateFeePolicy.findMany({
        where: {
          ...filters,
          isActive: filters?.isActive ?? true,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return {
        success: true,
        policies,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch late fee policies",
        cause: error,
      });
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicy(id: string) {
    try {
      const policy = await this.prisma.lateFeePolicy.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          updatedBy: {
            select: { id: true, name: true, email: true }
          },
          applications: {
            include: {
              enrollmentFee: {
                include: {
                  enrollment: {
                    include: {
                      student: {
                        include: {
                          user: {
                            select: { id: true, name: true, email: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Late fee policy not found",
        });
      }

      return {
        success: true,
        policy,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch late fee policy",
        cause: error,
      });
    }
  }

  /**
   * Deactivate a late fee policy
   */
  async deactivatePolicy(id: string, updatedById: string) {
    try {
      const policy = await this.prisma.lateFeePolicy.update({
        where: { id },
        data: {
          isActive: false,
          updatedById,
          updatedAt: new Date(),
        }
      });

      return {
        success: true,
        policy,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to deactivate late fee policy",
        cause: error,
      });
    }
  }

  // ========================================================================
  // LATE FEE CALCULATION ENGINE
  // ========================================================================

  /**
   * Calculate late fee for a specific enrollment fee and policy
   */
  async calculateLateFee(
    enrollmentFeeId: string,
    policyId: string,
    asOfDate: Date = new Date()
  ): Promise<LateFeeCalculationResult> {
    try {
      // Get enrollment fee details
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } }
                }
              },
              class: {
                include: {
                  programCampus: {
                    include: {
                      program: { select: { id: true, name: true } },
                      campus: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            }
          },
          feeStructure: { select: { id: true, name: true } },
          lateFeeApplications: {
            where: { status: { in: [LateFeeStatus.APPLIED, LateFeeStatus.PAID] } }
          }
        }
      });

      if (!enrollmentFee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment fee not found",
        });
      }

      // Get policy details
      const policy = await this.prisma.lateFeePolicy.findUnique({
        where: { id: policyId, isActive: true }
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Late fee policy not found or inactive",
        });
      }

      // Calculate days overdue
      const dueDate = enrollmentFee.dueDate;
      if (!dueDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enrollment fee has no due date",
        });
      }

      const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if within grace period
      if (daysOverdue <= policy.gracePeriodDays) {
        return {
          amount: 0,
          compoundingPeriods: 0,
          details: {
            baseAmount: enrollmentFee.finalAmount,
            daysOverdue,
            gracePeriodApplied: true,
            calculationType: policy.calculationType,
          }
        };
      }

      // Calculate effective days for late fee
      const effectiveDaysOverdue = Math.max(0, daysOverdue - policy.gracePeriodDays);

      // Get existing late fees to check against maximum
      const existingLateFees = enrollmentFee.lateFeeApplications.reduce(
        (sum, app) => sum + app.appliedAmount, 0
      );

      // Calculate late fee based on type
      let calculatedAmount = 0;
      let compoundingPeriods = 0;
      const details: LateFeeCalculationResult['details'] = {
        baseAmount: enrollmentFee.finalAmount,
        daysOverdue,
        gracePeriodApplied: false,
        calculationType: policy.calculationType,
      };

      switch (policy.calculationType) {
        case LateFeeCalculationType.FIXED:
          calculatedAmount = policy.amount;
          break;

        case LateFeeCalculationType.PERCENTAGE:
          calculatedAmount = (enrollmentFee.finalAmount * policy.amount) / 100;
          break;

        case LateFeeCalculationType.DAILY_FIXED:
          calculatedAmount = policy.amount * effectiveDaysOverdue;
          break;

        case LateFeeCalculationType.DAILY_PERCENTAGE:
          if (policy.compoundingEnabled) {
            // Compound daily
            const dailyRate = policy.amount / 100;
            compoundingPeriods = Math.min(
              effectiveDaysOverdue,
              policy.maxCompoundingPeriods || effectiveDaysOverdue
            );
            calculatedAmount = enrollmentFee.finalAmount * (Math.pow(1 + dailyRate, compoundingPeriods) - 1);

            details.compoundingDetails = {
              enabled: true,
              interval: policy.compoundingInterval || CompoundingInterval.DAILY,
              periods: compoundingPeriods,
              compoundedAmount: calculatedAmount,
            };
          } else {
            // Simple daily percentage
            calculatedAmount = (enrollmentFee.finalAmount * policy.amount * effectiveDaysOverdue) / 100;
          }
          break;

        case LateFeeCalculationType.TIERED_FIXED:
        case LateFeeCalculationType.TIERED_PERCENTAGE:
          if (policy.tieredRules) {
            const tiers = JSON.parse(policy.tieredRules as string) as Array<{
              daysFrom: number;
              daysTo: number;
              amount: number;
            }>;

            const applicableTier = tiers.find(
              tier => effectiveDaysOverdue >= tier.daysFrom && effectiveDaysOverdue <= tier.daysTo
            );

            if (applicableTier) {
              if (policy.calculationType === LateFeeCalculationType.TIERED_FIXED) {
                calculatedAmount = applicableTier.amount;
              } else {
                calculatedAmount = (enrollmentFee.finalAmount * applicableTier.amount) / 100;
              }

              details.tiersApplied = [applicableTier];
            }
          }
          break;
      }

      // Apply minimum amount
      if (calculatedAmount < policy.minAmount) {
        calculatedAmount = policy.minAmount;
      }

      // Apply maximum amount cap
      if (policy.maxAmount && (calculatedAmount + existingLateFees) > policy.maxAmount) {
        calculatedAmount = Math.max(0, policy.maxAmount - existingLateFees);
      }

      return {
        amount: calculatedAmount,
        compoundingPeriods,
        details,
      };

    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate late fee",
        cause: error,
      });
    }
  }

  /**
   * Get all overdue enrollment fees that need late fee processing
   */
  async getOverdueFees(filters?: {
    institutionId?: string;
    campusId?: string;
    programId?: string;
    asOfDate?: Date;
    excludeProcessed?: boolean;
  }): Promise<OverdueFeeInfo[]> {
    try {
      const asOfDate = filters?.asOfDate || new Date();

      const overdueFees = await this.prisma.enrollmentFee.findMany({
        where: {
          dueDate: {
            lt: asOfDate
          },
          paymentStatus: {
            in: ['PENDING', 'PARTIAL', 'OVERDUE']
          },
          ...(filters?.excludeProcessed && {
            lateFeeApplications: {
              none: {
                status: { in: [LateFeeStatus.APPLIED, LateFeeStatus.PAID] }
              }
            }
          })
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
                include: {
                  programCampus: {
                    include: {
                      program: { select: { id: true, name: true } },
                      campus: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            }
          },
          feeStructure: { select: { id: true, name: true } }
        },
        orderBy: { dueDate: 'asc' }
      });

      return overdueFees.map(fee => ({
        enrollmentFeeId: fee.id,
        studentName: fee.enrollment.student.user?.name || 'Unknown',
        studentEmail: fee.enrollment.student.user?.email || '',
        dueDate: fee.dueDate!,
        daysOverdue: Math.floor((asOfDate.getTime() - fee.dueDate!.getTime()) / (1000 * 60 * 60 * 24)),
        outstandingAmount: fee.finalAmount,
        feeStructureName: fee.feeStructure.name,
        programName: fee.enrollment.class?.programCampus?.program.name || 'N/A',
        className: fee.enrollment.class?.name || 'N/A',
      }));

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch overdue fees",
        cause: error,
      });
    }
  }

  // ========================================================================
  // LATE FEE APPLICATION MANAGEMENT
  // ========================================================================

  /**
   * Apply late fee to an enrollment fee with proper integration
   */
  async applyLateFee(data: z.infer<typeof createLateFeeApplication>) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create late fee application
        const application = await tx.lateFeeApplication.create({
          data: {
            ...data,
            status: LateFeeStatus.APPLIED,
            applicationDate: new Date(),
          },
          include: {
            enrollmentFee: {
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
            },
            policy: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true, email: true } }
          }
        });

        // Use enhanced integration service to apply late fee and sync
        const integrationResult = await this.feeIntegrationService.applyLateFeeWithIntegration({
          enrollmentFeeId: data.enrollmentFeeId,
          lateFeeApplicationId: application.id,
          performedBy: data.createdById
        });

        // Create history record
        await tx.lateFeeHistory.create({
          data: {
            enrollmentFeeId: data.enrollmentFeeId,
            lateFeeApplicationId: application.id,
            action: 'APPLIED',
            newStatus: LateFeeStatus.APPLIED,
            amount: data.appliedAmount,
            performedBy: data.createdById,
            systemGenerated: false,
            details: {
              policyId: data.policyId,
              daysOverdue: data.daysOverdue,
              calculatedAmount: data.calculatedAmount,
              appliedAmount: data.appliedAmount,
              integrationResult: JSON.parse(JSON.stringify(integrationResult))
            }
          }
        });

        return {
          success: true,
          application,
          integrationResult
        };
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to apply late fee with integration",
        cause: error,
      });
    }
  }

  /**
   * Process automatic late fee applications for overdue fees
   */
  async processAutomaticLateFees(filters?: {
    institutionId?: string;
    campusId?: string;
    policyIds?: string[];
    asOfDate?: Date;
    dryRun?: boolean;
  }) {
    try {
      const asOfDate = filters?.asOfDate || new Date();
      const results = {
        processed: 0,
        applied: 0,
        skipped: 0,
        errors: 0,
        details: [] as Array<{
          enrollmentFeeId: string;
          studentName: string;
          action: 'APPLIED' | 'SKIPPED' | 'ERROR';
          amount?: number;
          reason?: string;
        }>
      };

      // Get applicable policies
      const policies = await this.prisma.lateFeePolicy.findMany({
        where: {
          isActive: true,
          autoApply: true,
          ...(filters?.institutionId && { institutionId: filters.institutionId }),
          ...(filters?.campusId && { campusId: filters.campusId }),
          ...(filters?.policyIds && { id: { in: filters.policyIds } }),
          OR: [
            { effectiveFrom: null },
            { effectiveFrom: { lte: asOfDate } }
          ],
          AND: [
            {
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: asOfDate } }
              ]
            }
          ]
        }
      });

      if (policies.length === 0) {
        return {
          success: true,
          message: "No applicable policies found",
          results,
        };
      }

      // Get overdue fees
      const overdueFees = await this.getOverdueFees({
        ...filters,
        asOfDate,
        excludeProcessed: true,
      });

      for (const overdueInfo of overdueFees) {
        results.processed++;

        try {
          // Find applicable policy for this fee
          const applicablePolicy = policies.find(policy => {
            // Check if policy applies to this fee type, program, or class
            const feeTypeMatch = policy.applicableToFeeTypes.length === 0 ||
              policy.applicableToFeeTypes.includes('ALL');
            const programMatch = policy.applicableToPrograms.length === 0 ||
              policy.applicableToPrograms.includes(overdueInfo.programName);
            const classMatch = policy.applicableToClasses.length === 0 ||
              policy.applicableToClasses.includes(overdueInfo.className);

            return feeTypeMatch && programMatch && classMatch;
          });

          if (!applicablePolicy) {
            results.skipped++;
            results.details.push({
              enrollmentFeeId: overdueInfo.enrollmentFeeId,
              studentName: overdueInfo.studentName,
              action: 'SKIPPED',
              reason: 'No applicable policy found',
            });
            continue;
          }

          // Calculate late fee
          const calculation = await this.calculateLateFee(
            overdueInfo.enrollmentFeeId,
            applicablePolicy.id,
            asOfDate
          );

          if (calculation.amount <= 0) {
            results.skipped++;
            results.details.push({
              enrollmentFeeId: overdueInfo.enrollmentFeeId,
              studentName: overdueInfo.studentName,
              action: 'SKIPPED',
              reason: 'No late fee amount calculated',
            });
            continue;
          }

          // Apply late fee (if not dry run)
          if (!filters?.dryRun) {
            await this.applyLateFee({
              enrollmentFeeId: overdueInfo.enrollmentFeeId,
              policyId: applicablePolicy.id,
              daysOverdue: overdueInfo.daysOverdue,
              calculatedAmount: calculation.amount,
              appliedAmount: calculation.amount,
              compoundingPeriods: calculation.compoundingPeriods,
              dueDate: overdueInfo.dueDate,
              calculationDate: asOfDate,
              reason: 'Automatic late fee application',
              createdById: 'system', // System user ID
            });
          }

          results.applied++;
          results.details.push({
            enrollmentFeeId: overdueInfo.enrollmentFeeId,
            studentName: overdueInfo.studentName,
            action: 'APPLIED',
            amount: calculation.amount,
          });

        } catch (error) {
          results.errors++;
          results.details.push({
            enrollmentFeeId: overdueInfo.enrollmentFeeId,
            studentName: overdueInfo.studentName,
            action: 'ERROR',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        message: `Processed ${results.processed} overdue fees. Applied: ${results.applied}, Skipped: ${results.skipped}, Errors: ${results.errors}`,
        results,
      };

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process automatic late fees",
        cause: error,
      });
    }
  }

  /**
   * Get late fee applications with filters
   */
  async getLateFeeApplications(filters?: {
    enrollmentFeeId?: string;
    policyId?: string;
    status?: LateFeeStatus;
    studentId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const applications = await this.prisma.lateFeeApplication.findMany({
        where: {
          ...(filters?.enrollmentFeeId && { enrollmentFeeId: filters.enrollmentFeeId }),
          ...(filters?.policyId && { policyId: filters.policyId }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.studentId && {
            enrollmentFee: {
              enrollment: {
                student: {
                  user: { id: filters.studentId }
                }
              }
            }
          }),
          ...(filters?.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters?.dateTo && { createdAt: { lte: filters.dateTo } }),
        },
        include: {
          enrollmentFee: {
            include: {
              enrollment: {
                include: {
                  student: {
                    include: {
                      user: { select: { id: true, name: true, email: true } }
                    }
                  },
                  class: {
                    include: {
                      programCampus: {
                        include: {
                          program: { select: { id: true, name: true } },
                          campus: { select: { id: true, name: true } }
                        }
                      }
                    }
                  }
                }
              },
              feeStructure: { select: { id: true, name: true } }
            }
          },
          policy: { select: { id: true, name: true, calculationType: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          waivers: {
            where: { status: { in: [WaiverStatus.PENDING, WaiverStatus.APPROVED] } }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      const total = await this.prisma.lateFeeApplication.count({
        where: {
          ...(filters?.enrollmentFeeId && { enrollmentFeeId: filters.enrollmentFeeId }),
          ...(filters?.policyId && { policyId: filters.policyId }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.studentId && {
            enrollmentFee: {
              enrollment: {
                student: {
                  user: { id: filters.studentId }
                }
              }
            }
          }),
          ...(filters?.dateFrom && { createdAt: { gte: filters.dateFrom } }),
          ...(filters?.dateTo && { createdAt: { lte: filters.dateTo } }),
        }
      });

      return {
        success: true,
        applications,
        pagination: {
          total,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          hasMore: (filters?.offset || 0) + applications.length < total,
        }
      };

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch late fee applications",
        cause: error,
      });
    }
  }

  // ========================================================================
  // WAIVER MANAGEMENT
  // ========================================================================

  /**
   * Create a waiver request for a late fee
   */
  async createWaiverRequest(data: z.infer<typeof createWaiverRequest>) {
    try {
      const waiver = await this.prisma.lateFeeWaiver.create({
        data: {
          ...data,
          supportingDocuments: data.supportingDocuments ? JSON.stringify(data.supportingDocuments) : undefined,
          status: WaiverStatus.PENDING,
        },
        include: {
          lateFeeApplication: {
            include: {
              enrollmentFee: {
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
              },
              policy: { select: { id: true, name: true } }
            }
          },
          requestedByUser: { select: { id: true, name: true, email: true } }
        }
      });

      // Create history record
      await this.prisma.lateFeeHistory.create({
        data: {
          enrollmentFeeId: data.enrollmentFeeId,
          lateFeeApplicationId: data.lateFeeApplicationId,
          waiverRequestId: waiver.id,
          action: 'WAIVER_REQUESTED',
          amount: data.requestedAmount,
          performedBy: data.requestedBy,
          systemGenerated: false,
          details: {
            reason: data.reason,
            justification: data.justification,
          }
        }
      });

      return {
        success: true,
        waiver,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create waiver request",
        cause: error,
      });
    }
  }

  /**
   * Approve or reject a waiver request
   */
  async processWaiverRequest(
    waiverId: string,
    action: 'APPROVE' | 'REJECT',
    data: {
      approvedAmount?: number;
      rejectionReason?: string;
      reviewedBy: string;
    }
  ) {
    try {
      const waiver = await this.prisma.lateFeeWaiver.findUnique({
        where: { id: waiverId },
        include: {
          lateFeeApplication: true
        }
      });

      if (!waiver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Waiver request not found",
        });
      }

      if (waiver.status !== WaiverStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Waiver request has already been processed",
        });
      }

      const updateData: any = {
        status: action === 'APPROVE' ? WaiverStatus.APPROVED : WaiverStatus.REJECTED,
        reviewedBy: data.reviewedBy,
        reviewedDate: new Date(),
      };

      if (action === 'APPROVE') {
        updateData.approvedBy = data.reviewedBy;
        updateData.approvedDate = new Date();
        updateData.approvedAmount = data.approvedAmount || waiver.requestedAmount;

        // Update the late fee application with waiver information
        await this.prisma.lateFeeApplication.update({
          where: { id: waiver.lateFeeApplicationId },
          data: {
            waivedAmount: updateData.approvedAmount,
            waivedBy: data.reviewedBy,
            waivedDate: new Date(),
            waiverReason: waiver.reason,
            status: updateData.approvedAmount >= waiver.lateFeeApplication.appliedAmount
              ? LateFeeStatus.WAIVED
              : LateFeeStatus.PARTIAL_WAIVED,
          }
        });
      } else {
        updateData.rejectionReason = data.rejectionReason;
      }

      const updatedWaiver = await this.prisma.lateFeeWaiver.update({
        where: { id: waiverId },
        data: updateData,
        include: {
          lateFeeApplication: {
            include: {
              enrollmentFee: {
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
              }
            }
          },
          requestedByUser: { select: { id: true, name: true, email: true } },
          reviewedByUser: { select: { id: true, name: true, email: true } },
          approvedByUser: { select: { id: true, name: true, email: true } }
        }
      });

      // Create history record
      await this.prisma.lateFeeHistory.create({
        data: {
          enrollmentFeeId: waiver.enrollmentFeeId,
          lateFeeApplicationId: waiver.lateFeeApplicationId,
          waiverRequestId: waiver.id,
          action: action === 'APPROVE' ? 'WAIVER_APPROVED' : 'WAIVER_REJECTED',
          previousStatus: waiver.status,
          newStatus: updateData.status,
          amount: action === 'APPROVE' ? updateData.approvedAmount : 0,
          performedBy: data.reviewedBy,
          systemGenerated: false,
          details: {
            ...(action === 'APPROVE' && { approvedAmount: updateData.approvedAmount }),
            ...(action === 'REJECT' && { rejectionReason: data.rejectionReason }),
          }
        }
      });

      return {
        success: true,
        waiver: updatedWaiver,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process waiver request",
        cause: error,
      });
    }
  }

  /**
   * Get waiver requests with filters
   */
  async getWaiverRequests(filters?: {
    status?: WaiverStatus;
    requestedBy?: string;
    reviewedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const waivers = await this.prisma.lateFeeWaiver.findMany({
        where: {
          ...(filters?.status && { status: filters.status }),
          ...(filters?.requestedBy && { requestedBy: filters.requestedBy }),
          ...(filters?.reviewedBy && { reviewedBy: filters.reviewedBy }),
          ...(filters?.dateFrom && { requestedDate: { gte: filters.dateFrom } }),
          ...(filters?.dateTo && { requestedDate: { lte: filters.dateTo } }),
        },
        include: {
          lateFeeApplication: {
            include: {
              enrollmentFee: {
                include: {
                  enrollment: {
                    include: {
                      student: {
                        include: {
                          user: { select: { id: true, name: true, email: true } }
                        }
                      },
                      class: {
                        include: {
                          programCampus: {
                            include: {
                              program: { select: { id: true, name: true } },
                              campus: { select: { id: true, name: true } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              policy: { select: { id: true, name: true } }
            }
          },
          requestedByUser: { select: { id: true, name: true, email: true } },
          reviewedByUser: { select: { id: true, name: true, email: true } },
          approvedByUser: { select: { id: true, name: true, email: true } }
        },
        orderBy: { requestedDate: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      const total = await this.prisma.lateFeeWaiver.count({
        where: {
          ...(filters?.status && { status: filters.status }),
          ...(filters?.requestedBy && { requestedBy: filters.requestedBy }),
          ...(filters?.reviewedBy && { reviewedBy: filters.reviewedBy }),
          ...(filters?.dateFrom && { requestedDate: { gte: filters.dateFrom } }),
          ...(filters?.dateTo && { requestedDate: { lte: filters.dateTo } }),
        }
      });

      return {
        success: true,
        waivers,
        pagination: {
          total,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0,
          hasMore: (filters?.offset || 0) + waivers.length < total,
        }
      };

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch waiver requests",
        cause: error,
      });
    }
  }

  // ========================================================================
  // REPORTING AND ANALYTICS
  // ========================================================================

  /**
   * Get late fee analytics and statistics
   */
  async getLateFeeAnalytics(filters?: {
    institutionId?: string;
    campusId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    try {
      const dateFrom = filters?.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const dateTo = filters?.dateTo || new Date();

      // Get basic statistics
      const [
        totalApplications,
        totalAmount,
        waivedApplications,
        waivedAmount,
        paidApplications,
        paidAmount,
        pendingApplications,
        pendingAmount
      ] = await Promise.all([
        this.prisma.lateFeeApplication.count({
          where: {
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          }
        }),
        this.prisma.lateFeeApplication.aggregate({
          where: {
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          },
          _sum: { appliedAmount: true }
        }),
        this.prisma.lateFeeApplication.count({
          where: {
            status: { in: [LateFeeStatus.WAIVED, LateFeeStatus.PARTIAL_WAIVED] },
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          }
        }),
        this.prisma.lateFeeApplication.aggregate({
          where: {
            status: { in: [LateFeeStatus.WAIVED, LateFeeStatus.PARTIAL_WAIVED] },
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          },
          _sum: { waivedAmount: true }
        }),
        this.prisma.lateFeeApplication.count({
          where: {
            status: LateFeeStatus.PAID,
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          }
        }),
        this.prisma.lateFeeApplication.aggregate({
          where: {
            status: LateFeeStatus.PAID,
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          },
          _sum: { appliedAmount: true }
        }),
        this.prisma.lateFeeApplication.count({
          where: {
            status: { in: [LateFeeStatus.PENDING, LateFeeStatus.APPLIED] },
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          }
        }),
        this.prisma.lateFeeApplication.aggregate({
          where: {
            status: { in: [LateFeeStatus.PENDING, LateFeeStatus.APPLIED] },
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(filters?.institutionId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: {
                      campus: { institutionId: filters.institutionId }
                    }
                  }
                }
              }
            }),
            ...(filters?.campusId && {
              enrollmentFee: {
                enrollment: {
                  class: {
                    programCampus: { campusId: filters.campusId }
                  }
                }
              }
            }),
          },
          _sum: { appliedAmount: true }
        }),
      ]);

      return {
        success: true,
        analytics: {
          summary: {
            totalApplications,
            totalAmount: totalAmount._sum?.appliedAmount || 0,
            waivedApplications,
            waivedAmount: waivedAmount._sum?.waivedAmount || 0,
            paidApplications,
            paidAmount: paidAmount._sum?.appliedAmount || 0,
            pendingApplications,
            pendingAmount: pendingAmount._sum?.appliedAmount || 0,
            collectionRate: totalApplications > 0
              ? ((paidApplications / totalApplications) * 100).toFixed(2)
              : '0.00',
            waiverRate: totalApplications > 0
              ? ((waivedApplications / totalApplications) * 100).toFixed(2)
              : '0.00',
          },
          period: {
            from: dateFrom,
            to: dateTo,
          }
        }
      };

    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch late fee analytics",
        cause: error,
      });
    }
  }
}
