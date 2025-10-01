const { PrismaClient } = require('@prisma/client');

async function seedSystemMessages() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Seeding system messages...');
    
    // Get system admin user
    const systemAdmin = await prisma.user.findFirst({
      where: { userType: 'SYSTEM_ADMIN' }
    });
    
    if (!systemAdmin) {
      console.log('No system admin found. Please create a system admin user first.');
      return;
    }
    
    // Get or create a system class for messages
    let systemClass = await prisma.class.findFirst({
      where: { code: 'SYSTEM-MSG' }
    });

    if (!systemClass) {
      systemClass = await prisma.class.create({
        data: {
          name: 'System Messages',
          code: 'SYSTEM-MSG',
          description: 'System-wide administrative messages',
          status: 'ACTIVE',
          campus: {
            connect: { id: systemAdmin.primaryCampusId }
          },
          teacher: {
            connect: { id: systemAdmin.id }
          },
          capacity: 1000,
          currentEnrollment: 0
        }
      });
    }
    
    // Create system messages
    const systemMessages = [
      {
        content: 'Critical: Database Performance Alert - System monitoring has detected high database load. Immediate attention required.',
        messageType: 'SYSTEM',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'CRITICAL',
        isEducationalRecord: false,
        encryptionLevel: 'ENHANCED',
        auditRequired: true,
        legalBasis: 'LEGITIMATE_INTEREST',
        dataCategories: ['system_alerts'],
        priority: 'CRITICAL'
      },
      {
        content: 'FERPA Compliance Review Required - Monthly FERPA compliance review is due. Please review educational records disclosure logs.',
        messageType: 'SYSTEM',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'HIGH',
        isEducationalRecord: true,
        encryptionLevel: 'EDUCATIONAL_RECORD',
        auditRequired: true,
        legalBasis: 'LEGAL_OBLIGATION',
        dataCategories: ['compliance', 'educational_records'],
        priority: 'HIGH'
      },
      {
        content: 'Moderation Queue Alert - 15 messages pending moderation review across all campuses. Please review flagged content.',
        messageType: 'SYSTEM',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'MEDIUM',
        isEducationalRecord: false,
        encryptionLevel: 'STANDARD',
        auditRequired: true,
        legalBasis: 'LEGITIMATE_INTEREST',
        dataCategories: ['moderation_alerts'],
        priority: 'MEDIUM'
      },
      {
        content: 'System Backup Completed Successfully - Daily system backup completed at 2:00 AM. All data secured.',
        messageType: 'SYSTEM',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'LOW',
        isEducationalRecord: false,
        encryptionLevel: 'STANDARD',
        auditRequired: false,
        legalBasis: 'LEGITIMATE_INTEREST',
        dataCategories: ['system_notifications'],
        priority: 'LOW'
      },
      {
        content: 'Security Update Required - Critical security patches available for messaging system. Schedule maintenance window.',
        messageType: 'SYSTEM',
        contentCategory: 'ADMINISTRATIVE',
        riskLevel: 'HIGH',
        isEducationalRecord: false,
        encryptionLevel: 'ENHANCED',
        auditRequired: true,
        legalBasis: 'LEGITIMATE_INTEREST',
        dataCategories: ['security_alerts'],
        priority: 'HIGH'
      }
    ];
    
    for (const messageData of systemMessages) {
      const message = await prisma.socialPost.create({
        data: {
          ...messageData,
          classId: systemClass.id,
          authorId: systemAdmin.id,
          postType: 'ANNOUNCEMENT',
          status: 'ACTIVE'
        }
      });
      
      // Create message recipient for system admin
      await prisma.messageRecipient.create({
        data: {
          messageId: message.id,
          userId: systemAdmin.id,
          deliveryStatus: 'DELIVERED'
        }
      });
      
      console.log(`Created system message: ${messageData.content.substring(0, 50)}...`);
    }
    
    // Create some moderation queue entries
    const moderationEntries = [
      {
        reason: 'Inappropriate language detected',
        flaggedKeywords: ['inappropriate', 'language'],
        priority: 'HIGH',
        status: 'PENDING'
      },
      {
        reason: 'Potential spam content',
        flaggedKeywords: ['spam', 'promotional'],
        priority: 'MEDIUM',
        status: 'PENDING'
      },
      {
        reason: 'Educational record disclosure concern',
        flaggedKeywords: ['grades', 'personal'],
        priority: 'CRITICAL',
        status: 'IN_REVIEW'
      }
    ];
    
    // Get some existing posts to add to moderation queue
    const existingPosts = await prisma.socialPost.findMany({
      where: {
        NOT: { messageType: 'SYSTEM' }
      },
      take: 3
    });
    
    for (let i = 0; i < Math.min(moderationEntries.length, existingPosts.length); i++) {
      await prisma.moderationQueue.create({
        data: {
          messageId: existingPosts[i].id,
          ...moderationEntries[i]
        }
      });
      console.log(`Created moderation queue entry for: ${moderationEntries[i].reason}`);
    }
    
    console.log('✅ System messages and moderation queue seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding system messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSystemMessages();
