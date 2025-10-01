import { prisma } from "@/server/db";
import { z } from "zod";

// Input schemas
export const createChallanTemplateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  design: z.object({}).passthrough(), // Allow any JSON structure for the design
  copies: z.number().int().min(1).default(3),
  institutionId: z.string(),
  createdById: z.string(),
});

export const updateChallanTemplateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  design: z.object({}).passthrough().optional(),
  copies: z.number().int().min(1).optional(),
  updatedById: z.string(),
});

export const generateChallanSchema = z.object({
  enrollmentFeeId: z.string(),
  templateId: z.string(),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  bankDetails: z.object({}).passthrough().optional(),
  createdById: z.string(),
});

export const bulkGenerateChallansSchema = z.object({
  filters: z.object({
    campusId: z.string().optional(),
    programId: z.string().optional(),
    classId: z.string().optional(),
    month: z.number().min(1).max(12).optional(),
    year: z.number().optional(),
    hasPendingFees: z.boolean().optional(),
  }),
  templateId: z.string(),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  bankDetails: z.object({}).passthrough().optional(),
  createdById: z.string(),
});

// Types
export type CreateChallanTemplateInput = z.infer<typeof createChallanTemplateSchema>;
export type UpdateChallanTemplateInput = z.infer<typeof updateChallanTemplateSchema>;
export type GenerateChallanInput = z.infer<typeof generateChallanSchema>;
export type BulkGenerateChallansInput = z.infer<typeof bulkGenerateChallansSchema>;

export class ChallanService {
  private prisma: typeof prisma;

  constructor(config?: { prisma?: typeof prisma }) {
    this.prisma = config?.prisma || prisma;
  }

  /**
   * Get or create default challan template
   */
  private async getOrCreateDefaultTemplate(createdById: string, institutionId: string = 'default-institution') {
    // Try to find existing template (since there's no isDefault field, get the first one)
    let template = await this.prisma.challanTemplate.findFirst({
      where: {
        name: 'Standard Fee Challan',
        institutionId: institutionId,
      },
    });

    if (!template) {
      // Create default template
      template = await this.prisma.challanTemplate.create({
        data: {
          name: 'Standard Fee Challan',
          description: 'Default template for fee challans',
          design: {
            header: {
              institutionName: 'Educational Institution',
              institutionAddress: 'Institution Address',
              logo: null,
            },
            layout: {
              showDiscounts: true,
              showPartialPayments: true,
              showDueDate: true,
              showBankDetails: true,
            },
            footer: {
              instructions: 'Please pay before the due date to avoid late fees.',
              bankInstructions: 'Payment can be made through bank transfer or online payment.',
            },
          },
          copies: 2,
          institutionId: institutionId,
          createdById,
        },
      });
    }

    return template;
  }

