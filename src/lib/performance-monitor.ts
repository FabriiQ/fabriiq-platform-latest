/**
 * Performance Monitoring System for FabriiQ Platform
 * 
 * This module provides comprehensive performance monitoring, metrics collection,
 * and health checks for production environments.
 */

import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  timestamp: number;
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  userAgent?: string;
  userId?: string;
  institutionId?: string;
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  timestamp: number;
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics in memory
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Record performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log slow requests
    if (metric.duration > 1000) {
      console.warn(`🐌 Slow request detected: ${metric.method} ${metric.route} took ${metric.duration}ms`);
    }
    
    // Log errors
    if (metric.statusCode >= 400) {
      console.error(`❌ Error response: ${metric.method} ${metric.route} returned ${metric.statusCode}`);
    }
  }
  
  /**
   * Get performance statistics
   */
  getStatistics(timeWindow: number = 3600000): {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    topSlowRoutes: Array<{ route: string; averageTime: number; count: number }>;
    memoryTrend: Array<{ timestamp: number; heapUsed: number }>;
  } {
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        topSlowRoutes: [],
        memoryTrend: [],
      };
    }
    
    // Calculate basic statistics
    const totalRequests = recentMetrics.length;
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;
    const slowRequests = recentMetrics.filter(m => m.duration > 1000).length;
    
    // Calculate top slow routes
    const routeStats = new Map<string, { totalTime: number; count: number }>();
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.route}`;
      const current = routeStats.get(key) || { totalTime: 0, count: 0 };
      current.totalTime += metric.duration;
      current.count++;
      routeStats.set(key, current);
    });
    
    const topSlowRoutes = Array.from(routeStats.entries())
      .map(([route, stats]) => ({
        route,
        averageTime: stats.totalTime / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
    
    // Memory trend (sample every 5 minutes)
    const memoryTrend = recentMetrics
      .filter((_, index) => index % Math.max(1, Math.floor(recentMetrics.length / 12)) === 0)
      .map(m => ({
        timestamp: m.timestamp,
        heapUsed: m.memoryUsage.heapUsed,
      }));
    
    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequests,
      topSlowRoutes,
      memoryTrend,
    };
  }
  
  /**
   * Record health check result
   */
  recordHealthCheck(result: HealthCheckResult): void {
    this.healthChecks.set(result.service, result);
  }
  
  /**
   * Get all health check results
   */
  getHealthChecks(): HealthCheckResult[] {
    return Array.from(this.healthChecks.values());
  }
  
  /**
   * Get overall system health
   */
  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    summary: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const services = this.getHealthChecks();
    
    const summary = {
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      services,
      summary,
    };
  }
  
  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThan: number = 86400000): void {
    const cutoff = Date.now() - olderThan;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<T> => {
    const startTime = Date.now();
    const monitor = PerformanceMonitor.getInstance();
    
    try {
      // Execute the handler
      const result = await handler(req, res);
      
      // Record successful metric
      const endTime = Date.now();
      monitor.recordMetric({
        timestamp: endTime,
        route: req.url || 'unknown',
        method: req.method || 'GET',
        duration: endTime - startTime,
        statusCode: res.statusCode,
        memoryUsage: process.memoryUsage(),
        userAgent: req.headers['user-agent'],
        userId: (req as any).user?.id,
        institutionId: req.headers['x-institution-id'] as string,
      });
      
      return result;
      
    } catch (error) {
      // Record error metric
      const endTime = Date.now();
      monitor.recordMetric({
        timestamp: endTime,
        route: req.url || 'unknown',
        method: req.method || 'GET',
        duration: endTime - startTime,
        statusCode: 500,
        memoryUsage: process.memoryUsage(),
        userAgent: req.headers['user-agent'],
        userId: (req as any).user?.id,
        institutionId: req.headers['x-institution-id'] as string,
      });
      
      throw error;
    }
  };
}

/**
 * Health check utilities
 */
export class HealthChecker {
  private static monitor = PerformanceMonitor.getInstance();
  
  /**
   * Check database health
   */
  static async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Import Prisma client dynamically to avoid circular dependencies
      const { prisma } = await import('@/server/db');
      
      // Simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'database',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        details: {
          query: 'SELECT 1',
          responseTime: `${responseTime}ms`,
        },
      };
      
      this.monitor.recordHealthCheck(result);
      return result;
      
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details: {
          error: error.message,
        },
      };
      
      this.monitor.recordHealthCheck(result);
      return result;
    }
  }
  
  /**
   * Check Redis health (if available)
   */
  static async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Try to import Redis client
      const { advancedCache } = await import('@/lib/advanced-cache');
      
      // Simple ping test
      const testKey = 'health-check';
      const testValue = Date.now().toString();
      
      await advancedCache.set(testKey, testValue);
      const retrieved = await advancedCache.get(testKey);
      
      const responseTime = Date.now() - startTime;
      const isWorking = retrieved === testValue;
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: isWorking && responseTime < 50 ? 'healthy' : 
                isWorking && responseTime < 200 ? 'degraded' : 'unhealthy',
        responseTime,
        timestamp: Date.now(),
        details: {
          connected: isWorking,
          responseTime: `${responseTime}ms`,
        },
      };
      
      this.monitor.recordHealthCheck(result);
      return result;
      
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'degraded', // Redis is optional, so degraded instead of unhealthy
        responseTime: Date.now() - startTime,
        timestamp: Date.now(),
        details: {
          error: 'Redis not available (using memory cache)',
          fallback: 'memory',
        },
      };
      
      this.monitor.recordHealthCheck(result);
      return result;
    }
  }
  
  /**
   * Check memory health
   */
  static async checkMemory(): Promise<HealthCheckResult> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (heapUsagePercent > 90) {
      status = 'unhealthy';
    } else if (heapUsagePercent > 75) {
      status = 'degraded';
    }
    
    const result: HealthCheckResult = {
      service: 'memory',
      status,
      responseTime: 0, // Instant check
      timestamp: Date.now(),
      details: {
        heapUsed: `${Math.round(heapUsedMB)}MB`,
        heapTotal: `${Math.round(heapTotalMB)}MB`,
        heapUsagePercent: `${Math.round(heapUsagePercent)}%`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
    };
    
    this.monitor.recordHealthCheck(result);
    return result;
  }
  
  /**
   * Run all health checks
   */
  static async runAllChecks(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);
    
    return checks
      .filter((result): result is PromiseFulfilledResult<HealthCheckResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }
}

/**
 * Error tracking utilities
 */
export class ErrorTracker {
  private static errors: Array<{
    timestamp: number;
    error: Error;
    context: any;
    userId?: string;
    route?: string;
  }> = [];
  
  private static maxErrors = 1000;
  
  /**
   * Track an error
   */
  static trackError(error: Error, context: any = {}): void {
    this.errors.push({
      timestamp: Date.now(),
      error,
      context,
      userId: context.userId,
      route: context.route,
    });
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Log critical errors
    if (error.name === 'DatabaseError' || error.message.includes('ECONNREFUSED')) {
      console.error('🚨 Critical error tracked:', error.message, context);
    }
  }
  
  /**
   * Get error statistics
   */
  static getErrorStats(timeWindow: number = 3600000): {
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
    errorsByRoute: Array<{ route: string; count: number }>;
  } {
    const now = Date.now();
    const windowStart = now - timeWindow;
    
    const recentErrors = this.errors.filter(e => e.timestamp >= windowStart);
    
    // Group errors by message
    const errorCounts = new Map<string, number>();
    const routeCounts = new Map<string, number>();
    
    recentErrors.forEach(({ error, route }) => {
      const message = error.message;
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
      
      if (route) {
        routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
      }
    });
    
    const topErrors = Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const errorsByRoute = Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalErrors: recentErrors.length,
      errorRate: 0, // Would need request count to calculate
      topErrors,
      errorsByRoute,
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
