/**
 * Working Days Configuration Router
 * 
 * TRPC router for managing working days configuration
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { WorkingDaysService, WorkingDaysPattern } from '../services/working-days.service';

const workingDaysConfigSchema = z.object({
  campusId: z.string(),
  pattern: z.nativeEnum(WorkingDaysPattern),
  workingDays: z.array(z.number().min(0).max(6)), // 0=Sunday, 6=Saturday
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  isActive: z.boolean().default(true),
  effectiveFrom: z.date().default(() => new Date()),
  effectiveTo: z.date().optional()
});

export const workingDaysRouter = createTRPCRouter({
  // Get working days configuration for a campus
  getConfig: protectedProcedure
    .input(z.object({
      campusId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        const config = await service.getWorkingDaysConfig(input.campusId);
        
        if (!config) {
          // Return default 5-day configuration
          const defaultPatterns = service.getDefaultPatterns();
          return {
            ...defaultPatterns[WorkingDaysPattern.FIVE_DAYS],
            campusId: input.campusId,
            effectiveFrom: new Date()
          };
        }
        
        return config;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get working days configuration'
        });
      }
    }),

  // Set working days configuration for a campus
  setConfig: protectedProcedure
    .input(workingDaysConfigSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        const config = await service.setWorkingDaysConfig(input);
        
        return {
          success: true,
          config,
          message: 'Working days configuration updated successfully'
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to set working days configuration'
        });
      }
    }),

  // Get default patterns
  getDefaultPatterns: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return service.getDefaultPatterns();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get default patterns'
        });
      }
    }),

  // Validate working date time
  validateDateTime: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      dateTime: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return await service.validateWorkingDateTime(input.campusId, input.dateTime);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate date time'
        });
      }
    }),

  // Get next working day
  getNextWorkingDay: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      fromDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return await service.getNextWorkingDay(input.campusId, input.fromDate);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get next working day'
        });
      }
    }),

  // Get working days in range
  getWorkingDaysInRange: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return await service.getWorkingDaysInRange(input.campusId, input.startDate, input.endDate);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get working days in range'
        });
      }
    }),

  // Check if date is holiday
  isHoliday: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      date: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return await service.isHoliday(input.campusId, input.date);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check holiday status'
        });
      }
    }),

  // Get working hours for a specific date
  getWorkingHours: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      date: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        return await service.getWorkingHours(input.campusId, input.date);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get working hours'
        });
      }
    }),

  // Bulk update working days for multiple campuses
  bulkSetConfig: protectedProcedure
    .input(z.object({
      campusIds: z.array(z.string()),
      config: workingDaysConfigSchema.omit({ campusId: true })
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        const results = [];
        
        for (const campusId of input.campusIds) {
          try {
            const config = await service.setWorkingDaysConfig({
              ...input.config,
              campusId
            });
            results.push({ campusId, success: true, config });
          } catch (error) {
            results.push({ 
              campusId, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        
        return {
          success: failureCount === 0,
          results,
          summary: {
            total: input.campusIds.length,
            successful: successCount,
            failed: failureCount
          },
          message: `Updated working days for ${successCount}/${input.campusIds.length} campuses`
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to bulk update working days configuration'
        });
      }
    }),

  // Get all campus working days configurations
  getAllConfigs: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const campuses = await ctx.prisma.campus.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, code: true }
        });
        
        const service = new WorkingDaysService({ prisma: ctx.prisma });
        const configs = [];
        
        for (const campus of campuses) {
          const config = await service.getWorkingDaysConfig(campus.id);
          configs.push({
            campus,
            config: config || {
              ...service.getDefaultPatterns()[WorkingDaysPattern.FIVE_DAYS],
              campusId: campus.id,
              effectiveFrom: new Date()
            }
          });
        }
        
        return configs;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get all working days configurations'
        });
      }
    })
});
