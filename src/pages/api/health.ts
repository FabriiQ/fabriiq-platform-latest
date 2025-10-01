/**
 * Health Check API Endpoint
 * 
 * This endpoint provides comprehensive health checks for all system components
 * and performance metrics for monitoring and alerting.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { HealthChecker, performanceMonitor, ErrorTracker } from '@/lib/performance-monitor';
import { getMemoryManagementStatus } from '@/lib/memory-management';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Run all health checks
    const healthChecks = await HealthChecker.runAllChecks();
    
    // Get performance statistics
    const performanceStats = performanceMonitor.getStatistics();
    
    // Get overall health status
    const overallHealth = performanceMonitor.getOverallHealth();
    
    // Get memory management status
    const memoryStatus = getMemoryManagementStatus();
    
    // Get error statistics
    const errorStats = ErrorTracker.getErrorStats();
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    let status = 'healthy';
    if (overallHealth.status === 'unhealthy' || performanceStats.errorRate > 10) {
      status = 'unhealthy';
    } else if (overallHealth.status === 'degraded' || performanceStats.errorRate > 5) {
      status = 'degraded';
    }
    
    // Build response
    const healthResponse = {
      status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      
      // System health
      system: {
        status: overallHealth.status,
        services: healthChecks,
        summary: overallHealth.summary,
      },
      
      // Performance metrics
      performance: {
        requests: {
          total: performanceStats.totalRequests,
          averageResponseTime: `${performanceStats.averageResponseTime}ms`,
          slowRequests: performanceStats.slowRequests,
          errorRate: `${performanceStats.errorRate}%`,
        },
        topSlowRoutes: performanceStats.topSlowRoutes.slice(0, 5),
        memoryTrend: performanceStats.memoryTrend.slice(-6), // Last 6 data points
      },
      
      // Memory status
      memory: {
        monitoring: memoryStatus.monitoring,
        cacheCleanup: memoryStatus.cacheCleanup,
        usage: {
          heapUsed: formatBytes(memoryStatus.memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryStatus.memoryUsage.heapTotal),
          rss: formatBytes(memoryStatus.memoryUsage.rss),
        },
        caches: memoryStatus.cacheStats,
      },
      
      // Error tracking
      errors: {
        total: errorStats.totalErrors,
        topErrors: errorStats.topErrors.slice(0, 3),
        errorsByRoute: errorStats.errorsByRoute.slice(0, 3),
      },
      
      // System information
      info: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: formatUptime(process.uptime()),
        environment: process.env.NODE_ENV,
        pid: process.pid,
      },
    };
    
    // Set appropriate status code
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    // Set cache headers (short cache for health checks)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(statusCode).json(healthResponse);

  } catch (error) {
    console.error('Health check error:', error);
    
    // Track the error
    ErrorTracker.trackError(error as Error, {
      route: '/api/health',
      timestamp: Date.now(),
    });
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
}

/**
 * Format bytes in human readable format
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format uptime in human readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * API endpoint configuration
 */
export const config = {
  api: {
    responseLimit: '2mb',
  },
};
