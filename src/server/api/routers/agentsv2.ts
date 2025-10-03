import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { aivyOrchestrator } from '../../../features/agentsv2/orchestration/singleton';

export const agentsv2Router = createTRPCRouter({
  /**
   * Procedure for interacting with the Learning Companion agent.
   * It takes a question and optional subject ID from the student.
   */
  askLearningCompanion: protectedProcedure
    .input(
      z.object({
        question: z.string(),
        subjectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      const { question, subjectId } = input;

      const task = await aivyOrchestrator.handleRequest({
        userId: session.user.id,
        userRole: 'student',
        message: question,
        input: { subjectId },
      });

      return task;
    }),

  /**
   * Procedure for getting help with an assignment from the Assignment Guide agent.
   * It takes an assignment ID and a specific question from the student.
   */
  getAssignmentHelp: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        question: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      const { assignmentId, question } = input;

      const task = await aivyOrchestrator.handleRequest({
        userId: session.user.id,
        userRole: 'student',
        message: question,
        input: { assignmentId },
      });

      return task;
    }),
});