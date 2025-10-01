/**
 * Memory Management Utilities for FabriiQ Platform
 * 
 * This module provides memory monitoring, cache management, and connection pooling
 * optimizations to prevent memory leaks and improve performance.
 */

import { PrismaClient } from '@prisma/client';

// Memory monitoring configuration
const MEMORY_CHECK_INTERVAL = 30 * 1000; // 30 seconds
const MEMORY_WARNING_THRESHOLD = 512 * 1024 * 1024; // 512MB
const MEMORY_CRITICAL_THRESHOLD = 1024 * 1024 * 1024; // 1GB
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Global memory monitoring state
let memoryMonitoringInterval: NodeJS.Timeout | null = null;
let cacheCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Memory usage information
 */
export interface MemoryUsage {
  rss: number; // Resident Set Size
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

/**
 * Cache management interface
 */
export interface CacheManager<T = any> {
  cache: Map<string, T & { timestamp: number }>;
  ttl: number;
  maxSize: number;
  name: string;
}

// Global cache registry for monitoring
const cacheRegistry = new Map<string, CacheManager>();

/**
 * Get current memory usage
 */
export function getMemoryUsage(): MemoryUsage {
  const usage = process.memoryUsage();
  return {
    ...usage,
    timestamp: Date.now(),
  };
}

/**
 * Format memory size for human readability
 */
export function formatMemorySize(bytes: number): string {
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
 * Check if memory usage is critical
 */
export function isMemoryUsageCritical(usage?: MemoryUsage): boolean {
  const currentUsage = usage || getMemoryUsage();
  return currentUsage.heapUsed > MEMORY_CRITICAL_THRESHOLD;
}

/**
 * Check if memory usage needs attention
 */
export function isMemoryUsageHigh(usage?: MemoryUsage): boolean {
  const currentUsage = usage || getMemoryUsage();
  return currentUsage.heapUsed > MEMORY_WARNING_THRESHOLD;
}

/**
 * Register a cache for monitoring and management
 */
export function registerCache<T>(
  name: string,
  cache: Map<string, T & { timestamp: number }>,
  ttl: number,
  maxSize: number = 1000
): void {
  cacheRegistry.set(name, {
    cache,
    ttl,
    maxSize,
    name,
  });
}

/**
 * Clean up expired entries from a cache
 */
export function cleanupCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  ttl: number,
  maxSize: number = 1000
): number {
  const now = Date.now();
  let cleanedCount = 0;
  
  // Remove expired entries
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > ttl) {
      cache.delete(key);
      cleanedCount++;
    }
  }
  
  // If still over max size, remove oldest entries
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = entries.slice(0, cache.size - maxSize);
    entriesToRemove.forEach(([key]) => {
      cache.delete(key);
      cleanedCount++;
    });
  }
  
  return cleanedCount;
}

/**
 * Clean up all registered caches
 */
