/**
 * Pakistan Holidays Seed Script
 * Seeds Pakistan public holidays for 2025-2027 with accurate dates
 */

import { PrismaClient } from '@prisma/client';
import { HolidaySeedService } from '../src/server/api/services/holiday-seed.service';

const prisma = new PrismaClient();

const pakistanHolidays2025 = [
  // National Holidays
  { name: "Kashmir Day", startDate: new Date(2025, 1, 5), endDate: new Date(2025, 1, 5), type: "NATIONAL" as const, description: "Solidarity with Kashmir" },
  { name: "Pakistan Day", startDate: new Date(2025, 2, 23), endDate: new Date(2025, 2, 23), type: "NATIONAL" as const, description: "Pakistan Resolution Day" },
  { name: "Labour Day", startDate: new Date(2025, 4, 1), endDate: new Date(2025, 4, 1), type: "NATIONAL" as const, description: "International Workers' Day" },
  { name: "Independence Day", startDate: new Date(2025, 7, 14), endDate: new Date(2025, 7, 14), type: "NATIONAL" as const, description: "Pakistan Independence Day" },
  { name: "Iqbal Day", startDate: new Date(2025, 10, 9), endDate: new Date(2025, 10, 9), type: "NATIONAL" as const, description: "Birth anniversary of Allama Iqbal" },
  { name: "Quaid-e-Azam Birthday", startDate: new Date(2025, 11, 25), endDate: new Date(2025, 11, 25), type: "NATIONAL" as const, description: "Birth anniversary of Muhammad Ali Jinnah" },

  // Religious Holidays (Islamic - approximate dates, may vary by moon sighting)
  { name: "Eid ul-Fitr", startDate: new Date(2025, 2, 30), endDate: new Date(2025, 3, 1), type: "RELIGIOUS" as const, description: "End of Ramadan celebration" },
  { name: "Eid ul-Adha", startDate: new Date(2025, 5, 6), endDate: new Date(2025, 5, 8), type: "RELIGIOUS" as const, description: "Festival of Sacrifice" },
  { name: "Ashura (9th Muharram)", startDate: new Date(2025, 6, 5), endDate: new Date(2025, 6, 5), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Ashura (10th Muharram)", startDate: new Date(2025, 6, 6), endDate: new Date(2025, 6, 6), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Eid Milad-un-Nabi", startDate: new Date(2025, 8, 5), endDate: new Date(2025, 8, 5), type: "RELIGIOUS" as const, description: "Prophet Muhammad's Birthday" },
];

const pakistanHolidays2026 = [
  // National Holidays
  { name: "Kashmir Day", startDate: new Date(2026, 1, 5), endDate: new Date(2026, 1, 5), type: "NATIONAL" as const, description: "Solidarity with Kashmir" },
  { name: "Pakistan Day", startDate: new Date(2026, 2, 23), endDate: new Date(2026, 2, 23), type: "NATIONAL" as const, description: "Pakistan Resolution Day" },
  { name: "Labour Day", startDate: new Date(2026, 4, 1), endDate: new Date(2026, 4, 1), type: "NATIONAL" as const, description: "International Workers' Day" },
  { name: "Independence Day", startDate: new Date(2026, 7, 14), endDate: new Date(2026, 7, 14), type: "NATIONAL" as const, description: "Pakistan Independence Day" },
  { name: "Iqbal Day", startDate: new Date(2026, 10, 9), endDate: new Date(2026, 10, 9), type: "NATIONAL" as const, description: "Birth anniversary of Allama Iqbal" },
  { name: "Quaid-e-Azam Birthday", startDate: new Date(2026, 11, 25), endDate: new Date(2026, 11, 25), type: "NATIONAL" as const, description: "Birth anniversary of Muhammad Ali Jinnah" },

  // Religious Holidays (Islamic - approximate dates)
  { name: "Eid ul-Fitr", startDate: new Date(2026, 2, 20), endDate: new Date(2026, 2, 21), type: "RELIGIOUS" as const, description: "End of Ramadan celebration" },
  { name: "Eid ul-Adha", startDate: new Date(2026, 4, 27), endDate: new Date(2026, 4, 29), type: "RELIGIOUS" as const, description: "Festival of Sacrifice" },
  { name: "Ashura (9th Muharram)", startDate: new Date(2026, 5, 25), endDate: new Date(2026, 5, 25), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Ashura (10th Muharram)", startDate: new Date(2026, 5, 26), endDate: new Date(2026, 5, 26), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Eid Milad-un-Nabi", startDate: new Date(2026, 7, 24), endDate: new Date(2026, 7, 24), type: "RELIGIOUS" as const, description: "Prophet Muhammad's Birthday" },
];

