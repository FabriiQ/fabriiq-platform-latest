import { z } from 'zod';
import { createTRPCRouter, roleProtectedProcedure, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserType } from '@prisma/client';

const disclosureSchema = z.object({
  studentId: z.string(),
  messageId: z.string().optional(),
  disclosedTo: z.array(z.string()).min(1),
  disclosurePurpose: z.string().min(1),
  legitimateEducationalInterest: z.string().min(1),
  recordsDisclosed: z.array(z.string()).min(1),
  consentRequired: z.boolean().default(false),
  consentObtained: z.boolean().default(false),
  disclosureMethod: z.enum(['SYSTEM_ACCESS','EXPORT','VERBAL','WRITTEN']).default('SYSTEM_ACCESS')
});

export const ferpaRouter = createTRPCRouter({
  // Directory Information Opt-out
  setDirectoryOptOut: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ studentId: z.string(), optedOut: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.user.update({
          where: { id: input.studentId },
          data: {
            studentProfile: {
              update: { directoryOptOut: input.optedOut }
            }
          }
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update directory opt-out' });
      }
    }),

  getPublicStudentInfo: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.prisma.user.findUnique({
        where: { id: input.studentId },
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: { select: { directoryOptOut: true } }
        }
      });
      if (!student) throw new TRPCError({ code: 'NOT_FOUND', message: 'Student not found' });
      if (student.studentProfile?.directoryOptOut) {
        return { id: student.id, name: 'Directory Opt-Out', email: null };
      }
      return student;
    }),

  // Parental Consent Management
  setParentalConsent: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ studentId: z.string(), consent: z.boolean(), guardianId: z.string().optional(), method: z.enum(['WRITTEN','DIGITAL','VERBAL']).default('DIGITAL') }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.studentProfile.update({
          where: { userId: input.studentId },
          data: {
            parentalConsent: input.consent,
            parentalConsentMethod: input.method,
            parentalConsentGrantedBy: input.guardianId || null,
            parentalConsentAt: new Date()
          }
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to set parental consent' });
      }
    }),

  // Age-based rights transfer (18+)
  transferRightsAt18: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.prisma.user.findUnique({ where: { id: input.studentId }, select: { dateOfBirth: true } });
        if (!user?.dateOfBirth) throw new TRPCError({ code: 'BAD_REQUEST', message: 'DOB missing' });
        const age = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        if (age < 18) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Student not yet 18' });
        await ctx.prisma.studentProfile.update({ where: { userId: input.studentId }, data: { parentalRightsTransferred: true, parentalRightsTransferredAt: new Date() } });
        return { success: true };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to transfer rights' });
      }
    }),

  // Educational record access guard (returns boolean and optionally logs)
  canAccessEducationalRecord: protectedProcedure
    .input(z.object({ requesterId: z.string().optional(), studentId: z.string(), purpose: z.string(), logDisclosure: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const requesterId = input.requesterId || ctx.session.user.id;
      // Basic rule: teachers, coordinators, admins of same campus may access; else forbidden
      const requester = await ctx.prisma.user.findUnique({ where: { id: requesterId }, select: { userType: true } });
      if (!requester) throw new TRPCError({ code: 'NOT_FOUND', message: 'Requester not found' });
      const allowedRoles: UserType[] = ['SYSTEM_ADMIN','CAMPUS_ADMIN','TEACHER','CAMPUS_TEACHER','COORDINATOR','CAMPUS_COORDINATOR'];
      const canAccess = allowedRoles.includes(requester.userType as UserType);
      if (canAccess && input.logDisclosure) {
        await ctx.prisma.ferpaDisclosureLog.create({
          data: {
            studentId: input.studentId,
            messageId: '',
            disclosedTo: [requesterId],
            disclosureDate: new Date(),
            disclosurePurpose: input.purpose,
            legitimateEducationalInterest: input.purpose,
            recordsDisclosed: ['educational_record'],
            consentRequired: false,
            consentObtained: false,
            disclosureMethod: 'SYSTEM_ACCESS'
          }
        });
      }
      return { canAccess };
    }),

  // Log a disclosure explicitly
  logDisclosure: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN, UserType.TEACHER, UserType.CAMPUS_TEACHER])
    .input(disclosureSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.ferpaDisclosureLog.create({
          data: {
            studentId: input.studentId,
            messageId: input.messageId || '',
            disclosedTo: input.disclosedTo,
            disclosureDate: new Date(),
            disclosurePurpose: input.disclosurePurpose,
            legitimateEducationalInterest: input.legitimateEducationalInterest,
            recordsDisclosed: input.recordsDisclosed,
            consentRequired: input.consentRequired,
            consentObtained: input.consentObtained,
            disclosureMethod: input.disclosureMethod
          }
        });
        return { success: true };
      } catch (e) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to log disclosure' });
      }
    }),

  // Query disclosures
  listDisclosures: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ studentId: z.string().optional(), startDate: z.date().optional(), endDate: z.date().optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.studentId) where.studentId = input.studentId;
      if (input.startDate && input.endDate) where.disclosureDate = { gte: input.startDate, lte: input.endDate };
      const items = await ctx.prisma.ferpaDisclosureLog.findMany({ where, orderBy: { disclosureDate: 'desc' }, take: input.limit });
      return { items };
    })
});


