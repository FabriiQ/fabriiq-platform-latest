/**
 * Static Data Router
 * 
 * This router serves static data from cache instead of making database queries.
 * This eliminates the 281 timezone queries and other static data fetching issues.
 */

import { createTRPCRouter, publicProcedure } from "../trpc";
import { staticDataCache } from "@/lib/static-data-cache";
import { logger } from "../utils/logger";

export const staticDataRouter = createTRPCRouter({
  /**
   * Get timezone data (replaces 281 database queries)
   */
  getTimezones: publicProcedure
    .query(async () => {
      try {
        const startTime = performance.now();
        const timezones = staticDataCache.getTimezones();
        const duration = performance.now() - startTime;
        
        logger.debug('[STATIC-DATA] Served timezone data from cache', {
          count: timezones.length,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return timezones;
      } catch (error) {
        logger.error('[STATIC-DATA] Error serving timezone data', { error });
        throw error;
      }
    }),

  /**
   * Get user types
   */
  getUserTypes: publicProcedure
    .query(async () => {
      try {
        const startTime = performance.now();
        const userTypes = staticDataCache.getUserTypes();
        const duration = performance.now() - startTime;
        
        logger.debug('[STATIC-DATA] Served user types from cache', {
          count: userTypes.length,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return userTypes;
      } catch (error) {
        logger.error('[STATIC-DATA] Error serving user types', { error });
        throw error;
      }
    }),

  /**
   * Get activity types
   */
  getActivityTypes: publicProcedure
    .query(async () => {
      try {
        const startTime = performance.now();
        const activityTypes = staticDataCache.getActivityTypes();
        const duration = performance.now() - startTime;
        
        logger.debug('[STATIC-DATA] Served activity types from cache', {
          count: activityTypes.length,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return activityTypes;
      } catch (error) {
        logger.error('[STATIC-DATA] Error serving activity types', { error });
        throw error;
      }
    }),

  /**
   * Get system status options
   */
  getSystemStatus: publicProcedure
    .query(async () => {
      try {
        const startTime = performance.now();
        const systemStatus = staticDataCache.getSystemStatus();
        const duration = performance.now() - startTime;
        
        logger.debug('[STATIC-DATA] Served system status from cache', {
          count: systemStatus.length,
          duration: `${duration.toFixed(2)}ms`
        });
        
        return systemStatus;
      } catch (error) {
        logger.error('[STATIC-DATA] Error serving system status', { error });
        throw error;
      }
    }),

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats: publicProcedure
    .query(async () => {
      try {
        const stats = staticDataCache.getCacheStats();
        
        logger.debug('[STATIC-DATA] Served cache stats', stats);
        
        return {
          ...stats,
          hitRate: stats.size > 0 ? 1.0 : 0.0, // Since we're serving from cache
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('[STATIC-DATA] Error serving cache stats', { error });
        throw error;
      }
    }),

  /**
   * Preload all static data (for admin use)
   */
  preloadStaticData: publicProcedure
    .mutation(async () => {
      try {
        const startTime = performance.now();
        staticDataCache.preloadStaticData();
        const duration = performance.now() - startTime;
        
        logger.info('[STATIC-DATA] Preloaded all static data', {
          duration: `${duration.toFixed(2)}ms`
        });
        
        return {
          success: true,
          message: 'Static data preloaded successfully',
          duration: `${duration.toFixed(2)}ms`,
          cacheStats: staticDataCache.getCacheStats(),
        };
      } catch (error) {
        logger.error('[STATIC-DATA] Error preloading static data', { error });
        throw error;
      }
    }),

  /**
   * Clear static data cache (for admin use)
   */
  clearCache: publicProcedure
    .mutation(async () => {
      try {
        staticDataCache.clearCache();
        
        logger.info('[STATIC-DATA] Cleared static data cache');
        
        return {
          success: true,
          message: 'Static data cache cleared successfully',
        };
      } catch (error) {
        logger.error('[STATIC-DATA] Error clearing cache', { error });
        throw error;
      }
    }),
});
