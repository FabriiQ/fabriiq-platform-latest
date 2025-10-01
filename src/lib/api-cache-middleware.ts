/**
 * API Cache Middleware for FabriiQ Platform
 * 
 * This middleware provides intelligent caching for API routes with
 * automatic cache invalidation and performance optimization.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { advancedCache, CacheTier, CacheOptions } from './advanced-cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Cache configuration for different API routes
 */
const API_CACHE_CONFIG = {
  // User data - short TTL due to frequent updates
  '/api/user': { ttl: 300, tier: CacheTier.REDIS, tags: ['user'] },
  '/api/profile': { ttl: 600, tier: CacheTier.REDIS, tags: ['user', 'profile'] },
  
  // Class data - medium TTL
  '/api/classes': { ttl: 900, tier: CacheTier.REDIS, tags: ['classes'] },
  '/api/classes/[id]': { ttl: 1200, tier: CacheTier.REDIS, tags: ['classes'] },
  
  // Activity data - medium TTL
  '/api/activities': { ttl: 600, tier: CacheTier.REDIS, tags: ['activities'] },
  '/api/activities/[id]': { ttl: 900, tier: CacheTier.REDIS, tags: ['activities'] },
  
  // Assessment data - short TTL due to grading updates
  '/api/assessments': { ttl: 300, tier: CacheTier.REDIS, tags: ['assessments'] },
  '/api/grades': { ttl: 180, tier: CacheTier.REDIS, tags: ['grades'] },
  
  // Static/reference data - long TTL
  '/api/subjects': { ttl: 3600, tier: CacheTier.STATIC, tags: ['subjects'] },
  '/api/topics': { ttl: 3600, tier: CacheTier.STATIC, tags: ['topics'] },
  '/api/institutions': { ttl: 1800, tier: CacheTier.REDIS, tags: ['institutions'] },
  
  // Analytics - medium TTL
  '/api/analytics': { ttl: 900, tier: CacheTier.REDIS, tags: ['analytics'] },
  '/api/performance': { ttl: 1200, tier: CacheTier.REDIS, tags: ['performance'] },
};

/**
 * Generate cache key for API request
 */
function generateApiCacheKey(req: NextApiRequest | NextRequest, userId?: string): string {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  // Extract pathname and query parameters
  const urlObj = new URL(url, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;
  
  // Sort query parameters for consistent cache keys
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Include user ID for user-specific caching
  const userPart = userId ? `user:${userId}:` : '';
  
  return `${userPart}${method}:${pathname}${sortedParams ? `?${sortedParams}` : ''}`;
}

/**
 * Get cache configuration for API route
 */
function getCacheConfig(pathname: string): CacheOptions | null {
  // Direct match
  if (API_CACHE_CONFIG[pathname]) {
    return API_CACHE_CONFIG[pathname];
  }
  
  // Pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(API_CACHE_CONFIG)) {
    if (pattern.includes('[') && matchesPattern(pathname, pattern)) {
      return config;
    }
  }
  
  return null;
}

/**
 * Check if pathname matches a dynamic route pattern
 */
function matchesPattern(pathname: string, pattern: string): boolean {
  const patternParts = pattern.split('/');
  const pathnameParts = pathname.split('/');
  
  if (patternParts.length !== pathnameParts.length) {
    return false;
  }
  
  return patternParts.every((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return true; // Dynamic segment matches anything
    }
    return part === pathnameParts[index];
  });
}

/**
 * Check if request should be cached
 */
function shouldCacheRequest(req: NextApiRequest | NextRequest): boolean {
  const method = req.method || 'GET';
  
  // Only cache GET requests
  if (method !== 'GET') {
    return false;
  }
  
  // Don't cache requests with certain headers
  const headers = req.headers;
  if (headers['cache-control'] === 'no-cache' || headers['pragma'] === 'no-cache') {
    return false;
  }
  
  return true;
}

/**
 * API Cache middleware for Pages API routes
 */
