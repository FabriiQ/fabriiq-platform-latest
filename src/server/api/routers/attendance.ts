import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AttendanceService } from "../services/attendance.service";
import { SystemStatus, AttendanceStatusType, UserType } from "../constants";
import type { BaseFilters } from "../types";

// Input validation schemas
const createAttendanceSchema = z.object({
  scheduleId: z.string(),
  studentId: z.string(),
  date: z.date(),
  status: z.nativeEnum(AttendanceStatusType),
  remarks: z.string().optional(),
});

const bulkCreateAttendanceSchema = z.object({
  scheduleId: z.string(),
  date: z.date(),
  records: z.array(z.object({
    studentId: z.string(),
    status: z.nativeEnum(AttendanceStatusType),
    remarks: z.string().optional(),
  })),
});

const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatusType).optional(),
  remarks: z.string().optional(),
});

const attendanceIdSchema = z.object({
  id: z.string(),
});

export const attendanceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(AttendanceStatusType),
        studentId: z.string(),
        classId: z.string(),
        date: z.date(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.createAttendance(input);
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        date: z.date(),
        attendanceRecords: z.array(
          z.object({
            studentId: z.string(),
            status: z.nativeEnum(AttendanceStatusType),
            remarks: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, date, attendanceRecords } = input;

      // Validate input
      if (!attendanceRecords || attendanceRecords.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No attendance records provided',
        });
      }

      // Process in chunks to avoid timeout for large datasets
      const CHUNK_SIZE = 100;
      const chunks: typeof attendanceRecords[] = [];
      for (let i = 0; i < attendanceRecords.length; i += CHUNK_SIZE) {
        chunks.push(attendanceRecords.slice(i, i + CHUNK_SIZE));
      }

      let totalProcessed = 0;
      const errors: string[] = [];

      // Process each chunk in a separate transaction with retry logic
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        let retries = 3;

        while (retries > 0) {
          try {
            const results = await ctx.prisma.$transaction(async (tx) => {
              // Delete existing records for this chunk's students
              const studentIds = chunk.map(record => record.studentId);
              await tx.attendance.deleteMany({
                where: {
                  classId,
                  date,
                  studentId: { in: studentIds },
                },
              });

              // Prepare attendance data
              const attendanceData = chunk.map(record => ({
                classId,
                date,
                studentId: record.studentId,
                status: record.status,
                remarks: record.remarks || null,
              }));

              // Use createMany for batch insert
              const result = await tx.attendance.createMany({
                data: attendanceData,
                skipDuplicates: true,
              });

              return result;
            }, {
              timeout: 30000, // 30 second timeout per transaction
            });

            totalProcessed += results.count;
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) {
              errors.push(`Chunk ${chunkIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } else {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
            }
          }
        }
      }

      if (errors.length > 0 && totalProcessed === 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to process attendance: ${errors.join(', ')}`,
        });
      }

      return {
        success: true,
        count: totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully recorded attendance for ${totalProcessed} students${errors.length > 0 ? ` (${errors.length} chunks failed)` : ''}`,
      };
    }),

  // Ultra-optimized bulk upsert for 800+ students
  bulkUpsert: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        date: z.date(),
        attendanceRecords: z.array(
          z.object({
            studentId: z.string(),
            status: z.nativeEnum(AttendanceStatusType),
            remarks: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, date, attendanceRecords } = input;

      // Validate input
      if (!attendanceRecords || attendanceRecords.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No attendance records provided',
        });
      }

      // Process in chunks to avoid timeout for large datasets
      const CHUNK_SIZE = 50; // Smaller chunks for upsert operations
      const chunks: typeof attendanceRecords[] = [];
      for (let i = 0; i < attendanceRecords.length; i += CHUNK_SIZE) {
        chunks.push(attendanceRecords.slice(i, i + CHUNK_SIZE));
      }

      let totalProcessed = 0;
      const errors: string[] = [];

      // Process each chunk with proper Prisma upsert operations and retry logic
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        let retries = 3;

        while (retries > 0) {
          try {
            const results = await ctx.prisma.$transaction(async (tx) => {
              const upsertPromises = chunk.map(record =>
                tx.attendance.upsert({
                  where: {
                    studentId_classId_date: {
                      studentId: record.studentId,
                      classId,
                      date,
                    },
                  },
                  update: {
                    status: record.status,
                    remarks: record.remarks || null,
                    updatedAt: new Date(),
                  },
                  create: {
                    studentId: record.studentId,
                    classId,
                    date,
                    status: record.status,
                    remarks: record.remarks || null,
                  },
                })
              );

              await Promise.all(upsertPromises);
              return { count: chunk.length };
            }, {
              timeout: 45000, // 45 second timeout for upsert operations
            });

            totalProcessed += results.count;
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) {
              errors.push(`Chunk ${chunkIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } else {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
            }
          }
        }
      }

      if (errors.length > 0 && totalProcessed === 0) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to process attendance: ${errors.join(', ')}`,
        });
      }

      return {
        success: true,
        count: totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully processed attendance for ${totalProcessed} students${errors.length > 0 ? ` (${errors.length} chunks failed)` : ''}`,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.getAttendance(input.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(AttendanceStatusType).optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.updateAttendance(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.deleteAttendance(input.id);
    }),

  getByQuery: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        studentId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.nativeEnum(AttendanceStatusType).optional(),
        date: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.getAttendanceByQuery(input);
    }),

  getClassStats: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.getClassAttendanceStats(
        input.classId, 
        input.startDate, 
        input.endDate
      );
    }),

  getStudentStats: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        classId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const attendanceService = new AttendanceService({ prisma: ctx.prisma });
      return attendanceService.getStudentAttendanceStats(
        input.studentId, 
        input.startDate, 
        input.endDate
      );
    }),

  getRecords: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        studentId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.nativeEnum(AttendanceStatusType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const attendanceService = new AttendanceService({ prisma: ctx.prisma });
        const result = await attendanceService.getAttendanceByQuery(input);

        // Ensure we return a consistent structure
        if (result && typeof result === 'object' && 'attendanceRecords' in result) {
          return result.attendanceRecords || [];
        }

        return result || [];
      } catch (error) {
        console.error('Error getting attendance records:', error);

        // Check if it's a database connection error or missing table
        if (error instanceof Error && (
          error.message.includes('database server') ||
          error.message.includes('relation') ||
          error.message.includes('does not exist')
        )) {
          // Return empty array when database is not available or table doesn't exist
          console.warn('Database/table issue, returning empty attendance records');
          return [];
        }

        // For other errors, still return empty array to prevent UI crashes
        console.warn('Attendance query failed, returning empty array:', error);
        return [];
      }
    }),
}); 