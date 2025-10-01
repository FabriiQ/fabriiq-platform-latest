/**
 * Circle Router - Student Social Learning & Peer Connection
 * 
 * Provides endpoints for the Circle feature that allows students to:
 * - View classmates and teachers in their classes
 * - See class member information for social learning
 * - Navigate between different class circles
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const circleRouter = createTRPCRouter({
  /**
   * Get all members (students and teachers) for a specific class
   * Used for class-specific circle pages
   */
  getClassMembers: protectedProcedure
    .input(z.object({ 
      classId: z.string(),
      includeCurrentUser: z.boolean().optional().default(true)
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { classId, includeCurrentUser } = input;
        const currentUserId = ctx.session.user.id;

        // Get class information
        const classInfo = await ctx.prisma.class.findUnique({
          where: { id: classId },
          select: {
            id: true,
            name: true,
            code: true,
            courseCampus: {
              select: {
                course: {
                  select: {
                    name: true
                  }
                }
              }
            },
            term: {
              select: {
                name: true
              }
            }
          }
        });

        if (!classInfo) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Class not found"
          });
        }

        // Get class students
        const studentEnrollments = await ctx.prisma.studentEnrollment.findMany({
          where: {
            classId,
            status: 'ACTIVE',
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                  },
                },
              },
            },
          },
          orderBy: {
            student: {
              user: {
                name: 'asc',
              },
            },
          },
        });

        // Get class teachers
        const teacherAssignments = await ctx.prisma.teacherAssignment.findMany({
          where: {
            classId,
            status: 'ACTIVE',
          },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    userType: true,
                  },
                },
              },
            },
          },
          orderBy: {
            teacher: {
              user: {
                name: 'asc',
              },
            },
          },
        });

        console.log(`Circle API: Found ${teacherAssignments.length} teacher assignments for class ${classId}`);

        // Format students
        const students = studentEnrollments
          .filter(enrollment => includeCurrentUser || enrollment.student.user.id !== currentUserId)
          .map(enrollment => ({
            id: enrollment.student.user.id,
            name: enrollment.student.user.name || 'Unknown Student',
            email: enrollment.student.user.email || '',
            role: 'STUDENT' as const,
            enrollmentNumber: enrollment.student.enrollmentNumber,
            isCurrentUser: enrollment.student.user.id === currentUserId,
          }));

        console.log(`Circle API: Found ${students.length} students for class ${classId}`);

        // Format teachers
        const teachers = teacherAssignments.map(assignment => ({
          id: assignment.teacher.user.id,
          name: assignment.teacher.user.name || 'Unknown Teacher',
          email: assignment.teacher.user.email || '',
          role: 'TEACHER' as const,
          isCurrentUser: assignment.teacher.user.id === currentUserId,
        }));

        // Combine and sort: teachers first, then students
        const allMembers = [
          ...teachers.map(teacher => ({ ...teacher, sortOrder: 0 })),
          ...students.map(student => ({ ...student, sortOrder: 1 }))
        ];

        return {
          classInfo: {
            id: classInfo.id,
            name: classInfo.name,
            code: classInfo.code,
            courseName: classInfo.courseCampus?.course?.name || 'Unknown Course',
            termName: classInfo.term?.name || 'Unknown Term',
          },
          members: allMembers,
          counts: {
            total: allMembers.length,
            students: students.length,
            teachers: teachers.length,
          }
        };

      } catch (error) {
        console.error('Error getting class members for circle:', error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An error occurred while retrieving class members",
            });
      }
    }),

  /**
   * Get all classes that the current student is enrolled in
   * with member counts for each class
   * Used for the main circle page
   */
  getStudentClassesWithMembers: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const currentUserId = ctx.session.user.id;

        // Get student profile
        const studentProfile = await ctx.prisma.studentProfile.findUnique({
          where: { userId: currentUserId },
          select: { id: true }
        });

        if (!studentProfile) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found"
          });
        }

        // Get student's active enrollments with class details
        const enrollments = await ctx.prisma.studentEnrollment.findMany({
          where: {
            studentId: studentProfile.id,
            status: 'ACTIVE',
          },
          include: {
            class: {
              include: {
                courseCampus: {
                  include: {
                    course: {
                      select: {
                        name: true
                      }
                    }
                  }
                },
                term: {
                  select: {
                    name: true
                  }
                },
                _count: {
                  select: {
                    students: {
                      where: {
                        status: 'ACTIVE'
                      }
                    },
                    teachers: {
                      where: {
                        status: 'ACTIVE'
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            class: {
              name: 'asc'
            }
          }
        });

        const classesWithMembers = enrollments.map(enrollment => ({
          id: enrollment.class.id,
          name: enrollment.class.name,
          code: enrollment.class.code,
          courseName: enrollment.class.courseCampus?.course?.name || 'Unknown Course',
          termName: enrollment.class.term?.name || 'Unknown Term',
          memberCounts: {
            students: enrollment.class._count.students,
            teachers: enrollment.class._count.teachers,
            total: enrollment.class._count.students + enrollment.class._count.teachers,
          }
        }));

        return {
          classes: classesWithMembers,
          totalClasses: classesWithMembers.length,
        };

      } catch (error) {
        console.error('Error getting student classes with members:', error);
        throw error instanceof TRPCError
          ? error
          : new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "An error occurred while retrieving student classes",
            });
      }
    }),

  /**
   * Check if current user has access to a specific class circle
   * Used for authorization on class-specific circle pages
   */
  checkClassAccess: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUserId = ctx.session.user.id;
        const { classId } = input;

        // Check if user is a student in this class
        const studentEnrollment = await ctx.prisma.studentEnrollment.findFirst({
          where: {
            classId,
            student: {
              userId: currentUserId
            },
            status: 'ACTIVE'
          }
        });

        // Check if user is a teacher in this class
        const teacherAssignment = await ctx.prisma.teacherAssignment.findFirst({
          where: {
            classId,
            teacher: {
              userId: currentUserId
            },
            status: 'ACTIVE'
          }
        });

        const hasAccess = !!(studentEnrollment || teacherAssignment);
        const userRole = studentEnrollment ? 'STUDENT' : teacherAssignment ? 'TEACHER' : null;

        return {
          hasAccess,
          userRole,
          classId
        };

      } catch (error) {
        console.error('Error checking class access:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while checking class access",
        });
      }
    }),
});
