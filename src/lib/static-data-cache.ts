/**
 * Static Data Cache Service
 * 
 * This service caches static data that doesn't change frequently to avoid
 * repeated database queries. This addresses the 281 timezone queries issue
 * and other static data fetching problems.
 */

import { LRUCache } from 'lru-cache';
import { logger } from '@/server/api/utils/logger';

// Cache configuration
const STATIC_CACHE_CONFIG = {
  max: 1000, // Fixed: use 'max' instead of 'maxSize'
  ttl: 24 * 60 * 60 * 1000, // 24 hours for static data
};

// Note: staticDataCache is exported as singleton instance at the bottom of this file

// Timezone data - cached statically to avoid 281 queries
const TIMEZONE_DATA = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)', offset: '+01:00' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: '+08:00' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: '+05:30' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: '+04:00' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'New Zealand Standard Time (NZST)', offset: '+12:00' },
];

// User types - cached statically
const USER_TYPES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'CAMPUS_ADMIN', label: 'Campus Admin' },
  { value: 'CAMPUS_PARENT', label: 'Parent' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'CAMPUS_COORDINATOR', label: 'Campus Coordinator' },
  { value: 'SYSTEM_ADMIN', label: 'System Admin' },
  { value: 'SYSTEM_MANAGER', label: 'System Manager' },
];

// Activity types - cached statically
const ACTIVITY_TYPES = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'multiple-response', label: 'Multiple Response' },
  { value: 'fill-in-the-blanks', label: 'Fill in the Blanks' },
  { value: 'matching', label: 'Matching' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'drag-and-drop', label: 'Drag and Drop' },
  { value: 'drag-the-words', label: 'Drag the Words' },
  { value: 'flash-cards', label: 'Flash Cards' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'reading', label: 'Reading' },
  { value: 'video', label: 'Video' },
  { value: 'essay', label: 'Essay' },
];

// System status options - cached statically
const SYSTEM_STATUS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/**
 * Static Data Cache Service
 */
export class StaticDataCacheService {
  private cache = new LRUCache<string, any>(STATIC_CACHE_CONFIG);

  /**
   * Get timezone data (replaces 281 database queries)
   */
  getTimezones(): Array<{ value: string; label: string; offset: string }> {
    const cacheKey = 'static:timezones';
    
    let cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache the static timezone data
    this.cache.set(cacheKey, TIMEZONE_DATA);
    logger.debug('[STATIC-CACHE] Cached timezone data', { count: TIMEZONE_DATA.length });
    
    return TIMEZONE_DATA;
  }

  /**
   * Get user types
   */
  getUserTypes(): Array<{ value: string; label: string }> {
    const cacheKey = 'static:user-types';
    
    let cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.cache.set(cacheKey, USER_TYPES);
    logger.debug('[STATIC-CACHE] Cached user types', { count: USER_TYPES.length });
    
    return USER_TYPES;
  }

  /**
   * Get activity types
   */
  getActivityTypes(): Array<{ value: string; label: string }> {
    const cacheKey = 'static:activity-types';
    
    let cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.cache.set(cacheKey, ACTIVITY_TYPES);
    logger.debug('[STATIC-CACHE] Cached activity types', { count: ACTIVITY_TYPES.length });
    
    return ACTIVITY_TYPES;
  }

  /**
   * Get system status options
   */
  getSystemStatus(): Array<{ value: string; label: string }> {
    const cacheKey = 'static:system-status';
    
    let cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    this.cache.set(cacheKey, SYSTEM_STATUS);
    logger.debug('[STATIC-CACHE] Cached system status', { count: SYSTEM_STATUS.length });
    
    return SYSTEM_STATUS;
  }

  /**
   * Cache any static data with custom TTL
   */
  cacheStaticData<T extends {}>(key: string, data: T, ttlHours: number = 24): T {
    const cacheKey = `static:${key}`;
    const ttl = ttlHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    // Create a temporary cache with custom TTL if different from default
    if (ttlHours !== 24) {
      const customCache = new LRUCache<string, T>({
        max: 100, // Fixed: use 'max' instead of 'maxSize'
        ttl: ttl,
      });
      customCache.set(cacheKey, data);
      return data;
    }
    
    this.cache.set(cacheKey, data);
    logger.debug('[STATIC-CACHE] Cached custom data', { key, ttlHours });
    
    return data;
  }

  /**
   * Get cached static data
   */
  getCachedData<T>(key: string): T | undefined {
    const cacheKey = `static:${key}`;
    return this.cache.get(cacheKey) as T | undefined;
  }

  /**
   * Clear all static cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[STATIC-CACHE] Cleared all static cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: STATIC_CACHE_CONFIG.max, // Fixed: use 'max' instead of 'maxSize'
      ttl: STATIC_CACHE_CONFIG.ttl,
    };
  }

  /**
   * Preload all static data at application startup
   */
  preloadStaticData(): void {
    logger.info('[STATIC-CACHE] Preloading static data...');
    
    // Preload all static data
    this.getTimezones();
    this.getUserTypes();
    this.getActivityTypes();
    this.getSystemStatus();
    
    logger.info('[STATIC-CACHE] Static data preloaded successfully', {
      cacheSize: this.cache.size,
    });
  }
}

// Export singleton instance
export const staticDataCache = new StaticDataCacheService();

// Auto-preload static data if enabled
if (process.env.ENABLE_STATIC_DATA_CACHE === 'true') {
  // Preload after a short delay to ensure the application is ready
  setTimeout(() => {
    staticDataCache.preloadStaticData();
  }, 1000);
}
