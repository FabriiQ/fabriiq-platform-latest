import { PrismaClient, SystemStatus } from '@prisma/client';

export const classesSeedData: Array<{name:string;code:string;courseCode:string;campusCode:string;minCapacity:number;maxCapacity:number;status:SystemStatus;}> = [
  // Will be dynamically populated for MYP after ensuring campuses and courses exist
];

export async function seedClasses(prisma: PrismaClient, programCampuses: any[], users: any[]) {
  console.log('Seeding classes...');

  // Find teacher profiles to assign as class teachers
  const teacherProfiles = await prisma.teacherProfile.findMany({
    include: {
      user: true,
    },
  });

  if (teacherProfiles.length === 0) {
    console.warn('No teacher profiles found. Classes will be created without class teachers.');
  }

  // Find terms
  const terms = await prisma.term.findMany({
    where: {
      status: SystemStatus.ACTIVE,
    },
  });

  if (terms.length === 0) {
    console.warn('No terms found. Skipping class seeding.');
    return [];
  }

  // Use the first term
  const term = terms[0];

  // Find course campuses
  let courseCampuses = await prisma.courseCampus.findMany({
    where: {
      status: SystemStatus.ACTIVE,
    },
  });

  if (courseCampuses.length === 0) {
    console.warn('No course campuses found. Creating course campuses for each program campus.');

    // Find courses (MYP only)
    const courses = await prisma.course.findMany({
      where: {
        status: SystemStatus.ACTIVE,
        code: { startsWith: 'MYP-' }
      },
    });

    if (courses.length === 0) {
      console.warn('No MYP courses found. Skipping class seeding.');
      return [];
    }

    // Create course campuses for each program campus
    const createdCourseCampuses: any[] = [];

    for (const programCampus of programCampuses) {
      if (!programCampus.campusId) {
        console.warn(`Program campus ${programCampus.id} has no campusId. Skipping course campus creation.`);
        continue;
      }

      for (const course of courses) {
        try {
          const courseCampus = await prisma.courseCampus.create({
            data: {
              courseId: course.id,
              campusId: programCampus.campusId,
              programCampusId: programCampus.id,
              startDate: new Date('2024-08-01'),
              endDate: new Date('2025-06-30'),
              status: SystemStatus.ACTIVE,
            },
          });

          createdCourseCampuses.push(courseCampus);
        } catch (error) {
          console.warn(`Error creating course campus: ${error}`);
        }
      }
    }

    if (createdCourseCampuses.length === 0) {
      console.warn('Failed to create course campuses. Skipping class seeding.');
      return [];
    }

    courseCampuses = createdCourseCampuses;
    console.log(`Created ${createdCourseCampuses.length} course campuses`);
  }

  const createdClasses: any[] = [];

  // Generate 3 classes (A, B, C) for each courseCampus per campus
  for (const courseCampus of courseCampuses) {
    // Resolve campus and course codes for naming
    const campus = await prisma.campus.findUnique({ where: { id: courseCampus.campusId } });
    const course = await prisma.course.findUnique({ where: { id: courseCampus.courseId } });
    if (!campus || !course) continue;

    // Find a program campus for this campus
    const programCampus = programCampuses.find(pc => pc.campusId === campus.id);
    if (!programCampus) continue;

    const sections = ['A','B','C'];
    for (const section of sections) {
      const code = `${campus.code}-${course.code.replace('MYP-','')}-${section}`; // e.g., SIS-BOYS-Y7-A
      const name = `${course.name} ${section}`; // e.g., Year 7 A

      // Find a teacher randomly
      let classTeacherId: string | null = null;
      if (teacherProfiles.length > 0) {
        const randomTeacher = teacherProfiles[Math.floor(Math.random() * teacherProfiles.length)];
        classTeacherId = randomTeacher.id;
      }

      const createdClass = await prisma.class.upsert({
        where: { code },
        update: {
          name,
          code,
          campusId: campus.id,
          courseCampusId: courseCampus.id,
          termId: term.id,
          classTeacherId,
          programCampusId: programCampus.id,
          minCapacity: 1,
          maxCapacity: 30,
        },
        create: {
          name,
          code,
          campusId: campus.id,
          courseCampusId: courseCampus.id,
          termId: term.id,
          classTeacherId,
          programCampusId: programCampus.id,
          minCapacity: 1,
          maxCapacity: 30,
          currentCount: 0,
        },
      });

      createdClasses.push(createdClass);
    }
  }

  console.log(`Seeded ${createdClasses.length} classes`);
  return createdClasses;
}
