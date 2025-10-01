import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PersonalEventType } from "@/types/calendar";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  isAllDay: z.boolean().default(false),
  type: z.nativeEnum(PersonalEventType),
  color: z.string().optional(),
});

const updateEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isAllDay: z.boolean().optional(),
  type: z.nativeEnum(PersonalEventType).optional(),
  color: z.string().optional(),
});

const getEventsSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  types: z.array(z.nativeEnum(PersonalEventType)).optional(),
});

// Helper function to get event type color
function getEventTypeColor(type: PersonalEventType): string {
  const colorMap: Record<PersonalEventType, string> = {
    STUDY_SESSION: "#1F504B", // Primary color
    ASSIGNMENT: "#2563eb", // Secondary color
    EXAM_PREP: "#dc2626", // Accent color
    MEETING: "#6b7280", // Muted color
    PERSONAL: "#059669", // Primary variant
    REMINDER: "#d97706", // Secondary variant
    BREAK: "#9ca3af", // Muted variant
  };
  return colorMap[type] || "#1F504B";
}

export const personalCalendarRouter = createTRPCRouter({
  // Get user's events in date range
  getEvents: protectedProcedure
    .input(getEventsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const events = await ctx.prisma.personalCalendarEvent.findMany({
          where: {
            userId: ctx.session.user.id,
            startDate: { 
              gte: input.startDate,
              lte: input.endDate 
            },
            status: 'ACTIVE',
            ...(input.types && input.types.length > 0 && { 
              type: { in: input.types } 
            })
          },
          orderBy: { startDate: 'asc' }
        });

        return events;
      } catch (error) {
        console.error('Error fetching personal calendar events:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar events'
        });
      }
    }),

  // Create new event
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate date range
        if (input.startDate >= input.endDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'End date must be after start date'
          });
        }

        const event = await ctx.prisma.personalCalendarEvent.create({
          data: {
            ...input,
            userId: ctx.session.user.id,
            color: input.color || getEventTypeColor(input.type)
          }
        });

        return event;
      } catch (error) {
        console.error('Error creating personal calendar event:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create calendar event'
        });
      }
    }),

  // Update event
  updateEvent: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        // Check if event exists and belongs to user
        const existingEvent = await ctx.prisma.personalCalendarEvent.findFirst({
          where: {
            id,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        if (!existingEvent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found or you do not have permission to update it'
          });
        }

        // Validate date range if both dates are provided
        if (updateData.startDate && updateData.endDate) {
          if (updateData.startDate >= updateData.endDate) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'End date must be after start date'
            });
          }
        }

        const updatedEvent = await ctx.prisma.personalCalendarEvent.update({
          where: { id },
          data: {
            ...updateData,
            // Update color if type is changed
            ...(updateData.type && { 
              color: updateData.color || getEventTypeColor(updateData.type) 
            })
          }
        });

        return updatedEvent;
      } catch (error) {
        console.error('Error updating personal calendar event:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update calendar event'
        });
      }
    }),

  // Delete event (soft delete)
  deleteEvent: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: eventId }) => {
      try {
        // Check if event exists and belongs to user
        const existingEvent = await ctx.prisma.personalCalendarEvent.findFirst({
          where: {
            id: eventId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        if (!existingEvent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found or you do not have permission to delete it'
          });
        }

        const deletedEvent = await ctx.prisma.personalCalendarEvent.update({
          where: { id: eventId },
          data: { status: 'DELETED' }
        });

        return { success: true, deletedEvent };
      } catch (error) {
        console.error('Error deleting personal calendar event:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete calendar event'
        });
      }
    }),

  // Get event by ID
  getEventById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input: eventId }) => {
      try {
        const event = await ctx.prisma.personalCalendarEvent.findFirst({
          where: {
            id: eventId,
            userId: ctx.session.user.id,
            status: 'ACTIVE'
          }
        });

        if (!event) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found'
          });
        }

        return event;
      } catch (error) {
        console.error('Error fetching personal calendar event:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar event'
        });
      }
    }),

  // Get events count for a specific date range
  getEventsCount: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const count = await ctx.prisma.personalCalendarEvent.count({
          where: {
            userId: ctx.session.user.id,
            startDate: {
              gte: input.startDate,
              lte: input.endDate
            },
            status: 'ACTIVE'
          }
        });

        return { count };
      } catch (error) {
        console.error('Error counting personal calendar events:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to count calendar events'
        });
      }
    }),

  // Get class activities and events for student calendar using tRPC APIs
  getClassActivities: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Get student profile using existing method
        const studentProfile = await ctx.prisma.studentProfile.findFirst({
          where: { userId: ctx.session.user.id },
          select: {
            id: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: {
                classId: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    code: true
                  }
                }
              },
              take: 20
            }
          }
        });

        if (!studentProfile || !studentProfile.enrollments.length) {
          return [];
        }

        const classIds = studentProfile.enrollments.map((e: any) => e.classId);

        // Fetch data using simplified queries to avoid complex joins and timeouts
        const [activitiesResult, commitmentsResult, goalsResult, assessmentsResult] = await Promise.allSettled([
          // Get activities for all enrolled classes
          ctx.prisma.activity.findMany({
            where: {
              classId: { in: classIds },
              status: 'ACTIVE',
              OR: [
                {
                  startDate: {
                    gte: input.startDate,
                    lte: input.endDate
                  }
                },
                {
                  endDate: {
                    gte: input.startDate,
                    lte: input.endDate
                  }
                }
              ]
            },
            select: {
              id: true,
              title: true,
              purpose: true,
              learningType: true,
              assessmentType: true,
              startDate: true,
              endDate: true,
              isGradable: true,
              classId: true,
              subjectId: true
            },
            take: 100,
            orderBy: [
              { startDate: 'asc' },
              { endDate: 'asc' }
            ]
          }),

          // Get commitments for the student - expanded date range for better visibility
          ctx.prisma.commitmentContract.findMany({
            where: {
              studentId: studentProfile.id,
              OR: [
                {
                  deadline: {
                    gte: input.startDate,
                    lte: input.endDate
                  }
                },
                {
                  // Also include recent commitments for context
                  deadline: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // Next 30 days
                  }
                }
              ],
              status: 'ACTIVE'
            },
            select: {
              id: true,
              title: true,
              description: true,
              deadline: true,
              isCompleted: true,
              completedAt: true,
              classId: true,
              createdAt: true
            },
            take: 50,
            orderBy: {
              deadline: 'asc'
            }
          }),

          // Get learning goals for the student - show all active goals
          ctx.prisma.learningGoal.findMany({
            where: {
              studentId: studentProfile.id,
              classId: { in: classIds },
              status: 'ACTIVE'
            },
            select: {
              id: true,
              title: true,
              description: true,
              progress: true,
              total: true,
              createdAt: true,
              updatedAt: true,
              classId: true,
              subjectId: true
            },
            take: 30,
            orderBy: {
              updatedAt: 'desc'
            }
          }),

          // Get assessments for enrolled classes within date range
          ctx.prisma.assessment.findMany({
            where: {
              classId: { in: classIds },
              status: 'ACTIVE',
              dueDate: {
                gte: input.startDate,
                lte: input.endDate
              }
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              maxScore: true,
              category: true,
              classId: true,
              subjectId: true
            },
            take: 50,
            orderBy: {
              dueDate: 'asc'
            }
          })
        ]);

        // Extract results from Promise.allSettled
        const activities = activitiesResult.status === 'fulfilled' ? activitiesResult.value : [];
        const commitments = commitmentsResult.status === 'fulfilled' ? commitmentsResult.value : [];
        const goals = goalsResult.status === 'fulfilled' ? goalsResult.value : [];
        const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];

        // Log any failed queries for debugging
        if (activitiesResult.status === 'rejected') {
          console.error('Activities query failed:', activitiesResult.reason);
        }
        if (commitmentsResult.status === 'rejected') {
          console.error('Commitments query failed:', commitmentsResult.reason);
        }
        if (goalsResult.status === 'rejected') {
          console.error('Goals query failed:', goalsResult.reason);
        }
        if (assessmentsResult.status === 'rejected') {
          console.error('Assessments query failed:', assessmentsResult.reason);
        }

        // Create lookup maps for class and subject names
        const classMap = new Map();
        studentProfile.enrollments.forEach((enrollment: any) => {
          classMap.set(enrollment.classId, enrollment.class);
        });

        // Transform activities to calendar events
        const activityEvents = (activities || []).map((activity: any) => {
          const classInfo = classMap.get(activity.classId);
          return {
            id: `activity-${activity.id}`,
            title: activity.title,
            description: `${classInfo?.name || 'Class'} - Activity`,
            startDate: activity.startDate || activity.endDate || new Date(),
            endDate: activity.endDate || activity.startDate || new Date(),
            isAllDay: !activity.startDate,
            type: activity.isGradable ? 'ASSESSMENT' : 'ACTIVITY',
            color: activity.isGradable ? '#ef4444' : '#3b82f6', // Red for assessments, blue for activities
            source: 'activity',
            classId: activity.classId,
            className: classInfo?.name,
            purpose: activity.purpose,
            learningType: activity.learningType,
            assessmentType: activity.assessmentType
          };
        });

        // Transform commitments to calendar events
        const commitmentEvents = (commitments || []).map((commitment: any) => {
          const classInfo = classMap.get(commitment.classId);
          return {
            id: `commitment-${commitment.id}`,
            title: commitment.title,
            description: `Commitment: ${commitment.description || 'No description'}`,
            startDate: commitment.deadline,
            endDate: commitment.deadline,
            isAllDay: true,
            type: 'COMMITMENT',
            color: '#f59e0b', // Amber for commitments
            source: 'commitment',
            classId: commitment.classId,
            className: classInfo?.name,
            isCompleted: commitment.isCompleted,
            completedAt: commitment.completedAt
          };
        });

        // Transform goals to calendar events - using updatedAt as display date since no targetDate
        const goalEvents = (goals || []).map((goal: any) => {
          const classInfo = classMap.get(goal.classId);
          return {
            id: `goal-${goal.id}`,
            title: goal.title,
            description: `Goal: ${goal.description || 'No description'} (${goal.progress || 0}/${goal.total || 100} complete)`,
            startDate: goal.updatedAt || goal.createdAt,
            endDate: goal.updatedAt || goal.createdAt,
            isAllDay: true,
            type: 'GOAL',
            color: '#10b981', // Green for goals
            source: 'goal',
            classId: goal.classId,
            className: classInfo?.name,
            progress: goal.progress,
            total: goal.total
          };
        });

        // Transform assessments to calendar events
        const assessmentEvents = (assessments || []).map((assessment: any) => {
          const classInfo = classMap.get(assessment.classId);
          return {
            id: `assessment-${assessment.id}`,
            title: assessment.title,
            description: `Assessment: ${assessment.description || 'No description'} (Max Score: ${assessment.maxScore || 'N/A'})`,
            startDate: assessment.dueDate,
            endDate: assessment.dueDate,
            isAllDay: true,
            type: 'ASSESSMENT',
            color: '#dc2626', // Red for assessments
            source: 'assessment',
            classId: assessment.classId,
            className: classInfo?.name,
            category: assessment.category,
            maxScore: assessment.maxScore
          };
        });

        const allEvents = [...activityEvents, ...commitmentEvents, ...goalEvents, ...assessmentEvents];

        // Debug logging
        console.log('Calendar API Debug:', {
          dateRange: { startDate: input.startDate, endDate: input.endDate },
          studentId: studentProfile.id,
          classIds,
          counts: {
            activities: activities.length,
            commitments: commitments.length,
            goals: goals.length,
            assessments: assessments.length,
            totalEvents: allEvents.length
          }
        });

        return allEvents;
      } catch (error) {
        console.error('Error fetching class activities for calendar:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch class activities'
        });
      }
    }),
});
