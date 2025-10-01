/**
 * Migration Script: Consolidate Fee Management Settings
 * 
 * This script migrates existing scattered fee management settings
 * into the new unified configuration structure.
 */

import { PrismaClient } from "@prisma/client";
import { UnifiedFeeManagementService } from "@/server/api/services/unified-fee-management.service";
import { DEFAULT_CURRENCY } from "@/data/currencies";

const prisma = new PrismaClient();

interface MigrationResult {
  success: boolean;
  migratedSettings: string[];
  errors: string[];
  warnings: string[];
}

async function migrateExistingFeeSettings(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedSettings: [],
    errors: [],
    warnings: [],
  };

  try {
    console.log("🚀 Starting fee management settings migration...");

    // Initialize the unified service
    const unifiedService = new UnifiedFeeManagementService(prisma);

    // Get all existing fee-related system configurations
    const existingConfigs = await prisma.systemConfig.findMany({
      where: {
        category: 'fee_management',
        key: {
          in: [
            'fee_settings',
            'late_fee_settings', 
            'receipt_settings',
            'notification_settings',
            'currency_settings',
            'due_date_settings'
          ]
        }
      }
    });

    console.log(`📋 Found ${existingConfigs.length} existing configurations to migrate`);

    // Group configurations by institution/campus if they exist
    const configGroups = new Map<string, typeof existingConfigs>();
    
    for (const config of existingConfigs) {
      const metadata = config.metadata as any;
      const groupKey = `${metadata?.institutionId || 'global'}-${metadata?.campusId || 'global'}`;
      
      if (!configGroups.has(groupKey)) {
        configGroups.set(groupKey, []);
      }
      configGroups.get(groupKey)!.push(config);
    }

    console.log(`🏢 Processing ${configGroups.size} configuration groups`);

    // Migrate each group
    for (const [groupKey, configs] of configGroups) {
      try {
        const [institutionId, campusId] = groupKey.split('-');
        const filters = {
          institutionId: institutionId !== 'global' ? institutionId : undefined,
          campusId: campusId !== 'global' ? campusId : undefined,
        };

        console.log(`📦 Migrating group: ${groupKey}`);

        // Get default configuration as base
        const defaultConfig = await unifiedService.getConfiguration(filters);
        let unifiedConfig = { ...defaultConfig };

        // Process each existing configuration
        for (const config of configs) {
          try {
            const configValue = config.value as any;
            
            switch (config.key) {
              case 'fee_settings':
                console.log(`  ⚙️  Migrating general fee settings...`);
                
                // Migrate currency settings
                if (configValue.currency) {
                  unifiedConfig.general.currency = {
                    code: configValue.currency.code || DEFAULT_CURRENCY.code,
                    symbol: configValue.currency.symbol || DEFAULT_CURRENCY.symbol,
                    name: configValue.currency.name || DEFAULT_CURRENCY.name,
                    region: configValue.currency.region || DEFAULT_CURRENCY.region,
                  };
                }

                // Migrate due date settings
                if (configValue.dueDateSettings) {
                  unifiedConfig.general.dueDates = {
                    ...unifiedConfig.general.dueDates,
                    defaultDaysFromEnrollment: configValue.dueDateSettings.defaultDueDays || 30,
                    defaultDaysFromTermStart: configValue.dueDateSettings.defaultDaysFromTermStart || 15,
                    respectHolidays: configValue.dueDateSettings.respectHolidays ?? true,
                    extendOnWeekends: configValue.dueDateSettings.extendDueDateOnWeekends ?? true,
                    extendOnHolidays: configValue.dueDateSettings.extendDueDateOnHolidays ?? true,
                  };
                }

                result.migratedSettings.push('general');
                break;

              case 'late_fee_settings':
                console.log(`  💰 Migrating late fee settings...`);
                
                if (configValue.enableLateFees !== undefined) {
                  unifiedConfig.lateFees.enabled = configValue.enableLateFees;
                }
                
                if (configValue.gracePeriodDays !== undefined) {
                  unifiedConfig.lateFees.gracePeriod.days = configValue.gracePeriodDays;
                }
                
                if (configValue.lateFeeAmount !== undefined) {
                  unifiedConfig.lateFees.calculation.fixedAmount = configValue.lateFeeAmount;
                }
                
                if (configValue.lateFeeType) {
                  unifiedConfig.lateFees.calculation.type = configValue.lateFeeType === 'PERCENTAGE' 
                    ? 'PERCENTAGE' 
                    : 'FIXED';
                }
                
                if (configValue.autoApply !== undefined) {
                  unifiedConfig.lateFees.automation.autoApply = configValue.autoApply;
                }

                // Migrate notification settings if they exist
                if (configValue.notificationSettings) {
                  unifiedConfig.lateFees.automation.dryRunFirst = !configValue.notificationSettings.sendLateFeeNotifications;
                }

                result.migratedSettings.push('lateFees');
                break;

              case 'receipt_settings':
                console.log(`  🧾 Migrating receipt settings...`);
                
                if (configValue.enabled !== undefined) {
                  unifiedConfig.receipts.enabled = configValue.enabled;
                }
                
                if (configValue.autoGenerate !== undefined) {
                  unifiedConfig.receipts.autoGenerate = configValue.autoGenerate;
                }
                
                if (configValue.template) {
                  unifiedConfig.receipts.template = configValue.template;
                }
                
                if (configValue.includeQRCode !== undefined) {
                  unifiedConfig.receipts.features.includeQRCode = configValue.includeQRCode;
                }
                
                if (configValue.includeBarcode !== undefined) {
                  unifiedConfig.receipts.features.includeBarcode = configValue.includeBarcode;
                }
                
                if (configValue.footerText) {
                  unifiedConfig.receipts.content.footerText = configValue.footerText;
                }

                result.migratedSettings.push('receipts');
                break;

              case 'notification_settings':
                console.log(`  🔔 Migrating notification settings...`);
                
                if (configValue.enabled !== undefined) {
                  unifiedConfig.notifications.enabled = configValue.enabled;
                }
                
                if (configValue.dueDateReminders) {
                  unifiedConfig.notifications.dueDateReminders = {
                    ...unifiedConfig.notifications.dueDateReminders,
                    enabled: configValue.dueDateReminders.enabled ?? true,
                    daysBefore: configValue.dueDateReminders.daysBefore || [7, 3, 1],
                  };
                }
                
                if (configValue.paymentConfirmations) {
                  unifiedConfig.notifications.paymentConfirmations = {
                    ...unifiedConfig.notifications.paymentConfirmations,
                    enabled: configValue.paymentConfirmations.enabled ?? true,
                    includeReceipt: configValue.paymentConfirmations.sendEmail ?? true,
                  };
                }
                
                if (configValue.overdueNotifications) {
                  unifiedConfig.notifications.overdueNotifications = {
                    ...unifiedConfig.notifications.overdueNotifications,
                    enabled: configValue.overdueNotifications.enabled ?? true,
                    frequency: configValue.overdueNotifications.frequency || 'WEEKLY',
                    escalationDays: configValue.overdueNotifications.escalationDays || [7, 14, 30],
                  };
                }

                result.migratedSettings.push('notifications');
                break;

              default:
                result.warnings.push(`Unknown configuration key: ${config.key}`);
                break;
            }
          } catch (error) {
            result.errors.push(`Failed to migrate ${config.key}: ${error}`);
          }
        }

        // Save the unified configuration
        console.log(`  💾 Saving unified configuration for ${groupKey}...`);
        await unifiedService.updateConfiguration(
          unifiedConfig,
          filters,
          'migration-script'
        );

        console.log(`  ✅ Successfully migrated ${groupKey}`);

      } catch (error) {
        result.errors.push(`Failed to migrate group ${groupKey}: ${error}`);
      }
    }

    // Create backup of old configurations
    console.log(`📦 Creating backup of old configurations...`);
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const config of existingConfigs) {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          key: `${config.key}_backup_${backupTimestamp}`,
          description: `${config.description || ''} (Backup created during migration)`,
        }
      });
    }

    result.success = result.errors.length === 0;
    
    console.log(`🎉 Migration completed!`);
    console.log(`   ✅ Migrated settings: ${[...new Set(result.migratedSettings)].join(', ')}`);
    console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
    console.log(`   ❌ Errors: ${result.errors.length}`);

    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${error}`);
    console.error(`❌ Migration failed:`, error);
    return result;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateExistingFeeSettings()
    .then((result) => {
      if (result.success) {
        console.log("✅ Migration completed successfully!");
        process.exit(0);
      } else {
        console.error("❌ Migration completed with errors:");
        result.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { migrateExistingFeeSettings };
export type { MigrationResult };
