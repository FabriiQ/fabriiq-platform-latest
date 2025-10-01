import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

export const policyAcceptanceRouter = createTRPCRouter({
  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const rec = await ctx.prisma.consentAuditLog.findFirst({
          where: {
            userId: ctx.session.user.id,
            action: 'POLICY_ACCEPTED',
          },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true, purpose: true, jurisdiction: true }
        });
        return { accepted: Boolean(rec), record: rec || null };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch policy acceptance' });
      }
    }),

  accept: protectedProcedure
    .input(z.object({ policyVersion: z.string().min(1), jurisdiction: z.string().default('GLOBAL') }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.consentAuditLog.create({
          data: {
            userId: ctx.session.user.id,
            action: 'POLICY_ACCEPTED',
            dataCategories: ['policy'],
            purpose: input.policyVersion,
            jurisdiction: input.jurisdiction,
          }
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to record policy acceptance' });
      }
    })
});


