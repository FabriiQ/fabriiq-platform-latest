/**
 * Enhanced Prisma Client with Performance Optimization
 *
 * This file initializes and exports the Prisma client instance with:
 * - Advanced LRU caching for query results
 * - Performance monitoring for slow queries
 * - Optimized connection pooling for thousands of users
 * - Cached query helpers for common operations
 * - Connection health monitoring
 */

import { PrismaClient } from '@prisma/client';
import { initializeServer } from './init';
import { logger } from '@/server/api/utils/logger';
import { registerCache, initializeMemoryManagement } from '@/lib/memory-management';

// LRU Cache implementation
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Performance monitoring interface
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
}

class DatabasePerformanceMonitor {
  private slowQueries = new LRUCache<QueryMetrics>(100);
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  logQuery(metrics: QueryMetrics) {
    if (metrics.duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.set(`${Date.now()}`, metrics);
      console.warn(`Slow query detected: ${metrics.duration}ms`, {
        query: metrics.query.substring(0, 200),
        timestamp: metrics.timestamp
      });
    }
  }

  getSlowQueries(): QueryMetrics[] {
    const queries: QueryMetrics[] = [];
    // Note: This is a simplified implementation
    return queries;
  }
}

const performanceMonitor = new DatabasePerformanceMonitor();

// Application-level caching with optimized capacity for performance
const sessionCache = new LRUCache<any>(30000, 15 * 60 * 1000); // 30k entries, 15 minutes
const queryCache = new LRUCache<any>(75000, 10 * 60 * 1000);   // 75k entries, 10 minutes for queries

// Define a global type for the Prisma client to enable singleton pattern
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  serverInitialized: boolean | undefined;
  dbConfigLogged: boolean | undefined;
};

// Create a new Prisma client or reuse the existing one with optimized configuration
const prisma = globalForPrisma.prisma ?? (() => {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' && process.env.ENABLE_QUERY_LOGGING === 'true'
        ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'error' }],
      datasources: {
        db: {
          url: getDatabaseUrlWithPooling(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to create Prisma client:', error);
    // Return a mock client in case of error to prevent hanging
    return {} as PrismaClient;
  }
})();

/**
 * Get database URL with connection pooling parameters
 */
function getDatabaseUrlWithPooling(): string {
  const baseUrl = process.env.DATABASE_URL;

  if (!baseUrl) {
    // In development, return a dummy URL to prevent hanging
    if (process.env.NODE_ENV === 'development') {
      console.warn('DATABASE_URL not set, using dummy URL for development');
      return 'postgresql://dummy:dummy@localhost:5432/dummy';
    }
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Parse existing URL to check if pooling parameters are already present
    const url = new URL(baseUrl);
  } catch (error) {
    // In development, return a dummy URL to prevent hanging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Invalid DATABASE_URL format, using dummy URL for development');
      return 'postgresql://dummy:dummy@localhost:5432/dummy';
    }
    throw new Error('Invalid DATABASE_URL format');
  }

  // Parse existing URL to check if pooling parameters are already present
  const url = new URL(baseUrl);

  // Correct Prisma connection pooling parameters for PostgreSQL
  // These are the actual parameters that Prisma recognizes for connection pooling
  const poolingParams = {
    // Connection pool size - increased for better concurrency
    'connection_limit': process.env.DATABASE_CONNECTION_LIMIT || '100',
    'pool_timeout': process.env.DATABASE_POOL_TIMEOUT || '30',

    // PostgreSQL-specific connection parameters
    'connect_timeout': process.env.DATABASE_CONNECT_TIMEOUT || '60',
    'statement_timeout': process.env.DATABASE_STATEMENT_TIMEOUT || '60000',
    'idle_in_transaction_session_timeout': '60000',

    // Additional PostgreSQL optimizations
    'application_name': 'fabriiq-lxp',
    'tcp_keepalives_idle': '600',
    'tcp_keepalives_interval': '30',
    'tcp_keepalives_count': '3',
  };

  // Add connection pooling parameters if not already present
  Object.entries(poolingParams).forEach(([key, value]) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  });

  // Only log once to prevent spam
  if (!globalForPrisma.dbConfigLogged) {
    logger.debug('Database URL configured with connection pooling', {
      connectionLimit: url.searchParams.get('connection_limit'),
      poolTimeout: url.searchParams.get('pool_timeout'),
      connectTimeout: url.searchParams.get('connect_timeout'),
      maxIdleTime: url.searchParams.get('pool_max_idle_time'),
      statementTimeout: url.searchParams.get('statement_timeout'),
    });
    globalForPrisma.dbConfigLogged = true;
  }

  return url.toString();
}

// Query performance monitoring
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  // Only add query monitoring if query logging is enabled
  if (process.env.ENABLE_QUERY_LOGGING === 'true') {
    (prisma as any).$on('query', (e: any) => {
      performanceMonitor.logQuery({
        query: e.query,
        duration: e.duration,
        timestamp: new Date(),
      });
    });
  }
}

// Connection lifecycle management
let isConnected = false;

// Connect to database with retry logic and timeout protection
async function connectWithRetry(retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      // Add timeout protection for database connection with longer timeout
      const connectPromise = prisma.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 30000); // 30 second timeout
      });

      await Promise.race([connectPromise, timeoutPromise]);
      isConnected = true;
      console.log('Database connected successfully');

      // Test the connection with a simple query
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection verified');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        console.error('All database connection attempts failed. Server will continue without database.');
        // Don't throw in development to allow server to start
        if (process.env.NODE_ENV === 'development') {
          console.warn('Development mode: Server starting without database connection');
          return;
        }
        throw error;
      }
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  if (isConnected) {
    try {
      await prisma.$disconnect();
      isConnected = false;
      console.log('Database disconnected gracefully');
    } catch (error) {
      console.error('Error during database disconnect:', error);
    }
  }
}

