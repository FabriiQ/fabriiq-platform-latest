/**
 * Working Days Configuration Service
 * 
 * Manages working days configuration for different campuses
 * Supports 5-day (Mon-Fri) and 6-day (Mon-Sat) work weeks
 */

import { PrismaClient } from '@prisma/client';

export enum WorkingDaysPattern {
  FIVE_DAYS = 'FIVE_DAYS', // Monday to Friday
  SIX_DAYS = 'SIX_DAYS',   // Monday to Saturday
  CUSTOM = 'CUSTOM'        // Custom pattern
}

export interface WorkingDaysConfig {
  id?: string;
  campusId: string;
  pattern: WorkingDaysPattern;
  workingDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string;     // e.g., "08:00"
  endTime: string;       // e.g., "16:00"
  breakStart?: string;   // e.g., "12:00"
  breakEnd?: string;     // e.g., "13:00"
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface WorkingDayValidation {
  isWorkingDay: boolean;
  isWithinWorkingHours: boolean;
  nextWorkingDay?: Date;
  workingHoursStart?: Date;
  workingHoursEnd?: Date;
}

export class WorkingDaysService {
  private prisma: PrismaClient;

  constructor(context: { prisma: PrismaClient }) {
    this.prisma = context.prisma;
  }

  /**
   * Create or update working days configuration for a campus
   */
  async setWorkingDaysConfig(config: WorkingDaysConfig): Promise<WorkingDaysConfig> {
    const data = {
      campusId: config.campusId,
      pattern: config.pattern,
      workingDays: config.workingDays,
      startTime: config.startTime,
      endTime: config.endTime,
      breakStart: config.breakStart,
      breakEnd: config.breakEnd,
      isActive: config.isActive,
      effectiveFrom: config.effectiveFrom,
      effectiveTo: config.effectiveTo
    };

    if (config.id) {
      // Update existing configuration
      const updated = await this.prisma.workingDaysConfig.update({
        where: { id: config.id },
        data
      });
      return this.mapToWorkingDaysConfig(updated);
    } else {
      // Create new configuration
      const created = await this.prisma.workingDaysConfig.create({
        data
      });
      return this.mapToWorkingDaysConfig(created);
    }
  }

