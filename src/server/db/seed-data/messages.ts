/**
 * Message Seeding Data
 * Creates realistic test messages between all user roles for testing real-time inboxes
 */

import { PrismaClient, MessageType, ContentCategory, RiskLevel, EncryptionLevel, LegalBasis } from '@prisma/client';

export interface MessageSeedData {
  content: string;
  authorRole: string;
  recipientRoles: string[];
  messageType: MessageType;
  contentCategory: ContentCategory;
  riskLevel: RiskLevel;
  isEducationalRecord: boolean;
  encryptionLevel: EncryptionLevel;
  legalBasis: LegalBasis;
  scenario: string;
}

export const messageSeedData: MessageSeedData[] = [
  // System Admin Messages
  {
    content: "System maintenance scheduled for this weekend. All campuses will be notified 24 hours in advance.",
    authorRole: "SYSTEM_ADMIN",
    recipientRoles: ["CAMPUS_ADMIN"],
    messageType: "BROADCAST",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "System maintenance notification"
  },
  {
    content: "New compliance requirements for FERPA have been updated. Please review the updated policies in the admin portal.",
    authorRole: "SYSTEM_ADMIN",
    recipientRoles: ["CAMPUS_ADMIN", "TEACHER"],
    messageType: "BROADCAST",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "MEDIUM",
    isEducationalRecord: false,
    encryptionLevel: "ENHANCED",
    legalBasis: "LEGAL_OBLIGATION",
    scenario: "Compliance update"
  },

  // Campus Admin Messages
  {
    content: "Welcome to the new semester! Please ensure all student records are updated and attendance tracking is active.",
    authorRole: "CAMPUS_ADMIN",
    recipientRoles: ["TEACHER"],
    messageType: "BROADCAST",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Semester welcome message"
  },
  {
    content: "Parent-teacher conference schedule has been finalized. Please check your assigned time slots and prepare student progress reports.",
    authorRole: "CAMPUS_ADMIN",
    recipientRoles: ["TEACHER"],
    messageType: "GROUP",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Parent-teacher conference coordination"
  },

  // Teacher Messages
  {
    content: "Homework assignment for Mathematics - Chapter 5 exercises due next Friday. Please complete problems 1-20.",
    authorRole: "TEACHER",
    recipientRoles: ["STUDENT"],
    messageType: "GROUP",
    contentCategory: "ACADEMIC",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Homework assignment"
  },
  {
    content: "Great job on your science project presentation! Your understanding of the water cycle was excellent. Keep up the good work!",
    authorRole: "TEACHER",
    recipientRoles: ["STUDENT"],
    messageType: "PRIVATE",
    contentCategory: "ACADEMIC",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Student feedback"
  },
  {
    content: "Your child has shown remarkable improvement in reading comprehension this month. We're very proud of their progress!",
    authorRole: "TEACHER",
    recipientRoles: ["PARENT"],
    messageType: "PRIVATE",
    contentCategory: "ACADEMIC",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Parent communication about student progress"
  },
  {
    content: "I need to discuss some behavioral concerns regarding classroom disruptions. Could we schedule a meeting this week?",
    authorRole: "TEACHER",
    recipientRoles: ["CAMPUS_ADMIN"],
    messageType: "PRIVATE",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "MEDIUM",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Behavioral concern escalation"
  },

  // Student Messages
  {
    content: "I'm having trouble understanding the algebra concepts from yesterday's lesson. Could you please explain it again?",
    authorRole: "STUDENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "ACADEMIC",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Student seeking help"
  },
  {
    content: "Thank you for the extra help with my essay. I really appreciate your feedback and suggestions!",
    authorRole: "STUDENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "GENERAL",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Student gratitude"
  },

  // Parent Messages
  {
    content: "My child will be absent tomorrow due to a medical appointment. Please let me know about any assignments they'll miss.",
    authorRole: "PARENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Absence notification"
  },
  {
    content: "I'm concerned about my child's recent test scores in mathematics. Could we schedule a meeting to discuss additional support options?",
    authorRole: "PARENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "ACADEMIC",
    riskLevel: "MEDIUM",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Parent concern about academic performance"
  },
  {
    content: "I have a question about the recent fee structure changes. Could you please clarify the new payment schedule?",
    authorRole: "PARENT",
    recipientRoles: ["CAMPUS_ADMIN"],
    messageType: "PRIVATE",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Fee inquiry"
  },
  {
    content: "Payment reminder: Your monthly tuition fee of $1,200 is due on the 15th. Please ensure timely payment to avoid late fees.",
    authorRole: "CAMPUS_ADMIN",
    recipientRoles: ["PARENT"],
    messageType: "BROADCAST",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Fee reminder"
  },
  {
    content: "We have received your payment of $1,200 for monthly tuition. Thank you for your prompt payment. Receipt #TXN-2024-001234",
    authorRole: "CAMPUS_ADMIN",
    recipientRoles: ["PARENT"],
    messageType: "PRIVATE",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Payment confirmation"
  },
  {
    content: "Late fee notice: Your payment is overdue by 15 days. Please contact the finance office to arrange payment and avoid additional penalties.",
    authorRole: "CAMPUS_ADMIN",
    recipientRoles: ["PARENT"],
    messageType: "PRIVATE",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "MEDIUM",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Late fee notice"
  },

  // High-Risk/Flagged Messages (for testing moderation)
  {
    content: "This assignment is stupid and I hate this class. Why do we have to learn this boring stuff anyway?",
    authorRole: "STUDENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "GENERAL",
    riskLevel: "HIGH",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Inappropriate student language"
  },
  {
    content: "I'm really struggling with everything lately and feel like giving up on school completely.",
    authorRole: "STUDENT",
    recipientRoles: ["TEACHER"],
    messageType: "PRIVATE",
    contentCategory: "SUPPORT",
    riskLevel: "CRITICAL",
    isEducationalRecord: true,
    encryptionLevel: "EDUCATIONAL_RECORD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Student mental health concern"
  },

  // System Messages
  {
    content: "Your account password will expire in 7 days. Please update your password to maintain account security.",
    authorRole: "SYSTEM",
    recipientRoles: ["TEACHER", "STUDENT", "PARENT"],
    messageType: "SYSTEM",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Password expiry notification"
  },
  {
    content: "New feature: Real-time messaging is now available! You can now send and receive messages instantly.",
    authorRole: "SYSTEM",
    recipientRoles: ["SYSTEM_ADMIN", "CAMPUS_ADMIN", "TEACHER"],
    messageType: "BROADCAST",
    contentCategory: "ADMINISTRATIVE",
    riskLevel: "LOW",
    isEducationalRecord: false,
    encryptionLevel: "STANDARD",
    legalBasis: "LEGITIMATE_INTEREST",
    scenario: "Feature announcement"
  }
];

