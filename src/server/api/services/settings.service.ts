import { PrismaClient, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { Currency, DEFAULT_CURRENCY } from '@/data/currencies';

export interface FeeSettings {
  currency: Currency;
  dueDateSettings: {
    defaultDueDays: number;
    gracePeriodDays: number;
    lateFeesEnabled: boolean;
    lateFeeAmount: number;
    lateFeeType: 'FIXED' | 'PERCENTAGE';
  };
  receiptSettings: {
    enabled: boolean;
    autoGenerate: boolean;
    template: string;
    includeQRCode: boolean;
    includeBarcode: boolean;
    footerText: string;
  };
  notificationSettings: {
    enabled: boolean;
    dueDateReminders: {
      enabled: boolean;
      daysBefore: number[];
    };
    paymentConfirmations: {
      enabled: boolean;
      sendEmail: boolean;
      sendSMS: boolean;
    };
    overdueNotifications: {
      enabled: boolean;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      escalationDays: number[];
    };
  };
}

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get settings by category
   */
  async getSettings(category: string, filters?: { institutionId?: string; campusId?: string }): Promise<any> {
    const settings = await this.prisma.systemConfig.findMany({
      where: {
        category,
        ...(filters?.institutionId && { institutionId: filters.institutionId }),
        ...(filters?.campusId && { campusId: filters.campusId }),
      }
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    return Object.fromEntries(settingsMap);
  }

  /**
   * Get fee management settings
   */
  async getFeeSettings(): Promise<FeeSettings> {
    const settings = await this.prisma.systemConfig.findMany({
      where: {
        category: 'fee_management'
      }
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      currency: (settingsMap.get('currency') as unknown as Currency) || DEFAULT_CURRENCY,
      dueDateSettings: (settingsMap.get('due_date_settings') as any) || {
        defaultDueDays: 30,
        gracePeriodDays: 7,
        lateFeesEnabled: false,
        lateFeeAmount: 0,
        lateFeeType: 'FIXED'
      },
      receiptSettings: (settingsMap.get('receipt_settings') as any) || {
        enabled: true,
        autoGenerate: true,
        template: 'default',
        includeQRCode: false,
        includeBarcode: false,
        footerText: 'Thank you for your payment'
      },
      notificationSettings: (settingsMap.get('notification_settings') as any) || {
        enabled: true,
        dueDateReminders: {
          enabled: true,
          daysBefore: [7, 3, 1]
        },
        paymentConfirmations: {
          enabled: true,
          sendEmail: true,
          sendSMS: false
        },
        overdueNotifications: {
          enabled: true,
          frequency: 'WEEKLY',
          escalationDays: [7, 14, 30]
        }
      }
    };
  }

  /**
   * Update currency settings
   */
  async updateCurrencySettings(data: {
    currency: Currency;
    updatedById: string;
  }) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'currency' },
      update: {
        value: data.currency as unknown as Prisma.InputJsonValue,
        updatedById: data.updatedById,
        updatedAt: new Date()
      },
      create: {
        key: 'currency',
        value: data.currency as unknown as Prisma.InputJsonValue,
        description: 'Default currency for fee management',
        category: 'fee_management',
        createdById: data.updatedById
      }
    });

    return { success: true };
  }

  /**
   * Update due date settings
   */
  async updateDueDateSettings(data: {
    settings: FeeSettings['dueDateSettings'];
    updatedById: string;
  }) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'due_date_settings' },
      update: {
        value: data.settings,
        updatedById: data.updatedById,
        updatedAt: new Date()
      },
      create: {
        key: 'due_date_settings',
        value: data.settings,
        description: 'Due date and late fee settings',
        category: 'fee_management',
        createdById: data.updatedById
      }
    });

    return { success: true };
  }

  /**
   * Update receipt settings
   */
  async updateReceiptSettings(data: {
    settings: FeeSettings['receiptSettings'];
    updatedById: string;
  }) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'receipt_settings' },
      update: {
        value: data.settings,
        updatedById: data.updatedById,
        updatedAt: new Date()
      },
      create: {
        key: 'receipt_settings',
        value: data.settings,
        description: 'Receipt generation and formatting settings',
        category: 'fee_management',
        createdById: data.updatedById
      }
    });

    return { success: true };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(data: {
    settings: FeeSettings['notificationSettings'];
    updatedById: string;
  }) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'notification_settings' },
      update: {
        value: data.settings,
        updatedById: data.updatedById,
        updatedAt: new Date()
      },
      create: {
        key: 'notification_settings',
        value: data.settings,
        description: 'Fee notification and reminder settings',
        category: 'fee_management',
        createdById: data.updatedById
      }
    });

    return { success: true };
  }

  /**
   * Create custom currency
   */
  async createCustomCurrency(data: {
    currency: Currency;
    createdById: string;
  }) {
    // Store custom currency in system config
    const customCurrencies = await this.getCustomCurrencies();
    const updatedCurrencies = [...customCurrencies, data.currency];

    await this.prisma.systemConfig.upsert({
      where: { key: 'custom_currencies' },
      update: {
        value: updatedCurrencies as unknown as Prisma.InputJsonValue,
        updatedById: data.createdById,
        updatedAt: new Date()
      },
      create: {
        key: 'custom_currencies',
        value: updatedCurrencies as unknown as Prisma.InputJsonValue,
        description: 'Custom currencies added by users',
        category: 'fee_management',
        createdById: data.createdById
      }
    });

    return data.currency;
  }

  /**
   * Get custom currencies
   */
  async getCustomCurrencies(): Promise<Currency[]> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'custom_currencies' }
    });

    return (config?.value as unknown as Currency[]) || [];
  }

  /**
   * Get all available currencies (built-in + custom)
   */
  async getAllCurrencies(): Promise<Currency[]> {
    const { CURRENCIES } = await import('@/data/currencies');
    const customCurrencies = await this.getCustomCurrencies();
    
    return [...CURRENCIES, ...customCurrencies];
  }

  /**
   * Initialize default settings if they don't exist
   */
  async initializeDefaultSettings(createdById: string) {
    const defaultSettings = await this.getFeeSettings();
    
    // Initialize each setting if it doesn't exist
    const settingsToInit = [
      { key: 'currency', value: defaultSettings.currency, description: 'Default currency for fee management' },
      { key: 'due_date_settings', value: defaultSettings.dueDateSettings, description: 'Due date and late fee settings' },
      { key: 'receipt_settings', value: defaultSettings.receiptSettings, description: 'Receipt generation and formatting settings' },
      { key: 'notification_settings', value: defaultSettings.notificationSettings, description: 'Fee notification and reminder settings' }
    ];

    for (const setting of settingsToInit) {
      await this.prisma.systemConfig.upsert({
        where: { key: setting.key },
        update: {},
        create: {
          key: setting.key,
          value: setting.value as unknown as Prisma.InputJsonValue,
          description: setting.description,
          category: 'fee_management',
          createdById
        }
      });
    }

    return { success: true };
  }

  // ========================================================================
  // LATE FEE SETTINGS MANAGEMENT
  // ========================================================================

  /**
   * Get late fee settings for an institution/campus
   */
  async getLateFeeSettings(filters?: {
    institutionId?: string;
    campusId?: string;
  }) {
    try {
      const settings = await this.prisma.systemConfig.findFirst({
        where: {
          key: 'late_fee_settings',
          ...(filters?.institutionId && { institutionId: filters.institutionId }),
          ...(filters?.campusId && { campusId: filters.campusId }),
        }
      });

      const defaultSettings = {
        dueDateSettings: {
          defaultDaysFromEnrollment: 30,
          defaultDaysFromTermStart: 15,
          respectHolidays: true,
          extendDueDateOnWeekends: true,
          extendDueDateOnHolidays: true,
          termBasedDueDates: [],
        },
        lateFeeSettings: {
          enableLateFees: true,
          autoApplyLateFees: false,
          defaultGracePeriodDays: 7,
          notificationSettings: {
            sendLateFeeNotifications: true,
            notifyBeforeApplication: true,
            notificationDaysBefore: 3,
            escalationEnabled: true,
            escalationDays: [7, 14, 30],
          },
          waiverSettings: {
            allowWaiverRequests: true,
            requireApproval: true,
            maxWaiverPercentage: 100,
            waiverReasons: [
              'Financial hardship',
              'Medical emergency',
              'Administrative error',
              'Student withdrawal',
              'Payment processing delay',
              'Other'
            ],
          },
        },
        reportingSettings: {
          enableAnalytics: true,
          retentionPeriodMonths: 24,
          archiveOldRecords: true,
        },
      };

      return {
        success: true,
        settings: settings ? { ...defaultSettings, ...JSON.parse(String(settings.value ?? '{}')) } : defaultSettings,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch late fee settings",
        cause: error,
      });
    }
  }

  /**
   * Update late fee settings
   */
  async updateLateFeeSettings(
    data: {
      dueDateSettings?: {
        defaultDaysFromEnrollment?: number;
        defaultDaysFromTermStart?: number;
        respectHolidays?: boolean;
        extendDueDateOnWeekends?: boolean;
        extendDueDateOnHolidays?: boolean;
        termBasedDueDates?: Array<{
          termId: string;
          dueDate: Date;
          description: string;
        }>;
      };
      lateFeeSettings?: {
        enableLateFees?: boolean;
        autoApplyLateFees?: boolean;
        defaultGracePeriodDays?: number;
        notificationSettings?: {
          sendLateFeeNotifications?: boolean;
          notifyBeforeApplication?: boolean;
          notificationDaysBefore?: number;
          escalationEnabled?: boolean;
          escalationDays?: number[];
        };
        waiverSettings?: {
          allowWaiverRequests?: boolean;
          requireApproval?: boolean;
          maxWaiverPercentage?: number;
          waiverReasons?: string[];
        };
      };
      reportingSettings?: {
        enableAnalytics?: boolean;
        retentionPeriodMonths?: number;
        archiveOldRecords?: boolean;
      };
    },
    filters?: {
      institutionId?: string;
      campusId?: string;
    },
    updatedById?: string
  ) {
    try {
      // Get existing settings
      const existingSettings = await this.getLateFeeSettings(filters);

      // Merge with new data
      const updatedSettings = {
        ...existingSettings.settings,
        ...data,
        dueDateSettings: {
          ...existingSettings.settings.dueDateSettings,
          ...data.dueDateSettings,
        },
        lateFeeSettings: {
          ...existingSettings.settings.lateFeeSettings,
          ...data.lateFeeSettings,
          notificationSettings: {
            ...existingSettings.settings.lateFeeSettings.notificationSettings,
            ...data.lateFeeSettings?.notificationSettings,
          },
          waiverSettings: {
            ...existingSettings.settings.lateFeeSettings.waiverSettings,
            ...data.lateFeeSettings?.waiverSettings,
          },
        },
        reportingSettings: {
          ...existingSettings.settings.reportingSettings,
          ...data.reportingSettings,
        },
      };

      // Upsert settings
      await this.prisma.systemConfig.upsert({
        where: {
          key: 'late_fee_settings'
        },
        create: {
          key: 'late_fee_settings',
          value: updatedSettings as any,
          category: 'fee_management',
          createdById: updatedById || 'system',
        },
        update: {
          value: updatedSettings as any,
          updatedById: updatedById || 'system',
        }
      });

      return {
        success: true,
        settings: updatedSettings,
        message: "Late fee settings updated successfully",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update late fee settings",
        cause: error,
      });
    }
  }

  /**
   * Get due date calculation for enrollment
   */
  async calculateDueDate(
    enrollmentId: string,
    termId?: string,
    customDays?: number
  ): Promise<Date> {
    try {
      const enrollment = await this.prisma.studentEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          class: {
            include: {
              campus: { select: { id: true, institutionId: true } }
            }
          }
        }
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Enrollment not found",
        });
      }

      // Get late fee settings
      const settingsResult = await this.getLateFeeSettings({
        institutionId: enrollment.class.campus.institutionId,
        campusId: enrollment.class.campusId,
      });

      const { dueDateSettings } = settingsResult.settings;

      // Check for term-specific due date
      if (termId && dueDateSettings.termBasedDueDates.length > 0) {
        const termDueDate = dueDateSettings.termBasedDueDates.find(
          (tdd: any) => tdd.termId === termId
        );
        if (termDueDate) {
          return new Date(termDueDate.dueDate);
        }
      }

      // Calculate due date based on enrollment date
      const baseDate = enrollment.createdAt;
      const daysToAdd = customDays || dueDateSettings.defaultDaysFromEnrollment;

      let dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Adjust for weekends if configured
      if (dueDateSettings.extendDueDateOnWeekends) {
        while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
          dueDate.setDate(dueDate.getDate() + 1);
        }
      }

      // TODO: Add holiday checking logic here if needed
      // This would require a holidays table or external API

      return dueDate;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate due date",
        cause: error,
      });
    }
  }

  /**
   * Get comprehensive fee management settings
   */
  async getFeeManagementSettings(filters?: {
    institutionId?: string;
    campusId?: string;
  }) {
    try {
      const [
        generalSettings,
        lateFeeSettings,
        currencySettings,
        receiptSettings,
        notificationSettings
      ] = await Promise.all([
        this.getSettings('general', filters),
        this.getLateFeeSettings(filters),
        this.getSettings('currency', filters),
        this.getSettings('receipt', filters),
        this.getSettings('notifications', filters),
      ]);

      return {
        success: true,
        settings: {
          general: generalSettings.settings,
          lateFee: lateFeeSettings.settings,
          currency: currencySettings.settings,
          receipt: receiptSettings.settings,
          notifications: notificationSettings.settings,
        }
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch fee management settings",
        cause: error,
      });
    }
  }
}
