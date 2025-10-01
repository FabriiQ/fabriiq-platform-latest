import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ServiceBase } from "./service-base";
import { AttendanceStatusType, SystemStatus } from "../constants";
import { HolidayService } from "./holiday.service";
import { AcademicCalendarService } from "./academic-calendar.service";
import { NotificationService } from "./notification.service";
import { AcademicEventType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

// Teacher Attendance creation schema
export const createTeacherAttendanceSchema = z.object({
  teacherId: z.string(),
  campusId: z.string(),
  date: z.date(),
  status: z.nativeEnum(AttendanceStatusType),
  checkInTime: z.date().optional(),
  checkOutTime: z.date().optional(),
  remarks: z.string().optional(),
});

// Teacher Attendance update schema
export const updateTeacherAttendanceSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(AttendanceStatusType).optional(),
  checkInTime: z.date().optional(),
  checkOutTime: z.date().optional(),
  remarks: z.string().optional(),
});

// Teacher Attendance query schema
export const teacherAttendanceQuerySchema = z.object({
  campusId: z.string(),
  teacherId: z.string().optional(),
  date: z.date().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.nativeEnum(AttendanceStatusType).optional(),
});

// Bulk teacher attendance creation schema
export const bulkCreateTeacherAttendanceSchema = z.object({
  campusId: z.string(),
  date: z.date(),
  records: z.array(z.object({
    teacherId: z.string(),
    status: z.nativeEnum(AttendanceStatusType),
    checkInTime: z.date().optional(),
    checkOutTime: z.date().optional(),
    remarks: z.string().optional(),
  })),
});

interface TeacherAttendanceServiceContext {
  prisma: PrismaClient;
}

export class TeacherAttendanceService extends ServiceBase {
  private holidayService: HolidayService;
  private academicCalendarService: AcademicCalendarService;
  private notificationService: NotificationService;

  constructor(options: TeacherAttendanceServiceContext) {
    super(options);
    this.holidayService = new HolidayService(options);
    this.academicCalendarService = new AcademicCalendarService(options);
    this.notificationService = new NotificationService(options);
  }

