'use client';

import { useEffect, useRef } from 'react';

interface RenderInfo {
  count: number;
  lastRender: number;
  averageInterval: number;
  props?: Record<string, any>;
}

/**
 * Hook to track component renders and detect potential infinite loops
 * 
 * This hook helps identify components that are re-rendering excessively,
 * which could lead to infinite loops or performance issues.
 */
export function useRenderTracker(
  componentName: string,
  props?: Record<string, any>,
  options: {
    maxRenders?: number;
    timeWindow?: number;
    logThreshold?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    maxRenders = 100,
    timeWindow = 1000, // 1 second
    logThreshold = 10,
    enabled = process.env.NODE_ENV === 'development'
  } = options;

  const renderInfo = useRef<RenderInfo>({
    count: 0,
    lastRender: Date.now(),
    averageInterval: 0,
  });

  const renderTimes = useRef<number[]>([]);
  const warningShown = useRef(false);

  if (!enabled) {
    return;
  }

  // Track this render
  const now = Date.now();
  renderInfo.current.count++;
  renderTimes.current.push(now);

  // Calculate average interval
  if (renderTimes.current.length > 1) {
    const intervals = renderTimes.current.slice(1).map((time, index) => 
      time - renderTimes.current[index]
    );
    renderInfo.current.averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  // Clean up old render times outside the time window
  renderTimes.current = renderTimes.current.filter(time => now - time <= timeWindow);

  // Check for excessive renders
  const rendersInWindow = renderTimes.current.length;
  
  useEffect(() => {
    // Log render info if above threshold
    if (renderInfo.current.count % logThreshold === 0) {
      console.log(`[RenderTracker] ${componentName}:`, {
        totalRenders: renderInfo.current.count,
        rendersInLastSecond: rendersInWindow,
        averageInterval: Math.round(renderInfo.current.averageInterval),
        props: props ? Object.keys(props) : undefined,
      });
    }

    // Warn about potential infinite loop
    if (rendersInWindow > maxRenders && !warningShown.current) {
      warningShown.current = true;
      console.warn(`[RenderTracker] POTENTIAL INFINITE LOOP DETECTED in ${componentName}:`, {
        rendersInWindow,
        maxRenders,
        timeWindow,
        averageInterval: Math.round(renderInfo.current.averageInterval),
        props,
      });

      // Try to identify which props are changing
      if (props) {
        const propChanges = Object.entries(props).map(([key, value]) => ({
          key,
          type: typeof value,
          isFunction: typeof value === 'function',
          isObject: typeof value === 'object' && value !== null,
          stringValue: typeof value === 'object' ? '[object]' : String(value).slice(0, 50),
        }));

        console.warn(`[RenderTracker] Props analysis for ${componentName}:`, propChanges);
      }

      // Reset warning after some time
      setTimeout(() => {
        warningShown.current = false;
      }, 5000);
    }
  });

  renderInfo.current.lastRender = now;
}

/**
 * Hook to track prop changes and identify what's causing re-renders
 */
export function usePropChangeTracker<T extends Record<string, any>>(
  componentName: string,
  props: T,
  enabled = process.env.NODE_ENV === 'development'
) {
  const prevProps = useRef<T>();
  const renderCount = useRef(0);

  if (!enabled) {
    return;
  }

  renderCount.current++;

  useEffect(() => {
    if (prevProps.current) {
      const changedProps: Array<{
        key: string;
        oldValue: any;
        newValue: any;
        oldType: string;
        newType: string;
      }> = [];

      // Check each prop for changes
      const allKeys = new Set([
        ...Object.keys(prevProps.current),
        ...Object.keys(props)
      ]);

      allKeys.forEach(key => {
        const oldValue = prevProps.current![key];
        const newValue = props[key];

        if (oldValue !== newValue) {
          changedProps.push({
            key,
            oldValue: typeof oldValue === 'object' ? '[object]' : oldValue,
            newValue: typeof newValue === 'object' ? '[object]' : newValue,
            oldType: typeof oldValue,
            newType: typeof newValue,
          });
        }
      });

      if (changedProps.length > 0) {
        console.log(`[PropChangeTracker] ${componentName} render #${renderCount.current}:`, changedProps);
      }
    }

    prevProps.current = { ...props };
  });
}

/**
 * Hook to detect and warn about unstable references (functions, objects)
 */
export function useStabilityTracker(
  componentName: string,
  refs: Record<string, any>,
  enabled = process.env.NODE_ENV === 'development'
) {
  const prevRefs = useRef<Record<string, any>>({});
  const changeCount = useRef<Record<string, number>>({});

  if (!enabled) {
    return;
  }

  useEffect(() => {
    Object.entries(refs).forEach(([key, value]) => {
      const prevValue = prevRefs.current[key];
      
      if (prevValue !== value) {
        changeCount.current[key] = (changeCount.current[key] || 0) + 1;
        
        // Warn about frequently changing references
        if (changeCount.current[key] > 5) {
          console.warn(`[StabilityTracker] Unstable reference detected in ${componentName}:`, {
            key,
            changeCount: changeCount.current[key],
            type: typeof value,
            isFunction: typeof value === 'function',
            isObject: typeof value === 'object' && value !== null,
          });
        }
      }
    });

    prevRefs.current = { ...refs };
  });
}

export default useRenderTracker;