  /**
   * Generate unique challan number
   */
  private async generateChallanNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get the count of challans for this month
    const count = await this.prisma.feeChallan.count({
      where: {
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequence = count + 1;
    return `CH-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Generate HTML content for challan printing
   */
  private generateChallanHTML(challan: any): string {
    const student = challan.enrollmentFee.enrollment.student;
    const enrollment = challan.enrollmentFee.enrollment;
    const discounts = challan.enrollmentFee.discounts || [];
    const additionalCharges = challan.enrollmentFee.additionalCharges || [];
    const transactions = challan.enrollmentFee.transactions || [];

    // Calculate payment summary
    const totalPaid = transactions
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0);

    const remainingAmount = parseFloat(challan.totalAmount.toString()) - totalPaid;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Challan - ${challan.challanNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .challan-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .student-info, .fee-details { margin-bottom: 20px; }
          .fee-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .fee-table th, .fee-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .fee-table th { background-color: #f2f2f2; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fee Challan</h1>
          <h2>Educational Institution</h2>
        </div>

        <div class="challan-info">
          <div>
            <strong>Challan No:</strong> ${challan.challanNo}<br>
            <strong>Issue Date:</strong> ${new Date(challan.issueDate).toLocaleDateString()}<br>
            <strong>Due Date:</strong> ${new Date(challan.dueDate).toLocaleDateString()}
          </div>
          <div>
            <strong>Student ID:</strong> ${student.enrollmentNumber || 'N/A'}<br>
            <strong>Student Name:</strong> ${student.user?.name || 'N/A'}<br>
            <strong>Class:</strong> ${enrollment.class?.name || 'N/A'}
          </div>
        </div>

        <div class="fee-details">
          <h3>Fee Details</h3>
          <table class="fee-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base Fee Amount</td>
                <td>Rs. ${parseFloat(challan.enrollmentFee.baseAmount.toString()).toLocaleString()}</td>
              </tr>

              ${discounts.map((discount: any) => `
                <tr style="color: green;">
                  <td>Discount: ${discount.discountType?.name || 'Discount'}</td>
                  <td>- Rs. ${parseFloat(discount.amount.toString()).toLocaleString()}</td>
                </tr>
              `).join('')}

              ${additionalCharges.map((charge: any) => `
                <tr style="color: red;">
                  <td>Additional Charge: ${charge.description || 'Additional Charge'}</td>
                  <td>Rs. ${parseFloat(charge.amount.toString()).toLocaleString()}</td>
                </tr>
              `).join('')}

              <tr class="total-row">
                <td><strong>Total Amount</strong></td>
                <td><strong>Rs. ${parseFloat(challan.totalAmount.toString()).toLocaleString()}</strong></td>
              </tr>

              ${totalPaid > 0 ? `
                <tr style="color: blue;">
                  <td><strong>Amount Paid</strong></td>
                  <td><strong>Rs. ${totalPaid.toLocaleString()}</strong></td>
                </tr>
                <tr class="total-row" style="color: ${remainingAmount > 0 ? 'red' : 'green'};">
                  <td><strong>Remaining Amount</strong></td>
                  <td><strong>Rs. ${remainingAmount.toLocaleString()}</strong></td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        ${transactions.length > 0 ? `
          <div class="fee-details">
            <h3>Payment History</h3>
            <table class="fee-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map((transaction: any) => `
                  <tr>
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>Rs. ${parseFloat(transaction.amount.toString()).toLocaleString()}</td>
                    <td>${transaction.method || 'N/A'}</td>
                    <td>${transaction.reference || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          <p>Please pay before the due date to avoid late fees.</p>
          <p>For any queries, contact the finance office.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <script>
          // Auto-print when page loads
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
  }

  // Challan Template Methods
  async createChallanTemplate(input: CreateChallanTemplateInput) {
    return this.prisma.challanTemplate.create({
      data: input,
    });
  }

  async getChallanTemplate(id: string) {
    return this.prisma.challanTemplate.findUnique({
      where: { id },
    });
  }

  async getChallanTemplatesByInstitution(institutionId: string) {
    return this.prisma.challanTemplate.findMany({
      where: {
        institutionId,
        status: "ACTIVE",
      },
      orderBy: { name: "asc" },
    });
  }

  async getAllChallanTemplates() {
    return this.prisma.challanTemplate.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateChallanTemplate(input: UpdateChallanTemplateInput) {
    const { id, ...data } = input;

    return this.prisma.challanTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteChallanTemplate(id: string) {
    return this.prisma.challanTemplate.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  // Challan Methods
  async generateChallan(input: GenerateChallanInput) {
    const { enrollmentFeeId, templateId, issueDate, dueDate, bankDetails, createdById } = input;

    // Get enrollment fee with related data
    const enrollmentFee = await this.prisma.enrollmentFee.findUnique({
      where: { id: enrollmentFeeId },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            class: {
              include: {
                campus: true,
              },
            },
          },
        },
        feeStructure: true,
        discounts: {
          include: {
            discountType: true,
          },
        },
        additionalCharges: true,
        arrears: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as any; // Type assertion to avoid TypeScript errors

    if (!enrollmentFee) {
      throw new Error("Enrollment fee not found");
    }

    // Get or create default template if none specified
    let template: any = null;
    if (templateId) {
      template = await this.prisma.challanTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error("Challan template not found");
      }
    } else {
      // Use default template or create one
      // Get institution ID from enrollment data
      const institutionId = enrollmentFee.enrollment?.class?.campusId || 'default-institution';
      template = await this.getOrCreateDefaultTemplate(createdById, institutionId);
    }

    if (!template) {
      throw new Error("Failed to get or create challan template");
    }

    // Generate unique challan number
    const challanNo = await this.generateChallanNumber();

    // Calculate total paid amount from transactions
    const totalPaidAmount = enrollmentFee.transactions
      ?.filter((t: any) => t.status === 'COMPLETED' && t.type === 'PAYMENT')
      ?.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Calculate remaining amount
    const remainingAmount = parseFloat(enrollmentFee.finalAmount.toString()) - totalPaidAmount;

    // Prepare comprehensive challan data with discount information
    const challanData = {
      student: {
        id: enrollmentFee.enrollment.student.id,
        name: enrollmentFee.enrollment.student.user?.name || 'N/A',
        email: enrollmentFee.enrollment.student.user?.email || 'N/A',
        enrollmentNumber: enrollmentFee.enrollment.student.enrollmentNumber,
      },
      class: {
        id: enrollmentFee.enrollment.class?.id,
        name: enrollmentFee.enrollment.class?.name || 'N/A',
      },
      enrollment: {
        id: enrollmentFee.enrollment.id,
        startDate: enrollmentFee.enrollment.startDate,
        status: enrollmentFee.enrollment.status,
      },
      feeDetails: {
        baseAmount: parseFloat(enrollmentFee.baseAmount.toString()),
        discountedAmount: parseFloat(enrollmentFee.discountedAmount.toString()),
        finalAmount: parseFloat(enrollmentFee.finalAmount.toString()),
        paidAmount: totalPaidAmount,
        remainingAmount: remainingAmount,
        paymentStatus: enrollmentFee.paymentStatus,
      },
      discounts: enrollmentFee.discounts?.map((discount: any) => ({
        id: discount.id,
        type: discount.discountType?.name || 'N/A',
        amount: parseFloat(discount.amount.toString()),
        percentage: discount.percentage,
        description: discount.discountType?.description || '',
      })) || [],
      additionalCharges: enrollmentFee.additionalCharges?.map((charge: any) => ({
        id: charge.id,
        description: charge.description,
        amount: parseFloat(charge.amount.toString()),
      })) || [],
      arrears: enrollmentFee.arrears?.map((arrear: any) => ({
        id: arrear.id,
        description: arrear.description,
        amount: parseFloat(arrear.amount.toString()),
        dueDate: arrear.dueDate,
      })) || [],
      paymentHistory: enrollmentFee.transactions?.map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type,
        amount: parseFloat(transaction.amount.toString()),
        date: transaction.date,
        method: transaction.paymentMethod,
        reference: transaction.reference,
        status: transaction.status,
      })) || [],
      challan: {
        challanNo,
        issueDate,
        dueDate,
        totalAmount: parseFloat(enrollmentFee.finalAmount.toString()),
        remainingAmount: remainingAmount,
      },
      template: {
        id: template.id,
        name: template.name,
        copies: template.copies || 2,
        design: template.design || {},
      },
      bankDetails: bankDetails || {
        bankName: 'Default Bank',
        accountNumber: '1234567890',
        branchCode: '001',
      },
    };

    try {
      // Create challan
      const challan = await this.prisma.feeChallan.create({
        data: {
          enrollmentFeeId,
          challanNo,
          issueDate,
          dueDate,
          totalAmount: parseFloat(enrollmentFee.finalAmount.toString()),
          paidAmount: totalPaidAmount,
          paymentStatus: remainingAmount > 0 ? "PENDING" : "PAID",
          templateId: template.id,
          challanData: challanData as any,
          bankDetails: bankDetails as any,
          createdById,
        },
      }) as any; // Type assertion to avoid TypeScript errors

      // Create comprehensive audit trail entry
      await this.prisma.enrollmentHistory.create({
        data: {
          enrollmentId: enrollmentFee.enrollmentId,
          action: "CHALLAN_GENERATED",
          details: {
            feeId: enrollmentFeeId,
            challanId: challan.id,
            challanNo,
            totalAmount: parseFloat(enrollmentFee.finalAmount.toString()),
            paidAmount: totalPaidAmount,
            remainingAmount: remainingAmount,
            dueDate,
            templateUsed: template.name,
            discountsApplied: enrollmentFee.discounts?.length || 0,
            additionalCharges: enrollmentFee.additionalCharges?.length || 0,
            arrears: enrollmentFee.arrears?.length || 0,
          },
          createdById,
        },
      });

      return {
        ...challan,
        challanData: challanData,
        template: template,
      };

    } catch (error) {
      console.error('Error creating challan:', error);
      throw new Error(`Failed to create challan: ${error.message}`);
    }
  }

  async getChallan(id: string) {
    return this.prisma.feeChallan.findUnique({
      where: { id },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: true,
                class: true,
              },
            },
          },
        },
        template: true,
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });
  }

  async getChallansByEnrollmentFee(enrollmentFeeId: string) {
    return this.prisma.feeChallan.findMany({
      where: { enrollmentFeeId },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });
  }

  async printChallan(id: string) {
    // Get challan with related data
    const challan = await this.prisma.feeChallan.findUnique({
      where: { id },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
                class: true,
              },
            },
            discounts: {
              include: {
                discountType: true,
              },
            },
            additionalCharges: true,
            arrears: true,
            transactions: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        template: true,
      },
    }) as any; // Type assertion to avoid TypeScript errors

    if (!challan) {
      throw new Error("Challan not found");
    }

    // Calculate payment summary
    const totalPaid = challan.enrollmentFee.transactions
      ?.filter((t: any) => t.type === 'PAYMENT')
      ?.reduce((sum: number, t: any) => sum + parseFloat(t.amount.toString()), 0) || 0;

    const remainingAmount = parseFloat(challan.totalAmount.toString()) - totalPaid;

    // Create audit trail for print action
    try {
      await this.prisma.enrollmentHistory.create({
        data: {
          enrollmentId: challan.enrollmentFee.enrollmentId,
          action: "CHALLAN_PRINTED",
          details: {
            challanId: challan.id,
            challanNo: challan.challanNo,
            printedAt: new Date(),
          },
          createdById: challan.createdById, // Use original creator as fallback
        },
      });
    } catch (historyError) {
      console.warn('Failed to create print history entry:', historyError);
    }

    // Generate HTML content for printing
    const printHTML = this.generateChallanHTML({
      ...challan,
      paymentSummary: {
        totalAmount: parseFloat(challan.totalAmount.toString()),
        paidAmount: totalPaid,
        remainingAmount: remainingAmount,
        paymentStatus: remainingAmount > 0 ? 'PENDING' : 'PAID',
      },
    });

    // Return the challan data with print HTML and enhanced information
    return {
      challan: {
        ...challan,
        paymentSummary: {
          totalAmount: parseFloat(challan.totalAmount.toString()),
          paidAmount: totalPaid,
          remainingAmount: remainingAmount,
          paymentStatus: remainingAmount > 0 ? 'PENDING' : 'PAID',
        },
      },
      printHTML: printHTML,
      printUrl: `data:text/html;base64,${Buffer.from(printHTML).toString('base64')}`,
    };
  }

  async emailChallan(id: string, email: string) {
    // Get challan with related data
    const challan = await this.prisma.feeChallan.findUnique({
      where: { id },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: true,
                class: true,
              },
            },
          },
        },
        template: true,
      },
    }) as any; // Type assertion to avoid TypeScript errors

    if (!challan) {
      throw new Error("Challan not found");
    }

    // In a real implementation, generate PDF and send email
    // For now, just return success
    return {
      success: true,
      message: `Challan ${challan.challanNo} emailed to ${email}`,
    };
  }

  async batchPrintChallans(ids: string[]) {
    // Get challans with related data
    const challans = await this.prisma.feeChallan.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        enrollmentFee: {
          include: {
            enrollment: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
                class: true,
              },
            },
            discounts: {
              include: {
                discountType: true,
              },
            },
            additionalCharges: true,
            arrears: true,
            transactions: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        template: true,
      },
    }) as any[]; // Type assertion to avoid TypeScript errors

    if (challans.length === 0) {
      throw new Error("No challans found");
    }

    // Generate combined HTML for all challans
    const combinedHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Print Challans</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; }
          .challan-page {
            page-break-after: always;
            margin: 20px;
            min-height: 100vh;
          }
          .challan-page:last-child {
            page-break-after: auto;
          }
          @media print {
            .challan-page {
              margin: 0;
              page-break-after: always;
            }
          }
        </style>
      </head>
      <body>
        ${challans.map((challan) => {
          // Extract just the body content from the generated HTML
          const fullHTML = this.generateChallanHTML(challan);
          const bodyMatch = fullHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/);
          const bodyContent = bodyMatch ? bodyMatch[1] : fullHTML;

          return `
            <div class="challan-page">
              ${bodyContent.replace(/<script[\s\S]*?<\/script>/g, '')}
            </div>
          `;
        }).join('')}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    return {
      challans,
      printHTML: combinedHTML,
      printUrl: `data:text/html;base64,${Buffer.from(combinedHTML).toString('base64')}`,
    };
  }

  /**
   * Bulk generate challans for students based on filters
   * @param input Bulk generate challans input
   * @returns Generated challans information
   */
  async bulkGenerateChallans(input: BulkGenerateChallansInput) {
    const { filters, templateId, issueDate, dueDate, bankDetails, createdById } = input;
    const { campusId, programId, classId, month, year, hasPendingFees } = filters;

    // Get challan template
    const template = await this.prisma.challanTemplate.findUnique({
      where: { id: templateId },
    }) as any; // Type assertion to avoid TypeScript errors

    if (!template) {
      throw new Error("Challan template not found");
    }

    // Build query to find enrollment fees based on filters
    const currentDate = new Date();
    const currentMonth = month || currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = year || currentDate.getFullYear();

    // Find enrollment fees that match the criteria
    const enrollmentFees = await this.prisma.enrollmentFee.findMany({
      where: {
        // Filter by payment status if hasPendingFees is true
        ...(hasPendingFees && {
          paymentStatus: {
            in: ["PENDING", "PARTIAL"],
          },
        }),
        // Only include fees that don't already have a challan for the current month/year
        NOT: {
          challans: {
            some: {
              issueDate: {
                gte: new Date(currentYear, currentMonth - 1, 1),
                lt: new Date(currentYear, currentMonth, 0),
              },
            },
          },
        },
        enrollment: {
          status: "ACTIVE",
          // Filter by campus if provided
          ...(campusId && {
            class: {
              courseCampus: {
                campusId,
              },
            },
          }),
          // Filter by program if provided
          ...(programId && {
            programId,
          }),
          // Filter by class if provided
          ...(classId && {
            classId,
          }),
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            class: true,
          },
        },
        feeStructure: true,
        discounts: {
          include: {
            discountType: true,
          },
        },
        additionalCharges: true,
        arrears: true,
      },
    }) as any[]; // Type assertion to avoid TypeScript errors

    if (enrollmentFees.length === 0) {
      return {
        success: false,
        message: "No eligible enrollment fees found for challan generation",
        totalGenerated: 0,
        challans: [],
      };
    }

    // Generate challans for each enrollment fee
    const generatedChallans: Array<{
      id: string;
      challanNo: string;
      studentName: string;
      className: string;
      amount: number;
    }> = [];
    const failedChallans: Array<{
      enrollmentFeeId: string;
      studentName: string;
      error: string;
    }> = [];

    for (const enrollmentFee of enrollmentFees) {
      try {
        // Generate challan number with prefix based on campus and month/year
        const campusPrefix = enrollmentFee.enrollment.program.campus.code || 'CH';
        const monthYearSuffix = `${currentMonth.toString().padStart(2, '0')}${currentYear.toString().slice(-2)}`;
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const challanNo = `${campusPrefix}-${monthYearSuffix}-${randomSuffix}`;

        // Prepare challan data
        const challanData = {
          student: {
            id: enrollmentFee.enrollment.student.id,
            name: enrollmentFee.enrollment.student.name,
          },
          class: {
            id: enrollmentFee.enrollment.class.id,
            name: enrollmentFee.enrollment.class.name,
          },
          program: {
            id: enrollmentFee.enrollment.program.id,
            name: enrollmentFee.enrollment.program.name,
          },
          campus: {
            id: enrollmentFee.enrollment.program.campus.id,
            name: enrollmentFee.enrollment.program.campus.name,
          },
          fee: {
            id: enrollmentFee.id,
            baseAmount: enrollmentFee.baseAmount,
            discountedAmount: enrollmentFee.discountedAmount,
            finalAmount: enrollmentFee.finalAmount,
            components: enrollmentFee.feeStructure.feeComponents,
          },
          discounts: enrollmentFee.discounts.map((discount: any) => ({
            id: discount.id,
            type: discount.discountType.name,
            amount: discount.amount,
          })),
          additionalCharges: enrollmentFee.additionalCharges.map((charge: any) => ({
            id: charge.id,
            name: charge.name,
            amount: charge.amount,
          })),
          arrears: enrollmentFee.arrears.map((arrear: any) => ({
            id: arrear.id,
            amount: arrear.amount,
            reason: arrear.reason,
          })),
          challan: {
            challanNo,
            issueDate,
            dueDate,
            totalAmount: enrollmentFee.finalAmount,
            month: currentMonth,
            year: currentYear,
          },
          template: {
            id: template.id,
            name: template.name,
            copies: template.copies,
            design: template.design,
          },
          bankDetails: bankDetails || {},
        };

        // Create challan
        const challan = await this.prisma.feeChallan.create({
          data: {
            enrollmentFeeId: enrollmentFee.id,
            challanNo,
            issueDate,
            dueDate,
            totalAmount: enrollmentFee.finalAmount,
            paidAmount: 0,
            paymentStatus: "PENDING",
            templateId,
            challanData: challanData as any,
            bankDetails: bankDetails as any,
            createdById,
          },
        }) as any;

        // Create history entry
        await this.prisma.enrollmentHistory.create({
          data: {
            enrollmentId: enrollmentFee.enrollmentId,
            action: "CHALLAN_GENERATED",
            details: {
              feeId: enrollmentFee.id,
              challanId: challan.id,
              challanNo,
              totalAmount: enrollmentFee.finalAmount,
              dueDate,
              bulkGenerated: true,
            },
            createdById,
          },
        });

        generatedChallans.push({
          id: challan.id,
          challanNo: challan.challanNo,
          studentName: enrollmentFee.enrollment.student.name,
          className: enrollmentFee.enrollment.class.name,
          amount: challan.totalAmount,
        });
      } catch (error) {
        console.error(`Failed to generate challan for enrollment fee ${enrollmentFee.id}:`, error);
        failedChallans.push({
          enrollmentFeeId: enrollmentFee.id,
          studentName: enrollmentFee.enrollment.student.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      message: `Generated ${generatedChallans.length} challans successfully${failedChallans.length > 0 ? `, ${failedChallans.length} failed` : ''}`,
      totalGenerated: generatedChallans.length,
      totalFailed: failedChallans.length,
      challans: generatedChallans,
      failed: failedChallans,
    };
  }
}