// Set up process exit handlers using centralized manager
if (typeof process !== 'undefined') {
  import('@/utils/process-event-manager').then(({ addProcessHandler }) => {
    addProcessHandler('beforeExit', gracefulShutdown);
    addProcessHandler('SIGINT', gracefulShutdown);
    addProcessHandler('SIGTERM', gracefulShutdown);
  }).catch(() => {
    // Fallback to direct process listeners if import fails
    process.on('beforeExit', gracefulShutdown);
  });
}

// In development, save the client instance to avoid multiple connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Initialize connection in production
if (process.env.NODE_ENV === 'production') {
  connectWithRetry().catch(error => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });
}

// Enhanced cached query helpers for production performance
export const cachedQueries = {
  async getUserWithCache(userId: string) {
    const cacheKey = `user:${userId}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          userType: true,
          status: true,
          primaryCampusId: true,
          institutionId: true,
        },
      });

      if (user) {
        sessionCache.set(cacheKey, user);
      }
      return user;
    } catch (error) {
      logger.error('[AUTH] Error fetching cached session data', {
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Return null instead of throwing to prevent session callback failures
      return null;
    }
  },

  // Generic query cache helper for any Prisma query
  async getCachedQuery<T>(cacheKey: string, queryFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const result = await queryFn();
    queryCache.set(cacheKey, result);
    return result;
  },

  // Batch user lookup with caching
  async getUsersBatch(userIds: string[]) {
    const cacheKey = `users:batch:${userIds.sort().join(',')}`;
    const cached = queryCache.get(cacheKey);
    if (cached) return cached;

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        userType: true,
        status: true,
        primaryCampusId: true,
        institutionId: true,
      },
    });

    queryCache.set(cacheKey, users);
    return users;
  },

  async getSessionWithCache(sessionId: string) {
    const cacheKey = `session:${sessionId}`;
    const cached = sessionCache.get(cacheKey);
    if (cached) return cached;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            userType: true,
            status: true,
            primaryCampusId: true,
          },
        },
      },
    });

    if (session) {
      sessionCache.set(cacheKey, session);
    }
    return session;
  },

  invalidateUserCache(userId: string) {
    sessionCache.delete(`user:${userId}`);
  },

  invalidateSessionCache(sessionId: string) {
    sessionCache.delete(`session:${sessionId}`);
  },

  // Invalidate activities cache for a specific class
  invalidateActivitiesCache(classId: string) {
    // Get all cache keys and delete those that match the pattern
    const keys = Array.from(queryCache['cache'].keys());
    const activitiesKeys = keys.filter(key => key.startsWith(`activities:${classId}:`));
    activitiesKeys.forEach(key => queryCache.delete(key));
  },

  // Clear all query cache (use sparingly)
  clearQueryCache() {
    queryCache.clear();
  },
};

// Initialize server components asynchronously to avoid blocking startup
// This ensures initialization happens only once, even with hot reloading
setTimeout(() => {
  if (!globalForPrisma.serverInitialized) {
    // Only initialize in production or when explicitly enabled
    const shouldInitialize = process.env.NODE_ENV === 'production' ||
                            process.env.ENABLE_BACKGROUND_JOBS === 'true';

    if (shouldInitialize) {
      // Use setTimeout to make initialization non-blocking with shorter delay
      setTimeout(async () => {
        try {
          const startTime = Date.now();
          console.log('Starting optimized background server initialization...');

          // Add timeout protection to prevent hanging
          const initPromise = initializeServer(prisma);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Server initialization timeout after 15 seconds')), 15000);
          });

          await Promise.race([initPromise, timeoutPromise]);

          const duration = Date.now() - startTime;
          globalForPrisma.serverInitialized = true;
          console.log(`Background server initialization completed in ${duration}ms`);
        } catch (error) {
          console.error('Background server initialization failed:', error);
          // Mark as initialized even on failure to prevent retries
          globalForPrisma.serverInitialized = true;
        }
      }, 1000); // Reduced to 1 second delay for faster startup
    } else {
      // Mark as initialized in development to prevent unnecessary checks
      globalForPrisma.serverInitialized = true;
      console.log('Background jobs disabled - server initialization skipped');
    }
  }
}, 100); // Small delay to make module loading non-blocking

// Register caches with memory management system
registerCache('sessionCache', sessionCache as any, 15 * 60 * 1000, 30000);
registerCache('queryCache', queryCache as any, 10 * 60 * 1000, 75000);

// Initialize memory management system
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MEMORY_MANAGEMENT === 'true') {
  initializeMemoryManagement({
    enableMonitoring: true,
    enableCacheCleanup: true,
    monitoringCallback: (usage, isHigh, isCritical) => {
      if (isCritical) {
        // Clear caches aggressively when memory is critical
        sessionCache.clear();
        queryCache.clear();
        console.log('🚨 Emergency cache clear due to critical memory usage');
      } else if (isHigh) {
        // Log high memory usage for monitoring
        logger.warn('High memory usage detected', {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          rss: usage.rss,
        });
      }
    },
  });
}

// Export the Prisma client and performance monitor
export { prisma, performanceMonitor };