import { prisma } from "@/server/db";
import { handleError } from "../utils/error-handler";
import { z } from "zod";

// Input schemas
export const createDiscountTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  discountValue: z.number().positive(),
  isPercentage: z.boolean().default(true),
  maxAmount: z.number().positive().optional(),
  applicableFor: z.array(z.string()),
  createdById: z.string(),
});

export const updateDiscountTypeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  discountValue: z.number().positive().optional(),
  isPercentage: z.boolean().optional(),
  maxAmount: z.number().positive().optional(),
  applicableFor: z.array(z.string()).optional(),
  updatedById: z.string(),
});

// Types
export type CreateDiscountTypeInput = z.infer<typeof createDiscountTypeSchema>;
export type UpdateDiscountTypeInput = z.infer<typeof updateDiscountTypeSchema>;

export class DiscountService {
  private prisma: typeof prisma;

  constructor(config?: { prisma?: typeof prisma }) {
    this.prisma = config?.prisma || prisma;
  }

  async createDiscountType(input: CreateDiscountTypeInput) {
    const { createdById, ...restData } = input;

    console.log('DEBUG DiscountService.createDiscountType input snapshot:', {
      hasCreatedById: Boolean(createdById),
      name: restData?.name,
      discountValue: restData?.discountValue,
    });

    // Ensure name and discountValue are provided (required fields)
    if (!restData.name) {
      throw new Error('Discount type name is required');
    }

    if (restData.discountValue === undefined) {
      throw new Error('Discount value is required');
    }

    // Extract required fields to ensure they're treated as required
    const { name, discountValue, applicableFor, ...otherData } = restData;

    try {
      const result = await this.prisma.discountType.create({
        data: {
          name,
          discountValue,
          applicableFor,
          ...otherData,
          createdBy: {
            connect: { id: createdById }
          }
        },
      });
      console.log('SUCCESS DiscountService.createDiscountType created id:', result.id);
      return result;
    } catch (error) {
      console.error('ERROR DiscountService.createDiscountType failed:', error);
      handleError(error, "Failed to create discount type");
    }
  }

  async getDiscountType(id: string) {
    return this.prisma.discountType.findUnique({
      where: { id },
    });
  }

  async getAllDiscountTypes() {
    return this.prisma.discountType.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        discountValue: true,
        isPercentage: true,
        maxAmount: true,
        applicableFor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async getDiscountTypesByApplicability(applicableFor: string) {
    return this.prisma.discountType.findMany({
      where: {
        status: "ACTIVE",
        applicableFor: {
          has: applicableFor,
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async updateDiscountType(input: UpdateDiscountTypeInput) {
    const { id, ...data } = input;

    return this.prisma.discountType.update({
      where: { id },
      data,
    });
  }

  async deleteDiscountType(id: string) {
    return this.prisma.discountType.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  async checkSiblingDiscountEligibility(studentId: string) {
    // This is a placeholder for the actual implementation
    // In a real implementation, you would:
    // 1. Get the student's family information
    // 2. Check if there are other active enrollments from the same family
    // 3. Return eligibility information

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _studentId = studentId; // Mark as used to avoid linting warnings

    // For now, we'll just return a mock response
    return {
      eligible: true,
      siblingCount: 2,
      eligibleDiscounts: [
        {
          id: "discount-type-1",
          name: "Sibling Discount (2 siblings)",
          discountValue: 10,
          isPercentage: true,
        },
      ],
    };
  }

  async checkMeritDiscountEligibility(studentId: string) {
    // This is a placeholder for the actual implementation
    // In a real implementation, you would:
    // 1. Get the student's academic records
    // 2. Check if they meet the criteria for merit discounts
    // 3. Return eligibility information

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _studentId = studentId; // Mark as used to avoid linting warnings

    // For now, we'll just return a mock response
    return {
      eligible: true,
      averageGrade: 90,
      eligibleDiscounts: [
        {
          id: "discount-type-2",
          name: "Merit Scholarship (90%+ average)",
          discountValue: 20,
          isPercentage: true,
        },
      ],
    };
  }

  async checkStaffDiscountEligibility(studentId: string) {
    // This is a placeholder for the actual implementation
    // In a real implementation, you would:
    // 1. Get the student's family information
    // 2. Check if any family member is a staff member
    // 3. Return eligibility information

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _studentId = studentId; // Mark as used to avoid linting warnings

    // For now, we'll just return a mock response
    return {
      eligible: false,
      staffRelation: null,
      eligibleDiscounts: [],
    };
  }
}
