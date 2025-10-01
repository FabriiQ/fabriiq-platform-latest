'use client';

import { useState, useEffect, useRef } from 'react';
import { estimateTimeRemaining } from '@/utils/query-config';

/**
 * Hook for creating time remaining indicators with chronoception
 * (slightly underestimating time to create positive surprise)
 * 
 * @param options Configuration options
 * @returns Object with time remaining and progress
 */
export function useChronoception(options: {
  actualTimeSeconds?: number;
  autoStart?: boolean;
  onComplete?: () => void;
  tickInterval?: number;
} = {}) {
  const {
    actualTimeSeconds = 10,
    autoStart = false,
    onComplete,
    tickInterval = 1000,
  } = options;

  // Calculate estimated time (slightly underestimated)
  const estimatedTimeSeconds = useRef(estimateTimeRemaining(actualTimeSeconds));
  
  const [isRunning, setIsRunning] = useState(autoStart);
  const [timeRemaining, setTimeRemaining] = useState(estimatedTimeSeconds.current);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartRef = useRef(autoStart);

  // Handle autoStart changes
  useEffect(() => {
    if (autoStart && !autoStartRef.current && !isRunning) {
      setIsRunning(true);
    }
    autoStartRef.current = autoStart;
  }, [autoStart, isRunning]);

  // Start the timer
  const start = () => {
    if (isRunning) return;
    setIsRunning(true);
  };

  // Pause the timer
  const pause = () => {
    if (!isRunning) return;
    setIsRunning(false);
  };

  // Reset the timer
  const reset = () => {
    setIsRunning(false);
    estimatedTimeSeconds.current = estimateTimeRemaining(actualTimeSeconds);
    setTimeRemaining(estimatedTimeSeconds.current);
    setProgress(0);
  };

  // Store onComplete in a ref to prevent infinite re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Handle timer ticks
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }

        const newTimeRemaining = prev - 1;
        // Calculate progress (0-100)
        const newProgress = 100 - (newTimeRemaining / estimatedTimeSeconds.current * 100);
        setProgress(newProgress);

        return newTimeRemaining;
      });
    }, tickInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, tickInterval]); // Removed onComplete from dependencies

  // Format time as MM:SS
  const formattedTime = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    progress,
    isRunning,
    formattedTime: formattedTime(),
    start,
    pause,
    reset,
  };
}
