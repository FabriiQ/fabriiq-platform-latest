import { PrismaClient, SystemStatus } from '@prisma/client';

export const programsSeedData = [
  {
    name: 'Middle Years Program',
    code: 'MYP',
    status: SystemStatus.ACTIVE,
    institutionCode: 'SIS',
  },
];

export const coursesSeedData = [
  // Two courses within Middle Years Program
  {
    name: 'Year 7',
    code: 'MYP-Y7',
    description: 'Middle Years Program Year 7 curriculum',
    credits: 5,
    status: SystemStatus.ACTIVE,
    programCode: 'MYP',
  },
  {
    name: 'Year 8',
    code: 'MYP-Y8',
    description: 'Middle Years Program Year 8 curriculum',
    credits: 5,
    status: SystemStatus.ACTIVE,
    programCode: 'MYP',
  },
];

export async function seedPrograms(prisma: PrismaClient, institutions: any[], campuses: any[], academicCycles: any[]) {
  console.log('Seeding programs...');

  const createdPrograms: any[] = [];

  for (const program of programsSeedData) {
    const { institutionCode, ...programData } = program;

    // Find the institution by code
    const institution = institutions.find(i => i.code === institutionCode);

    if (!institution) {
      console.warn(`Institution with code ${institutionCode} not found. Skipping program ${program.code}`);
      continue;
    }

    const createdProgram = await prisma.program.upsert({
      where: { code: program.code },
      update: {
        name: programData.name,
        status: programData.status,
        institution: { connect: { id: institution.id } },
      },
      create: {
        code: program.code,
        name: programData.name,
        status: programData.status,
        institution: { connect: { id: institution.id } },
        type: 'STANDARD',
        duration: 12,
        level: 1,
      },
    });

    createdPrograms.push(createdProgram);
  }

  console.log(`Seeded ${createdPrograms.length} programs`);
  // Seed courses
  const courses = await seedCourses(prisma, createdPrograms);

  // Seed program campuses
  const programCampuses = await seedProgramCampuses(prisma, createdPrograms, campuses, academicCycles);

  // Seed course campuses
  const courseCampuses = await seedCourseCampuses(prisma, courses, campuses);

  // Fetch the complete program campus objects with campusId
  const completeProgramCampuses = await prisma.programCampus.findMany({
    where: {
      id: {
        in: programCampuses.map(pc => pc.id)
      }
    },
    include: {
      campus: true,
      program: true
    }
  });

  // Map the program campuses to include the campusId directly
  const enrichedProgramCampuses = completeProgramCampuses.map(pc => ({
    ...pc,
    campusId: pc.campusId,
    programId: pc.programId,
    campusCode: pc.campus?.code,
    programCode: pc.program?.code
  }));

  return {
    programs: createdPrograms,
    courses,
    programCampuses: enrichedProgramCampuses,
    courseCampuses
  };
}

export async function seedCourses(prisma: PrismaClient, programs: any[]) {
  console.log('Seeding courses...');

  const createdCourses: any[] = [];

  for (const course of coursesSeedData) {
    const { programCode, ...courseData } = course;

    // Find the program by code
    const program = programs.find(p => p.code === programCode);

    if (!program) {
      console.warn(`Program with code ${programCode} not found. Skipping course ${course.code}`);
      continue;
    }

    const createdCourse = await prisma.course.upsert({
      where: { code: course.code },
      update: {
        ...courseData,
        programId: program.id,
      },
      create: {
        ...courseData,
        programId: program.id,
      },
    });

    createdCourses.push(createdCourse);
  }

  console.log(`Seeded ${createdCourses.length} courses`);
  return createdCourses;
}

