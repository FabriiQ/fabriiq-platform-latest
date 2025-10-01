import { PrismaClient, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceQueryInput,
  InvoiceAnalyticsInput,
  BulkInvoiceOperationInput,
  InvoiceTemplateInput,
  InvoiceExportInput,
  InvoicePaymentInput,
  InvoiceReminderInput,
  InvoiceStatus,
  InvoiceType,
  InvoicePriority
} from '../models/invoice.models';

export interface InvoiceServiceConfig {
  prisma: PrismaClient;
}

export class InvoiceService {
  private prisma: PrismaClient;

  constructor(config: InvoiceServiceConfig) {
    this.prisma = config.prisma;
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(invoiceType: keyof typeof InvoiceType): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the count of invoices for this month and type
    const count = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count 
      FROM "Invoice" 
      WHERE "invoiceType" = ${invoiceType}
      AND EXTRACT(YEAR FROM "createdAt") = ${year}
      AND EXTRACT(MONTH FROM "createdAt") = ${parseInt(month)}
    `;

    const sequence = Number(count[0].count) + 1;
    const typePrefix = invoiceType.substring(0, 3).toUpperCase();
    
    return `INV-${typePrefix}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(input: CreateInvoiceInput & { createdById: string }): Promise<any> {
    try {
      // Validate required fields
      if (!input.studentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Student ID is required'
        });
      }

      if (!input.title) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice title is required'
        });
      }

      if (!input.lineItems || input.lineItems.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one line item is required'
        });
      }

      if (!input.dueDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Due date is required'
        });
      }

      // Generate invoice number if not provided
      const invoiceNumber = input.invoiceNumber || await this.generateInvoiceNumber(input.invoiceType);

      // Check if invoice number already exists
      const existingInvoice = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM "Invoice" WHERE "invoiceNumber" = ${invoiceNumber}
      `;

      if (existingInvoice.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Invoice number already exists'
        });
      }

      // Validate student exists using raw SQL (note: model is StudentProfile)
      const student = await this.prisma.$queryRaw<any[]>`
        SELECT s.id, u.name, u.email
        FROM "StudentProfile" s
        LEFT JOIN "User" u ON s."userId" = u.id
        WHERE s.id = ${input.studentId}
      `;

      if (student.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found'
        });
      }

      // Validate enrollment if provided
      if (input.enrollmentId) {
        const enrollment = await this.prisma.$queryRaw<any[]>`
          SELECT id FROM "StudentEnrollment" WHERE id = ${input.enrollmentId}
        `;

        if (enrollment.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment not found'
          });
        }
      }

      // Create invoice using raw SQL for better performance and partitioning support
      const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const partitionKey = `${new Date().getFullYear()}_${Math.floor(new Date().getMonth() / 3) + 1}`; // Quarterly partitions

      // Ensure dates are properly formatted
      const issueDate = input.issueDate || new Date();
      const dueDate = input.dueDate;

      await this.prisma.$executeRaw`
        INSERT INTO "Invoice" (
          id, "invoiceNumber", "studentId", "enrollmentId", "feeStructureId",
          "invoiceType", priority, title, description, "lineItems",
          subtotal, "discountAmount", "taxAmount", "totalAmount",
          "issueDate", "dueDate", "paymentTerms", "lateFeePenalty",
          notes, "termsAndConditions", metadata, "templateId", "customBranding",
          status, "createdById", "partitionKey", "createdAt", "updatedAt"
        ) VALUES (
          ${invoiceId}, ${invoiceNumber}, ${input.studentId}, ${input.enrollmentId || null},
          ${input.feeStructureId || null}, ${input.invoiceType}, ${input.priority || 'NORMAL'},
          ${input.title}, ${input.description || null}, ${JSON.stringify(input.lineItems)},
          ${input.subtotal}, ${input.discountAmount || 0}, ${input.taxAmount || 0}, ${input.totalAmount},
          ${issueDate}, ${dueDate}, ${input.paymentTerms || null}, ${input.lateFeePenalty || 0},
          ${input.notes || null}, ${input.termsAndConditions || null}, ${JSON.stringify(input.metadata || {})},
          ${input.templateId || null}, ${JSON.stringify(input.customBranding || {})},
          'DRAFT', ${input.createdById}, ${partitionKey}, NOW(), NOW()
        )
      `;

      // Create audit trail entry
      if (input.enrollmentId) {
        try {
          await this.prisma.enrollmentHistory.create({
            data: {
              enrollmentId: input.enrollmentId,
              action: 'INVOICE_CREATED',
              details: {
                invoiceId,
                invoiceNumber,
                invoiceType: input.invoiceType,
                totalAmount: input.totalAmount,
                dueDate: dueDate,
              },
              createdById: input.createdById,
            },
          });
        } catch (historyError) {
          console.warn('Failed to create enrollment history entry:', historyError);
          // Don't fail the invoice creation if history fails
        }
      }

      // Fetch and return the created invoice
      const createdInvoice = await this.getInvoiceById(invoiceId);
      return createdInvoice;

    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error instanceof TRPCError) {
        throw error;
      }

      // Provide more specific error messages based on the error type
      if (error.message?.includes('foreign key constraint')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid reference to student, enrollment, or fee structure'
        });
      }

      if (error.message?.includes('unique constraint')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Invoice number already exists'
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create invoice: ${error.message || 'Unknown error'}`
      });
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<any> {
    const invoice = await this.prisma.$queryRaw<any[]>`
      SELECT
        i.*,
        s."enrollmentNumber",
        u.name as "studentName",
        u.email as "studentEmail",
        c.name as "createdByName"
      FROM "Invoice" i
      LEFT JOIN "StudentProfile" s ON i."studentId" = s.id
      LEFT JOIN "User" u ON s."userId" = u.id
      LEFT JOIN "User" c ON i."createdById" = c.id
      WHERE i.id = ${id}
      AND i."deletedAt" IS NULL
    `;

    if (invoice.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Invoice not found'
      });
    }

    const result = invoice[0];

    // Parse JSON fields safely
    try {
      if (result.lineItems && typeof result.lineItems === 'string') {
        result.lineItems = JSON.parse(result.lineItems);
      }
      if (result.metadata && typeof result.metadata === 'string') {
        result.metadata = JSON.parse(result.metadata);
      }
      if (result.customBranding && typeof result.customBranding === 'string') {
        result.customBranding = JSON.parse(result.customBranding);
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields in invoice:', parseError);
      // Set defaults if parsing fails
      result.lineItems = result.lineItems || [];
      result.metadata = result.metadata || {};
      result.customBranding = result.customBranding || {};
    }

    return result;
  }

  /**
   * Update invoice
   */
  async updateInvoice(input: UpdateInvoiceInput & { updatedById: string }): Promise<any> {
    try {
      // Check if invoice exists and is not archived
      const existingInvoice = await this.getInvoiceById(input.id);
      
      if (existingInvoice.status === InvoiceStatus.ARCHIVED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update archived invoice'
        });
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (input.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        updateValues.push(input.title);
      }
      if (input.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(input.description);
      }
      if (input.lineItems !== undefined) {
        updateFields.push(`"lineItems" = $${paramIndex++}`);
        updateValues.push(JSON.stringify(input.lineItems));
      }
      if (input.subtotal !== undefined) {
        updateFields.push(`subtotal = $${paramIndex++}`);
        updateValues.push(input.subtotal);
      }
      if (input.totalAmount !== undefined) {
        updateFields.push(`"totalAmount" = $${paramIndex++}`);
        updateValues.push(input.totalAmount);
      }
      if (input.dueDate !== undefined) {
        updateFields.push(`"dueDate" = $${paramIndex++}`);
        updateValues.push(input.dueDate);
      }
      if (input.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(input.status);
      }
      if (input.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(input.notes);
      }

      // Always update updatedAt and updatedById
      updateFields.push(`"updatedAt" = NOW()`);
      updateFields.push(`"updatedById" = $${paramIndex++}`);
      updateValues.push(input.updatedById);

      // Add ID for WHERE clause
      updateValues.push(input.id);

      if (updateFields.length === 0) {
        return existingInvoice;
      }

      await this.prisma.$executeRawUnsafe(`
        UPDATE "Invoice" 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        AND "deletedAt" IS NULL
      `, ...updateValues);

      return this.getInvoiceById(input.id);

    } catch (error) {
      console.error('Error updating invoice:', error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update invoice'
      });
    }
  }

  /**
   * Get invoices with pagination and filtering
   */
  async getInvoices(input: InvoiceQueryInput): Promise<{
    invoices: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const offset = (input.page - 1) * input.pageSize;
      
      // Build WHERE conditions
      const whereConditions: string[] = ['i."deletedAt" IS NULL'];
      const whereValues: any[] = [];
      let paramIndex = 1;

      if (!input.includeArchived) {
        whereConditions.push(`i.status != '${InvoiceStatus.ARCHIVED}'`);
      }

      if (input.search) {
        whereConditions.push(`(
          i."invoiceNumber" ILIKE $${paramIndex} OR 
          i.title ILIKE $${paramIndex} OR 
          u.name ILIKE $${paramIndex} OR 
          s."enrollmentNumber" ILIKE $${paramIndex}
        )`);
        whereValues.push(`%${input.search}%`);
        paramIndex++;
      }

      if (input.status) {
        whereConditions.push(`i.status = $${paramIndex++}`);
        whereValues.push(input.status);
      }

      if (input.invoiceType) {
        whereConditions.push(`i."invoiceType" = $${paramIndex++}`);
        whereValues.push(input.invoiceType);
      }

      if (input.studentId) {
        whereConditions.push(`i."studentId" = $${paramIndex++}`);
        whereValues.push(input.studentId);
      }

      if (input.dateFrom) {
        whereConditions.push(`i."issueDate" >= $${paramIndex++}`);
        whereValues.push(input.dateFrom);
      }

      if (input.dateTo) {
        whereConditions.push(`i."issueDate" <= $${paramIndex++}`);
        whereValues.push(input.dateTo);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM "invoices" i
        LEFT JOIN "student_profiles" s ON i."studentId" = s.id
        LEFT JOIN "users" u ON s."userId" = u.id
        ${whereClause}
      `, ...whereValues);

      const total = Number(countResult[0].count);

      // Get invoices
      const invoices = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          i.*,
          s."enrollmentNumber",
          u.name as "studentName",
          u.email as "studentEmail",
          c.name as "createdByName"
        FROM "invoices" i
        LEFT JOIN "student_profiles" s ON i."studentId" = s.id
        LEFT JOIN "users" u ON s."userId" = u.id
        LEFT JOIN "users" c ON i."createdById" = c.id
        ${whereClause}
        ORDER BY i."${input.sortBy}" ${input.sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, ...whereValues, input.pageSize, offset);

      // Parse JSON fields for each invoice
      const parsedInvoices = invoices.map(invoice => ({
        ...invoice,
        lineItems: invoice.lineItems ? JSON.parse(invoice.lineItems) : [],
        metadata: invoice.metadata ? JSON.parse(invoice.metadata) : {},
        customBranding: invoice.customBranding ? JSON.parse(invoice.customBranding) : {}
      }));

      return {
        invoices: parsedInvoices,
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize)
      };

    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch invoices'
      });
    }
  }

  /**
   * Delete invoice (soft delete)
   */
  async deleteInvoice(id: string, deletedById: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(id);

      if (invoice.status === InvoiceStatus.PAID) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete paid invoice'
        });
      }

      await this.prisma.$executeRaw`
        UPDATE "Invoice"
        SET "deletedAt" = NOW(), "deletedById" = ${deletedById}
        WHERE id = ${id}
      `;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete invoice'
      });
    }
  }

  /**
   * Archive old invoices for performance
   */
  async archiveOldInvoices(olderThanMonths: number = 12): Promise<{ archivedCount: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);

      const result = await this.prisma.$executeRaw`
        UPDATE "Invoice"
        SET status = ${InvoiceStatus.ARCHIVED}, "updatedAt" = NOW()
        WHERE "createdAt" < ${cutoffDate}
        AND status NOT IN (${InvoiceStatus.ARCHIVED}, ${InvoiceStatus.PAID})
        AND "deletedAt" IS NULL
      `;

      return { archivedCount: Number(result) };
    } catch (error) {
      console.error('Error archiving invoices:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive invoices'
      });
    }
  }

  /**
   * Get invoice analytics
   */
  async getInvoiceAnalytics(input: InvoiceAnalyticsInput): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    collectionRate: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    monthlyTrends: Array<{
      period: string;
      totalInvoices: number;
      totalAmount: number;
      paidAmount: number;
    }>;
  }> {
    try {
      // Build date filter
      const dateFilter: string[] = [];
      const dateValues: any[] = [];
      let paramIndex = 1;

      if (input.dateFrom) {
        dateFilter.push(`"createdAt" >= $${paramIndex++}`);
        dateValues.push(input.dateFrom);
      }
      if (input.dateTo) {
        dateFilter.push(`"createdAt" <= $${paramIndex++}`);
        dateValues.push(input.dateTo);
      }

      const whereClause = dateFilter.length > 0
        ? `WHERE ${dateFilter.join(' AND ')} AND "deletedAt" IS NULL`
        : 'WHERE "deletedAt" IS NULL';

      // Get overall statistics
      const overallStats = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COUNT(*) as "totalInvoices",
          COALESCE(SUM("totalAmount"), 0) as "totalAmount",
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN "totalAmount" ELSE 0 END), 0) as "paidAmount",
          COALESCE(SUM(CASE WHEN status != 'PAID' THEN "totalAmount" ELSE 0 END), 0) as "pendingAmount",
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN "totalAmount" ELSE 0 END), 0) as "overdueAmount"
        FROM "Invoice"
        ${whereClause}
      `, ...dateValues);

      const stats = overallStats[0];
      const collectionRate = stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0;

      // Get status breakdown
      const statusBreakdown = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT status, COUNT(*) as count
        FROM "Invoice"
        ${whereClause}
        GROUP BY status
      `, ...dateValues);

      // Get type breakdown
      const typeBreakdown = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT "invoiceType", COUNT(*) as count
        FROM "Invoice"
        ${whereClause}
        GROUP BY "invoiceType"
      `, ...dateValues);

      // Get monthly trends
      const monthlyTrends = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          TO_CHAR("createdAt", 'YYYY-MM') as period,
          COUNT(*) as "totalInvoices",
          COALESCE(SUM("totalAmount"), 0) as "totalAmount",
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN "totalAmount" ELSE 0 END), 0) as "paidAmount"
        FROM "Invoice"
        ${whereClause}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY period DESC
        LIMIT 12
      `, ...dateValues);

      return {
        totalInvoices: Number(stats.totalInvoices),
        totalAmount: Number(stats.totalAmount),
        paidAmount: Number(stats.paidAmount),
        pendingAmount: Number(stats.pendingAmount),
        overdueAmount: Number(stats.overdueAmount),
        collectionRate: Number(collectionRate.toFixed(2)),
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = Number(item.count);
          return acc;
        }, {}),
        typeBreakdown: typeBreakdown.reduce((acc, item) => {
          acc[item.invoiceType] = Number(item.count);
          return acc;
        }, {}),
        monthlyTrends: monthlyTrends.map(trend => ({
          period: trend.period,
          totalInvoices: Number(trend.totalInvoices),
          totalAmount: Number(trend.totalAmount),
          paidAmount: Number(trend.paidAmount)
        }))
      };
    } catch (error) {
      console.error('Error getting invoice analytics:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get invoice analytics'
      });
    }
  }

  /**
   * Bulk operations on invoices
   */
  async bulkOperation(input: BulkInvoiceOperationInput & { operatedById: string }): Promise<{
    successCount: number;
    failedCount: number;
    errors: string[];
  }> {
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as string[]
    };

    for (const invoiceId of input.invoiceIds) {
      try {
        switch (input.operation) {
          case 'send':
            await this.updateInvoice({
              id: invoiceId,
              status: InvoiceStatus.SENT,
              updatedById: input.operatedById
            });
            break;
          case 'cancel':
            await this.updateInvoice({
              id: invoiceId,
              status: InvoiceStatus.CANCELLED,
              updatedById: input.operatedById
            });
            break;
          case 'archive':
            await this.updateInvoice({
              id: invoiceId,
              status: InvoiceStatus.ARCHIVED,
              updatedById: input.operatedById
            });
            break;
          case 'delete':
            await this.deleteInvoice(invoiceId, input.operatedById);
            break;
          case 'markPaid':
            await this.updateInvoice({
              id: invoiceId,
              status: InvoiceStatus.PAID,
              updatedById: input.operatedById
            });
            break;
        }
        results.successCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push(`Invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
}