export function cleanupAllCaches(): { [cacheName: string]: number } {
  const results: { [cacheName: string]: number } = {};
  
  for (const [name, manager] of cacheRegistry.entries()) {
    const cleaned = cleanupCache(manager.cache, manager.ttl, manager.maxSize);
    results[name] = cleaned;
  }
  
  return results;
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(): { [cacheName: string]: { size: number; maxSize: number; usage: string } } {
  const stats: { [cacheName: string]: { size: number; maxSize: number; usage: string } } = {};
  
  for (const [name, manager] of cacheRegistry.entries()) {
    const size = manager.cache.size;
    const maxSize = manager.maxSize;
    const usage = `${((size / maxSize) * 100).toFixed(1)}%`;
    
    stats[name] = { size, maxSize, usage };
  }
  
  return stats;
}

/**
 * Force garbage collection if available
 */
export function forceGarbageCollection(): boolean {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
}

/**
 * Memory monitoring callback
 */
export type MemoryMonitorCallback = (usage: MemoryUsage, isHigh: boolean, isCritical: boolean) => void;

/**
 * Start memory monitoring
 */
export function startMemoryMonitoring(callback?: MemoryMonitorCallback): void {
  if (memoryMonitoringInterval) {
    return; // Already monitoring
  }
  
  memoryMonitoringInterval = setInterval(() => {
    const usage = getMemoryUsage();
    const isHigh = isMemoryUsageHigh(usage);
    const isCritical = isMemoryUsageCritical(usage);
    
    if (isCritical) {
      console.warn(`🚨 CRITICAL MEMORY USAGE: ${formatMemorySize(usage.heapUsed)}`);
      
      // Force cleanup and garbage collection
      const cleanupResults = cleanupAllCaches();
      console.log('🧹 Emergency cache cleanup:', cleanupResults);
      
      if (forceGarbageCollection()) {
        console.log('🗑️  Forced garbage collection');
      }
    } else if (isHigh) {
      console.warn(`⚠️  HIGH MEMORY USAGE: ${formatMemorySize(usage.heapUsed)}`);
    }
    
    // Call custom callback if provided
    if (callback) {
      callback(usage, isHigh, isCritical);
    }
  }, MEMORY_CHECK_INTERVAL);
  
  console.log('📊 Memory monitoring started');
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring(): void {
  if (memoryMonitoringInterval) {
    clearInterval(memoryMonitoringInterval);
    memoryMonitoringInterval = null;
    console.log('📊 Memory monitoring stopped');
  }
}

/**
 * Start automatic cache cleanup
 */
export function startCacheCleanup(): void {
  if (cacheCleanupInterval) {
    return; // Already running
  }
  
  cacheCleanupInterval = setInterval(() => {
    const results = cleanupAllCaches();
    const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0);
    
    if (totalCleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${totalCleaned} expired entries`);
    }
  }, CACHE_CLEANUP_INTERVAL);
  
  console.log('🧹 Automatic cache cleanup started');
}

/**
 * Stop automatic cache cleanup
 */
export function stopCacheCleanup(): void {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
    console.log('🧹 Automatic cache cleanup stopped');
  }
}

/**
 * Initialize memory management system
 */
export function initializeMemoryManagement(options?: {
  enableMonitoring?: boolean;
  enableCacheCleanup?: boolean;
  monitoringCallback?: MemoryMonitorCallback;
}): void {
  const {
    enableMonitoring = true,
    enableCacheCleanup = true,
    monitoringCallback,
  } = options || {};
  
  if (enableMonitoring) {
    startMemoryMonitoring(monitoringCallback);
  }
  
  if (enableCacheCleanup) {
    startCacheCleanup();
  }
  
  // Handle process termination
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down memory management...');
    stopMemoryMonitoring();
    stopCacheCleanup();
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down memory management...');
    stopMemoryMonitoring();
    stopCacheCleanup();
  });
  
  console.log('🚀 Memory management system initialized');
}

/**
 * Get memory management status
 */
export function getMemoryManagementStatus(): {
  monitoring: boolean;
  cacheCleanup: boolean;
  memoryUsage: MemoryUsage;
  cacheStats: { [cacheName: string]: { size: number; maxSize: number; usage: string } };
} {
  return {
    monitoring: memoryMonitoringInterval !== null,
    cacheCleanup: cacheCleanupInterval !== null,
    memoryUsage: getMemoryUsage(),
    cacheStats: getCacheStatistics(),
  };
}

/**
 * Enhanced Prisma client with connection pooling and memory management
 */
export class ManagedPrismaClient extends PrismaClient {
  private static instance: ManagedPrismaClient | null = null;
  private connectionCount = 0;
  private maxConnections: number;
  
  constructor(maxConnections: number = 20) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    this.maxConnections = maxConnections;
    
    // Monitor connection events
    this.$on('query' as any, () => {
      this.connectionCount++;
    });
  }
  
  /**
   * Get singleton instance with connection pooling
   */
  static getInstance(maxConnections?: number): ManagedPrismaClient {
    if (!ManagedPrismaClient.instance) {
      ManagedPrismaClient.instance = new ManagedPrismaClient(maxConnections);
    }
    return ManagedPrismaClient.instance;
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats(): { current: number; max: number; usage: string } {
    return {
      current: this.connectionCount,
      max: this.maxConnections,
      usage: `${((this.connectionCount / this.maxConnections) * 100).toFixed(1)}%`,
    };
  }
  
  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    await this.$disconnect();
    ManagedPrismaClient.instance = null;
  }
}
