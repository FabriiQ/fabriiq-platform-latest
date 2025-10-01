import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../../server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";
import { generateText, streamText } from 'ai';
import { geminiModel, educationalSystemPrompt, searchTools } from '../lib/ai/providers';
import type { TeacherContext } from '../lib/types';
import { observable } from '@trpc/server/observable';
import { generateUUID } from '../lib/utils';

// In-memory document store (replace with database later)
const documents = new Map<string, any[]>();

// Helper function to determine if a message is requesting content generation
function isContentGenerationRequest(message: string): boolean {
  const contentKeywords = [
    'create', 'generate', 'make', 'build', 'design', 'develop',
    'worksheet', 'lesson plan', 'assessment', 'quiz', 'test',
    'handout', 'activity', 'exercise', 'assignment', 'rubric',
    'curriculum', 'syllabus', 'outline', 'template', 'format',
    'reading', 'passage', 'article', 'story', 'text', 'content'
  ];

  const lowerMessage = message.toLowerCase();
  return contentKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to determine if a message is requesting reading content specifically
function isReadingContentRequest(message: string): boolean {
  const readingKeywords = [
    'reading', 'passage', 'article', 'story', 'text content',
    'educational content', 'reading material', 'comprehension text'
  ];

  const lowerMessage = message.toLowerCase();
  return readingKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to extract document title from message
function extractDocumentTitle(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('reading') || lowerMessage.includes('passage')) return 'Reading Material';
  if (lowerMessage.includes('worksheet')) return 'Educational Worksheet';
  if (lowerMessage.includes('lesson plan')) return 'Lesson Plan';
  if (lowerMessage.includes('assessment')) return 'Assessment';
  if (lowerMessage.includes('quiz')) return 'Quiz';
  if (lowerMessage.includes('test')) return 'Test';
  if (lowerMessage.includes('activity')) return 'Learning Activity';
  if (lowerMessage.includes('exercise')) return 'Exercise';
  if (lowerMessage.includes('assignment')) return 'Assignment';
  if (lowerMessage.includes('handout')) return 'Handout';
  if (lowerMessage.includes('rubric')) return 'Rubric';
  if (lowerMessage.includes('article')) return 'Educational Article';
  if (lowerMessage.includes('story')) return 'Educational Story';
  if (lowerMessage.includes('content')) return 'Educational Content';

  return 'Educational Document';
}

// Helper function to generate meaningful conversation titles
function generateConversationTitle(content: string): string {
  // Clean the content
  const cleanContent = content.trim().toLowerCase();

  // Look for specific educational patterns
  const patterns = [
    // Worksheet patterns
    /(?:create|make|generate).*?worksheet.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /worksheet.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Lesson patterns
    /(?:create|make|generate).*?lesson.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /lesson.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Activity patterns
    /(?:create|make|generate).*?activity.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /activity.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Assessment patterns
    /(?:create|make|generate).*?(?:assessment|quiz|test).*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /(?:assessment|quiz|test).*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // General topic patterns
    /(?:help|teach|explain|about)\s+(.+?)(?:\.|$|for|with)/i,
    /(?:on|about)\s+(.+?)(?:\s+for|\s+worksheet|\s+lesson|\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();

      // Clean up the title
      title = title.replace(/\s+/g, ' '); // Remove extra spaces
      title = title.replace(/[^\w\s-]/g, ''); // Remove special chars except hyphens

      if (title.length > 3 && title.length < 60) {
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
  }

  // Fallback: use first meaningful words
  const words = content.split(' ').filter(word => word.length > 2).slice(0, 5);
  if (words.length > 0) {
    const title = words.join(' ');
    if (title.length > 5 && title.length < 60) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  return 'New Conversation';
}

// Input schemas
const contextDataSchema = z.object({
  class: z.string(),
  subject: z.string(),
  topic: z.string(),
  learningOutcomes: z.string(),
  assessmentCriteria: z.string(),
  gradeLevel: z.string(),
});

const chatMessageSchema = z.object({
  message: z.string(),
  teacherContext: z.object({
    teacher: z.object({
      id: z.string(),
      name: z.string(),
      subjects: z.array(z.string()),
    }),
    currentClass: z.object({
      id: z.string(),
      name: z.string(),
      subject: z.object({
        id: z.string(),
        name: z.string(),
      }).optional(),
    }).optional(),
    currentPage: z.string().optional(),
  }),
  searchEnabled: z.boolean().optional().default(true),
  context: contextDataSchema.optional(),
});

const documentSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  content: z.string(),
  kind: z.enum(['text', 'code', 'image', 'sheet']),
});

// Educational document creation tool
const createDocument = {
  description: 'Create educational documents like worksheets, lesson plans, assessments, and other teaching materials. Use this when the user asks for structured educational content.',
  parameters: z.object({
    title: z.string().describe('Title of the educational document'),
    kind: z.enum(['text', 'image']).describe('Type of document to create'),
  }),
};

export const teacherAssistantV2Router = createTRPCRouter({
  /**
   * Streaming chat response with search tools and artifact support
   */
  streamResponse: protectedProcedure
    .input(chatMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a teacher
        const user = ctx.session?.user as any;
        if (!user?.id ||
            (user.userType !== UserType.CAMPUS_TEACHER &&
             user.userType !== UserType.TEACHER)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only teachers can use the Teacher Assistant",
          });
        }

        // Build enhanced system prompt with teacher context
        const contextualPrompt = `${educationalSystemPrompt}

Teacher Context:
- Name: ${input.teacherContext.teacher.name}
- Subjects: ${input.teacherContext.teacher.subjects.join(', ')}
- Current Class: ${input.teacherContext.currentClass?.name || 'Not specified'}
- Current Page: ${input.teacherContext.currentPage || 'Teacher Assistant'}

Please provide helpful, educational responses tailored to this teacher's context.`;

        // Determine if this is content generation
        const isContentGeneration = isContentGenerationRequest(input.message);

        // Determine if search is needed based on message content
        const needsSearch = input.searchEnabled && (
          input.message.toLowerCase().includes('search') ||
          input.message.toLowerCase().includes('find') ||
          input.message.toLowerCase().includes('image') ||
          input.message.toLowerCase().includes('current') ||
          input.message.toLowerCase().includes('recent') ||
          input.message.toLowerCase().includes('latest')
        );

        // Use Vercel AI SDK to generate response with conditional search tools
        const result = await generateText({
          model: geminiModel,
          system: contextualPrompt,
          prompt: input.message,
          temperature: 0.7,
          tools: needsSearch ? searchTools : undefined,
        });

        // Extract tool invocations and results
        const toolInvocations = result.toolCalls || [];
        const toolResults = result.toolResults || [];

        // Process search results from tool calls
        let searchResults: any = {};
        if (toolResults.length > 0) {
          for (const toolResult of toolResults) {
            const output = (toolResult as any).output;
            if (toolResult.toolName === 'webSearch' && output) {
              searchResults.webResults = output.results || [];
              searchResults.query = output.query || '';
            } else if (toolResult.toolName === 'imageSearch' && output) {
              searchResults.imageResults = output.images || [];
              if (!searchResults.query) {
                searchResults.query = output.query || '';
              }
            } else if (toolResult.toolName === 'comprehensiveSearch' && output) {
              searchResults.webResults = output.webResults || [];
              searchResults.imageResults = output.imageResults || [];
              searchResults.query = output.query || '';
            }
          }
        }

        if (isContentGeneration) {
          // For content generation, separate the document content from the conversational response
          const documentTitle = extractDocumentTitle(input.message);

          return {
            type: 'artifact-complete',
            data: {
              title: documentTitle,
              content: result.text,
              kind: 'text' as const,
              documentId: generateUUID(),
              shouldCreateArtifact: true,
              conversationalResponse: `I've created "${documentTitle}" for you. You can view and edit it in the document panel on the right. The document includes structured content with clear sections, activities, and educational elements tailored for your teaching needs.`,
              searchResults: Object.keys(searchResults).length > 0 ? searchResults : undefined,
            },
          };
        }

        return {
          type: 'text-complete',
          data: {
            content: result.text,
            shouldCreateArtifact: false,
            searchResults: Object.keys(searchResults).length > 0 ? searchResults : undefined,
          },
        };

      } catch (error) {
        console.error('Teacher Assistant V2 generation error:', error);
        return {
          type: 'error',
          data: error instanceof Error ? error.message : "Failed to generate response",
        };
      }
    }),

  /**
   * Generate chat response using Vercel AI SDK (legacy)
   */
  generateResponse: protectedProcedure
    .input(chatMessageSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a teacher
        const user = ctx.session?.user as any;
        if (!user?.id ||
            (user.userType !== UserType.CAMPUS_TEACHER &&
             user.userType !== UserType.TEACHER)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only teachers can use the Teacher Assistant",
          });
        }

        // Analyze if this is a content generation request or conversation
        const isContentGeneration = isContentGenerationRequest(input.message);

        // Build enhanced system prompt with teacher context
        const basePrompt = isContentGeneration
          ? `${educationalSystemPrompt}

IMPORTANT: You are creating educational content that will be displayed in a document editor.
- Format your response as a complete, well-structured educational document
- Use proper markdown formatting with headers, lists, and sections
- Include clear instructions, learning objectives, and assessment criteria
- Make it ready for classroom use`
          : `${educationalSystemPrompt}

IMPORTANT: You are having a conversation with a teacher.
- Provide helpful, conversational responses
- Ask clarifying questions when needed
- Suggest actionable next steps
- Keep responses concise and focused`;

        // Add search instructions based on searchEnabled flag
        const searchInstructions = input.searchEnabled
          ? `

SEARCH MODE: While search tools are being optimized, provide responses as if you have access to current information.
- Reference current educational research and best practices
- Suggest relevant visual aids and diagrams that would be helpful
- Provide up-to-date teaching strategies and methods
- Include examples of successful educational approaches`
          : `

KNOWLEDGE-ONLY MODE: Use only your existing knowledge. Focus on proven educational principles and established best practices.`;

        // Add educational context if provided
        const educationalContext = input.context && (
          input.context.class ||
          input.context.subject ||
          input.context.topic ||
          input.context.learningOutcomes ||
          input.context.assessmentCriteria
        ) ? `

Educational Context:
- Class: ${input.context.class || 'Not specified'}
- Subject: ${input.context.subject || 'Not specified'}
- Grade Level: ${input.context.gradeLevel || 'Not specified'}
- Current Topic: ${input.context.topic || 'Not specified'}
- Learning Outcomes: ${input.context.learningOutcomes || 'Not specified'}
- Assessment Criteria: ${input.context.assessmentCriteria || 'Not specified'}

Please tailor your response to this specific educational context.` : '';

        const contextualPrompt = `${basePrompt}${searchInstructions}

Teacher Context:
- Name: ${input.teacherContext.teacher.name}
- Subjects: ${input.teacherContext.teacher.subjects.join(', ')}
- Current Class: ${input.teacherContext.currentClass?.name || 'Not specified'}
- Current Page: ${input.teacherContext.currentPage || 'Teacher Assistant'}${educationalContext}

Please provide helpful, educational responses tailored to this teacher's context.`;

        // Determine if search is needed based on message content
        const needsSearch = input.searchEnabled && (
          input.message.toLowerCase().includes('search') ||
          input.message.toLowerCase().includes('find') ||
          input.message.toLowerCase().includes('image') ||
          input.message.toLowerCase().includes('current') ||
          input.message.toLowerCase().includes('recent') ||
          input.message.toLowerCase().includes('latest') ||
          input.message.toLowerCase().includes('research')
        );

        // Use Vercel AI SDK to generate response with conditional search tools
        const result = await generateText({
          model: geminiModel,
          system: contextualPrompt,
          prompt: input.message,
          temperature: 0.7,
          tools: needsSearch ? searchTools : undefined,
          maxRetries: 1, // Reduce retries for faster response
        });

        if (isContentGeneration) {
          // For content generation, separate the document content from the conversational response
          const documentTitle = extractDocumentTitle(input.message);

          return {
            content: `I've created "${documentTitle}" for you. You can view and edit it in the document panel on the right. The document includes structured content with clear sections, activities, and educational elements tailored for your teaching needs.`,
            usage: result.usage,
            finishReason: result.finishReason,
            isContentGeneration,
            shouldCreateArtifact: true,
            artifactContent: result.text,
            artifactTitle: documentTitle,
            artifactKind: 'text' as const,
          };
        }

        return {
          content: result.text,
          usage: result.usage,
          finishReason: result.finishReason,
          isContentGeneration,
          shouldCreateArtifact: false,
        };

      } catch (error) {
        console.error('Teacher Assistant V2 generation error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate response",
        });
      }
    }),

  /**
   * Create or update document
   */
  saveDocument: protectedProcedure
    .input(documentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // For now, we'll use a simple in-memory store or extend to use our DB
        // This can be enhanced to use our existing document tables
        const document = {
          id: input.id || `doc_${Date.now()}`,
          title: input.title,
          content: input.content,
          kind: input.kind,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // TODO: Save to database
        // await ctx.prisma.teacherDocument.create({ data: document });

        return document;
      } catch (error) {
        console.error('Document save error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save document",
        });
      }
    }),

  /**
   * Get document by ID
   */
  getDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if document exists in our in-memory store
        const userDocuments = documents.get(user.id) || [];
        const document = userDocuments.find(doc => doc.id === input.id);

        if (!document) {
          // Return null for non-existent documents instead of mock data
          return null;
        }

        // Return as array to match expected format
        return [document];
      } catch (error) {
        console.error('Document fetch error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch document",
        });
      }
    }),

  /**
   * Get conversation history for teacher
   */
  getConversationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        const conversations = await ctx.prisma.teacherAssistantConversation.findMany({
          where: {
            teacherId: user.id,
            status: 'ACTIVE',
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 5, // Get first few messages for preview
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: input.limit,
          ...(input.cursor && {
            cursor: { id: input.cursor },
            skip: 1,
          }),
        });

        const nextCursor = conversations.length === input.limit
          ? conversations[conversations.length - 1]?.id
          : undefined;

        return {
          conversations: conversations.map(conv => {
            const lastMessage = conv.messages[conv.messages.length - 1];
            const lastMessagePreview = lastMessage?.content
              ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
              : null;

            return {
              id: conv.id,
              title: conv.title || 'New Conversation',
              summary: conv.summary,
              messageCount: conv.messages.length,
              lastMessage: lastMessagePreview,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
            };
          }),
          nextCursor,
        };
      } catch (error) {
        console.error('Conversation history fetch error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch conversation history",
        });
      }
    }),

  /**
   * Get messages for a specific conversation
   */
  getConversationMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Verify conversation belongs to user
        const conversation = await ctx.prisma.teacherAssistantConversation.findFirst({
          where: {
            id: input.conversationId,
            teacherId: user.id,
            status: 'ACTIVE',
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        const messages = await ctx.prisma.teacherAssistantMessage.findMany({
          where: {
            conversationId: input.conversationId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'asc' },
          take: input.limit,
          ...(input.cursor && {
            cursor: { id: input.cursor },
            skip: 1,
          }),
        });

        const nextCursor = messages.length === input.limit
          ? messages[messages.length - 1]?.id
          : undefined;

        return {
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            createdAt: msg.createdAt,
            metadata: msg.metadata,
          })),
          nextCursor,
        };
      } catch (error) {
        console.error('Conversation messages fetch error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch conversation messages",
        });
      }
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      classId: z.string().optional(),
      courseId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        const conversation = await ctx.prisma.teacherAssistantConversation.create({
          data: {
            teacherId: user.id,
            title: input.title,
            classId: input.classId,
            courseId: input.courseId,
          },
        });

        return { conversationId: conversation.id };
      } catch (error) {
        console.error('Create conversation error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }
    }),

  /**
   * Save message to conversation
   */
  saveMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.session?.user as any;
        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Verify conversation belongs to user
        const conversation = await ctx.prisma.teacherAssistantConversation.findFirst({
          where: {
            id: input.conversationId,
            teacherId: user.id,
            status: 'ACTIVE',
          },
          include: {
            messages: true,
          },
        });

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        const message = await ctx.prisma.teacherAssistantMessage.create({
          data: {
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
            metadata: input.metadata,
          },
        });

        // Update conversation title if this is the first user message and title is generic
        const updateData: any = { updatedAt: new Date() };
        if (input.role === 'user' &&
            conversation.messages.length === 0 &&
            (conversation.title === 'New Conversation' || !conversation.title)) {
          updateData.title = generateConversationTitle(input.content);
        }

        // Update conversation timestamp and potentially title
        await ctx.prisma.teacherAssistantConversation.update({
          where: { id: input.conversationId },
          data: updateData,
        });

        return { messageId: message.id };
      } catch (error) {
        console.error('Save message error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save message",
        });
      }
    }),


});

export type TeacherAssistantV2Router = typeof teacherAssistantV2Router;
