import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { SettingsService } from '@/server/api/services/settings.service';
import { FeeNotificationService } from '@/server/api/services/fee-notification.service';
import { TRPCError } from '@trpc/server';
import { DEFAULT_CURRENCY } from '@/data/currencies';

// Validation schemas
const CurrencySchema = z.object({
  code: z.string().min(3).max(3),
  name: z.string().min(1),
  symbol: z.string().min(1),
  country: z.string().min(1),
  region: z.string().min(1),
});

const DueDateSettingsSchema = z.object({
  defaultDueDays: z.number().min(1).max(365),
  gracePeriodDays: z.number().min(0).max(30),
  lateFeesEnabled: z.boolean(),
  lateFeeAmount: z.number().min(0),
  lateFeeType: z.enum(['FIXED', 'PERCENTAGE']),
});

const ReceiptSettingsSchema = z.object({
  enabled: z.boolean(),
  autoGenerate: z.boolean(),
  template: z.string(),
  includeQRCode: z.boolean(),
  includeBarcode: z.boolean(),
  footerText: z.string(),
});

const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  dueDateReminders: z.object({
    enabled: z.boolean(),
    daysBefore: z.array(z.number().min(1).max(365)),
  }),
  paymentConfirmations: z.object({
    enabled: z.boolean(),
    sendEmail: z.boolean(),
    sendSMS: z.boolean(),
  }),
  overdueNotifications: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    escalationDays: z.array(z.number().min(1).max(365)),
  }),
});

export const settingsRouter = createTRPCRouter({
  // Get fee management settings
  getFeeSettings: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const settingsService = new SettingsService(ctx.prisma);

        // Add timeout handling
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 5000); // 5 second timeout
        });

        const settingsPromise = settingsService.getFeeSettings();

        return await Promise.race([settingsPromise, timeoutPromise]);
      } catch (error) {
        // Return default settings if query fails
        return {
          currency: DEFAULT_CURRENCY,
          dueDateSettings: {
            defaultDueDays: 30,
            lateFeeDays: 7,
            lateFeeAmount: 100,
            lateFeeType: 'FIXED'
          },
          paymentMethods: ['CASH', 'BANK_TRANSFER', 'ONLINE'],
          discountSettings: {
            maxDiscountPercent: 50,
            allowMultipleDiscounts: false
          },
          notificationSettings: {
            sendReminders: true,
            reminderDays: [7, 3, 1],
            sendOverdueNotices: true
          }
        };
      }
    }),

  // Update currency settings
  updateCurrency: protectedProcedure
    .input(z.object({
      currency: CurrencySchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to update currency settings",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.updateCurrencySettings({
        currency: input.currency,
        updatedById: ctx.session.user.id,
      });
    }),

  // Update due date settings
  updateDueDateSettings: protectedProcedure
    .input(z.object({
      settings: DueDateSettingsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to update due date settings",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.updateDueDateSettings({
        settings: input.settings,
        updatedById: ctx.session.user.id,
      });
    }),

  // Update receipt settings
  updateReceiptSettings: protectedProcedure
    .input(z.object({
      settings: ReceiptSettingsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to update receipt settings",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.updateReceiptSettings({
        settings: input.settings,
        updatedById: ctx.session.user.id,
      });
    }),

  // Update notification settings
  updateNotificationSettings: protectedProcedure
    .input(z.object({
      settings: NotificationSettingsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER', 'CAMPUS_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to update notification settings",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.updateNotificationSettings({
        settings: input.settings,
        updatedById: ctx.session.user.id,
      });
    }),

  // Create custom currency
  createCustomCurrency: protectedProcedure
    .input(z.object({
      currency: CurrencySchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN', 'SYSTEM_MANAGER'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to create custom currencies",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.createCustomCurrency({
        currency: input.currency,
        createdById: ctx.session.user.id,
      });
    }),

  // Get all available currencies
  getAllCurrencies: protectedProcedure
    .query(async ({ ctx }) => {
      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.getAllCurrencies();
    }),

  // Get custom currencies
  getCustomCurrencies: protectedProcedure
    .query(async ({ ctx }) => {
      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.getCustomCurrencies();
    }),

  // Initialize default settings
  initializeDefaultSettings: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to initialize settings",
        });
      }

      const settingsService = new SettingsService(ctx.prisma);
      return settingsService.initializeDefaultSettings(ctx.session.user.id);
    }),

  // Get built-in currencies by region
  getCurrenciesByRegion: protectedProcedure
    .input(z.object({
      region: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { CURRENCIES, CURRENCY_REGIONS, getCurrenciesByRegion, getAllRegions } = await import('@/data/currencies');

      if (input.region) {
        return {
          currencies: getCurrenciesByRegion(input.region),
          regions: getAllRegions(),
        };
      }

      return {
        currencies: CURRENCIES,
        regions: getAllRegions(),
      };
    }),

  // Send payment confirmation notification
  sendPaymentConfirmation: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const notificationService = new FeeNotificationService(ctx.prisma);
      await notificationService.sendPaymentConfirmation(input.transactionId);
      return { success: true };
    }),

  // Run scheduled notifications (for testing/manual trigger)
  runScheduledNotifications: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Check permissions
      if (!['SYSTEM_ADMIN'].includes(ctx.session.user.userType)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You don't have permission to run scheduled notifications",
        });
      }

      const notificationService = new FeeNotificationService(ctx.prisma);
      await notificationService.runScheduledNotifications();
      return { success: true };
    }),
});
