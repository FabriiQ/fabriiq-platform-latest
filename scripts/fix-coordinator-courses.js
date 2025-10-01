const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCoordinatorCourses() {
  console.log('🔧 Fixing coordinator course assignments...');

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

    if (!coordinator || !coordinator.coordinatorProfile) {
      console.log('❌ No coordinator or coordinator profile found');
      return;
    }

    console.log(`👤 Coordinator: ${coordinator.name} (${coordinator.username})`);

    const managedPrograms = coordinator.coordinatorProfile.managedPrograms || [];
    const currentManagedCourses = coordinator.coordinatorProfile.managedCourses || [];

    console.log(`📚 Current managed programs: ${managedPrograms.length}`);
    console.log(`📖 Current managed courses: ${currentManagedCourses.length}`);

    if (managedPrograms.length === 0) {
      console.log('❌ No programs assigned to coordinator');
      return;
    }

    const newCourseAssignments = [];

    // Process each managed program
    for (const programAssignment of managedPrograms) {
      console.log(`\n🔍 Processing program: ${programAssignment.programName}`);
      
      // Find all courses in this program at this campus
      const courseCampuses = await prisma.courseCampus.findMany({
        where: {
          programCampus: {
            programId: programAssignment.programId,
            campusId: programAssignment.campusId
          }
        },
        include: {
          course: {
            include: {
              program: true
            }
          },
          classes: {
            include: {
              term: true
            }
          },
          programCampus: {
            include: {
              campus: true
            }
          }
        }
      });

      console.log(`  Found ${courseCampuses.length} course-campus associations`);

      // Create course assignments for all courses in the program
      for (const courseCampus of courseCampuses) {
        // Skip if course is already assigned
        const isAlreadyAssigned = currentManagedCourses.some(c => 
          c.courseId === courseCampus.courseId && c.campusId === programAssignment.campusId
        );

        if (isAlreadyAssigned) {
          console.log(`    ⏭️  Course ${courseCampus.course.name} already assigned`);
          continue;
        }

        console.log(`    ➕ Adding course: ${courseCampus.course.name} (${courseCampus.course.code})`);
        console.log(`       Classes: ${courseCampus.classes.length}`);

        const newCourseAssignment = {
          courseId: courseCampus.courseId,
          courseName: courseCampus.course.name,
          courseCode: courseCampus.course.code,
          campusId: programAssignment.campusId,
          campusName: programAssignment.campusName,
          courseCampusId: courseCampus.id,
          programId: programAssignment.programId,
          programName: programAssignment.programName,
          classes: courseCampus.classes.map(cls => ({
            classId: cls.id,
            className: cls.name,
            classCode: cls.code,
            termId: cls.termId,
            termName: cls.term.name,
            assignedAt: new Date().toISOString()
          })),
          assignedAt: new Date().toISOString(),
        };

        newCourseAssignments.push(newCourseAssignment);

        // Log class details
        courseCampus.classes.forEach(cls => {
          console.log(`         - ${cls.name} (${cls.code})`);
        });
      }
    }

    if (newCourseAssignments.length === 0) {
      console.log('✅ All courses are already assigned');
      return;
    }

    console.log(`\n💾 Updating coordinator profile with ${newCourseAssignments.length} new course assignments...`);

    // Update coordinator profile with new course assignments
    const updatedProfile = await prisma.coordinatorProfile.update({
      where: { id: coordinator.coordinatorProfile.id },
      data: {
        managedCourses: [...currentManagedCourses, ...newCourseAssignments],
      },
    });

    console.log('✅ Coordinator profile updated successfully!');

    // Verify the update
    const totalClasses = newCourseAssignments.reduce((total, course) => total + course.classes.length, 0);
    console.log(`📊 Summary:`);
    console.log(`   - Added ${newCourseAssignments.length} courses`);
    console.log(`   - Added ${totalClasses} classes`);
    console.log(`   - Total managed courses: ${currentManagedCourses.length + newCourseAssignments.length}`);

  } catch (error) {
    console.error('❌ Error fixing coordinator courses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCoordinatorCourses()
  .then(() => {
    console.log('\n🎉 Coordinator course fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error during coordinator course fix:', error);
    process.exit(1);
  });
