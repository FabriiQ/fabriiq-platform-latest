/**
 * Calendar Synchronization Service
 * 
 * Handles synchronization of calendar events to personal calendars
 * of students and teachers when institutional events are created/updated.
 */

import { PrismaClient } from '@prisma/client';
import { SystemStatus } from '@prisma/client';

export interface CalendarSyncOptions {
  syncToStudents?: boolean;
  syncToTeachers?: boolean;
  syncToCampusUsers?: boolean;
  notifyUsers?: boolean;
  eventPriority?: 'low' | 'medium' | 'high';
}

export interface SyncResult {
  success: boolean;
  syncedUsers: number;
  failedUsers: number;
  errors: string[];
}

export class CalendarSyncService {
  private prisma: PrismaClient;

  constructor(context: { prisma: PrismaClient }) {
    this.prisma = context.prisma;
  }

  /**
   * Sync academic event to relevant users' personal calendars
   */
  async syncAcademicEvent(
    eventId: string,
    options: CalendarSyncOptions = {}
  ): Promise<SyncResult> {
    try {
      const event = await this.prisma.academicCalendarEvent.findUnique({
        where: { id: eventId },
        include: {
          campuses: true,
          academicCycle: true
        }
      });

      if (!event) {
        throw new Error('Academic event not found');
      }

      const targetUsers = await this.getTargetUsers(event.campuses.map(c => c.id), options);
      const syncResults = await this.createPersonalCalendarEvents(event, targetUsers, 'academic');

      return {
        success: true,
        syncedUsers: syncResults.success,
        failedUsers: syncResults.failed,
        errors: syncResults.errors
      };
    } catch (error) {
      return {
        success: false,
        syncedUsers: 0,
        failedUsers: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Sync holiday to relevant users' personal calendars
   */
  async syncHoliday(
    holidayId: string,
    options: CalendarSyncOptions = {}
  ): Promise<SyncResult> {
    try {
      const holiday = await this.prisma.holiday.findUnique({
        where: { id: holidayId },
        include: { campuses: true }
      });

      if (!holiday) {
        throw new Error('Holiday not found');
      }

      const targetUsers = await this.getTargetUsers(holiday.campuses.map(c => c.id), options);
      const syncResults = await this.createPersonalCalendarEvents(holiday, targetUsers, 'holiday');

      return {
        success: true,
        syncedUsers: syncResults.success,
        failedUsers: syncResults.failed,
        errors: syncResults.errors
      };
    } catch (error) {
      return {
        success: false,
        syncedUsers: 0,
        failedUsers: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Sync timetable changes to affected users
   */
  async syncTimetableEvent(
    timetablePeriodId: string,
    options: CalendarSyncOptions = {}
  ): Promise<SyncResult> {
    try {
      // For now, create a simplified sync without complex relations
      // This would need to be updated based on actual timetable structure
      const period = await this.prisma.timetablePeriod.findUnique({
        where: { id: timetablePeriodId }
      });

      if (!period) {
        throw new Error('Timetable period not found');
      }

      // For now, return a simplified sync result
      // This would need proper implementation based on actual timetable relations
      const syncResults = {
        success: 0,
        failed: 0,
        errors: ['Timetable sync not fully implemented - requires proper schema relations']
      };

      return {
        success: true,
        syncedUsers: syncResults.success,
        failedUsers: syncResults.failed,
        errors: syncResults.errors
      };
    } catch (error) {
      return {
        success: false,
        syncedUsers: 0,
        failedUsers: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get target users based on campus and sync options
   */
  private async getTargetUsers(
    campusIds: string[],
    options: CalendarSyncOptions
  ): Promise<string[]> {
    const userIds: string[] = [];

    if (options.syncToStudents !== false) {
      // Get students from specified campuses
      const students = await this.prisma.studentProfile.findMany({
        where: {
          enrollments: {
            some: {
              class: {
                campusId: { in: campusIds }
              },
              status: 'ACTIVE'
            }
          }
        },
        select: { userId: true }
      });
      userIds.push(...students.map(s => s.userId));
    }

    if (options.syncToTeachers !== false) {
      // Get teachers from specified campuses
      const teachers = await this.prisma.teacherProfile.findMany({
        where: {
          assignments: {
            some: {
              class: {
                campusId: { in: campusIds }
              },
              status: 'ACTIVE'
            }
          }
        },
        select: { userId: true }
      });
      userIds.push(...teachers.map(t => t.userId));
    }

    if (options.syncToCampusUsers) {
      // Get all users associated with the campuses
      const campusUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            {
              studentProfile: {
                enrollments: {
                  some: {
                    class: {
                      campusId: { in: campusIds }
                    }
                  }
                }
              }
            },
            {
              teacherProfile: {
                assignments: {
                  some: {
                    class: {
                      campusId: { in: campusIds }
                    }
                  }
                }
              }
            }
          ]
        },
        select: { id: true }
      });
      userIds.push(...campusUsers.map(u => u.id));
    }

    // Remove duplicates
    return [...new Set(userIds)];
  }

  /**
   * Create personal calendar events for target users
   */
  private async createPersonalCalendarEvents(
    sourceEvent: any,
    userIds: string[],
    sourceType: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        // Check if event already exists for this user (simplified check)
        const existingEvent = await this.prisma.personalCalendarEvent.findFirst({
          where: {
            userId,
            title: sourceEvent.name || sourceEvent.title
          }
        });

        if (!existingEvent) {
          await this.prisma.personalCalendarEvent.create({
            data: {
              userId,
              title: sourceEvent.name || sourceEvent.title,
              description: sourceEvent.description || `Auto-synced ${sourceType} event`,
              startDate: sourceEvent.startDate,
              endDate: sourceEvent.endDate,
              type: 'PERSONAL', // Required field for PersonalCalendarEvent
              sourceEventId: sourceEvent.id,
              sourceType,
              status: SystemStatus.ACTIVE,
              isReadOnly: true, // Users can't edit synced events
              color: this.getEventColor(sourceType)
            }
          });
          success++;
        }
      } catch (error) {
        failed++;
        errors.push(`Failed to sync for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Remove synced events when source event is deleted
   */
  async removeSyncedEvents(sourceEventId: string, sourceType: string): Promise<void> {
    await this.prisma.personalCalendarEvent.deleteMany({
      where: {
        sourceEventId,
        sourceType
      }
    });
  }

  /**
   * Update synced events when source event is modified
   */
  async updateSyncedEvents(
    sourceEventId: string,
    sourceType: string,
    updates: Partial<{
      title: string;
      description: string;
      startDate: Date;
      endDate: Date;
    }>
  ): Promise<void> {
    await this.prisma.personalCalendarEvent.updateMany({
      where: {
        sourceEventId,
        sourceType
      },
      data: updates
    });
  }

  /**
   * Get event color based on source type
   */
  private getEventColor(sourceType: string): string {
    const colorMap: Record<string, string> = {
      academic: '#3B82F6', // Blue
      holiday: '#EF4444',   // Red
      timetable: '#10B981', // Green
      personal: '#8B5CF6'   // Purple
    };
    return colorMap[sourceType] || '#6B7280'; // Gray default
  }
}
