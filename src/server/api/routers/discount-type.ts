import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { DiscountService, createDiscountTypeSchema, updateDiscountTypeSchema } from "../services/discount.service";

// Client-side schemas (without server-injected fields)
const createDiscountTypeApiSchema = createDiscountTypeSchema.omit({ createdById: true });
const updateDiscountTypeApiSchema = updateDiscountTypeSchema.omit({ updatedById: true });

export const discountTypeRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createDiscountTypeApiSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        console.error('Session validation failed in discountType.create:', ctx.session);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }
      console.log('Creating discount type for user:', ctx.session.user.id);
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.createDiscountType({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.getDiscountType(input.id);
    }),

  getAll: protectedProcedure
    .meta({
      performance: {
        cache: true,
        cacheTTL: 600, // 10 minutes - discount types change less frequently
        slowQueryThreshold: 1000
      }
    })
    .query(async ({ ctx }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.getAllDiscountTypes();
    }),

  getByApplicability: protectedProcedure
    .input(z.object({ applicableFor: z.string() }))
    .query(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.getDiscountTypesByApplicability(input.applicableFor);
    }),

  update: protectedProcedure
    .input(updateDiscountTypeApiSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        console.error('Session validation failed in discountType.update:', ctx.session);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User session is invalid" });
      }
      console.log('Updating discount type by user:', ctx.session.user.id);
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.updateDiscountType({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.deleteDiscountType(input.id);
    }),

  checkSiblingDiscountEligibility: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.checkSiblingDiscountEligibility(input.studentId);
    }),

  checkMeritDiscountEligibility: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.checkMeritDiscountEligibility(input.studentId);
    }),

  checkStaffDiscountEligibility: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const discountService = new DiscountService({ prisma: ctx.prisma });
      return discountService.checkStaffDiscountEligibility(input.studentId);
    }),
});
