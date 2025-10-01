import { prisma } from "@/server/db";
import { EnrollmentHistoryService } from "./enrollment-history.service";
import { handleError } from "../utils/error-handler";
import { PaymentMethod } from "@/types/payment-methods";
import { z } from "zod";
import { PaymentStatusSyncService } from "./payment-status-sync.service";
import { EnhancedFeeIntegrationService } from "./enhanced-fee-integration.service";

// Define PaymentStatusType enum since it's not exported from @prisma/client yet
type PaymentStatusType = "PAID" | "PENDING" | "PARTIAL" | "WAIVED" | "OVERDUE";

// Define FeeComponent type for fee structure components
type FeeComponent = {
  name: string;
  type: string;
  amount: number;
  description?: string;
};

// Create an instance of the EnrollmentHistoryService
const historyService = new EnrollmentHistoryService();

// Payment method schema
export const paymentMethodSchema = z.nativeEnum(PaymentMethod);

// Input schemas
export const createFeeStructureSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  programCampusId: z.string(),
  academicCycleId: z.string().optional(),
  termId: z.string().optional(),
  feeComponents: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      amount: z.number().positive(),
      description: z.string().optional(),
      isRecurring: z.boolean().default(false),
      recurringInterval: z.string().optional(),
    })
  ),
  isRecurring: z.boolean().default(false),
  recurringInterval: z.string().optional(),
  createdById: z.string(),
});

export const updateFeeStructureSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  programCampusId: z.string().optional(),
  academicCycleId: z.string().optional(),
  termId: z.string().optional(),
  feeComponents: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        amount: z.number().positive(),
        description: z.string().optional(),
        isRecurring: z.boolean().default(false),
        recurringInterval: z.string().optional(),
      })
    )
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().optional(),
  updatedById: z.string(),
});

export const createEnrollmentFeeSchema = z.object({
  enrollmentId: z.string(),
  feeStructureId: z.string(),
  dueDate: z.date().optional(),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL", "WAIVED"]).default("PENDING"),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  discounts: z.array(z.object({
    discountTypeId: z.string(),
    amount: z.number().min(0),
    reason: z.string().optional(),
  })).optional(),
  createdById: z.string().optional(), // Made optional since it's added by tRPC procedure
});

export const updateEnrollmentFeeSchema = z.object({
  id: z.string(),
  feeStructureId: z.string().optional(),
  dueDate: z.date().optional(),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL", "WAIVED"]).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  updatedById: z.string(),
});

