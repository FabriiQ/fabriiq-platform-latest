/**
 * Memory Status API Endpoint
 * 
 * This endpoint provides memory usage statistics and cache information
 * for system administrators to monitor application performance.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getMemoryManagementStatus, 
  getMemoryUsage, 
  formatMemorySize,
  isMemoryUsageHigh,
  isMemoryUsageCritical 
} from '@/lib/memory-management';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication and authorization
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only allow system admins to access memory status
    if (session.user.userType !== 'SYSTEM_ADMIN') {
      return res.status(403).json({ error: 'Forbidden - System admin access required' });
    }

    // Get memory management status
    const status = getMemoryManagementStatus();
    const memoryUsage = getMemoryUsage();
    
    // Calculate memory status
    const isHigh = isMemoryUsageHigh(memoryUsage);
    const isCritical = isMemoryUsageCritical(memoryUsage);
    
    // Determine overall health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (isCritical) {
      healthStatus = 'critical';
    } else if (isHigh) {
      healthStatus = 'warning';
    }

    // Format memory usage for display
    const formattedMemory = {
      rss: formatMemorySize(memoryUsage.rss),
      heapTotal: formatMemorySize(memoryUsage.heapTotal),
      heapUsed: formatMemorySize(memoryUsage.heapUsed),
      external: formatMemorySize(memoryUsage.external),
      arrayBuffers: formatMemorySize(memoryUsage.arrayBuffers),
    };

    // Calculate memory usage percentages
    const heapUsagePercent = ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1);
    
    // Get process uptime
    const uptimeSeconds = process.uptime();
    const uptimeFormatted = formatUptime(uptimeSeconds);

    // Response data
    const responseData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus,
        isHigh,
        isCritical,
      },
      memory: {
        raw: memoryUsage,
        formatted: formattedMemory,
        heapUsagePercent: `${heapUsagePercent}%`,
      },
      caches: status.cacheStats,
      monitoring: {
        enabled: status.monitoring,
        cacheCleanupEnabled: status.cacheCleanup,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: uptimeFormatted,
        pid: process.pid,
      },
      recommendations: generateRecommendations(memoryUsage, status.cacheStats),
    };

    // Set appropriate cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error getting memory status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Format uptime in human-readable format
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
 * Generate performance recommendations based on current status
 */
function generateRecommendations(
  memoryUsage: any, 
  cacheStats: { [cacheName: string]: { size: number; maxSize: number; usage: string } }
): string[] {
  const recommendations: string[] = [];
  
  // Memory-based recommendations
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (heapUsagePercent > 90) {
    recommendations.push('Critical: Heap usage is very high (>90%). Consider restarting the application.');
  } else if (heapUsagePercent > 75) {
    recommendations.push('Warning: Heap usage is high (>75%). Monitor closely and consider cache cleanup.');
  }
  
  if (memoryUsage.rss > 1024 * 1024 * 1024) { // 1GB
    recommendations.push('RSS memory usage is high (>1GB). Consider optimizing memory usage.');
  }
  
  // Cache-based recommendations
  Object.entries(cacheStats).forEach(([cacheName, stats]) => {
    const usagePercent = (stats.size / stats.maxSize) * 100;
    
    if (usagePercent > 90) {
      recommendations.push(`${cacheName} cache is nearly full (${stats.usage}). Consider increasing cache size or reducing TTL.`);
    } else if (usagePercent > 75) {
      recommendations.push(`${cacheName} cache usage is high (${stats.usage}). Monitor for potential issues.`);
    }
  });
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('System memory usage is within normal parameters.');
  }
  
  return recommendations;
}

/**
 * API endpoint configuration
 */
export const config = {
  api: {
    responseLimit: '1mb',
  },
};
