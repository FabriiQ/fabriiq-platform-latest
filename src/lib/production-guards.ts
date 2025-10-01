/**
 * Production Guards
 * 
 * This module provides guards to disable admin operations and database
 * introspection in production environments to prevent performance issues.
 */

import { logger } from '@/server/api/utils/logger';

/**
 * Check if admin operations are disabled in production
 */
export function isAdminOperationAllowed(): boolean {
  // Always allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if admin panel is explicitly disabled
  if (process.env.DISABLE_ADMIN_PANEL === 'true') {
    return false;
  }

  // In production, only allow admin operations if explicitly enabled
  return process.env.ENABLE_ADMIN_OPERATIONS === 'true';
}

/**
 * Check if database introspection is allowed
 */
export function isDatabaseIntrospectionAllowed(): boolean {
  // Always allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if database introspection is explicitly disabled
  if (process.env.DISABLE_DATABASE_INTROSPECTION === 'true') {
    return false;
  }

  // In production, only allow introspection if explicitly enabled
  return process.env.ENABLE_DATABASE_INTROSPECTION === 'true';
}

/**
 * Check if PostgREST discovery is allowed
 */
export function isPostgRESTDiscoveryAllowed(): boolean {
  // Always allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check if PostgREST discovery is explicitly disabled
  if (process.env.DISABLE_POSTGREST_DISCOVERY === 'true') {
    return false;
  }

  // In production, only allow discovery if explicitly enabled
  return process.env.ENABLE_POSTGREST_DISCOVERY === 'true';
}

/**
 * Guard decorator for admin operations
 */
export function adminOperationGuard<T extends (...args: any[]) => any>(
  operation: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    if (!isAdminOperationAllowed()) {
      logger.warn(`[PRODUCTION-GUARD] Admin operation blocked in production: ${operationName}`);
      throw new Error(`Admin operation '${operationName}' is disabled in production`);
    }

    logger.debug(`[PRODUCTION-GUARD] Admin operation allowed: ${operationName}`);
    return operation(...args);
  }) as T;
}

/**
 * Guard decorator for database introspection operations
 */
export function databaseIntrospectionGuard<T extends (...args: any[]) => any>(
  operation: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    if (!isDatabaseIntrospectionAllowed()) {
      logger.warn(`[PRODUCTION-GUARD] Database introspection blocked in production: ${operationName}`);
      
      // Return empty result instead of throwing to prevent breaking the app
      return Promise.resolve([]);
    }

    logger.debug(`[PRODUCTION-GUARD] Database introspection allowed: ${operationName}`);
    return operation(...args);
  }) as T;
}

/**
 * Guard for PostgREST discovery operations
 */
export function postgrestDiscoveryGuard<T extends (...args: any[]) => any>(
  operation: T,
  operationName: string
): T {
  return ((...args: any[]) => {
    if (!isPostgRESTDiscoveryAllowed()) {
      logger.warn(`[PRODUCTION-GUARD] PostgREST discovery blocked in production: ${operationName}`);
      
      // Return cached/static result instead of performing discovery
      return Promise.resolve({
        tables: [],
        functions: [],
        schemas: [],
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug(`[PRODUCTION-GUARD] PostgREST discovery allowed: ${operationName}`);
    return operation(...args);
  }) as T;
}

/**
 * Check if performance monitoring should be enabled
 */
export function isPerformanceMonitoringEnabled(): boolean {
  // Always enable in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Enable if explicitly set
  return process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
}

/**
 * Check if query logging should be enabled
 */
export function isQueryLoggingEnabled(): boolean {
  // Enable in development if explicitly set
  if (process.env.NODE_ENV === 'development') {
    return process.env.ENABLE_QUERY_LOGGING === 'true';
  }

  // Disable in production by default (too much overhead)
  return process.env.ENABLE_QUERY_LOGGING === 'true';
}

/**
 * Get production-safe configuration
 */
export function getProductionSafeConfig() {
  return {
    adminOperationsAllowed: isAdminOperationAllowed(),
    databaseIntrospectionAllowed: isDatabaseIntrospectionAllowed(),
    postgrestDiscoveryAllowed: isPostgRESTDiscoveryAllowed(),
    performanceMonitoringEnabled: isPerformanceMonitoringEnabled(),
    queryLoggingEnabled: isQueryLoggingEnabled(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log production configuration on startup
 */
export function logProductionConfiguration(): void {
  const config = getProductionSafeConfig();
  
  logger.info('[PRODUCTION-GUARD] Production configuration loaded', config);
  
  // Warn about potentially expensive operations enabled in production
  if (config.environment === 'production') {
    if (config.adminOperationsAllowed) {
      logger.warn('[PRODUCTION-GUARD] Admin operations are enabled in production - this may impact performance');
    }
    
    if (config.databaseIntrospectionAllowed) {
      logger.warn('[PRODUCTION-GUARD] Database introspection is enabled in production - this may cause severe performance issues');
    }
    
    if (config.postgrestDiscoveryAllowed) {
      logger.warn('[PRODUCTION-GUARD] PostgREST discovery is enabled in production - this may cause severe performance issues');
    }
    
    if (config.queryLoggingEnabled) {
      logger.warn('[PRODUCTION-GUARD] Query logging is enabled in production - this may impact performance');
    }
  }
}

// Auto-log configuration on module load
if (typeof window === 'undefined') { // Server-side only
  setTimeout(() => {
    logProductionConfiguration();
  }, 1000);
}