  /**
   * Get working days configuration for a campus
   */
  async getWorkingDaysConfig(campusId: string): Promise<WorkingDaysConfig | null> {
    const config = await this.prisma.workingDaysConfig.findFirst({
      where: {
        campusId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    return config ? this.mapToWorkingDaysConfig(config) : null;
  }

  /**
   * Get default working days patterns
   */
  getDefaultPatterns(): Record<WorkingDaysPattern, Omit<WorkingDaysConfig, 'id' | 'campusId' | 'effectiveFrom'>> {
    return {
      [WorkingDaysPattern.FIVE_DAYS]: {
        pattern: WorkingDaysPattern.FIVE_DAYS,
        workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: '08:00',
        endTime: '16:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        isActive: true
      },
      [WorkingDaysPattern.SIX_DAYS]: {
        pattern: WorkingDaysPattern.SIX_DAYS,
        workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
        startTime: '08:00',
        endTime: '14:00', // Shorter days when working 6 days
        breakStart: '11:00',
        breakEnd: '11:30',
        isActive: true
      },
      [WorkingDaysPattern.CUSTOM]: {
        pattern: WorkingDaysPattern.CUSTOM,
        workingDays: [],
        startTime: '08:00',
        endTime: '16:00',
        isActive: true
      }
    };
  }

  /**
   * Validate if a date/time is within working hours
   */
  async validateWorkingDateTime(
    campusId: string,
    dateTime: Date
  ): Promise<WorkingDayValidation> {
    const config = await this.getWorkingDaysConfig(campusId);
    
    if (!config) {
      // Default to 5-day work week if no config found
      const defaultConfig = {
        ...this.getDefaultPatterns()[WorkingDaysPattern.FIVE_DAYS],
        campusId,
        effectiveFrom: new Date()
      };
      return this.validateDateTime(dateTime, defaultConfig);
    }

    return this.validateDateTime(dateTime, config);
  }

  /**
   * Get next working day for a campus
   */
  async getNextWorkingDay(campusId: string, fromDate: Date = new Date()): Promise<Date> {
    const config = await this.getWorkingDaysConfig(campusId);
    const workingDays = config?.workingDays || [1, 2, 3, 4, 5]; // Default to Mon-Fri

    let nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find next working day
    while (!workingDays.includes(nextDate.getDay())) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Get working days in a date range
   */
  async getWorkingDaysInRange(
    campusId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    const config = await this.getWorkingDaysConfig(campusId);
    const workingDays = config?.workingDays || [1, 2, 3, 4, 5];

    const workingDatesInRange: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (workingDays.includes(currentDate.getDay())) {
        workingDatesInRange.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDatesInRange;
  }

  /**
   * Check if date conflicts with holidays
   */
  async isHoliday(campusId: string, date: Date): Promise<boolean> {
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        campuses: {
          some: { id: campusId }
        },
        startDate: { lte: date },
        endDate: { gte: date },
        status: 'ACTIVE'
      }
    });

    return !!holiday;
  }

  /**
   * Get effective working hours for a specific date
   */
  async getWorkingHours(campusId: string, date: Date): Promise<{
    start: Date;
    end: Date;
    breakStart?: Date;
    breakEnd?: Date;
  } | null> {
    const validation = await this.validateWorkingDateTime(campusId, date);
    
    if (!validation.isWorkingDay) {
      return null;
    }

    const config = await this.getWorkingDaysConfig(campusId);
    if (!config) return null;

    const start = new Date(date);
    const [startHour, startMinute] = config.startTime.split(':').map(Number);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(date);
    const [endHour, endMinute] = config.endTime.split(':').map(Number);
    end.setHours(endHour, endMinute, 0, 0);

    let breakStart: Date | undefined;
    let breakEnd: Date | undefined;

    if (config.breakStart && config.breakEnd) {
      breakStart = new Date(date);
      const [breakStartHour, breakStartMinute] = config.breakStart.split(':').map(Number);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

      breakEnd = new Date(date);
      const [breakEndHour, breakEndMinute] = config.breakEnd.split(':').map(Number);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
    }

    return { start, end, breakStart, breakEnd };
  }

  /**
   * Private helper to validate date/time against config
   */
  private validateDateTime(dateTime: Date, config: WorkingDaysConfig): WorkingDayValidation {
    const dayOfWeek = dateTime.getDay();
    const isWorkingDay = config.workingDays.includes(dayOfWeek);

    if (!isWorkingDay) {
      return {
        isWorkingDay: false,
        isWithinWorkingHours: false,
        nextWorkingDay: this.findNextWorkingDay(dateTime, config.workingDays)
      };
    }

    // Check if within working hours
    const timeString = dateTime.toTimeString().substring(0, 5); // HH:MM format
    const isWithinWorkingHours = timeString >= config.startTime && timeString <= config.endTime;

    // Set working hours for the day
    const workingHoursStart = new Date(dateTime);
    const [startHour, startMinute] = config.startTime.split(':').map(Number);
    workingHoursStart.setHours(startHour, startMinute, 0, 0);

    const workingHoursEnd = new Date(dateTime);
    const [endHour, endMinute] = config.endTime.split(':').map(Number);
    workingHoursEnd.setHours(endHour, endMinute, 0, 0);

    return {
      isWorkingDay: true,
      isWithinWorkingHours,
      workingHoursStart,
      workingHoursEnd
    };
  }

  /**
   * Find next working day based on working days pattern
   */
  private findNextWorkingDay(fromDate: Date, workingDays: number[]): Date {
    let nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + 1);

    while (!workingDays.includes(nextDate.getDay())) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Map database record to WorkingDaysConfig
   */
  private mapToWorkingDaysConfig(record: any): WorkingDaysConfig {
    return {
      id: record.id,
      campusId: record.campusId,
      pattern: record.pattern as WorkingDaysPattern,
      workingDays: record.workingDays,
      startTime: record.startTime,
      endTime: record.endTime,
      breakStart: record.breakStart,
      breakEnd: record.breakEnd,
      isActive: record.isActive,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo
    };
  }
}