export async function seedMessages(prisma: PrismaClient) {
  console.log('Seeding messages...');

  try {
    // Get all users by role for message assignment
    const systemAdmins = await prisma.user.findMany({ where: { userType: 'SYSTEM_ADMIN' } });
    const campusAdmins = await prisma.user.findMany({ where: { userType: 'CAMPUS_ADMIN' } });
    const teachers = await prisma.user.findMany({ where: { userType: 'TEACHER' } });
    const students = await prisma.user.findMany({ where: { userType: 'STUDENT' } });
    const parents = await prisma.user.findMany({ where: { userType: 'CAMPUS_PARENT' } });

    // Get classes for context
    const classes = await prisma.class.findMany({ take: 5 });

    const usersByRole = {
      SYSTEM_ADMIN: systemAdmins,
      CAMPUS_ADMIN: campusAdmins,
      TEACHER: teachers,
      STUDENT: students,
      PARENT: parents,
      SYSTEM: [{ id: 'system', name: 'System' }] // Virtual system user
    };

    let messageCount = 0;

    for (const messageData of messageSeedData) {
      const authors = usersByRole[messageData.authorRole as keyof typeof usersByRole];
      if (!authors || authors.length === 0) continue;

      // Create multiple instances of each message type with different users
      const instancesToCreate = Math.min(3, authors.length);

      for (let i = 0; i < instancesToCreate; i++) {
        const author = authors[i % authors.length];
        if (!author) continue;

        // Get recipients based on roles
        const recipients: string[] = [];
        for (const recipientRole of messageData.recipientRoles) {
          const roleUsers = usersByRole[recipientRole as keyof typeof usersByRole];
          if (roleUsers && roleUsers.length > 0) {
            // Add 1-3 recipients from each role
            const recipientCount = Math.min(3, roleUsers.length);
            for (let j = 0; j < recipientCount; j++) {
              const recipient = roleUsers[j % roleUsers.length];
              if (recipient && recipient.id !== author.id) {
                recipients.push(recipient.id);
              }
            }
          }
        }

        if (recipients.length === 0) continue;

        // Create the message using SocialPost model (extended for messaging)
        const message = await prisma.socialPost.create({
          data: {
            content: messageData.content,
            contentType: 'TEXT',
            classId: classes[i % classes.length]?.id || classes[0]?.id,
            authorId: author.id,
            postType: 'REGULAR',
            
            // Messaging fields
            messageType: messageData.messageType,
            
            // Compliance fields
            consentRequired: messageData.riskLevel === 'CRITICAL',
            consentObtained: true,
            legalBasis: messageData.legalBasis,
            dataCategories: messageData.isEducationalRecord ? ['educational_record'] : ['general'],
            encryptionLevel: messageData.encryptionLevel,
            auditRequired: messageData.riskLevel === 'CRITICAL' || messageData.isEducationalRecord,
            crossBorderTransfer: false,
            
            // Classification fields
            contentCategory: messageData.contentCategory,
            riskLevel: messageData.riskLevel,
            flaggedKeywords: messageData.riskLevel === 'HIGH' || messageData.riskLevel === 'CRITICAL' 
              ? ['inappropriate', 'concerning'] : [],
            
            // Educational compliance
            isEducationalRecord: messageData.isEducationalRecord,
            directoryInformationLevel: messageData.isEducationalRecord ? 'RESTRICTED' : 'PUBLIC',
            parentalConsentRequired: messageData.isEducationalRecord && messageData.authorRole === 'STUDENT',
            disclosureLoggingRequired: messageData.isEducationalRecord,
            
            // Performance fields
            analyzedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: Math.floor(Math.random() * 10),
          }
        });

        // Create message recipients
        for (const recipientId of recipients) {
          await prisma.messageRecipient.create({
            data: {
              messageId: message.id,
              userId: recipientId,
              deliveryStatus: 'DELIVERED',
              readAt: Math.random() > 0.3 ? new Date() : null, // 70% read rate
            }
          });
        }

        messageCount++;
      }
    }

    console.log(`✅ Seeded ${messageCount} messages successfully`);
    return messageCount;

  } catch (error) {
    console.error('❌ Error seeding messages:', error);
    throw error;
  }
}
