import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  EnrollmentService,
  updateEnrollmentSchema,
  transferStudentClassSchema,
  transferStudentCampusSchema
} from "../services/enrollment.service";
import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { SystemStatus } from "@prisma/client";

export const enrollmentRouter = createTRPCRouter({
  // Get all enrollments with optional filtering - OPTIMIZED WITH PAGINATION
  getAllEnrollments: protectedProcedure
    .input(
      z.object({
        campusId: z.string().optional(),
        programId: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1).optional(),
        pageSize: z.number().min(1).max(100).default(25).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.getAllEnrollments(input);
    }),

  // Create a new enrollment
  createEnrollment: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        classId: z.string(),
        startDate: z.date(),
        endDate: z.date().optional(),
        status: z.enum(['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE']).optional().default('ACTIVE'),
        createdById: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has appropriate permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to create enrollments",
        });
      }

      try {
        // Use the enrollment service to create the enrollment
        const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
        const result = await enrollmentService.createEnrollment({
          studentId: input.studentId,
          classId: input.classId,
          startDate: input.startDate,
          createdById: input.createdById,
          notes: input.notes,
        });

        return result;
      } catch (error) {
        console.error('Error creating enrollment:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create enrollment",
          cause: error,
        });
      }
    }),

  // Bulk enroll students
  bulkEnroll: protectedProcedure
    .input(
      z.object({
        studentIds: z.array(z.string()),
        classId: z.string(),
        startDate: z.date(),
        endDate: z.date().optional(),
        status: z.enum(['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE']).optional().default('ACTIVE'),
        createdById: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has appropriate permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to create enrollments",
        });
      }

      try {
        // Create enrollments for each student
        const enrollments = await Promise.all(
          input.studentIds.map(async (studentId) => {
            return ctx.prisma.studentEnrollment.create({
              data: {
                studentId,
                classId: input.classId,
                startDate: input.startDate,
                endDate: input.endDate,
                status: input.status as any,
                createdById: input.createdById,
              },
            });
          })
        );

        // If notes are provided, create history entries for all enrollments
        if (input.notes) {
          const { EnrollmentHistoryService } = await import("../services/enrollment-history.service");
          const historyService = new EnrollmentHistoryService();
          await Promise.all(
            enrollments.map(async (enrollment) => {
              await historyService.createHistoryEntry({
                enrollmentId: enrollment.id,
                action: "BULK_CREATED_WITH_NOTES",
                details: {
                  notes: input.notes,
                  createdAt: new Date().toISOString(),
                },
                createdById: input.createdById,
              });
            })
          );
        }

        return {
          success: true,
          count: enrollments.length,
          message: `Successfully enrolled ${enrollments.length} students`,
        };
      } catch (error) {
        console.error('Error bulk enrolling students:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk enroll students",
          cause: error,
        });
      }
    }),

  // Bulk import enrollments with student creation
  bulkImportEnrollments: protectedProcedure
    .input(
      z.object({
        enrollments: z.array(
          z.object({
            studentEmail: z.string().email(),
            studentFirstName: z.string().optional(),
            studentLastName: z.string().optional(),
            studentEnrollmentNumber: z.string().optional(),
            studentPhone: z.string().optional(),
            campusCode: z.string(),
            programCode: z.string().optional(),
            courseCode: z.string().optional(),
            className: z.string(),
            startDate: z.string(),
            endDate: z.string().optional(),
            status: z.string().optional().default('ACTIVE').transform((val) => {
              if (!val || val === '') return 'ACTIVE';
              if (['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE'].includes(val)) {
                return val as 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'WITHDRAWN' | 'INACTIVE';
              }
              return 'ACTIVE';
            }),
            notes: z.string().optional(),
          })
        ),
        defaultCampusId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has appropriate permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to import enrollments",
        });
      }

      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.bulkImportEnrollments({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  // Get enrollment by ID
  getEnrollment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.getEnrollment(input.id);
    }),

  // Update enrollment
  updateEnrollment: protectedProcedure
    .input(z.object({
      data: updateEnrollmentSchema,
      updatedById: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.updateEnrollment(input.data, input.updatedById);
    }),

  // Delete enrollment
  deleteEnrollment: protectedProcedure
    .input(z.object({
      id: z.string(),
      updatedById: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.deleteEnrollment(input.id, input.updatedById);
    }),

  // Get enrollments by class
  getEnrollmentsByClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.getEnrollmentsByClass(input.classId);
    }),

  // Get enrollments by student
  getEnrollmentsByStudent: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.getEnrollmentsByStudent(input.studentId);
    }),



  // Transfer student to another class within the same campus
  transferStudentToClass: protectedProcedure
    .input(transferStudentClassSchema)
    .mutation(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.transferStudentToClass(input);
    }),

  // Transfer student to another campus
  transferStudentToCampus: protectedProcedure
    .input(transferStudentCampusSchema)
    .mutation(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.transferStudentToCampus(input);
    }),

  // Get comprehensive enrollment history
  getEnrollmentHistory: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Validate input
        if (!input.enrollmentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Enrollment ID is required',
          });
        }

        // Verify enrollment exists
        const enrollment = await ctx.prisma.studentEnrollment.findUnique({
          where: { id: input.enrollmentId },
          select: { id: true },
        });

        if (!enrollment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment not found',
          });
        }

        // Get enrollment history entries
        const enrollmentHistory = await ctx.prisma.enrollmentHistory.findMany({
          where: {
            enrollmentId: input.enrollmentId,
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                userType: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: input.limit,
          skip: input.offset,
        });

        // Get fee payment history for this enrollment
        const feeHistory = await ctx.prisma.enrollmentFee.findMany({
          where: {
            enrollmentId: input.enrollmentId,
          },
          include: {
            feeStructure: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            transactions: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                userType: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                userType: true,
              },
            },
          },
        });

        // Combine and format all history entries
        const allHistory: any[] = [];

        // Add enrollment history entries
        enrollmentHistory.forEach(entry => {
          allHistory.push({
            id: entry.id,
            type: 'ENROLLMENT_HISTORY',
            action: entry.action,
            description: entry.action,
            details: entry.details,
            createdAt: entry.createdAt,
            createdBy: entry.createdBy,
          });
        });

        // Add fee-related history
        feeHistory.forEach(fee => {
          // Add fee creation
          allHistory.push({
            id: `fee-created-${fee.id}`,
            type: 'FEE_CREATED',
            action: 'Fee Assigned',
            description: `Fee structure assigned: ${fee.feeStructure?.name || 'Unknown'}`,
            details: {
              feeId: fee.id,
              amount: fee.finalAmount,
              dueDate: fee.dueDate,
            },
            createdAt: fee.createdAt,
            createdBy: fee.createdBy,
          });

          // Add payment transactions
          fee.transactions?.forEach(transaction => {
            allHistory.push({
              id: transaction.id,
              type: 'PAYMENT_TRANSACTION',
              action: `Payment Transaction`,
              description: `Payment: $${transaction.amount} via ${transaction.method}`,
              details: {
                transactionId: transaction.id,
                amount: transaction.amount,
                paymentMethod: transaction.method,
                reference: transaction.reference,
                status: transaction.status,
              },
              createdAt: transaction.createdAt,
              createdBy: transaction.createdBy,
            });
          });

          // Add payment status changes
          if (fee.paymentStatus !== 'PENDING') {
            allHistory.push({
              id: `fee-status-${fee.id}`,
              type: 'PAYMENT_STATUS_CHANGE',
              action: 'Payment Status Updated',
              description: `Payment status changed to ${fee.paymentStatus}`,
              details: {
                feeId: fee.id,
                status: fee.paymentStatus,
                amount: fee.finalAmount,
              },
              createdAt: fee.updatedAt,
              createdBy: fee.updatedBy,
            });
          }
        });

        // Sort all history by date (newest first)
        allHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
          history: allHistory.slice(0, input.limit),
          totalCount: allHistory.length,
        };
      } catch (error) {
        console.error('Error fetching enrollment history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch enrollment history',
        });
      }
    }),

  // Get transfer history for a campus
  getTransferHistory: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        transferType: z.enum(['class', 'campus', 'all']).optional().default('all'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      // Check if user has access to the campus
      const userHasCampusAccess = await prisma.userCampusAccess.findFirst({
        where: {
          userId: ctx.session.user.id,
          campusId: input.campusId,
          status: SystemStatus.ACTIVE,
        },
      });

      if (!userHasCampusAccess && ctx.session.user.userType !== 'SYSTEM_ADMIN') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this campus",
        });
      }

      // Get all classes in this campus
      const classes = await prisma.class.findMany({
        where: {
          campusId: input.campusId,
        },
        select: {
          id: true,
        },
      });

      const classIds = classes.map(c => c.id);

      // Build the query for enrollment history
      const whereClause: any = {
        OR: [
          {
            action: {
              in: ['TRANSFERRED_IN', 'TRANSFERRED_OUT'],
            },
            enrollment: {
              classId: {
                in: classIds,
              },
            },
          },
          {
            action: {
              in: ['CAMPUS_TRANSFERRED_IN', 'CAMPUS_TRANSFERRED_OUT'],
            },
            details: {
              path: ['toCampusId'],
              equals: input.campusId,
            },
          },
          {
            action: {
              in: ['CAMPUS_TRANSFERRED_IN', 'CAMPUS_TRANSFERRED_OUT'],
            },
            details: {
              path: ['fromCampusId'],
              equals: input.campusId,
            },
          },
        ],
      };

      // Add date filters if provided
      if (input.startDate) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          gte: input.startDate,
        };
      }

      if (input.endDate) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          lte: input.endDate,
        };
      }

      // Filter by transfer type if specified
      if (input.transferType === 'class') {
        whereClause.OR = whereClause.OR.filter((condition: any) =>
          condition.action?.in?.includes('TRANSFERRED_IN') ||
          condition.action?.in?.includes('TRANSFERRED_OUT')
        );
      } else if (input.transferType === 'campus') {
        whereClause.OR = whereClause.OR.filter((condition: any) =>
          condition.action?.in?.includes('CAMPUS_TRANSFERRED_IN') ||
          condition.action?.in?.includes('CAMPUS_TRANSFERRED_OUT')
        );
      }

      // Get the transfer history
      const transferHistory = await prisma.enrollmentHistory.findMany({
        where: whereClause,
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              class: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              userType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
        skip: input.offset,
      });

      // Get the total count
      const totalCount = await prisma.enrollmentHistory.count({
        where: whereClause,
      });

      return {
        transfers: transferHistory,
        totalCount,
      };
    }),

  // Get enrollments by fee structure ID
  getByFeeStructure: protectedProcedure
    .input(z.object({ feeStructureId: z.string() }))
    .query(async ({ ctx, input }) => {
      const enrollmentService = new EnrollmentService({ prisma: ctx.prisma });
      return enrollmentService.getEnrollmentsByFeeStructure(input.feeStructureId);
    }),


});