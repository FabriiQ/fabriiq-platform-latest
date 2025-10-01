import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma, SystemStatus } from "@prisma/client";
import { AcademicCycleService } from "../services/academic-cycle.service";
import { AcademicCycleType } from "../types/academic-calendar";

// Input schemas that match what the frontend sends
const createAcademicCycleInputSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.nativeEnum(AcademicCycleType),
  startDate: z.date(),
  endDate: z.date(),
  institutionId: z.string(),
  createdBy: z.string(),
  status: z.string().optional(), // Frontend sends as string
  isDefault: z.boolean().optional(), // Frontend includes this
});

const updateAcademicCycleInputSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.nativeEnum(AcademicCycleType).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  updatedBy: z.string().optional(),
});

export const academicCycleRouter = createTRPCRouter({
  // Create a new academic cycle
  create: protectedProcedure
    .input(createAcademicCycleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      // Transform input to match service type
      const serviceInput = {
        code: input.code,
        name: input.name,
        description: input.description,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        institutionId: input.institutionId,
        createdBy: input.createdBy,
        status: input.status as SystemStatus || SystemStatus.ACTIVE,
      };
      return service.createAcademicCycle(serviceInput, ctx.session.user.userType);
    }),

  // Get academic cycle by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      return service.getAcademicCycle(input.id);
    }),

  // Update an academic cycle
  update: protectedProcedure
    .input(updateAcademicCycleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      const { id, ...updateData } = input;
      // Transform input to match service type
      const serviceInput = {
        id,
        ...updateData,
        updatedBy: ctx.session.user.id,
      };
      return service.updateAcademicCycle(id, serviceInput, ctx.session.user.userType);
    }),

  // Delete an academic cycle
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      return service.deleteAcademicCycle(input.id);
    }),

  // Update the list endpoint to return all academic cycles
  list: protectedProcedure
    .input(
      z.object({
        institutionId: z.string().optional(),
        campusId: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(10),
        sortBy: z.string().optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const {
        institutionId,
        search,
        status,
        page = 1,
        pageSize = 10,
        sortBy = "createdAt",
        sortOrder = "desc"
      } = input;

      // Use the provided institutionId or throw an error if not provided
      if (!institutionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Institution ID is required",
        });
      }

      // Build the where clause
      let where: Prisma.AcademicCycleWhereInput = {
        institutionId,
      };

      // Add search filter if provided
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ];
      }

      // Add status filter if provided
      if (status) {
        where.status = status as SystemStatus;
      }

      // Get total count for pagination
      const total = await ctx.prisma.academicCycle.count({ where });

      // Get the academic cycles
      const academicCycles = await ctx.prisma.academicCycle.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          terms: true,
          institution: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
      });

      return {
        items: academicCycles,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get current academic cycle
  getCurrent: protectedProcedure
    .input(z.object({ institutionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      return service.getCurrentAcademicCycle(input.institutionId);
    }),

  // Get academic cycles by date range
  getByDateRange: protectedProcedure
    .input(z.object({
      institutionId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      type: z.nativeEnum(AcademicCycleType).optional()
    }))
    .query(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      return service.getAcademicCyclesByDateRange(input);
    }),

  // Get upcoming academic cycles
  getUpcoming: protectedProcedure
    .input(z.object({
      institutionId: z.string(),
      limit: z.number().optional().default(5),
      type: z.nativeEnum(AcademicCycleType).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new AcademicCycleService({ prisma: ctx.prisma });
      return service.getUpcomingCycles(input);
    }),
});
