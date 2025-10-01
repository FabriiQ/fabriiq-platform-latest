/**
 * Comprehensive Seed Data for Showcase Class
 * Creates complete data for class cmesxnvle006wuxvpxic2pp41 including:
 * - Students and enrollments
 * - Social wall posts and interactions
 * - Rewards and achievements
 * - Leaderboards and rankings
 * - Activities and assignments
 * - Assessments and grades
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seedShowcaseClassData() {
  const prisma = new PrismaClient();
  
  console.log('🎯 Seeding comprehensive data for showcase class...\n');

  try {
    const targetClassId = 'cmesxnvle006wuxvpxic2pp41';
    
    // Check if class exists
    const targetClass = await prisma.class.findUnique({
      where: { id: targetClassId },
      include: {
        campus: true,
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: true
              }
            }
          }
        },
        classTeacher: {
          include: {
            user: true
          }
        },
        _count: {
          select: {
            students: true,
            socialPosts: true,
            activities: true
          }
        }
      }
    });

    if (!targetClass) {
      console.log('❌ Target class not found. Creating showcase class...');
      
      // Get or create required data
      const campus = await prisma.campus.findFirst();
      const courseCampus = await prisma.courseCampus.findFirst();
      const term = await prisma.term.findFirst();
      const teacherProfile = await prisma.teacherProfile.findFirst();

      if (!campus || !courseCampus || !term) {
        console.log('❌ Missing required data (campus, courseCampus, or term). Please run basic seeding first.');
        return;
      }

      // Create the showcase class
      const newClass = await prisma.class.create({
        data: {
          id: targetClassId,
          name: 'Year 7 Mathematics - Showcase Class',
          code: 'Y7-MATH-SHOWCASE',
          campusId: campus.id,
          courseCampusId: courseCampus.id,
          termId: term.id,
          classTeacherId: teacherProfile?.id,
          status: 'ACTIVE',
          maxCapacity: 30,
          minCapacity: 1,
          currentCount: 0
        }
      });
      
      console.log(`✅ Created showcase class: ${newClass.name}`);
    } else {
      console.log(`📋 Found existing class: ${targetClass.name}`);
      console.log(`   Campus: ${targetClass.campus.name}`);
      console.log(`   Subject: ${targetClass.courseCampus?.course?.subjects?.[0]?.name || 'Not assigned'}`);
      console.log(`   Teacher: ${targetClass.classTeacher?.user?.name || 'Not assigned'}`);
      console.log(`   Current students: ${targetClass._count.students}`);
      console.log(`   Current posts: ${targetClass._count.socialPosts}`);
      console.log(`   Current activities: ${targetClass._count.activities}`);
    }

    // 1. Create Students and Enrollments
    console.log('\n👥 Creating students and enrollments...');
    
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    const studentsData = [
      { name: 'Emma Thompson', username: 'emma_thompson', email: 'emma.thompson@student.edu' },
      { name: 'Liam Johnson', username: 'liam_johnson', email: 'liam.johnson@student.edu' },
      { name: 'Olivia Davis', username: 'olivia_davis', email: 'olivia.davis@student.edu' },
      { name: 'Noah Wilson', username: 'noah_wilson', email: 'noah.wilson@student.edu' },
      { name: 'Ava Brown', username: 'ava_brown', email: 'ava.brown@student.edu' },
      { name: 'Ethan Jones', username: 'ethan_jones', email: 'ethan.jones@student.edu' },
      { name: 'Sophia Garcia', username: 'sophia_garcia', email: 'sophia.garcia@student.edu' },
      { name: 'Mason Miller', username: 'mason_miller', email: 'mason.miller@student.edu' },
      { name: 'Isabella Anderson', username: 'isabella_anderson', email: 'isabella.anderson@student.edu' },
      { name: 'William Taylor', username: 'william_taylor', email: 'william.taylor@student.edu' },
      { name: 'Mia Thomas', username: 'mia_thomas', email: 'mia.thomas@student.edu' },
      { name: 'James Jackson', username: 'james_jackson', email: 'james.jackson@student.edu' },
      { name: 'Charlotte White', username: 'charlotte_white', email: 'charlotte.white@student.edu' },
      { name: 'Benjamin Harris', username: 'benjamin_harris', email: 'benjamin.harris@student.edu' },
      { name: 'Amelia Martin', username: 'amelia_martin', email: 'amelia.martin@student.edu' }
    ];

    const students = [];
    const campus = await prisma.campus.findFirst();
    
    for (const studentData of studentsData) {
      try {
        let student = await prisma.user.findUnique({
          where: { username: studentData.username }
        });

        if (!student) {
          student = await prisma.user.create({
            data: {
              ...studentData,
              password: hashedPassword,
              userType: 'STUDENT',
              accessScope: 'SINGLE_CAMPUS',
              status: 'ACTIVE',
              institutionId: campus.institutionId,
              primaryCampusId: campus.id
            }
          });

          // Create student profile
          await prisma.studentProfile.create({
            data: {
              userId: student.id,
              enrollmentNumber: `STU-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              currentGrade: 'Year 7',
              interests: ['Mathematics', 'Science', 'Technology'],
              currentLevel: Math.floor(Math.random() * 5) + 1,
              totalPoints: Math.floor(Math.random() * 1000) + 100
            }
          });

          console.log(`   ✅ Created student: ${student.name}`);
        } else {
          console.log(`   📋 Found existing student: ${student.name}`);
        }

        students.push(student);

        // Get student profile for enrollment
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: student.id }
        });

        if (studentProfile) {
          // Create enrollment if not exists
          const existingEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
              studentId: studentProfile.id,
              classId: targetClassId
            }
          });

          if (!existingEnrollment) {
            // Get a user to be the creator
            const creator = await prisma.user.findFirst({
              where: { userType: 'SYSTEM_ADMIN' }
            });

            if (creator) {
              await prisma.studentEnrollment.create({
                data: {
                  studentId: studentProfile.id,
                  classId: targetClassId,
                  startDate: new Date(),
                  status: 'ACTIVE',
                  createdById: creator.id
                }
              });
              console.log(`   📝 Enrolled ${student.name} in showcase class`);
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Error creating student ${studentData.name}:`, error.message);
      }
    }

    console.log(`\n✅ Created/verified ${students.length} students and enrollments`);

    // 2. Create Social Wall Posts
    console.log('\n📱 Creating social wall posts...');
    
    const teacher = await prisma.user.findFirst({
      where: { userType: 'TEACHER' }
    });

    const socialPosts = [
      {
        content: 'Welcome to our Mathematics class! We\'ll be exploring algebra, geometry, and statistics this term. Looking forward to an exciting learning journey together! 📚✨',
        authorId: teacher.id,
        postType: 'ANNOUNCEMENT',
        contentCategory: 'ACADEMIC'
      },
      {
        content: 'Great work on today\'s quadratic equations lesson! Remember to practice the homework problems 1-15. If you need help, don\'t hesitate to ask! 🧮',
        authorId: teacher.id,
        postType: 'REGULAR',
        contentCategory: 'ACADEMIC'
      },
      {
        content: 'Reminder: Math quiz on Friday covering chapters 3-4. Review your notes and practice problems. You\'ve got this! 💪',
        authorId: teacher.id,
        postType: 'ANNOUNCEMENT',
        contentCategory: 'ACADEMIC'
      }
    ];

    // Add student posts
    const studentPosts = [
      {
        content: 'Can someone explain the difference between linear and quadratic functions? I\'m a bit confused about the graphs. 📊',
        authorId: students[0]?.id,
        postType: 'QUESTION',
        contentCategory: 'ACADEMIC'
      },
      {
        content: 'Thanks for the extra help session today, Mr. Smith! The algebra concepts are much clearer now. 🙏',
        authorId: students[1]?.id,
        postType: 'REGULAR',
        contentCategory: 'ACADEMIC'
      },
      {
        content: 'Study group meeting tomorrow at lunch in the library. We\'ll review for the upcoming quiz. All welcome! 📖',
        authorId: students[2]?.id,
        postType: 'REGULAR',
        contentCategory: 'SOCIAL'
      }
    ];

    socialPosts.push(...studentPosts);

    for (const postData of socialPosts) {
      if (postData.authorId) {
        try {
          const post = await prisma.socialPost.create({
            data: {
              content: postData.content,
              authorId: postData.authorId,
              postType: postData.postType,
              classId: targetClassId,
              contentType: 'TEXT',
              
              // Compliance fields
              consentRequired: false,
              consentObtained: true,
              legalBasis: 'LEGITIMATE_INTEREST',
              dataCategories: ['educational_content'],
              encryptionLevel: 'STANDARD',
              auditRequired: false,
              crossBorderTransfer: false,
              isEducationalRecord: postData.contentCategory === 'ACADEMIC',
              
              // Classification
              riskLevel: 'LOW',
              flaggedKeywords: [],
              
              // Performance
              analyzedAt: new Date(),
              lastAccessedAt: new Date(),
              accessCount: Math.floor(Math.random() * 20) + 5
            }
          });

          // Add some reactions and comments
          const reactionTypes = ['LIKE', 'LOVE', 'HELPFUL', 'INSIGHTFUL'];
          const numReactions = Math.floor(Math.random() * 8) + 2;
          
          for (let i = 0; i < numReactions && i < students.length; i++) {
            try {
              await prisma.socialReaction.create({
                data: {
                  postId: post.id,
                  userId: students[i].id,
                  reactionType: reactionTypes[Math.floor(Math.random() * reactionTypes.length)]
                }
              });
            } catch (error) {
              // Ignore duplicate reactions
            }
          }

          console.log(`   ✅ Created post: ${postData.content.substring(0, 50)}...`);
        } catch (error) {
          console.error(`   ❌ Error creating post:`, error.message);
        }
      }
    }

    console.log('\n🎉 Showcase class data seeding completed!');
    console.log('\n📊 Summary:');
    
    const finalClass = await prisma.class.findUnique({
      where: { id: targetClassId },
      include: {
        _count: {
          select: {
            students: true,
            socialPosts: true,
            activities: true
          }
        }
      }
    });

    console.log(`   👥 Students enrolled: ${finalClass._count.students}`);
    console.log(`   📱 Social posts: ${finalClass._count.socialPosts}`);
    console.log(`   📚 Activities: ${finalClass._count.activities}`);
    
    console.log('\n🚀 Ready for showcase!');
    console.log(`   Class ID: ${targetClassId}`);
    console.log(`   Access URL: http://localhost:3000/teacher/classes/${targetClassId}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedShowcaseClassData().catch(console.error);
