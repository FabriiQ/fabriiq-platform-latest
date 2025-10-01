import { PrismaClient, SystemStatus } from '@prisma/client';

export const subjectsSeedData = [
  // 10 life-learning, personality-building subjects for MYP Year 7 and Year 8
  { code: 'MYP-Y7-ENG', name: 'English Language & Communication (Y7)', credits: 1.0, courseCode: 'MYP-Y7', syllabus: { overview: 'Developing language, communication and expression skills.', objectives: ['Reading for meaning', 'Writing structure and clarity', 'Speaking & listening'], assessmentMethods: ['Comprehension', 'Writing portfolio', 'Presentations'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y7-MATH', name: 'Mathematics & Logical Thinking (Y7)', credits: 1.0, courseCode: 'MYP-Y7', syllabus: { overview: 'Numeracy, reasoning, and problem-solving.', objectives: ['Algebraic thinking', 'Number sense', 'Geometry intuition'], assessmentMethods: ['Quizzes', 'Projects', 'Unit tests'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y7-SCI', name: 'Integrated Science & Inquiry (Y7)', credits: 1.0, courseCode: 'MYP-Y7', syllabus: { overview: 'Scientific literacy and curiosity.', objectives: ['Observation', 'Hypothesis and experiment', 'Reporting'], assessmentMethods: ['Lab work', 'Reports', 'MCQs'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y7-PE', name: 'Physical Education & Wellbeing (Y7)', credits: 0.5, courseCode: 'MYP-Y7', syllabus: { overview: 'Fitness, teamwork and wellness habits.', objectives: ['Movement skills', 'Teamwork', 'Healthy routines'], assessmentMethods: ['Skill checks', 'Participation', 'Fitness logs'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y7-LL', name: 'Life & Learning Skills (Y7)', credits: 0.5, courseCode: 'MYP-Y7', syllabus: { overview: 'Study skills, digital citizenship, growth mindset.', objectives: ['Organization', 'Responsible tech use', 'Resilience'], assessmentMethods: ['Reflections', 'Projects', 'Checklists'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y8-ENGL', name: 'English Language & Communication (Y8)', credits: 1.0, courseCode: 'MYP-Y8', syllabus: { overview: 'Advanced literacy and expression.', objectives: ['Argumentative writing', 'Literary analysis', 'Discussion'], assessmentMethods: ['Essays', 'Oral work', 'Unit tests'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y8-MATH', name: 'Mathematics & Logical Thinking (Y8)', credits: 1.0, courseCode: 'MYP-Y8', syllabus: { overview: 'Algebra foundations and geometry.', objectives: ['Linear equations', 'Ratios & proportions', 'Angles & similarity'], assessmentMethods: ['Quizzes', 'Projects', 'Unit tests'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y8-SCI', name: 'Integrated Science & Inquiry (Y8)', credits: 1.0, courseCode: 'MYP-Y8', syllabus: { overview: 'Applied science and reporting.', objectives: ['Data & variables', 'Energy & forces', 'Ecology basics'], assessmentMethods: ['Labs', 'Reports', 'MCQs'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y8-PE', name: 'Physical Education & Wellbeing (Y8)', credits: 0.5, courseCode: 'MYP-Y8', syllabus: { overview: 'Individual fitness & teamwork.', objectives: ['Fitness planning', 'Sportsmanship', 'Healthy lifestyle'], assessmentMethods: ['Skill checks', 'Participation', 'Fitness logs'] }, status: SystemStatus.ACTIVE },
  { code: 'MYP-Y8-LL', name: 'Life & Learning Skills (Y8)', credits: 0.5, courseCode: 'MYP-Y8', syllabus: { overview: 'Personal development and project skills.', objectives: ['Goal-setting', 'Time management', 'Community project'], assessmentMethods: ['Portfolio', 'Project', 'Reflection'] }, status: SystemStatus.ACTIVE },
];

export async function seedSubjects(prisma: PrismaClient, courses: any[]) {
  console.log('Seeding subjects...');

  const createdSubjects: any[] = [];

  // First, check if we have courses
  if (!courses || courses.length === 0) {
    console.warn('No courses found. Fetching courses from database...');
    const dbCourses = await prisma.course.findMany();
    if (dbCourses.length === 0) {
      console.warn('No courses found in database. Subjects cannot be seeded.');
      return [];
    }
    courses = dbCourses;
  }

  for (const subject of subjectsSeedData) {
    const { courseCode, ...subjectData } = subject;

    // Find the course by code
    const course = courses.find(c => c.code === courseCode);

    if (!course) {
      console.warn(`Course with code ${courseCode} not found. Trying to find in database...`);
      const dbCourse = await prisma.course.findUnique({
        where: { code: courseCode }
      });

      if (!dbCourse) {
        console.warn(`Course with code ${courseCode} not found in database. Skipping subject ${subject.code}`);
        continue;
      }

      const createdSubject = await prisma.subject.upsert({
        where: { code: subject.code },
        update: {
          ...subjectData,
          courseId: dbCourse.id,
        },
        create: {
          ...subjectData,
          courseId: dbCourse.id,
        },
      });

      createdSubjects.push(createdSubject);
    } else {
      const createdSubject = await prisma.subject.upsert({
        where: { code: subject.code },
        update: {
          ...subjectData,
          courseId: course.id,
        },
        create: {
          ...subjectData,
          courseId: course.id,
        },
      });

      createdSubjects.push(createdSubject);
    }
  }

  console.log(`Seeded ${createdSubjects.length} subjects`);
  return createdSubjects;
}
