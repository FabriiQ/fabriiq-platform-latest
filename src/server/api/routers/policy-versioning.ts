import { z } from 'zod';
import { createTRPCRouter, roleProtectedProcedure, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserType, PolicyType, AcceptanceMethod } from '@prisma/client';
import { PolicyVersioningService } from '@/features/compliance/PolicyVersioningService';

const createPolicyVersionSchema = z.object({
  policyType: z.nativeEnum(PolicyType),
  version: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  effectiveDate: z.date(),
  expiryDate: z.date().optional(),
  changesFromPrevious: z.string().optional(),
  reasonForChange: z.string().optional(),
  requiresAcceptance: z.boolean().optional(),
  acceptanceDeadline: z.date().optional(),
  autoPublish: z.boolean().default(false)
});

const recordAcceptanceSchema = z.object({
  policyVersionId: z.string(),
  acceptanceMethod: z.nativeEnum(AcceptanceMethod).optional(),
  userAge: z.number().optional(),
  requiresParentalConsent: z.boolean().optional(),
  parentalConsentBy: z.string().optional()
});

export const policyVersioningRouter = createTRPCRouter({
  // Create a new policy version
  createPolicyVersion: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(createPolicyVersionSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const { autoPublish, ...policyData } = input;
        
        const policyVersionId = await policyService.createPolicyVersion(
          policyData,
          ctx.session.user.id,
          autoPublish
        );
        
        return { success: true, policyVersionId };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to create policy version' 
        });
      }
    }),

  // Publish a policy version
  publishPolicyVersion: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({ policyVersionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        await policyService.publishPolicyVersion(input.policyVersionId, ctx.session.user.id);
        return { success: true };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to publish policy version' 
        });
      }
    }),

  // Record user acceptance of a policy
  acceptPolicy: protectedProcedure
    .input(recordAcceptanceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        
        // Get client IP and User Agent from request headers
        const ipAddress = ctx.req?.headers['x-forwarded-for'] as string || 
                         ctx.req?.headers['x-real-ip'] as string ||
                         ctx.req?.connection?.remoteAddress;
        const userAgent = ctx.req?.headers['user-agent'] as string;

        await policyService.recordPolicyAcceptance({
          ...input,
          userId: ctx.session.user.id,
          ipAddress,
          userAgent
        });
        
        return { success: true };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to record policy acceptance' 
        });
      }
    }),

  // Get user's policy status
  getUserPolicyStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const status = await policyService.getUserPolicyStatus(ctx.session.user.id);
        return status;
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to get user policy status' 
        });
      }
    }),

  // Get active policy version by type
  getActivePolicyVersion: protectedProcedure
    .input(z.object({ policyType: z.nativeEnum(PolicyType) }))
    .query(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const policy = await policyService.getActivePolicyVersion(input.policyType);
        
        if (!policy) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'No active policy version found' 
          });
        }
        
        return policy;
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to get active policy version' 
        });
      }
    }),

  // Get policy versions list (admin)
  getPolicyVersions: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({
      policyType: z.nativeEnum(PolicyType).optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {};
        
        if (input.policyType) where.policyType = input.policyType;
        if (input.isActive !== undefined) where.isActive = input.isActive;

        const [policyVersions, totalCount] = await Promise.all([
          ctx.prisma.policyVersion.findMany({
            where,
            include: {
              createdBy: { select: { id: true, name: true } },
              approvedBy: { select: { id: true, name: true } },
              _count: { select: { acceptances: true } }
            },
            orderBy: [{ policyType: 'asc' }, { createdAt: 'desc' }],
            take: input.limit,
            skip: input.offset
          }),
          ctx.prisma.policyVersion.count({ where })
        ]);

        return { 
          policyVersions, 
          totalCount,
          hasMore: (input.offset + input.limit) < totalCount
        };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch policy versions' 
        });
      }
    }),

  // Get policy version details
  getPolicyVersion: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({ policyVersionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const policyVersion = await ctx.prisma.policyVersion.findUnique({
          where: { id: input.policyVersionId },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            approvedBy: { select: { id: true, name: true, email: true } },
            acceptances: {
              select: {
                userId: true,
                acceptedAt: true,
                acceptanceMethod: true,
                ipAddress: true,
                userAge: true,
                requiresParentalConsent: true,
                parentalConsentGiven: true,
                user: { select: { name: true, email: true } }
              },
              orderBy: { acceptedAt: 'desc' },
              take: 100 // Last 100 acceptances
            }
          }
        });

        if (!policyVersion) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy version not found' });
        }

        return policyVersion;
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch policy version details' 
        });
      }
    }),

  // Get users needing policy acceptance
  getUsersNeedingAcceptance: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({
      policyType: z.nativeEnum(PolicyType).optional(),
      overdueOnly: z.boolean().default(false),
      limit: z.number().min(1).max(1000).default(100)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const usersNeedingAcceptance = await policyService.getUsersNeedingPolicyAcceptance(
          input.policyType,
          input.overdueOnly
        );

        // Limit results and add user details
        const limitedResults = usersNeedingAcceptance.slice(0, input.limit);
        
        if (limitedResults.length === 0) {
          return { users: [], totalCount: 0 };
        }

        const userIds = [...new Set(limitedResults.map(u => u.userId))];
        const users = await ctx.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { 
            id: true, 
            name: true, 
            email: true, 
            userType: true,
            createdAt: true
          }
        });

        const usersMap = new Map(users.map(u => [u.id, u]));
        
        const enrichedResults = limitedResults
          .filter(result => usersMap.has(result.userId))
          .map(result => ({
            ...result,
            user: usersMap.get(result.userId)
          }));

        return { 
          users: enrichedResults,
          totalCount: usersNeedingAcceptance.length,
          hasMore: usersNeedingAcceptance.length > input.limit
        };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch users needing acceptance' 
        });
      }
    }),

  // Get policy acceptance statistics
  getAcceptanceStatistics: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({ policyVersionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const stats = await policyService.getPolicyAcceptanceStatistics(input.policyVersionId);
        return stats;
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch acceptance statistics' 
        });
      }
    }),

  // Check for overdue policy acceptances
  checkOverdueAcceptances: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .mutation(async ({ ctx }) => {
      try {
        const policyService = new PolicyVersioningService(ctx.prisma);
        const overdueUsers = await policyService.getUsersNeedingPolicyAcceptance(undefined, true);
        
        return { 
          overdueCount: overdueUsers.length,
          overdueUsers: overdueUsers.slice(0, 10) // Return first 10 for preview
        };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to check overdue acceptances' 
        });
      }
    })
});