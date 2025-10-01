/**
 * Enrollment Service
 * Handles operations related to student enrollments
 */

import { SystemStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ServiceBase } from "./service-base";
import { EnrollmentHistoryService } from "./enrollment-history.service";

// Define EnrollmentStatus enum locally since it's not properly exported from Prisma client
export enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  WITHDRAWN = "WITHDRAWN",
  INACTIVE = "INACTIVE"
}

// Enrollment creation schema
export const createEnrollmentSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
  startDate: z.date().optional(),
  createdById: z.string(),
  notes: z.string().optional(),
});

// Enrollment update schema
export const updateEnrollmentSchema = z.object({
  id: z.string(),
  status: z.enum(['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// Bulk enrollment schema
export const bulkEnrollmentSchema = z.object({
  classId: z.string(),
  studentIds: z.array(z.string()).min(1),
  startDate: z.date().optional(),
  createdById: z.string(),
});

// Student class transfer schema
export const transferStudentClassSchema = z.object({
  studentId: z.string(),
  fromClassId: z.string(),
  toClassId: z.string(),
  transferDate: z.date().optional(),
  reason: z.string().optional(),
  transferById: z.string(),
});

// Student campus transfer schema
export const transferStudentCampusSchema = z.object({
  studentId: z.string(),
  fromCampusId: z.string(),
  toCampusId: z.string(),
  toClassId: z.string().optional(),
  transferDate: z.date().optional(),
  reason: z.string().optional(),
  transferById: z.string(),
});

export class EnrollmentService extends ServiceBase {
  /**
   * Gets all enrollments with optional filtering - OPTIMIZED FOR PERFORMANCE WITH PAGINATION
   * @param filters Optional filters for campus, program, status, search term, and pagination
   * @returns Filtered enrollments with pagination metadata
   */
  async getAllEnrollments(filters: {
    campusId?: string;
    programId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      // Set pagination defaults
      const page = filters.page || 1;
      const pageSize = Math.min(filters.pageSize || 25, 100); // Max 100 per page
      const skip = (page - 1) * pageSize;

      // Build optimized where clause
      const where: any = {};

      // Add status filter if provided and not 'all'
      if (filters.status && filters.status !== 'all') {
        where.status = filters.status;
      }

      // Add campus filter if provided and not 'all'
      if (filters.campusId && filters.campusId !== 'all') {
        where.class = {
          ...where.class,
          campusId: filters.campusId,
        };
      }

      // Add program filter if provided and not 'all'
      if (filters.programId && filters.programId !== 'all') {
        where.class = {
          ...where.class,
          programCampus: {
            programId: filters.programId,
          },
        };
      }

      // Add search filter if provided - optimized for performance
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        where.OR = [
          {
            student: {
              user: {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            student: {
              user: {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            student: {
              enrollmentNumber: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            class: {
              name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      // Execute queries in parallel for better performance
      const [enrollments, totalCount] = await Promise.all([
        this.prisma.studentEnrollment.findMany({
          where,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
            student: {
              select: {
                id: true,
                enrollmentNumber: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true,
                campus: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                programCampus: {
                  select: {
                    id: true,
                    program: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                fees: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: 'desc',
            },
          ],
          skip,
          take: pageSize,
        }),
        this.prisma.studentEnrollment.count({ where }),
      ]);

      // Transform the data efficiently
      const formattedEnrollments = enrollments.map(enrollment => ({
        id: enrollment.id,
        studentName: enrollment.student.user.name,
        studentEmail: enrollment.student.user.email,
        studentId: enrollment.student.user.id,
        enrollmentNumber: enrollment.student.enrollmentNumber,
        campusName: enrollment.class.campus.name,
        campusId: enrollment.class.campus.id,
        className: enrollment.class.name,
        classId: enrollment.class.id,
        programName: enrollment.class.programCampus?.program.name || 'N/A',
        programId: enrollment.class.programCampus?.program.id || '',
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        status: enrollment.status,
        hasFee: enrollment._count.fees > 0,
        createdAt: enrollment.createdAt,
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        data: formattedEnrollments,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.error('Error in getAllEnrollments:', error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get enrollments",
        cause: error,
      });
    }
  }
  /**
   * Creates a new student enrollment
   * @param data Enrollment data
   * @returns Created enrollment
   */
  async createEnrollment(data: z.infer<typeof createEnrollmentSchema>) {
    try {
      // Find the student profile
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          // Look up by either the ID or the user ID
          OR: [
            { id: data.studentId },
            { userId: data.studentId }
          ]
        },
        include: {
          user: true
        }
      });

      // If student profile doesn't exist, check if user exists
      if (!studentProfile) {
        // Check if the user exists but doesn't have a student profile
        const user = await this.prisma.user.findUnique({
          where: { id: data.studentId },
          include: {
            studentProfile: true
          }
        });

        // If user exists but has no student profile, error is different
        if (user && !user.studentProfile) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User exists but has no student profile",
          });
        }

        // Otherwise, student not found
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Use the actual student profile ID for the enrollment
      const studentId = studentProfile.id;

      // Check if class exists
      const classEntity = await this.prisma.class.findUnique({
        where: { id: data.classId },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if enrollment already exists
      // For newly created students, there won't be existing enrollments
      // Only check if the student profile was NOT just created
      const existingEnrollment = studentProfile.createdAt
        && (new Date().getTime() - new Date(studentProfile.createdAt).getTime() > 10000) // If profile is older than 10 seconds
        ? await this.prisma.studentEnrollment.findFirst({
            where: {
              studentId: studentId,
              classId: data.classId,
              status: {
                in: ["ACTIVE" as any, "PENDING" as any],
              },
            },
          })
        : null;

      if (existingEnrollment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is already enrolled in this class",
        });
      }

      // Create the enrollment
      const enrollment = await this.prisma.studentEnrollment.create({
        data: {
          student: {
            connect: { id: studentId },
          },
          class: {
            connect: { id: data.classId },
          },
          startDate: data.startDate || new Date(),
          status: "ACTIVE" as any,
          createdBy: {
            connect: { id: data.createdById },
          },
          updatedBy: {
            connect: { id: data.createdById },
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return {
        success: true,
        enrollment,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create enrollment",
        cause: error,
      });
    }
  }

  /**
   * Gets an enrollment by ID
   * @param id Enrollment ID
   * @returns Enrollment
   */
  async getEnrollment(id: string) {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Valid enrollment ID is required",
        });
      }

      const enrollment = await this.prisma.studentEnrollment.findUnique({
        where: { id },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              code: true,
              programCampusId: true,
              term: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
              programCampus: {
                select: {
                  id: true,
                  program: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              courseCampus: {
                select: {
                  id: true,
                  programCampusId: true,
                  course: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Enrollment with ID ${id} not found`,
        });
      }

      return {
        success: true,
        enrollment,
      };
    } catch (error) {
      console.error('Error fetching enrollment:', error);

      if (error instanceof TRPCError) throw error;

      // Handle specific database errors
      if (error.code === 'P2025') {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get enrollment: ${error.message || 'Unknown error'}`,
        cause: error,
      });
    }
  }

  /**
   * Updates an enrollment
   * @param data Enrollment update data
   * @param updatedById ID of the user making the update
   * @returns Updated enrollment
   */
  async updateEnrollment(data: z.infer<typeof updateEnrollmentSchema>, updatedById: string) {
    try {
      // Check if enrollment exists
      const existingEnrollment = await this.prisma.studentEnrollment.findUnique({
        where: { id: data.id },
      });

      if (!existingEnrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      // Update the enrollment
      const enrollment = await this.prisma.studentEnrollment.update({
        where: { id: data.id },
        data: {
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status as any,
          updatedBy: {
            connect: { id: updatedById },
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return {
        success: true,
        enrollment,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update enrollment",
        cause: error,
      });
    }
  }

  /**
   * Deletes an enrollment (soft delete)
   * @param id Enrollment ID
   * @param updatedById ID of the user making the deletion
   * @returns Success status
   */
  async deleteEnrollment(id: string, updatedById: string) {
    try {
      // Check if enrollment exists
      const existingEnrollment = await this.prisma.studentEnrollment.findUnique({
        where: { id },
      });

      if (!existingEnrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      // Soft delete the enrollment
      await this.prisma.studentEnrollment.update({
        where: { id },
        data: {
          status: EnrollmentStatus.INACTIVE,
          updatedBy: {
            connect: { id: updatedById },
          },
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete enrollment",
        cause: error,
      });
    }
  }

  /**
   * Gets enrollments by class ID
   * @param classId Class ID
   * @returns Enrollments
   */
  async getEnrollmentsByClass(classId: string) {
    try {
      const enrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          classId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          student: {
            include: {
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
        orderBy: {
          student: {
            user: {
              name: "asc",
            },
          },
        },
      });

      return {
        success: true,
        enrollments,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get enrollments by class",
        cause: error,
      });
    }
  }

  /**
   * Gets enrollments by fee structure ID
   * @param feeStructureId Fee structure ID
   * @returns Enrollments using this fee structure
   */
  async getEnrollmentsByFeeStructure(feeStructureId: string) {
    try {
      const enrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          fees: {
            some: {
              feeStructureId: feeStructureId,
            },
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          class: {
            include: {
              campus: true,
              programCampus: {
                include: {
                  program: true,
                },
              },
            },
          },
          fees: true,
        },
        orderBy: {
          student: {
            user: {
              name: 'asc',
            },
          },
        },
      });

      return enrollments.map((enrollment) => ({
        id: enrollment.id,
        studentId: enrollment.studentId,
        studentName: enrollment.student.user.name,
        studentEmail: enrollment.student.user.email,
        classId: enrollment.classId,
        className: enrollment.class.name,
        campusId: enrollment.class.campusId,
        campusName: enrollment.class.campus.name,
        programId: enrollment.class.programCampus?.programId,
        programName: enrollment.class.programCampus?.program.name,
        status: enrollment.status,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate,
        hasFee: enrollment.fees && enrollment.fees.length > 0,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get enrollments by fee structure",
        cause: error,
      });
    }
  }

  /**
   * Gets enrollments by student ID
   * @param studentId Student ID
   * @returns Enrollments
   */
  async getEnrollmentsByStudent(studentId: string) {
    try {
      const enrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          studentId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              code: true,
              term: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
              courseCampus: {
                select: {
                  id: true,
                  course: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          class: {
            name: "asc",
          },
        },
      });

      return {
        success: true,
        enrollments,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get enrollments by student",
        cause: error,
      });
    }
  }

  /**
   * Bulk import enrollments with student creation (optimized with batch processing)
   * @param data Import enrollment data
   * @returns Import results
   */
  async bulkImportEnrollments(data: {
    enrollments: Array<{
      studentEmail: string;
      studentFirstName?: string;
      studentLastName?: string;
      studentEnrollmentNumber?: string;
      studentPhone?: string;
      campusCode: string;
      programCode?: string;
      courseCode?: string;
      className: string;
      startDate: string;
      endDate?: string;
      status?: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'WITHDRAWN' | 'INACTIVE';
      notes?: string;
    }>;
    defaultCampusId?: string;
    createdById: string;
  }) {
    const results = {
      total: data.enrollments.length,
      successful: 0,
      failed: 0,
      existingStudents: 0,
      newStudents: 0,
      errors: [] as string[],
      details: [] as Array<{
        row: number;
        email: string;
        status: 'success' | 'failed' | 'warning';
        message: string;
        isNewStudent?: boolean;
      }>
    };

    try {
      // Get all campuses for code lookup
      const campuses = await this.prisma.campus.findMany({
        select: { id: true, code: true, name: true }
      });
      const campusMap = new Map(campuses.map(c => [c.code, c]));

      // Get all existing students by email for batch lookup
      const studentEmails = data.enrollments.map(e => e.studentEmail);
      const existingStudents = await this.prisma.studentProfile.findMany({
        where: {
          user: {
            email: { in: studentEmails },
            status: { not: 'DELETED' }
          }
        },
        include: {
          user: true
        }
      });
      const studentMap = new Map(
        existingStudents
          .filter(s => s.user.email !== null)
          .map(s => [s.user.email!, s])
      );

      // Process in batches to avoid timeout
      const BATCH_SIZE = 50;
      const batches: typeof data.enrollments[] = [];
      for (let i = 0; i < data.enrollments.length; i += BATCH_SIZE) {
        batches.push(data.enrollments.slice(i, i + BATCH_SIZE));
      }

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchStartIndex = batchIndex * BATCH_SIZE;

        await this.processBatch(batch, batchStartIndex, campusMap, studentMap, data.createdById, results);
      }

      return results;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to import enrollments",
        cause: error,
      });
    }
  }

  /**
   * Process a batch of enrollment records
   */
  private async processBatch(
    batch: Array<{
      studentEmail: string;
      studentFirstName?: string;
      studentLastName?: string;
      studentEnrollmentNumber?: string;
      studentPhone?: string;
      campusCode: string;
      programCode?: string;
      courseCode?: string;
      className: string;
      startDate: string;
      endDate?: string;
      status?: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'WITHDRAWN' | 'INACTIVE';
      notes?: string;
    }>,
    batchStartIndex: number,
    campusMap: Map<string, { id: string; code: string; name: string }>,
    studentMap: Map<string, any>,
    createdById: string,
    results: any
  ) {
    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      const rowNumber = batchStartIndex + i + 1;

      try {
        // Find campus by code
        const campus = campusMap.get(record.campusCode);
        if (!campus) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Campus with code '${record.campusCode}' not found`);
          results.details.push({
            row: rowNumber,
            email: record.studentEmail,
            status: 'failed',
            message: `Campus with code '${record.campusCode}' not found`
          });
          continue;
        }

        // Find class by name and campus
        const classEntity = await this.prisma.class.findFirst({
          where: {
            name: record.className,
            campusId: campus.id,
            status: 'ACTIVE'
          },
          include: {
            courseCampus: {
              include: {
                programCampus: {
                  include: {
                    program: true
                  }
                }
              }
            }
          }
        });

        if (!classEntity) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Class '${record.className}' not found in campus '${campus.name}'`);
          results.details.push({
            row: rowNumber,
            email: record.studentEmail,
            status: 'failed',
            message: `Class '${record.className}' not found in campus '${campus.name}'`
          });
          continue;
        }

        // Check if student exists
        let student = studentMap.get(record.studentEmail);
        let isNewStudent = false;

        // Create student if doesn't exist
        if (!student) {
          isNewStudent = true;

          // Generate student name from email if not provided
          const firstName = record.studentFirstName || record.studentEmail.split('@')[0];
          const lastName = record.studentLastName || '';
          const fullName = `${firstName} ${lastName}`.trim();

          // Generate username from email
          const username = record.studentEmail.split('@')[0].toLowerCase();

          // Get campus with institution info
          const campusWithInstitution = await this.prisma.campus.findUnique({
            where: { id: campus.id },
            include: { institution: true }
          });

          // Create user first
          const user = await this.prisma.user.create({
            data: {
              name: fullName,
              email: record.studentEmail,
              username,
              phoneNumber: record.studentPhone,
              userType: 'CAMPUS_STUDENT',
              status: 'ACTIVE',
              accessScope: 'SINGLE_CAMPUS',
              primaryCampusId: campus.id,
              institution: {
                connect: { id: campusWithInstitution?.institutionId || 'default' }
              }
            }
          });

          // Generate enrollment number
          const enrollmentNumber = record.studentEnrollmentNumber ||
            await this.generateEnrollmentNumber(campus.id);

          // Create student profile
          student = await this.prisma.studentProfile.create({
            data: {
              userId: user.id,
              enrollmentNumber,
              interests: [],
              achievements: [],
            },
            include: {
              user: true
            }
          });

          // Add to student map for future lookups
          studentMap.set(record.studentEmail, student);
          results.newStudents++;
        } else {
          results.existingStudents++;
        }

        // Check if already enrolled in this class
        const existingEnrollment = await this.prisma.studentEnrollment.findFirst({
          where: {
            studentId: student.id,
            classId: classEntity.id,
            status: { not: EnrollmentStatus.INACTIVE }
          }
        });

        if (existingEnrollment) {
          results.details.push({
            row: rowNumber,
            email: record.studentEmail,
            status: 'warning',
            message: `Student already enrolled in class '${record.className}'`,
            isNewStudent
          });
          continue;
        }

        // Create enrollment
        await this.prisma.studentEnrollment.create({
          data: {
            studentId: student.id,
            classId: classEntity.id,
            startDate: new Date(record.startDate),
            endDate: record.endDate ? new Date(record.endDate) : undefined,
            status: (record.status as any) || EnrollmentStatus.ACTIVE,
            createdById: createdById,
            updatedById: createdById,
          }
        });

        results.successful++;
        results.details.push({
          row: rowNumber,
          email: record.studentEmail,
          status: 'success',
          message: `Successfully enrolled ${isNewStudent ? 'new' : 'existing'} student in '${record.className}'`,
          isNewStudent
        });

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Row ${rowNumber}: ${errorMessage}`);
        results.details.push({
          row: rowNumber,
          email: record.studentEmail,
          status: 'failed',
          message: errorMessage
        });
      }
    }
  }

  /**
   * Generate enrollment number for a campus
   */
  private async generateEnrollmentNumber(campusId: string): Promise<string> {
    const campus = await this.prisma.campus.findUnique({
      where: { id: campusId },
      select: { code: true, institutionId: true }
    });

    if (!campus) {
      throw new Error('Campus not found');
    }

    // Get the latest enrollment number by finding students through user campus relationship
    const latestStudent = await this.prisma.studentProfile.findFirst({
      where: {
        user: {
          primaryCampusId: campusId
        }
      },
      orderBy: { enrollmentNumber: 'desc' },
      select: { enrollmentNumber: true }
    });

    // Generate new enrollment number
    const year = new Date().getFullYear().toString().slice(-2);
    const campusCode = campus.code.toUpperCase();

    let sequence = 1;
    if (latestStudent?.enrollmentNumber) {
      // Extract sequence number from existing enrollment number
      const match = latestStudent.enrollmentNumber.match(/(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${year}${campusCode}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Creates multiple enrollments in bulk
   * @param data Bulk enrollment data
   * @returns Created enrollments
   */
  async bulkEnroll(data: z.infer<typeof bulkEnrollmentSchema>) {
    try {
      // Check if class exists
      const classEntity = await this.prisma.class.findUnique({
        where: { id: data.classId },
      });

      if (!classEntity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Class not found",
        });
      }

      // Check if all students exist
      const students = await this.prisma.studentProfile.findMany({
        where: {
          id: {
            in: data.studentIds,
          },
        },
      });

      if (students.length !== data.studentIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more students not found",
        });
      }

      // Check for existing enrollments
      const existingEnrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          studentId: {
            in: data.studentIds,
          },
          classId: data.classId,
          status: {
            in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.INACTIVE],
          },
        },
      });

      // Filter out students who are already enrolled
      const alreadyEnrolledStudentIds = existingEnrollments.map((e) => e.studentId);
      const studentsToEnroll = data.studentIds.filter(
        (id) => !alreadyEnrolledStudentIds.includes(id)
      );

      if (studentsToEnroll.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All students are already enrolled in this class",
        });
      }

      // Create enrollments for remaining students
      const enrollments = await Promise.all(
        studentsToEnroll.map((studentId) =>
          this.prisma.studentEnrollment.create({
            data: {
              student: {
                connect: { id: studentId },
              },
              class: {
                connect: { id: data.classId },
              },
              startDate: data.startDate || new Date(),
              status: "ACTIVE" as any,
              createdBy: {
                connect: { id: data.createdById },
              },
              updatedBy: {
                connect: { id: data.createdById },
              },
            },
          })
        )
      );

      return {
        success: true,
        enrollments,
        totalEnrolled: enrollments.length,
        alreadyEnrolled: alreadyEnrolledStudentIds.length,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to bulk enroll students",
        cause: error,
      });
    }
  }

  /**
   * Transfers a student from one class to another within the same campus
   * @param data Transfer data
   * @returns Success status and new enrollment
   */
  async transferStudentToClass(data: z.infer<typeof transferStudentClassSchema>) {
    try {
      // Check if student exists
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: data.studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Check if source class exists
      const sourceClass = await this.prisma.class.findUnique({
        where: { id: data.fromClassId },
        include: {
          campus: true,
        },
      });

      if (!sourceClass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source class not found",
        });
      }

      // Check if target class exists
      const targetClass = await this.prisma.class.findUnique({
        where: { id: data.toClassId },
        include: {
          campus: true,
        },
      });

      if (!targetClass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target class not found",
        });
      }

      // Ensure both classes are in the same campus
      if (sourceClass.campusId !== targetClass.campusId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot transfer between different campuses using this method. Use transferStudentToCampus instead.",
        });
      }

      // Check if student is enrolled in source class
      const sourceEnrollment = await this.prisma.studentEnrollment.findFirst({
        where: {
          studentId: data.studentId,
          classId: data.fromClassId,
          status: EnrollmentStatus.ACTIVE,
        },
      });

      if (!sourceEnrollment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is not actively enrolled in the source class",
        });
      }

      // Check if student is already enrolled in target class
      const existingTargetEnrollment = await this.prisma.studentEnrollment.findFirst({
        where: {
          studentId: data.studentId,
          classId: data.toClassId,
          status: {
            in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.INACTIVE],
          },
        },
      });

      if (existingTargetEnrollment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is already enrolled in the target class",
        });
      }

      // Check target class capacity
      if (targetClass.currentCount >= targetClass.maxCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target class is at maximum capacity",
        });
      }

      // Create a transaction to handle the transfer
      const transferDate = data.transferDate || new Date();
      const historyService = new EnrollmentHistoryService();

      // Perform the transfer in a transaction
      const [updatedSourceEnrollment, newTargetEnrollment] = await this.prisma.$transaction(async (tx) => {
        // 1. Update the source enrollment (mark as inactive)
        const updatedSource = await tx.studentEnrollment.update({
          where: { id: sourceEnrollment.id },
          data: {
            status: EnrollmentStatus.INACTIVE,
            endDate: transferDate,
            updatedBy: {
              connect: { id: data.transferById },
            },
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        // 2. Create a new enrollment in the target class
        const newTarget = await tx.studentEnrollment.create({
          data: {
            student: {
              connect: { id: data.studentId },
            },
            class: {
              connect: { id: data.toClassId },
            },
            startDate: transferDate,
            status: EnrollmentStatus.ACTIVE,
            createdBy: {
              connect: { id: data.transferById },
            },
            updatedBy: {
              connect: { id: data.transferById },
            },
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        // 3. Update class counts
        await tx.class.update({
          where: { id: data.fromClassId },
          data: {
            currentCount: {
              decrement: 1,
            },
          },
        });

        await tx.class.update({
          where: { id: data.toClassId },
          data: {
            currentCount: {
              increment: 1,
            },
          },
        });

        return [updatedSource, newTarget];
      });

      // Create history entries for the transfer
      await historyService.createHistoryEntry({
        enrollmentId: sourceEnrollment.id,
        action: "TRANSFERRED_OUT",
        details: {
          fromClassId: data.fromClassId,
          fromClassName: sourceClass.name,
          toClassId: data.toClassId,
          toClassName: targetClass.name,
          transferDate: transferDate.toISOString(),
          reason: data.reason || "Class transfer",
        },
        createdById: data.transferById,
      });

      await historyService.createHistoryEntry({
        enrollmentId: newTargetEnrollment.id,
        action: "TRANSFERRED_IN",
        details: {
          fromClassId: data.fromClassId,
          fromClassName: sourceClass.name,
          toClassId: data.toClassId,
          toClassName: targetClass.name,
          transferDate: transferDate.toISOString(),
          reason: data.reason || "Class transfer",
        },
        createdById: data.transferById,
      });

      return {
        success: true,
        previousEnrollment: updatedSourceEnrollment,
        newEnrollment: newTargetEnrollment,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to transfer student to new class",
        cause: error,
      });
    }
  }

  /**
   * Transfers a student from one campus to another
   * @param data Transfer data
   * @returns Success status and new enrollment
   */
  async transferStudentToCampus(data: z.infer<typeof transferStudentCampusSchema>) {
    try {
      // Check if student exists
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: data.studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              activeCampuses: true,
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Check if source campus exists
      const sourceCampus = await this.prisma.campus.findUnique({
        where: { id: data.fromCampusId },
      });

      if (!sourceCampus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source campus not found",
        });
      }

      // Check if target campus exists
      const targetCampus = await this.prisma.campus.findUnique({
        where: { id: data.toCampusId },
      });

      if (!targetCampus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target campus not found",
        });
      }

      // Find active enrollments in the source campus
      const sourceEnrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          studentId: data.studentId,
          status: EnrollmentStatus.ACTIVE,
          class: {
            campusId: data.fromCampusId,
          },
        },
        include: {
          class: true,
        },
      });

      if (sourceEnrollments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student has no active enrollments in the source campus",
        });
      }

      // If toClassId is not provided, we need to find a suitable class in the target campus
      let targetClassId = data.toClassId;
      let targetClass: { id: string; name: string; campusId: string; programCampusId?: string | null; maxCapacity: number; currentCount: number } | null = null;

      if (!targetClassId) {
        // Find a suitable class in the target campus based on the first source enrollment
        // This is a simplified approach - in a real system, you might want more sophisticated matching
        const sourceClass = sourceEnrollments[0].class;

        targetClass = await this.prisma.class.findFirst({
          where: {
            campusId: data.toCampusId,
            status: SystemStatus.ACTIVE,
            currentCount: {
              lt: this.prisma.class.fields.maxCapacity,
            },
            // Try to match by program if possible
            programCampusId: sourceClass.programCampusId,
          },
        });

        if (!targetClass) {
          // If no matching program class is found, just find any available class
          targetClass = await this.prisma.class.findFirst({
            where: {
              campusId: data.toCampusId,
              status: SystemStatus.ACTIVE,
              currentCount: {
                lt: this.prisma.class.fields.maxCapacity,
              },
            },
          });
        }

        if (!targetClass) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No suitable class found in the target campus. Please specify a target class.",
          });
        }

        targetClassId = targetClass.id;
      } else {
        // Verify the specified target class
        targetClass = await this.prisma.class.findUnique({
          where: { id: targetClassId },
        });

        if (!targetClass) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target class not found",
          });
        }

        if (targetClass.campusId !== data.toCampusId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Target class does not belong to the target campus",
          });
        }

        if (targetClass.currentCount >= targetClass.maxCapacity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Target class is at maximum capacity",
          });
        }
      }

      // Check if student already has access to the target campus
      const hasTargetCampusAccess = student.user.activeCampuses.some(
        (access) => access.campusId === data.toCampusId && access.status === SystemStatus.ACTIVE
      );

      const transferDate = data.transferDate || new Date();
      const historyService = new EnrollmentHistoryService();

      // Perform the transfer in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Update all source enrollments (mark as inactive)
        const updatedSourceEnrollments = await Promise.all(
          sourceEnrollments.map((enrollment) =>
            tx.studentEnrollment.update({
              where: { id: enrollment.id },
              data: {
                status: EnrollmentStatus.INACTIVE,
                endDate: transferDate,
                updatedBy: {
                  connect: { id: data.transferById },
                },
              },
              include: {
                class: true,
              },
            })
          )
        );

        // 2. Create a new enrollment in the target class
        const newTargetEnrollment = await tx.studentEnrollment.create({
          data: {
            student: {
              connect: { id: data.studentId },
            },
            class: {
              connect: { id: targetClassId },
            },
            startDate: transferDate,
            status: EnrollmentStatus.ACTIVE,
            createdBy: {
              connect: { id: data.transferById },
            },
            updatedBy: {
              connect: { id: data.transferById },
            },
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                code: true,
                campus: true,
              },
            },
          },
        });

        // 3. Update class counts
        for (const enrollment of sourceEnrollments) {
          await tx.class.update({
            where: { id: enrollment.classId },
            data: {
              currentCount: {
                decrement: 1,
              },
            },
          });
        }

        await tx.class.update({
          where: { id: targetClassId },
          data: {
            currentCount: {
              increment: 1,
            },
          },
        });

        // 4. If student doesn't have access to target campus, grant it
        if (!hasTargetCampusAccess) {
          await tx.userCampusAccess.create({
            data: {
              user: {
                connect: { id: student.userId },
              },
              campus: {
                connect: { id: data.toCampusId },
              },
              roleType: 'CAMPUS_STUDENT',
              status: SystemStatus.ACTIVE,
            },
          });
        }

        return {
          updatedSourceEnrollments,
          newTargetEnrollment,
        };
      });

      // Create history entries for the transfer
      for (const sourceEnrollment of result.updatedSourceEnrollments) {
        await historyService.createHistoryEntry({
          enrollmentId: sourceEnrollment.id,
          action: "CAMPUS_TRANSFERRED_OUT",
          details: {
            fromCampusId: data.fromCampusId,
            fromCampusName: sourceCampus.name,
            fromClassId: sourceEnrollment.classId,
            fromClassName: sourceEnrollment.class.name,
            toCampusId: data.toCampusId,
            toCampusName: targetCampus.name,
            toClassId: targetClassId,
            toClassName: targetClass.name,
            transferDate: transferDate.toISOString(),
            reason: data.reason || "Campus transfer",
          },
          createdById: data.transferById,
        });
      }

      await historyService.createHistoryEntry({
        enrollmentId: result.newTargetEnrollment.id,
        action: "CAMPUS_TRANSFERRED_IN",
        details: {
          fromCampusId: data.fromCampusId,
          fromCampusName: sourceCampus.name,
          toCampusId: data.toCampusId,
          toCampusName: targetCampus.name,
          toClassId: targetClassId,
          toClassName: targetClass.name,
          transferDate: transferDate.toISOString(),
          reason: data.reason || "Campus transfer",
        },
        createdById: data.transferById,
      });

      return {
        success: true,
        previousEnrollments: result.updatedSourceEnrollments,
        newEnrollment: result.newTargetEnrollment,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to transfer student to new campus",
        cause: error,
      });
    }
  }
}