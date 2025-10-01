import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { FeeService, createFeeStructureSchema, updateFeeStructureSchema } from "../services/fee.service";
import { ReceiptService } from "../services/receipt.service";

// Client-side schemas (without server-injected fields)
const createFeeStructureApiSchema = createFeeStructureSchema.omit({ createdById: true });
const updateFeeStructureApiSchema = updateFeeStructureSchema.omit({ updatedById: true });

export const feeStructureRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      programId: z.string().optional(),
      academicCycleId: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .meta({
      performance: {
        cache: true,
        cacheTTL: 300, // 5 minutes
        slowQueryThreshold: 2000
      }
    })
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getAllFeeStructures(input || {});
    }),

  create: protectedProcedure
    .input(createFeeStructureApiSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        console.error('Session validation failed in feeStructure.create:', ctx.session);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }
      console.log('Creating fee structure for user:', ctx.session.user.id);
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.createFeeStructure({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getFeeStructure(input.id);
    }),

  getByProgramCampus: protectedProcedure
    .input(z.object({ programCampusId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.getFeeStructuresByProgramCampus(input.programCampusId);
    }),

  update: protectedProcedure
    .input(updateFeeStructureApiSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        console.error('Session validation failed in feeStructure.update:', ctx.session);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }
      console.log('Updating fee structure by user:', ctx.session.user.id);
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.updateFeeStructure({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.deleteFeeStructure(input.id);
    }),

  // Bulk import fee assignments
  bulkImportFeeAssignments: protectedProcedure
    .input(
      z.object({
        assignments: z.array(
          z.object({
            studentEmail: z.string().email(),
            studentEnrollmentNumber: z.string().optional(),
            feeStructureName: z.string(),
            academicCycle: z.string().optional(),
            term: z.string().optional(),
            dueDate: z.string(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to import fee assignments",
        });
      }

      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.bulkImportFeeAssignments({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  // Bulk import fee payments
  bulkImportFeePayments: protectedProcedure
    .input(
      z.object({
        payments: z.array(
          z.object({
            studentEmail: z.string().email(),
            studentEnrollmentNumber: z.string().optional(),
            paymentAmount: z.number().positive(),
            paymentMethod: z.string(),
            paymentDate: z.string(),
            transactionReference: z.string().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to import fee payments",
        });
      }

      const feeService = new FeeService({ prisma: ctx.prisma });
      return feeService.bulkImportFeePayments({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  // Generate receipt for a transaction
  generateReceipt: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const receiptService = new ReceiptService(ctx.prisma);
      return receiptService.generateReceipt(input.transactionId);
    }),

  // Get receipt for a transaction
  getReceipt: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const receiptService = new ReceiptService(ctx.prisma);
      return receiptService.getReceipt(input.transactionId);
    }),
});
