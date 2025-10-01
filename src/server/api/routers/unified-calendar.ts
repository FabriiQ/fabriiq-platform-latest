/**
 * Unified Calendar API Router
 * 
 * Provides API endpoints for the unified calendar system that integrates
 * timetables, academic events, holidays, and personal events.
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { UnifiedCalendarService } from '../services/unified-calendar.service';
import { TRPCError } from '@trpc/server';
import {
  CalendarEventType,
  EventSource,
  FilterOperator,
  CalendarViewType,
  CalendarGroupBy,
  EventPriority as UnifiedEventPriority,
  HolidayType,
  RecurrenceType,
  CalendarFilter
} from '@/types/calendar/unified-events';
import { DayOfWeek, AcademicEventType, EventPriority as PrismaEventPriority } from '@prisma/client';

// Input validation schemas
const calendarFilterSchema = z.object({
  field: z.string(),
  operator: z.nativeEnum(FilterOperator),
  value: z.any()
});

const recurrencePatternSchema = z.object({
  type: z.nativeEnum(RecurrenceType),
  interval: z.number().min(1),
  daysOfWeek: z.array(z.nativeEnum(DayOfWeek)).optional(),
  endDate: z.date().optional(),
  occurrences: z.number().min(1).optional(),
  exceptions: z.array(z.date()).optional()
});

const getUnifiedEventsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  filters: z.array(calendarFilterSchema).optional().default([]),
  includePersonal: z.boolean().optional().default(true),
  includeTimetables: z.boolean().optional().default(true),
  includeAcademic: z.boolean().optional().default(true),
  includeHolidays: z.boolean().optional().default(true)
});

const calendarViewConfigSchema = z.object({
  type: z.nativeEnum(CalendarViewType),
  startDate: z.date(),
  endDate: z.date(),
  filters: z.array(calendarFilterSchema).optional().default([]),
  groupBy: z.nativeEnum(CalendarGroupBy).optional(),
  showWeekends: z.boolean().optional().default(true),
  showConflicts: z.boolean().optional().default(true),
  showRecurring: z.boolean().optional().default(true)
});

const detectConflictsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  eventIds: z.array(z.string()).optional(),
  includeResolved: z.boolean().optional().default(false)
});

const createUnifiedEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startDate: z.date(),
  endDate: z.date(),
  type: z.nativeEnum(CalendarEventType),
  source: z.nativeEnum(EventSource),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  priority: z.nativeEnum(UnifiedEventPriority).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(200).optional(),
  url: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
  recurrence: recurrencePatternSchema.optional(),
  reminderMinutes: z.number().min(0).max(10080).optional(), // Max 1 week
  
  // Type-specific data
  timetableData: z.object({
    timetableId: z.string(),
    periodId: z.string(),
    classId: z.string(),
    teacherId: z.string().optional(),
    facilityId: z.string().optional(),
    subject: z.string(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    periodType: z.string()
  }).optional(),
  
  academicData: z.object({
    eventType: z.nativeEnum(AcademicEventType),
    campusId: z.string().optional(),
    programId: z.string().optional(),
    academicCycleId: z.string().optional(),
    classIds: z.array(z.string()).optional()
  }).optional(),
  
  holidayData: z.object({
    holidayType: z.nativeEnum(HolidayType),
    isNational: z.boolean(),
    isRecurring: z.boolean(),
    campusIds: z.array(z.string()).optional()
  }).optional(),
  
  personalData: z.object({
    isPrivate: z.boolean().optional().default(false),
    reminderMinutes: z.number().min(0).max(10080).optional()
  }).optional()
});

const updateUnifiedEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  priority: z.nativeEnum(UnifiedEventPriority).optional(),
  tags: z.array(z.string()).optional(),
  location: z.string().max(200).optional(),
  url: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
  reminderMinutes: z.number().min(0).max(10080).optional()
});

const getCalendarStatisticsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('month'),
  includePersonal: z.boolean().optional().default(true)
});

export const unifiedCalendarRouter = createTRPCRouter({
  // Get unified calendar events
  getEvents: protectedProcedure
    .input(getUnifiedEventsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });
        
        // Apply source filters based on input - only exclude sources that are explicitly disabled
        const filters: CalendarFilter[] = [...input.filters];

        if (input.includeTimetables === false) {
          filters.push({
            field: 'source',
            operator: FilterOperator.NOT_EQUALS,
            value: EventSource.TIMETABLE
          });
        }

        if (input.includeAcademic === false) {
          filters.push({
            field: 'source',
            operator: FilterOperator.NOT_EQUALS,
            value: EventSource.ACADEMIC
          });
        }

        if (input.includeHolidays === false) {
          filters.push({
            field: 'source',
            operator: FilterOperator.NOT_EQUALS,
            value: EventSource.HOLIDAY
          });
        }

        const userId = input.includePersonal ? ctx.session.user.id : undefined;
        
        return service.getUnifiedEvents(
          input.startDate,
          input.endDate,
          filters,
          userId
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar events',
          cause: error
        });
      }
    }),

  // Get calendar view with specific configuration
  getCalendarView: protectedProcedure
    .input(calendarViewConfigSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });
        
        const events = await service.getUnifiedEvents(
          input.startDate,
          input.endDate,
          input.filters,
          ctx.session.user.id
        );

        // Detect conflicts if requested
        let conflicts: any[] = [];
        if (input.showConflicts) {
          conflicts = await service.detectConflicts(events, {
            startDate: input.startDate,
            endDate: input.endDate
          });
        }

        return {
          events,
          conflicts,
          config: input,
          statistics: await service.getCalendarStatistics(
            input.startDate,
            input.endDate,
            ctx.session.user.id
          )
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar view',
          cause: error
        });
      }
    }),

  // Detect conflicts in calendar events
  detectConflicts: protectedProcedure
    .input(detectConflictsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });
        
        // Get events for conflict detection
        let events = await service.getUnifiedEvents(
          input.startDate,
          input.endDate,
          [],
          ctx.session.user.id
        );

        // Filter to specific events if provided
        if (input.eventIds && input.eventIds.length > 0) {
          events = events.filter(event => input.eventIds?.includes(event.id) ?? false);
        }

        const conflicts = await service.detectConflicts(events, {
          startDate: input.startDate,
          endDate: input.endDate
        });

        // Filter resolved conflicts if not requested
        if (!input.includeResolved) {
          return conflicts.filter(conflict => conflict.status === 'unresolved');
        }

        return conflicts;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to detect conflicts',
          cause: error
        });
      }
    }),

  // Get calendar statistics
  getStatistics: protectedProcedure
    .input(getCalendarStatisticsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });
        
        const userId = input.includePersonal ? ctx.session.user.id : undefined;
        
        return service.getCalendarStatistics(
          input.startDate,
          input.endDate,
          userId
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar statistics',
          cause: error
        });
      }
    }),

  // Create a unified calendar event
  createEvent: protectedProcedure
    .input(createUnifiedEventSchema)
    .mutation(async ({ input }) => {
      try {
        // Validate date range
        if (input.startDate >= input.endDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'End date must be after start date'
          });
        }

        // Route to appropriate service based on event type and source
        // For now, just return a success message
        // Individual event creation methods would be implemented here
        return {
          success: true,
          message: `Event creation for ${input.source} type is not yet implemented`
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create calendar event',
          cause: error
        });
      }
    }),

  // Update a unified calendar event
  updateEvent: protectedProcedure
    .input(updateUnifiedEventSchema)
    .mutation(async ({ input }) => {
      try {
        // Extract event source from ID prefix
        const [source] = input.id.split('_');
        
        // For now, just return a success message
        // Individual event update methods would be implemented here
        return {
          success: true,
          message: `Event update for ${source} type is not yet implemented`
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update calendar event',
          cause: error
        });
      }
    }),

  // Delete a unified calendar event
  deleteEvent: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Extract event source from ID prefix
        const [source, actualId] = input.id.split('_');
        
        switch (source) {
          case 'personal':
            await ctx.prisma.personalCalendarEvent.delete({
              where: { id: actualId }
            });
            break;
          case 'academic':
            await ctx.prisma.academicCalendarEvent.update({
              where: { id: actualId },
              data: { status: 'INACTIVE' as any }
            });
            break;
          case 'holiday':
            await ctx.prisma.holiday.update({
              where: { id: actualId },
              data: { status: 'INACTIVE' as any }
            });
            break;
          default:
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Cannot delete events of type: ${source}`
            });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete calendar event',
          cause: error
        });
      }
    }),

  // Create academic event with sync
  createAcademicEventWithSync: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      campusIds: z.array(z.string()),
      academicCycleId: z.string().optional(),
      type: z.nativeEnum(AcademicEventType).default('OTHER'),
      priority: z.nativeEnum(PrismaEventPriority).default('NORMAL'),
      syncOptions: z.object({
        syncToStudents: z.boolean().default(true),
        syncToTeachers: z.boolean().default(true),
        syncToCampusUsers: z.boolean().default(false),
        notifyUsers: z.boolean().default(true)
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });

        // Validate date range
        if (input.startDate > input.endDate) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date must be after or equal to start date' });
        }

        const eventData = {
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          ...(input.academicCycleId && { academicCycleId: input.academicCycleId }),
          type: input.type,
          priority: input.priority,
          status: 'ACTIVE',
          createdBy: ctx.session.user.id,
          campuses: {
            connect: input.campusIds.map(id => ({ id }))
          }
        };

        const result = await service.createAcademicEventWithSync(
          eventData,
          input.syncOptions || {}
        );

        return {
          success: true,
          event: result.event,
          syncResult: result.syncResult,
          message: `Academic event created and synced to ${result.syncResult.syncedUsers} users`
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create academic event'
        });
      }
    }),

  // Create holiday with sync
  createHolidayWithSync: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      campusIds: z.array(z.string()),
      type: z.enum(['NATIONAL', 'RELIGIOUS', 'INSTITUTIONAL', 'ADMINISTRATIVE', 'WEATHER', 'OTHER']).default('OTHER'),
      isRecurring: z.boolean().default(false),
      syncOptions: z.object({
        syncToStudents: z.boolean().default(true),
        syncToTeachers: z.boolean().default(true),
        syncToCampusUsers: z.boolean().default(true),
        notifyUsers: z.boolean().default(true)
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new UnifiedCalendarService({ prisma: ctx.prisma });

        const holidayData = {
          name: input.name,
          description: input.description || `${input.name} - Holiday`,
          startDate: input.startDate,
          endDate: input.endDate,
          type: input.type,
          status: 'ACTIVE',
          affectsAll: true,
          createdBy: ctx.session.user.id,
          campuses: {
            connect: input.campusIds.map(id => ({ id }))
          }
        };

        const result = await service.createHolidayWithSync(
          holidayData,
          input.syncOptions || {}
        );

        return {
          success: true,
          holiday: result.holiday,
          syncResult: result.syncResult,
          message: `Holiday created and synced to ${result.syncResult.syncedUsers} users`
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create holiday'
        });
      }
    }),

  // Validate working date time
  validateWorkingDateTime: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      dateTime: z.date()
    }))
    .query(async ({ ctx, input }) => {
      const service = new UnifiedCalendarService({ prisma: ctx.prisma });
      return service.validateWorkingDateTime(input.campusId, input.dateTime);
    }),

  // Get working days in range
  getWorkingDaysInRange: protectedProcedure
    .input(z.object({
      campusId: z.string(),
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      const service = new UnifiedCalendarService({ prisma: ctx.prisma });
      return service.getWorkingDaysInRange(input.campusId, input.startDate, input.endDate);
    }),

  // Seed Pakistan public holidays
  seedPakistanHolidays: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { PakistanHolidaysService } = await import('../services/pakistan-holidays.service');
        const service = new PakistanHolidaysService({ prisma: ctx.prisma });

        const result = await service.seedPakistanHolidays();

        return {
          success: true,
          message: `Seeded Pakistan holidays: ${result.created} created, ${result.updated} updated`,
          details: result
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to seed Pakistan holidays'
        });
      }
    }),

  // Debug endpoint to check holidays in database
  debugHolidays: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const holidays = await ctx.prisma.holiday.findMany({
          include: {
            campuses: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        return {
          count: holidays.length,
          holidays: holidays.map(h => ({
            id: h.id,
            name: h.name,
            startDate: h.startDate,
            endDate: h.endDate,
            status: h.status,
            type: h.type,
            campuses: h.campuses.length,
            campusNames: h.campuses.map(c => c.name),
            createdAt: h.createdAt
          }))
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch holidays'
        });
      }
    })
});