const pakistanHolidays2027 = [
  // National Holidays
  { name: "Kashmir Day", startDate: new Date(2027, 1, 5), endDate: new Date(2027, 1, 5), type: "NATIONAL" as const, description: "Solidarity with Kashmir" },
  { name: "Pakistan Day", startDate: new Date(2027, 2, 23), endDate: new Date(2027, 2, 23), type: "NATIONAL" as const, description: "Pakistan Resolution Day" },
  { name: "Labour Day", startDate: new Date(2027, 4, 1), endDate: new Date(2027, 4, 1), type: "NATIONAL" as const, description: "International Workers' Day" },
  { name: "Independence Day", startDate: new Date(2027, 7, 14), endDate: new Date(2027, 7, 14), type: "NATIONAL" as const, description: "Pakistan Independence Day" },
  { name: "Iqbal Day", startDate: new Date(2027, 10, 9), endDate: new Date(2027, 10, 9), type: "NATIONAL" as const, description: "Birth anniversary of Allama Iqbal" },
  { name: "Quaid-e-Azam Birthday", startDate: new Date(2027, 11, 25), endDate: new Date(2027, 11, 25), type: "NATIONAL" as const, description: "Birth anniversary of Muhammad Ali Jinnah" },

  // Religious Holidays (Islamic - approximate dates)
  { name: "Eid ul-Fitr", startDate: new Date(2027, 2, 9), endDate: new Date(2027, 2, 10), type: "RELIGIOUS" as const, description: "End of Ramadan celebration" },
  { name: "Eid ul-Adha", startDate: new Date(2027, 4, 16), endDate: new Date(2027, 4, 18), type: "RELIGIOUS" as const, description: "Festival of Sacrifice" },
  { name: "Ashura (9th Muharram)", startDate: new Date(2027, 5, 14), endDate: new Date(2027, 5, 14), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Ashura (10th Muharram)", startDate: new Date(2027, 5, 15), endDate: new Date(2027, 5, 15), type: "RELIGIOUS" as const, description: "Day of Ashura" },
  { name: "Eid Milad-un-Nabi", startDate: new Date(2027, 7, 14), endDate: new Date(2027, 7, 14), type: "RELIGIOUS" as const, description: "Prophet Muhammad's Birthday" },
];

async function seedPakistanHolidays() {
  console.log('🌟 Starting Pakistan holidays seeding...');
  
  try {
    const holidayService = new HolidaySeedService({ prisma });
    
    // Combine all years
    const allHolidays = [
      ...pakistanHolidays2025,
      ...pakistanHolidays2026,
      ...pakistanHolidays2027
    ];

    console.log(`📅 Seeding holidays for 2025-2027...`);

    const result = await holidayService.seedAllHolidays();
    
    console.log('✅ Pakistan holidays seeding completed successfully!');
    console.log(`📊 Results: ${result.created} created, ${result.updated} updated, ${result.errors.length} errors`);
    
    if (result.errors.length > 0) {
      console.log('❌ Errors encountered:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error seeding Pakistan holidays:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedPakistanHolidays();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedPakistanHolidays, pakistanHolidays2025, pakistanHolidays2026, pakistanHolidays2027 };
