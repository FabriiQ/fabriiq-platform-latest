import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { FeeService } from './fee.service';

/**
 * Enhanced service for managing multiple fee assignments per enrollment
 */
export class MultipleFeeAssignmentService {
  private feeService: FeeService;

  constructor(private prisma: PrismaClient) {
    this.feeService = new FeeService({ prisma });
  }

  /**
   * Assign multiple fee structures to an enrollment
   */
  async assignMultipleFees(input: {
    enrollmentId: string;
    feeAssignments: Array<{
      feeStructureId: string;
      dueDate?: Date;
      notes?: string;
      discounts?: Array<{
        discountTypeId: string;
        amount: number;
      }>;
    }>;
    createdById: string;
  }) {
    const { enrollmentId, feeAssignments, createdById } = input;

    // Validate enrollment exists
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { include: { user: true } },
        programCampus: { include: { program: true, campus: true } }
      }
    });

    if (!enrollment) {
      throw new Error(`Enrollment with ID ${enrollmentId} not found`);
    }

    const results = [];
    const errors = [];

    // Process each fee assignment
    for (const assignment of feeAssignments) {
      try {
        // Check if this fee structure is already assigned
        const existingFee = await this.prisma.enrollmentFee.findFirst({
          where: {
            enrollmentId,
            feeStructureId: assignment.feeStructureId
          }
        });

        if (existingFee) {
          errors.push({
            feeStructureId: assignment.feeStructureId,
            error: 'Fee structure already assigned to this enrollment'
          });
          continue;
        }

        // Get fee structure to calculate base amount
        const feeStructure = await this.prisma.feeStructure.findUnique({
          where: { id: assignment.feeStructureId }
        });

        if (!feeStructure) {
          errors.push({
            feeStructureId: assignment.feeStructureId,
            error: 'Fee structure not found'
          });
          continue;
        }

        // Calculate base amount from fee components
        const feeComponents = feeStructure.feeComponents as any[];
        const baseAmount = feeComponents.reduce((sum, component) => sum + (component.amount || 0), 0);

        // Create enrollment fee
        const enrollmentFee = await this.feeService.assignFeeToEnrollment({
          enrollmentId,
          feeStructureId: assignment.feeStructureId,
          baseAmount,
          dueDate: assignment.dueDate,
          notes: assignment.notes,
          discounts: assignment.discounts || [],
          createdById
        });

        results.push({
          feeStructureId: assignment.feeStructureId,
          enrollmentFeeId: enrollmentFee.id,
          success: true
        });

      } catch (error) {
        errors.push({
          feeStructureId: assignment.feeStructureId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      enrollmentId,
      studentName: enrollment.student.user?.name || 'Unknown',
      programName: enrollment.programCampus.program.name,
      campusName: enrollment.programCampus.campus.name,
      successfulAssignments: results.length,
      totalAssignments: feeAssignments.length,
      results,
      errors
    };
  }

  /**
   * Get all fee assignments for an enrollment with detailed information
   */
  async getEnrollmentFeeAssignments(enrollmentId: string) {
    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: { include: { user: true } },
        programCampus: { include: { program: true, campus: true } },
        fees: {
          include: {
            feeStructure: true,
            discounts: {
              include: { discountType: true }
            },
            additionalCharges: true,
            arrears: true,
            transactions: {
              orderBy: { date: 'desc' },
              take: 5
            },
            challans: {
              orderBy: { createdAt: 'desc' },
              take: 3
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!enrollment) {
      throw new Error(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Calculate summary statistics
    const totalFees = enrollment.fees.length;
    const totalBaseAmount = enrollment.fees.reduce((sum, fee) => sum + fee.baseAmount, 0);
    const totalDiscountedAmount = enrollment.fees.reduce((sum, fee) => sum + fee.discountedAmount, 0);
    const totalFinalAmount = enrollment.fees.reduce((sum, fee) => sum + fee.finalAmount, 0);
    const totalPaidAmount = enrollment.fees.reduce((sum, fee) => {
      return sum + fee.transactions.reduce((txSum, tx) => txSum + tx.amount, 0);
    }, 0);
    const totalOutstanding = totalFinalAmount - totalPaidAmount;

    // Group fees by payment status
    const feesByStatus = {
      PENDING: enrollment.fees.filter(fee => fee.paymentStatus === 'PENDING').length,
      PARTIAL: enrollment.fees.filter(fee => fee.paymentStatus === 'PARTIAL').length,
      PAID: enrollment.fees.filter(fee => fee.paymentStatus === 'PAID').length,
      OVERDUE: enrollment.fees.filter(fee => {
        return fee.dueDate && fee.dueDate < new Date() && fee.paymentStatus !== 'PAID';
      }).length
    };

    return {
      enrollment: {
        id: enrollment.id,
        studentName: enrollment.student.user?.name || 'Unknown',
        studentId: enrollment.student.id,
        programName: enrollment.programCampus.program.name,
        campusName: enrollment.programCampus.campus.name,
        status: enrollment.status
      },
      summary: {
        totalFees,
        totalBaseAmount,
        totalDiscountedAmount,
        totalFinalAmount,
        totalPaidAmount,
        totalOutstanding,
        feesByStatus
      },
      fees: enrollment.fees.map(fee => ({
        id: fee.id,
        feeStructure: {
          id: fee.feeStructure.id,
          name: fee.feeStructure.name,
          description: fee.feeStructure.description,
          components: fee.feeStructure.feeComponents
        },
        amounts: {
          baseAmount: fee.baseAmount,
          discountedAmount: fee.discountedAmount,
          finalAmount: fee.finalAmount,
          paidAmount: fee.transactions.reduce((sum, tx) => sum + tx.amount, 0),
          outstandingAmount: fee.finalAmount - fee.transactions.reduce((sum, tx) => sum + tx.amount, 0)
        },
        paymentStatus: fee.paymentStatus,
        dueDate: fee.dueDate,
        notes: fee.notes,
        discounts: fee.discounts,
        additionalCharges: fee.additionalCharges,
        arrears: fee.arrears,
        recentTransactions: fee.transactions,
        recentChallans: fee.challans,
        createdAt: fee.createdAt,
        updatedAt: fee.updatedAt
      }))
    };
  }

  /**
   * Remove a specific fee assignment from an enrollment
   */
  async removeFeeAssignment(enrollmentFeeId: string, removedById: string) {
    const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id: enrollmentFeeId },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } }
          }
        },
        feeStructure: true,
        transactions: true
      }
    });

    if (!enrollmentFee) {
      throw new Error('Enrollment fee not found');
    }

    // Check if there are any payments made
    if (enrollmentFee.transactions.length > 0) {
      throw new Error('Cannot remove fee assignment with existing payments. Please contact administrator.');
    }

    // Delete the enrollment fee (this will cascade delete related records)
    await this.prisma.enrollmentFee.delete({
      where: { id: enrollmentFeeId }
    });

    return {
      success: true,
      message: `Fee assignment removed successfully`,
      studentName: enrollmentFee.enrollment.student.user?.name || 'Unknown',
      feeStructureName: enrollmentFee.feeStructure.name
    };
  }

  /**
   * Get available fee structures for assignment to an enrollment
   */
  async getAvailableFeeStructures(enrollmentId: string) {
    console.log('DEBUG MultipleFeeAssignmentService.getAvailableFeeStructures:', { enrollmentId });

    const enrollment = await this.prisma.studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true
              }
            },
            courseCampus: {
              include: {
                programCampus: {
                  include: {
                    program: true,
                    campus: true
                  }
                }
              }
            }
          }
        },
        fees: { select: { feeStructureId: true } }
      }
    });

    if (!enrollment) {
      throw new Error(`Enrollment with ID ${enrollmentId} not found`);
    }

    // Get the program campus ID - try direct relationship first, then through courseCampus
    const programCampusId = enrollment.class?.programCampusId || enrollment.class?.courseCampus?.programCampusId;
    const programCampus = enrollment.class?.programCampus || enrollment.class?.courseCampus?.programCampus;

    console.log('DEBUG enrollment structure:', {
      enrollmentId: enrollment.id,
      classId: enrollment.class?.id,
      directProgramCampusId: enrollment.class?.programCampusId,
      courseCampusId: enrollment.class?.courseCampusId,
      courseCampusProgramCampusId: enrollment.class?.courseCampus?.programCampusId,
      finalProgramCampusId: programCampusId,
      programName: programCampus?.program?.name,
      campusName: programCampus?.campus?.name,
      existingFeesCount: enrollment.fees?.length || 0
    });

    if (!programCampusId) {
      console.log('DEBUG: No programCampusId found, returning empty array');
      return [];
    }

    // Get already assigned fee structure IDs
    const assignedFeeStructureIds = enrollment.fees.map(fee => fee.feeStructureId);
    console.log('DEBUG assignedFeeStructureIds:', assignedFeeStructureIds);

    // Get available fee structures for this program-campus combination
    const availableFeeStructures = await this.prisma.feeStructure.findMany({
      where: {
        programCampusId,
        status: 'ACTIVE',
        id: {
          notIn: assignedFeeStructureIds
        }
      },
      include: {
        programCampus: {
          include: {
            program: true,
            campus: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('DEBUG found fee structures:', {
      count: availableFeeStructures.length,
      structures: availableFeeStructures.map(fs => ({
        id: fs.id,
        name: fs.name,
        programCampusId: fs.programCampusId,
        status: fs.status
      }))
    });

    return availableFeeStructures.map(structure => ({
      id: structure.id,
      name: structure.name,
      description: structure.description,
      components: structure.feeComponents,
      baseAmount: (structure.feeComponents as any[]).reduce((sum, comp) => sum + (comp.amount || 0), 0),
      isRecurring: structure.isRecurring,
      recurringInterval: structure.recurringInterval,
      programName: structure.programCampus.program.name,
      campusName: structure.programCampus.campus.name
    }));
  }
}