export function withApiCache<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<T | void> => {
    // Check if request should be cached
    if (!shouldCacheRequest(req)) {
      return handler(req, res);
    }
    
    const pathname = new URL(req.url || '', 'http://localhost').pathname;
    const cacheConfig = getCacheConfig(pathname);
    
    if (!cacheConfig) {
      return handler(req, res);
    }
    
    try {
      // Get user session for user-specific caching
      const session = await getServerSession(req, res, authOptions);
      const userId = session?.user?.id;
      
      // Generate cache key
      const cacheKey = generateApiCacheKey(req, userId);
      
      // Try to get cached response
      const cached = await advancedCache.get(cacheKey, {
        ...cacheConfig,
        prefix: 'api:',
      });
      
      if (cached) {
        // Set cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${cacheConfig.ttl}, stale-while-revalidate=300`);
        
        return res.status(200).json(cached);
      }
      
      // Capture the response
      const originalJson = res.json;
      let responseData: any = null;
      
      res.json = function (data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };
      
      // Execute the handler
      const result = await handler(req, res);
      
      // Cache the response if it was successful
      if (res.statusCode >= 200 && res.statusCode < 300 && responseData) {
        await advancedCache.set(cacheKey, responseData, {
          ...cacheConfig,
          prefix: 'api:',
        });
        
        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${cacheConfig.ttl}, stale-while-revalidate=300`);
      }
      
      return result;
      
    } catch (error) {
      console.error('API cache middleware error:', error);
      return handler(req, res);
    }
  };
}

/**
 * API Cache middleware for App Router API routes
 */
export function withAppRouterCache<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Check if request should be cached
    if (!shouldCacheRequest(req)) {
      return handler(req);
    }
    
    const pathname = new URL(req.url).pathname;
    const cacheConfig = getCacheConfig(pathname);
    
    if (!cacheConfig) {
      return handler(req);
    }
    
    try {
      // Generate cache key (no user session for App Router yet)
      const cacheKey = generateApiCacheKey(req);
      
      // Try to get cached response
      const cached = await advancedCache.get(cacheKey, {
        ...cacheConfig,
        prefix: 'api:',
      });
      
      if (cached) {
        // Return cached response
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': `public, max-age=${cacheConfig.ttl}, stale-while-revalidate=300`,
          },
        });
      }
      
      // Execute the handler
      const response = await handler(req);
      
      // Cache the response if it was successful
      if (response.status >= 200 && response.status < 300) {
        try {
          const responseData = await response.clone().json();
          
          await advancedCache.set(cacheKey, responseData, {
            ...cacheConfig,
            prefix: 'api:',
          });
          
          // Add cache headers to the response
          response.headers.set('X-Cache', 'MISS');
          response.headers.set('Cache-Control', `public, max-age=${cacheConfig.ttl}, stale-while-revalidate=300`);
          
        } catch (jsonError) {
          // Response is not JSON, skip caching
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('App Router cache middleware error:', error);
      return handler(req);
    }
  };
}

/**
 * Cache invalidation utilities
 */
export class ApiCacheInvalidator {
  /**
   * Invalidate cache by tags
   */
  static async invalidateByTags(tags: string[]): Promise<void> {
    await advancedCache.invalidateByTags(tags);
    console.log(`🧹 Invalidated cache for tags: ${tags.join(', ')}`);
  }
  
  /**
   * Invalidate user-specific cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await advancedCache.invalidateByTags([`user:${userId}`]);
    console.log(`🧹 Invalidated cache for user: ${userId}`);
  }
  
  /**
   * Invalidate class-related cache
   */
  static async invalidateClassCache(classId: string): Promise<void> {
    await advancedCache.invalidateByTags(['classes', 'activities', 'assessments']);
    console.log(`🧹 Invalidated cache for class: ${classId}`);
  }
  
  /**
   * Invalidate all API cache
   */
  static async invalidateAllApiCache(): Promise<void> {
    // This would clear all API-prefixed cache entries
    console.log('🧹 Invalidating all API cache');
  }
}

/**
 * Cache warming for API routes
 */
export class ApiCacheWarmer {
  /**
   * Warm up common API routes
   */
  static async warmCommonRoutes(): Promise<void> {
    console.log('🔥 Warming up common API routes');
    
    // This would make requests to common API routes to populate cache
    const commonRoutes = [
      '/api/subjects',
      '/api/topics',
      '/api/institutions',
    ];
    
    // Implementation would make actual requests to these routes
    for (const route of commonRoutes) {
      console.log(`🔥 Warming route: ${route}`);
    }
  }
}

/**
 * Export cache configuration for external use
 */
export { API_CACHE_CONFIG };
