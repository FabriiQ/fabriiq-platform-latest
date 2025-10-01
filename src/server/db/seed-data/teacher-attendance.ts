import { PrismaClient } from '@prisma/client';
import { AttendanceStatusType } from '../../api/constants';

export async function seedTeacherAttendance(
  prisma: PrismaClient,
  teachers: any[],
  campuses: any[]
) {
  console.log('Seeding teacher attendance data...');

  // Get the first campus for seeding
  const boysCampus = campuses.find(c => c.code === 'SIS-BOYS');
  const girlsCampus = campuses.find(c => c.code === 'SIS-GIRLS');

  if (!boysCampus || !girlsCampus) {
    console.warn('Campuses not found. Skipping teacher attendance seeding.');
    return;
  }

  // Get teachers for each campus
  const boysTeachers = teachers.filter(t => 
    t.campusCode === 'SIS-BOYS' || (t.campusCodes && t.campusCodes.includes('SIS-BOYS'))
  );
  const girlsTeachers = teachers.filter(t => 
    t.campusCode === 'SIS-GIRLS' || (t.campusCodes && t.campusCodes.includes('SIS-GIRLS'))
  );

  // Seed attendance for the past 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  // Generate attendance for boys campus
  await seedCampusTeacherAttendance(
    prisma,
    boysCampus.id,
    boysTeachers,
    startDate,
    endDate
  );

  // Generate attendance for girls campus
  await seedCampusTeacherAttendance(
    prisma,
    girlsCampus.id,
    girlsTeachers,
    startDate,
    endDate
  );

  console.log('Teacher attendance data seeding completed');
}

async function seedCampusTeacherAttendance(
  prisma: PrismaClient,
  campusId: string,
  teachers: any[],
  startDate: Date,
  endDate: Date
) {
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    for (const teacher of teachers) {
      // Find teacher profile
      const teacherProfile = await prisma.teacherProfile.findFirst({
        where: {
          user: {
            email: teacher.email
          }
        }
      });

      if (!teacherProfile) {
        console.warn(`Teacher profile not found for ${teacher.email}`);
        continue;
      }

      // Generate random attendance status (90% present, 5% late, 3% absent, 2% excused)
      const random = Math.random();
      let status: AttendanceStatusType;
      let checkInTime: Date | null = null;
      let checkOutTime: Date | null = null;
      let remarks: string | null = null;

      if (random < 0.90) {
        status = AttendanceStatusType.PRESENT;
        // Check in between 7:30 AM and 8:30 AM
        checkInTime = new Date(currentDate);
        checkInTime.setHours(7, 30 + Math.floor(Math.random() * 60), 0, 0);
        // Check out between 3:00 PM and 4:00 PM
        checkOutTime = new Date(currentDate);
        checkOutTime.setHours(15, Math.floor(Math.random() * 60), 0, 0);
      } else if (random < 0.95) {
        status = AttendanceStatusType.LATE;
        // Check in between 8:30 AM and 9:30 AM
        checkInTime = new Date(currentDate);
        checkInTime.setHours(8, 30 + Math.floor(Math.random() * 60), 0, 0);
        // Check out between 3:00 PM and 4:00 PM
        checkOutTime = new Date(currentDate);
        checkOutTime.setHours(15, Math.floor(Math.random() * 60), 0, 0);
        remarks = 'Traffic delay';
      } else if (random < 0.98) {
        status = AttendanceStatusType.ABSENT;
        remarks = 'Sick leave';
      } else {
        status = AttendanceStatusType.EXCUSED;
        remarks = 'Personal emergency';
      }

      // Create attendance record
      try {
        await prisma.teacherAttendance.upsert({
          where: {
            teacherId_date: {
              teacherId: teacherProfile.id,
              date: new Date(currentDate)
            }
          },
          update: {
            status,
            checkInTime,
            checkOutTime,
            remarks
          },
          create: {
            teacherId: teacherProfile.id,
            campusId,
            date: new Date(currentDate),
            status,
            checkInTime,
            checkOutTime,
            remarks
          }
        });
      } catch (error) {
        console.warn(`Failed to create attendance for ${teacher.email} on ${currentDate.toDateString()}:`, error);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
}
