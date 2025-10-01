import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { LearningTimeService } from '@/server/api/services/learning-time.service';
import { TRPCError } from '@trpc/server';

export const learningTimeRouter = createTRPCRouter({
  // Record time spent on an activity
  recordTimeSpent: protectedProcedure
    .input(
      z.object({
        activityId: z.string(),
        timeSpentMinutes: z.number().min(0),
        startedAt: z.date().optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
      return learningTimeService.recordTimeSpent({
        studentId: ctx.session.user.id,
        activityId: input.activityId,
        timeSpentMinutes: input.timeSpentMinutes,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
      });
    }),

  // Batch record time spent on activities
  batchRecordTimeSpent: protectedProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            activityId: z.string(),
            timeSpentMinutes: z.number().min(0),
            startedAt: z.number(),
            completedAt: z.number(),
          })
        )
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
      return learningTimeService.batchRecordTimeSpent({
        studentId: ctx.session.user.id,
        records: input.records,
      });
    }),

  // Get learning time statistics
  getLearningTimeStats: protectedProcedure
    .input(
      z.object({
        classId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      // Add caching and performance optimization
      const cacheKey = `learning-time-stats-${ctx.session.user.id}-${input.classId || 'all'}-${input.startDate?.toISOString() || 'no-start'}-${input.endDate?.toISOString() || 'no-end'}`;

      try {
        const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
        const result = await learningTimeService.getLearningTimeStats({
          studentId: ctx.session.user.id,
          classId: input.classId,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return result;
      } catch (error) {
        console.error('Error in getLearningTimeStats:', error);
        // Return empty stats instead of throwing to prevent crashes
        return {
          totalTimeSpentMinutes: 0,
          totalActivitiesCompleted: 0,
          averageTimePerActivity: 0,
          dailyAverage: 0,
          timeSpentBySubject: [],
          timeSpentByActivityType: [],
          efficiencyScore: 0,
          dailyTrends: [],
          consistencyScore: 0,
          peakLearningTime: null,
          averageSessionLength: 0,
        };
      }
    }),

  // Get class-wide time statistics (for teachers)
  getClassTimeStats: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
      return learningTimeService.getClassTimeStats({
        classId: input.classId,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),

  // Get student time comparison for a class (for teachers)
  getStudentTimeComparison: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
      return learningTimeService.getStudentTimeComparison({
        classId: input.classId,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }),

  // Get learning time statistics for a specific student (for teachers)
  getStudentLearningTimeStats: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        classId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Ensure user is authenticated
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
      }

      // Check permissions - allow system admins, campus admins, and teachers
      const allowedUserTypes = [
        'SYSTEM_ADMIN',
        'SYSTEM_MANAGER',
        'CAMPUS_ADMIN',
        'CAMPUS_TEACHER',
        'TEACHER'
      ];

      if (!allowedUserTypes.includes(ctx.session.user.userType)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const learningTimeService = new LearningTimeService({ prisma: ctx.prisma });
        const result = await learningTimeService.getLearningTimeStats({
          studentId: input.studentId,
          classId: input.classId,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return result;
      } catch (error) {
        console.error('Error in getStudentLearningTimeStats:', error);
        // Return empty stats instead of throwing to prevent crashes
        return {
          totalTimeSpentMinutes: 0,
          totalActivitiesCompleted: 0,
          averageTimePerActivity: 0,
          dailyAverage: 0,
          weeklyTrend: 0,
          timeSpentBySubject: [],
          timeSpentByActivityType: [],
          dailyTrends: [],
          peakLearningTime: null,
          averageSessionLength: 0,
        };
      }
    }),
});
