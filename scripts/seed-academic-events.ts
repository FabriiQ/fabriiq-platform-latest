/**
 * Academic Events and Schedule Patterns Seed Script
 * Creates sample academic events and schedule patterns for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample academic events for 2025
const academicEvents2025 = [
  {
    name: "Spring Semester Registration",
    description: "Registration period for Spring 2025 semester",
    startDate: new Date(2025, 0, 15), // January 15
    endDate: new Date(2025, 0, 31),   // January 31
    type: "REGISTRATION" as const
  },
  {
    name: "Spring Semester Classes Begin",
    description: "First day of Spring 2025 classes",
    startDate: new Date(2025, 1, 3),  // February 3
    endDate: new Date(2025, 1, 3),
    type: "OTHER" as const
  },
  {
    name: "Add/Drop Period",
    description: "Course add/drop period for Spring 2025",
    startDate: new Date(2025, 1, 3),  // February 3
    endDate: new Date(2025, 1, 17),   // February 17
    type: "ADD_DROP" as const
  },
  {
    name: "Mid-Term Examinations",
    description: "Mid-term examination period",
    startDate: new Date(2025, 3, 7),  // April 7
    endDate: new Date(2025, 3, 18),   // April 18
    type: "EXAMINATION" as const
  },
  {
    name: "Spring Break",
    description: "Spring semester break",
    startDate: new Date(2025, 3, 21), // April 21
    endDate: new Date(2025, 3, 25),   // April 25
    type: "OTHER" as const
  },
  {
    name: "Final Examinations",
    description: "Final examination period for Spring 2025",
    startDate: new Date(2025, 4, 26), // May 26
    endDate: new Date(2025, 5, 6),    // June 6
    type: "EXAMINATION" as const
  },
  {
    name: "Graduation Ceremony",
    description: "Spring 2025 graduation ceremony",
    startDate: new Date(2025, 5, 15), // June 15
    endDate: new Date(2025, 5, 15),
    type: "GRADUATION" as const
  },
  {
    name: "Summer Session Registration",
    description: "Registration for Summer 2025 session",
    startDate: new Date(2025, 4, 1),  // May 1
    endDate: new Date(2025, 4, 20),   // May 20
    type: "REGISTRATION" as const
  },
  {
    name: "Fall Semester Registration",
    description: "Registration period for Fall 2025 semester",
    startDate: new Date(2025, 6, 1),  // July 1
    endDate: new Date(2025, 7, 15),   // August 15
    type: "REGISTRATION" as const
  },
  {
    name: "Fall Orientation Week",
    description: "New student orientation for Fall 2025",
    startDate: new Date(2025, 7, 25), // August 25
    endDate: new Date(2025, 7, 29),   // August 29
    type: "ORIENTATION" as const
  }
];

// Sample schedule patterns
const schedulePatterns = [
  {
    name: "Standard 5-Day Week",
    description: "Monday to Friday schedule pattern",
    daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    startTime: "08:00",
    endTime: "17:00",
    recurrence: "WEEKLY" as const,
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 11, 31)
  },
  {
    name: "6-Day Week (Sat Weekend)",
    description: "Monday to Saturday with Sunday weekend",
    daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    startTime: "08:00",
    endTime: "17:00",
    recurrence: "WEEKLY" as const,
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 11, 31)
  },
  {
    name: "6-Day Week (Fri Weekend)",
    description: "Saturday to Thursday with Friday weekend",
    daysOfWeek: ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
    startTime: "08:00",
    endTime: "17:00",
    recurrence: "WEEKLY" as const,
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 11, 31)
  },
  {
    name: "Flexible 4-Day Week",
    description: "Tuesday to Friday schedule pattern",
    daysOfWeek: ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    startTime: "09:00",
    endTime: "18:00",
    recurrence: "WEEKLY" as const,
    startDate: new Date(2025, 0, 1),
    endDate: new Date(2025, 11, 31)
  }
];

async function seedAcademicEvents() {
  console.log('📚 Starting academic events seeding...');
  
  try {
    // Get or create a system user for events
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@school.edu' }
    });

    // Get first institution for events
    const institution = await prisma.institution.findFirst();
    if (!institution) {
      throw new Error('No institution found. Please seed institutions first.');
    }

    if (!systemUser) {
      console.log('Creating system user...');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@school.edu',
          username: 'system-admin',
          name: 'System Administrator',
          userType: 'SYSTEM_ADMIN',
          status: 'ACTIVE',
          institution: {
            connect: { id: institution.id }
          }
        }
      });
    }

    // Get or create an academic cycle for events
    let academicCycle = await prisma.academicCycle.findFirst({
      where: { institutionId: institution.id }
    });

    if (!academicCycle) {
      console.log('Creating default academic cycle...');
      academicCycle = await prisma.academicCycle.create({
        data: {
          code: 'AY2025',
          name: 'Academic Year 2025',
          description: 'Default academic year for 2025',
          startDate: new Date(2025, 0, 1),
          endDate: new Date(2025, 11, 31),
          duration: 365, // Duration in days
          type: 'ACADEMIC_YEAR',
          status: 'ACTIVE',
          institutionId: institution.id,
          createdBy: systemUser.id
        }
      });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const event of academicEvents2025) {
      try {
        const existing = await prisma.academicCalendarEvent.findFirst({
          where: {
            name: event.name,
            startDate: event.startDate
          }
        });

        if (existing) {
          await prisma.academicCalendarEvent.update({
            where: { id: existing.id },
            data: {
              description: event.description,
              endDate: event.endDate,
              type: event.type
            }
          });
          updated++;
        } else {
          await prisma.academicCalendarEvent.create({
            data: {
              name: event.name,
              description: event.description,
              startDate: event.startDate,
              endDate: event.endDate,
              type: event.type,
              createdBy: systemUser.id,
              academicCycleId: academicCycle.id,
              status: 'ACTIVE'
            }
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to process event ${event.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Academic events seeding completed: ${created} created, ${updated} updated, ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    return { created, updated, errors };
  } catch (error) {
    console.error('❌ Error seeding academic events:', error);
    throw error;
  }
}

async function seedSchedulePatterns() {
  console.log('⏰ Starting schedule patterns seeding...');
  
  try {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const pattern of schedulePatterns) {
      try {
        const existing = await prisma.schedulePattern.findFirst({
          where: { name: pattern.name }
        });

        if (existing) {
          await prisma.schedulePattern.update({
            where: { id: existing.id },
            data: {
              description: pattern.description,
              daysOfWeek: pattern.daysOfWeek,
              startTime: pattern.startTime,
              endTime: pattern.endTime,
              recurrence: pattern.recurrence,
              endDate: pattern.endDate
            }
          });
          updated++;
        } else {
          await prisma.schedulePattern.create({
            data: {
              name: pattern.name,
              description: pattern.description,
              daysOfWeek: pattern.daysOfWeek,
              startTime: pattern.startTime,
              endTime: pattern.endTime,
              recurrence: pattern.recurrence,
              startDate: pattern.startDate,
              endDate: pattern.endDate,
              status: 'ACTIVE'
            }
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to process pattern ${pattern.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Schedule patterns seeding completed: ${created} created, ${updated} updated, ${errors.length} errors`);
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    return { created, updated, errors };
  } catch (error) {
    console.error('❌ Error seeding schedule patterns:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting academic data seeding...');
    
    const eventsResult = await seedAcademicEvents();
    const patternsResult = await seedSchedulePatterns();
    
    console.log('🎉 All academic data seeding completed successfully!');
    console.log(`📊 Total: ${eventsResult.created + patternsResult.created} created, ${eventsResult.updated + patternsResult.updated} updated`);
    
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

export { seedAcademicEvents, seedSchedulePatterns, academicEvents2025, schedulePatterns };
