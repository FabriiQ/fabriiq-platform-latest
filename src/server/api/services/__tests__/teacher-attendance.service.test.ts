import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeacherAttendanceService } from '../teacher-attendance.service';
import { AttendanceStatusType } from '../../constants';
import { TRPCError } from '@trpc/server';

// Mock Prisma client
const mockPrisma = {
  teacherAttendance: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock services
const mockHolidayService = {
  isHoliday: vi.fn(),
};

const mockAcademicCalendarService = {
  getEventsInRange: vi.fn(),
};

const mockNotificationService = {};

describe('TeacherAttendanceService', () => {
  let service: TeacherAttendanceService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create service instance with mocked dependencies
    service = new TeacherAttendanceService({ prisma: mockPrisma as any });
    
    // Mock the internal services
    (service as any).holidayService = mockHolidayService;
    (service as any).academicCalendarService = mockAcademicCalendarService;
    (service as any).notificationService = mockNotificationService;
  });

  describe('createTeacherAttendance', () => {
    const mockAttendanceData = {
      teacherId: 'teacher-1',
      campusId: 'campus-1',
      date: new Date('2024-01-15'),
      status: AttendanceStatusType.PRESENT,
      checkInTime: new Date('2024-01-15T09:00:00Z'),
      checkOutTime: new Date('2024-01-15T17:00:00Z'),
      remarks: 'On time',
    };

    it('should create new teacher attendance record successfully', async () => {
      // Mock holiday check
      mockHolidayService.isHoliday.mockResolvedValue(false);
      
      // Mock no existing attendance
      mockPrisma.teacherAttendance.findUnique.mockResolvedValue(null);
      
      // Mock successful creation
      const mockCreatedAttendance = {
        id: 'attendance-1',
        ...mockAttendanceData,
        teacher: {
          id: 'teacher-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        campus: {
          id: 'campus-1',
          name: 'Main Campus',
        },
      };
      mockPrisma.teacherAttendance.create.mockResolvedValue(mockCreatedAttendance);

      const result = await service.createTeacherAttendance(mockAttendanceData);

      expect(result.success).toBe(true);
      expect(result.attendance).toEqual(mockCreatedAttendance);
      expect(result.message).toBe('Teacher attendance created successfully');
      expect(mockPrisma.teacherAttendance.create).toHaveBeenCalledWith({
        data: {
          teacher: { connect: { id: 'teacher-1' } },
          campus: { connect: { id: 'campus-1' } },
          date: mockAttendanceData.date,
          status: mockAttendanceData.status,
          checkInTime: mockAttendanceData.checkInTime,
          checkOutTime: mockAttendanceData.checkOutTime,
          remarks: mockAttendanceData.remarks,
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
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
    });

    it('should update existing teacher attendance record', async () => {
      // Mock holiday check
      mockHolidayService.isHoliday.mockResolvedValue(false);
      
      // Mock existing attendance
      const existingAttendance = {
        id: 'attendance-1',
        teacherId: 'teacher-1',
        date: mockAttendanceData.date,
        status: AttendanceStatusType.ABSENT,
      };
      mockPrisma.teacherAttendance.findUnique.mockResolvedValue(existingAttendance);
      
      // Mock successful update
      const mockUpdatedAttendance = {
        ...existingAttendance,
        ...mockAttendanceData,
        teacher: {
          id: 'teacher-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        campus: {
          id: 'campus-1',
          name: 'Main Campus',
        },
      };
      mockPrisma.teacherAttendance.update.mockResolvedValue(mockUpdatedAttendance);

      const result = await service.createTeacherAttendance(mockAttendanceData);

      expect(result.success).toBe(true);
      expect(result.attendance).toEqual(mockUpdatedAttendance);
      expect(result.message).toBe('Teacher attendance updated successfully');
      expect(mockPrisma.teacherAttendance.update).toHaveBeenCalledWith({
        where: { id: 'attendance-1' },
        data: {
          status: mockAttendanceData.status,
          checkInTime: mockAttendanceData.checkInTime,
          checkOutTime: mockAttendanceData.checkOutTime,
          remarks: mockAttendanceData.remarks,
          updatedAt: expect.any(Date),
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
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
    });

    it('should throw error when trying to mark attendance on holiday', async () => {
      // Mock holiday check
      mockHolidayService.isHoliday.mockResolvedValue(true);

      await expect(service.createTeacherAttendance(mockAttendanceData))
        .rejects
        .toThrow(TRPCError);

      expect(mockPrisma.teacherAttendance.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.teacherAttendance.create).not.toHaveBeenCalled();
    });
  });

  describe('getTeacherAttendanceByQuery', () => {
    it('should fetch teacher attendance records with filters', async () => {
      const queryData = {
        campusId: 'campus-1',
        teacherId: 'teacher-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        status: AttendanceStatusType.PRESENT,
      };

      const mockAttendanceRecords = [
        {
          id: 'attendance-1',
          teacherId: 'teacher-1',
          campusId: 'campus-1',
          date: new Date('2024-01-15'),
          status: AttendanceStatusType.PRESENT,
          teacher: {
            id: 'teacher-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          campus: {
            id: 'campus-1',
            name: 'Main Campus',
          },
        },
      ];

      mockPrisma.teacherAttendance.findMany.mockResolvedValue(mockAttendanceRecords);

      const result = await service.getTeacherAttendanceByQuery(queryData);

      expect(result.success).toBe(true);
      expect(result.attendanceRecords).toEqual(mockAttendanceRecords);
      expect(result.count).toBe(1);
      expect(mockPrisma.teacherAttendance.findMany).toHaveBeenCalledWith({
        where: {
          campusId: 'campus-1',
          teacherId: 'teacher-1',
          date: {
            gte: queryData.startDate,
            lte: queryData.endDate,
          },
          status: AttendanceStatusType.PRESENT,
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
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
          { teacher: { name: 'asc' } },
        ],
      });
    });
  });

  describe('getTeacherAttendanceStats', () => {
    it('should calculate teacher attendance statistics correctly', async () => {
      const statsData = {
        teacherId: 'teacher-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const mockAttendanceRecords = [
        { status: AttendanceStatusType.PRESENT, date: new Date('2024-01-01') },
        { status: AttendanceStatusType.PRESENT, date: new Date('2024-01-02') },
        { status: AttendanceStatusType.ABSENT, date: new Date('2024-01-03') },
        { status: AttendanceStatusType.LATE, date: new Date('2024-01-04') },
        { status: AttendanceStatusType.EXCUSED, date: new Date('2024-01-05') },
      ];

      mockPrisma.teacherAttendance.findMany.mockResolvedValue(mockAttendanceRecords);

      const result = await service.getTeacherAttendanceStats(statsData);

      expect(result.success).toBe(true);
      expect(result.stats).toEqual({
        totalDays: 5,
        presentDays: 2,
        absentDays: 1,
        lateDays: 1,
        excusedDays: 1,
        leaveDays: 0,
        attendanceRate: 40, // 2/5 * 100
        absenteeRate: 20,   // 1/5 * 100
      });
    });

    it('should handle empty attendance records', async () => {
      const statsData = {
        teacherId: 'teacher-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      mockPrisma.teacherAttendance.findMany.mockResolvedValue([]);

      const result = await service.getTeacherAttendanceStats(statsData);

      expect(result.success).toBe(true);
      expect(result.stats).toEqual({
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        excusedDays: 0,
        leaveDays: 0,
        attendanceRate: 0,
        absenteeRate: 0,
      });
    });
  });

  describe('bulkCreateTeacherAttendance', () => {
    it('should create multiple teacher attendance records successfully', async () => {
      const bulkData = {
        campusId: 'campus-1',
        date: new Date('2024-01-15'),
        records: [
          {
            teacherId: 'teacher-1',
            status: AttendanceStatusType.PRESENT,
            remarks: 'On time',
          },
          {
            teacherId: 'teacher-2',
            status: AttendanceStatusType.LATE,
            remarks: 'Traffic delay',
          },
        ],
      };

      // Mock holiday and event checks
      mockHolidayService.isHoliday.mockResolvedValue(false);
      mockAcademicCalendarService.getEventsInRange.mockResolvedValue([]);

      // Mock successful individual creations
      const mockResults = [
        { success: true, attendance: { id: 'attendance-1' } },
        { success: true, attendance: { id: 'attendance-2' } },
      ];

      // Mock the createTeacherAttendance method
      const createSpy = vi.spyOn(service, 'createTeacherAttendance')
        .mockResolvedValueOnce(mockResults[0] as any)
        .mockResolvedValueOnce(mockResults[1] as any);

      const result = await service.bulkCreateTeacherAttendance(bulkData);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(createSpy).toHaveBeenCalledTimes(2);
    });
  });
});
