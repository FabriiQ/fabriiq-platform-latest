import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  ChallanService,
  createChallanTemplateSchema,
  updateChallanTemplateSchema,
  generateChallanSchema,
  bulkGenerateChallansSchema
} from "../services/challan.service";
import { TRPCError } from "@trpc/server";

export const challanRouter = createTRPCRouter({
  // Challan Template Endpoints
  createTemplate: protectedProcedure
    .input(createChallanTemplateSchema.omit({ institutionId: true, createdById: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get user's institution ID from session
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { institutionId: true, primaryCampusId: true }
        });

        let institutionId = user?.institutionId;

        // If no institutionId, try to get it from the primary campus
        if (!institutionId && user?.primaryCampusId) {
          const campus = await ctx.prisma.campus.findUnique({
            where: { id: user.primaryCampusId },
            select: { institutionId: true }
          });
          institutionId = campus?.institutionId;
        }

        // If still no institutionId, use a default one or create one
        if (!institutionId) {
          // Try to find any institution or create a default one
          let defaultInstitution = await ctx.prisma.institution.findFirst({
            select: { id: true }
          });

          if (!defaultInstitution) {
            // Create a default institution if none exists
            defaultInstitution = await ctx.prisma.institution.create({
              data: {
                name: "Default Institution",
                code: "DEFAULT",
                status: "ACTIVE"
              },
              select: { id: true }
            });
          }

          institutionId = defaultInstitution.id;
        }

        const challanService = new ChallanService();
        return challanService.createChallanTemplate({
          ...input,
          institutionId,
          createdById: ctx.session.user.id,
        });
      } catch (error) {
        console.error('Error creating challan template:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create challan template",
        });
      }
    }),

  getTemplateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.getChallanTemplate(input.id);
    }),

  getTemplatesByInstitution: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.getChallanTemplatesByInstitution(input.institutionId);
    }),

  getAllTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      // Only allow system admins to get all templates
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to view all templates",
        });
      }

      const challanService = new ChallanService();
      return challanService.getAllChallanTemplates();
    }),

  updateTemplate: protectedProcedure
    .input(updateChallanTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const challanService = new ChallanService();
      return challanService.updateChallanTemplate({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.deleteChallanTemplate(input.id);
    }),

  // Challan Endpoints
  generate: protectedProcedure
    .input(generateChallanSchema)
    .mutation(async ({ ctx, input }) => {
      const challanService = new ChallanService();
      return challanService.generateChallan({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.getChallan(input.id);
    }),

  getByEnrollmentFee: protectedProcedure
    .input(z.object({ enrollmentFeeId: z.string() }))
    .query(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.getChallansByEnrollmentFee(input.enrollmentFeeId);
    }),

  print: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.printChallan(input.id);
    }),

  email: protectedProcedure
    .input(z.object({ id: z.string(), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.emailChallan(input.id, input.email);
    }),

  batchPrint: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const challanService = new ChallanService();
      return challanService.batchPrintChallans(input.ids);
    }),

  bulkGenerate: protectedProcedure
    .input(bulkGenerateChallansSchema)
    .mutation(async ({ ctx, input }) => {
      const challanService = new ChallanService();
      return challanService.bulkGenerateChallans({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),
});
