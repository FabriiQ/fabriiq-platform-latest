/**
 * API Optimization Utilities for FabriiQ Platform
 * 
 * This module provides API response optimization, compression, pagination,
 * and response time improvements.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Pagination parameters schema
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    responseTime: number;
    cached: boolean;
  };
}

/**
 * API response optimization options
 */
export interface OptimizationOptions {
  enableCompression?: boolean;
  enableCaching?: boolean;
  enablePagination?: boolean;
  maxResponseSize?: number;
  compressionThreshold?: number;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
  meta?: any
): PaginatedResponse<T> {
  const { page, limit, sortBy, sortOrder } = params;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    meta: {
      sortBy,
      sortOrder,
      search: params.search,
      responseTime: 0, // Will be set by middleware
      cached: false, // Will be set by caching middleware
      ...meta,
    },
  };
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(
  req: NextApiRequest | NextRequest
): PaginationParams {
  let query: any = {};
  
  if ('query' in req) {
    // NextApiRequest
    query = req.query;
  } else {
    // NextRequest
    const url = new URL(req.url);
    query = Object.fromEntries(url.searchParams.entries());
  }
  
  return PaginationSchema.parse(query);
}

/**
 * Response compression utility
 */
export class ResponseCompressor {
  private static compressionThreshold = 1024; // 1KB
  
  /**
   * Check if response should be compressed
   */
  static shouldCompress(data: any, threshold: number = this.compressionThreshold): boolean {
    const size = JSON.stringify(data).length;
    return size >= threshold;
  }
  
  /**
   * Compress response data (placeholder - would use actual compression)
   */
  static compress(data: any): { compressed: string; originalSize: number; compressedSize: number } {
    const original = JSON.stringify(data);
    const originalSize = original.length;
    
    // In a real implementation, you would use gzip or brotli compression
    // For now, we'll just return the original data
    const compressed = original;
    const compressedSize = compressed.length;
    
    return {
      compressed,
      originalSize,
      compressedSize,
    };
  }
}

/**
 * API response optimizer middleware
 */
export function withApiOptimization(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>,
  options: OptimizationOptions = {}
) {
  const {
    enableCompression = true,
    enableCaching = true,
    maxResponseSize = 10 * 1024 * 1024, // 10MB
    compressionThreshold = 1024,
  } = options;
  
  return async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
    const startTime = Date.now();
    
    // Override res.json to intercept response
    const originalJson = res.json;
    let responseData: any = null;
    let responseSize = 0;
    
    res.json = function (data: any) {
      responseData = data;
      const jsonString = JSON.stringify(data);
      responseSize = jsonString.length;
      
      // Check response size limit
      if (responseSize > maxResponseSize) {
        console.warn(`⚠️  Large response detected: ${responseSize} bytes for ${req.url}`);
      }
      
      // Add performance headers
      const responseTime = Date.now() - startTime;
      this.setHeader('X-Response-Time', `${responseTime}ms`);
      this.setHeader('X-Response-Size', `${responseSize} bytes`);
      
      // Add compression headers if applicable
      if (enableCompression && ResponseCompressor.shouldCompress(data, compressionThreshold)) {
        this.setHeader('X-Compression-Eligible', 'true');
      }
      
      // Add caching headers if enabled
      if (enableCaching && req.method === 'GET') {
        this.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      }
      
      return originalJson.call(this, data);
    };
    
    try {
      const result = await handler(req, res);
      
      // Log performance metrics
      const responseTime = Date.now() - startTime;
      if (responseTime > 1000) {
        console.warn(`🐌 Slow API response: ${req.method} ${req.url} took ${responseTime}ms`);
      }
      
      return result;
      
    } catch (error) {
      // Log API errors
      console.error(`❌ API error: ${req.method} ${req.url}`, error);
      throw error;
    }
  };
}

/**
 * Database query optimizer for pagination
 */
export class QueryOptimizer {
  /**
   * Optimize Prisma query for pagination
   */
  static optimizePaginationQuery<T>(
    baseQuery: any,
    params: PaginationParams,
    searchFields?: string[]
  ): {
    findManyQuery: any;
    countQuery: any;
  } {
    const { page, limit, sortBy, sortOrder, search } = params;
    const skip = (page - 1) * limit;
    
    // Build where clause for search
    let where = baseQuery.where || {};
    
    if (search && searchFields && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => ({
        [field]: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }));
      
      where = {
        ...where,
        OR: searchConditions,
      };
    }
    
    // Build order by clause
    let orderBy = baseQuery.orderBy || {};
    if (sortBy) {
      orderBy = {
        [sortBy]: sortOrder,
      };
    }
    
    const findManyQuery = {
      ...baseQuery,
      where,
      orderBy,
      skip,
      take: limit,
    };
    
    const countQuery = {
      where,
    };
    
    return { findManyQuery, countQuery };
  }
  
  /**
   * Optimize select fields to reduce response size
   */
  static optimizeSelectFields(
    baseSelect: any,
    requestedFields?: string[]
  ): any {
    if (!requestedFields || requestedFields.length === 0) {
      return baseSelect;
    }
    
    // Build select object from requested fields
    const select: any = {};
    
    requestedFields.forEach(field => {
      if (field.includes('.')) {
        // Nested field (e.g., 'user.name')
        const [parent, child] = field.split('.');
        if (!select[parent]) {
          select[parent] = { select: {} };
        }
        select[parent].select[child] = true;
      } else {
        // Top-level field
        select[field] = true;
      }
    });
    
    return select;
  }
}

/**
 * Response transformation utilities
 */
export class ResponseTransformer {
  /**
   * Transform response to remove sensitive fields
   */
  static sanitizeResponse<T>(data: T, sensitiveFields: string[] = []): T {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item, sensitiveFields)) as T;
    }
    
    const sanitized = { ...data } as any;
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  }
  
  /**
   * Transform response to camelCase (if needed)
   */
  static toCamelCase<T>(data: T): T {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.toCamelCase(item)) as T;
    }
    
    const transformed: any = {};
    
    Object.entries(data as any).forEach(([key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      transformed[camelKey] = this.toCamelCase(value);
    });
    
    return transformed;
  }
  
  /**
   * Add computed fields to response
   */
  static addComputedFields<T extends Record<string, any>>(
    data: T,
    computedFields: Record<string, (item: T) => any>
  ): T & Record<string, any> {
    if (Array.isArray(data)) {
      return data.map(item => this.addComputedFields(item, computedFields)) as any;
    }

    const enhanced = { ...data } as T & Record<string, any>;

    Object.entries(computedFields).forEach(([fieldName, computeFn]) => {
      try {
        (enhanced as any)[fieldName] = computeFn(data);
      } catch (error) {
        console.warn(`Error computing field ${fieldName}:`, error);
        (enhanced as any)[fieldName] = null;
      }
    });

    return enhanced;
  }
}

/**
 * API rate limiting (simple in-memory implementation)
 */
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  
  /**
   * Check if request is within rate limit
   */
  static checkLimit(
    identifier: string,
    limit: number = 100,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const current = this.requests.get(identifier);
    
    if (!current || now > current.resetTime) {
      // New window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }
    
    if (current.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }
    
    current.count++;
    this.requests.set(identifier, current);
    
    return {
      allowed: true,
      remaining: limit - current.count,
      resetTime: current.resetTime,
    };
  }
  
  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Cleanup rate limiter every 5 minutes
setInterval(() => RateLimiter.cleanup(), 5 * 60 * 1000);
