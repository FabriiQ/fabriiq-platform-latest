import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { LearningPatternRecognitionService } from "@/server/api/services/learning-pattern-recognition.service";
import { BloomsTaxonomyLevel } from "@/features/bloom/types/bloom-taxonomy";

/**
 * Learning Patterns Router
 * 
 * Provides endpoints for learning pattern analysis, performance prediction,
 * and adaptive content recommendations
 */
export const learningPatternsRouter = createTRPCRouter({
  /**
   * Analyze student learning patterns
   */
  analyzeStudentPatterns: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        timeframe: z.object({
          start: z.date(),
          end: z.date()
        }).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const service = new LearningPatternRecognitionService(ctx.prisma);
        return await service.analyzeStudentLearningPatterns(input.studentId, input.timeframe);
      } catch (error) {
        console.error('Error analyzing student learning patterns:', error);

        // For any error (including insufficient data), return a meaningful error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to analyze learning patterns',
          cause: error
        });
      }
    }),

  /**
   * Predict student performance
   */
  predictPerformance: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        activityType: z.string(),
        bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']),
        difficulty: z.number().min(1).max(10)
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);
      return service.predictPerformance(
        input.studentId,
        input.activityType,
        input.bloomsLevel as BloomsTaxonomyLevel,
        input.difficulty
      );
    }),

  /**
   * Optimize learning path
   */
  optimizeLearningPath: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        currentPath: z.array(z.object({
          activityId: z.string(),
          activityType: z.string(),
          bloomsLevel: z.string(),
          difficulty: z.number(),
          estimatedTime: z.number()
        })),
        goals: z.object({
          targetBloomsLevel: z.string(),
          timeframe: z.number(), // days
          focusAreas: z.array(z.string()).optional()
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);

      // Transform the input to match the service interface
      const transformedPath = input.currentPath.map(item => ({
        activityType: item.activityType,
        bloomsLevel: item.bloomsLevel as BloomsTaxonomyLevel,
        estimatedDifficulty: item.difficulty
      }));

      const transformedGoals = {
        targetBloomsLevel: input.goals.targetBloomsLevel as BloomsTaxonomyLevel,
        timeframe: input.goals.timeframe,
        focusAreas: input.goals.focusAreas
      };

      return service.optimizeLearningPath(input.studentId, transformedPath, transformedGoals);
    }),

  /**
   * Detect early warning indicators
   */
  detectEarlyWarnings: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        classId: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);
      return service.detectEarlyWarnings(input.studentId, input.classId);
    }),

  /**
   * Generate adaptive content recommendations
   */
  generateAdaptiveContent: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        subject: z.string(),
        currentTopic: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);
      return service.generateAdaptiveContent(input.studentId, input.subject, input.currentTopic);
    }),

  /**
   * Get learning patterns for multiple students (teacher view)
   */
  getClassLearningPatterns: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        timeframe: z.object({
          start: z.date(),
          end: z.date()
        }).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);
      
      // Get all students in the class
      const classStudents = await ctx.prisma.studentEnrollment.findMany({
        where: { classId: input.classId },
        include: {
          student: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      // Analyze patterns for each student
      const studentPatterns = await Promise.all(
        classStudents.map(async (enrollment) => {
          const patterns = await service.analyzeStudentLearningPatterns(
            enrollment.student.id,
            input.timeframe
          );
          return {
            studentId: enrollment.student.id,
            studentName: enrollment.student.user.name,
            patterns
          };
        })
      );

      return {
        classId: input.classId,
        studentCount: classStudents.length,
        studentPatterns,
        classAverages: {
          consistencyScore: studentPatterns.reduce((sum, s) => sum + s.patterns.performancePatterns.consistencyScore, 0) / studentPatterns.length,
          riskFactorCount: studentPatterns.reduce((sum, s) => sum + s.patterns.riskFactors.length, 0) / studentPatterns.length
        }
      };
    }),

  /**
   * Get learning pattern insights for teacher dashboard
   */
  getTeacherInsights: protectedProcedure
    .input(
      z.object({
        teacherId: z.string(),
        classIds: z.array(z.string()).optional(),
        timeframe: z.enum(['week', 'month', 'term']).default('month')
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new LearningPatternRecognitionService(ctx.prisma);
      
      // Get teacher's classes if not specified
      let classIds = input.classIds;
      if (!classIds) {
        // First get the teacher profile ID from user ID
        const teacherProfile = await ctx.prisma.teacherProfile.findFirst({
          where: { userId: input.teacherId }
        });

        if (!teacherProfile) {
          return {
            teacherId: input.teacherId,
            timeframe: input.timeframe,
            classInsights: [],
            summary: {
              totalStudents: 0,
              averageConsistency: 0,
              totalRiskFactors: 0
            }
          };
        }

        const teacherAssignments = await ctx.prisma.teacherAssignment.findMany({
          where: {
            teacherId: teacherProfile.id,
            status: 'ACTIVE'
          },
          select: { classId: true }
        });
        classIds = teacherAssignments.map(assignment => assignment.classId);
      }

      // Get insights for each class
      const classInsights = await Promise.all(
        classIds.map(async (classId) => {
          const classData = await service.getClassLearningPatterns(classId, input.timeframe);
          return {
            ...classData,
            classId
          };
        })
      );

      return {
        teacherId: input.teacherId,
        timeframe: input.timeframe,
        classInsights,
        summary: {
          totalStudents: classInsights.reduce((sum, c) => sum + c.studentCount, 0),
          averageConsistency: classInsights.reduce((sum, c) => sum + c.classAverages.consistencyScore, 0) / classInsights.length,
          totalRiskFactors: classInsights.reduce((sum, c) => sum + c.classAverages.riskFactorCount * c.studentCount, 0)
        }
      };
    })
});
