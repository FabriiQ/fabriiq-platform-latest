/**
 * Performance Configuration for Activity System
 * 
 * Centralized configuration for caching, lazy loading, and performance optimizations
 */

import { LRUCache } from 'lru-cache';

// Cache configurations
export const CACHE_CONFIG = {
  // Activity type data cache (rarely changes)
  ACTIVITY_TYPES: {
    ttl: 30 * 60 * 1000, // 30 minutes
    max: 100,
  },
  
  // Subject and topic data cache
  SUBJECTS_TOPICS: {
    ttl: 15 * 60 * 1000, // 15 minutes
    max: 500,
  },
  
  // Class data cache
  CLASS_DATA: {
    ttl: 5 * 60 * 1000, // 5 minutes
    max: 200,
  },
  
  // User session cache
  USER_SESSION: {
    ttl: 2 * 60 * 1000, // 2 minutes
    max: 1000,
  },
  
  // Activity configuration cache
  ACTIVITY_CONFIG: {
    ttl: 10 * 60 * 1000, // 10 minutes
    max: 300,
  },
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Maximum time for activity creation (ms)
  MAX_CREATION_TIME: 5000,
  
  // Maximum time for form validation (ms)
  MAX_VALIDATION_TIME: 500,
  
  // Maximum time for data loading (ms)
  MAX_LOADING_TIME: 3000,
  
  // Debounce time for form inputs (ms)
  FORM_DEBOUNCE_TIME: 300,
  
  // Throttle time for API calls (ms)
  API_THROTTLE_TIME: 1000,
} as const;

// Lazy loading configuration
export const LAZY_LOADING_CONFIG = {
  // Components to lazy load
  LAZY_COMPONENTS: [
    'ActivityEditor',
    'ActivityViewer',
    'ActivityAnalytics',
    'AchievementConfigEditor',
  ],
  
  // Preload priority components
  PRELOAD_COMPONENTS: [
    'UnifiedActivityCreator',
    'SubjectSelector',
    'TopicSelector',
  ],
  
  // Loading timeout (ms)
  LOADING_TIMEOUT: 10000,
} as const;

// Create cache instances
export const activityTypeCache = new LRUCache(CACHE_CONFIG.ACTIVITY_TYPES);
export const subjectsTopicsCache = new LRUCache(CACHE_CONFIG.SUBJECTS_TOPICS);
export const classDataCache = new LRUCache(CACHE_CONFIG.CLASS_DATA);
export const userSessionCache = new LRUCache(CACHE_CONFIG.USER_SESSION);
export const activityConfigCache = new LRUCache(CACHE_CONFIG.ACTIVITY_CONFIG);

// Cache key generators
export const CACHE_KEYS = {
  activityType: (typeId: string) => `activity_type_${typeId}`,
  subjects: (classId: string) => `subjects_${classId}`,
  topics: (subjectId: string) => `topics_${subjectId}`,
  classData: (classId: string) => `class_data_${classId}`,
  userSession: (userId: string) => `user_session_${userId}`,
  activityConfig: (typeId: string, configHash: string) => `activity_config_${typeId}_${configHash}`,
} as const;

// Performance monitoring
export const PERFORMANCE_METRICS = {
  // Track component render times
  COMPONENT_RENDER_TIMES: new Map<string, number[]>(),
  
  // Track API call times
  API_CALL_TIMES: new Map<string, number[]>(),
  
  // Track cache hit rates
  CACHE_HIT_RATES: new Map<string, { hits: number; misses: number }>(),
} as const;

// Performance utilities
export const performanceUtils = {
  // Measure component render time
  measureRenderTime: (componentName: string, renderFn: () => void) => {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (!PERFORMANCE_METRICS.COMPONENT_RENDER_TIMES.has(componentName)) {
      PERFORMANCE_METRICS.COMPONENT_RENDER_TIMES.set(componentName, []);
    }
    
    PERFORMANCE_METRICS.COMPONENT_RENDER_TIMES.get(componentName)!.push(renderTime);
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 100) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
    
    return renderTime;
  },
  
  // Measure API call time
  measureApiCall: async <T>(apiName: string, apiCall: () => Promise<T>): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const callTime = endTime - startTime;
      
      if (!PERFORMANCE_METRICS.API_CALL_TIMES.has(apiName)) {
        PERFORMANCE_METRICS.API_CALL_TIMES.set(apiName, []);
      }
      
      PERFORMANCE_METRICS.API_CALL_TIMES.get(apiName)!.push(callTime);
      
      // Log slow API calls in development
      if (process.env.NODE_ENV === 'development' && callTime > PERFORMANCE_THRESHOLDS.MAX_LOADING_TIME) {
        console.warn(`Slow API call detected: ${apiName} took ${callTime.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const callTime = endTime - startTime;
      
      if (!PERFORMANCE_METRICS.API_CALL_TIMES.has(apiName)) {
        PERFORMANCE_METRICS.API_CALL_TIMES.set(apiName, []);
      }
      
      PERFORMANCE_METRICS.API_CALL_TIMES.get(apiName)!.push(callTime);
      
      throw error;
    }
  },
  
  // Track cache hit/miss
  trackCacheAccess: (cacheKey: string, isHit: boolean) => {
    if (!PERFORMANCE_METRICS.CACHE_HIT_RATES.has(cacheKey)) {
      PERFORMANCE_METRICS.CACHE_HIT_RATES.set(cacheKey, { hits: 0, misses: 0 });
    }
    
    const stats = PERFORMANCE_METRICS.CACHE_HIT_RATES.get(cacheKey)!;
    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
  },
  
  // Get performance report
  getPerformanceReport: () => {
    const report = {
      componentRenderTimes: Object.fromEntries(
        Array.from(PERFORMANCE_METRICS.COMPONENT_RENDER_TIMES.entries()).map(([name, times]) => [
          name,
          {
            count: times.length,
            average: times.reduce((a, b) => a + b, 0) / times.length,
            max: Math.max(...times),
            min: Math.min(...times),
          },
        ])
      ),
      apiCallTimes: Object.fromEntries(
        Array.from(PERFORMANCE_METRICS.API_CALL_TIMES.entries()).map(([name, times]) => [
          name,
          {
            count: times.length,
            average: times.reduce((a, b) => a + b, 0) / times.length,
            max: Math.max(...times),
            min: Math.min(...times),
          },
        ])
      ),
      cacheHitRates: Object.fromEntries(
        Array.from(PERFORMANCE_METRICS.CACHE_HIT_RATES.entries()).map(([key, stats]) => [
          key,
          {
            hitRate: stats.hits / (stats.hits + stats.misses),
            totalAccesses: stats.hits + stats.misses,
            hits: stats.hits,
            misses: stats.misses,
          },
        ])
      ),
    };
    
    return report;
  },
};

// Environment-specific optimizations
export const ENVIRONMENT_CONFIG = {
  development: {
    enablePerformanceLogging: true,
    enableCacheDebugging: true,
    enableComponentProfiling: true,
  },
  production: {
    enablePerformanceLogging: false,
    enableCacheDebugging: false,
    enableComponentProfiling: false,
  },
} as const;

export const currentEnvironmentConfig = ENVIRONMENT_CONFIG[process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIG] || ENVIRONMENT_CONFIG.development;
