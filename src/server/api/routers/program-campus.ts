import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ProgramService, createProgramCampusSchema, updateProgramCampusSchema } from "../services/program.service";
import { SystemStatus } from "@prisma/client";

export const programCampusRouter = createTRPCRouter({
  // Get all program-campus relationships
  getAll: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(SystemStatus).optional().default(SystemStatus.ACTIVE),
      programId: z.string().optional(),
      campusId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      
      return ctx.prisma.programCampus.findMany({
        where: {
          status: filters.status,
          ...(filters.programId && { programId: filters.programId }),
          ...(filters.campusId && { campusId: filters.campusId }),
        },
        include: {
          program: {
            select: {
              id: true,
              name: true,
              code: true,
              level: true,
              type: true,
            },
          },
          campus: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
            },
          },
          _count: {
            select: {
              classes: true,
              courseOfferings: true,
            },
          },
        },
        orderBy: [
          { program: { level: "asc" } },
          { program: { name: "asc" } },
          { campus: { name: "asc" } },
        ],
      });
    }),

  // Get program-campus by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.programCampus.findUnique({
        where: { id: input.id },
        include: {
          program: true,
          campus: true,
          _count: {
            select: {
              classes: true,
              courseOfferings: true,
            },
          },
        },
      });
    }),

  // Create program-campus relationship
  create: protectedProcedure
    .input(createProgramCampusSchema)
    .mutation(async ({ ctx, input }) => {
      const programService = new ProgramService({ prisma: ctx.prisma });
      return programService.createProgramCampus(input);
    }),

  // Update program-campus relationship
  update: protectedProcedure
    .input(updateProgramCampusSchema)
    .mutation(async ({ ctx, input }) => {
      const programService = new ProgramService({ prisma: ctx.prisma });
      return programService.updateProgramCampus(input);
    }),

  // Delete (deactivate) program-campus relationship
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.programCampus.update({
        where: { id: input.id },
        data: { status: SystemStatus.INACTIVE },
      });
    }),

  // Get program-campuses by program
  getByProgram: protectedProcedure
    .input(z.object({ 
      programId: z.string(),
      status: z.nativeEnum(SystemStatus).optional().default(SystemStatus.ACTIVE),
    }))
    .query(async ({ ctx, input }) => {
      const programService = new ProgramService({ prisma: ctx.prisma });
      return programService.getProgramCampusesByProgram(input.programId);
    }),

  // Get program-campuses by campus
  getByCampus: protectedProcedure
    .input(z.object({ 
      campusId: z.string(),
      status: z.nativeEnum(SystemStatus).optional().default(SystemStatus.ACTIVE),
    }))
    .query(async ({ ctx, input }) => {
      const programService = new ProgramService({ prisma: ctx.prisma });
      return programService.getProgramCampusesByCampus(input.campusId);
    }),
});
