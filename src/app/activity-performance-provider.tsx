'use client';

import { useEffect } from 'react';

/**
 * Provider component that initializes activity performance monitoring
 * and code splitting optimizations
 */
export function ActivityPerformanceProvider({
  children,
  showMonitor = process.env.NODE_ENV === 'development'
}: {
  children: React.ReactNode;
  showMonitor?: boolean;
}) {
  useEffect(() => {
    // Initialize performance monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log('ActivityPerformanceProvider: Initializing performance monitoring');
    }

    // No need to prefetch activity types with the new architecture
  }, []);

  return (
    <>
      {children}
      {/* PerformanceMonitor component removed - can be added back when implemented */}
    </>
  );
}