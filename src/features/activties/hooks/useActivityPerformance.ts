/**
 * Activity Performance Optimization Hook
 * 
 * Provides performance optimizations for activity components including
 * caching, memoization, and performance monitoring
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  activityTypeCache, 
  subjectsTopicsCache, 
  classDataCache,
  CACHE_KEYS,
  PERFORMANCE_THRESHOLDS,
  performanceUtils,
  currentEnvironmentConfig
} from '../config/performance-config';

interface UseActivityPerformanceOptions {
  componentName: string;
  enableCaching?: boolean;
  enableProfiling?: boolean;
  cacheTimeout?: number;
}

export function useActivityPerformance({
  componentName,
  enableCaching = true,
  enableProfiling = currentEnvironmentConfig.enableComponentProfiling,
  cacheTimeout = 5 * 60 * 1000, // 5 minutes default
}: UseActivityPerformanceOptions) {
  const queryClient = useQueryClient();
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // Track component renders
  useEffect(() => {
    renderCountRef.current++;
    const currentTime = performance.now();
    
    if (enableProfiling && lastRenderTimeRef.current > 0) {
      const renderTime = currentTime - lastRenderTimeRef.current;
      performanceUtils.measureRenderTime(componentName, () => {});
    }
    
    lastRenderTimeRef.current = currentTime;
  });

  // Optimized cache getter with performance tracking
  const getCachedData = useCallback(<T>(
    cacheKey: string,
    cache: any,
    fetchFn: () => Promise<T>
  ): Promise<T> => {
    if (!enableCaching) {
      return fetchFn();
    }

    const cachedValue = cache.get(cacheKey);
    if (cachedValue) {
      performanceUtils.trackCacheAccess(cacheKey, true);
      return Promise.resolve(cachedValue);
    }

    performanceUtils.trackCacheAccess(cacheKey, false);
    
    return performanceUtils.measureApiCall(`cache_fetch_${cacheKey}`, async () => {
      const result = await fetchFn();
      cache.set(cacheKey, result);
      return result;
    });
  }, [enableCaching]);

  // Optimized activity type fetcher
  const getActivityType = useCallback(async (typeId: string) => {
    const cacheKey = CACHE_KEYS.activityType(typeId);
    
    return getCachedData(cacheKey, activityTypeCache, async () => {
      // This would typically be an API call
      // For now, return a mock structure
      return {
        id: typeId,
        name: typeId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category: 'interactive',
        capabilities: {
          isGradable: true,
          hasSubmission: true,
          hasInteraction: true,
        },
      };
    });
  }, [getCachedData]);

  // Optimized subjects fetcher
  const getSubjects = useCallback(async (classId: string) => {
    const cacheKey = CACHE_KEYS.subjects(classId);
    
    return getCachedData(cacheKey, subjectsTopicsCache, async () => {
      // This would typically be a tRPC call
      return queryClient.fetchQuery({
        queryKey: ['subjects', classId],
        queryFn: () => {
          // Mock implementation - replace with actual API call
          return Promise.resolve([
            { id: '1', name: 'Mathematics' },
            { id: '2', name: 'Science' },
            { id: '3', name: 'English' },
          ]);
        },
        staleTime: cacheTimeout,
      });
    });
  }, [getCachedData, queryClient, cacheTimeout]);

  // Optimized topics fetcher
  const getTopics = useCallback(async (subjectId: string) => {
    const cacheKey = CACHE_KEYS.topics(subjectId);
    
    return getCachedData(cacheKey, subjectsTopicsCache, async () => {
      return queryClient.fetchQuery({
        queryKey: ['topics', subjectId],
        queryFn: () => {
          // Mock implementation - replace with actual API call
          return Promise.resolve([
            { id: '1', title: 'Topic 1', code: 'T1' },
            { id: '2', title: 'Topic 2', code: 'T2' },
          ]);
        },
        staleTime: cacheTimeout,
      });
    });
  }, [getCachedData, queryClient, cacheTimeout]);

  // Optimized class data fetcher
  const getClassData = useCallback(async (classId: string) => {
    const cacheKey = CACHE_KEYS.classData(classId);
    
    return getCachedData(cacheKey, classDataCache, async () => {
      return queryClient.fetchQuery({
        queryKey: ['class', classId],
        queryFn: () => {
          // Mock implementation - replace with actual API call
          return Promise.resolve({
            id: classId,
            name: 'Sample Class',
            code: 'SC001',
            status: 'ACTIVE',
          });
        },
        staleTime: cacheTimeout,
      });
    });
  }, [getCachedData, queryClient, cacheTimeout]);

  // Debounced form handler
  const createDebouncedHandler = useCallback((
    handler: (...args: any[]) => void,
    delay: number = PERFORMANCE_THRESHOLDS.FORM_DEBOUNCE_TIME
  ) => {
    const timeoutRef = useRef<NodeJS.Timeout>();
    
    return (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        handler(...args);
      }, delay);
    };
  }, []);

  // Memoized validation function
  const createMemoizedValidator = useCallback(<T>(
    validationFn: (data: T) => boolean | string[],
    dependencies: any[] = []
  ) => {
    return useMemo(() => validationFn, dependencies);
  }, []);

  // Performance monitoring utilities
  const performanceMonitor = useMemo(() => ({
    startTimer: (operationName: string) => {
      const startTime = performance.now();
      return {
        end: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          if (enableProfiling) {
            console.log(`${componentName} - ${operationName}: ${duration.toFixed(2)}ms`);
          }
          
          return duration;
        },
      };
    },
    
    measureAsync: async <T>(operationName: string, asyncFn: () => Promise<T>): Promise<T> => {
      return performanceUtils.measureApiCall(`${componentName}_${operationName}`, asyncFn);
    },
  }), [componentName, enableProfiling]);

  // Cache management utilities
  const cacheManager = useMemo(() => ({
    invalidateActivityType: (typeId: string) => {
      const cacheKey = CACHE_KEYS.activityType(typeId);
      activityTypeCache.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['activityType', typeId] });
    },
    
    invalidateSubjects: (classId: string) => {
      const cacheKey = CACHE_KEYS.subjects(classId);
      subjectsTopicsCache.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['subjects', classId] });
    },
    
    invalidateTopics: (subjectId: string) => {
      const cacheKey = CACHE_KEYS.topics(subjectId);
      subjectsTopicsCache.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['topics', subjectId] });
    },
    
    invalidateClassData: (classId: string) => {
      const cacheKey = CACHE_KEYS.classData(classId);
      classDataCache.delete(cacheKey);
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
    },
    
    clearAllCaches: () => {
      activityTypeCache.clear();
      subjectsTopicsCache.clear();
      classDataCache.clear();
      queryClient.clear();
    },
  }), [queryClient]);

  // Component performance stats
  const getComponentStats = useCallback(() => {
    return {
      renderCount: renderCountRef.current,
      componentName,
      cacheHitRates: performanceUtils.getPerformanceReport().cacheHitRates,
    };
  }, [componentName]);

  return {
    // Data fetchers
    getActivityType,
    getSubjects,
    getTopics,
    getClassData,
    
    // Performance utilities
    createDebouncedHandler,
    createMemoizedValidator,
    performanceMonitor,
    
    // Cache management
    cacheManager,
    
    // Stats
    getComponentStats,
  };
}

// Hook for lazy loading components
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const [component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        const { default: Component } = await importFn();
        if (mounted) {
          setComponent(Component);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [importFn]);

  return { component, loading, error };
}
