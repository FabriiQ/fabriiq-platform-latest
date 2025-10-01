import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, roleProtectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserType, LegalBasis } from '@prisma/client';

const captureConsentSchema = z.object({
  userId: z.string(),
  dataCategories: z.array(z.string()).min(1),
  purpose: z.string().min(1),
  legalBasis: z.nativeEnum(LegalBasis).default('CONSENT'),
  jurisdiction: z.string().default('GLOBAL'),
});

export const consentRouter = createTRPCRouter({
  getStatus: protectedProcedure
    .input(z.object({ userId: z.string().optional(), dataCategories: z.array(z.string()).min(1) }))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session.user.id;
      try {
        const records = await ctx.prisma.userConsent.findMany({
          where: { userId, dataCategory: { in: input.dataCategories } },
          orderBy: { updatedAt: 'desc' },
        });
        const status = input.dataCategories.map((cat) => {
          const rec = records.find((r) => r.dataCategory === cat);
          return { dataCategory: cat, consentGiven: !!rec?.consentGiven, legalBasis: rec?.legalBasis ?? 'CONSENT' };
        });
        return { userId, status };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch consent status' });
      }
    }),

  capture: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(captureConsentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.$transaction(async (tx) => {
          for (const cat of input.dataCategories) {
            await tx.userConsent.upsert({
              where: { userId_dataCategory: { userId: input.userId, dataCategory: cat } },
              update: { consentGiven: true, legalBasis: input.legalBasis, purpose: input.purpose, jurisdiction: input.jurisdiction, consentDate: new Date() },
              create: { userId: input.userId, dataCategory: cat, consentGiven: true, legalBasis: input.legalBasis, purpose: input.purpose, jurisdiction: input.jurisdiction, consentDate: new Date() },
            });
          }
          await tx.consentAuditLog.create({
            data: { userId: input.userId, action: 'CONSENT_GIVEN', dataCategories: input.dataCategories, legalBasis: input.legalBasis, purpose: input.purpose, jurisdiction: input.jurisdiction },
          });
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to capture consent' });
      }
    }),

  withdraw: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ userId: z.string(), dataCategories: z.array(z.string()).min(1), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.$transaction(async (tx) => {
          await tx.userConsent.updateMany({ where: { userId: input.userId, dataCategory: { in: input.dataCategories } }, data: { consentGiven: false, withdrawnAt: new Date(), withdrawalReason: input.reason } });
          await tx.consentAuditLog.create({ data: { userId: input.userId, action: 'CONSENT_WITHDRAWN', dataCategories: input.dataCategories, reason: input.reason } });
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to withdraw consent' });
      }
    }),
});



