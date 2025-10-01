#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { seedTeacherAttendance } from '../src/server/db/seed-data/teacher-attendance';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting teacher attendance seeding...');

    // Get existing teachers and campuses
    const teachers = await prisma.user.findMany({
      where: {
        userType: 'TEACHER',
        status: 'ACTIVE',
      },
      include: {
        teacherProfile: true,
        activeCampuses: {
          include: {
            campus: true,
          },
        },
      },
    });

    const campuses = await prisma.campus.findMany({
      where: {
        status: 'ACTIVE',
      },
    });

    console.log(`Found ${teachers.length} teachers and ${campuses.length} campuses`);

    if (teachers.length === 0) {
      console.log('No teachers found. Please run the main seed script first.');
      return;
    }

    if (campuses.length === 0) {
      console.log('No campuses found. Please run the main seed script first.');
      return;
    }

    // Transform teachers data to match the expected format
    const teachersData = teachers.map(teacher => {
      const primaryCampus = teacher.activeCampuses.find(ac => ac.campus.id === teacher.primaryCampusId);
      const allCampuses = teacher.activeCampuses.map(ac => ac.campus.code);
      
      return {
        email: teacher.email,
        name: teacher.name,
        campusCode: primaryCampus?.campus.code,
        campusCodes: allCampuses.length > 1 ? allCampuses : undefined,
      };
    });

    // Seed teacher attendance
    await seedTeacherAttendance(prisma, teachersData, campuses);

    console.log('Teacher attendance seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding teacher attendance:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
