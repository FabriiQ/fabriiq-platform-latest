import { z } from 'zod';
import { createTRPCRouter, roleProtectedProcedure, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserType } from '@prisma/client';

export const rightsRouter = createTRPCRouter({
  exportUserData: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.prisma.user.findUnique({
          where: { id: input.userId },
          include: {
            studentProfile: true,
            teacherProfile: true,
            socialPosts: { take: 100, orderBy: { createdAt: 'desc' } },
            messageRecipients: { take: 100, orderBy: { createdAt: 'desc' } },
            userConsents: true,
          }
        });
        if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

        // Minimal PII-safe export
        const exportBlob = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.userType,
            createdAt: user.createdAt,
          },
          profiles: {
            studentProfile: user.studentProfile || null,
            teacherProfile: user.teacherProfile || null,
          },
          consents: user.userConsents,
          recentActivity: {
            posts: user.socialPosts.map(p => ({ id: p.id, content: p.content, createdAt: p.createdAt })),
            messageReceipts: user.messageRecipients.map(r => ({ messageId: r.messageId, deliveryStatus: r.deliveryStatus, readAt: r.readAt })),
          }
        };

        // Return JSON directly; UI can trigger download
        return { success: true, data: exportBlob };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to export user data' });
      }
    }),
});



