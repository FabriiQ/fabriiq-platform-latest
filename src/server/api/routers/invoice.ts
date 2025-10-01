import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { InvoiceService } from "../services/invoice.service";
import { InvoiceArchivingService } from "../services/invoice-archiving.service";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceQuerySchema,
  invoiceAnalyticsSchema,
  bulkInvoiceOperationSchema,
  invoiceTemplateSchema,
  invoiceExportSchema,
  invoicePaymentSchema,
  invoiceReminderSchema
} from "../models/invoice.models";

export const invoiceRouter = createTRPCRouter({
  // Create a new invoice
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN', 'FINANCE_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to create invoices",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.createInvoice({
        ...input,
        createdById: ctx.session.user.id
      });
    }),

  // Get invoice by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.getInvoiceById(input.id);
    }),

  // Get invoices with pagination and filtering
  getAll: protectedProcedure
    .input(invoiceQuerySchema)
    .query(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.getInvoices(input);
    }),

  // Update invoice
  update: protectedProcedure
    .input(updateInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN', 'FINANCE_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to update invoices",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.updateInvoice({
        ...input,
        updatedById: ctx.session.user.id
      });
    }),

  // Delete invoice
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to delete invoices",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.deleteInvoice(input.id, ctx.session.user.id);
    }),

  // Get invoice analytics
  getAnalytics: protectedProcedure
    .input(invoiceAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.getInvoiceAnalytics(input);
    }),

  // Bulk operations
  bulkOperation: protectedProcedure
    .input(bulkInvoiceOperationSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN', 'FINANCE_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to perform bulk operations",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.bulkOperation({
        ...input,
        operatedById: ctx.session.user.id
      });
    }),

  // Archive old invoices
  archiveOld: protectedProcedure
    .input(z.object({ olderThanMonths: z.number().min(1).max(60).default(12) }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions - only system admins can archive
      if (!['SYSTEM_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to archive invoices",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.archiveOldInvoices(input.olderThanMonths);
    }),

  // Get student invoices
  getByStudent: protectedProcedure
    .input(z.object({ 
      studentId: z.string(),
      status: z.string().optional(),
      limit: z.number().min(1).max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.getInvoices({
        studentId: input.studentId,
        status: input.status as any,
        pageSize: input.limit,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeArchived: false
      });
    }),

  // Generate invoice PDF
  generatePDF: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      const invoice = await invoiceService.getInvoiceById(input.id);
      
      // In a real implementation, you would generate a PDF here
      // For now, return the invoice data that can be used to generate PDF on frontend
      return {
        invoice,
        pdfUrl: `/api/invoices/${input.id}/pdf`, // This would be a real URL in production
        downloadUrl: `/api/invoices/${input.id}/download`
      };
    }),

  // Send invoice reminder
  sendReminder: protectedProcedure
    .input(invoiceReminderSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN', 'FINANCE_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to send reminders",
        });
      }

      // In a real implementation, you would:
      // 1. Create reminder records in the database
      // 2. Queue email/SMS notifications
      // 3. Track delivery status
      
      // For now, just return success
      return {
        success: true,
        message: `Reminders scheduled for ${input.invoiceIds.length} invoice(s)`,
        reminderType: input.reminderType,
        scheduledCount: input.invoiceIds.length
      };
    }),

  // Record payment
  recordPayment: protectedProcedure
    .input(invoicePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN', 'FINANCE_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to record payments",
        });
      }

      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      
      // Get the invoice
      const invoice = await invoiceService.getInvoiceById(input.invoiceId);
      
      // Create payment record using raw SQL for better performance
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await ctx.prisma.$executeRaw`
        INSERT INTO "invoice_payments" (
          id, "invoiceId", amount, "paymentMethod", "paymentDate",
          "transactionReference", notes, metadata, status, "createdAt", "createdById"
        ) VALUES (
          ${paymentId}, ${input.invoiceId}, ${input.amount}, ${input.paymentMethod},
          ${input.paymentDate}, ${input.transactionReference || null}, ${input.notes || null},
          ${JSON.stringify(input.metadata || {})}, 'COMPLETED', NOW(), ${ctx.session.user.id}
        )
      `;

      // Update invoice status if fully paid
      const totalPaid = await ctx.prisma.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM "invoice_payments"
        WHERE "invoiceId" = ${input.invoiceId}
        AND status = 'COMPLETED'
      `;

      const paidAmount = Number(totalPaid[0].total);
      const invoiceAmount = Number(invoice.totalAmount);

      if (paidAmount >= invoiceAmount) {
        await invoiceService.updateInvoice({
          id: input.invoiceId,
          status: 'PAID' as any,
          updatedById: ctx.session.user.id
        });
      }

      return {
        success: true,
        paymentId,
        paidAmount,
        remainingAmount: Math.max(0, invoiceAmount - paidAmount),
        fullyPaid: paidAmount >= invoiceAmount
      };
    }),

  // Get invoice summary statistics
  getSummary: protectedProcedure
    .input(z.object({
      dateFrom: z.date().optional(),
      dateTo: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      const invoiceService = new InvoiceService({ prisma: ctx.prisma });
      return invoiceService.getInvoiceAnalytics({
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        groupBy: 'month',
        includeArchived: false
      });
    }),

  // Archiving and Partitioning Endpoints

  // Create partitions for a specific year
  createPartitions: protectedProcedure
    .input(z.object({ year: z.number().min(2020).max(2050) }))
    .mutation(async ({ ctx, input }) => {
      // Only system admins can create partitions
      if (!['SYSTEM_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to create partitions",
        });
      }

      const archivingService = new InvoiceArchivingService({ prisma: ctx.prisma });
      await archivingService.createPartitions(input.year);

      return {
        success: true,
        message: `Partitions created for year ${input.year}`
      };
    }),

  // Get partition information
  getPartitionInfo: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admins can view partition info
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to view partition information",
        });
      }

      const archivingService = new InvoiceArchivingService({ prisma: ctx.prisma });
      return archivingService.getPartitionInfo();
    }),

  // Run archiving process
  runArchiving: protectedProcedure
    .input(z.object({
      archiveAfterMonths: z.number().min(1).max(60).optional(),
      compressAfterMonths: z.number().min(1).max(120).optional(),
      deleteAfterYears: z.number().min(1).max(20).optional(),
      batchSize: z.number().min(100).max(10000).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Only system admins can run archiving
      if (!['SYSTEM_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to run archiving",
        });
      }

      const archivingService = new InvoiceArchivingService({ prisma: ctx.prisma });
      return archivingService.archiveOldInvoices(input);
    }),

  // Get archiving statistics
  getArchivingStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admins can view archiving stats
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to view archiving statistics",
        });
      }

      const archivingService = new InvoiceArchivingService({ prisma: ctx.prisma });
      return archivingService.getArchivingStats();
    })
});