export const addDiscountSchema = z.object({
  enrollmentFeeId: z.string(),
  discountTypeId: z.string(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  approvedById: z.string().optional(),
  createdById: z.string(),
});

export const addChargeSchema = z.object({
  enrollmentFeeId: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  dueDate: z.date().optional(),
  createdById: z.string(),
});

export const addArrearSchema = z.object({
  enrollmentFeeId: z.string(),
  previousFeeId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.date().optional(),
  reason: z.string(),
  createdById: z.string(),
});

export const addTransactionSchema = z.object({
  enrollmentFeeId: z.string(),
  challanId: z.string().optional(),
  amount: z.number().positive(),
  date: z.date().default(() => new Date()),
  method: paymentMethodSchema.default(PaymentMethod.ON_CAMPUS_COUNTER),
  reference: z.string().optional(),
  notes: z.string().optional(),
  createdById: z.string(),
});

// Types
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;
export type CreateEnrollmentFeeInput = z.infer<typeof createEnrollmentFeeSchema>;
export type UpdateEnrollmentFeeInput = z.infer<typeof updateEnrollmentFeeSchema>;
export type AddDiscountInput = z.infer<typeof addDiscountSchema>;
export type AddChargeInput = z.infer<typeof addChargeSchema>;
export type AddArrearInput = z.infer<typeof addArrearSchema>;
export type AddTransactionInput = z.infer<typeof addTransactionSchema>;

export class FeeService {
  private prisma: typeof prisma;
  private paymentStatusSyncService: PaymentStatusSyncService;
  private feeIntegrationService: EnhancedFeeIntegrationService;

  constructor(config?: { prisma?: typeof prisma }) {
    this.prisma = config?.prisma || prisma;

    // Initialize enhanced services
    this.paymentStatusSyncService = new PaymentStatusSyncService({
      prisma: this.prisma,
      enableOptimisticLocking: true,
      enableConflictResolution: true,
      maxRetries: 3
    });

    this.feeIntegrationService = new EnhancedFeeIntegrationService({
      prisma: this.prisma,
      enableAutomaticSync: true,
      enableAuditTrail: true
    });
  }

  // Fee Analytics Methods
  /**
   * Gets comprehensive fee collection statistics with trends and analytics
   * @returns Enhanced fee collection statistics
   */
  async getFeeCollectionStats() {
    try {
      // Get total fee collected
      const totalCollected = await this.prisma.feeTransaction.aggregate({
        _sum: {
          amount: true,
        },
      });

      // Get total pending fees
      const enrollmentFees = await this.prisma.enrollmentFee.findMany({
        where: {
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

      let pendingFees = 0;
      for (const fee of enrollmentFees) {
        const paidAmount = fee.transactions.reduce((sum, t) => sum + t.amount, 0);
        pendingFees += fee.finalAmount - paidAmount;
      }

      // Get student fee statistics
      const totalStudents = await this.prisma.studentEnrollment.count({
        where: {
          status: "ACTIVE",
        },
      });

      // Count students with fees - using a different approach without distinct
      // First get all enrollment IDs that have fees
      const enrollmentsWithFees = await this.prisma.enrollmentFee.findMany({
        where: {
          enrollment: {
            status: "ACTIVE",
          },
        },
        select: {
          enrollmentId: true,
        },
      });

      // Count unique enrollment IDs
      const uniqueEnrollmentIds = new Set(enrollmentsWithFees.map(e => e.enrollmentId));
      const studentsWithFees = uniqueEnrollmentIds.size;

      const studentsWithoutFees = totalStudents - studentsWithFees;

      // Get fee structures count
      const feeStructures = await this.prisma.feeStructure.count({
        where: {
          status: "ACTIVE",
        },
      });

      // Get discount types count
      const discountTypes = await this.prisma.discountType.count({
        where: {
          status: "ACTIVE",
        },
      });

      // Get recent transactions with error handling
      let recentTransactions: any[] = [];
      try {
        recentTransactions = await this.prisma.feeTransaction.findMany({
          take: 5,
          orderBy: {
            date: "desc",
          },
          include: {
            enrollmentFee: {
              include: {
                enrollment: {
                  include: {
                    student: {
                      include: {
                        user: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                    class: {
                      include: {
                        courseCampus: {
                          include: {
                            campus: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      } catch (error) {
        console.error('Error fetching recent transactions:', error);
        // Continue with empty transactions array
      }

      // Map transactions with safe access to nested properties
      const mappedTransactions = recentTransactions.map((t: any) => {
        try {
          return {
            id: t.id || 'unknown-id',
            amount: t.amount || 0,
            date: t.date || new Date(),
            studentName: t.enrollmentFee?.enrollment?.student?.user?.name || 'Unknown Student',
            studentId: t.enrollmentFee?.enrollment?.studentId || 'Unknown',
            campusName: t.enrollmentFee?.enrollment?.class?.courseCampus?.campus?.name || 'Unknown Campus',
            campusId: t.enrollmentFee?.enrollment?.class?.courseCampus?.campusId || 'Unknown',
          };
        } catch (error) {
          // If any property access fails, return a fallback object
          return {
            id: typeof t.id === 'string' ? t.id : 'unknown-id',
            amount: typeof t.amount === 'number' ? t.amount : 0,
            date: t.date instanceof Date ? t.date : new Date(),
            studentName: 'Unknown Student',
            studentId: 'Unknown',
            campusName: 'Unknown Campus',
            campusId: 'Unknown',
          };
        }
      });

      // Get collection trends for the last 12 months
      const collectionTrends = await this.getCollectionTrends();

      // Get payment method distribution
      const paymentMethods = await this.getPaymentMethodDistribution();

      // Calculate collection rate
      const totalAmount = (totalCollected._sum.amount || 0) + pendingFees;
      const collectionRate = totalAmount > 0 ? ((totalCollected._sum.amount || 0) / totalAmount) * 100 : 0;

      // Get overdue fees (fees past due date)
      const overdueFees = await this.getOverdueFees();

      // Get monthly collection comparison
      const monthlyComparison = await this.getMonthlyCollectionComparison();

      // Get total transaction count
      const totalTransactions = await this.prisma.feeTransaction.count();

      return {
        totalCollected: totalCollected._sum.amount || 0,
        pendingFees,
        overdueFees,
        totalStudents,
        studentsWithFees,
        studentsWithoutFees,
        feeStructures,
        discountTypes,
        collectionRate: Math.round(collectionRate * 100) / 100,
        totalTransactions,
        recentTransactions: mappedTransactions,
        collectionTrends,
        paymentMethods,
        monthlyComparison,
      };
    } catch (error) {
      console.error('Error getting fee collection stats:', error);
      throw new Error(`Failed to get fee collection statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets collection trends for the last 12 months
   */
  private async getCollectionTrends() {
    const trends: Array<{ month: string; amount: number }> = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthlyCollection = await this.prisma.feeTransaction.aggregate({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      trends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthlyCollection._sum.amount || 0,
      });
    }

    return trends;
  }

  /**
   * Gets payment method distribution
   */
  private async getPaymentMethodDistribution() {
    const distribution = await this.prisma.feeTransaction.groupBy({
      by: ['method'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return distribution.map(item => ({
      method: item.method,
      amount: item._sum.amount || 0,
      count: item._count.id || 0,
    }));
  }

  /**
   * Gets overdue fees amount
   */
  private async getOverdueFees() {
    const now = new Date();
    const overdueEnrollmentFees = await this.prisma.enrollmentFee.findMany({
      where: {
        paymentStatus: {
          in: ["PENDING", "PARTIAL"],
        },
        dueDate: {
          lt: now,
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

    let overdueAmount = 0;
    for (const fee of overdueEnrollmentFees) {
      const paidAmount = fee.transactions.reduce((sum, t) => sum + t.amount, 0);
      overdueAmount += fee.finalAmount - paidAmount;
    }

    return overdueAmount;
  }

  /**
   * Gets monthly collection comparison (current vs previous month)
   */
  private async getMonthlyCollectionComparison() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonth, previousMonth] = await Promise.all([
      this.prisma.feeTransaction.aggregate({
        where: {
          date: {
            gte: currentMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.feeTransaction.aggregate({
        where: {
          date: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const currentAmount = currentMonth._sum.amount || 0;
    const previousAmount = previousMonth._sum.amount || 0;
    const percentageChange = previousAmount > 0
      ? ((currentAmount - previousAmount) / previousAmount) * 100
      : 0;

    return {
      currentMonth: currentAmount,
      previousMonth: previousAmount,
      percentageChange: Math.round(percentageChange * 100) / 100,
      trend: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'stable',
    };
  }

  // Fee Structure Methods
  /**
   * Creates a new fee structure
   * @param input The fee structure data
   * @returns The created fee structure
   */
  async createFeeStructure(input: CreateFeeStructureInput) {
    const { feeComponents, programCampusId, createdById, ...restData } = input;

    console.log('DEBUG FeeService.createFeeStructure input snapshot:', {
      hasCreatedById: Boolean(createdById),
      programCampusId,
      name: restData?.name,
      componentsCount: Array.isArray(feeComponents) ? feeComponents.length : 0,
    });

    // Ensure name is provided
    if (!restData.name) {
      throw new Error('Fee structure name is required');
    }

    // Extract name to ensure it's treated as a required field
    const { name, ...otherData } = restData;

    try {
      const result = await this.prisma.feeStructure.create({
        data: {
          name, // Explicitly provide name as a required field
          ...otherData,
          feeComponents: feeComponents as any,
          programCampus: {
            connect: { id: programCampusId }
          },
          createdBy: { connect: { id: createdById } }
        },
      });
      console.log('SUCCESS FeeService.createFeeStructure created id:', result.id);
      return result;
    } catch (error) {
      console.error('ERROR FeeService.createFeeStructure failed:', error);
      handleError(error, "Failed to create fee structure");
    }
  }

  /**
   * Gets all fee structures with optional filtering
   * @param filters Optional filters for campus, program, academic cycle, and status
   * @returns Array of fee structures
   */
  async getAllFeeStructures(filters: {
    campusId?: string;
    programId?: string;
    academicCycleId?: string;
    status?: string;
  } = {}) {
    const where: any = {};

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.academicCycleId && filters.academicCycleId !== 'all') {
      where.academicCycleId = filters.academicCycleId;
    }

    // For campus and program filtering, we need to join with ProgramCampus
    if (filters.campusId && filters.campusId !== 'all') {
      where.programCampus = {
        campusId: filters.campusId
      };
    }

    if (filters.programId && filters.programId !== 'all') {
      where.programCampus = {
        ...where.programCampus,
        programId: filters.programId
      };
    }

    return this.prisma.feeStructure.findMany({
      where,
      include: {
        programCampus: {
          include: {
            program: {
              select: {
                id: true,
                name: true,
              }
            },
            campus: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets a fee structure by ID
   * @param id The fee structure ID
   * @returns The fee structure or null if not found
   */
  async getFeeStructure(id: string) {
    return this.prisma.feeStructure.findUnique({
      where: { id },
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true
          }
        }
      }
    });
  }

  async getFeeStructuresByProgramCampus(programCampusId: string) {
    console.log('DEBUG getFeeStructuresByProgramCampus:', { programCampusId });

    // First check if any fee structures exist for this programCampusId (regardless of status)
    const allFeeStructures = await this.prisma.feeStructure.findMany({
      where: { programCampusId },
      select: { id: true, name: true, status: true }
    });
    console.log('DEBUG all fee structures for programCampusId:', allFeeStructures);

    const activeFeeStructures = await this.prisma.feeStructure.findMany({
      where: {
        programCampusId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    console.log('DEBUG active fee structures:', activeFeeStructures.length);
    return activeFeeStructures;
  }

  async updateFeeStructure(input: UpdateFeeStructureInput) {
    const { id, feeComponents, ...data } = input;

    return this.prisma.feeStructure.update({
      where: { id },
      data: {
        ...data,
        ...(feeComponents && { feeComponents: feeComponents as any }),
      },
    });
  }

  async deleteFeeStructure(id: string) {
    return this.prisma.feeStructure.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  // Enrollment Fee Methods
  /**
   * Creates a new enrollment fee record
   * @param input The enrollment fee data
   * @returns The created enrollment fee
   * @throws Error if fee structure is not found or if there's an issue creating the fee
   */
  async createEnrollmentFee(input: CreateEnrollmentFeeInput) {
    return this.assignFeeToEnrollment(input, false);
  }

  /**
   * Assigns additional fee to enrollment (allows multiple different fee structures)
   * @param input The enrollment fee data
   * @returns The created enrollment fee
   */
  async assignAdditionalFee(input: CreateEnrollmentFeeInput) {
    return this.assignFeeToEnrollment(input, true);
  }

  /**
   * Internal method to assign fee to enrollment
   * @param input The enrollment fee data
   * @param allowAdditional Whether to allow additional fees of the same structure
   * @returns The created enrollment fee
   */
  private async assignFeeToEnrollment(input: CreateEnrollmentFeeInput, allowAdditional: boolean = false) {
    const { enrollmentId, feeStructureId, ...data } = input;

    try {
      // Validate enrollment ID
      if (!enrollmentId) {
        throw new Error('Enrollment ID is required');
      }

      // Ensure enrollment exists (prevents relation errors)
      const enrollment = await this.prisma.studentEnrollment.findUnique({
        where: { id: enrollmentId },
      });
      if (!enrollment) {
        throw new Error(`Enrollment with ID ${enrollmentId} not found`);
      }

      // Check for duplicate fee structure assignment (only if not allowing additional fees)
      if (!allowAdditional) {
        const existingFee = await this.prisma.enrollmentFee.findFirst({
          where: {
            enrollmentId,
            feeStructureId,
          },
          include: {
            feeStructure: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        });

        if (existingFee) {
          // If it's the same fee structure, offer to update instead
          throw new Error(
            `Fee structure "${existingFee.feeStructure?.name || 'Unknown'}" is already assigned to this enrollment. ` +
            `You can either update the existing fee assignment or choose a different fee structure. ` +
            `If you need to assign additional charges, please use the "Additional Charges" option instead.`
          );
        }
      }

      // Get fee structure
      const feeStructure = await this.prisma.feeStructure.findUnique({
        where: { id: feeStructureId },
      });

      if (!feeStructure) {
        throw new Error(`Fee structure with ID ${feeStructureId} not found`);
      }

      // Calculate base amount from fee components
      const components = feeStructure.feeComponents as FeeComponent[];
      if (!components || !Array.isArray(components) || components.length === 0) {
        throw new Error(`Fee structure ${feeStructureId} has no valid fee components`);
      }

      const baseAmount = components.reduce((sum, component) => sum + component.amount, 0);
      if (baseAmount <= 0) {
        throw new Error(`Fee structure ${feeStructureId} has an invalid base amount: ${baseAmount}`);
      }

      // Create enrollment fee
      const { createdById, ...restData } = data;

      // Extract paymentStatus from restData to avoid duplication
      const { paymentStatus: paymentStatusFromRest, ...otherData } = restData;
      const paymentStatus = paymentStatusFromRest || 'PENDING';

      // Create the enrollment fee with proper type handling
      const enrollmentFeeData: any = {
        enrollment: {
          connect: { id: enrollmentId }
        },
        feeStructure: {
          connect: { id: feeStructureId }
        },
        baseAmount,
        discountedAmount: baseAmount, // Initially no discounts
        finalAmount: baseAmount, // Initially no additional charges or arrears
        paymentStatus, // Ensure this required field is always provided
        ...otherData,
      };

      // Only add createdBy if provided
      if (createdById) {
        enrollmentFeeData.createdBy = {
          connect: { id: createdById }
        };
      }

      const enrollmentFee = await this.prisma.enrollmentFee.create({
        data: enrollmentFeeData,
      });

      // Handle discounts if provided
      let totalDiscountAmount = 0;
      if (input.discounts && input.discounts.length > 0) {
        for (const discount of input.discounts) {
          // Validate discount type exists
          const discountType = await this.prisma.discountType.findUnique({
            where: { id: discount.discountTypeId }
          });

          if (!discountType) {
            throw new Error(`Discount type with ID ${discount.discountTypeId} not found`);
          }

          // Create discount
          const discountData: any = {
            enrollmentFee: {
              connect: { id: enrollmentFee.id }
            },
            discountType: {
              connect: { id: discount.discountTypeId }
            },
            amount: discount.amount,
            reason: discount.reason,
          };

          // Only add createdBy if provided
          if (createdById) {
            discountData.createdBy = {
              connect: { id: createdById }
            };
          }

          await this.prisma.feeDiscount.create({
            data: discountData,
          });

          totalDiscountAmount += discount.amount;
        }

        // Update enrollment fee with discount calculations
        const discountedAmount = baseAmount - totalDiscountAmount;
        await this.prisma.enrollmentFee.update({
          where: { id: enrollmentFee.id },
          data: {
            discountedAmount,
            finalAmount: discountedAmount, // Will be updated if there are charges/arrears
          },
        });
      }

      // Create history entry
      await historyService.createHistoryEntry({
        enrollmentId,
        action: "FEE_ASSIGNED",
        details: {
          feeId: enrollmentFee.id,
          feeStructureId,
          baseAmount,
          totalDiscountAmount,
          finalAmount: baseAmount - totalDiscountAmount,
        },
        createdById: input.createdById || "",
      });

      return enrollmentFee;
    } catch (error) {
      // Enhance error message with context
      if (error instanceof Error) {
        throw new Error(`Failed to create enrollment fee: ${error.message}`);
      }
      throw new Error(`Failed to create enrollment fee: Unknown error`);
    }
  }

  /**
   * Gets enrollment fees by enrollment ID (now supports multiple fee structures)
   * @param enrollmentId The enrollment ID
   * @returns Array of enrollment fees for the enrollment
   */
  async getEnrollmentFeesByEnrollment(enrollmentId: string) {
    return this.prisma.enrollmentFee.findMany({
      where: { enrollmentId },
      include: {
        feeStructure: true,
        discounts: {
          include: {
            discountType: true,
          },
        },
        additionalCharges: true,
        arrears: true,
        challans: {
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          orderBy: { date: "desc" },
        },
        lateFeeApplications: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets enrollment fee by enrollment ID (legacy method for backward compatibility)
   * @param enrollmentId The enrollment ID
   * @returns The first enrollment fee or null if not found
   */
  async getEnrollmentFeeByEnrollment(enrollmentId: string) {
    const fees = await this.getEnrollmentFeesByEnrollment(enrollmentId);
    return fees.length > 0 ? fees[0] : null;
  }

  /**
   * Get available fee structures for enrollment (excluding already assigned ones)
   * @param enrollmentId The enrollment ID
   * @returns Array of available fee structures
   */
  async getAvailableFeeStructuresForEnrollment(enrollmentId: string) {
    console.log('DEBUG getAvailableFeeStructuresForEnrollment:', { enrollmentId });

    // Get the enrollment to find the program campus
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true,
              },
            },
            courseCampus: {
              include: {
                course: true,
                campus: true,
                programCampus: {
                  include: {
                    program: true,
                    campus: true,
                  },
                },
              },
            },
          },
        },
        fees: {
          select: { feeStructureId: true }
        }
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Get the program campus ID - try direct relationship first, then through courseCampus
    const programCampusId = enrollment.class?.programCampusId || enrollment.class?.courseCampus?.programCampusId;
    const programCampus = enrollment.class?.programCampus || enrollment.class?.courseCampus?.programCampus;

    console.log('DEBUG enrollment found:', {
      enrollmentId: enrollment.id,
      classId: enrollment.class?.id,
      directProgramCampusId: enrollment.class?.programCampusId,
      courseCampusProgramCampusId: enrollment.class?.courseCampus?.programCampusId,
      finalProgramCampusId: programCampusId,
      programName: programCampus?.program?.name,
      campusName: programCampus?.campus?.name,
      existingFeesCount: enrollment.fees?.length || 0
    });

    // Get already assigned fee structure IDs to exclude them
    const assignedFeeStructureIds = enrollment.fees?.map(fee => fee.feeStructureId) || [];
    console.log('DEBUG assignedFeeStructureIds:', assignedFeeStructureIds);

    if (!programCampusId) {
      console.log('DEBUG: No programCampusId found, returning empty array');
      return [];
    }

    // Find fee structures for this program campus, excluding already assigned ones
    const whereClause: any = {
      status: 'ACTIVE',
      programCampusId: programCampusId,
    };

    // Exclude already assigned fee structures
    if (assignedFeeStructureIds.length > 0) {
      whereClause.id = {
        notIn: assignedFeeStructureIds
      };
    }

    console.log('DEBUG whereClause:', whereClause);

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log('DEBUG found fee structures:', {
      count: feeStructures.length,
      structures: feeStructures.map(fs => ({
        id: fs.id,
        name: fs.name,
        programCampusId: fs.programCampusId,
        status: fs.status
      }))
    });

    return feeStructures;
  }

  async updateEnrollmentFee(input: UpdateEnrollmentFeeInput) {
    const { id, feeStructureId, ...data } = input;

    // Get current enrollment fee
    const currentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id },
      include: {
        discounts: true,
        additionalCharges: true,
        arrears: true,
      },
    });

    if (!currentFee) {
      throw new Error("Enrollment fee not found");
    }

    let baseAmount = currentFee.baseAmount;
    let discountedAmount = currentFee.discountedAmount;
    let finalAmount = currentFee.finalAmount;

    // If fee structure is changing, recalculate base amount
    if (feeStructureId && feeStructureId !== currentFee.feeStructureId) {
      const feeStructure = await this.prisma.feeStructure.findUnique({
        where: { id: feeStructureId },
      });

      if (!feeStructure) {
        throw new Error("Fee structure not found");
      }

      // Calculate new base amount
      const components = feeStructure.feeComponents as any[];
      baseAmount = components.reduce((sum, component) => sum + component.amount, 0);

      // Recalculate discounted amount
      const totalDiscounts = currentFee.discounts.reduce((sum: number, d: any) => sum + d.amount, 0);
      discountedAmount = baseAmount - totalDiscounts;

      // Recalculate final amount
      const totalCharges = currentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
      const totalArrears = currentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);
      finalAmount = discountedAmount + totalCharges + totalArrears;
    }

    // Update enrollment fee
    const enrollmentFee = await this.prisma.enrollmentFee.update({
      where: { id },
      data: {
        ...(feeStructureId && { feeStructureId }),
        ...(feeStructureId && { baseAmount }),
        ...(feeStructureId && { discountedAmount }),
        ...(feeStructureId && { finalAmount }),
        ...data,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: currentFee.enrollmentId,
      action: "FEE_UPDATED",
      details: {
        feeId: id,
        ...(feeStructureId && { feeStructureId, oldFeeStructureId: currentFee.feeStructureId }),
        ...(feeStructureId && { baseAmount, oldBaseAmount: currentFee.baseAmount }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus, oldPaymentStatus: currentFee.paymentStatus }),
      },
      createdById: input.updatedById || "",
    });

    return enrollmentFee;
  }

  // Discount Methods
  /**
   * Adds a discount to an enrollment fee
   * @param input The discount data
   * @returns The created discount
   * @throws Error if enrollment fee or discount type is not found, or if there's an issue adding the discount
   */
  async addDiscount(input: AddDiscountInput) {
    const { enrollmentFeeId, discountTypeId, amount, ...data } = input;

    try {
      // Validate input
      if (!enrollmentFeeId) {
        throw new Error('Enrollment fee ID is required');
      }

      if (!discountTypeId) {
        throw new Error('Discount type ID is required');
      }

      if (amount <= 0) {
        throw new Error('Discount amount must be greater than zero');
      }

      // Get enrollment fee
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          discounts: true,
          additionalCharges: true,
          arrears: true,
        },
      });

      if (!enrollmentFee) {
        throw new Error(`Enrollment fee with ID ${enrollmentFeeId} not found`);
      }

      // Get discount type
      const discountType = await this.prisma.discountType.findUnique({
        where: { id: discountTypeId },
      });

      if (!discountType) {
        throw new Error(`Discount type with ID ${discountTypeId} not found`);
      }

      // Check if discount amount is valid
      if (amount > enrollmentFee.baseAmount) {
        throw new Error(`Discount amount (${amount}) cannot exceed the base fee amount (${enrollmentFee.baseAmount})`);
      }

      // Create discount with proper type handling
      const { createdById, approvedById, ...restData } = data;

      const discountData: any = {
        enrollmentFee: {
          connect: { id: enrollmentFeeId }
        },
        discountType: {
          connect: { id: discountTypeId }
        },
        amount,
        ...restData,
      };

      // Only add createdBy if provided
      if (createdById) {
        discountData.createdBy = {
          connect: { id: createdById }
        };
      }

      // Only add approvedBy if provided
      if (approvedById) {
        discountData.approvedBy = {
          connect: { id: approvedById }
        };
      }

      const discount = await this.prisma.feeDiscount.create({
        data: discountData,
      });

      // Recalculate discounted amount
      const totalDiscounts = enrollmentFee.discounts.reduce((sum: number, d: any) => sum + d.amount, 0) + amount;
      const discountedAmount = enrollmentFee.baseAmount - totalDiscounts;

      // Ensure discounted amount is not negative
      if (discountedAmount < 0) {
        // Rollback the discount creation
        await this.prisma.feeDiscount.delete({
          where: { id: discount.id },
        });
        throw new Error(`Total discounts (${totalDiscounts}) exceed the base amount (${enrollmentFee.baseAmount})`);
      }

      // Recalculate final amount
      const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
      const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);
      const finalAmount = discountedAmount + totalCharges + totalArrears;

      // Update enrollment fee
      await this.prisma.enrollmentFee.update({
        where: { id: enrollmentFeeId },
        data: {
          discountedAmount,
          finalAmount,
        },
      });

      // Create history entry
      await historyService.createHistoryEntry({
        enrollmentId: enrollmentFee.enrollmentId,
        action: "DISCOUNT_ADDED",
        details: {
          feeId: enrollmentFeeId,
          discountId: discount.id,
          discountTypeId,
          amount,
          discountedAmount,
          finalAmount,
        },
        createdById: input.createdById || "",
      });

      return discount;
    } catch (error) {
      // Enhance error message with context
      if (error instanceof Error) {
        throw new Error(`Failed to add discount: ${error.message}`);
      }
      throw new Error(`Failed to add discount: Unknown error`);
    }
  }

  /**
   * Removes a discount from an enrollment fee
   * @param discountId The discount ID to remove
   * @returns The updated enrollment fee
   * @throws Error if discount is not found or if there's an issue removing it
   */
  async removeDiscount(discountId: string) {
    // Get discount
    const discount = await this.prisma.feeDiscount.findUnique({
      where: { id: discountId },
      include: {
        enrollmentFee: {
          include: {
            discounts: true,
            additionalCharges: true,
            arrears: true,
          },
        },
      },
    });

    if (!discount) {
      throw new Error("Discount not found");
    }

    const enrollmentFee = discount.enrollmentFee;

    // Delete discount
    await this.prisma.feeDiscount.delete({
      where: { id: discountId },
    });

    // Recalculate discounted amount
    const remainingDiscounts = enrollmentFee.discounts.filter((d: any) => d.id !== discountId);
    const totalDiscounts = remainingDiscounts.reduce((sum: number, d: any) => sum + d.amount, 0);
    const discountedAmount = enrollmentFee.baseAmount - totalDiscounts;

    // Recalculate final amount
    const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);
    const finalAmount = discountedAmount + totalCharges + totalArrears;

    // Update enrollment fee
    await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFee.id },
      data: {
        discountedAmount,
        finalAmount,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: enrollmentFee.enrollmentId,
      action: "DISCOUNT_REMOVED",
      details: {
        feeId: enrollmentFee.id,
        discountId,
        amount: discount.amount,
        discountedAmount,
        finalAmount,
      },
      createdById: discount.createdById || "", // Using the original creator for simplicity
    });

    return { success: true };
  }

  // Additional Charge Methods
  /**
   * Adds an additional charge to an enrollment fee
   * @param input The additional charge data
   * @returns The created additional charge
   * @throws Error if enrollment fee is not found or if there's an issue adding the charge
   */
  async addAdditionalCharge(input: AddChargeInput) {
    const { enrollmentFeeId, name, amount, ...data } = input;

    // Get enrollment fee
    const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id: enrollmentFeeId },
      include: {
        additionalCharges: true,
        arrears: true,
      },
    });

    if (!enrollmentFee) {
      throw new Error("Enrollment fee not found");
    }

    // Create additional charge with proper type handling
    const { createdById, ...restData } = data;

    const chargeData: any = {
      enrollmentFee: {
        connect: { id: enrollmentFeeId }
      },
      name,
      amount,
      ...restData,
    };

    // Only add createdBy if provided
    if (createdById) {
      chargeData.createdBy = {
        connect: { id: createdById }
      };
    }

    const charge = await this.prisma.additionalCharge.create({
      data: chargeData,
    });

    // Recalculate final amount
    const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0) + amount;
    const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);
    const finalAmount = enrollmentFee.discountedAmount + totalCharges + totalArrears;

    // Update enrollment fee
    await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFeeId },
      data: {
        finalAmount,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: enrollmentFee.enrollmentId,
      action: "CHARGE_ADDED",
      details: {
        feeId: enrollmentFeeId,
        chargeId: charge.id,
        name,
        amount,
        finalAmount,
      },
      createdById: input.createdById || "",
    });

    return charge;
  }

  async removeAdditionalCharge(chargeId: string) {
    // Get charge
    const charge = await this.prisma.additionalCharge.findUnique({
      where: { id: chargeId },
      include: {
        enrollmentFee: {
          include: {
            additionalCharges: true,
            arrears: true,
          },
        },
      },
    });

    if (!charge) {
      throw new Error("Additional charge not found");
    }

    const enrollmentFee = charge.enrollmentFee;

    // Delete charge
    await this.prisma.additionalCharge.delete({
      where: { id: chargeId },
    });

    // Recalculate final amount
    const remainingCharges = enrollmentFee.additionalCharges.filter((c: any) => c.id !== chargeId);
    const totalCharges = remainingCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);
    const finalAmount = enrollmentFee.discountedAmount + totalCharges + totalArrears;

    // Update enrollment fee
    await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFee.id },
      data: {
        finalAmount,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: enrollmentFee.enrollmentId,
      action: "CHARGE_REMOVED",
      details: {
        feeId: enrollmentFee.id,
        chargeId,
        name: charge.name,
        amount: charge.amount,
        finalAmount,
      },
      createdById: charge.createdById || "", // Using the original creator for simplicity
    });

    return { success: true };
  }

  // Arrear Methods
  /**
   * Adds an arrear to an enrollment fee
   * @param input The arrear data
   * @returns The created arrear
   * @throws Error if enrollment fee is not found or if there's an issue adding the arrear
   */
  async addArrear(input: AddArrearInput) {
    const { enrollmentFeeId, amount, ...data } = input;

    // Get enrollment fee
    const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id: enrollmentFeeId },
      include: {
        additionalCharges: true,
        arrears: true,
      },
    });

    if (!enrollmentFee) {
      throw new Error("Enrollment fee not found");
    }

    // Create arrear with proper type handling
    const { createdById, ...restData } = data;

    const arrearData: any = {
      enrollmentFee: {
        connect: { id: enrollmentFeeId }
      },
      amount,
      ...restData,
    };

    // Only add createdBy if provided
    if (createdById) {
      arrearData.createdBy = {
        connect: { id: createdById }
      };
    }

    const arrear = await this.prisma.feeArrear.create({
      data: arrearData,
    });

    // Recalculate final amount
    const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0) + amount;
    const finalAmount = enrollmentFee.discountedAmount + totalCharges + totalArrears;

    // Update enrollment fee
    await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFeeId },
      data: {
        finalAmount,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: enrollmentFee.enrollmentId,
      action: "ARREAR_ADDED",
      details: {
        feeId: enrollmentFeeId,
        arrearId: arrear.id,
        amount,
        reason: data.reason,
        finalAmount,
      },
      createdById: input.createdById || "",
    });

    return arrear;
  }

  async removeArrear(arrearId: string) {
    // Get arrear
    const arrear = await this.prisma.feeArrear.findUnique({
      where: { id: arrearId },
      include: {
        enrollmentFee: {
          include: {
            additionalCharges: true,
            arrears: true,
          },
        },
      },
    });

    if (!arrear) {
      throw new Error("Arrear not found");
    }

    const enrollmentFee = arrear.enrollmentFee;

    // Delete arrear
    await this.prisma.feeArrear.delete({
      where: { id: arrearId },
    });

    // Recalculate final amount
    const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const remainingArrears = enrollmentFee.arrears.filter((a: any) => a.id !== arrearId);
    const totalArrears = remainingArrears.reduce((sum: number, a: any) => sum + a.amount, 0);
    const finalAmount = enrollmentFee.discountedAmount + totalCharges + totalArrears;

    // Update enrollment fee
    await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFee.id },
      data: {
        finalAmount,
      },
    });

    // Create history entry
    await historyService.createHistoryEntry({
      enrollmentId: enrollmentFee.enrollmentId,
      action: "ARREAR_REMOVED",
      details: {
        feeId: enrollmentFee.id,
        arrearId,
        amount: arrear.amount,
        reason: arrear.reason,
        finalAmount,
      },
      createdById: arrear.createdById || "", // Using the original creator for simplicity
    });

    return { success: true };
  }

  // Transaction Methods
  /**
   * Adds a transaction to an enrollment fee
   * @param input The transaction data
   * @returns The created transaction
   * @throws Error if enrollment fee is not found or if there's an issue adding the transaction
   */
  async addTransaction(input: AddTransactionInput) {
    const { enrollmentFeeId, amount, ...data } = input;

    try {
      // Validate input
      if (!enrollmentFeeId) {
        throw new Error('Enrollment fee ID is required');
      }

      if (amount <= 0) {
        throw new Error('Transaction amount must be greater than zero');
      }

      if (!data.method) {
        throw new Error('Payment method is required');
      }

      // Get enrollment fee
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          transactions: true,
        },
      });

      if (!enrollmentFee) {
        throw new Error(`Enrollment fee with ID ${enrollmentFeeId} not found`);
      }

      // Check if the fee is already paid
      if (enrollmentFee.paymentStatus === 'PAID') {
        throw new Error(`This fee has already been fully paid`);
      }

      // Create transaction with proper type handling
      const { createdById, challanId, ...restData } = data;

      // Extract date and method from restData to avoid duplication
      const { date: dateFromRest, method: methodFromRest, ...otherData } = restData;

      const transactionData: any = {
        enrollmentFee: {
          connect: { id: enrollmentFeeId }
        },
        amount,
        date: dateFromRest || new Date(), // Ensure date is provided
        method: methodFromRest || 'CASH', // Ensure method is provided
        ...otherData,
      };

      // Only add challan if provided
      if (challanId) {
        transactionData.challan = {
          connect: { id: challanId }
        };
      }

      // Only add createdBy if provided
      if (createdById) {
        transactionData.createdBy = {
          connect: { id: createdById }
        };
      }

      const transaction = await this.prisma.feeTransaction.create({
        data: {
          ...transactionData,
          isAutomated: false // Mark as manual transaction
        },
      });

      // Use enhanced payment status synchronization
      const syncResult = await this.paymentStatusSyncService.syncPaymentStatus(enrollmentFeeId);

      // If transaction is for a challan, update challan paid amount and status
      if (data.challanId) {
        const challan = await this.prisma.feeChallan.findUnique({
          where: { id: data.challanId },
          include: {
            transactions: true,
          },
        });

        if (!challan) {
          throw new Error(`Challan with ID ${data.challanId} not found`);
        }

        const challanPaid = challan.transactions.reduce((sum: number, t: any) => sum + t.amount, 0) + amount;
        let challanStatus: PaymentStatusType = challan.paymentStatus;

        if (challanPaid >= challan.totalAmount) {
          challanStatus = "PAID";
        } else if (challanPaid > 0) {
          challanStatus = "PARTIAL";
        }

        await this.prisma.feeChallan.update({
          where: { id: data.challanId },
          data: {
            paidAmount: challanPaid,
            paymentStatus: challanStatus,
          },
        });
      }

      // Create history entry
      await historyService.createHistoryEntry({
        enrollmentId: enrollmentFee.enrollmentId,
        action: "TRANSACTION_ADDED",
        details: {
          feeId: enrollmentFeeId,
          transactionId: transaction.id,
          amount,
          method: data.method,
          totalPaid: syncResult.totalPaid,
          newStatus: syncResult.newStatus,
          ...(data.challanId && { challanId: data.challanId }),
        },
        createdById: input.createdById || "",
      });

      return transaction;
    } catch (error) {
      // Enhance error message with context
      if (error instanceof Error) {
        throw new Error(`Failed to add transaction: ${error.message}`);
      }
      throw new Error(`Failed to add transaction: Unknown error`);
    }
  }

  /**
   * Gets all transactions for an enrollment fee
   * @param enrollmentFeeId The enrollment fee ID
   * @returns Array of transactions
   */
  async getTransactions(enrollmentFeeId: string) {
    return this.prisma.feeTransaction.findMany({
      where: { enrollmentFeeId },
      orderBy: { date: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async generateReceipt(transactionId: string) {
    // Get transaction with related data
    const transaction = await this.prisma.feeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: true,
                class: true,
              },
            },
            feeStructure: true,
          },
        },
        challan: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // In a real implementation, generate PDF and update receiptUrl
    // For now, just return the transaction
    return transaction;
  }

  /**
   * Bulk import fee assignments
   */
  async bulkImportFeeAssignments(data: {
    assignments: Array<{
      studentEmail: string;
      studentEnrollmentNumber?: string;
      feeStructureName: string;
      academicCycle?: string;
      term?: string;
      dueDate: string;
      notes?: string;
    }>;
    createdById: string;
  }) {
    const results = {
      total: data.assignments.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as Array<{
        row: number;
        status: 'success' | 'error';
        message: string;
      }>,
    };

    for (let i = 0; i < data.assignments.length; i++) {
      const assignment = data.assignments[i];
      const rowNumber = i + 1;

      try {
        // Find student by email or enrollment number
        const student = await this.prisma.studentProfile.findFirst({
          where: {
            OR: [
              { user: { email: assignment.studentEmail } },
              ...(assignment.studentEnrollmentNumber ? [{ enrollmentNumber: assignment.studentEnrollmentNumber }] : [])
            ]
          },
          include: {
            user: true
          }
        });

        if (!student) {
          throw new Error(`Student not found: ${assignment.studentEmail}`);
        }

        // Find fee structure by name
        const feeStructure = await this.prisma.feeStructure.findFirst({
          where: { name: assignment.feeStructureName }
        });

        if (!feeStructure) {
          throw new Error(`Fee structure not found: ${assignment.feeStructureName}`);
        }

        // Find student's enrollment
        const enrollment = await this.prisma.studentEnrollment.findFirst({
          where: { studentId: student.id, status: 'ACTIVE' }
        });

        if (!enrollment) {
          throw new Error(`No active enrollment found for student: ${assignment.studentEmail}`);
        }

        // Create enrollment fee
        await this.prisma.enrollmentFee.create({
          data: {
            enrollmentId: enrollment.id,
            feeStructureId: feeStructure.id,
            baseAmount: 0, // Will be calculated based on fee structure
            discountedAmount: 0,
            finalAmount: 0,
            dueDate: new Date(assignment.dueDate),
            paymentStatus: 'PENDING',
            notes: assignment.notes,
            createdById: data.createdById,
          }
        });

        results.successful++;
        results.details.push({
          row: rowNumber,
          status: 'success',
          message: `Fee assigned successfully to ${assignment.studentEmail}`
        });

      } catch (error) {
        results.failed++;
        const errorMessage = `Row ${rowNumber}: ${(error as Error).message}`;
        results.errors.push(errorMessage);
        results.details.push({
          row: rowNumber,
          status: 'error',
          message: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Bulk import fee payments
   */
  async bulkImportFeePayments(data: {
    payments: Array<{
      studentEmail: string;
      studentEnrollmentNumber?: string;
      paymentAmount: number;
      paymentMethod: string;
      paymentDate: string;
      transactionReference?: string;
      notes?: string;
    }>;
    createdById: string;
  }) {
    const results = {
      total: data.payments.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      details: [] as Array<{
        row: number;
        status: 'success' | 'error';
        message: string;
      }>,
    };

    for (let i = 0; i < data.payments.length; i++) {
      const payment = data.payments[i];
      const rowNumber = i + 1;

      try {
        // Find student by email or enrollment number
        const student = await this.prisma.studentProfile.findFirst({
          where: {
            OR: [
              { user: { email: payment.studentEmail } },
              ...(payment.studentEnrollmentNumber ? [{ enrollmentNumber: payment.studentEnrollmentNumber }] : [])
            ]
          },
          include: {
            user: true
          }
        });

        if (!student) {
          throw new Error(`Student not found: ${payment.studentEmail}`);
        }

        // Find student's enrollment fee
        const enrollmentFee = await this.prisma.enrollmentFee.findFirst({
          where: {
            enrollment: {
              studentId: student.id,
              status: 'ACTIVE'
            },
            paymentStatus: { in: ['PENDING', 'PARTIAL'] }
          }
        });

        if (!enrollmentFee) {
          throw new Error(`No pending fee found for student: ${payment.studentEmail}`);
        }

        // Create fee transaction
        await this.prisma.feeTransaction.create({
          data: {
            enrollmentFeeId: enrollmentFee.id,
            amount: payment.paymentAmount,
            method: payment.paymentMethod as any,
            date: new Date(payment.paymentDate),
            reference: payment.transactionReference,
            status: 'ACTIVE',
            notes: payment.notes,
            createdById: data.createdById,
          }
        });

        // Calculate new amounts based on existing transactions
        const existingTransactions = await this.prisma.feeTransaction.aggregate({
          where: { enrollmentFeeId: enrollmentFee.id },
          _sum: { amount: true }
        });

        const totalPaid = existingTransactions._sum.amount || 0;
        const remainingAmount = Math.max(0, enrollmentFee.finalAmount - totalPaid);
        const newStatus = remainingAmount === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

        await this.prisma.enrollmentFee.update({
          where: { id: enrollmentFee.id },
          data: {
            paymentStatus: newStatus,
          }
        });

        results.successful++;
        results.details.push({
          row: rowNumber,
          status: 'success',
          message: `Payment recorded successfully for ${payment.studentEmail}`
        });

      } catch (error) {
        results.failed++;
        const errorMessage = `Row ${rowNumber}: ${(error as Error).message}`;
        results.errors.push(errorMessage);
        results.details.push({
          row: rowNumber,
          status: 'error',
          message: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * Recalculate all amounts for an enrollment fee to ensure consistency
   */
  async recalculateEnrollmentFee(enrollmentFeeId: string) {
    const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id: enrollmentFeeId },
      include: {
        feeStructure: true,
        discounts: true,
        additionalCharges: true,
        arrears: true,
        transactions: true,
        lateFeeApplications: {
          where: { status: { in: ['APPLIED', 'PAID'] } }
        }
      },
    });

    if (!enrollmentFee) {
      throw new Error("Enrollment fee not found");
    }

    // Calculate base amount from fee structure components
    const feeComponents = enrollmentFee.feeStructure.feeComponents as any[];
    const baseAmount = Array.isArray(feeComponents)
      ? feeComponents.reduce((sum, component) => sum + (component.amount || 0), 0)
      : 0;

    // Calculate total discounts
    const totalDiscounts = enrollmentFee.discounts.reduce((sum: number, d: any) => sum + d.amount, 0);
    const discountedAmount = Math.max(0, baseAmount - totalDiscounts);

    // Calculate additional charges and arrears
    const totalCharges = enrollmentFee.additionalCharges.reduce((sum: number, c: any) => sum + c.amount, 0);
    const totalArrears = enrollmentFee.arrears.reduce((sum: number, a: any) => sum + a.amount, 0);

    // Calculate late fees
    const totalLateFees = enrollmentFee.lateFeeApplications.reduce((sum: number, lf: any) => sum + (lf.appliedAmount - (lf.waivedAmount || 0)), 0);

    // Calculate final amount
    const finalAmount = discountedAmount + totalCharges + totalArrears + totalLateFees;

    // Calculate total paid amount
    const totalPaid = enrollmentFee.transactions.reduce((sum: number, t: any) => sum + t.amount, 0);

    // Determine correct payment status
    let paymentStatus = enrollmentFee.paymentStatus;
    if (totalPaid >= finalAmount && finalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else if (finalAmount > 0) {
      // Check if overdue
      const dueDate = enrollmentFee.dueDate;
      if (dueDate && new Date() > dueDate) {
        paymentStatus = 'OVERDUE';
      } else {
        paymentStatus = 'PENDING';
      }
    }

    // Update the enrollment fee with recalculated values
    const updatedFee = await this.prisma.enrollmentFee.update({
      where: { id: enrollmentFeeId },
      data: {
        baseAmount,
        discountedAmount,
        finalAmount,
        paymentStatus: paymentStatus as any,
        updatedAt: new Date(),
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
        feeStructure: true,
        transactions: true,
        discounts: {
          include: {
            discountType: true,
          },
        },
        additionalCharges: true,
        arrears: true,
        lateFeeApplications: true,
      },
    });

    return updatedFee;
  }

  /**
   * Update payment status for an enrollment fee with comprehensive validation and audit trail
   */
  async updatePaymentStatus(data: {
    enrollmentFeeId: string;
    paymentStatus: string;
    paidAmount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
    updatedById: string;
  }) {
    try {
      // Get the enrollment fee with related data
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: data.enrollmentFeeId },
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: true,
                },
              },
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
          discounts: {
            include: {
              discountType: true,
            },
          },
        },
      });

      if (!enrollmentFee) {
        throw new Error("Enrollment fee not found");
      }

      // Validate payment amount if provided
      if (data.paidAmount !== undefined) {
        if (data.paidAmount < 0) {
          throw new Error("Payment amount cannot be negative");
        }

        const totalPaid = enrollmentFee.transactions
          ?.filter(t => t.status === 'ACTIVE' && t.amount > 0)
          ?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

        const newTotalPaid = totalPaid + data.paidAmount;
        const finalAmount = parseFloat(enrollmentFee.finalAmount.toString());

        if (newTotalPaid > finalAmount) {
          throw new Error(`Payment amount exceeds remaining balance. Remaining: Rs. ${(finalAmount - totalPaid).toLocaleString()}`);
        }
      }

      const previousStatus = enrollmentFee.paymentStatus;
      let transactionId: string | null = null;

      // If paidAmount is provided, create a transaction
      if (data.paidAmount && data.paidAmount > 0) {
        const transaction = await this.prisma.feeTransaction.create({
          data: {
            enrollmentFeeId: data.enrollmentFeeId,
            amount: data.paidAmount,
            method: data.paymentMethod as any || 'ON_CAMPUS_COUNTER',
            reference: data.transactionReference || `TXN-${Date.now()}`,
            date: new Date(),
            notes: data.notes || `Payment of Rs. ${data.paidAmount.toLocaleString()}`,
            createdById: data.updatedById,
          },
        });
        transactionId = transaction.id;
      }

      // Update the enrollment fee
      const updatedEnrollmentFee = await this.prisma.enrollmentFee.update({
        where: { id: data.enrollmentFeeId },
        data: {
          paymentStatus: data.paymentStatus as any,
          notes: data.notes,
          updatedAt: new Date(),
          updatedById: data.updatedById,
        },
      });

      // Create comprehensive audit trail
      await this.prisma.enrollmentHistory.create({
        data: {
          enrollmentId: enrollmentFee.enrollmentId,
          action: 'PAYMENT_STATUS_UPDATED',
          details: {
            feeId: data.enrollmentFeeId,
            previousStatus: previousStatus,
            newStatus: data.paymentStatus,
            paidAmount: data.paidAmount || 0,
            paymentMethod: data.paymentMethod,
            transactionReference: data.transactionReference,
            transactionId: transactionId,
            notes: data.notes,
            studentName: enrollmentFee.enrollment.student.user?.name,
            totalAmount: parseFloat(enrollmentFee.finalAmount.toString()),
            discountsApplied: enrollmentFee.discounts?.length || 0,
          },
          createdById: data.updatedById,
        },
      });

      // Recalculate all amounts to ensure consistency
      const updatedFee = await this.recalculateEnrollmentFee(data.enrollmentFeeId);

      // If this payment completes the fee, potentially generate invoice
      if (data.paymentStatus === 'PAID' && data.paidAmount) {
        try {
          // This could trigger invoice generation if needed
          console.log(`Fee fully paid for enrollment ${enrollmentFee.enrollmentId}`);
        } catch (invoiceError) {
          console.warn('Failed to generate invoice after payment completion:', invoiceError);
          // Don't fail the payment update if invoice generation fails
        }
      }

      return {
        success: true,
        enrollmentFee: updatedFee,
        transactionId: transactionId,
        auditTrail: {
          previousStatus,
          newStatus: data.paymentStatus,
          paidAmount: data.paidAmount || 0,
        },
      };
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw new Error(`Failed to update payment status: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // ENHANCED DISCOUNT MANAGEMENT WITH ENROLLMENT-LEVEL PERSISTENCE
  // ========================================================================

  /**
   * Ensure discount inheritance to all challans/invoices for an enrollment
   */
  async ensureDiscountInheritanceToChallans(enrollmentFeeId: string) {
    try {
      const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
        where: { id: enrollmentFeeId },
        include: {
          challans: true,
          discounts: {
            where: { status: 'ACTIVE' },
            include: { discountType: true }
          }
        }
      });

      if (!enrollmentFee) {
        throw new Error("Enrollment fee not found");
      }

      const totalDiscount = enrollmentFee.discounts.reduce((sum, d) => sum + d.amount, 0);
      const discountPercentage = enrollmentFee.baseAmount > 0
        ? totalDiscount / enrollmentFee.baseAmount
        : 0;

      let updatedChallans = 0;

      // Update all existing challans to reflect current discount
      for (const challan of enrollmentFee.challans) {
        const originalAmount = challan.totalAmount + challan.paidAmount; // Estimate original amount
        const challanDiscount = originalAmount * discountPercentage;
        const newTotalAmount = Math.max(0, originalAmount - challanDiscount - challan.paidAmount);

        await this.prisma.feeChallan.update({
          where: { id: challan.id },
          data: {
            totalAmount: newTotalAmount,
          }
        });

        updatedChallans++;
      }

      return {
        success: true,
        message: `Discount inheritance updated for ${updatedChallans} challans`,
        updatedChallans,
        discountPercentage: (discountPercentage * 100).toFixed(2) + '%',
        totalDiscount,
      };

    } catch (error) {
      console.error('ERROR FeeService.ensureDiscountInheritanceToChallans failed:', error);
      handleError(error, "Failed to ensure discount inheritance to challans");
    }
  }

  /**
   * Apply bulk discount to multiple enrollments (for batch operations)
   */
  async applyBulkDiscount(data: {
    enrollmentFeeIds: string[];
    discountTypeId: string;
    customAmount?: number;
    reason: string;
    createdById: string;
  }) {
    try {
      const results: Array<{
        enrollmentFeeId: string;
        success: boolean;
        discountId?: string;
        amount?: number;
        error?: string;
      }> = [];
      let successCount = 0;
      let errorCount = 0;

      for (const enrollmentFeeId of data.enrollmentFeeIds) {
        try {
          const result = await this.addDiscount({
            enrollmentFeeId,
            discountTypeId: data.discountTypeId,
            amount: data.customAmount || 0, // Will be calculated if 0
            reason: data.reason,
            createdById: data.createdById,
          });

          // Ensure discount inheritance to challans
          await this.ensureDiscountInheritanceToChallans(enrollmentFeeId);

          results.push({
            enrollmentFeeId,
            success: true,
            discountId: result.id,
            amount: result.amount,
          });
          successCount++;

        } catch (error) {
          results.push({
            enrollmentFeeId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          errorCount++;
        }
      }

      return {
        success: true,
        summary: {
          total: data.enrollmentFeeIds.length,
          successful: successCount,
          failed: errorCount,
          successRate: ((successCount / data.enrollmentFeeIds.length) * 100).toFixed(2) + '%',
        },
        results,
      };

    } catch (error) {
      console.error('ERROR FeeService.applyBulkDiscount failed:', error);
      handleError(error, "Failed to apply bulk discount");
    }
  }
}
