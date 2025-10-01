import { PrismaClient } from '@prisma/client';
import { seedInstitutions } from './institutions';
import { seedCampuses } from './campuses';
import { seedActivityTypes } from './activity-types';
import { seedFeeManagement } from './fee-management';
import { seedEnrollmentDocuments } from './enrollment-documents';
import { seedAcademicCycles } from './academic-cycles';
import { seedPrograms, seedCourses } from './programs';
import { seedUsers } from './users';
import { seedClasses } from './classes';
import { seedStudentEnrollments } from './student-enrollments';
import { seedSubjects } from './subjects';
import { seedStudents } from './students';
import { seedSubjectTopics } from './subject-topics';
import { seedBulkStudents } from './bulk-students-seed';
import { seedComprehensiveEnrollments } from './comprehensive-enrollments';
import { seedComprehensiveAttendance } from './comprehensive-attendance';
import { seedComprehensiveAssessments } from './comprehensive-assessments';
import { seedComprehensiveFees } from './comprehensive-fees';
import { seedTeacherAssignments } from './teacher-assignments';
import { seedTeacherAttendance } from './teacher-attendance';
import { seedLateFeePolicies } from './late-fee-policies';
import { seedMessages } from './messages';
import { seedChallanTemplates } from './challan-templates';

const prisma = new PrismaClient();

/**
 * Main seed function that orchestrates the seeding process
 */
export async function seedNewData() {
  console.log('🌱 Starting new database seeding...');

  try {
    console.log('📊 About to seed institutions...');
    // Step 1: Seed institutions
    const institutions = await seedInstitutions(prisma);
    console.log('✅ Institutions seeded successfully');

    // Step 2: Seed campuses
    const campuses = await seedCampuses(prisma, institutions);
    console.log('Campuses seeded successfully');

    // Step 3: Seed activity types
    const activityTypes = await seedActivityTypes(prisma);
    console.log('Activity types seeded successfully');

    // Step 4: Seed academic cycles
    const academicCyclesResult = await seedAcademicCycles(prisma, institutions);
    const academicCycles = academicCyclesResult.cycles || [];
    console.log('Academic cycles seeded successfully');

    // Step 5: Seed programs
    const programsResult = await seedPrograms(prisma, institutions, campuses, academicCycles);
    const programs = programsResult.programs || [];
    console.log('Programs seeded successfully');

    // Step 6: Seed program-campus associations
    const programCampuses = programsResult.programCampuses || [];
    console.log('Program-campus associations seeded successfully');

    // Step 7: Seed courses
    const courses = await seedCourses(prisma, programs);
    console.log('Courses seeded successfully');

    // Step 8: Seed subjects
    const subjects = await seedSubjects(prisma, courses);
    console.log('Subjects seeded successfully');

    // Step 9: Seed users
    const users = await seedUsers(prisma, institutions, campuses);
    console.log('Users seeded successfully');

    // Step 9.1: Assign programs to coordinator using the proper service
    if (users.coordinator && programs.length > 0 && campuses.length > 0) {
      console.log('Assigning programs to coordinator using CoordinatorService...');

      // Import the coordinator service
      const { CoordinatorService } = await import('@/server/api/services/coordinator.service');

      // Get the first program and first campus for assignment
      const program = programs[0];
      const campus = campuses[0];

      if (program && campus) {
        try {
          const coordinatorService = new CoordinatorService({ prisma });

          // Use the proper assignProgram method which will automatically assign courses and classes
          const result = await coordinatorService.assignProgram({
            coordinatorId: users.coordinator.id,
            programId: program.id,
            campusId: campus.id,
            role: 'Program Coordinator',
            responsibilities: ['Academic oversight', 'Program management']
          });

          console.log('✅ Programs assigned to coordinator successfully');
          console.log(`   - Courses automatically assigned: ${result.coursesAssigned}`);
        } catch (error) {
          console.error('❌ Error assigning program to coordinator:', error);
          // Fallback to manual assignment if service fails
          await prisma.coordinatorProfile.update({
            where: { userId: users.coordinator.id },
            data: {
              managedPrograms: [
                {
                  programId: program.id,
                  programName: program.name,
                  programCode: program.code,
                  campusId: campus.id,
                  campusName: campus.name,
                  role: 'Program Coordinator',
                  responsibilities: ['Academic oversight', 'Program management'],
                  assignedAt: new Date().toISOString(),
                }
              ]
            },
          });
          console.log('⚠️  Used fallback assignment method');
        }
      }
    }

    // Step 10: Seed classes (use teachers from users for class teacher selection)
    const classes = await seedClasses(prisma, programCampuses, users.teachers);
    console.log('Classes seeded successfully');

    // Step 11: Seed students
    const students = await seedStudents(prisma, classes, campuses);
    console.log('Students seeded successfully');

    // Step 12: Seed student enrollments
    const studentEnrollments = await seedStudentEnrollments(prisma, classes, Object.values(users).flat());
    console.log('Student enrollments seeded successfully');

    // Step 10: Seed fee management data
    await seedFeeManagement(prisma, institutions, programCampuses, academicCycles[0] ? [academicCycles[0]] : [], [], studentEnrollments);
    console.log('Fee management data seeded successfully');

    // Step 11: Seed enrollment documents
    await seedEnrollmentDocuments(prisma, studentEnrollments, []);
    console.log('Enrollment documents seeded successfully');

    // Step 12: Seed subject topics (generic if subject-specific not defined)
    await seedSubjectTopics(prisma, subjects);
    console.log('Subject topics seeded successfully');


    // Step 15: Seed bulk students (30 per class)
    await seedBulkStudents(prisma, 30);
    console.log('Bulk students seeded successfully');

    // Step 15.1: Seed comprehensive enrollments
    console.log('🎓 Seeding comprehensive enrollments...');
    await seedComprehensiveEnrollments(prisma);
    console.log('✅ Comprehensive enrollments seeded successfully');

    // Step 15.2: Seed comprehensive attendance
    console.log('📅 Seeding comprehensive attendance...');
    await seedComprehensiveAttendance(prisma);
    console.log('✅ Comprehensive attendance seeded successfully');

    // Step 15.3: Seed comprehensive assessments
    console.log('📝 Seeding comprehensive assessments...');
    await seedComprehensiveAssessments(prisma);
    console.log('✅ Comprehensive assessments seeded successfully');

    // Step 15.4: Seed comprehensive fees
    console.log('💰 Seeding comprehensive fees...');
    await seedComprehensiveFees(prisma);
    console.log('✅ Comprehensive fees seeded successfully');

// Step 16: Seed teacher assignments
    await seedTeacherAssignments(prisma, users.teachers, classes, subjects);
    console.log('Teacher assignments seeded successfully');

    // Step 17: Seed teacher attendance
    await seedTeacherAttendance(prisma, users.teachers, campuses);
    console.log('Teacher attendance seeded successfully');

    // Step 18: Seed late fee policies
    await seedLateFeePolicies(prisma, Object.values(users).flat());
    console.log('Late fee policies seeded successfully');

    // Step 19: Seed challan templates
    await seedChallanTemplates(prisma);
    console.log('Challan templates seeded successfully');

    // Step 15: Seed messages for testing real-time inboxes
    const messageCount = await seedMessages(prisma);
    console.log(`Messages seeded successfully: ${messageCount} messages created`);

console.log('New database seeding completed successfully!');
    return {
      institutions,
      campuses,
      activityTypes,
      academicCycles,
      programs,
      programCampuses,
      users,
      classes,
      studentEnrollments
    };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedNewData()
    .then(() => {
      console.log('Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error during seeding:', error);
      process.exit(1);
    });
}
