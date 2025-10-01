import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { FinancialReportsService, financialReportFiltersSchema } from "../services/financial-reports.service";

export const financialReportsRouter = createTRPCRouter({
  // Institution-level report
  getInstitutionReport: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      return reportsService.getInstitutionReport(input || {});
    }),

  // Campus-wise report
  getCampusReport: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      return reportsService.getCampusReport(input || {});
    }),

  // Program-wise report
  getProgramReport: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      return reportsService.getProgramReport(input || {});
    }),

  // Class-wise report
  getClassReport: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      return reportsService.getClassReport(input || {});
    }),

  // Student-wise report
  getStudentReport: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      return reportsService.getStudentReport(input || {});
    }),

  // Export report data (returns structured data for export)
  exportReport: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["institution", "campus", "program", "class", "student"]),
        format: z.enum(["pdf", "excel", "csv"]),
        filters: financialReportFiltersSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const reportsService = new FinancialReportsService({ prisma: ctx.prisma });
      const filters = input.filters || {};

      let reportData;
      switch (input.reportType) {
        case "institution":
          reportData = await reportsService.getInstitutionReport(filters);
          break;
        case "campus":
          reportData = await reportsService.getCampusReport(filters);
          break;
        case "program":
          reportData = await reportsService.getProgramReport(filters);
          break;
        case "class":
          reportData = await reportsService.getClassReport(filters);
          break;
        case "student":
          reportData = await reportsService.getStudentReport(filters);
          break;
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid report type" });
      }

      // In a real implementation, you would generate the actual file here
      // For now, we'll return the data structure that would be used for export
      return {
        reportType: input.reportType,
        format: input.format,
        data: reportData,
        generatedAt: new Date(),
        filters,
        // In production, this would be a URL to the generated file
        downloadUrl: `/api/reports/download/${input.reportType}-${Date.now()}.${input.format}`,
      };
    }),

  // Get payment method analytics
  getPaymentMethodAnalytics: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const whereClause: any = {};
      if (input?.dateFrom || input?.dateTo) {
        whereClause.date = {};
        if (input.dateFrom) whereClause.date.gte = input.dateFrom;
        if (input.dateTo) whereClause.date.lte = input.dateTo;
      }

      const paymentMethodStats = await ctx.prisma.feeTransaction.groupBy({
        by: ["method"],
        where: whereClause,
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
      });

      return paymentMethodStats.map((stat) => ({
        method: stat.method,
        totalAmount: stat._sum.amount || 0,
        transactionCount: stat._count.id || 0,
        averageAmount: stat._avg.amount || 0,
      }));
    }),

  // Get collection trends
  getCollectionTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
        months: z.number().min(1).max(24).default(12),
        filters: financialReportFiltersSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const trends = [];
      const now = new Date();

      for (let i = input.months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthlyCollection = await ctx.prisma.feeTransaction.aggregate({
          where: {
            date: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        const trendData = {
          period: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          amount: monthlyCollection._sum.amount || 0,
          transactionCount: monthlyCollection._count.id || 0,
          date: monthStart,
        };

        trends.push(trendData);
      }

      return trends;
    }),

  // Get overdue analysis
  getOverdueAnalysis: protectedProcedure
    .input(financialReportFiltersSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }

      const now = new Date();
      const overdueRanges = [
        { label: "1-30 days", min: 1, max: 30 },
        { label: "31-60 days", min: 31, max: 60 },
        { label: "61-90 days", min: 61, max: 90 },
        { label: "90+ days", min: 91, max: null },
      ];

      const overdueAnalysis = await Promise.all(
        overdueRanges.map(async (range) => {
          const startDate = new Date(now);
          startDate.setDate(now.getDate() - (range.max || 365));
          
          const endDate = new Date(now);
          endDate.setDate(now.getDate() - range.min);

          const overdueData = await ctx.prisma.enrollmentFee.findMany({
            where: {
              paymentStatus: { in: ["PENDING", "PARTIAL"] },
              dueDate: {
                gte: range.max ? startDate : undefined,
                lte: endDate,
              },
            },
            include: { transactions: true },
          });

          const totalOverdue = overdueData.reduce((sum, fee) => {
            const paidAmount = fee.transactions.reduce((paid, t) => paid + t.amount, 0);
            return sum + Math.max(0, fee.finalAmount - paidAmount);
          }, 0);

          return {
            range: range.label,
            count: overdueData.length,
            amount: totalOverdue,
          };
        })
      );

      return overdueAnalysis;
    }),
});
