/**
 * Activities V2 tRPC Router
 * 
 * API endpoints for Activities V2 system
 * Integrates with existing authentication and validation
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { ActivityV2Service } from '@/features/activities-v2/services/activity-v2.service';
import { QuestionBankService } from '@/features/question-bank/services/question-bank.service';
import { BloomsTaxonomyLevel, ActivityPurpose, LearningActivityType, AssessmentType, SystemStatus } from '@prisma/client';

// Validation schemas
const achievementConfigSchema = z.object({
  enabled: z.boolean(),
  pointsAnimation: z.boolean(),
  celebrationLevel: z.enum(['minimal', 'standard', 'enthusiastic']),
  points: z.object({
    base: z.number(),
    perfectScore: z.number().optional(),
    speedBonus: z.number().optional(),
    firstAttempt: z.number().optional(),
    improvement: z.number().optional()
  }),
  speedBonusThresholdSeconds: z.number().optional(),
  triggers: z.object({
    completion: z.boolean(),
    perfectScore: z.boolean(),
    speedBonus: z.boolean(),
    firstAttempt: z.boolean(),
    improvement: z.boolean()
  })
});

const quizSettingsSchema = z.object({
  shuffleQuestions: z.boolean().default(false),
  showFeedbackImmediately: z.boolean().default(false),
  showCorrectAnswers: z.boolean().default(true),
  timeLimitMinutes: z.number().optional(),
  attemptsAllowed: z.number().default(1),
  passingScore: z.number().optional(),
  allowReview: z.boolean().default(true),
  showProgressBar: z.boolean().default(true),
  // Additional quiz configurations
  allowNavigation: z.boolean().default(true),
  requireAllQuestions: z.boolean().default(true),
  showQuestionNumbers: z.boolean().default(true),
  allowPartialCredit: z.boolean().default(false),
  showTimer: z.boolean().default(false),
  autoSubmit: z.boolean().default(false), // Auto-submit when time expires
  randomizeOptions: z.boolean().default(false), // Randomize option order
  preventCheating: z.boolean().default(false), // Prevent copy/paste, right-click, etc.
  lockdownBrowser: z.boolean().default(false), // Require lockdown browser
  proctoring: z.boolean().default(false) // Enable proctoring features
});

const quizV2ContentSchema = z.object({
  version: z.literal('2.0'),
  type: z.literal('quiz'),
  title: z.string().min(1, 'Quiz title is required'),
  description: z.string().optional(),
  estimatedTimeMinutes: z.number().optional(),
  achievementConfig: achievementConfigSchema,
  questions: z.array(z.object({
    id: z.string(), // Question Bank question ID
    order: z.number(),
    points: z.number(),
    shuffleOptions: z.boolean().optional()
  })),
  settings: quizSettingsSchema,
  assessmentMode: z.enum(['standard', 'cat', 'spaced_repetition']),
  catSettings: z.any().optional(),
  spacedRepetitionSettings: z.any().optional()
});

const readingV2ContentSchema = z.object({
  version: z.literal('2.0'),
  type: z.literal('reading'),
  title: z.string().min(1, 'Reading title is required'),
  description: z.string().optional(),
  estimatedTimeMinutes: z.number().optional(),
  achievementConfig: achievementConfigSchema,
  content: z.object({
    type: z.enum(['rich_text', 'url', 'file']),
    data: z.string(),
    metadata: z.object({
      wordCount: z.number().optional(),
      readingLevel: z.string().optional(),
      estimatedReadingTime: z.number().optional()
    })
  }),
  completionCriteria: z.object({
    minTimeSeconds: z.number().optional(),
    scrollPercentage: z.number().optional(),
    interactionRequired: z.boolean().optional()
  }),
  features: z.object({
    allowBookmarking: z.boolean(),
    allowHighlighting: z.boolean(),
    allowNotes: z.boolean(),
    showProgress: z.boolean()
  })
});

const videoV2ContentSchema = z.object({
  version: z.literal('2.0'),
  type: z.literal('video'),
  title: z.string().min(1, 'Video title is required'),
  description: z.string().optional(),
  estimatedTimeMinutes: z.number().optional(),
  achievementConfig: achievementConfigSchema,
  video: z.object({
    provider: z.enum(['youtube', 'vimeo', 'file', 'hls']),
    url: z.string(),
    duration: z.number().optional(),
    metadata: z.object({
      title: z.string().optional(),
      thumbnail: z.string().optional(),
      description: z.string().optional()
    }).optional()
  }),
  completionCriteria: z.object({
    minWatchPercentage: z.number(),
    minWatchTimeSeconds: z.number().optional(),
    interactionPoints: z.array(z.object({
      timeSeconds: z.number(),
      type: z.enum(['question', 'note', 'bookmark']),
      content: z.string(),
      required: z.boolean()
    })).optional()
  }),
  features: z.object({
    allowSeeking: z.boolean(),
    showControls: z.boolean(),
    allowSpeedChange: z.boolean(),
    showTranscript: z.boolean()
  })
});

const activityV2ContentSchema = z.discriminatedUnion('type', [
  quizV2ContentSchema,
  readingV2ContentSchema,
  videoV2ContentSchema
]);

const createActivityV2Schema = z.object({
  title: z.string().min(1, 'Activity title is required'),
  subjectId: z.string(),
  topicId: z.string().optional(),
  classId: z.string(),
  content: activityV2ContentSchema,
  isGradable: z.boolean().default(true),
  maxScore: z.number().optional(),
  passingScore: z.number().optional(),
  weightage: z.number().optional(),
  gradingConfig: z.any().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  duration: z.number().optional(), // Duration in minutes
  bloomsLevel: z.nativeEnum(BloomsTaxonomyLevel).optional(),
  bloomsDistribution: z.any().optional(), // JSON field for Bloom's distribution
  learningOutcomeIds: z.array(z.string()).optional(),
  // Additional database fields
  purpose: z.nativeEnum(ActivityPurpose).default(ActivityPurpose.LEARNING),
  learningType: z.nativeEnum(LearningActivityType).optional(),
  assessmentType: z.nativeEnum(AssessmentType).optional(),
  status: z.nativeEnum(SystemStatus).default(SystemStatus.ACTIVE),
  h5pContentId: z.string().optional()
});

const submitActivityV2Schema = z.object({
  activityId: z.string(),
  answers: z.record(z.string(), z.any()).optional(),
  progress: z.any().optional(),
  timeSpent: z.number(), // in seconds
  questionTimings: z.record(z.string(), z.number()).optional(),
  assessmentMode: z.enum(['standard', 'cat', 'spaced_repetition']).optional(),
  catSession: z.any().optional(),
  abilityEstimate: z.number().optional(),
  analytics: z.object({
    totalQuestions: z.number(),
    answeredQuestions: z.number(),
    averageTimePerQuestion: z.number(),
    pauseCount: z.number(),
    bloomsDistribution: z.record(z.string(), z.number()),
    difficultyDistribution: z.record(z.string(), z.number())
  }).optional()
});

export const activityV2Router = createTRPCRouter({
  /**
   * Create a new Activities V2 activity
   */
  create: protectedProcedure
    .input(createActivityV2Schema)
    .mutation(async ({ ctx, input }) => {
      try {
        const activityV2Service = new ActivityV2Service(
          ctx.prisma,
          new QuestionBankService(ctx.prisma)
        );

        const activity = await activityV2Service.createActivity(input, ctx.session.user.id);

        return {
          success: true,
          activity
        };
      } catch (error) {
        console.error('Error creating Activities V2 activity:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create activity',
          cause: error
        });
      }
    }),

  /**
   * Get Activities V2 activity by ID - Optimized for performance
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Optimized query with selective field loading and efficient joins
        const activity = await ctx.prisma.activity.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            title: true,
            purpose: true,
            learningType: true,
            assessmentType: true,
            status: true,
            content: true,
            gradingConfig: true,
            maxScore: true,
            passingScore: true,
            weightage: true,
            startDate: true,
            endDate: true,
            duration: true,
            bloomsLevel: true,
            createdAt: true,
            updatedAt: true,
            // Optimized relations with selective fields
            subject: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            topic: {
              select: {
                id: true,
                title: true,
                code: true
              }
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        // Check if it's a V2 activity
        const gradingConfig = activity.gradingConfig as any;
        if (gradingConfig?.version !== '2.0') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Not an Activities V2 activity'
          });
        }

        return activity;
      } catch (error) {
        console.error('Error getting Activities V2 activity:', error);
        throw error;
      }
    }),

  /**
   * Submit Activities V2 activity
   */
  submit: protectedProcedure
    .input(submitActivityV2Schema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student profile not found'
          });
        }

        const activityV2Service = new ActivityV2Service(
          ctx.prisma,
          new QuestionBankService(ctx.prisma)
        );

        const result = await activityV2Service.submitActivity(input, studentProfile.id);

        return {
          success: true,
          result
        };
      } catch (error) {
        console.error('Error submitting Activities V2 activity:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit activity',
          cause: error
        });
      }
    }),

  /**
   * Get student's activity submission/grade
   */
  getSubmission: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Student profile not found'
          });
        }

        const submission = await ctx.prisma.activityGrade.findUnique({
          where: {
            activityId_studentId: {
              activityId: input.activityId,
              studentId: studentProfile.id
            }
          }
        });

        return submission;
      } catch (error) {
        console.error('Error getting Activities V2 submission:', error);
        throw error;
      }
    }),

  /**
   * Get student attempts for an activity - Optimized
   */
  getAttempts: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Optimize by using direct studentId if provided, avoiding extra lookup
        let targetStudentId: string;

        if (input.studentId) {
          targetStudentId = input.studentId;
        } else {
          // Only lookup student profile if studentId not provided
          const studentProfile = await ctx.prisma.studentProfile.findUnique({
            where: { userId: ctx.session.user.id },
            select: { id: true }
          });

          if (!studentProfile) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Student profile not found'
            });
          }
          targetStudentId = studentProfile.id;
        }

        // Optimized query with selective fields
        const attempts = await ctx.prisma.activityGrade.findMany({
          where: {
            activityId: input.activityId,
            studentId: targetStudentId
          },
          select: {
            id: true,
            score: true,
            points: true,
            feedback: true,
            status: true,
            submittedAt: true,
            gradedAt: true,
            timeSpentMinutes: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        return attempts;
      } catch (error) {
        console.error('Error getting Activities V2 attempts:', error);
        throw error;
      }
    }),

  /**
   * Start advanced assessment session (CAT/Spaced Repetition)
   */
  startAdvancedAssessment: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[tRPC] Starting advanced assessment - Activity: ${input.activityId}, Student: ${input.studentId}`);
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        const result = await service.startAdvancedAssessment(input.activityId, input.studentId);
        console.log(`[tRPC] Advanced assessment started successfully - Session: ${result.id}`);
        return result;
      } catch (error) {
        console.error(`[tRPC] Error starting advanced assessment for activity ${input.activityId}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start advanced assessment: ${error.message}`,
          cause: error
        });
      }
    }),

  /**
   * Get next question for advanced assessment
   */
  getNextAdvancedQuestion: protectedProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        console.log(`[tRPC] Getting next advanced question for session: ${input.sessionId}`);
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        const result = await service.getNextAdvancedQuestion(input.sessionId);
        console.log(`[tRPC] Next advanced question retrieved:`, result ? `Question ${result.question?.id}` : 'No question available');
        return result;
      } catch (error) {
        console.error(`[tRPC] Error getting next advanced question for session ${input.sessionId}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get next question: ${error.message}`,
          cause: error
        });
      }
    }),

  /**
   * Process answer for advanced assessment
   */
  processAdvancedAnswer: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionId: z.string(),
      answer: z.any(),
      responseTime: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        return await service.processAdvancedAnswer(
          input.sessionId,
          input.questionId,
          input.answer,
          input.responseTime
        );
      } catch (error) {
        console.error('Error processing advanced answer:', error);
        throw error;
      }
    }),

  /**
   * Generate advanced analytics
   */
  generateAdvancedAnalytics: protectedProcedure
    .input(z.object({
      activityId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        return await service.generateAdvancedAnalytics(input.activityId);
      } catch (error) {
        console.error('Error generating advanced analytics:', error);
        throw error;
      }
    }),

  /**
   * Export to paper test
   */
  exportToPaperTest: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      configuration: z.any(),
      teacherId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        return await service.exportToPaperTest(
          input.activityId,
          input.configuration,
          input.teacherId
        );
      } catch (error) {
        console.error('Error exporting to paper test:', error);
        throw error;
      }
    }),

  /**
   * Get spaced repetition statistics
   */
  getSpacedRepetitionStats: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      subjectId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        return await service.getSpacedRepetitionStats(input.studentId, input.subjectId);
      } catch (error) {
        console.error('Error getting spaced repetition stats:', error);
        throw error;
      }
    }),

  /**
   * Generate review schedule
   */
  generateReviewSchedule: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      days: z.number().default(7),
      subjectId: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const service = new ActivityV2Service(ctx.prisma, new QuestionBankService(ctx.prisma));
        return await service.generateReviewSchedule(input.studentId, input.days, input.subjectId);
      } catch (error) {
        console.error('Error generating review schedule:', error);
        throw error;
      }
    }),

  /**
   * Get Activities V2 activities for a class
   */
  getByClass: protectedProcedure
    .input(z.object({ 
      classId: z.string(),
      page: z.number().default(1),
      pageSize: z.number().default(20)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { classId, page, pageSize } = input;
        const skip = (page - 1) * pageSize;

        const [activities, total] = await Promise.all([
          ctx.prisma.activity.findMany({
            where: {
              classId,
              gradingConfig: {
                path: ['version'],
                equals: '2.0'
              }
            },
            include: {
              subject: true,
              topic: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize
          }),
          ctx.prisma.activity.count({
            where: {
              classId,
              gradingConfig: {
                path: ['version'],
                equals: '2.0'
              }
            }
          })
        ]);

        return {
          activities,
          total,
          page,
          pageSize,
          hasMore: total > page * pageSize
        };
      } catch (error) {
        console.error('Error getting Activities V2 activities by class:', error);
        throw error;
      }
    }),

  /**
   * Update Activities V2 activity
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: createActivityV2Schema.partial().omit({ classId: true })
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const activity = await ctx.prisma.activity.update({
          where: { id: input.id },
          data: {
            ...input.data,
            updatedAt: new Date()
          }
        });

        return {
          success: true,
          activity
        };
      } catch (error) {
        console.error('Error updating Activities V2 activity:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update activity',
          cause: error
        });
      }
    }),

  /**
   * Delete Activities V2 activity
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.activity.update({
          where: { id: input.id },
          data: {
            status: 'DELETED',
            updatedAt: new Date()
          }
        });

        return { success: true };
      } catch (error) {
        console.error('Error deleting Activities V2 activity:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete activity',
          cause: error
        });
      }
    }),

  /**
   * Get student attempts for content lock checking
   */
  getStudentAttempts: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const attempts = await ctx.prisma.activityGrade.findMany({
          where: {
            activityId: input.activityId,
            status: {
              in: ['SUBMITTED', 'GRADED', 'COMPLETED']
            }
          },
          select: {
            id: true,
            createdAt: true,
            studentId: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        const uniqueStudents = new Set(attempts.map(a => a.studentId));

        return {
          hasAttempts: attempts.length > 0,
          attemptCount: uniqueStudents.size,
          totalSubmissions: attempts.length,
          firstAttemptDate: attempts.length > 0 ? attempts[0]?.createdAt : null,
          lastAttemptDate: attempts.length > 0 ? attempts[attempts.length - 1]?.createdAt : null
        };
      } catch (error) {
        console.error('Error getting student attempts:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student attempts',
          cause: error
        });
      }
    }),

  /**
   * Get content lock status
   */
  getLockStatus: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const activity = await ctx.prisma.activity.findUnique({
          where: { id: input.activityId },
          select: {
            id: true,
            gradingConfig: true
          }
        });

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        // Check if it's an Activities V2 activity
        const gradingConfig = activity.gradingConfig as any;
        const isV2 = gradingConfig?.version === '2.0';

        if (!isV2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Content lock is only available for Activities V2'
          });
        }

        return {
          isLocked: gradingConfig?.contentLocked || false,
          lockReason: gradingConfig?.lockReason || null,
          lockedAt: gradingConfig?.lockedAt ? new Date(gradingConfig.lockedAt) : null,
          lockedBy: gradingConfig?.lockedBy || null
        };
      } catch (error) {
        console.error('Error getting lock status:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get lock status',
          cause: error
        });
      }
    }),

  /**
   * Toggle content lock status
   */
  toggleContentLock: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      locked: z.boolean(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const activity = await ctx.prisma.activity.findUnique({
          where: { id: input.activityId },
          select: {
            id: true,
            gradingConfig: true,
            createdById: true
          }
        });

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        // Check if user has permission to modify this activity
        if (activity.createdById !== ctx.session.user.id) {
          // TODO: Add role-based permission check for admins
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify this activity'
          });
        }

        const gradingConfig = activity.gradingConfig as any;
        const updatedGradingConfig = {
          ...gradingConfig,
          contentLocked: input.locked,
          lockReason: input.reason || (input.locked ? 'Manually locked by teacher' : null),
          lockedAt: input.locked ? new Date().toISOString() : null,
          lockedBy: input.locked ? ctx.session.user.id : null
        };

        await ctx.prisma.activity.update({
          where: { id: input.activityId },
          data: {
            gradingConfig: updatedGradingConfig,
            updatedAt: new Date()
          }
        });

        return {
          success: true,
          isLocked: input.locked,
          message: input.locked ? 'Content has been locked' : 'Content has been unlocked'
        };
      } catch (error) {
        console.error('Error toggling content lock:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to toggle content lock',
          cause: error
        });
      }
    }),

  /**
   * Get basic analytics for an activity
   */
  getAnalytics: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const activity = await ctx.prisma.activity.findUnique({
          where: { id: input.activityId },
          select: {
            id: true,
            title: true,
            content: true,
            classId: true,
            gradingConfig: true
          }
        });

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        // Get class enrollment count
        const classEnrollment = await ctx.prisma.studentEnrollment.count({
          where: {
            classId: activity.classId,
            status: 'ACTIVE'
          }
        });

        // Get submission statistics
        const submissions = await ctx.prisma.activityGrade.findMany({
          where: {
            activityId: input.activityId
          },
          select: {
            id: true,
            studentId: true,
            status: true,
            createdAt: true
          }
        });

        const uniqueStudents = new Set(submissions.map(s => s.studentId));
        const completedSubmissions = submissions.filter(s =>
          ['SUBMITTED', 'GRADED', 'COMPLETED'].includes(s.status)
        );
        const uniqueCompletedStudents = new Set(completedSubmissions.map(s => s.studentId));

        const gradingConfig = activity.gradingConfig as any;
        const activityType = gradingConfig?.type || 'quiz';

        return {
          activityId: activity.id,
          activityTitle: activity.title,
          activityType,
          totalStudents: classEnrollment,
          attemptedStudents: uniqueStudents.size,
          completedStudents: uniqueCompletedStudents.size
        };
      } catch (error) {
        console.error('Error getting activity analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get activity analytics',
          cause: error
        });
      }
    }),

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const submissions = await ctx.prisma.activityGrade.findMany({
          where: {
            activityId: input.activityId,
            status: {
              in: ['SUBMITTED', 'GRADED', 'COMPLETED']
            }
          },
          select: {
            id: true,
            studentId: true,
            score: true,
            timeSpentMinutes: true,
            createdAt: true,
            student: {
              select: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Calculate metrics
        const scores = submissions.map(s => s.score || 0);
        const times = submissions.map(s => s.timeSpentMinutes || 0);

        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const averageTimeSpent = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0; // Already in minutes

        // Calculate retry rate
        const studentSubmissionCounts = submissions.reduce((acc, sub) => {
          acc[sub.studentId] = (acc[sub.studentId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const studentsWithRetries = Object.values(studentSubmissionCounts).filter(count => count > 1).length;
        const retryRate = submissions.length > 0 ? Math.round((studentsWithRetries / Object.keys(studentSubmissionCounts).length) * 100) : 0;

        // Score distribution
        const scoreRanges = [
          { range: '90-100%', min: 90, max: 100 },
          { range: '80-89%', min: 80, max: 89 },
          { range: '70-79%', min: 70, max: 79 },
          { range: '60-69%', min: 60, max: 69 },
          { range: '0-59%', min: 0, max: 59 }
        ];

        const scoreDistribution = scoreRanges.map(range => {
          const count = scores.filter(score => score >= range.min && score <= range.max).length;
          const percentage = scores.length > 0 ? Math.round((count / scores.length) * 100) : 0;
          return { range: range.range, count, percentage };
        });

        // Time distribution (in minutes)
        const timeRanges = [
          { range: '0-10 min', min: 0, max: 10 },
          { range: '10-20 min', min: 10, max: 20 },
          { range: '20-30 min', min: 20, max: 30 },
          { range: '30+ min', min: 30, max: Infinity }
        ];

        const timesInMinutes = times; // Already in minutes
        const timeDistribution = timeRanges.map(range => {
          const count = timesInMinutes.filter(time => time >= range.min && (range.max === Infinity ? true : time <= range.max)).length;
          const percentage = timesInMinutes.length > 0 ? Math.round((count / timesInMinutes.length) * 100) : 0;
          return { range: range.range, count, percentage };
        });

        // Recent submissions (last 10)
        const recentSubmissions = submissions.slice(0, 10).map(sub => ({
          studentName: sub.student.user.name || 'Unknown Student',
          score: sub.score || 0,
          timeSpent: sub.timeSpentMinutes || 0, // Already in minutes
          submittedAt: sub.createdAt,
          status: 'completed' as const
        }));

        return {
          averageScore,
          averageTimeSpent,
          retryRate,
          scoreDistribution,
          timeDistribution,
          recentSubmissions
        };
      } catch (error) {
        console.error('Error getting performance metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get performance metrics',
          cause: error
        });
      }
    }),

  /**
   * Get question-level analytics for quizzes
   */
  getQuestionAnalytics: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const activity = await ctx.prisma.activity.findUnique({
          where: { id: input.activityId },
          select: {
            content: true,
            gradingConfig: true
          }
        });

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        const gradingConfig = activity.gradingConfig as any;
        const activityType = gradingConfig?.type;

        // Only provide question analytics for quizzes
        if (activityType !== 'quiz') {
          return { questions: [] };
        }

        // Get submissions with detailed answers
        const submissions = await ctx.prisma.activityGrade.findMany({
          where: {
            activityId: input.activityId,
            status: {
              in: ['SUBMITTED', 'GRADED', 'COMPLETED']
            }
          },
          select: {
            content: true, // This contains the answers
            timeSpentMinutes: true
          }
        });

        // Analyze question performance
        const content = activity.content as any;
        const questions = content?.questions || [];

        const questionAnalytics = questions.map((question: any, index: number) => {
          const questionId = question.id || `q${index + 1}`;

          // Calculate correct rate (simplified - would need more complex logic for real implementation)
          const correctAnswers = submissions.filter(sub => {
            const content = sub.content as any;
            return content && content.answers && content.answers[questionId] !== undefined;
          }).length;

          const correctRate = submissions.length > 0 ? Math.round((correctAnswers / submissions.length) * 100) : 0;

          // Estimate average time per question (simplified)
          const avgTimePerQuestion = submissions.length > 0
            ? Math.round((submissions.reduce((sum, sub) => sum + (sub.timeSpentMinutes || 0), 0) / submissions.length) / questions.length)
            : 0;

          // Determine difficulty based on correct rate
          let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
          if (correctRate >= 80) difficulty = 'easy';
          else if (correctRate < 60) difficulty = 'hard';

          return {
            questionId,
            questionText: question.text || question.title || `Question ${index + 1}`,
            correctRate,
            averageTime: avgTimePerQuestion,
            difficulty
          };
        });

        return { questions: questionAnalytics };
      } catch (error) {
        console.error('Error getting question analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get question analytics',
          cause: error
        });
      }
    }),

  /**
   * Export analytics data as CSV
   */
  exportAnalytics: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // This would generate a comprehensive CSV export
        // For now, return a simple CSV structure
        const csvContent = `Activity ID,Metric,Value
