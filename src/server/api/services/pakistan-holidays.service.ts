/**
 * Pakistan Public Holidays Service
 * 
 * Manages Pakistan public holidays for 2025-2027 including:
 * - National holidays
 * - Religious holidays (Islamic calendar based)
 * - Regional holidays
 */

import { PrismaClient } from '@prisma/client';
import { SystemStatus } from '@prisma/client';

export interface PakistanHoliday {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  type: 'NATIONAL' | 'RELIGIOUS' | 'OTHER';
  isRecurring: boolean;
  isOptional?: boolean;
}

export class PakistanHolidaysService {
  private prisma: PrismaClient;

  constructor(context: { prisma: PrismaClient }) {
    this.prisma = context.prisma;
  }

  /**
   * Get all Pakistan public holidays for 2025-2027
   */
  getPakistanHolidays(): PakistanHoliday[] {
    return [
      // 2025 Holidays
      {
        name: "New Year's Day",
        description: "First day of the Gregorian calendar year",
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Kashmir Day",
        description: "Day to show solidarity with the people of Kashmir",
        startDate: new Date('2025-02-05'),
        endDate: new Date('2025-02-05'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Pakistan Day",
        description: "Commemorates the Lahore Resolution and the adoption of the first constitution",
        startDate: new Date('2025-03-23'),
        endDate: new Date('2025-03-23'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Labour Day",
        description: "International Workers' Day",
        startDate: new Date('2025-05-01'),
        endDate: new Date('2025-05-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Independence Day",
        description: "Celebrates the independence of Pakistan from British rule",
        startDate: new Date('2025-08-14'),
        endDate: new Date('2025-08-14'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Iqbal Day",
        description: "Birthday of Allama Iqbal, the national poet and philosopher",
        startDate: new Date('2025-11-09'),
        endDate: new Date('2025-11-09'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Quaid-e-Azam Birthday",
        description: "Birthday of Muhammad Ali Jinnah, founder of Pakistan",
        startDate: new Date('2025-12-25'),
        endDate: new Date('2025-12-25'),
        type: 'NATIONAL',
        isRecurring: true
      },

      // Islamic Holidays 2025 (approximate dates - should be confirmed with lunar calendar)
      {
        name: "Mawlid un Nabi",
        description: "Birthday of Prophet Muhammad (PBUH)",
        startDate: new Date('2025-09-05'),
        endDate: new Date('2025-09-05'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Fitr",
        description: "Festival marking the end of Ramadan",
        startDate: new Date('2025-03-31'),
        endDate: new Date('2025-04-02'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Adha",
        description: "Festival of Sacrifice",
        startDate: new Date('2025-06-07'),
        endDate: new Date('2025-06-09'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Ashura",
        description: "Day of mourning for Imam Hussain",
        startDate: new Date('2025-07-05'),
        endDate: new Date('2025-07-06'),
        type: 'RELIGIOUS',
        isRecurring: true
      },

      // 2026 Holidays
      {
        name: "New Year's Day",
        description: "First day of the Gregorian calendar year",
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Kashmir Day",
        description: "Day to show solidarity with the people of Kashmir",
        startDate: new Date('2026-02-05'),
        endDate: new Date('2026-02-05'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Pakistan Day",
        description: "Commemorates the Lahore Resolution and the adoption of the first constitution",
        startDate: new Date('2026-03-23'),
        endDate: new Date('2026-03-23'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Labour Day",
        description: "International Workers' Day",
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Independence Day",
        description: "Celebrates the independence of Pakistan from British rule",
        startDate: new Date('2026-08-14'),
        endDate: new Date('2026-08-14'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Iqbal Day",
        description: "Birthday of Allama Iqbal, the national poet and philosopher",
        startDate: new Date('2026-11-09'),
        endDate: new Date('2026-11-09'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Quaid-e-Azam Birthday",
        description: "Birthday of Muhammad Ali Jinnah, founder of Pakistan",
        startDate: new Date('2026-12-25'),
        endDate: new Date('2026-12-25'),
        type: 'NATIONAL',
        isRecurring: true
      },

      // Islamic Holidays 2026 (approximate dates)
      {
        name: "Mawlid un Nabi",
        description: "Birthday of Prophet Muhammad (PBUH)",
        startDate: new Date('2026-08-26'),
        endDate: new Date('2026-08-26'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Fitr",
        description: "Festival marking the end of Ramadan",
        startDate: new Date('2026-03-21'),
        endDate: new Date('2026-03-23'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Adha",
        description: "Festival of Sacrifice",
        startDate: new Date('2026-05-28'),
        endDate: new Date('2026-05-30'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Ashura",
        description: "Day of mourning for Imam Hussain",
        startDate: new Date('2026-06-25'),
        endDate: new Date('2026-06-26'),
        type: 'RELIGIOUS',
        isRecurring: true
      },

      // 2027 Holidays
      {
        name: "New Year's Day",
        description: "First day of the Gregorian calendar year",
        startDate: new Date('2027-01-01'),
        endDate: new Date('2027-01-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Kashmir Day",
        description: "Day to show solidarity with the people of Kashmir",
        startDate: new Date('2027-02-05'),
        endDate: new Date('2027-02-05'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Pakistan Day",
        description: "Commemorates the Lahore Resolution and the adoption of the first constitution",
        startDate: new Date('2027-03-23'),
        endDate: new Date('2027-03-23'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Labour Day",
        description: "International Workers' Day",
        startDate: new Date('2027-05-01'),
        endDate: new Date('2027-05-01'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Independence Day",
        description: "Celebrates the independence of Pakistan from British rule",
        startDate: new Date('2027-08-14'),
        endDate: new Date('2027-08-14'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Iqbal Day",
        description: "Birthday of Allama Iqbal, the national poet and philosopher",
        startDate: new Date('2027-11-09'),
        endDate: new Date('2027-11-09'),
        type: 'NATIONAL',
        isRecurring: true
      },
      {
        name: "Quaid-e-Azam Birthday",
        description: "Birthday of Muhammad Ali Jinnah, founder of Pakistan",
        startDate: new Date('2027-12-25'),
        endDate: new Date('2027-12-25'),
        type: 'NATIONAL',
        isRecurring: true
      },

      // Islamic Holidays 2027 (approximate dates)
      {
        name: "Mawlid un Nabi",
        description: "Birthday of Prophet Muhammad (PBUH)",
        startDate: new Date('2027-08-15'),
        endDate: new Date('2027-08-15'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Fitr",
        description: "Festival marking the end of Ramadan",
        startDate: new Date('2027-03-10'),
        endDate: new Date('2027-03-12'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Eid ul Adha",
        description: "Festival of Sacrifice",
        startDate: new Date('2027-05-17'),
        endDate: new Date('2027-05-19'),
        type: 'RELIGIOUS',
        isRecurring: true
      },
      {
        name: "Ashura",
        description: "Day of mourning for Imam Hussain",
        startDate: new Date('2027-06-14'),
        endDate: new Date('2027-06-15'),
        type: 'RELIGIOUS',
        isRecurring: true
      }
    ];
  }

  /**
   * Seed Pakistan holidays into the database
   */
  async seedPakistanHolidays(): Promise<{ created: number; updated: number; errors: string[] }> {
    const holidays = this.getPakistanHolidays();
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const holiday of holidays) {
      try {
        const existing = await this.prisma.holiday.findFirst({
          where: {
            name: holiday.name,
            startDate: holiday.startDate
          }
        });

        if (existing) {
          await this.prisma.holiday.update({
            where: { id: existing.id },
            data: {
              description: holiday.description,
              endDate: holiday.endDate,
              type: holiday.type,

              status: SystemStatus.ACTIVE
            }
          });
          updated++;
        } else {
          await this.prisma.holiday.create({
            data: {
              name: holiday.name,
              description: holiday.description,
              startDate: holiday.startDate,
              endDate: holiday.endDate,
              type: holiday.type,
              affectsAll: true,
              status: SystemStatus.ACTIVE,
              createdBy: 'system' // System-generated holidays
            }
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to process holiday ${holiday.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Get holidays for a specific year
   */
  getHolidaysForYear(year: number): PakistanHoliday[] {
    return this.getPakistanHolidays().filter(holiday => 
      holiday.startDate.getFullYear() === year
    );
  }

  /**
   * Get religious holidays (Islamic calendar based)
   */
  getReligiousHolidays(): PakistanHoliday[] {
    return this.getPakistanHolidays().filter(holiday => 
      holiday.type === 'RELIGIOUS'
    );
  }

  /**
   * Get national holidays
   */
  getNationalHolidays(): PakistanHoliday[] {
    return this.getPakistanHolidays().filter(holiday => 
      holiday.type === 'NATIONAL'
    );
  }
}
