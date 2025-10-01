/**
 * High-Performance Messaging tRPC Router
 * Optimized for 10K+ concurrent users with proper authentication and caching
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";
import { MessagingService } from "@/server/api/services/messaging.service";
import { ComplianceService } from "@/server/api/services/compliance.service";
import { NotificationDeliveryType, NotificationStatus } from "@/server/api/services/notification.service";

// Input validation schemas
const createMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  recipients: z.array(z.string()),
  threadId: z.string().optional(),
  parentMessageId: z.string().optional(),
  messageType: z.enum(['PUBLIC', 'PRIVATE', 'GROUP', 'BROADCAST', 'SYSTEM']).default('PRIVATE'),
  classId: z.string().optional(),
  subject: z.string().optional(),
  groupName: z.string().optional(), // For group messages
  taggedUserIds: z.array(z.string()).optional(), // For mentions
  metadata: z.record(z.any()).optional(), // Additional metadata
});

// New schemas for threaded messaging
const createConversationSchema = z.object({
  subject: z.string().min(1).max(200),
  type: z.enum(['direct', 'group', 'class', 'broadcast']).default('direct'),
  participants: z.array(z.string()).min(1),
  classId: z.string().optional(),
  courseId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  tags: z.array(z.string()).optional(),
});

const getConversationsSchema = z.object({
  includeArchived: z.boolean().default(false),
  search: z.string().optional(),
  type: z.enum(['direct', 'group', 'class', 'broadcast']).optional(),
  classId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const getThreadedMessagesSchema = z.object({
  conversationId: z.string(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  includeReplies: z.boolean().default(true),
});

const updateSubjectSchema = z.object({
  conversationId: z.string(),
  subject: z.string().min(1).max(200),
});

const addReactionSchema = z.object({
  messageId: z.string(),
  emoji: z.string().min(1).max(10),
});

const markAsReadSchema = z.object({
  conversationId: z.string(),
  messageId: z.string().optional(), // If provided, mark up to this message
});

const getMessagesSchema = z.object({
  threadId: z.string().optional(),
  classId: z.string().optional(),
  messageType: z.enum(['PUBLIC', 'PRIVATE', 'GROUP', 'BROADCAST', 'SYSTEM']).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  includeDeleted: z.boolean().default(false),
});

const moderationActionSchema = z.object({
  messageId: z.string(),
  action: z.enum(['APPROVE', 'BLOCK', 'ESCALATE', 'RESTORE']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const reportMessageSchema = z.object({
  messageId: z.string(),
  reason: z.enum(['INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SPAM', 'VIOLENCE', 'HATE_SPEECH', 'PRIVACY_VIOLATION', 'OTHER']),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

const complianceStatsSchema = z.object({
  scope: z.enum(['system-wide', 'campus', 'class']),
  campusId: z.string().optional(),
  classId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const searchRecipientsSchema = z.object({
  campusId: z.string().optional(),
  classId: z.string().optional(),
  search: z.string().optional(),
  userType: z.enum(['CAMPUS_TEACHER', 'CAMPUS_STUDENT', 'PARENT', 'COORDINATOR']).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(), // For pagination
});

const flaggedMessagesSchema = z.object({
  scope: z.enum(['all-campuses', 'campus', 'class']),
  campusId: z.string().optional(),
  classId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'BLOCKED', 'ESCALATED', 'RESOLVED']).optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const messagingRouter = createTRPCRouter({
  // ==================== CONVERSATION OPERATIONS ====================

  /**
   * Create a new conversation with subject
   */
  createConversation: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure the current user is always included in participants
        const allParticipants = [...new Set([ctx.session.user.id, ...input.participants])];

        const conversation = await ctx.prisma.conversation.create({
          data: {
            subject: input.subject,
            type: input.type.toUpperCase() as any,
            priority: input.priority.toUpperCase() as any,
            classId: input.classId,
            tags: input.tags || [],
            participants: {
              create: allParticipants.map(userId => ({
                userId,
                isAdmin: userId === ctx.session.user.id,
                canEditSubject: userId === ctx.session.user.id,
              }))
            }
          },
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        });

        return { success: true, conversation };
      } catch (error) {
        console.error('Error creating conversation:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create conversation',
          cause: error
        });
      }
    }),

  /**
   * Get conversations for current user
   */
  getConversations: protectedProcedure
    .input(getConversationsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          participants: {
            some: {
              userId: ctx.session.user.id,
              status: 'ACTIVE'
            }
          },
          status: 'ACTIVE'
        };

        if (!input.includeArchived) {
          where.isArchived = false;
        }

        if (input.search) {
          where.OR = [
            { subject: { contains: input.search, mode: 'insensitive' } },
            {
              messages: {
                some: {
                  content: { contains: input.search, mode: 'insensitive' }
                }
              }
            }
          ];
        }

        if (input.type) {
          where.type = input.type.toUpperCase();
        }

        if (input.classId) {
          where.classId = input.classId;
        }

        const conversations = await ctx.prisma.conversation.findMany({
          where,
          include: {
            participants: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: [
            { isPinned: 'desc' },
            { lastMessageAt: 'desc' },
            { createdAt: 'desc' }
          ],
          take: input.limit
        });

        return conversations.map(conv => ({
          id: conv.id,
          subject: conv.subject,
          type: conv.type.toLowerCase(),
          priority: conv.priority.toLowerCase(),
          isPinned: conv.isPinned,
          isArchived: conv.isArchived,
          unreadCount: conv.participants.find(p => p.userId === ctx.session.user.id)?.unreadCount || 0,
          lastMessage: conv.messages[0] ? {
            content: conv.messages[0].content,
            senderName: conv.messages[0].sender.name,
            sentAt: conv.messages[0].sentAt
          } : null,
          participants: conv.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            avatar: null // TODO: Add avatar support
          })),
          classInfo: conv.classId ? {
            id: conv.classId,
            name: 'Class' // TODO: Add class name lookup
          } : null
        }));
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversations',
          cause: error
        });
      }
    }),

  // ==================== MESSAGE OPERATIONS ====================

  /**
   * Create a new message with full compliance processing
   */
  createMessage: protectedProcedure
    .input(createMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        const result = await service.createMessage(ctx.session.user.id, input);

        return {
          success: true,
          message: result.message,
          complianceProfile: result.complianceProfile,
          warnings: result.warnings || []
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create message',
          cause: error
        });
      }
    }),

  /**
   * Get threaded messages for a conversation
   */
  getThreadedMessages: protectedProcedure
    .input(getThreadedMessagesSchema)
    .query(async ({ ctx, input }) => {
      try {
        // First check if conversation exists
        const conversationExists = await ctx.prisma.conversation.findUnique({
          where: { id: input.conversationId },
          select: { id: true }
        });

        if (!conversationExists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          });
        }

        // Verify user has access to conversation
        const participant = await ctx.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        // Debug logging
        console.log('DEBUG: getThreadedMessages access check', {
          conversationId: input.conversationId,
          userId: ctx.session.user.id,
          participantFound: !!participant
        });

        if (!participant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this conversation'
          });
        }

        // Get all messages for the conversation
        const allMessages = await ctx.prisma.message.findMany({
          where: {
            conversationId: input.conversationId,
            isDeleted: false
          },
          include: {
            sender: {
              select: { id: true, name: true }
            },
            reactions: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            },
            readStatus: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { sentAt: 'asc' }
        });

        // Build threaded structure
        const messageMap = new Map();
        const rootMessages: any[] = [];

        // First pass: create message objects and map them
        allMessages.forEach(msg => {
          const transformedMessage = {
            id: msg.id,
            content: msg.content,
            messageType: msg.messageType.toLowerCase(),
            senderId: msg.senderId,
            senderName: msg.sender.name,
            senderAvatar: undefined,
            sentAt: msg.sentAt,
            editedAt: msg.editedAt,
            isEdited: msg.isEdited,
            isPinned: msg.isPinned,
            threadDepth: msg.threadDepth,
            parentMessageId: msg.parentMessageId,
            replyCount: msg.replyCount,
            mentions: msg.mentions,
            reactions: msg.reactions.reduce((acc: any, reaction: any) => {
              const existing = acc.find((r: any) => r.emoji === reaction.emoji);
              if (existing) {
                existing.count++;
                existing.users.push({ id: reaction.user.id, name: reaction.user.name });
                if (reaction.userId === ctx.session.user.id) {
                  existing.hasReacted = true;
                }
              } else {
                acc.push({
                  emoji: reaction.emoji,
                  count: 1,
                  users: [{ id: reaction.user.id, name: reaction.user.name }],
                  hasReacted: reaction.userId === ctx.session.user.id
                });
              }
              return acc;
            }, []),
            readBy: msg.readStatus.map((rs: any) => ({
              userId: rs.userId,
              userName: rs.user.name,
              readAt: rs.readAt
            })),
            replies: []
          };

          messageMap.set(msg.id, transformedMessage);
        });

        // Second pass: build the threaded structure
        messageMap.forEach(message => {
          if (message.parentMessageId) {
            // This is a reply
            const parent = messageMap.get(message.parentMessageId);
            if (parent) {
              parent.replies.push(message);
            }
          } else {
            // This is a root message
            rootMessages.push(message);
          }
        });

        return rootMessages;


      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch messages',
          cause: error
        });
      }
    }),

  /**
   * Get single conversation details
   */
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // First check if conversation exists at all
        const conversationExists = await ctx.prisma.conversation.findUnique({
          where: { id: input.conversationId },
          select: { id: true }
        });

        if (!conversationExists) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation not found'
          });
        }

        // Check if user is a participant
        const participant = await ctx.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        // Debug logging
        console.log('DEBUG: getConversation access check', {
          conversationId: input.conversationId,
          userId: ctx.session.user.id,
          participantFound: !!participant,
          participantId: participant?.id
        });

        if (!participant) {
          // Additional debug: check all participants for this conversation
          const allParticipants = await ctx.prisma.conversationParticipant.findMany({
            where: { conversationId: input.conversationId },
            select: { userId: true, status: true }
          });
          console.log('DEBUG: All participants for conversation:', allParticipants);

          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this conversation'
          });
        }

        // Get full conversation details
        const conversation = await ctx.prisma.conversation.findUnique({
          where: { id: input.conversationId },
          include: {
            participants: {
              where: { status: 'ACTIVE' },
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            class: {
              select: { id: true, name: true }
            }
          }
        });

        if (!conversation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Conversation details not found'
          });
        }

        return {
          id: conversation.id,
          subject: conversation.subject,
          type: conversation.type.toLowerCase(),
          participants: conversation.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            avatar: null, // TODO: Add avatar support
            isOnline: false // TODO: Add online status
          })),
          classInfo: conversation.class ? {
            id: conversation.class.id,
            name: conversation.class.name
          } : null
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversation',
          cause: error
        });
      }
    }),

  /**
   * Update conversation subject
   */
  updateConversationSubject: protectedProcedure
    .input(updateSubjectSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user can edit subject
        const participant = await ctx.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
            canEditSubject: true,
            status: 'ACTIVE'
          }
        });

        if (!participant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to edit this conversation subject'
          });
        }

        const conversation = await ctx.prisma.conversation.update({
          where: { id: input.conversationId },
          data: { subject: input.subject }
        });

        return { success: true, conversation };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subject',
          cause: error
        });
      }
    }),

  /**
   * Add reaction to message
   */
  addReaction: protectedProcedure
    .input(addReactionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if reaction already exists
        const existing = await ctx.prisma.messageReaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId: input.messageId,
              userId: ctx.session.user.id,
              emoji: input.emoji
            }
          }
        });

        if (existing) {
          // Remove reaction if it exists
          await ctx.prisma.messageReaction.delete({
            where: { id: existing.id }
          });
          return { success: true, action: 'removed' };
        } else {
          // Add new reaction
          await ctx.prisma.messageReaction.create({
            data: {
              messageId: input.messageId,
              userId: ctx.session.user.id,
              emoji: input.emoji
            }
          });
          return { success: true, action: 'added' };
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add reaction',
          cause: error
        });
      }
    }),

  /**
   * Mark messages as read
   */
  markAsRead: protectedProcedure
    .input(markAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is participant
        const participant = await ctx.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        if (!participant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this conversation'
          });
        }

        if (input.messageId) {
          // Mark specific message as read
          await ctx.prisma.messageReadStatus.upsert({
            where: {
              messageId_userId: {
                messageId: input.messageId,
                userId: ctx.session.user.id
              }
            },
            create: {
              messageId: input.messageId,
              userId: ctx.session.user.id
            },
            update: {
              readAt: new Date()
            }
          });
        } else {
          // Mark all messages in conversation as read
          const messages = await ctx.prisma.message.findMany({
            where: {
              conversationId: input.conversationId,
              isDeleted: false
            },
            select: { id: true }
          });

          await ctx.prisma.messageReadStatus.createMany({
            data: messages.map(msg => ({
              messageId: msg.id,
              userId: ctx.session.user.id
            })),
            skipDuplicates: true
          });

          // Reset unread count
          await ctx.prisma.conversationParticipant.update({
            where: { id: participant.id },
            data: { unreadCount: 0, lastReadAt: new Date() }
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark as read',
          cause: error
        });
      }
    }),

  /**
   * Get subject suggestions
   */
  getSubjectSuggestions: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      limit: z.number().min(1).max(50).default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const suggestions = [];

        // Recent subjects from user's conversations
        const recentSubjects = await ctx.prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: ctx.session.user.id,
                status: 'ACTIVE'
              }
            },
            subject: input.query ? {
              contains: input.query,
              mode: 'insensitive'
            } : undefined
          },
          select: { subject: true },
          distinct: ['subject'],
          orderBy: { lastMessageAt: 'desc' },
          take: 10
        });

        // suggestions.push(...recentSubjects.map(conv => ({
        //   text: conv.subject,
        //   category: 'recent' as const,
        //   metadata: { usageCount: 1 }
        // })));

        // Class-based suggestions
        const userClasses = await ctx.prisma.class.findMany({
          where: {
            students: {
              some: {
                student: {
                  userId: ctx.session.user.id
                }
              }
            }
          },
          select: { id: true, name: true },
          take: 5
        });

        // suggestions.push(...userClasses.map(cls => ({
        //   text: `${cls.name} Discussion`,
        //   category: 'class' as const,
        //   metadata: { classId: cls.id, className: cls.name }
        // })));

        // Template suggestions
        const templates = [
          'Assignment Help',
          'Project Discussion',
          'Study Group',
          'Exam Preparation',
          'General Question',
          'Course Feedback'
        ];

        // if (!input.query || templates.some(t => t.toLowerCase().includes(input.query!.toLowerCase()))) {
        //   suggestions.push(...templates.map(template => ({
        //     text: template,
        //     category: 'template' as const
        //   })));
        // }

        return suggestions.slice(0, input.limit);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch suggestions',
          cause: error
        });
      }
    }),

  /**
   * Send a message to a conversation
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(5000),
      parentMessageId: z.string().optional(),
      mentions: z.array(z.string()).optional(),
      messageType: z.enum(['text']).default('text')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is participant
        const participant = await ctx.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: input.conversationId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        if (!participant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this conversation'
          });
        }

        // Calculate thread depth
        let threadDepth = 0;
        if (input.parentMessageId) {
          const parentMessage = await ctx.prisma.message.findUnique({
            where: { id: input.parentMessageId },
            select: { threadDepth: true }
          });
          threadDepth = (parentMessage?.threadDepth || 0) + 1;
        }

        // Create message
        const message = await ctx.prisma.message.create({
          data: {
            conversationId: input.conversationId,
            senderId: ctx.session.user.id,
            content: input.content,
            messageType: input.messageType.toUpperCase() as any,
            parentMessageId: input.parentMessageId,
            threadDepth,
            mentions: input.mentions || []
          },
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        });

        // Update parent message reply count
        if (input.parentMessageId) {
          await ctx.prisma.message.update({
            where: { id: input.parentMessageId },
            data: {
              replyCount: {
                increment: 1
              }
            }
          });
        }

        // Send notifications to other participants
        try {
          const participants = await ctx.prisma.conversationParticipant.findMany({
            where: {
              conversationId: input.conversationId,
              userId: { not: ctx.session.user.id }, // Exclude sender
              status: 'ACTIVE'
            },
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          });

          // Get conversation details for notification
          const conversation = await ctx.prisma.conversation.findUnique({
            where: { id: input.conversationId },
            select: { subject: true, type: true }
          });

          if (participants.length > 0 && conversation) {
            // Import notification service
            const { NotificationService } = await import('../services/notification.service');
            const notificationService = new NotificationService({ prisma: ctx.prisma });

            const recipientIds = participants.map(p => p.userId);
            const senderName = message.sender.name;
            const messagePreview = input.content.length > 50
              ? input.content.substring(0, 50) + '...'
              : input.content;

            await notificationService.createNotification({
              title: `New message from ${senderName}`,
              content: `${conversation.subject}: ${messagePreview}`,
              type: 'MESSAGE',
              deliveryType: NotificationDeliveryType.IN_APP,
              status: NotificationStatus.PUBLISHED,
              senderId: ctx.session.user.id,
              recipientIds,
              metadata: {
                conversationId: input.conversationId,
                messageId: message.id,
                conversationType: conversation.type,
                actionUrl: `/messages/${input.conversationId}`
              }
            });
          }
        } catch (notificationError) {
          // Log notification error but don't fail the message send
          console.error('Failed to send message notifications:', notificationError);
        }

        return { success: true, message };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message',
          cause: error
        });
      }
    }),

  /**
   * Get available users for messaging
   */
  getAvailableUsers: protectedProcedure
    .input(z.object({
      classId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          status: 'ACTIVE',
          id: { not: ctx.session.user.id } // Exclude current user
        };

        if (input.search) {
          where.OR = [
            { name: { contains: input.search, mode: 'insensitive' } },
            { email: { contains: input.search, mode: 'insensitive' } }
          ];
        }

        if (input.classId) {
          // Get users from specific class
          where.OR = [
            // Students in the class
            {
              studentProfile: {
                enrollments: {
                  some: {
                    class: {
                      id: input.classId
                    }
                  }
                }
              }
            },
            // Teachers assigned to the class
            {
              teacherProfile: {
                assignments: {
                  some: {
                    class: {
                      id: input.classId
                    }
                  }
                }
              }
            }
          ];
        }

        const users = await ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            userType: true
          },
          take: input.limit,
          orderBy: { name: 'asc' }
        });

        return users;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
          cause: error
        });
      }
    }),

  /**
   * Get messages with pagination and filtering
   */
  getMessages: protectedProcedure
    .input(getMessagesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getMessages(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve messages',
          cause: error
        });
      }
    }),

  /**
   * Get message thread with full context
   */
  getThread: protectedProcedure
    .input(z.object({
      threadId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getThread(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve thread',
          cause: error
        });
      }
    }),



  /**
   * Mark all messages in a thread as read
   */
  markThreadAsRead: protectedProcedure
    .input(z.object({
      threadId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        await service.markThreadAsRead(ctx.session.user.id, input.threadId);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark thread as read',
          cause: error
        });
      }
    }),

  /**
   * Get unread message count
   */
  getUnreadCount: protectedProcedure
    .input(z.object({
      classId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getUnreadCount(ctx.session.user.id, input.classId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get unread count',
          cause: error
        });
      }
    }),

  /**
   * Create a group message with multiple recipients
   */
  createGroupMessage: protectedProcedure
    .input(createMessageSchema.extend({
      messageType: z.literal('GROUP'),
      groupName: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);

        // Create the group message with enhanced metadata
        const result = await service.createMessage(ctx.session.user.id, {
          ...input,
          metadata: {
            ...input.metadata,
            isGroupMessage: true,
            groupName: input.groupName,
            recipientCount: input.recipients.length,
            createdBy: ctx.session.user.id,
            createdAt: new Date().toISOString()
          }
        });

        return {
          success: true,
          message: result.message,
          complianceProfile: result.complianceProfile,
          warnings: result.warnings || [],
          groupInfo: {
            name: input.groupName,
            recipientCount: input.recipients.length
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create group message',
          cause: error
        });
      }
    }),

  // ==================== COMPLIANCE OPERATIONS ====================

  /**
   * Get compliance statistics (Admin only)
   */
  getComplianceStats: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(complianceStatsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new ComplianceService(ctx.prisma);
        return await service.getComplianceStats(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve compliance statistics',
          cause: error
        });
      }
    }),

  /**
   * Get audit trail for a message (Admin only)
   */
  getMessageAuditTrail: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN, UserType.TEACHER])
    .input(z.object({
      messageId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new ComplianceService(ctx.prisma);
        return await service.getMessageAuditTrail(input.messageId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve audit trail',
          cause: error
        });
      }
    }),

  /**
   * Get FERPA disclosure logs (Admin only)
   */
  getFerpaDisclosures: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({
      studentId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new ComplianceService(ctx.prisma);
        return await service.getFerpaDisclosures(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve FERPA disclosures',
          cause: error
        });
      }
    }),

  // ==================== MODERATION OPERATIONS ====================

  /**
   * Get flagged messages for moderation
   */
  getFlaggedMessages: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN, UserType.TEACHER])
    .input(flaggedMessagesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getFlaggedMessages(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve flagged messages',
          cause: error
        });
      }
    }),

  /**
   * Report a message for moderation
   */
  reportMessage: protectedProcedure
    .input(reportMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the message exists and user has access to it
        const message = await ctx.prisma.message.findFirst({
          where: {
            id: input.messageId,
            conversation: {
              participants: {
                some: {
                  userId: ctx.session.user.id,
                  status: 'ACTIVE'
                }
              }
            }
          },
          include: {
            sender: { select: { id: true, name: true } },
            conversation: { select: { id: true, subject: true, classId: true } }
          }
        });

        if (!message) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found or access denied'
          });
        }

        // Check if user already reported this message using audit log
        const existingReport = await ctx.prisma.messageAuditLog.findFirst({
          where: {
            messageId: input.messageId,
            actorId: ctx.session.user.id,
            action: 'ESCALATED',
            details: {
              path: ['reportType'],
              equals: 'USER_REPORT'
            }
          }
        });

        if (existingReport) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You have already reported this message'
          });
        }

        // Create audit log entry for the report
        const report = await ctx.prisma.messageAuditLog.create({
          data: {
            messageId: input.messageId,
            actorId: ctx.session.user.id,
            action: 'ESCALATED',
            details: {
              reportType: 'USER_REPORT',
              reason: input.reason,
              description: input.description,
              priority: input.priority,
              conversationId: message.conversation.id,
              classId: message.conversation.classId,
              reportedAt: new Date().toISOString()
            }
          }
        });

        // TODO: Send notification to moderators if priority is HIGH or CRITICAL
        // TODO: Auto-flag message if multiple reports

        return {
          success: true,
          reportId: report.id,
          message: 'Message reported successfully. Moderators will review it shortly.'
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to report message',
          cause: error
        });
      }
    }),

  /**
   * Moderate a message
   */
  moderateMessage: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN, UserType.TEACHER])
    .input(moderationActionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.moderateMessage(ctx.session.user.id, input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to moderate message',
          cause: error
        });
      }
    }),

  /**
   * Get moderation queue statistics
   */
  getModerationStats: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN, UserType.TEACHER])
    .input(z.object({
      scope: z.enum(['all-campuses', 'campus', 'class']),
      campusId: z.string().optional(),
      classId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getModerationStats(input);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve moderation statistics',
          cause: error
        });
      }
    }),

  // ==================== RETENTION OPERATIONS ====================

  /**
   * Get retention statistics (Admin only)
   */
  getRetentionStats: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .query(async ({ ctx }) => {
      try {
        const service = new ComplianceService(ctx.prisma);
        return await service.getRetentionStats();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve retention statistics',
          cause: error
        });
      }
    }),

  /**
   * Update message retention period (Admin only)
   */
  updateRetentionPeriod: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({
      messageId: z.string(),
      retentionPeriod: z.number().min(1).max(3650), // 1 day to 10 years
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new ComplianceService(ctx.prisma);
        await service.updateRetentionPeriod(input.messageId, input.retentionPeriod, input.reason);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update retention period',
          cause: error
        });
      }
    }),

  // ==================== RECIPIENT SEARCH ====================

  /**
   * Search for potential message recipients with compliance filtering
   */
  searchRecipients: protectedProcedure
    .input(searchRecipientsSchema)
    .query(async ({ ctx, input }) => {
      console.log('🔍 searchRecipients called with input:', input);
      console.log('🔍 User context:', { userId: ctx.session?.user?.id, userType: ctx.session?.user?.userType });

      try {
        const { campusId, classId, search, userType, limit, cursor } = input;

        // Build base where clause
        const where: any = {
          status: 'ACTIVE', // Only active users
        };

        console.log('🔍 Initial where clause:', where);

        // Add campus filter if provided (skip for parents to avoid excluding them)
        if (campusId && userType !== 'PARENT') {
          where.activeCampuses = {
            some: {
              campusId,
              status: 'ACTIVE'
            }
          };
        }

        // Add userType filter if provided (handle legacy vs campus-prefixed values)
        if (userType) {
          if (userType === 'CAMPUS_TEACHER') {
            where.userType = { in: ['CAMPUS_TEACHER', 'TEACHER'] };
          } else if (userType === 'CAMPUS_STUDENT') {
            where.userType = { in: ['CAMPUS_STUDENT', 'STUDENT'] };
          } else if (userType === 'PARENT') {
            where.userType = { in: ['CAMPUS_PARENT', 'PARENT'] };
          } else if (userType === 'COORDINATOR') {
            where.userType = { in: ['CAMPUS_COORDINATOR', 'COORDINATOR'] };
          } else {
            where.userType = userType;
          }
          console.log('🔍 Added userType filter:', where.userType);
        }

        // Add search filter if provided
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } }
          ];
        }

        // Add cursor-based pagination for performance with large datasets
        if (cursor) {
          where.id = {
            gt: cursor
          };
        }

        console.log('🔍 Final where clause before query:', JSON.stringify(where, null, 2));

        // Get users with compliance-safe fields only
        const users = await ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
          },
          take: limit + 1, // Take one extra to check if there are more
          orderBy: { id: 'asc' } // Use id for consistent cursor pagination
        });

        console.log('🔍 Query result:', `${users.length} users found`);

        // If classId is provided, also get class-specific users
        let classUsers: any[] = [];
        if (classId) {
          // Get class enrollments (students)
          const enrollments = await ctx.prisma.studentEnrollment.findMany({
            where: {
              classId,
              status: 'ACTIVE',
            },
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      userType: true,
                    },
                  },
                },
              },
            },
          });

          // Get class teachers
          const teacherAssignments = await ctx.prisma.teacherAssignment.findMany({
            where: {
              classId,
              status: 'ACTIVE',
            },
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      userType: true,
                    },
                  },
                },
              },
            },
          });

          // Combine class users
          classUsers = [
            ...enrollments.map(e => e.student.user),
            ...teacherAssignments.map(ta => ta.teacher.user),
          ];
        }

        // Handle pagination
        const hasMore = users.length > limit;
        const paginatedUsers = hasMore ? users.slice(0, -1) : users;
        const nextCursor = hasMore ? paginatedUsers[paginatedUsers.length - 1]?.id : null;

        // Merge and deduplicate with class users
        const allUsers = [...paginatedUsers];
        classUsers.forEach(classUser => {
          if (!allUsers.some(user => user.id === classUser.id)) {
            allUsers.push(classUser);
          }
        });

        // Apply final search filter if needed
        let finalUsers = allUsers;
        if (search) {
          finalUsers = allUsers.filter(user =>
            user.name?.toLowerCase().includes(search.toLowerCase()) ||
            user.email?.toLowerCase().includes(search.toLowerCase())
          );
        }

        return {
          recipients: finalUsers.slice(0, limit),
          hasMore: hasMore || finalUsers.length > limit,
          nextCursor
        };
      } catch (error) {
        console.error('searchRecipients error:', error);
        console.error('Input:', input);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to search recipients: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        });
      }
    }),

  // ==================== CLASS USERS (Social Wall Pattern) ====================

  /**
   * Get class users for messaging (following social wall architecture)
   */
  getClassUsers: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { classId } = input;

        // Get class enrollments (students)
        const enrollments = await ctx.prisma.studentEnrollment.findMany({
          where: {
            classId,
            status: 'ACTIVE',
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                  },
                },
              },
            },
          },
        });

        // Get class teachers
        const teacherAssignments = await ctx.prisma.teacherAssignment.findMany({
          where: {
            classId,
            status: 'ACTIVE',
          },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                  },
                },
              },
            },
          },
        });

        // Combine and format users
        const users = [
          ...enrollments.map(e => ({
            id: e.student.user.id,
            name: e.student.user.name || 'Unknown Student',
            email: e.student.user.email,
            userType: 'STUDENT', // Normalize for social wall compatibility
          })),
          ...teacherAssignments.map(ta => ({
            id: ta.teacher.user.id,
            name: ta.teacher.user.name || 'Unknown Teacher',
            email: ta.teacher.user.email,
            userType: 'TEACHER', // Normalize for social wall compatibility
          })),
        ];

        return users;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve class users',
          cause: error
        });
      }
    }),

  // ==================== PERFORMANCE MONITORING ====================

  /**
   * Get system performance statistics (System Admin only)
   */
  getPerformanceStats: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .query(async ({ ctx }) => {
      try {
        const service = new MessagingService(ctx.prisma);
        return await service.getPerformanceStats();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve performance statistics',
          cause: error
        });
      }
    }),
});
