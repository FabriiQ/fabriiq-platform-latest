import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StudentValidationService } from '../services/student-validation.service';
import type { CreateStudentInput, CreateStudentResult } from '../services/student-validation.service';

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  studentProfile: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  classEnrollment: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('Student Creation', () => {
  let studentValidationService: StudentValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    studentValidationService = new StudentValidationService(mockPrisma as any);
  });

  describe('createStudentSafely', () => {
    it('should return success result with proper structure', async () => {
      // Arrange
      const input: CreateStudentInput = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        userType: 'CAMPUS_STUDENT',
        institutionId: 'inst-1',
        campusId: 'campus-1',
        profileData: {
          dateOfBirth: '1990-01-01',
          gender: 'MALE',
        }
      };

      // Mock validation to pass
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.studentProfile.findFirst.mockResolvedValue(null);

      // Mock transaction result
      const mockUser = {
        id: 'user-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
      };

      const mockStudentProfile = {
        id: 'profile-1',
        enrollmentNumber: 'ENR001',
        userId: 'user-1',
      };

      mockPrisma.$transaction.mockResolvedValue({
        user: mockUser,
        studentProfile: mockStudentProfile,
        classEnrollment: null,
      });

      // Act
      const result: CreateStudentResult = await studentValidationService.createStudentSafely(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.student).toBeDefined();
      expect(result.student?.id).toBe('user-1');
      expect(result.student?.name).toBe('John Doe');
      expect(result.student?.email).toBe('john.doe@example.com');
      expect(result.student?.enrollmentNumber).toBe('ENR001');
      expect(result.student?.studentProfileId).toBe('profile-1');
      expect(result.message).toContain('successfully');
      expect(result.validation).toBeDefined();
    });

    it('should return failure result when validation fails', async () => {
      // Arrange
      const input: CreateStudentInput = {
        name: 'John Doe',
        email: 'existing@example.com',
        userType: 'CAMPUS_STUDENT',
        institutionId: 'inst-1',
        campusId: 'campus-1',
      };

      // Mock existing user
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        name: 'Existing User',
        email: 'existing@example.com',
        status: 'ACTIVE',
        studentProfile: null,
      });

      // Act
      const result: CreateStudentResult = await studentValidationService.createStudentSafely(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.student).toBeUndefined();
      expect(result.message).toContain('Validation failed');
      expect(result.validation).toBeDefined();
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.email).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const input: CreateStudentInput = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        userType: 'CAMPUS_STUDENT',
        institutionId: 'inst-1',
        campusId: 'campus-1',
      };

      // Mock validation to pass
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.studentProfile.findFirst.mockResolvedValue(null);

      // Mock transaction to throw error
      mockPrisma.$transaction.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result: CreateStudentResult = await studentValidationService.createStudentSafely(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.student).toBeUndefined();
      expect(result.message).toContain('unexpected error');
      expect(result.validation).toBeDefined();
      expect(result.validation.errors.general).toBeDefined();
    });
  });

  describe('validateStudentCreation', () => {
    it('should validate successfully for new student', async () => {
      // Arrange
      const input: CreateStudentInput = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        userType: 'CAMPUS_STUDENT',
        institutionId: 'inst-1',
        campusId: 'campus-1',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.studentProfile.findFirst.mockResolvedValue(null);

      // Act
      const result = await studentValidationService.validateStudentCreation(input);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.suggestions.generatedEnrollmentNumber).toBeDefined();
    });

    it('should detect duplicate email', async () => {
      // Arrange
      const input: CreateStudentInput = {
        name: 'John Doe',
        email: 'existing@example.com',
        userType: 'CAMPUS_STUDENT',
        institutionId: 'inst-1',
        campusId: 'campus-1',
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        name: 'Existing User',
        email: 'existing@example.com',
        status: 'ACTIVE',
        studentProfile: null,
      });

      // Act
      const result = await studentValidationService.validateStudentCreation(input);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.existingStudent).toBeDefined();
      expect(result.suggestions.alternativeEmails).toBeDefined();
    });
  });
});
