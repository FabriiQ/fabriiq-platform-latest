import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

interface RecurringFeeComponent {
  name: string;
  type: string;
  amount: number;
  description?: string;
  isRecurring: boolean;
  recurringInterval?: string;
}

interface FeeStructureWithComponents {
  id: string;
  name: string;
  feeComponents: RecurringFeeComponent[];
  isRecurring: boolean;
  recurringInterval?: string;
  programCampusId: string;
}

export class RecurringFeeProcessingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Process enrollment for initial fee assignment
   * Separates one-time and recurring components
   */
  async processEnrollmentFees(
    enrollmentId: string,
    feeStructureId: string,
    createdById: string
  ) {
    try {
      // Get fee structure with components
      const feeStructure = await this.prisma.feeStructure.findUnique({
        where: { id: feeStructureId },
      });

      if (!feeStructure) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fee structure not found",
        });
      }

      const components = (feeStructure.feeComponents as unknown) as RecurringFeeComponent[];
      
      // Separate one-time and recurring components
      const oneTimeComponents = components.filter(c => !c.isRecurring);
      const recurringComponents = components.filter(c => c.isRecurring);

      // Create initial enrollment fee with one-time components
      if (oneTimeComponents.length > 0) {
        const oneTimeAmount = oneTimeComponents.reduce((sum, c) => sum + c.amount, 0);
        
        await this.prisma.enrollmentFee.create({
          data: {
            enrollmentId,
            feeStructureId,
            baseAmount: oneTimeAmount,
            discountedAmount: oneTimeAmount,
            finalAmount: oneTimeAmount,
            paymentStatus: 'PENDING',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: `Initial fees: ${oneTimeComponents.map(c => c.name).join(', ')}`,
            createdById,
          },
        });
      }

      // Create first recurring fee if there are recurring components
      if (recurringComponents.length > 0) {
        const recurringAmount = recurringComponents.reduce((sum, c) => sum + c.amount, 0);
        
        await this.prisma.enrollmentFee.create({
          data: {
            enrollmentId,
            feeStructureId,
            baseAmount: recurringAmount,
            discountedAmount: recurringAmount,
            finalAmount: recurringAmount,
            paymentStatus: 'PENDING',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: `Recurring fees: ${recurringComponents.map(c => c.name).join(', ')}`,
            createdById,
          },
        });
      }

      return {
        oneTimeAmount: oneTimeComponents.reduce((sum, c) => sum + c.amount, 0),
        recurringAmount: recurringComponents.reduce((sum, c) => sum + c.amount, 0),
        oneTimeComponents: oneTimeComponents.length,
        recurringComponents: recurringComponents.length,
      };

    } catch (error) {
      console.error('Error processing enrollment fees:', error);
      throw error;
    }
  }

  /**
   * Generate next recurring fees for active enrollments
   * This should be called by cron job
   */
  async generateRecurringFees(dryRun: boolean = true) {
    try {
      const results = {
        processed: 0,
        created: 0,
        errors: [] as string[],
        dryRun,
      };

      // Get all active enrollments with recurring fee structures
      const activeEnrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          fees: {
            include: {
              feeStructure: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      for (const enrollment of activeEnrollments) {
        try {
          results.processed++;

          // Get the most recent fee structure for this enrollment
          const latestFee = enrollment.fees[0];
          if (!latestFee || !latestFee.feeStructure.isRecurring) {
            continue;
          }

          const feeStructure = latestFee.feeStructure;
          const components = (feeStructure.feeComponents as unknown) as RecurringFeeComponent[];
          const recurringComponents = components.filter(c => c.isRecurring);

          if (recurringComponents.length === 0) {
            continue;
          }

          // Check if we need to generate a new recurring fee
          const shouldGenerate = await this.shouldGenerateRecurringFee(
            enrollment.id,
            feeStructure.recurringInterval || 'MONTHLY'
          );

          if (shouldGenerate) {
            if (!dryRun) {
              const recurringAmount = recurringComponents.reduce((sum, c) => sum + c.amount, 0);
              
              await this.prisma.enrollmentFee.create({
                data: {
                  enrollmentId: enrollment.id,
                  feeStructureId: feeStructure.id,
                  baseAmount: recurringAmount,
                  discountedAmount: recurringAmount,
                  finalAmount: recurringAmount,
                  paymentStatus: 'PENDING',
                  dueDate: this.calculateNextDueDate(feeStructure.recurringInterval || 'MONTHLY'),
                  notes: `Auto-generated recurring fees: ${recurringComponents.map(c => c.name).join(', ')}`,
                  createdById: feeStructure.createdById,
                },
              });
            }
            results.created++;
          }

        } catch (error) {
          results.errors.push(`Enrollment ${enrollment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;

    } catch (error) {
      console.error('Error generating recurring fees:', error);
      throw error;
    }
  }

  /**
   * Check if a new recurring fee should be generated
   */
  private async shouldGenerateRecurringFee(
    enrollmentId: string,
    interval: string
  ): Promise<boolean> {
    // Get the most recent recurring fee for this enrollment
    const latestRecurringFee = await this.prisma.enrollmentFee.findFirst({
      where: {
        enrollmentId,
        notes: {
          contains: 'recurring fees',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestRecurringFee) {
      return true; // No recurring fee exists, should generate
    }

    // Calculate when the next fee should be generated based on interval
    const nextGenerationDate = this.calculateNextGenerationDate(
      latestRecurringFee.createdAt,
      interval
    );

    return new Date() >= nextGenerationDate;
  }

  /**
   * Calculate when the next recurring fee should be generated
   */
  private calculateNextGenerationDate(lastFeeDate: Date, interval: string): Date {
    const nextDate = new Date(lastFeeDate);

    switch (interval) {
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'SEMESTER':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'ANNUAL':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1); // Default to monthly
    }

    return nextDate;
  }

  /**
   * Calculate due date for new recurring fee
   */
  private calculateNextDueDate(interval: string): Date {
    const dueDate = new Date();

    switch (interval) {
      case 'MONTHLY':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'QUARTERLY':
        dueDate.setDate(dueDate.getDate() + 90);
        break;
      case 'SEMESTER':
        dueDate.setDate(dueDate.getDate() + 180);
        break;
      case 'ANNUAL':
        dueDate.setDate(dueDate.getDate() + 365);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30); // Default to 30 days
    }

    return dueDate;
  }

  /**
   * Get fee breakdown for an enrollment showing one-time vs recurring
   */
  async getFeeBreakdown(enrollmentId: string) {
    const enrollmentFees = await this.prisma.enrollmentFee.findMany({
      where: { enrollmentId },
      include: {
        feeStructure: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const breakdown = {
      oneTimeFees: [] as any[],
      recurringFees: [] as any[],
      totalOneTime: 0,
      totalRecurring: 0,
    };

    for (const fee of enrollmentFees) {
      const isRecurring = fee.notes?.includes('recurring fees') || false;
      
      if (isRecurring) {
        breakdown.recurringFees.push(fee);
        breakdown.totalRecurring += fee.finalAmount;
      } else {
        breakdown.oneTimeFees.push(fee);
        breakdown.totalOneTime += fee.finalAmount;
      }
    }

    return breakdown;
  }
}
