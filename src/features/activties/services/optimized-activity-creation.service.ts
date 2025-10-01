/**
 * Optimized Activity Creation Service
 * 
 * High-performance service for activity creation with caching,
 * validation, and error handling optimizations
 */

import { 
  activityConfigCache, 
  CACHE_KEYS, 
  performanceUtils,
  PERFORMANCE_THRESHOLDS 
} from '../config/performance-config';
import { prepareActivityCreateData, validateActivityData } from '../utils/api-integration';

interface ActivityCreationData {
  title: string;
  description?: string;
  purpose: string;
  classId: string;
  subjectId: string;
  topicId?: string;
  activityTypeId: string;
  content: any;
  isGradable?: boolean;
  maxScore?: number;
  passingScore?: number;
  duration?: number;
  settings?: Record<string, any>;
  achievementConfig?: any;
}

interface ActivityCreationResult {
  success: boolean;
  activityId?: string;
  errors?: string[];
  warnings?: string[];
  performanceMetrics?: {
    validationTime: number;
    preparationTime: number;
    creationTime: number;
    totalTime: number;
  };
}

class OptimizedActivityCreationService {
  private validationCache = new Map<string, { isValid: boolean; errors?: string[]; timestamp: number }>();
  private readonly VALIDATION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Create an activity with performance optimizations
   */
  async createActivity(
    data: ActivityCreationData,
    createActivityFn: (preparedData: any) => Promise<{ id: string }>
  ): Promise<ActivityCreationResult> {
    const totalStartTime = performance.now();
    const metrics = {
      validationTime: 0,
      preparationTime: 0,
      creationTime: 0,
      totalTime: 0,
    };

    try {
      // Step 1: Fast validation with caching
      const validationStartTime = performance.now();
      const validationResult = await this.validateActivityDataCached(data);
      metrics.validationTime = performance.now() - validationStartTime;

      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors,
          performanceMetrics: {
            ...metrics,
            totalTime: performance.now() - totalStartTime,
          },
        };
      }

      // Step 2: Prepare data with caching
      const preparationStartTime = performance.now();
      const preparedData = await this.prepareActivityDataCached(data);
      metrics.preparationTime = performance.now() - preparationStartTime;

      // Step 3: Create activity
      const creationStartTime = performance.now();
      const result = await performanceUtils.measureApiCall('activity_creation', () =>
        createActivityFn(preparedData)
      );
      metrics.creationTime = performance.now() - creationStartTime;

      metrics.totalTime = performance.now() - totalStartTime;

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Activity Creation Performance:', metrics);
      }

      // Check for performance warnings
      const warnings: string[] = [];
      if (metrics.totalTime > PERFORMANCE_THRESHOLDS.MAX_CREATION_TIME) {
        warnings.push(`Activity creation took ${metrics.totalTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.MAX_CREATION_TIME}ms)`);
      }

      return {
        success: true,
        activityId: result.id,
        warnings: warnings.length > 0 ? warnings : undefined,
        performanceMetrics: metrics,
      };

    } catch (error) {
      metrics.totalTime = performance.now() - totalStartTime;
      
      console.error('Activity creation failed:', error);
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        performanceMetrics: metrics,
      };
    }
  }

  /**
   * Validate activity data with caching
   */
  private async validateActivityDataCached(data: ActivityCreationData): Promise<{ isValid: boolean; errors?: string[] }> {
    // Create cache key based on data hash
    const dataHash = this.createDataHash(data);
    const cacheKey = `validation_${dataHash}`;
    
    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.VALIDATION_CACHE_TTL) {
      performanceUtils.trackCacheAccess(cacheKey, true);
      return { isValid: cached.isValid, errors: cached.errors };
    }

    performanceUtils.trackCacheAccess(cacheKey, false);

    // Perform validation
    const startTime = performance.now();
    const validationResult = validateActivityData(data, data.activityTypeId);
    const validationTime = performance.now() - startTime;

    // Cache the result
    this.validationCache.set(cacheKey, {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      timestamp: Date.now(),
    });

    // Log slow validations
    if (validationTime > PERFORMANCE_THRESHOLDS.MAX_VALIDATION_TIME) {
      console.warn(`Slow validation detected: ${validationTime.toFixed(2)}ms`);
    }

    return validationResult;
  }

  /**
   * Prepare activity data with caching
   */
  private async prepareActivityDataCached(data: ActivityCreationData): Promise<any> {
    // Create cache key for prepared data
    const configHash = this.createDataHash(data.content);
    const cacheKey = CACHE_KEYS.activityConfig(data.activityTypeId, configHash);
    
    // Check cache first
    const cached = activityConfigCache.get(cacheKey);
    if (cached) {
      performanceUtils.trackCacheAccess(cacheKey, true);
      return { ...cached, ...this.getUncacheableFields(data) };
    }

    performanceUtils.trackCacheAccess(cacheKey, false);

    // Prepare data
    const preparedData = prepareActivityCreateData(data);
    
    // Cache the prepared configuration (excluding dynamic fields)
    const cacheableData = this.extractCacheableFields(preparedData);
    activityConfigCache.set(cacheKey, cacheableData);

    return preparedData;
  }

  /**
   * Create a hash for data caching
   */
  private createDataHash(data: any): string {
    // Simple hash function for caching purposes
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Extract fields that can be cached (non-dynamic)
   */
  private extractCacheableFields(data: any): any {
    const { classId, subjectId, topicId, ...cacheableData } = data;
    return cacheableData;
  }

  /**
   * Get fields that should not be cached (dynamic)
   */
  private getUncacheableFields(data: ActivityCreationData): any {
    return {
      classId: data.classId,
      subjectId: data.subjectId,
      topicId: data.topicId,
    };
  }

  /**
   * Batch create multiple activities with optimizations
   */
  async batchCreateActivities(
    activities: ActivityCreationData[],
    createActivityFn: (preparedData: any) => Promise<{ id: string }>
  ): Promise<ActivityCreationResult[]> {
    const batchStartTime = performance.now();
    
    // Pre-validate all activities
    const validationPromises = activities.map(data => this.validateActivityDataCached(data));
    const validationResults = await Promise.all(validationPromises);
    
    // Filter out invalid activities
    const validActivities = activities.filter((_, index) => validationResults[index].isValid);
    const invalidResults: ActivityCreationResult[] = activities
      .map((_, index) => ({ data: activities[index], validation: validationResults[index], index }))
      .filter(({ validation }) => !validation.isValid)
      .map(({ validation, index }) => ({
        success: false,
        errors: validation.errors,
      }));

    // Batch create valid activities
    const creationPromises = validActivities.map(data => this.createActivity(data, createActivityFn));
    const creationResults = await Promise.all(creationPromises);
    
    const batchTime = performance.now() - batchStartTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Batch created ${validActivities.length} activities in ${batchTime.toFixed(2)}ms`);
    }

    // Merge results maintaining original order
    const results: ActivityCreationResult[] = [];
    let validIndex = 0;
    let invalidIndex = 0;
    
    for (let i = 0; i < activities.length; i++) {
      if (validationResults[i].isValid) {
        results.push(creationResults[validIndex++]);
      } else {
        results.push(invalidResults[invalidIndex++]);
      }
    }
    
    return results;
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { validationCacheSize: number; configCacheSize: number } {
    return {
      validationCacheSize: this.validationCache.size,
      configCacheSize: activityConfigCache.size,
    };
  }
}

// Export singleton instance
export const optimizedActivityCreationService = new OptimizedActivityCreationService();

// Export types
export type { ActivityCreationData, ActivityCreationResult };