export const programCampusesSeedData = [
  {
    programCode: 'MYP',
    campusCode: 'SIS-BOYS',
    code: 'MYP-SIS-BOYS',
    academicCycleCode: 'AY-2024-2025',
    status: SystemStatus.ACTIVE,
  },
  {
    programCode: 'MYP',
    campusCode: 'SIS-GIRLS',
    code: 'MYP-SIS-GIRLS',
    academicCycleCode: 'AY-2024-2025',
    status: SystemStatus.ACTIVE,
  },
  {
    programCode: 'MYP',
    campusCode: 'SIS-CENTRAL',
    code: 'MYP-SIS-CENTRAL',
    academicCycleCode: 'AY-2024-2025',
    status: SystemStatus.ACTIVE,
  },
];

export async function seedProgramCampuses(prisma: PrismaClient, programs: any[], campuses: any[], academicCycles: any[]) {
  console.log('Seeding program-campus associations...');

  const createdProgramCampuses: any[] = [];
  const currentAcademicCycle = academicCycles[0]; // Academic Year 2024-2025

  if (!currentAcademicCycle) {
    console.warn('No academic cycle found. Skipping program-campus associations.');
    return [];
  }

  // Associate the Middle Years Program with all campuses
  const primaryProgram = programs.find(p => p.code === 'MYP');

  if (!primaryProgram) {
    console.warn('Middle Years Program not found. Skipping program-campus associations.');
    return [];
  }

  for (const programCampusData of programCampusesSeedData) {
    // Find the program by code
    const program = programs.find(p => p.code === programCampusData.programCode);

    if (!program) {
      console.warn(`Program with code ${programCampusData.programCode} not found. Skipping program-campus ${programCampusData.code}`);
      continue;
    }

    // Find the campus by code
    const campus = campuses.find(c => c.code === programCampusData.campusCode);

    if (!campus) {
      console.warn(`Campus with code ${programCampusData.campusCode} not found. Skipping program-campus ${programCampusData.code}`);
      continue;
    }

    // Create or update the program-campus association
    const programCampus = await prisma.programCampus.upsert({
      where: {
        programId_campusId: {
          programId: program.id,
          campusId: campus.id,
        }
      },
      update: {
        status: programCampusData.status,
      },
      create: {
        programId: program.id,
        campusId: campus.id,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2025-06-30'),
        status: programCampusData.status,
      },
    });

    createdProgramCampuses.push(programCampus);
  }

  console.log(`Seeded ${createdProgramCampuses.length} program-campus associations`);
  return createdProgramCampuses;
}

export async function seedCourseCampuses(prisma: PrismaClient, courses: any[], campuses: any[]) {
  console.log('Seeding course-campus associations...');

  const createdCourseCampuses: any[] = [];
  const classCourses = courses.filter(c => c.code.startsWith('MYP-'));

  if (classCourses.length === 0) {
    console.warn('MYP courses not found. Skipping course-campus associations.');
    return [];
  }

  // Get program campuses
  const programCampuses = await prisma.programCampus.findMany({
    where: {
      status: SystemStatus.ACTIVE
    },
    include: {
      program: true,
      campus: true
    }
  });

  if (programCampuses.length === 0) {
    console.warn('No program campuses found. Skipping course-campus associations.');
    return [];
  }

  for (const campus of campuses) {
    // Find program campus for this campus
    const programCampus = programCampuses.find(pc => pc.campusId === campus.id);

    if (!programCampus) {
      console.warn(`No program campus found for campus ${campus.code}. Skipping course-campus association.`);
      continue;
    }

    for (const course of classCourses) {
      const courseCampus = await prisma.courseCampus.upsert({
        where: {
          courseId_campusId_programCampusId: {
            courseId: course.id,
            campusId: programCampus.campusId,
            programCampusId: programCampus.id,
          },
        },
        update: {
          status: SystemStatus.ACTIVE,
        },
        create: {
          courseId: course.id,
          campusId: programCampus.campusId,
          programCampusId: programCampus.id,
          startDate: new Date('2024-08-01'),
          endDate: new Date('2025-06-30'),
          status: SystemStatus.ACTIVE,
        },
      });

      createdCourseCampuses.push(courseCampus);
    }
  }

  console.log(`Seeded ${createdCourseCampuses.length} course-campus associations`);
  return createdCourseCampuses;
}
