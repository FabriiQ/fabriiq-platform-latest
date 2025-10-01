import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NAVIGATION_KEYWORDS, SUBJECT_KEYWORDS } from '@/features/student-assistant/constants';

// Input schemas for conversation history
const conversationCreateSchema = z.object({
  title: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  mode: z.string().optional(),
  context: z.record(z.any()).optional(),
});

const messageCreateSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

const searchQuerySchema = z.object({
  query: z.string(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  mode: z.string().optional(),
  filters: z.record(z.any()).optional(),
});

/**
 * Student Assistant API Router
 *
 * Provides procedures for interacting with the student assistant
 */
export const studentAssistantRouter = createTRPCRouter({
  /**
   * Get a response from the student assistant
   */
  getAssistantResponse: protectedProcedure
    .input(z.object({
      message: z.string(),
      classId: z.string().optional(),
      activityId: z.string().optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a student
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authorized",
          });
        }

        // Get student context
        const student = await ctx.prisma.studentProfile.findUnique({
          where: { userId: ctx.session.user.id },
          include: {
            user: true,
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
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        // Get class context if classId is provided
        let classContext: any = null;
        if (input.classId) {
          classContext = await ctx.prisma.class.findUnique({
            where: { id: input.classId },
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
          });
        }

        // Get activity context if activityId is provided
        let activityContext: any = null;
        if (input.activityId) {
          activityContext = await ctx.prisma.activity.findUnique({
            where: { id: input.activityId },
            include: {
              subject: true,
              topic: true
            }
          });
        }

        // Determine the type of question (navigation, subject-specific, or general)
        const questionType = determineQuestionType(
          input.message,
          classContext?.courseCampus?.course?.subjects[0]?.name
        );

        // Parse context if provided
        let studentContext: any = {};
        if (input.context) {
          try {
            studentContext = JSON.parse(input.context);
          } catch (error) {
            console.error('Error parsing context:', error);
          }
        }

        // Generate the appropriate prompt based on question type
        const prompt = generatePrompt(
          input.message,
          questionType,
          {
            student: {
              name: student.user?.name || 'Student',
              gradeLevel: (student as any).gradeLevel || 'K-12',
              learningPreferences: studentContext.student?.learningPreferences || [],
            },
            class: classContext ? {
              name: classContext.name,
              subject: classContext.courseCampus?.course?.subjects[0] ? {
                name: classContext.courseCampus.course.subjects[0].name,
              } : undefined,
            } : undefined,
            activity: activityContext ? {
              title: activityContext.title,
              type: activityContext.type,
              subject: activityContext.subject ? {
                name: activityContext.subject.name,
              } : undefined,
            } : undefined,
            discussedConcepts: studentContext.discussedConcepts || [],
            confusionAreas: studentContext.confusionAreas || [],
            learningGoals: studentContext.learningGoals || [],
          }
        );

        // Call AI service with context
        const response = await callAIService(prompt);

        return { response };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get assistant response: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Get conversation history for student
   */
  getConversationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a student
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findFirst({
          where: { userId: ctx.session.user.id }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        const { limit, cursor } = input;

        // Build where clause
        const whereClause: any = {
          studentId: studentProfile.id,
          status: 'ACTIVE',
        };

        if (cursor) {
          whereClause.id = { lt: cursor };
        }

        // Fetch conversations with messages
        const conversations = await ctx.prisma.studentAssistantConversation.findMany({
          where: whereClause,
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get only the last message for preview
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: limit + 1, // Take one extra to determine if there's a next page
        });

        let nextCursor: string | undefined = undefined;
        if (conversations.length > limit) {
          const nextItem = conversations.pop();
          nextCursor = nextItem!.id;
        }

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
              mode: conv.mode,
              messageCount: conv.messages.length,
              lastMessage: lastMessagePreview,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
            };
          }),
          nextCursor,
        };
      } catch (error) {
        console.error('Student conversation history fetch error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch conversation history",
        });
      }
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(conversationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a student
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findFirst({
          where: { userId: ctx.session.user.id }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        const conversation = await ctx.prisma.studentAssistantConversation.create({
          data: {
            studentId: studentProfile.id,
            title: input.title,
            classId: input.classId,
            subjectId: input.subjectId,
            topicId: input.topicId,
            mode: input.mode,
            context: input.context,
          },
        });

        return conversation;
      } catch (error) {
        console.error('Error creating student conversation:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }
    }),

  /**
   * Search conversations
   */
  searchConversations: protectedProcedure
    .input(searchQuerySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user is authenticated and is a student
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findFirst({
          where: { userId: ctx.session.user.id }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        // Build search query
        const whereClause: any = {
          studentId: studentProfile.id,
          status: 'ACTIVE',
          OR: [
            { title: { contains: input.query, mode: 'insensitive' } },
            { summary: { contains: input.query, mode: 'insensitive' } },
            {
              messages: {
                some: {
                  content: { contains: input.query, mode: 'insensitive' }
                }
              }
            }
          ]
        };

        if (input.classId) {
          whereClause.classId = input.classId;
        }

        if (input.subjectId) {
          whereClause.subjectId = input.subjectId;
        }

        if (input.mode) {
          whereClause.mode = input.mode;
        }

        const conversations = await ctx.prisma.studentAssistantConversation.findMany({
          where: whereClause,
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        });

        // Log the search for analytics
        await ctx.prisma.studentAssistantSearch.create({
          data: {
            studentId: studentProfile.id,
            query: input.query,
            filters: input.filters || {},
            resultsCount: conversations.length,
            classId: input.classId,
            subjectId: input.subjectId,
            mode: input.mode,
          }
        });

        return conversations.map(conv => {
          const lastMessage = conv.messages[conv.messages.length - 1];
          const lastMessagePreview = lastMessage?.content
            ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
            : null;

          return {
            id: conv.id,
            title: conv.title || 'New Conversation',
            summary: conv.summary,
            mode: conv.mode,
            messageCount: conv.messages.length,
            lastMessage: lastMessagePreview,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          };
        });
      } catch (error) {
        console.error('Error searching student conversations:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search conversations",
        });
      }
    }),
});

/**
 * Determine the type of question
 */
function determineQuestionType(
  message: string,
  currentSubject?: string
): 'navigation' | 'subject' | 'general' {
  const lowerMessage = message.toLowerCase();

  // Check if it's a navigation question
  if (NAVIGATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword))) {
    return 'navigation';
  }

  // Check if it's related to the current subject
  if (currentSubject) {
    const lowerSubject = currentSubject.toLowerCase();

    // If the message mentions the current subject
    if (lowerMessage.includes(lowerSubject)) {
      return 'subject';
    }

    // Check if the message contains keywords related to the current subject
    for (const [subjectType, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
      if (Array.isArray(keywords) && keywords.some(keyword => lowerMessage.includes(keyword)) &&
          lowerSubject.includes(subjectType)) {
        return 'subject';
      }
    }
  }

  // Default to general
  return 'general';
}

