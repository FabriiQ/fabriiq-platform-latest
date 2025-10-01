import { z } from 'zod';
import { createTRPCRouter, roleProtectedProcedure, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserType, IncidentType, IncidentSeverity, IncidentStatus, NotificationRecipient } from '@prisma/client';
import { BreachDetectionService } from '@/features/compliance/BreachDetectionService';

const createIncidentSchema = z.object({
  incidentType: z.nativeEnum(IncidentType),
  severity: z.nativeEnum(IncidentSeverity),
  title: z.string().min(1),
  description: z.string(),
  affectedUserId: z.string().optional(),
  affectedDataCategories: z.array(z.string()).optional(),
  sourceIp: z.string().optional(),
  userAgent: z.string().optional(),
  evidenceData: z.any().optional()
});

const sendNotificationSchema = z.object({
  incidentId: z.string(),
  recipientType: z.nativeEnum(NotificationRecipient),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  isRegulatory: z.boolean().optional(),
  jurisdiction: z.string().optional()
});

const updateIncidentSchema = z.object({
  incidentId: z.string(),
  status: z.nativeEnum(IncidentStatus).optional(),
  assignedTo: z.string().optional(),
  responseActions: z.any().optional(),
  resolution: z.string().optional()
});

export const incidentResponseRouter = createTRPCRouter({
  // Create a new security incident
  createIncident: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(createIncidentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const breachService = new BreachDetectionService(ctx.prisma);
        const incidentId = await breachService.createSecurityIncident(input, ctx.session.user.id);
        return { success: true, incidentId };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to create incident' 
        });
      }
    }),

  // Send breach notification
  sendNotification: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(sendNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const breachService = new BreachDetectionService(ctx.prisma);
        const success = await breachService.sendBreachNotification(input);
        return { success };
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to send notification' 
        });
      }
    }),

  // Update incident status/details
  updateIncident: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(updateIncidentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const updateData: any = {};
        
        if (input.status) updateData.status = input.status;
        if (input.assignedTo) updateData.assignedTo = input.assignedTo;
        if (input.responseActions) updateData.responseActions = input.responseActions;
        if (input.status === 'RESOLVED' && input.resolution) {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = ctx.session.user.id;
          updateData.responseActions = { 
            ...updateData.responseActions, 
            resolution: input.resolution 
          };
        }

        await ctx.prisma.securityIncident.update({
          where: { id: input.incidentId },
          data: updateData
        });

        return { success: true };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to update incident' 
        });
      }
    }),

  // Get incident list with filtering
  getIncidents: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({
      status: z.nativeEnum(IncidentStatus).optional(),
      severity: z.nativeEnum(IncidentSeverity).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {};
        
        if (input.status) where.status = input.status;
        if (input.severity) where.severity = input.severity;
        if (input.startDate && input.endDate) {
          where.detectedAt = { gte: input.startDate, lte: input.endDate };
        }

        const [incidents, totalCount] = await Promise.all([
          ctx.prisma.securityIncident.findMany({
            where,
            include: {
              affectedUser: { select: { id: true, name: true, email: true } },
              assignedToUser: { select: { id: true, name: true } },
              notifications: { select: { recipientType: true, status: true, sentAt: true } }
            },
            orderBy: { detectedAt: 'desc' },
            take: input.limit,
            skip: input.offset
          }),
          ctx.prisma.securityIncident.count({ where })
        ]);

        return { 
          incidents, 
          totalCount,
          hasMore: (input.offset + input.limit) < totalCount
        };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch incidents' 
        });
      }
    }),

  // Get incident details
  getIncident: roleProtectedProcedure([UserType.SYSTEM_ADMIN, UserType.CAMPUS_ADMIN])
    .input(z.object({ incidentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const incident = await ctx.prisma.securityIncident.findUnique({
          where: { id: input.incidentId },
          include: {
            affectedUser: { select: { id: true, name: true, email: true, userType: true } },
            assignedToUser: { select: { id: true, name: true } },
            investigatedByUser: { select: { id: true, name: true } },
            resolvedByUser: { select: { id: true, name: true } },
            notifications: {
              select: { 
                recipientType: true, 
                recipientEmail: true, 
                subject: true,
                status: true, 
                sentAt: true,
                isRegulatory: true 
              },
              orderBy: { sentAt: 'desc' }
            },
            anomalies: {
              select: {
                anomalyType: true,
                riskScore: true,
                description: true,
                detectedAt: true
              },
              orderBy: { detectedAt: 'desc' }
            }
          }
        });

        if (!incident) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found' });
        }

        return incident;
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch incident details' 
        });
      }
    }),

  // Get incident statistics
  getIncidentStatistics: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const breachService = new BreachDetectionService(ctx.prisma);
        const stats = await breachService.getIncidentStatistics(input.startDate, input.endDate);
        return stats;
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch incident statistics' 
        });
      }
    }),

  // Check 72-hour notification requirements
  checkNotificationRequirements: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .mutation(async ({ ctx }) => {
      try {
        const breachService = new BreachDetectionService(ctx.prisma);
        await breachService.checkBreachNotificationRequirements();
        return { success: true };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to check notification requirements' 
        });
      }
    }),

  // Get security anomalies
  getAnomalies: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({
      userId: z.string().optional(),
      riskScoreMin: z.number().min(0).max(1).optional(),
      status: z.enum(['DETECTED', 'REVIEWING', 'CONFIRMED_THREAT', 'FALSE_POSITIVE', 'RESOLVED']).optional(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {};
        
        if (input.userId) where.userId = input.userId;
        if (input.riskScoreMin) where.riskScore = { gte: input.riskScoreMin };
        if (input.status) where.status = input.status;

        const anomalies = await ctx.prisma.securityAnomaly.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            reviewedByUser: { select: { id: true, name: true } },
            incident: { select: { id: true, title: true, status: true } }
          },
          orderBy: { detectedAt: 'desc' },
          take: input.limit
        });

        return anomalies;
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to fetch anomalies' 
        });
      }
    }),

  // Update anomaly status
  updateAnomaly: roleProtectedProcedure([UserType.SYSTEM_ADMIN])
    .input(z.object({
      anomalyId: z.string(),
      status: z.enum(['DETECTED', 'REVIEWING', 'CONFIRMED_THREAT', 'FALSE_POSITIVE', 'RESOLVED'])
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.securityAnomaly.update({
          where: { id: input.anomalyId },
          data: {
            status: input.status,
            reviewedBy: ctx.session.user.id,
            reviewedAt: new Date()
          }
        });

        return { success: true };
      } catch (e) {
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to update anomaly' 
        });
      }
    })
});