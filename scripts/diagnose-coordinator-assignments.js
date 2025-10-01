const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseCoordinatorAssignments() {
  console.log('🔍 Diagnosing coordinator assignments...');

  try {
    // Find coordinator user
    const coordinator = await prisma.user.findFirst({
      where: {
        OR: [
          { userType: 'COORDINATOR' },
          { userType: 'CAMPUS_COORDINATOR' }
        ]
      },
      include: {
        coordinatorProfile: true
      }
    });

    if (!coordinator) {
      console.log('❌ No coordinator user found');
      return;
    }

    console.log(`👤 Coordinator: ${coordinator.name} (${coordinator.username})`);

    if (!coordinator.coordinatorProfile) {
      console.log('❌ No coordinator profile found');
      return;
    }

    const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
    const managedCourses = coordinator.coordinatorProfile.managedCourses || [];

    console.log(`\n📚 Managed Programs: ${managedPrograms.length}`);
    for (let i = 0; i < managedPrograms.length; i++) {
      const program = managedPrograms[i];
      console.log(`  Program ${i + 1}:`);
      console.log(`    ID: ${program.programId}`);
      console.log(`    Name: ${program.programName}`);
      console.log(`    Campus: ${program.campusName} (${program.campusId})`);
      
      // Check if this program actually exists and has courses
      const actualProgram = await prisma.program.findUnique({
        where: { id: program.programId },
        include: {
          courses: {
            include: {
              campusOfferings: {
                where: { campusId: program.campusId },
                include: {
                  classes: {
                    include: {
                      term: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (actualProgram) {
        console.log(`    ✅ Program exists with ${actualProgram.courses.length} courses`);
        
        for (const course of actualProgram.courses) {
          const campusOffering = course.campusOfferings.find(co => co.campusId === program.campusId);
          if (campusOffering) {
            console.log(`      Course: ${course.name} (${course.code})`);
            console.log(`        Classes: ${campusOffering.classes.length}`);
            campusOffering.classes.forEach(cls => {
              console.log(`          - ${cls.name} (${cls.code})`);
            });
          }
        }
      } else {
        console.log(`    ❌ Program does not exist in database`);
      }
    }

    console.log(`\n📖 Managed Courses: ${managedCourses.length}`);
    for (let i = 0; i < managedCourses.length; i++) {
      const course = managedCourses[i];
      console.log(`  Course ${i + 1}:`);
      console.log(`    ID: ${course.courseId}`);
      console.log(`    Name: ${course.courseName}`);
      console.log(`    Campus: ${course.campusName} (${course.campusId})`);
      console.log(`    Classes: ${course.classes ? course.classes.length : 0}`);
      
      if (course.classes && course.classes.length > 0) {
        course.classes.forEach(cls => {
          console.log(`      - ${cls.className} (${cls.classCode})`);
        });
      }
    }

    // Check what courses should be available for the assigned programs
    console.log(`\n🔍 Checking what courses should be available...`);
    
    for (const program of managedPrograms) {
      console.log(`\nFor program ${program.programName} at ${program.campusName}:`);
      
      // Find courseCampus records for this program and campus
      const courseCampuses = await prisma.courseCampus.findMany({
        where: {
          programCampus: {
            programId: program.programId,
            campusId: program.campusId
          }
        },
        include: {
          course: true,
          classes: {
            include: {
              term: true
            }
          },
          programCampus: {
            include: {
              program: true,
              campus: true
            }
          }
        }
      });

      console.log(`  Found ${courseCampuses.length} course-campus associations`);
      
      for (const courseCampus of courseCampuses) {
        console.log(`    Course: ${courseCampus.course.name} (${courseCampus.course.code})`);
        console.log(`      CourseCampus ID: ${courseCampus.id}`);
        console.log(`      Classes: ${courseCampus.classes.length}`);
        
        courseCampus.classes.forEach(cls => {
          console.log(`        - ${cls.name} (${cls.code}) - Term: ${cls.term.name}`);
        });

        // Check if this course is in managedCourses
        const isManaged = managedCourses.some(mc => 
          mc.courseId === courseCampus.courseId && mc.campusId === program.campusId
        );
        console.log(`      Is managed: ${isManaged ? '✅' : '❌'}`);
      }
    }

    // Check students in managed classes
    console.log(`\n👥 Checking students in managed classes...`);
    
    const allClassIds = [];
    managedCourses.forEach(course => {
      if (course.classes) {
        course.classes.forEach(cls => {
          allClassIds.push(cls.classId);
        });
      }
    });

    if (allClassIds.length > 0) {
      const studentEnrollments = await prisma.studentEnrollment.findMany({
        where: {
          classId: { in: allClassIds },
          status: 'ACTIVE'
        },
        include: {
          student: {
            include: {
              user: true
            }
          },
          class: true
        }
      });

      console.log(`  Found ${studentEnrollments.length} student enrollments in managed classes`);
      
      // Group by class
      const enrollmentsByClass = {};
      studentEnrollments.forEach(enrollment => {
        const classId = enrollment.classId;
        if (!enrollmentsByClass[classId]) {
          enrollmentsByClass[classId] = {
            className: enrollment.class.name,
            students: []
          };
        }
        enrollmentsByClass[classId].students.push(enrollment.student.user.name);
      });

      Object.entries(enrollmentsByClass).forEach(([classId, data]) => {
        console.log(`    Class ${data.className}: ${data.students.length} students`);
      });
    }

  } catch (error) {
    console.error('❌ Error diagnosing coordinator assignments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseCoordinatorAssignments()
  .then(() => {
    console.log('\n✅ Coordinator assignment diagnosis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during diagnosis:', error);
    process.exit(1);
  });
