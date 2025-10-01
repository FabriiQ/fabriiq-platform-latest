/**
 * Unified Calendar Service
 * 
 * This service provides a unified interface for managing all types of calendar events
 * including timetables, academic events, holidays, and personal events.
 */

import { PrismaClient, SystemStatus, DayOfWeek, PeriodType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { ServiceBase } from './service-base';
import { CalendarSyncService, CalendarSyncOptions } from './calendar-sync.service';
import { WorkingDaysService } from './working-days.service';
import {
  UnifiedCalendarEvent,
  CalendarEventType,
  EventSource,
  CalendarViewConfig,
  CalendarFilter,
  CreateEventInput,
  CalendarConflict,
  ConflictType,
  ConflictSeverity,
  SyncResult,
  CalendarStatistics,
  ExternalCalendarSource,
  SyncStatus
} from '@/types/calendar/unified-events';
import { isWithinInterval, addDays, format } from 'date-fns';

export class UnifiedCalendarService extends ServiceBase {
  private syncService: CalendarSyncService;
  private workingDaysService: WorkingDaysService;

  constructor(context: { prisma: PrismaClient }) {
    super(context);
    this.syncService = new CalendarSyncService(context);
    this.workingDaysService = new WorkingDaysService(context);
  }

  // Helper functions for date manipulation
  private startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  private endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Get unified calendar events for a date range
   */
  async getUnifiedEvents(
    startDate: Date,
    endDate: Date,
    filters: CalendarFilter[] = [],
    userId?: string
  ): Promise<UnifiedCalendarEvent[]> {
    try {
      // Get events from all sources
      const [timetableEvents, academicEvents, holidayEvents, personalEvents] = await Promise.all([
        this.getTimetableEvents(startDate, endDate, filters),
        this.getAcademicEvents(startDate, endDate, filters),
        this.getHolidayEvents(startDate, endDate, filters),
        userId ? this.getPersonalEvents(startDate, endDate, filters, userId) : []
      ]);

      // Combine all events
      const allEvents = [
        ...timetableEvents,
        ...academicEvents,
        ...holidayEvents,
        ...personalEvents
      ];

      // Apply additional filters
      const filteredEvents = this.applyFilters(allEvents, filters);

      // Sort by start date
      return filteredEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch unified calendar events',
        cause: error
      });
    }
  }

  /**
   * Get timetable events converted to unified format
   */
  private async getTimetableEvents(
    startDate: Date,
    endDate: Date,
    filters: CalendarFilter[]
  ): Promise<UnifiedCalendarEvent[]> {
    // Get timetable periods within date range
    const timetablePeriods = await this.prisma.timetablePeriod.findMany({
      where: {
        status: SystemStatus.ACTIVE,
        timetable: {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          status: SystemStatus.ACTIVE
        }
      },
      include: {
        timetable: {
          include: {
            class: true
          }
        },
        assignment: {
          include: {
            qualification: {
              include: {
                teacher: {
                  include: {
                    user: true
                  }
                },
                subject: true
              }
            }
          }
        },
        facility: true
      }
    });

    // Convert to unified events
    const events: UnifiedCalendarEvent[] = [];
    
    for (const period of timetablePeriods) {
      // Generate recurring events for the period
      const recurringEvents = this.generateRecurringTimetableEvents(
        period,
        startDate,
        endDate
      );
      events.push(...recurringEvents);
    }

    return events;
  }

  /**
   * Generate recurring timetable events for a period
   */
  private generateRecurringTimetableEvents(
    period: any,
    startDate: Date,
    endDate: Date
  ): UnifiedCalendarEvent[] {
    const events: UnifiedCalendarEvent[] = [];
    const timetable = period.timetable;
    const assignment = period.assignment;
    const teacher = assignment?.qualification?.teacher;
    const subject = assignment?.qualification?.subject;

    // Find all dates that match the day of week within the timetable range
    let currentDate = new Date(Math.max(timetable.startDate.getTime(), startDate.getTime()));
    const endDateLimit = new Date(Math.min(timetable.endDate.getTime(), endDate.getTime()));

    while (currentDate <= endDateLimit) {
      if (this.getDayOfWeek(currentDate) === period.dayOfWeek) {
        // Create event for this date
        const eventStartTime = new Date(currentDate);
        const eventEndTime = new Date(currentDate);
        
        // Set time from period start/end time
        const startTime = new Date(period.startTime);
        const endTime = new Date(period.endTime);
        
        eventStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        eventEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

        const event: UnifiedCalendarEvent = {
          id: `timetable_${period.id}_${format(currentDate, 'yyyy-MM-dd')}`,
          title: `${subject?.name || 'Class'} - ${timetable.class?.name || 'Unknown Class'}`,
          description: `${subject?.name || 'Class'} session for ${timetable.class?.name || 'Unknown Class'}`,
          startDate: eventStartTime,
          endDate: eventEndTime,
          type: CalendarEventType.TIMETABLE_PERIOD,
          source: EventSource.TIMETABLE,
          color: this.getEventTypeColor(CalendarEventType.TIMETABLE_PERIOD),
          canEdit: true,
          canDelete: false,
          status: SystemStatus.ACTIVE,
          
          // Timetable-specific fields
          timetableId: timetable.id,
          periodId: period.id,
          classId: timetable.classId,
          className: timetable.class?.name,
          teacherId: teacher?.id,
          teacherName: teacher?.user?.name,
          facilityId: period.facilityId,
          facilityName: period.facility?.name,
          subject: subject?.name,
          dayOfWeek: period.dayOfWeek,
          periodType: period.type,
          location: period.facility?.name,
          
          createdAt: period.createdAt,
          updatedAt: period.updatedAt
        };

        events.push(event);
      }
      
      currentDate = addDays(currentDate, 1);
    }

    return events;
  }

  /**
   * Get academic events converted to unified format
   */
  private async getAcademicEvents(
    startDate: Date,
    endDate: Date,
    filters: CalendarFilter[]
  ): Promise<UnifiedCalendarEvent[]> {
    const academicEvents = await this.prisma.academicCalendarEvent.findMany({
      where: {
        status: SystemStatus.ACTIVE,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      include: {
        academicCycle: true,
        campuses: true,
        classes: true
      }
    });

    return academicEvents.map(event => ({
      id: `academic_${event.id}`,
      title: event.name,
      description: event.description || undefined,
      startDate: event.startDate,
      endDate: event.endDate,
      type: CalendarEventType.ACADEMIC_EVENT,
      source: EventSource.ACADEMIC,
      color: this.getEventTypeColor(CalendarEventType.ACADEMIC_EVENT),
      canEdit: true,
      canDelete: true,
      status: event.status,
      
      // Academic event specific fields
      eventType: event.type,
      campusId: event.campuses[0]?.id,
      campusName: event.campuses[0]?.name,
      academicCycleId: event.academicCycleId || undefined,
      
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));
  }

  /**
   * Get holiday events converted to unified format
   */
  private async getHolidayEvents(
    startDate: Date,
    endDate: Date,
    filters: CalendarFilter[]
  ): Promise<UnifiedCalendarEvent[]> {
    const holidays = await this.prisma.holiday.findMany({
      where: {
        status: SystemStatus.ACTIVE,
        startDate: {
          lte: endDate
        },
        endDate: {
          gte: startDate
        }
      },
      include: {
        campuses: true
      }
    });

    console.log('Holiday Events Debug:', {
      dateRange: { startDate, endDate },
      holidaysFound: holidays.length,
      sampleHolidays: holidays.slice(0, 2).map(h => ({
        id: h.id,
        name: h.name,
        startDate: h.startDate,
        endDate: h.endDate,
        campuses: h.campuses.length
      }))
    });

    return holidays.map(holiday => ({
      id: `holiday_${holiday.id}`,
      title: holiday.name,
      description: holiday.description || undefined,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      type: CalendarEventType.HOLIDAY,
      source: EventSource.HOLIDAY,
      color: this.getEventTypeColor(CalendarEventType.HOLIDAY),
      canEdit: true,
      canDelete: true,
      status: holiday.status,

      // Holiday specific fields
      holidayType: holiday.type as any,
      isNational: holiday.affectsAll, // Using affectsAll as isNational equivalent
      isRecurring: false, // Default to false since schema doesn't have this field
      campusId: holiday.campuses[0]?.id,
      campusName: holiday.campuses[0]?.name,

      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt
    }));
  }

  /**
   * Get personal events converted to unified format
   */
  private async getPersonalEvents(
    startDate: Date,
    endDate: Date,
    filters: CalendarFilter[],
    userId: string
  ): Promise<UnifiedCalendarEvent[]> {
    const personalEvents = await this.prisma.personalCalendarEvent.findMany({
      where: {
        userId,
        status: SystemStatus.ACTIVE,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    return personalEvents.map(event => ({
      id: `personal_${event.id}`,
      title: event.title,
      description: event.description || undefined,
      startDate: event.startDate,
      endDate: event.endDate,
      type: CalendarEventType.PERSONAL,
      source: EventSource.PERSONAL,
      color: event.color || this.getEventTypeColor(CalendarEventType.PERSONAL),
      canEdit: true,
      canDelete: true,
      status: event.status,

      // Personal event specific fields
      userId: event.userId,
      isPrivate: false, // Default value since schema doesn't have this field
      reminderMinutes: undefined, // Default value since schema doesn't have this field
      location: undefined, // Default value since schema doesn't have this field

      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));
  }

  /**
   * Detect conflicts between events
   */
  async detectConflicts(
    events: UnifiedCalendarEvent[],
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<CalendarConflict[]> {
    const conflicts: CalendarConflict[] = [];

    // Group events by resource (teacher, facility)
    const teacherEvents = new Map<string, UnifiedCalendarEvent[]>();
    const facilityEvents = new Map<string, UnifiedCalendarEvent[]>();

    for (const event of events) {
      // Skip if outside date range
      if (dateRange && !isWithinInterval(event.startDate, { start: dateRange.startDate, end: dateRange.endDate })) {
        continue;
      }

      // Group by teacher
      if (event.teacherId) {
        if (!teacherEvents.has(event.teacherId)) {
          teacherEvents.set(event.teacherId, []);
        }
        teacherEvents.get(event.teacherId)!.push(event);
      }

      // Group by facility
      if (event.facilityId) {
        if (!facilityEvents.has(event.facilityId)) {
          facilityEvents.set(event.facilityId, []);
        }
        facilityEvents.get(event.facilityId)!.push(event);
      }
    }

    // Check for teacher conflicts
    for (const [teacherId, teacherEventList] of teacherEvents) {
      const teacherConflicts = this.findTimeOverlaps(teacherEventList, ConflictType.RESOURCE_DOUBLE_BOOKING);
      conflicts.push(...teacherConflicts);
    }

    // Check for facility conflicts
    for (const [facilityId, facilityEventList] of facilityEvents) {
      const facilityConflicts = this.findTimeOverlaps(facilityEventList, ConflictType.FACILITY_UNAVAILABLE);
      conflicts.push(...facilityConflicts);
    }

    return conflicts;
  }

  /**
   * Find time overlaps in a list of events
   */
  private findTimeOverlaps(events: UnifiedCalendarEvent[], conflictType: ConflictType): CalendarConflict[] {
    const conflicts: CalendarConflict[] = [];
    
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        // Check for time overlap
        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({
            id: `conflict_${event1.id}_${event2.id}`,
            type: conflictType,
            severity: ConflictSeverity.HIGH,
            description: `Time overlap between "${event1.title}" and "${event2.title}"`,
            affectedEvents: [event1.id, event2.id],
            status: 'unresolved' as any,
            createdAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two events overlap in time
   */
  private eventsOverlap(event1: UnifiedCalendarEvent, event2: UnifiedCalendarEvent): boolean {
    return event1.startDate < event2.endDate && event2.startDate < event1.endDate;
  }

  /**
   * Apply filters to events
   */
  private applyFilters(events: UnifiedCalendarEvent[], filters: CalendarFilter[]): UnifiedCalendarEvent[] {
    return events.filter(event => {
      return filters.every(filter => {
        const fieldValue = (event as any)[filter.field];
        
        switch (filter.operator) {
          case 'equals':
            return fieldValue === filter.value;
          case 'not_equals':
            return fieldValue !== filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(fieldValue);
          case 'not_in':
            return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
          case 'contains':
            return typeof fieldValue === 'string' && fieldValue.includes(filter.value);
          default:
            return true;
        }
      });
    });
  }

  /**
   * Get color for event type
   */
  private getEventTypeColor(type: CalendarEventType): string {
    const colors = {
      [CalendarEventType.TIMETABLE_PERIOD]: '#3B82F6', // Blue
      [CalendarEventType.ACADEMIC_EVENT]: '#10B981', // Green
      [CalendarEventType.HOLIDAY]: '#EF4444', // Red
      [CalendarEventType.EXAM]: '#F59E0B', // Amber
      [CalendarEventType.BREAK]: '#8B5CF6', // Purple
      [CalendarEventType.MEETING]: '#06B6D4', // Cyan
      [CalendarEventType.PERSONAL]: '#EC4899', // Pink
      [CalendarEventType.DEADLINE]: '#DC2626', // Red-600
      [CalendarEventType.REMINDER]: '#6B7280' // Gray
    };
    
    return colors[type] || '#6B7280';
  }

  /**
   * Convert JavaScript day to DayOfWeek enum
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY
    ];
    return days[date.getDay()];
  }

  /**
   * Get calendar statistics
   */
  async getCalendarStatistics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<CalendarStatistics> {
    const events = await this.getUnifiedEvents(startDate, endDate, [], userId);
    const conflicts = await this.detectConflicts(events, { startDate, endDate });

    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<CalendarEventType, number>);

    const eventsBySource = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as Record<EventSource, number>);

    const now = new Date();
    const upcomingEvents = events.filter(event => event.startDate > now).length;
    const overdueEvents = events.filter(event => 
      event.endDate < now && event.type === CalendarEventType.DEADLINE
    ).length;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySource,
      conflictCount: conflicts.length,
      upcomingEvents,
      overdueEvents,
      syncStatus: {
        google: 'synced' as SyncStatus,
        outlook: 'synced' as SyncStatus,
        ical: 'synced' as SyncStatus,
        exchange: 'synced' as SyncStatus
      }
    };
  }

  /**
   * Create academic event and sync to relevant users
   */
  async createAcademicEventWithSync(
    eventData: any,
    syncOptions: CalendarSyncOptions = {}
  ): Promise<{ event: any; syncResult: any }> {
    // Create the academic event
    const event = await this.prisma.academicCalendarEvent.create({
      data: eventData,
      include: {
        campuses: true,
        academicCycle: true
      }
    });

    // Sync to personal calendars
    const syncResult = await this.syncService.syncAcademicEvent(event.id, syncOptions);

    return { event, syncResult };
  }

  /**
   * Create holiday and sync to relevant users
   */
  async createHolidayWithSync(
    holidayData: any,
    syncOptions: CalendarSyncOptions = {}
  ): Promise<{ holiday: any; syncResult: any }> {
    // Create the holiday
    const holiday = await this.prisma.holiday.create({
      data: holidayData,
      include: { campuses: true }
    });

    // Sync to personal calendars
    const syncResult = await this.syncService.syncHoliday(holiday.id, syncOptions);

    return { holiday, syncResult };
  }

  /**
   * Update academic event and sync changes
   */
  async updateAcademicEventWithSync(
    eventId: string,
    updates: any,
    syncOptions: CalendarSyncOptions = {}
  ): Promise<{ event: any; syncResult: any }> {
    // Update the academic event
    const event = await this.prisma.academicCalendarEvent.update({
      where: { id: eventId },
      data: updates,
      include: {
        campuses: true,
        academicCycle: true
      }
    });

    // Update synced events
    await this.syncService.updateSyncedEvents(eventId, 'academic', {
      title: event.name,
      description: event.description || undefined,
      startDate: event.startDate,
      endDate: event.endDate
    });

    // Re-sync if needed
    const syncResult = await this.syncService.syncAcademicEvent(eventId, syncOptions);

    return { event, syncResult };
  }

  /**
   * Delete academic event and remove synced events
   */
  async deleteAcademicEventWithSync(eventId: string): Promise<void> {
    // Remove synced events first
    await this.syncService.removeSyncedEvents(eventId, 'academic');

    // Delete the academic event
    await this.prisma.academicCalendarEvent.delete({
      where: { id: eventId }
    });
  }

  /**
   * Check if date/time is within working hours for a campus
   */
  async validateWorkingDateTime(campusId: string, dateTime: Date): Promise<any> {
    return this.workingDaysService.validateWorkingDateTime(campusId, dateTime);
  }

  /**
   * Get working days in a date range for a campus
   */
  async getWorkingDaysInRange(campusId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    return this.workingDaysService.getWorkingDaysInRange(campusId, startDate, endDate);
  }
}
