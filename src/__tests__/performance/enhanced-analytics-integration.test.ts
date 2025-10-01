/**
 * Enhanced Analytics Integration Test
 * 
 * Simple integration test to verify the enhanced analytics functionality works correctly.
 */

import { describe, it, expect } from '@jest/globals';

describe('Enhanced Analytics Integration', () => {
  it('should have enhanced analytics service available', () => {
    // Test that the service can be imported
    expect(() => {
      require('../server/api/services/enhanced-admin-analytics.service');
    }).not.toThrow();
  });

  it('should have enhanced analytics router available', () => {
    // Test that the router can be imported
    expect(() => {
      require('../server/api/routers/enhanced-admin-analytics');
    }).not.toThrow();
  });

  it('should have performance monitoring service available', () => {
    // Test that the performance monitoring service can be imported
    expect(() => {
      require('../server/api/services/performance-monitoring.service');
    }).not.toThrow();
  });

  it('should have enhanced analytics components available', () => {
    // Test that the components can be imported
    expect(() => {
      require('../components/dashboard/EnhancedAdminAnalytics');
    }).not.toThrow();

    expect(() => {
      require('../components/dashboard/AdvancedAnalyticsDashboard');
    }).not.toThrow();

    expect(() => {
      require('../components/dashboard/RealTimeAnalytics');
    }).not.toThrow();

    expect(() => {
      require('../components/dashboard/DrillDownAnalytics');
    }).not.toThrow();

    expect(() => {
      require('../components/dashboard/PerformanceMonitoring');
    }).not.toThrow();
  });

  it('should export correct interfaces and types', () => {
    const { EnhancedAdminAnalyticsService } = require('../server/api/services/enhanced-admin-analytics.service');
    const { PerformanceMonitoringService } = require('../server/api/services/performance-monitoring.service');

    expect(EnhancedAdminAnalyticsService).toBeDefined();
    expect(typeof EnhancedAdminAnalyticsService).toBe('function');
    
    expect(PerformanceMonitoringService).toBeDefined();
    expect(typeof PerformanceMonitoringService).toBe('function');
  });

  it('should have router properly configured', () => {
    const { enhancedAdminAnalyticsRouter } = require('../server/api/routers/enhanced-admin-analytics');
    
    expect(enhancedAdminAnalyticsRouter).toBeDefined();
    expect(enhancedAdminAnalyticsRouter._def).toBeDefined();
    expect(enhancedAdminAnalyticsRouter._def.procedures).toBeDefined();
    
    // Check that key procedures exist
    const procedures = Object.keys(enhancedAdminAnalyticsRouter._def.procedures);
    expect(procedures).toContain('getDashboardMetrics');
    expect(procedures).toContain('getUserActivityTrends');
    expect(procedures).toContain('getInstitutionPerformance');
    expect(procedures).toContain('getLearningAnalytics');
    expect(procedures).toContain('getPredictiveInsights');
    expect(procedures).toContain('exportAnalyticsData');
  });
});
