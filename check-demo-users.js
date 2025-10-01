const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDemoUsers() {
  try {
    // Find John Smith (student)
    const johnSmith = await prisma.user.findFirst({
      where: {
        email: 'john.smith@example.com'
      },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              include: {
                class: {
                  include: {
                    courseCampus: {
                      include: {
                        course: {
                          include: {
                            subjects: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Find Robert (teacher)
    const robert = await prisma.user.findFirst({
      where: {
        email: 'math_boys@sunshine.edu'
      },
      include: {
        teacherProfile: {
          include: {
            classesAsTeacher: {
              include: {
                courseCampus: {
                  include: {
                    course: {
                      include: {
                        subjects: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('👨‍🎓 John Smith (Student):');
    if (johnSmith?.studentProfile) {
      console.log(`   Email: ${johnSmith.email}`);
      console.log(`   Name: ${johnSmith.name}`);
      console.log(`   Student ID: ${johnSmith.studentProfile.id}`);
      console.log(`   Enrolled in ${johnSmith.studentProfile.enrollments.length} classes:`);
      
      johnSmith.studentProfile.enrollments.forEach(enrollment => {
        const cls = enrollment.class;
        console.log(`     - ${cls.name} (${cls.code})`);
        console.log(`       Course: ${cls.courseCampus.course.name}`);
        console.log(`       Subjects: ${cls.courseCampus.course.subjects.map(s => s.name).join(', ')}`);
      });
    } else {
      console.log('   Not found or not a student');
    }

    console.log('\n👨‍🏫 Robert (Teacher):');
    if (robert?.teacherProfile) {
      console.log(`   Email: ${robert.email}`);
      console.log(`   Name: ${robert.name}`);
      console.log(`   Teacher ID: ${robert.teacherProfile.id}`);
      console.log(`   Teaching ${robert.teacherProfile.classesAsTeacher.length} classes:`);

      robert.teacherProfile.classesAsTeacher.forEach(cls => {
        console.log(`     - ${cls.name} (${cls.code})`);
        console.log(`       Course: ${cls.courseCampus.course.name}`);
        console.log(`       Subjects: ${cls.courseCampus.course.subjects.map(s => s.name).join(', ')}`);
      });
    } else {
      console.log('   Not found or not a teacher');
    }

    // Check all Year 8 C classes and their student/teacher counts
    console.log('\n🏫 All Year 8 C Classes:');
    const year8cClasses = await prisma.class.findMany({
      where: {
        name: { contains: 'Year 8 C' },
        status: 'ACTIVE'
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: true
              }
            }
          }
        },
        students: {
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        },
        classTeacher: {
          include: {
            user: true
          }
        }
      }
    });

    year8cClasses.forEach(cls => {
      console.log(`\n   📚 ${cls.name} (${cls.code})`);
      console.log(`      ID: ${cls.id}`);
      console.log(`      Students: ${cls.students.length}`);
      console.log(`      Teacher: ${cls.classTeacher?.user?.name || 'None assigned'}`);
      console.log(`      Subjects: ${cls.courseCampus.course.subjects.map(s => s.name).join(', ')}`);
      
      // Check if John Smith is in this class
      const johnInClass = cls.students.find(s => s.student.user.email === 'john.smith@example.com');
      if (johnInClass) {
        console.log(`      ✅ John Smith is enrolled in this class`);
      }
      
      // Check if Robert is teaching this class
      if (cls.classTeacher?.user?.email === 'math_boys@sunshine.edu') {
        console.log(`      ✅ Robert is teaching this class`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDemoUsers();
