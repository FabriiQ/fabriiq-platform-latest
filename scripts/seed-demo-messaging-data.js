/**
 * Seed Messaging Data for Demo Users
 * Creates realistic messaging data for the existing demo users mentioned in the login page
 */

const { PrismaClient } = require('@prisma/client');

async function seedDemoMessagingData() {
  const prisma = new PrismaClient();
  
  console.log('🌱 Seeding messaging data for demo users...\n');

  try {
    // Get existing demo users
    const demoUsers = await prisma.user.findMany({
      where: {
        username: {
          in: [
            'sys_admin',
            'michael_smith',
            'sarah_williams',
            'alex_johnson',
            'robert_brown',
            'jennifer_davis',
            'james_anderson',
            'john_smith',
            'emily_johnson'
          ]
        }
      },
      include: {
        studentProfile: true,
        teacherProfile: true,
        primaryCampus: true
      }
    });

    console.log(`📋 Found ${demoUsers.length} demo users for messaging:`);
    demoUsers.forEach(user => {
      console.log(`   • ${user.name} (${user.username}) - ${user.userType}`);
    });

    if (demoUsers.length === 0) {
      console.log('❌ No demo users found. Please run user seeding first.');
      return;
    }

    // Get a class for context
    const demoClass = await prisma.class.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true }
    });

    if (!demoClass) {
      console.log('❌ No active class found. Creating a demo class...');
      // We'll continue without class context
    }

    // Define realistic message scenarios
    const messageScenarios = [
      // Teacher to Student messages
      {
        authorUsername: 'robert_brown',
        recipientUsernames: ['john_smith'],
        content: 'Great work on your math assignment! Your understanding of quadratic equations has really improved. Keep up the excellent work!',
        messageType: 'PRIVATE',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: true
      },
      {
        authorUsername: 'jennifer_davis',
        recipientUsernames: ['emily_johnson'],
        content: 'I noticed you were struggling with the algebra problems in class today. Would you like to schedule some extra help sessions?',
        messageType: 'PRIVATE',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: true
      },
      // Student to Teacher messages
      {
        authorUsername: 'john_smith',
        recipientUsernames: ['robert_brown'],
        content: 'Hi Mr. Brown, I have a question about homework problem #7. Could you please explain the steps again?',
        messageType: 'PRIVATE',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: true
      },
      {
        authorUsername: 'emily_johnson',
        recipientUsernames: ['james_anderson'],
        content: 'I will be absent from science class tomorrow due to a doctor appointment. Could you please let me know what I will miss?',
        messageType: 'PRIVATE',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'LOW',
        isEducationalRecord: false
      },
      // Admin messages
      {
        authorUsername: 'michael_smith',
        recipientUsernames: ['robert_brown', 'jennifer_davis', 'james_anderson'],
        content: 'Reminder: Parent-teacher conferences are scheduled for next week. Please prepare your student progress reports.',
        messageType: 'GROUP',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'LOW',
        isEducationalRecord: false
      },
      {
        authorUsername: 'alex_johnson',
        recipientUsernames: ['michael_smith', 'sarah_williams'],
        content: 'New curriculum guidelines have been released. Please review and implement the changes by next month.',
        messageType: 'GROUP',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'MEDIUM',
        isEducationalRecord: false
      },
      // System admin broadcasts
      {
        authorUsername: 'sys_admin',
        recipientUsernames: ['michael_smith', 'sarah_williams', 'alex_johnson'],
        content: 'System maintenance scheduled for this weekend. The platform will be unavailable from 2 AM to 6 AM on Saturday.',
        messageType: 'BROADCAST',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'LOW',
        isEducationalRecord: false
      },
      // Cross-role communications
      {
        authorUsername: 'james_anderson',
        recipientUsernames: ['robert_brown', 'jennifer_davis'],
        content: 'The science lab equipment for the joint math-science project has arrived. We can start the integrated lessons next week.',
        messageType: 'GROUP',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: false
      },
      // Recent messages for real-time testing
      {
        authorUsername: 'robert_brown',
        recipientUsernames: ['john_smith'],
        content: 'Don\'t forget about the quiz tomorrow on Chapter 5. Review the practice problems we did in class.',
        messageType: 'PRIVATE',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: true
      },
      {
        authorUsername: 'emily_johnson',
        recipientUsernames: ['jennifer_davis'],
        content: 'Thank you for the extra help session today! The algebra concepts are much clearer now.',
        messageType: 'PRIVATE',
        contentCategory: 'ACADEMIC',
        riskLevel: 'LOW',
        isEducationalRecord: true
      }
    ];

    console.log('\n📝 Creating messages...');
    let createdCount = 0;

    for (const scenario of messageScenarios) {
      try {
        // Find author
        const author = demoUsers.find(u => u.username === scenario.authorUsername);
        if (!author) {
          console.log(`   ⚠️  Author ${scenario.authorUsername} not found, skipping...`);
          continue;
        }

        // Find recipients
        const recipients = demoUsers.filter(u => 
          scenario.recipientUsernames.includes(u.username)
        );
        
        if (recipients.length === 0) {
          console.log(`   ⚠️  No recipients found for message from ${author.name}, skipping...`);
          continue;
        }

        // Create the message
        const message = await prisma.socialPost.create({
          data: {
            content: scenario.content,
            authorId: author.id,
            classId: demoClass?.id || '',
            postType: 'REGULAR',
            contentType: 'TEXT',
            messageType: scenario.messageType,
            
            // Compliance fields
            consentRequired: scenario.riskLevel === 'HIGH' || scenario.riskLevel === 'CRITICAL',
            consentObtained: true,
            legalBasis: 'LEGITIMATE_INTEREST',
            dataCategories: scenario.isEducationalRecord ? ['educational_record'] : ['general_communication'],
            encryptionLevel: scenario.isEducationalRecord ? 'ENHANCED' : 'STANDARD',
            auditRequired: scenario.isEducationalRecord || scenario.riskLevel !== 'LOW',
            crossBorderTransfer: false,
            isEducationalRecord: scenario.isEducationalRecord,
            
            // Classification fields
            contentCategory: scenario.contentCategory,
            riskLevel: scenario.riskLevel,
            
            // Timestamps for realistic data
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          }
        });

        // Create recipient records
        for (const recipient of recipients) {
          await prisma.messageRecipient.create({
            data: {
              messageId: message.id,
              userId: recipient.id,
              deliveryStatus: 'DELIVERED',
              consentStatus: 'OBTAINED',
              legalBasis: 'LEGITIMATE_INTEREST',
              readAt: Math.random() > 0.3 ? new Date() : null, // 70% read rate
            }
          });
        }

        createdCount++;
        console.log(`   ✅ Created message from ${author.name} to ${recipients.map(r => r.name).join(', ')}`);

      } catch (error) {
        console.error(`   ❌ Failed to create message: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} messages!`);
    
    // Create some audit logs for compliance demonstration
    console.log('\n📋 Creating audit logs...');
    const messages = await prisma.socialPost.findMany({
      where: { messageType: { not: null } },
      take: 5
    });

    for (const message of messages) {
      await prisma.messageAuditLog.create({
        data: {
          messageId: message.id,
          action: 'CREATED',
          actorId: message.authorId,
          details: {
            messageType: message.messageType,
            contentCategory: message.contentCategory,
            complianceApplied: true
          },
          legalBasis: 'LEGITIMATE_INTEREST',
          dataCategories: ['communication_audit']
        }
      });
    }

    console.log('   ✅ Created audit log entries');

    console.log('\n📊 Messaging System Summary:');
    const totalMessages = await prisma.socialPost.count({
      where: { messageType: { not: null } }
    });
    const totalRecipients = await prisma.messageRecipient.count();
    const totalAudits = await prisma.messageAuditLog.count();

    console.log(`   📨 Total Messages: ${totalMessages}`);
    console.log(`   👥 Total Recipients: ${totalRecipients}`);
    console.log(`   📋 Total Audit Logs: ${totalAudits}`);

    // Create additional data for showcase class if it exists
    console.log('\n🎯 Creating additional showcase data...');

    const showcaseClass = await prisma.class.findUnique({
      where: { id: 'cmesxnvle006wuxvpxic2pp41' }
    });

    if (showcaseClass) {
      console.log('   ✅ Found showcase class, adding comprehensive data...');

      // Add more social posts for the showcase class
      const additionalPosts = [
        {
          content: 'Exciting news! Our class has been selected for the mathematics competition. Practice sessions start next week! 🏆',
          authorUsername: 'robert_brown',
          messageType: 'BROADCAST',
          contentCategory: 'ACADEMIC',
          riskLevel: 'LOW'
        },
        {
          content: 'Study group forming for the upcoming algebra test. Meet in the library after school on Tuesday. All welcome! 📚',
          authorUsername: 'john_smith',
          messageType: 'GROUP',
          contentCategory: 'ACADEMIC',
          riskLevel: 'LOW'
        },
        {
          content: 'Congratulations to Emma, Liam, and Olivia for excellent performance in last week\'s quiz! Keep up the great work! 🌟',
          authorUsername: 'robert_brown',
          messageType: 'BROADCAST',
          contentCategory: 'ACADEMIC',
          riskLevel: 'LOW'
        }
      ];

      for (const postData of additionalPosts) {
        const author = demoUsers.find(u => u.username === postData.authorUsername);
        if (author) {
          try {
            await prisma.socialPost.create({
              data: {
                content: postData.content,
                authorId: author.id,
                classId: 'cmesxnvle006wuxvpxic2pp41',
                postType: 'REGULAR',
                contentType: 'TEXT',
                messageType: postData.messageType,

                // Compliance fields
                consentRequired: false,
                consentObtained: true,
                legalBasis: 'LEGITIMATE_INTEREST',
                dataCategories: ['educational_content'],
                encryptionLevel: 'STANDARD',
                auditRequired: false,
                crossBorderTransfer: false,
                isEducationalRecord: true,

                // Classification
                contentCategory: postData.contentCategory,
                riskLevel: postData.riskLevel,

                // Timestamps
                createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Random time in last 3 days
              }
            });
            console.log(`   ✅ Added showcase post: ${postData.content.substring(0, 50)}...`);
          } catch (error) {
            console.error(`   ❌ Error creating showcase post: ${error.message}`);
          }
        }
      }
    } else {
      console.log('   ℹ️  Showcase class not found, skipping additional data');
    }

    // Create comprehensive social messaging data
    console.log('\n📱 Creating social messaging data...');

    // Get students and teachers in the same class
    const johnSmith = demoUsers.find(u => u.username === 'john_smith');
    const emilyJohnson = demoUsers.find(u => u.username === 'emily_johnson');
    const robertBrown = demoUsers.find(u => u.username === 'robert_brown');
    const jenniferDavis = demoUsers.find(u => u.username === 'jennifer_davis');

    if (johnSmith && emilyJohnson && robertBrown && jenniferDavis) {
      // Get their classes
      const johnEnrollment = await prisma.studentEnrollment.findFirst({
        where: { studentId: johnSmith.studentProfile?.id },
        include: { class: true }
      });

      const emilyEnrollment = await prisma.studentEnrollment.findFirst({
        where: { studentId: emilyJohnson.studentProfile?.id },
        include: { class: true }
      });

      if (johnEnrollment && emilyEnrollment) {
        // Create social wall posts for the classes
        const socialPosts = [
          {
            content: "Great job everyone on today's math quiz! 📊 Remember to review quadratic equations for next week.",
            authorId: robertBrown.id,
            classId: johnEnrollment.classId,
            postType: 'ANNOUNCEMENT',
            visibility: 'CLASS',
            isEducationalRecord: true
          },
          {
            content: "Study group forming for the upcoming science project! Who's interested? 🧪",
            authorId: johnSmith.id,
            classId: johnEnrollment.classId,
            postType: 'SOCIAL',
            visibility: 'CLASS',
            isEducationalRecord: false
          },
          {
            content: "Don't forget: Parent-teacher conferences are next Friday. Please remind your parents to sign up! 👨‍👩‍👧‍👦",
            authorId: jenniferDavis.id,
            classId: emilyEnrollment.classId,
            postType: 'ANNOUNCEMENT',
            visibility: 'CLASS',
            isEducationalRecord: true
          },
          {
            content: "Looking forward to the field trip next month! Has anyone been to the science museum before? 🏛️",
            authorId: emilyJohnson.id,
            classId: emilyEnrollment.classId,
            postType: 'SOCIAL',
            visibility: 'CLASS',
            isEducationalRecord: false
          }
        ];

        for (const postData of socialPosts) {
          try {
            const post = await prisma.socialWallPost.create({
              data: {
                ...postData,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
                riskLevel: 'LOW',
                contentCategory: postData.isEducationalRecord ? 'ACADEMIC' : 'SOCIAL'
              }
            });

            // Add some reactions and comments
            if (Math.random() > 0.5) {
              await prisma.socialWallReaction.create({
                data: {
                  postId: post.id,
                  userId: postData.authorId === johnSmith.id ? emilyJohnson.id : johnSmith.id,
                  reactionType: 'LIKE'
                }
              });
            }
          } catch (error) {
            console.warn('Error creating social post:', error.message);
          }
        }

        // Create direct messages between students and teachers
        const messages = [
          {
            content: "Hi Mr. Brown, I have a question about the homework assignment. Could we schedule a quick meeting?",
            authorId: johnSmith.id,
            recipientId: robertBrown.id,
            messageType: 'PRIVATE',
            isEducationalRecord: true
          },
          {
            content: "Of course, John! How about tomorrow after class? We can go over any questions you have.",
            authorId: robertBrown.id,
            recipientId: johnSmith.id,
            messageType: 'PRIVATE',
            isEducationalRecord: true
          },
          {
            content: "Hey Emily! Are you joining the study group for the science project?",
            authorId: johnSmith.id,
            recipientId: emilyJohnson.id,
            messageType: 'PRIVATE',
            isEducationalRecord: false
          },
          {
            content: "Yes! I'd love to join. When and where are you meeting?",
            authorId: emilyJohnson.id,
            recipientId: johnSmith.id,
            messageType: 'PRIVATE',
            isEducationalRecord: false
          }
        ];

        for (const msgData of messages) {
          try {
            const message = await prisma.message.create({
              data: {
                ...msgData,
                createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Random time in last 3 days
                riskLevel: 'LOW',
                contentCategory: msgData.isEducationalRecord ? 'ACADEMIC' : 'SOCIAL'
              }
            });

            // Create recipient record
            await prisma.messageRecipient.create({
              data: {
                messageId: message.id,
                userId: msgData.recipientId,
                readAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null
              }
            });
          } catch (error) {
            console.warn('Error creating message:', error.message);
          }
        }

        console.log('✅ Social messaging data created successfully!');
      }
    }

    console.log('\n🚀 Ready for Testing!');
    console.log('   • Open http://localhost:3000/teacher/communications');
    console.log('   • Login with: robert_brown / Password123!');
    console.log('   • Open http://localhost:3000/student/communications');
    console.log('   • Login with: john_smith / Password123!');
    console.log('   • Test real-time messaging between different roles');
    console.log('   • Social wall posts and direct messages are now available!');

    if (showcaseClass) {
      console.log('\n🎯 Showcase Class Ready!');
      console.log(`   • Class ID: cmesxnvle006wuxvpxic2pp41`);
      console.log(`   • Enhanced with comprehensive messaging data`);
      console.log(`   • Perfect for demonstrations and testing`);
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDemoMessagingData().catch(console.error);
