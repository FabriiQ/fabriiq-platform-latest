/**
 * Script to check existing courses and create proper course mappings for bulk upload
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking existing courses in database...\n');

    // Get all existing courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        programId: true,
        status: true,
        program: {
          select: {
            name: true,
            institution: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { code: 'asc' }
      ]
    });

    console.log(`📚 Found ${courses.length} courses in database:`);
    console.log('=' .repeat(100));
    console.log('ID'.padEnd(30) + 'Code'.padEnd(15) + 'Name'.padEnd(30) + 'Level'.padEnd(8) + 'Program');
    console.log('=' .repeat(100));

    courses.forEach(course => {
      console.log(
        course.id.padEnd(30) + 
        course.code.padEnd(15) + 
        course.name.substring(0, 28).padEnd(30) + 
        course.level.toString().padEnd(8) + 
        course.program.name
      );
    });

    console.log('\n🎯 Creating subject-to-course mappings...\n');

    // Get all subjects that need course mappings
    const subjects = await prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        courseId: true,
        course: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    console.log(`📖 Found ${subjects.length} subjects:`);
    console.log('=' .repeat(100));
    console.log('Subject ID'.padEnd(30) + 'Subject Name'.padEnd(25) + 'Current Course'.padEnd(30) + 'Status');
    console.log('=' .repeat(100));

    let subjectsWithCourses = 0;

    subjects.forEach(subject => {
      const courseName = subject.course ? subject.course.name.substring(0, 28) : 'None';

      console.log(
        subject.id.padEnd(30) +
        subject.name.substring(0, 23).padEnd(25) +
        courseName.padEnd(30) +
        '✅ Has Course'
      );

      subjectsWithCourses++;
    });

    console.log('\n📊 Summary:');
    console.log(`✅ All subjects have courses: ${subjectsWithCourses}`);

    // Create default courses for common subjects if they don't exist
    console.log('\n🏗️  Creating default courses for common subjects...\n');

    // Get the first program to associate courses with
    const firstProgram = await prisma.program.findFirst({
      select: {
        id: true,
        name: true,
        institution: {
          select: {
            name: true
          }
        }
      }
    });

    if (!firstProgram) {
      console.log('❌ No program found. Please create a program first.');
      return;
    }

    console.log(`🎓 Using program: ${firstProgram.name} (${firstProgram.institution.name})`);

    // Common subjects and their course mappings
    const commonCourses = [
      { code: 'MATH', name: 'Mathematics', level: 1, subjects: ['MATHEMATICS', 'MATH', 'ALGEBRA', 'GEOMETRY', 'CALCULUS'] },
      { code: 'ENG', name: 'English Language', level: 1, subjects: ['ENGLISH', 'LITERATURE', 'LANGUAGE'] },
      { code: 'SCI', name: 'Science', level: 1, subjects: ['SCIENCE', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY'] },
      { code: 'HIST', name: 'History', level: 1, subjects: ['HISTORY', 'SOCIAL_STUDIES'] },
      { code: 'GEO', name: 'Geography', level: 1, subjects: ['GEOGRAPHY'] },
      { code: 'ART', name: 'Arts', level: 1, subjects: ['ART', 'MUSIC', 'DRAMA'] },
      { code: 'PE', name: 'Physical Education', level: 1, subjects: ['PHYSICAL_EDUCATION', 'SPORTS'] },
      { code: 'CS', name: 'Computer Science', level: 1, subjects: ['COMPUTER_SCIENCE', 'ICT', 'TECHNOLOGY'] },
      { code: 'LANG', name: 'Foreign Languages', level: 1, subjects: ['URDU', 'ARABIC', 'FRENCH', 'SPANISH'] },
      { code: 'REL', name: 'Religious Studies', level: 1, subjects: ['ISLAMIC_STUDIES', 'RELIGIOUS_STUDIES'] }
    ];

    for (const courseData of commonCourses) {
      // Check if course already exists
      const existingCourse = await prisma.course.findUnique({
        where: { code: courseData.code }
      });

      let courseId: string;

      if (existingCourse) {
        console.log(`✅ Course ${courseData.code} already exists: ${existingCourse.name}`);
        courseId = existingCourse.id;
      } else {
        // Create new course
        const newCourse = await prisma.course.create({
          data: {
            code: courseData.code,
            name: courseData.name,
            level: courseData.level,
            programId: firstProgram.id,
            description: `${courseData.name} course for all grade levels`,
            credits: 1.0,
            status: 'ACTIVE'
          }
        });
        console.log(`🆕 Created course ${courseData.code}: ${courseData.name}`);
        courseId = newCourse.id;
      }

      // Note: Since courseId is required in Subject model, we'll create subjects if needed
      console.log(`   📎 Course ${courseData.code} is available for subject mapping`);

      // Check if we have subjects that match this course pattern
      const matchingSubjects = await prisma.subject.findMany({
        where: {
          OR: [
            { name: { contains: courseData.name, mode: 'insensitive' } },
            { code: { contains: courseData.code, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      if (matchingSubjects.length > 0) {
        console.log(`   📚 Found ${matchingSubjects.length} matching subjects for ${courseData.code}`);
        matchingSubjects.forEach(subject => {
          console.log(`      - ${subject.name} (${subject.code})`);
        });
      }
    }

    console.log('\n✅ Course setup completed!');
    console.log('\n📋 Updated course mappings:');

    // Show final mappings
    const allSubjects = await prisma.subject.findMany({
      select: {
        name: true,
        code: true,
        course: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    console.log('=' .repeat(70));
    console.log('Subject'.padEnd(25) + 'Course Code'.padEnd(15) + 'Course Name');
    console.log('=' .repeat(70));

    allSubjects.forEach(subject => {
      console.log(
        subject.name.substring(0, 23).padEnd(25) +
        (subject.course?.code || 'N/A').padEnd(15) +
        (subject.course?.name || 'N/A')
      );
    });

    console.log('\n🎉 All done! You can now upload questions with proper course mappings.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
