/**
 * Holiday Management Router
 * 
 * TRPC router for managing holidays and seeding Pakistan holidays
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { HolidaySeedService } from '../services/holiday-seed.service';

export const holidayManagementRouter = createTRPCRouter({
  // Seed all Pakistan holidays for 2025-2027
  seedPakistanHolidays: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const service = new HolidaySeedService({ prisma: ctx.prisma });
        const result = await service.seedAllHolidays();
        
        return {
          success: true,
          ...result,
          message: `Successfully seeded ${result.created} new holidays and updated ${result.updated} existing holidays`
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to seed Pakistan holidays'
        });
      }
    }),

  // Seed educational holidays for specific campuses
  seedEducationalHolidays: protectedProcedure
    .input(z.object({
      campusIds: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new HolidaySeedService({ prisma: ctx.prisma });
        const result = await service.seedEducationalHolidays(input.campusIds);
        
        return {
          success: true,
          ...result,
          message: `Successfully created ${result.created} educational holidays`
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to seed educational holidays'
        });
      }
    }),

  // Create custom holiday
  createHoliday: protectedProcedure
    .input(z.object({
      name: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      type: z.enum(['NATIONAL', 'RELIGIOUS', 'INSTITUTIONAL', 'ADMINISTRATIVE', 'WEATHER', 'OTHER']),
      description: z.string().optional(),

      campusIds: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new HolidaySeedService({ prisma: ctx.prisma });
        const result = await service.createOrUpdateHoliday({
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          type: input.type,
          description: input.description,

          campusIds: input.campusIds
        });
        
        return {
          success: true,
          holiday: result.holiday,
          created: result.created,
          message: result.created ? 'Holiday created successfully' : 'Holiday updated successfully'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create holiday'
        });
      }
    }),

  // Get all holidays
  getHolidays: protectedProcedure
    .input(z.object({
      campusId: z.string().optional(),
      year: z.number().optional(),
      type: z.enum(['NATIONAL', 'RELIGIOUS', 'INSTITUTIONAL', 'ADMINISTRATIVE', 'WEATHER', 'OTHER']).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          status: 'ACTIVE'
        };

        if (input.campusId) {
          where.campuses = {
            some: { id: input.campusId }
          };
        }

        if (input.type) {
          where.type = input.type;
        }

        if (input.year) {
          const yearStart = new Date(input.year, 0, 1);
          const yearEnd = new Date(input.year, 11, 31, 23, 59, 59, 999);
          where.startDate = { gte: yearStart };
          where.endDate = { lte: yearEnd };
        } else if (input.startDate && input.endDate) {
          where.startDate = { gte: input.startDate };
          where.endDate = { lte: input.endDate };
        }

        const holidays = await ctx.prisma.holiday.findMany({
          where,
          include: {
            campuses: {
              select: { id: true, name: true, code: true }
            }
          },
          orderBy: { startDate: 'asc' }
        });

        return holidays;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get holidays'
        });
      }
    }),

  // Update holiday
  updateHoliday: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      type: z.enum(['NATIONAL', 'RELIGIOUS', 'INSTITUTIONAL', 'ADMINISTRATIVE', 'WEATHER', 'OTHER']).optional(),
      description: z.string().optional(),

      campusIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, campusIds, ...updateData } = input;
        
        // Update holiday basic data
        const holiday = await ctx.prisma.holiday.update({
          where: { id },
          data: updateData,
          include: { campuses: true }
        });

        // Update campus associations if provided
        if (campusIds) {
          await ctx.prisma.holiday.update({
            where: { id },
            data: {
              campuses: {
                set: campusIds.map(campusId => ({ id: campusId }))
              }
            }
          });
        }

        return {
          success: true,
          holiday,
          message: 'Holiday updated successfully'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update holiday'
        });
      }
    }),

  // Delete holiday
  deleteHoliday: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.holiday.update({
          where: { id: input.id },
          data: { status: 'INACTIVE' as any }
        });

        return {
          success: true,
          message: 'Holiday deleted successfully'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete holiday'
        });
      }
    }),

  // Get holiday statistics
  getHolidayStatistics: protectedProcedure
    .input(z.object({
      year: z.number().default(() => new Date().getFullYear()),
      campusId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const yearStart = new Date(input.year, 0, 1);
        const yearEnd = new Date(input.year, 11, 31, 23, 59, 59, 999);

        const where: any = {
          status: 'ACTIVE',
          startDate: { gte: yearStart },
          endDate: { lte: yearEnd }
        };

        if (input.campusId) {
          where.campuses = {
            some: { id: input.campusId }
          };
        }

        const holidays = await ctx.prisma.holiday.findMany({
          where,
          include: { campuses: true }
        });

        const statistics = {
          totalHolidays: holidays.length,
          byType: holidays.reduce((acc: any, holiday) => {
            acc[holiday.type] = (acc[holiday.type] || 0) + 1;
            return acc;
          }, {}),
          byMonth: holidays.reduce((acc: any, holiday) => {
            const month = holiday.startDate.getMonth() + 1;
            acc[month] = (acc[month] || 0) + 1;
            return acc;
          }, {}),
          totalDays: holidays.reduce((total, holiday) => {
            const days = Math.ceil((holiday.endDate.getTime() - holiday.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
          }, 0),
          upcomingHolidays: holidays.filter(h => h.startDate > new Date()).length,
          recurringHolidays: 0 // Field not available in current schema
        };

        return statistics;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get holiday statistics'
        });
      }
    }),

  // Check if date is holiday
  checkHoliday: protectedProcedure
    .input(z.object({
      date: z.date(),
      campusId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          status: 'ACTIVE',
          startDate: { lte: input.date },
          endDate: { gte: input.date }
        };

        if (input.campusId) {
          where.campuses = {
            some: { id: input.campusId }
          };
        }

        const holiday = await ctx.prisma.holiday.findFirst({
          where,
          include: { campuses: true }
        });

        return {
          isHoliday: !!holiday,
          holiday: holiday || null
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check holiday'
        });
      }
    })
});
