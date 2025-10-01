import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TeacherAttendanceService } from "../services/teacher-attendance.service";
import { AttendanceStatusType } from "../constants";

export const teacherAttendanceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        teacherId: z.string(),
        campusId: z.string(),
        date: z.date(),
        status: z.nativeEnum(AttendanceStatusType),
        checkInTime: z.date().optional(),
        checkOutTime: z.date().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.createTeacherAttendance(input);
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        date: z.date(),
        records: z.array(
          z.object({
            teacherId: z.string(),
            status: z.nativeEnum(AttendanceStatusType),
            checkInTime: z.date().optional(),
            checkOutTime: z.date().optional(),
            remarks: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.bulkCreateTeacherAttendance(input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(AttendanceStatusType).optional(),
        checkInTime: z.date().optional(),
        checkOutTime: z.date().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.updateTeacherAttendance(input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.deleteTeacherAttendance(input.id);
    }),

  getByQuery: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        teacherId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.nativeEnum(AttendanceStatusType).optional(),
        date: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.getTeacherAttendanceByQuery(input);
    }),

  getTeacherStats: protectedProcedure
    .input(
      z.object({
        teacherId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.getTeacherAttendanceStats(input);
    }),

  getCampusStats: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const service = new TeacherAttendanceService({ prisma: ctx.prisma });
      return service.getCampusTeacherAttendanceStats(input);
    }),

  // Get teachers for a campus (for attendance marking)
  getTeachersForAttendance: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        date: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { campusId, date } = input;
      
      // Get all teachers for the campus
      const teachers = await ctx.prisma.teacherProfile.findMany({
        where: {
          user: {
            activeCampuses: {
              some: {
                campusId: campusId,
                status: 'ACTIVE',
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      });

      // If date is provided, get existing attendance records for that date
      let existingAttendance: any[] = [];
      if (date) {
        existingAttendance = await ctx.prisma.teacherAttendance.findMany({
          where: {
            campusId,
            date,
          },
          select: {
            id: true,
            teacherId: true,
            status: true,
            checkInTime: true,
            checkOutTime: true,
            remarks: true,
          },
        });
      }

      // Merge teachers with their attendance records
      const teachersWithAttendance = teachers.map((teacher: any) => {
        const attendance = existingAttendance.find(att => att.teacherId === teacher.id);
        return {
          id: teacher.id,
          name: teacher.user?.name || '',
          email: teacher.user?.email || '',
          user: teacher.user,
          attendance: attendance || null,
        };
      });

      return {
        success: true,
        teachers: teachersWithAttendance,
        count: teachersWithAttendance.length,
      };
    }),

  // Get attendance summary for a date range
  getAttendanceSummary: protectedProcedure
    .input(
      z.object({
        campusId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { campusId, startDate, endDate } = input;

      const attendanceRecords = await ctx.prisma.teacherAttendance.findMany({
        where: {
          campusId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [
          { date: 'desc' },
          { teacher: { user: { name: 'asc' } } },
        ],
      });

      // Group by date
      const summaryByDate = attendanceRecords.reduce((acc, record) => {
        const dateKey = record.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: record.date,
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            leave: 0,
          };
        }
        
        acc[dateKey].total++;
        switch (record.status) {
          case AttendanceStatusType.PRESENT:
            acc[dateKey].present++;
            break;
          case AttendanceStatusType.ABSENT:
            acc[dateKey].absent++;
            break;
          case AttendanceStatusType.LATE:
            acc[dateKey].late++;
            break;
          case AttendanceStatusType.EXCUSED:
            acc[dateKey].excused++;
            break;
          case AttendanceStatusType.LEAVE:
            acc[dateKey].leave++;
            break;
        }
        
        return acc;
      }, {} as Record<string, any>);

      return {
        success: true,
        summary: Object.values(summaryByDate),
        totalRecords: attendanceRecords.length,
      };
    }),
});
