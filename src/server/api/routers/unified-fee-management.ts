/**
 * Unified Fee Management tRPC Router
 * Consolidates all fee management endpoints into a single router
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UnifiedFeeManagementService } from "@/server/api/services/unified-fee-management.service";
import { 
  unifiedFeeConfigSchema, 
  feeConfigUpdateSchema, 
  feeConfigSectionSchema,
  FeeConfigSection 
} from "@/types/fee-management-unified";

export const unifiedFeeManagementRouter = createTRPCRouter({
  // ========================================================================
  // CONFIGURATION ENDPOINTS
  // ========================================================================

  /**
   * Get complete fee management configuration
   */
  getConfiguration: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const configuration = await service.getConfiguration(input);
        return {
          success: true,
          configuration,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get fee configuration",
          cause: error,
        });
      }
    }),

  /**
   * Update fee management configuration
   */
  updateConfiguration: protectedProcedure
    .input(z.object({
      updates: feeConfigUpdateSchema,
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const configuration = await service.updateConfiguration(
          input.updates,
          {
            institutionId: input.institutionId,
            campusId: input.campusId,
          },
          ctx.session.user.id
        );

        return {
          success: true,
          message: "Configuration updated successfully",
          configuration,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update fee configuration",
          cause: error,
        });
      }
    }),

  /**
   * Get specific configuration section
   */
  getConfigurationSection: protectedProcedure
    .input(z.object({
      section: feeConfigSectionSchema,
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const sectionData = await service.getConfigurationSection(
          input.section,
          {
            institutionId: input.institutionId,
            campusId: input.campusId,
          }
        );

        return {
          success: true,
          section: input.section,
          data: sectionData,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get ${input.section} configuration`,
          cause: error,
        });
      }
    }),

  /**
   * Update specific configuration section
   */
  updateConfigurationSection: protectedProcedure
    .input(z.object({
      section: feeConfigSectionSchema,
      updates: z.record(z.any()), // Dynamic based on section
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const updatedSection = await service.updateConfigurationSection(
          input.section,
          input.updates,
          {
            institutionId: input.institutionId,
            campusId: input.campusId,
          },
          ctx.session.user.id
        );

        return {
          success: true,
          message: `${input.section} configuration updated successfully`,
          section: input.section,
          data: updatedSection,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update ${input.section} configuration`,
          cause: error,
        });
      }
    }),

  // ========================================================================
  // LATE FEE CALCULATIONS
  // ========================================================================

  /**
   * Calculate late fee for given parameters
   */
  calculateLateFee: protectedProcedure
    .input(z.object({
      principalAmount: z.number().min(0),
      daysOverdue: z.number().min(0),
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const calculation = await service.calculateLateFee(
          input.principalAmount,
          input.daysOverdue,
          {
            institutionId: input.institutionId,
            campusId: input.campusId,
          }
        );

        return {
          success: true,
          calculation,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate late fee",
          cause: error,
        });
      }
    }),

  /**
   * Preview late fee calculation with different scenarios
   */
  previewLateFeeScenarios: protectedProcedure
    .input(z.object({
      principalAmount: z.number().min(0),
      scenarios: z.array(z.object({
        name: z.string(),
        daysOverdue: z.number().min(0),
      })),
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const scenarios = await Promise.all(
          input.scenarios.map(async (scenario) => {
            const calculation = await service.calculateLateFee(
              input.principalAmount,
              scenario.daysOverdue,
              {
                institutionId: input.institutionId,
                campusId: input.campusId,
              }
            );

            return {
              name: scenario.name,
              daysOverdue: scenario.daysOverdue,
              ...calculation,
            };
          })
        );

        return {
          success: true,
          principalAmount: input.principalAmount,
          scenarios,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to preview late fee scenarios",
          cause: error,
        });
      }
    }),

  // ========================================================================
  // VALIDATION AND MIGRATION
  // ========================================================================

  /**
   * Validate configuration
   */
  validateConfiguration: protectedProcedure
    .input(feeConfigUpdateSchema)
    .query(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        const validation = await service.validateConfiguration(input);
        return {
          success: true,
          validation,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate configuration",
          cause: error,
        });
      }
    }),

  /**
   * Migrate existing settings to unified configuration
   */
  migrateExistingSettings: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      dryRun: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        if (input.dryRun) {
          // For dry run, just validate what would be migrated
          const currentConfig = await service.getConfiguration({
            institutionId: input.institutionId,
            campusId: input.campusId,
          });
          
          return {
            success: true,
            dryRun: true,
            message: "Migration preview completed",
            currentConfiguration: currentConfig,
          };
        }

        const migration = await service.migrateExistingSettings({
          institutionId: input.institutionId,
          campusId: input.campusId,
        });

        return {
          success: migration.success,
          dryRun: false,
          message: migration.success 
            ? "Settings migrated successfully" 
            : "Migration completed with errors",
          migratedSections: migration.migratedSections,
          errors: migration.errors,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to migrate settings",
          cause: error,
        });
      }
    }),

  // ========================================================================
  // UTILITY ENDPOINTS
  // ========================================================================

  /**
   * Get configuration schema for UI generation
   */
  getConfigurationSchema: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        success: true,
        schema: unifiedFeeConfigSchema,
        sections: [
          { key: 'general', label: 'General Settings', description: 'Currency, due dates, and payment methods' },
          { key: 'lateFees', label: 'Late Fees', description: 'Late fee calculation and automation settings' },
          { key: 'receipts', label: 'Receipts', description: 'Receipt generation and delivery settings' },
          { key: 'notifications', label: 'Notifications', description: 'Email, SMS, and push notification settings' },
          { key: 'reporting', label: 'Reporting', description: 'Analytics and export settings' },
          { key: 'system', label: 'System', description: 'Advanced system configuration' },
        ],
      };
    }),

  /**
   * Reset configuration to defaults
   */
  resetToDefaults: protectedProcedure
    .input(z.object({
      sections: z.array(feeConfigSectionSchema).optional(),
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      confirm: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.confirm) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Confirmation required to reset configuration",
        });
      }

      const service = new UnifiedFeeManagementService(ctx.prisma);
      
      try {
        // Get default configuration
        const defaultConfig = await service.getConfiguration({
          institutionId: input.institutionId,
          campusId: input.campusId,
        });

        // If specific sections are requested, only reset those
        if (input.sections && input.sections.length > 0) {
          const currentConfig = await service.getConfiguration({
            institutionId: input.institutionId,
            campusId: input.campusId,
          });

          const resetUpdates: any = {};
          for (const section of input.sections) {
            resetUpdates[section] = defaultConfig[section];
          }

          await service.updateConfiguration(
            resetUpdates,
            {
              institutionId: input.institutionId,
              campusId: input.campusId,
            },
            ctx.session.user.id
          );

          return {
            success: true,
            message: `Reset ${input.sections.join(', ')} to defaults`,
            resetSections: input.sections,
          };
        } else {
          // Reset entire configuration
          await service.updateConfiguration(
            defaultConfig,
            {
              institutionId: input.institutionId,
              campusId: input.campusId,
            },
            ctx.session.user.id
          );

          return {
            success: true,
            message: "All settings reset to defaults",
            resetSections: ['all'],
          };
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset configuration",
          cause: error,
        });
      }
    }),

  // ========================================================================
  // LATE FEE POLICY MANAGEMENT
  // ========================================================================

  /**
   * Get late fee policy
   */
  getLateFeePolicy: protectedProcedure
    .input(z.object({
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      return service.getLateFeePolicy(input);
    }),

  /**
   * Create late fee policy
   */
  createLateFeePolicy: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      calculationType: z.enum(['FIXED', 'PERCENTAGE', 'TIERED', 'COMPOUND']),
      configuration: z.record(z.any()),
      institutionId: z.string().optional(),
      campusId: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      return service.createLateFeePolicy({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  /**
   * Update late fee policy
   */
  updateLateFeePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      calculationType: z.enum(['FIXED', 'PERCENTAGE', 'TIERED', 'COMPOUND']).optional(),
      configuration: z.record(z.any()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      return service.updateLateFeePolicy({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  /**
   * Delete late fee policy
   */
  deleteLateFeePolicy: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const service = new UnifiedFeeManagementService(ctx.prisma);
      return service.deleteLateFeePolicy(input.id);
    }),
});