  /**
   * Create a single teacher attendance record
   */
  async createTeacherAttendance(data: z.infer<typeof createTeacherAttendanceSchema>) {
    try {
      // Check if date is a holiday
      const isHoliday = await this.holidayService.isHoliday(data.date);
      if (isHoliday) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot mark attendance on a holiday',
        });
      }

      // Check if attendance already exists for this teacher and date
      const existingAttendance = await this.prisma.teacherAttendance.findUnique({
        where: {
          teacherId_date: {
            teacherId: data.teacherId,
            date: data.date,
          },
        },
      });

      if (existingAttendance) {
        // Update existing record
        const attendance = await this.prisma.teacherAttendance.update({
          where: { id: existingAttendance.id },
          data: {
            status: data.status,
            checkInTime: data.checkInTime,
            checkOutTime: data.checkOutTime,
            remarks: data.remarks,
            updatedAt: new Date(),
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
            campus: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          success: true,
          attendance,
          message: 'Teacher attendance updated successfully',
        };
      }

      // Create new attendance record
      const attendance = await this.prisma.teacherAttendance.create({
        data: {
          teacher: {
            connect: { id: data.teacherId },
          },
          campus: {
            connect: { id: data.campusId },
          },
          date: data.date,
          status: data.status,
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          remarks: data.remarks,
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
          campus: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        attendance,
        message: 'Teacher attendance created successfully',
      };
    } catch (error) {
      console.error('Error creating teacher attendance:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create teacher attendance',
        cause: error,
      });
    }
  }

  /**
   * Bulk create teacher attendance records
   */
  async bulkCreateTeacherAttendance(data: z.infer<typeof bulkCreateTeacherAttendanceSchema>) {
    try {
      const { campusId, date, records } = data;

      // Check if date is a holiday
      const isHoliday = await this.holidayService.isHoliday(date);
      if (isHoliday) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot mark attendance on a holiday',
        });
      }

      // Check if date has a cancelling academic event
      const events = await this.academicCalendarService.getEventsInRange(date, date);
      const hasCancellingEvent = events.some(event =>
        event.type === AcademicEventType.EXAMINATION ||
        event.type === AcademicEventType.ORIENTATION ||
        event.type === AcademicEventType.GRADUATION
      );

      if (hasCancellingEvent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot mark attendance due to academic events on this date',
        });
      }

      const results: any[] = [];
      const errors: any[] = [];

      // Process each teacher attendance record
      for (const record of records) {
        try {
          const result = await this.createTeacherAttendance({
            teacherId: record.teacherId,
            campusId,
            date,
            status: record.status,
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime,
            remarks: record.remarks,
          });
          results.push(result);
        } catch (error) {
          errors.push({
            teacherId: record.teacherId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        message: `Processed ${results.length} teacher attendance records successfully${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      };
    } catch (error) {
      console.error('Error bulk creating teacher attendance:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to bulk create teacher attendance',
        cause: error,
      });
    }
  }

  /**
   * Update teacher attendance record
   */
  async updateTeacherAttendance(data: z.infer<typeof updateTeacherAttendanceSchema>) {
    try {
      const attendance = await this.prisma.teacherAttendance.update({
        where: { id: data.id },
        data: {
          status: data.status,
          checkInTime: data.checkInTime,
          checkOutTime: data.checkOutTime,
          remarks: data.remarks,
          updatedAt: new Date(),
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
          campus: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        attendance,
        message: 'Teacher attendance updated successfully',
      };
    } catch (error) {
      console.error('Error updating teacher attendance:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update teacher attendance',
        cause: error,
      });
    }
  }

  /**
   * Delete teacher attendance record
   */
  async deleteTeacherAttendance(id: string) {
    try {
      await this.prisma.teacherAttendance.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Teacher attendance deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting teacher attendance:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete teacher attendance',
        cause: error,
      });
    }
  }

  /**
   * Get teacher attendance records by query
   */
  async getTeacherAttendanceByQuery(data: z.infer<typeof teacherAttendanceQuerySchema>) {
    try {
      const { campusId, teacherId, date, startDate, endDate, status } = data;

      const where: any = {
        campusId,
      };

      if (teacherId) {
        where.teacherId = teacherId;
      }

      if (date) {
        where.date = date;
      } else if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      } else if (startDate) {
        where.date = {
          gte: startDate,
        };
      } else if (endDate) {
        where.date = {
          lte: endDate,
        };
      }

      if (status) {
        where.status = status;
      }

      const attendanceRecords = await this.prisma.teacherAttendance.findMany({
        where,
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
          campus: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { date: 'desc' },
          { teacher: { user: { name: 'asc' } } },
        ],
      });

      return {
        success: true,
        attendanceRecords,
        count: attendanceRecords.length,
      };
    } catch (error) {
      console.error('Error getting teacher attendance by query:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get teacher attendance records',
        cause: error,
      });
    }
  }

  /**
   * Get teacher attendance statistics
   */
  async getTeacherAttendanceStats(data: {
    teacherId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { teacherId, startDate, endDate } = data;

      const where: any = {
        teacherId,
      };

      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get all attendance records for the teacher
      const attendanceRecords = await this.prisma.teacherAttendance.findMany({
        where,
        select: {
          status: true,
          date: true,
        },
      });

      // Calculate statistics
      const totalDays = attendanceRecords.length;
      const presentDays = attendanceRecords.filter(record => record.status === AttendanceStatusType.PRESENT).length;
      const absentDays = attendanceRecords.filter(record => record.status === AttendanceStatusType.ABSENT).length;
      const lateDays = attendanceRecords.filter(record => record.status === AttendanceStatusType.LATE).length;
      const excusedDays = attendanceRecords.filter(record => record.status === AttendanceStatusType.EXCUSED).length;
      const leaveDays = attendanceRecords.filter(record => record.status === AttendanceStatusType.LEAVE).length;

      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      const absenteeRate = totalDays > 0 ? (absentDays / totalDays) * 100 : 0;

      return {
        success: true,
        stats: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          excusedDays,
          leaveDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          absenteeRate: Math.round(absenteeRate * 100) / 100,
        },
      };
    } catch (error) {
      console.error('Error getting teacher attendance stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get teacher attendance statistics',
        cause: error,
      });
    }
  }

  /**
   * Get campus teacher attendance statistics
   */
  async getCampusTeacherAttendanceStats(data: {
    campusId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { campusId, startDate, endDate } = data;

      const where: any = {
        campusId,
      };

      if (startDate && endDate) {
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Get all attendance records for the campus
      const attendanceRecords = await this.prisma.teacherAttendance.findMany({
        where,
        select: {
          status: true,
          date: true,
          teacherId: true,
        },
      });

      // Calculate overall statistics
      const totalRecords = attendanceRecords.length;
      const presentRecords = attendanceRecords.filter(record => record.status === AttendanceStatusType.PRESENT).length;
      const absentRecords = attendanceRecords.filter(record => record.status === AttendanceStatusType.ABSENT).length;
      const lateRecords = attendanceRecords.filter(record => record.status === AttendanceStatusType.LATE).length;
      const excusedRecords = attendanceRecords.filter(record => record.status === AttendanceStatusType.EXCUSED).length;
      const leaveRecords = attendanceRecords.filter(record => record.status === AttendanceStatusType.LEAVE).length;

      const overallAttendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
      const overallAbsenteeRate = totalRecords > 0 ? (absentRecords / totalRecords) * 100 : 0;

      // Get unique teachers count
      const uniqueTeachers = new Set(attendanceRecords.map(record => record.teacherId));
      const totalTeachers = uniqueTeachers.size;

      // Calculate teacher-wise statistics
      const teacherStats = Array.from(uniqueTeachers).map(teacherId => {
        const teacherRecords = attendanceRecords.filter(record => record.teacherId === teacherId);
        const teacherTotalDays = teacherRecords.length;
        const teacherPresentDays = teacherRecords.filter(record => record.status === AttendanceStatusType.PRESENT).length;
        const teacherAttendanceRate = teacherTotalDays > 0 ? (teacherPresentDays / teacherTotalDays) * 100 : 0;

        return {
          teacherId,
          totalDays: teacherTotalDays,
          presentDays: teacherPresentDays,
          attendanceRate: Math.round(teacherAttendanceRate * 100) / 100,
        };
      });

      return {
        success: true,
        stats: {
          totalRecords,
          totalTeachers,
          presentRecords,
          absentRecords,
          lateRecords,
          excusedRecords,
          leaveRecords,
          overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100,
          overallAbsenteeRate: Math.round(overallAbsenteeRate * 100) / 100,
          teacherStats,
        },
      };
    } catch (error) {
      console.error('Error getting campus teacher attendance stats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get campus teacher attendance statistics',
        cause: error,
      });
    }
  }
}
