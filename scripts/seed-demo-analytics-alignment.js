/**
 * Seed Analytics and Attendance Alignment for Demo Users
 * Ensures all students in same class have aligned activities, grades, bloom analytics, and attendance
 */

const { PrismaClient } = require('@prisma/client');

async function seedDemoAnalyticsAlignment() {
  const prisma = new PrismaClient();
  
  console.log('🎯 Aligning analytics and attendance data for demo users...\n');

  try {
    // Get demo students and their enrollments
    const demoStudents = await prisma.user.findMany({
      where: {
        username: { in: ['john_smith', 'emily_johnson'] },
        userType: 'STUDENT'
      },
      include: {
        studentProfile: {
          include: {
            enrollments: {
              where: { status: 'ACTIVE' },
              include: {
                class: {
                  include: {
                    courseCampus: {
                      include: {
                        course: true,
                        campus: true
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

    console.log(`📋 Found ${demoStudents.length} demo students for analytics alignment`);

    for (const student of demoStudents) {
      if (!student.studentProfile || !student.studentProfile.enrollments.length) {
        console.log(`⚠️  Skipping ${student.name} - no active enrollments`);
        continue;
      }

      const enrollment = student.studentProfile.enrollments[0];
      const classData = enrollment.class;
      
      console.log(`👨‍🎓 Processing ${student.name} in class ${classData.name}`);

      // Get or create activities for this class
      const activities = await prisma.activity.findMany({
        where: {
          classId: classData.id,
          status: 'ACTIVE'
        }
      });

      if (activities.length === 0) {
        console.log(`📚 Creating sample activities for class ${classData.name}`);
        
        // Create sample activities
        const sampleActivities = [
          {
            title: 'Quadratic Equations Quiz',
            content: 'Solve quadratic equations using various methods',
            classId: classData.id,
            subjectId: null, // Will be set if subject exists
            maxScore: 100,
            bloomsLevel: 'APPLYING',
            duration: 45,
            startDate: new Date('2024-09-01'),
            endDate: new Date('2024-09-15'),
            status: 'ACTIVE',
            isGradable: true,
            purpose: 'ASSESSMENT',
            learningType: 'INDIVIDUAL'
          },
          {
            title: 'Science Project: Solar System',
            content: 'Create a model of the solar system with explanations',
            classId: classData.id,
            subjectId: null,
            maxScore: 100,
            bloomsLevel: 'CREATING',
            duration: 120,
            startDate: new Date('2024-09-10'),
            endDate: new Date('2024-09-30'),
            status: 'ACTIVE',
            isGradable: true,
            purpose: 'PROJECT',
            learningType: 'GROUP'
          },
          {
            title: 'Reading Comprehension Exercise',
            content: 'Read the assigned chapter and answer questions',
            classId: classData.id,
            subjectId: null,
            maxScore: 50,
            bloomsLevel: 'UNDERSTANDING',
            duration: 30,
            startDate: new Date('2024-09-05'),
            endDate: new Date('2024-09-12'),
            status: 'ACTIVE',
            isGradable: true,
            purpose: 'HOMEWORK',
            learningType: 'INDIVIDUAL'
          }
        ];

        for (const activityData of sampleActivities) {
          try {
            const activity = await prisma.activity.create({
              data: activityData
            });
            activities.push(activity);
          } catch (error) {
            console.warn(`Error creating activity: ${error.message}`);
          }
        }
      }

      // Create activity grades for each student
      for (const activity of activities) {
        const existingGrade = await prisma.activityGrade.findFirst({
          where: {
            activityId: activity.id,
            studentId: student.studentProfile.id
          }
        });

        if (!existingGrade) {
          const score = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
          const status = score >= 80 ? 'GRADED' : 'SUBMITTED';
          
          try {
            await prisma.activityGrade.create({
              data: {
                activityId: activity.id,
                studentId: student.studentProfile.id,
                score: score,
                maxScore: activity.maxScore,
                status: status,
                submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                gradedAt: status === 'GRADED' ? new Date() : null,
                feedback: score >= 90 ? 'Excellent work!' : score >= 80 ? 'Good job!' : 'Keep practicing!',
                attemptCount: 1,
                timeSpent: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
                bloomsLevelAchieved: activity.bloomsLevel
              }
            });
            console.log(`   ✅ Created grade for ${activity.title}: ${score}/${activity.maxScore}`);
          } catch (error) {
            console.warn(`   ⚠️  Error creating grade: ${error.message}`);
          }
        }
      }

      // Create attendance records for the last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      for (let i = 0; i < 30; i++) {
        const attendanceDate = new Date(startDate);
        attendanceDate.setDate(startDate.getDate() + i);
        
        // Skip weekends
        if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) continue;
        
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            studentId: student.studentProfile.id,
            classId: classData.id,
            date: {
              gte: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()),
              lt: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate() + 1)
            }
          }
        });

        if (!existingAttendance) {
          const isPresent = Math.random() > 0.1; // 90% attendance rate
          
          try {
            await prisma.attendance.create({
              data: {
                studentId: student.studentProfile.id,
                classId: classData.id,
                date: attendanceDate,
                status: isPresent ? 'PRESENT' : 'ABSENT',
                markedAt: new Date(attendanceDate.getTime() + 8 * 60 * 60 * 1000), // 8 AM
                markedById: classData.classTeacherId || null
              }
            });
          } catch (error) {
            console.warn(`   ⚠️  Error creating attendance: ${error.message}`);
          }
        }
      }

      console.log(`   ✅ Attendance records aligned for ${student.name}`);
    }

    // Create bloom analytics summary
    console.log('\n📊 Creating Bloom analytics summary...');
    
    for (const student of demoStudents) {
      if (!student.studentProfile) continue;

      const grades = await prisma.activityGrade.findMany({
        where: { studentId: student.studentProfile.id },
        include: { activity: true }
      });

      const bloomsLevels = ['REMEMBERING', 'UNDERSTANDING', 'APPLYING', 'ANALYZING', 'EVALUATING', 'CREATING'];
      
      for (const level of bloomsLevels) {
        const levelGrades = grades.filter(g => g.activity.bloomsLevel === level);
        if (levelGrades.length === 0) continue;

        const averageScore = levelGrades.reduce((sum, g) => sum + (g.score || 0), 0) / levelGrades.length;
        const totalActivities = levelGrades.length;
        const completedActivities = levelGrades.filter(g => g.status === 'GRADED').length;

        try {
          await prisma.bloomAnalytics.upsert({
            where: {
              studentId_bloomsLevel: {
                studentId: student.studentProfile.id,
                bloomsLevel: level
              }
            },
            update: {
              averageScore: Math.round(averageScore),
              totalActivities,
              completedActivities,
              lastUpdated: new Date()
            },
            create: {
              studentId: student.studentProfile.id,
              bloomsLevel: level,
              averageScore: Math.round(averageScore),
              totalActivities,
              completedActivities,
              lastUpdated: new Date()
            }
          });
        } catch (error) {
          console.warn(`Error creating bloom analytics: ${error.message}`);
        }
      }

      console.log(`   ✅ Bloom analytics created for ${student.name}`);
    }

    console.log('\n🎯 Analytics and attendance alignment completed!');
    console.log('   • All demo students have consistent activity grades');
    console.log('   • Attendance records for last 30 days created');
    console.log('   • Bloom analytics summaries generated');
    console.log('   • Ready for comprehensive testing!');

  } catch (error) {
    console.error('❌ Analytics alignment failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDemoAnalyticsAlignment();
}

module.exports = { seedDemoAnalyticsAlignment };