${input.activityId},Export Generated,${new Date().toISOString()}
${input.activityId},Status,Available for download`;

        return {
          success: true,
          csvContent,
          filename: `activity-analytics-${input.activityId}-${new Date().toISOString().split('T')[0]}.csv`
        };
      } catch (error) {
        console.error('Error exporting analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export analytics',
          cause: error
        });
      }
    }),

  /**
   * Get student performance data for post-submission experience - Optimized
   */
  getStudentPerformance: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Single optimized query to get both activity and attempts data
        const [activity, attempts] = await Promise.all([
          ctx.prisma.activity.findUnique({
            where: { id: input.activityId },
            select: {
              id: true,
              title: true,
              gradingConfig: true
            }
          }),
          ctx.prisma.activityGrade.findMany({
            where: {
              activityId: input.activityId,
              studentId: input.studentId
            },
            select: {
              score: true,
              timeSpentMinutes: true,
              createdAt: true,
              feedback: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          })
        ]);

        if (!activity) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Activity not found'
          });
        }

        const gradingConfig = activity.gradingConfig as any;
        const maxAttempts = gradingConfig?.maxAttempts || 3;
        const activityType = gradingConfig?.type || 'quiz';

        // Optimized performance calculations
        let bestScore = 0;
        let totalScore = 0;
        let totalTimeSpent = 0;

        const formattedAttempts = attempts.map((attempt, index) => {
          const score = attempt.score || 0;
          bestScore = Math.max(bestScore, score);
          totalScore += score;
          totalTimeSpent += attempt.timeSpentMinutes || 0;

          return {
            attemptNumber: index + 1,
            score,
            timeSpent: attempt.timeSpentMinutes || 0,
            submittedAt: attempt.createdAt,
            feedback: attempt.feedback
          };
        });

        const averageScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;

        return {
          activityTitle: activity.title,
          activityType,
          attempts: formattedAttempts,
          maxAttempts,
          bestScore,
          averageScore,
          totalTimeSpent,
          canRetake: attempts.length < maxAttempts
        };
      } catch (error) {
        console.error('Error getting student performance:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get student performance',
          cause: error
        });
      }
    }),

  /**
   * Get class comparison data for student - Optimized
   */
  getClassComparison: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Optimized single query with aggregation
        const scoresData = await ctx.prisma.activityGrade.groupBy({
          by: ['studentId'],
          where: {
            activityId: input.activityId,
            score: {
              not: null
            }
          },
          _max: {
            score: true
          }
        });

        if (scoresData.length === 0) {
          return {
            classAverage: 0,
            studentRank: 1,
            totalStudents: 0,
            percentile: 0
          };
        }

        // Extract best scores and find student's score
        const scores = scoresData.map(data => data._max.score || 0);
        const studentScoreData = scoresData.find(data => data.studentId === input.studentId);
        const studentScore = studentScoreData?._max.score || 0;

        // Calculate metrics efficiently
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        const classAverage = Math.round(totalScore / scores.length);

        // Calculate rank and percentile
        const sortedScores = scores.sort((a, b) => b - a);
        const studentRank = sortedScores.findIndex(score => score <= studentScore) + 1;
        const percentile = scores.length > 0 ?
          Math.round(((scores.length - studentRank + 1) / scores.length) * 100) : 0;

        return {
          classAverage,
          studentRank,
          totalStudents: scores.length,
          percentile
        };
      } catch (error) {
        console.error('Error getting class comparison:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get class comparison',
          cause: error
        });
      }
    }),

  /**
   * Get performance insights and topic-level analysis
   */
  getPerformanceInsights: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        // For now, return mock topic performance data
        // In a real implementation, this would analyze question-level performance
        const topicPerformance = [
          {
            name: 'Basic Concepts',
            score: 8,
            maxScore: 10
          },
          {
            name: 'Advanced Topics',
            score: 6,
            maxScore: 10
          },
          {
            name: 'Problem Solving',
            score: 7,
            maxScore: 10
          }
        ];

        return {
          topicPerformance
        };
      } catch (error) {
        console.error('Error getting performance insights:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get performance insights',
          cause: error
        });
      }
    }),

  /**
   * Get advanced assessment session (CAT/Spaced Repetition)
   */
  getAdvancedSession: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      assessmentMode: z.enum(['standard', 'cat', 'spaced_repetition'])
    }))
    .query(async ({ ctx, input }) => {
      try {
        if (input.assessmentMode === 'standard') {
          return null;
        }

        // Mock advanced session data
        return {
          id: `session-${input.activityId}-${Date.now()}`,
          activityId: input.activityId,
          assessmentMode: input.assessmentMode,
          abilityEstimate: 0,
          currentQuestion: {
            id: 'mock-question-1',
            questionType: 'MULTIPLE_CHOICE',
            content: {
              text: 'Sample adaptive question',
              options: [
                { id: '1', text: 'Option A' },
                { id: '2', text: 'Option B' },
                { id: '3', text: 'Option C' },
                { id: '4', text: 'Option D' }
              ]
            },
            difficulty: 'MEDIUM',
            bloomsLevel: 'UNDERSTAND'
          }
        };
      } catch (error) {
        console.error('Error getting advanced session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get advanced session'
        });
      }
    }),

  /**
   * Process CAT answer and get next question
   */
  processCATAnswer: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      questionId: z.string(),
      answer: z.any(),
      timeSpent: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Mock CAT processing
        const isCorrect = Math.random() > 0.5; // Random for demo
        const newAbility = isCorrect ? 0.5 : -0.5; // Simplified ability update

        return {
          abilityEstimate: newAbility,
          shouldTerminate: Math.random() > 0.8, // 20% chance to terminate
          nextQuestion: Math.random() > 0.3 ? {
            id: `adaptive-question-${Date.now()}`,
            questionType: 'MULTIPLE_CHOICE',
            content: {
              text: 'Next adaptive question based on ability',
              options: [
                { id: '1', text: 'Option A' },
                { id: '2', text: 'Option B' },
                { id: '3', text: 'Option C' },
                { id: '4', text: 'Option D' }
              ]
            },
            difficulty: newAbility > 0 ? 'HARD' : 'EASY',
            bloomsLevel: 'APPLY'
          } : null
        };
      } catch (error) {
        console.error('Error processing CAT answer:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process CAT answer'
        });
      }
    })
});
