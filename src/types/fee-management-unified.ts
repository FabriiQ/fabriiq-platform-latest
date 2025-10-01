/**
 * Unified Fee Management Configuration Schema
 * Consolidates all fee-related settings into a single, coherent structure
 */

import { z } from "zod";
import { Currency } from "@/data/currencies";

// ========================================================================
// CORE ENUMS AND TYPES
// ========================================================================

export enum LateFeeCalculationType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
  TIERED = 'TIERED',
  DAILY_PERCENTAGE = 'DAILY_PERCENTAGE'
}

export enum CompoundingInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum NotificationFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum ReceiptTemplate {
  DEFAULT = 'DEFAULT',
  MINIMAL = 'MINIMAL',
  DETAILED = 'DETAILED',
  CUSTOM = 'CUSTOM'
}

// ========================================================================
// UNIFIED FEE MANAGEMENT CONFIGURATION SCHEMA
// ========================================================================

export const unifiedFeeConfigSchema = z.object({
  // Institution/Campus scope
  institutionId: z.string().optional(),
  campusId: z.string().optional(),
  
  // General Fee Settings
  general: z.object({
    currency: z.object({
      code: z.string(),
      symbol: z.string(),
      name: z.string(),
      region: z.string(),
    }),
    
    dueDates: z.object({
      defaultDaysFromEnrollment: z.number().min(1).max(365).default(30),
      defaultDaysFromTermStart: z.number().min(1).max(365).default(15),
      respectHolidays: z.boolean().default(true),
      extendOnWeekends: z.boolean().default(true),
      extendOnHolidays: z.boolean().default(true),
      customTermDueDates: z.array(z.object({
        termId: z.string(),
        dueDate: z.date(),
        description: z.string().optional(),
      })).default([]),
    }),
    
    paymentMethods: z.object({
      allowCash: z.boolean().default(true),
      allowCard: z.boolean().default(true),
      allowBankTransfer: z.boolean().default(true),
      allowOnlinePayment: z.boolean().default(true),
      allowInstallments: z.boolean().default(false),
      maxInstallments: z.number().min(2).max(12).optional(),
    }),
  }),
  
  // Late Fee Configuration
  lateFees: z.object({
    enabled: z.boolean().default(true),
    
    // Grace Period
    gracePeriod: z.object({
      days: z.number().min(0).max(90).default(7),
      applyOnWeekends: z.boolean().default(false),
      applyOnHolidays: z.boolean().default(false),
    }),
    
    // Calculation Rules
    calculation: z.object({
      type: z.nativeEnum(LateFeeCalculationType).default(LateFeeCalculationType.FIXED),
      
      // For FIXED type
      fixedAmount: z.number().min(0).optional(),
      
      // For PERCENTAGE type
      percentageRate: z.number().min(0).max(100).optional(),
      
      // For DAILY_PERCENTAGE type
      dailyPercentageRate: z.number().min(0).max(10).optional(),
      
      // For TIERED type
      tieredRules: z.array(z.object({
        daysFrom: z.number().min(0),
        daysTo: z.number().min(0),
        amount: z.number().min(0),
        isPercentage: z.boolean().default(false),
      })).optional(),
      
      // Limits
      minAmount: z.number().min(0).default(0),
      maxAmount: z.number().min(0).optional(),
      maxTotalLateFees: z.number().min(0).optional(),
      
      // Compounding
      compounding: z.object({
        enabled: z.boolean().default(false),
        interval: z.nativeEnum(CompoundingInterval).default(CompoundingInterval.DAILY),
        maxPeriods: z.number().min(1).optional(),
        capAtPrincipal: z.boolean().default(true),
      }),
    }),
    
    // Automation
    automation: z.object({
      autoApply: z.boolean().default(false),
      processingSchedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
      processingTime: z.string().default('02:00'), // 24-hour format
      dryRunFirst: z.boolean().default(true),
    }),
    
    // Waivers
    waivers: z.object({
      allowRequests: z.boolean().default(true),
      requireApproval: z.boolean().default(true),
      maxWaiverPercentage: z.number().min(0).max(100).default(100),
      allowedReasons: z.array(z.string()).default([
        'Financial hardship',
        'Medical emergency', 
        'Administrative error',
        'Student withdrawal',
        'Payment processing delay',
        'Other'
      ]),
      autoApprovalRules: z.array(z.object({
        condition: z.string(),
        maxAmount: z.number(),
        maxPercentage: z.number(),
      })).default([]),
    }),
  }),
  
  // Receipt Configuration
  receipts: z.object({
    enabled: z.boolean().default(true),
    autoGenerate: z.boolean().default(true),
    template: z.nativeEnum(ReceiptTemplate).default(ReceiptTemplate.DEFAULT),
    customTemplate: z.string().optional(),
    
    features: z.object({
      includeQRCode: z.boolean().default(false),
      includeBarcode: z.boolean().default(false),
      includeLogo: z.boolean().default(true),
      includeSignature: z.boolean().default(false),
    }),
    
    content: z.object({
      headerText: z.string().optional(),
      footerText: z.string().default('Thank you for your payment'),
      termsAndConditions: z.string().optional(),
      contactInfo: z.boolean().default(true),
    }),
    
    delivery: z.object({
      autoEmail: z.boolean().default(true),
      autoSMS: z.boolean().default(false),
      allowDownload: z.boolean().default(true),
      allowPrint: z.boolean().default(true),
    }),
  }),
  
  // Notification Configuration
  notifications: z.object({
    enabled: z.boolean().default(true),
    
    // Due Date Reminders
    dueDateReminders: z.object({
      enabled: z.boolean().default(true),
      daysBefore: z.array(z.number().min(1).max(90)).default([7, 3, 1]),
      channels: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(false),
        inApp: z.boolean().default(true),
      }),
      template: z.string().optional(),
    }),
    
    // Payment Confirmations
    paymentConfirmations: z.object({
      enabled: z.boolean().default(true),
      channels: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(false),
        inApp: z.boolean().default(true),
      }),
      includeReceipt: z.boolean().default(true),
      template: z.string().optional(),
    }),
    
    // Overdue Notifications
    overdueNotifications: z.object({
      enabled: z.boolean().default(true),
      frequency: z.nativeEnum(NotificationFrequency).default(NotificationFrequency.WEEKLY),
      escalationDays: z.array(z.number().min(1)).default([7, 14, 30]),
      channels: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(false),
        inApp: z.boolean().default(true),
      }),
      template: z.string().optional(),
    }),
    
    // Late Fee Notifications
    lateFeeNotifications: z.object({
      enabled: z.boolean().default(true),
      notifyBeforeApplication: z.boolean().default(true),
      daysBefore: z.number().min(0).max(30).default(3),
      notifyAfterApplication: z.boolean().default(true),
      channels: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(false),
        inApp: z.boolean().default(true),
      }),
      template: z.string().optional(),
    }),
  }),
  
  // Reporting and Analytics
  reporting: z.object({
    enabled: z.boolean().default(true),
    retentionPeriodMonths: z.number().min(12).max(120).default(24),
    archiveOldRecords: z.boolean().default(true),
    
    dashboards: z.object({
      enableRealTimeData: z.boolean().default(true),
      refreshIntervalMinutes: z.number().min(5).max(60).default(15),
      defaultDateRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    }),
    
    exports: z.object({
      allowCSV: z.boolean().default(true),
      allowPDF: z.boolean().default(true),
      allowExcel: z.boolean().default(true),
      maxRecordsPerExport: z.number().min(100).max(50000).default(10000),
    }),
  }),
  
  // System Configuration
  system: z.object({
    version: z.string().default('1.0.0'),
    lastUpdated: z.date().default(() => new Date()),
    updatedBy: z.string(),
    
    validation: z.object({
      strictMode: z.boolean().default(true),
      allowNegativeFees: z.boolean().default(false),
      requireApprovalForLargeFees: z.boolean().default(true),
      largeFeesThreshold: z.number().min(0).default(10000),
    }),
    
    integration: z.object({
      enableWebhooks: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
      enableAPIAccess: z.boolean().default(false),
      apiRateLimit: z.number().min(10).max(1000).default(100),
    }),
  }),
});

export type UnifiedFeeConfig = z.infer<typeof unifiedFeeConfigSchema>;

// ========================================================================
// HELPER TYPES AND SCHEMAS
// ========================================================================

export const feeConfigUpdateSchema = unifiedFeeConfigSchema.partial();
export type FeeConfigUpdate = z.infer<typeof feeConfigUpdateSchema>;

export const feeConfigSectionSchema = z.enum([
  'general',
  'lateFees', 
  'receipts',
  'notifications',
  'reporting',
  'system'
]);
export type FeeConfigSection = z.infer<typeof feeConfigSectionSchema>;