/**
 * Generate a prompt based on question type and context
 */
function generatePrompt(
  message: string,
  questionType: 'navigation' | 'subject' | 'general',
  context: {
    student: {
      name: string;
      gradeLevel: string;
      learningPreferences?: string[];
    };
    class?: {
      name: string;
      subject?: {
        name: string;
      };
    };
    activity?: {
      title: string;
      type: string;
      subject?: {
        name: string;
      };
    };
    discussedConcepts?: Array<{
      name: string;
      lastDiscussed: Date;
      mastery?: 'low' | 'medium' | 'high';
    }>;
    confusionAreas?: Array<{
      topic: string;
      level: 'low' | 'medium' | 'high';
      resolved?: boolean;
    }>;
    learningGoals?: Array<{
      description: string;
      progress?: number;
    }>;
  }
): string {
  const { student, class: classContext, activity, discussedConcepts, confusionAreas, learningGoals } = context;

  // Base prompt for all question types
  let basePrompt = `
    You are an educational assistant helping ${student.name}, who is at grade level ${student.gradeLevel}.

    Your goal is to help the student learn effectively. For direct questions, provide clear and accurate answers,
    but also ask about their prior knowledge and offer additional learning points they might be interested in.

    Student question: ${message}

    Remember:
    1. For direct questions, provide a clear and accurate answer first
    2. After answering, ask about the student's prior knowledge on the topic
    3. Offer additional learning points or deeper insights they might want to explore
    4. Break complex topics into smaller, manageable concepts
    5. Provide age-appropriate explanations for grade ${student.gradeLevel}
    6. Use encouraging and supportive language
    7. Foster a growth mindset by emphasizing effort and strategy over innate ability
    8. Balance providing information with encouraging critical thinking
  `;

  // Add learning preferences if available
  if (student.learningPreferences && student.learningPreferences.length > 0) {
    basePrompt += `

    The student has shown a preference for ${student.learningPreferences.join(', ')} learning styles.
    Adapt your explanation accordingly.
    `;
  }

  // Add information about discussed concepts
  if (discussedConcepts && discussedConcepts.length > 0) {
    const recentConcepts = discussedConcepts
      .slice(0, 3)
      .map(c => c.name)
      .join(', ');

    basePrompt += `

    Recently discussed concepts: ${recentConcepts}. You can reference these if relevant.
    `;
  }

  // Add information about confusion areas
  if (confusionAreas && confusionAreas.length > 0) {
    const unresolvedConfusion = confusionAreas.find(area => !area.resolved);

    if (unresolvedConfusion) {
      basePrompt += `

      The student has previously shown confusion about "${unresolvedConfusion.topic}".
      Be especially clear when discussing related concepts.
      `;
    }
  }

  // Add information about learning goals
  if (learningGoals && learningGoals.length > 0) {
    const currentGoal = learningGoals[0];

    basePrompt += `

    The student is working toward this learning goal: "${currentGoal.description}".
    Try to relate your guidance to this goal when appropriate.
    `;
  }

  // Add context-specific information to the prompt
  if (questionType === 'navigation') {
    return `
      ${basePrompt}

      The student is asking about navigating the learning platform.

      Provide clear, direct instructions to help the student navigate the platform or find the feature they're looking for.
      Be specific and straightforward with step-by-step guidance when possible.

      Common platform sections include:
      - Dashboard: Overview of courses, upcoming assignments, and progress
      - Courses: List of enrolled courses
      - Classes: Specific class sections with activities and resources
      - Activities: Assignments, quizzes, and learning materials
      - Grades: View assessment results and feedback
      - Calendar: Schedule of classes and assignment due dates
      - Profile: Personal information and settings
    `;
  } else if (questionType === 'subject' && (classContext?.subject || activity?.subject)) {
    const subjectName = classContext?.subject?.name || activity?.subject?.name || 'the subject';

    return `
      ${basePrompt}

      The student is currently studying ${subjectName} in ${classContext?.name || 'their class'}.
      ${activity ? `They are working on an activity titled "${activity.title}" of type "${activity.type}".` : ''}

      Provide subject-specific information about ${subjectName} with clear, accurate answers.
      Use appropriate terminology and examples for this subject area.

      After providing the answer, ask about their prior knowledge of ${subjectName} concepts,
      and offer additional learning points they might find interesting to explore further.
    `;
  } else {
    // General educational guidance
    return basePrompt;
  }
}

/**
 * Call the AI service with the prompt using Google Generative AI
 */
async function callAIService(prompt: string): Promise<string> {
  try {
    console.log('AI service called with prompt length:', prompt.length);

    // Get API key from environment variables
    let apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // For backward compatibility, try the old variable names
    if (!apiKey) {
      apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    }

    if (!apiKey) {
      console.error('Google Generative AI API key not found in environment variables');
      return "I'm here to help you learn! However, I'm having trouble connecting to my AI service right now. Please try again later.";
    }

    // Initialize the API client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.0 Flash model with educational settings
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7, // Balanced between creativity and consistency
        maxOutputTokens: 500, // Reasonable length for educational responses
      }
    });

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (!response) {
      throw new Error('No response received from AI');
    }

    console.log('AI response generated successfully');
    return response;

  } catch (error) {
    console.error('Error in AI service:', error);
    return "I'm here to help you learn! However, I encountered an issue while processing your question. Could you try asking in a different way?";
  }
}
