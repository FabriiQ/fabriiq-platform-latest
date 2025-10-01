/**
 * Holiday Seeding Service
 * 
 * Seeds Pakistan public holidays for 2025, 2026, and 2027
 * Manages holiday data for educational institutions
 */

import { PrismaClient } from '@prisma/client';
import { SystemStatus } from '@prisma/client';

export interface HolidayData {
  name: string;
  startDate: Date;
  endDate: Date;
  type: 'NATIONAL' | 'RELIGIOUS' | 'INSTITUTIONAL' | 'ADMINISTRATIVE' | 'WEATHER' | 'OTHER';
  description?: string;
  campusIds?: string[];
  createdBy?: string;
}

export class HolidaySeedService {
  private prisma: PrismaClient;

  constructor(context: { prisma: PrismaClient }) {
    this.prisma = context.prisma;
  }

  /**
   * Seed all Pakistan holidays for 2025-2027
   */
  async seedAllHolidays(): Promise<{ created: number; updated: number; errors: string[] }> {
    const holidays2025 = this.getPakistanHolidays2025();
    const holidays2026 = this.getPakistanHolidays2026();
    const holidays2027 = this.getPakistanHolidays2027();

    const allHolidays = [...holidays2025, ...holidays2026, ...holidays2027];
    
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Get all campuses to apply holidays to
    const campuses = await this.prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    const campusIds = campuses.map(c => c.id);

    for (const holidayData of allHolidays) {
      try {
        const result = await this.createOrUpdateHoliday({
          ...holidayData,
          campusIds
        });
        
        if (result.created) {
          created++;
        } else {
          updated++;
        }
      } catch (error) {
        errors.push(`Failed to create holiday ${holidayData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Create or update a holiday
   */
  async createOrUpdateHoliday(holidayData: HolidayData): Promise<{ created: boolean; holiday: any }> {
    // Check if holiday already exists
    const existingHoliday = await this.prisma.holiday.findFirst({
      where: {
        name: holidayData.name,
        startDate: holidayData.startDate
      }
    });

    if (existingHoliday) {
      // Update existing holiday
      const updated = await this.prisma.holiday.update({
        where: { id: existingHoliday.id },
        data: {
          endDate: holidayData.endDate,
          type: holidayData.type,
          description: holidayData.description,
          status: SystemStatus.ACTIVE
        }
      });

      // Update campus associations if provided
      if (holidayData.campusIds && holidayData.campusIds.length > 0) {
        await this.updateHolidayCampuses(updated.id, holidayData.campusIds);
      }

      return { created: false, holiday: updated };
    } else {
      // Create new holiday - need to get a user for createdBy
      const users = await this.prisma.user.findMany({ take: 1 });
      const createdBy = holidayData.createdBy || (users.length > 0 ? users[0].id : 'system');

      const created = await this.prisma.holiday.create({
        data: {
          name: holidayData.name,
          startDate: holidayData.startDate,
          endDate: holidayData.endDate,
          type: holidayData.type,
          description: holidayData.description || `${holidayData.name} - Pakistan Public Holiday`,
          status: SystemStatus.ACTIVE,
          createdBy: createdBy
        }
      });

      // Associate with campuses if provided
      if (holidayData.campusIds && holidayData.campusIds.length > 0) {
        await this.updateHolidayCampuses(created.id, holidayData.campusIds);
      }

      return { created: true, holiday: created };
    }
  }

  /**
   * Update holiday campus associations
   */
  private async updateHolidayCampuses(holidayId: string, campusIds: string[]): Promise<void> {
    // Remove existing associations
    await this.prisma.holiday.update({
      where: { id: holidayId },
      data: {
        campuses: {
          set: []
        }
      }
    });

    // Add new associations
    await this.prisma.holiday.update({
      where: { id: holidayId },
      data: {
        campuses: {
          connect: campusIds.map(id => ({ id }))
        }
      }
    });
  }

  /**
   * Get Pakistan holidays for 2025
   */
  private getPakistanHolidays2025(): HolidayData[] {
    return [
      {
        name: 'Kashmir Day',
        startDate: new Date('2025-02-05'),
        endDate: new Date('2025-02-05'),
        type: 'NATIONAL'
      },
      {
        name: 'Pakistan Day',
        startDate: new Date('2025-03-23'),
        endDate: new Date('2025-03-23'),
        type: 'NATIONAL'
      },
      {
        name: 'Eid ul-Fitr',
        startDate: new Date('2025-03-30'),
        endDate: new Date('2025-04-01'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Fitr and holidays'
      },
      {
        name: 'Easter Monday',
        startDate: new Date('2025-04-21'),
        endDate: new Date('2025-04-21'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Labour Day',
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-01'),
        type: 'OTHER'
      },
      {
        name: 'Youm-e-Takbeer',
        startDate: new Date('2025-05-28'),
        endDate: new Date('2025-05-28'),
        type: 'NATIONAL'
      },
      {
        name: 'Eid ul-Azha',
        startDate: new Date('2025-06-07'),
        endDate: new Date('2025-06-09'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Azha and holidays'
      },
      {
        name: 'Ashura',
        startDate: new Date('2025-07-05'),
        endDate: new Date('2025-07-06'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Independence Day',
        startDate: new Date('2025-08-14'),
        endDate: new Date('2025-08-14'),
        type: 'NATIONAL'
      },
      {
        name: 'Milad un-Nabi',
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-05'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Iqbal Day',
        startDate: new Date('2025-11-09'),
        endDate: new Date('2025-11-09'),
        type: 'NATIONAL'
      },
      {
        name: 'Christmas Day',
        startDate: new Date('2025-12-25'),
        endDate: new Date('2025-12-25'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Quaid-e-Azam Day',
        startDate: new Date('2025-12-25'),
        endDate: new Date('2025-12-25'),
        type: 'NATIONAL'
      },
      {
        name: 'Day after Christmas',
        startDate: new Date('2025-12-26'),
        endDate: new Date('2025-12-26'),
        type: 'OTHER'
      }
    ];
  }

  /**
   * Get Pakistan holidays for 2026
   */
  private getPakistanHolidays2026(): HolidayData[] {
    return [
      {
        name: 'Kashmir Day',
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-05'),
        type: 'NATIONAL'
      },
      {
        name: 'Eid ul-Fitr',
        startDate: new Date('2026-03-21'),
        endDate: new Date('2026-03-23'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Fitr and holidays'
      },
      {
        name: 'Pakistan Day',
        startDate: new Date('2026-03-23'),
        endDate: new Date('2026-03-23'),
        type: 'NATIONAL'
      },
      {
        name: 'Easter Monday',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-06'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Labour Day',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-01'),
        type: 'OTHER'
      },
      {
        name: 'Eid ul-Azha',
        startDate: new Date('2026-05-27'),
        endDate: new Date('2026-05-28'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Azha and holidays'
      },
      {
        name: 'Youm-e-Takbeer',
        startDate: new Date('2026-05-28'),
        endDate: new Date('2026-05-28'),
        type: 'NATIONAL'
      },
      {
        name: 'Ashura',
        startDate: new Date('2026-06-25'),
        endDate: new Date('2026-06-26'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Independence Day',
        startDate: new Date('2026-08-14'),
        endDate: new Date('2026-08-14'),
        type: 'NATIONAL'
      },
      {
        name: 'Milad un-Nabi',
        startDate: new Date('2026-08-25'),
        endDate: new Date('2026-08-25'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Iqbal Day',
        startDate: new Date('2026-11-09'),
        endDate: new Date('2026-11-09'),
        type: 'NATIONAL'
      },
      {
        name: 'Christmas Day',
        startDate: new Date('2026-12-25'),
        endDate: new Date('2026-12-25'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Quaid-e-Azam Day',
        startDate: new Date('2026-12-25'),
        endDate: new Date('2026-12-25'),
        type: 'NATIONAL'
      },
      {
        name: 'Day after Christmas',
        startDate: new Date('2026-12-26'),
        endDate: new Date('2026-12-26'),
        type: 'OTHER'
      }
    ];
  }

  /**
   * Get Pakistan holidays for 2027
   */
  private getPakistanHolidays2027(): HolidayData[] {
    return [
      {
        name: 'Kashmir Day',
        startDate: new Date('2027-02-05'),
        endDate: new Date('2027-02-05'),
        type: 'NATIONAL'
      },
      {
        name: 'Eid ul-Fitr',
        startDate: new Date('2027-03-10'),
        endDate: new Date('2027-03-12'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Fitr and holidays'
      },
      {
        name: 'Pakistan Day',
        startDate: new Date('2027-03-23'),
        endDate: new Date('2027-03-23'),
        type: 'NATIONAL'
      },
      {
        name: 'Easter Monday',
        startDate: new Date('2027-03-29'),
        endDate: new Date('2027-03-29'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Labour Day',
        startDate: new Date('2027-05-01'),
        endDate: new Date('2027-05-01'),
        type: 'OTHER'
      },
      {
        name: 'Eid ul-Azha',
        startDate: new Date('2027-05-17'),
        endDate: new Date('2027-05-18'),
        type: 'RELIGIOUS',
        description: 'Eid ul-Azha and holidays'
      },
      {
        name: 'Youm-e-Takbeer',
        startDate: new Date('2027-05-28'),
        endDate: new Date('2027-05-28'),
        type: 'NATIONAL'
      },
      {
        name: 'Ashura',
        startDate: new Date('2027-06-14'),
        endDate: new Date('2027-06-15'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Independence Day',
        startDate: new Date('2027-08-14'),
        endDate: new Date('2027-08-14'),
        type: 'NATIONAL'
      },
      {
        name: 'Milad un-Nabi',
        startDate: new Date('2027-08-15'),
        endDate: new Date('2027-08-15'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Iqbal Day',
        startDate: new Date('2027-11-09'),
        endDate: new Date('2027-11-09'),
        type: 'NATIONAL'
      },
      {
        name: 'Christmas Day',
        startDate: new Date('2027-12-25'),
        endDate: new Date('2027-12-25'),
        type: 'RELIGIOUS'
      },
      {
        name: 'Quaid-e-Azam Day',
        startDate: new Date('2027-12-25'),
        endDate: new Date('2027-12-25'),
        type: 'NATIONAL'
      },
      {
        name: 'Day after Christmas',
        startDate: new Date('2027-12-26'),
        endDate: new Date('2027-12-26'),
        type: 'OTHER'
      }
    ];
  }

  /**
   * Seed educational holidays (can be customized per institution)
   */
  async seedEducationalHolidays(campusIds: string[]): Promise<{ created: number; errors: string[] }> {
    const educationalHolidays: HolidayData[] = [
      {
        name: 'Summer Break',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-08-15'),
        type: 'INSTITUTIONAL',
        description: 'Summer vacation for students',
        campusIds
      },
      {
        name: 'Winter Break',
        startDate: new Date('2025-12-20'),
        endDate: new Date('2026-01-05'),
        type: 'INSTITUTIONAL',
        description: 'Winter vacation for students',
        campusIds
      }
    ];

    let created = 0;
    const errors: string[] = [];

    for (const holiday of educationalHolidays) {
      try {
        const result = await this.createOrUpdateHoliday(holiday);
        if (result.created) {
          created++;
        }
      } catch (error) {
        errors.push(`Failed to create educational holiday ${holiday.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { created, errors };
  }
}
