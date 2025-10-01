/**
 * Advanced Caching Strategy for FabriiQ Platform
 * 
 * This module provides a multi-tier caching system with Redis support,
 * fallback to in-memory caching, and intelligent cache invalidation.
 */

import { LRUCache } from 'lru-cache';

// Cache configuration
const CACHE_CONFIG = {
  // Memory cache limits
  MEMORY_CACHE_MAX_SIZE: 1000,
  MEMORY_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  
  // Redis cache TTLs (in seconds)
  REDIS_SHORT_TTL: 300, // 5 minutes
  REDIS_MEDIUM_TTL: 1800, // 30 minutes
  REDIS_LONG_TTL: 3600, // 1 hour
  REDIS_STATIC_TTL: 86400, // 24 hours
  
  // Cache key prefixes
  PREFIXES: {
    USER: 'user:',
    SESSION: 'session:',
    QUERY: 'query:',
    API: 'api:',
    STATIC: 'static:',
    INSTITUTION: 'inst:',
    CLASS: 'class:',
    ACTIVITY: 'activity:',
  }
};

// In-memory cache instances
const memoryCache = new LRUCache<string, any>({
  max: CACHE_CONFIG.MEMORY_CACHE_MAX_SIZE,
  ttl: CACHE_CONFIG.MEMORY_CACHE_TTL,
});

const queryCache = new LRUCache<string, any>({
  max: 2000,
  ttl: CACHE_CONFIG.MEMORY_CACHE_TTL,
});

const staticCache = new LRUCache<string, any>({
  max: 500,
  ttl: CACHE_CONFIG.REDIS_STATIC_TTL * 1000, // Convert to milliseconds
});

// Redis client (optional)
let redisClient: any = null;

/**
 * Initialize Redis client if available
 */
async function initializeRedis() {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      // Dynamic import to avoid errors if Redis is not available
      const redis = await import('redis').catch(() => null);
      if (!redis) {
        console.warn('Redis package not installed, using memory cache');
        return false;
      }

      redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        },
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });

      redisClient.on('error', (err: Error) => {
        console.warn('Redis connection error:', err.message);
        redisClient = null; // Fallback to memory cache
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis cache connected');
      });

      await redisClient.connect();
      return true;

    } catch (error) {
      console.warn('Redis not available, using memory cache:', error.message);
      redisClient = null;
      return false;
    }
  }
  return false;
}

/**
 * Cache tier enum
 */
export enum CacheTier {
  MEMORY = 'memory',
  REDIS = 'redis',
  STATIC = 'static',
}

/**
 * Cache options interface
 */
export interface CacheOptions {
  tier?: CacheTier;
  ttl?: number; // TTL in seconds for Redis, milliseconds for memory
  prefix?: string;
  tags?: string[]; // For cache invalidation
}

/**
 * Advanced cache manager
 */
