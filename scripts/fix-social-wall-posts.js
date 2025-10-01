/**
 * Fix Social Wall Posts for Showcase Class
 * Creates valid social wall posts for class cmesxnvle006wuxvpxic2pp41
 */

const { PrismaClient } = require('@prisma/client');

async function fixSocialWallPosts() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Fixing social wall posts for showcase class...\n');

  try {
    const targetClassId = 'cmesxnvle006wuxvpxic2pp41';
    
    // Get teacher and students for this class
    const classData = await prisma.class.findUnique({
      where: { id: targetClassId },
      include: {
        classTeacher: {
          include: {
            user: true
          }
        },
        students: {
          include: {
            student: {
              include: {
                user: true
              }
            }
          },
          take: 5 // Get first 5 students
        }
      }
    });

    if (!classData) {
      console.log('❌ Class not found');
      return;
    }

    const teacherId = classData.classTeacher?.user?.id;
    const studentIds = classData.students.map(s => s.student.user.id);

    console.log(`👨‍🏫 Teacher: ${classData.classTeacher?.user?.name}`);
    console.log(`👥 Students: ${classData.students.length}`);

    // Delete existing posts to avoid duplicates
    await prisma.socialPost.deleteMany({
      where: { classId: targetClassId }
    });

    // Create simple, valid social wall posts
    const posts = [
      {
        content: "Welcome to our English class! We'll be exploring literature, writing, and language skills this term. Looking forward to an exciting learning journey together! 📚✨",
        authorId: teacherId,
        postType: 'REGULAR'
      },
      {
        content: "Great work on today's reading comprehension lesson! Remember to practice the exercises we discussed. If you need help, don't hesitate to ask! 📖",
        authorId: teacherId,
        postType: 'REGULAR'
      },
      {
        content: "Reminder: Creative writing assignment is due Friday. Focus on character development and descriptive language. You've got this! ✍️",
        authorId: teacherId,
        postType: 'REGULAR'
      }
    ];

    // Add student posts if we have students
    if (studentIds.length > 0) {
      posts.push(
        {
          content: "Can someone explain the difference between metaphors and similes? I'm a bit confused about the examples we discussed. 🤔",
          authorId: studentIds[0],
          postType: 'REGULAR'
        },
        {
          content: "Thanks for the extra help with grammar today! The sentence structure concepts are much clearer now. 🙏",
          authorId: studentIds[1] || studentIds[0],
          postType: 'REGULAR'
        }
      );
    }

    // Create posts
    let createdCount = 0;
    for (const postData of posts) {
      if (postData.authorId) {
        try {
          const post = await prisma.socialPost.create({
            data: {
              content: postData.content,
              authorId: postData.authorId,
              postType: postData.postType,
              classId: targetClassId,
              contentType: 'TEXT',
              status: 'ACTIVE'
            }
          });
          
          console.log(`   ✅ Created post: ${post.content.substring(0, 50)}...`);
          createdCount++;
        } catch (error) {
          console.log(`   ❌ Error creating post:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Created ${createdCount} social wall posts!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSocialWallPosts();
