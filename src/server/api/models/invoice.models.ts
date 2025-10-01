import { z } from "zod";

// Invoice Status Enum
export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  VIEWED: 'VIEWED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED'
} as const;

export type InvoiceStatusType = keyof typeof InvoiceStatus;

// Invoice Type Enum
export const InvoiceType = {
  TUITION_FEE: 'TUITION_FEE',
  ADMISSION_FEE: 'ADMISSION_FEE',
  EXAM_FEE: 'EXAM_FEE',
  LIBRARY_FEE: 'LIBRARY_FEE',
  LAB_FEE: 'LAB_FEE',
  TRANSPORT_FEE: 'TRANSPORT_FEE',
  HOSTEL_FEE: 'HOSTEL_FEE',
  MISCELLANEOUS: 'MISCELLANEOUS',
  LATE_FEE: 'LATE_FEE',
  FINE: 'FINE'
} as const;

export type InvoiceTypeType = keyof typeof InvoiceType;

// Invoice Priority Enum
export const InvoicePriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export type InvoicePriorityType = keyof typeof InvoicePriority;

// Invoice Line Item Schema
export const invoiceLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  discount: z.number().min(0).max(100).optional().default(0),
  taxRate: z.number().min(0).max(100).optional().default(0),
  totalAmount: z.number().min(0),
  feeComponentId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

// Create Invoice Schema
export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(), // Auto-generated if not provided
  studentId: z.string().min(1, "Student ID is required"),
  enrollmentId: z.string().optional(),
  feeStructureId: z.string().optional(),
  invoiceType: z.nativeEnum(InvoiceType),
  priority: z.nativeEnum(InvoicePriority).default(InvoicePriority.NORMAL),
  
  // Invoice Details
  title: z.string().min(1, "Invoice title is required"),
  description: z.string().optional(),
  
  // Financial Details
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  
  // Dates
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  
  // Payment Terms
  paymentTerms: z.string().optional(),
  lateFeePenalty: z.number().min(0).optional().default(0),
  
  // Additional Information
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.any()).optional(),
  
  // Template and Branding
  templateId: z.string().optional(),
  customBranding: z.record(z.any()).optional()
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// Update Invoice Schema
export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().min(1, "Invoice ID is required"),
  status: z.nativeEnum(InvoiceStatus).optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

// Invoice Query Schema
export const invoiceQuerySchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  invoiceType: z.nativeEnum(InvoiceType).optional(),
  priority: z.nativeEnum(InvoicePriority).optional(),
  studentId: z.string().optional(),
  campusId: z.string().optional(),
  programId: z.string().optional(),
  classId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  sortBy: z.enum(['invoiceNumber', 'issueDate', 'dueDate', 'totalAmount', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.boolean().default(false)
});

export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

// Invoice Analytics Schema
export const invoiceAnalyticsSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  campusId: z.string().optional(),
  programId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  includeArchived: z.boolean().default(false)
});

export type InvoiceAnalyticsInput = z.infer<typeof invoiceAnalyticsSchema>;

// Bulk Operations Schema
export const bulkInvoiceOperationSchema = z.object({
  invoiceIds: z.array(z.string()).min(1, "At least one invoice ID is required"),
  operation: z.enum(['send', 'cancel', 'archive', 'delete', 'markPaid']),
  metadata: z.record(z.any()).optional()
});

export type BulkInvoiceOperationInput = z.infer<typeof bulkInvoiceOperationSchema>;

// Invoice Template Schema
export const invoiceTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  templateData: z.record(z.any()),
  isDefault: z.boolean().default(false),
  institutionId: z.string().min(1, "Institution ID is required"),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateSchema>;

// Invoice Export Schema
export const invoiceExportSchema = z.object({
  invoiceIds: z.array(z.string()).optional(),
  filters: invoiceQuerySchema.optional(),
  format: z.enum(['PDF', 'EXCEL', 'CSV']).default('PDF'),
  includeDetails: z.boolean().default(true),
  includePaymentHistory: z.boolean().default(false)
});

export type InvoiceExportInput = z.infer<typeof invoiceExportSchema>;

// Invoice Payment Schema
export const invoicePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentDate: z.date().default(() => new Date()),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type InvoicePaymentInput = z.infer<typeof invoicePaymentSchema>;

// Invoice Reminder Schema
export const invoiceReminderSchema = z.object({
  invoiceIds: z.array(z.string()).min(1, "At least one invoice ID is required"),
  reminderType: z.enum(['EMAIL', 'SMS', 'BOTH']).default('EMAIL'),
  customMessage: z.string().optional(),
  scheduleDate: z.date().optional() // If not provided, send immediately
});

export type InvoiceReminderInput = z.infer<typeof invoiceReminderSchema>;