export class AdvancedCache {
  private static instance: AdvancedCache | null = null;
  private initialized = false;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): AdvancedCache {
    if (!AdvancedCache.instance) {
      AdvancedCache.instance = new AdvancedCache();
    }
    return AdvancedCache.instance;
  }
  
  /**
   * Initialize the cache system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await initializeRedis();
    this.initialized = true;
    
    console.log('🚀 Advanced cache system initialized');
  }
  
  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || CACHE_CONFIG.PREFIXES.QUERY;
    return `${finalPrefix}${key}`;
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { tier = CacheTier.MEMORY, prefix } = options;
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      // Try Redis first if available and requested
      if (tier === CacheTier.REDIS && redisClient) {
        const value = await redisClient.get(cacheKey);
        if (value) {
          return JSON.parse(value);
        }
      }
      
      // Fallback to appropriate memory cache
      const cache = tier === CacheTier.STATIC ? staticCache : 
                   tier === CacheTier.REDIS ? queryCache : memoryCache;
      
      return cache.get(cacheKey) || null;
      
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }
  
  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { tier = CacheTier.MEMORY, ttl, prefix, tags } = options;
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      // Set in Redis if available and requested
      if (tier === CacheTier.REDIS && redisClient) {
        const serialized = JSON.stringify(value);
        const redisTTL = ttl || CACHE_CONFIG.REDIS_MEDIUM_TTL;
        
        await redisClient.setEx(cacheKey, redisTTL, serialized);
        
        // Store tags for invalidation
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await redisClient.sAdd(`tag:${tag}`, cacheKey);
            await redisClient.expire(`tag:${tag}`, redisTTL);
          }
        }
      }
      
      // Also set in memory cache for faster access
      const cache = tier === CacheTier.STATIC ? staticCache : 
                   tier === CacheTier.REDIS ? queryCache : memoryCache;
      
      cache.set(cacheKey, value);
      
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const { tier = CacheTier.MEMORY, prefix } = options;
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      // Delete from Redis if available
      if (redisClient) {
        await redisClient.del(cacheKey);
      }
      
      // Delete from memory caches
      memoryCache.delete(cacheKey);
      queryCache.delete(cacheKey);
      staticCache.delete(cacheKey);
      
    } catch (error) {
      console.warn('Cache delete error:', error.message);
    }
  }
  
  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!redisClient) return;
    
    try {
      for (const tag of tags) {
        const keys = await redisClient.sMembers(`tag:${tag}`);
        if (keys.length > 0) {
          await redisClient.del(keys);
          await redisClient.del(`tag:${tag}`);
        }
      }
    } catch (error) {
      console.warn('Cache invalidation error:', error.message);
    }
  }
  
  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.flushDb();
      }
      
      memoryCache.clear();
      queryCache.clear();
      staticCache.clear();
      
      console.log('🧹 All caches cleared');
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memory: { size: number; max: number };
    query: { size: number; max: number };
    static: { size: number; max: number };
    redis: { connected: boolean };
  } {
    return {
      memory: { size: memoryCache.size, max: memoryCache.max },
      query: { size: queryCache.size, max: queryCache.max },
      static: { size: staticCache.size, max: staticCache.max },
      redis: { connected: !!redisClient },
    };
  }
}

/**
 * Cached function decorator
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string }
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: Parameters<T>) {
      const cache = AdvancedCache.getInstance();
      
      // Generate cache key
      const keyGenerator = options.keyGenerator || ((...args) => `${propertyKey}:${JSON.stringify(args)}`);
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get(cacheKey, options);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cache.set(cacheKey, result, options);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  private static cache = AdvancedCache.getInstance();
  
  /**
   * Warm up user-related caches
   */
  static async warmUserCache(userId: string): Promise<void> {
    // This would be implemented based on specific user data needs
    console.log(`🔥 Warming cache for user: ${userId}`);
  }
  
  /**
   * Warm up institution-related caches
   */
  static async warmInstitutionCache(institutionId: string): Promise<void> {
    console.log(`🔥 Warming cache for institution: ${institutionId}`);
  }
  
  /**
   * Warm up static data caches
   */
  static async warmStaticCaches(): Promise<void> {
    console.log('🔥 Warming static data caches');
    
    // Cache common static data
    const staticData = {
      timezones: Intl.supportedValuesOf('timeZone'),
      countries: [], // Would load from a countries API/data
      currencies: [], // Would load currency data
    };
    
    for (const [key, data] of Object.entries(staticData)) {
      await this.cache.set(key, data, {
        tier: CacheTier.STATIC,
        prefix: CACHE_CONFIG.PREFIXES.STATIC,
        ttl: CACHE_CONFIG.REDIS_STATIC_TTL,
      });
    }
  }
}

// Initialize cache on module load
const cacheInstance = AdvancedCache.getInstance();
cacheInstance.initialize().catch(console.error);

// Export singleton instance
export const advancedCache = cacheInstance;
export default advancedCache;
