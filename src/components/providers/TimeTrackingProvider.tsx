'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/trpc/react';

// Constants for batching - reduced frequency to avoid connection pool issues
const MAX_BATCH_SIZE = 10; // Reduced from 50 to avoid large batches
const MAX_BATCH_AGE_MS = 2 * 60 * 1000; // Reduced to 2 minutes for more frequent smaller batches

interface TimeRecord {
  activityId: string;
  timeSpentMinutes: number;
  startedAt: number;
  completedAt: number;
}

interface TimeTrackingContextType {
  startTracking: (activityId: string) => void;
  stopTracking: (activityId: string) => void;
  isTracking: (activityId: string) => boolean;
  getElapsedTime: (activityId: string) => number; // in seconds
}

const TimeTrackingContext = createContext<TimeTrackingContextType | undefined>(undefined);

interface TimeTrackingProviderProps {
  children: React.ReactNode;
}

export function TimeTrackingProvider({ children }: TimeTrackingProviderProps) {
  // Track activities and their start times
  const [trackedActivities, setTrackedActivities] = useState<Record<string, number>>({});

  // Batch processing state
  const [pendingRecords, setPendingRecords] = useState<TimeRecord[]>([]);
  const [lastBatchTime, setLastBatchTime] = useState<number>(Date.now());

  // API mutations
  const recordTimeSpent = api.learningTime.recordTimeSpent.useMutation();
  const batchRecordTimeSpent = api.learningTime.batchRecordTimeSpent.useMutation();

  // Use a ref to store the interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start tracking an activity
  const startTracking = useCallback((activityId: string) => {
    setTrackedActivities((prev) => ({
      ...prev,
      [activityId]: Date.now(),
    }));
  }, []);

  // Stop tracking an activity and add to pending records
  const stopTracking = useCallback((activityId: string) => {
    setTrackedActivities((prev) => {
      const startTime = prev[activityId];
      if (startTime) {
        const endTime = Date.now();
        const timeSpentMs = endTime - startTime;
        const timeSpentMinutes = Math.ceil(timeSpentMs / (1000 * 60)); // Convert to minutes and round up

        // Only record if time spent is at least 1 minute
        if (timeSpentMinutes >= 1) {
          // Add to pending records
          setPendingRecords(prevRecords => [
            ...prevRecords,
            {
              activityId,
              timeSpentMinutes,
              startedAt: startTime,
              completedAt: endTime
            }
          ]);
        }

        // Remove the activity from tracked activities
        const newTrackedActivities = { ...prev };
        delete newTrackedActivities[activityId];
        return newTrackedActivities;
      }
      return prev;
    });
  }, []);

  // Check if an activity is being tracked
  const isTracking = useCallback((activityId: string) => {
    return !!trackedActivities[activityId];
  }, [trackedActivities]);

  // Get elapsed time for an activity in seconds
  const getElapsedTime = useCallback((activityId: string) => {
    const startTime = trackedActivities[activityId];
    if (!startTime) return 0;

    const now = Date.now();
    return Math.floor((now - startTime) / 1000); // in seconds
  }, [trackedActivities]);

  // Process pending records
  const processPendingRecords = useCallback(async () => {
    if (pendingRecords.length === 0) return;

    // Check if we should process the batch
    const batchSize = pendingRecords.length;
    const batchAge = Date.now() - lastBatchTime;

    if (batchSize >= MAX_BATCH_SIZE || batchAge >= MAX_BATCH_AGE_MS) {
      // Create a copy of records to process
      const recordsToProcess = [...pendingRecords];

      try {
        // Clear pending records immediately to prevent duplicate processing
        setPendingRecords([]);
        setLastBatchTime(Date.now());

        // Send batch to server with timeout
        await Promise.race([
          batchRecordTimeSpent.mutateAsync({
            records: recordsToProcess
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 30000)
          )
        ]);

        console.log(`Successfully synced ${recordsToProcess.length} time records`);
      } catch (error) {
        console.error('Failed to sync time records:', error);

        // Store failed records in localStorage for retry
        try {
          const existingRecords = JSON.parse(localStorage.getItem('timeTracking_pendingRecords') || '[]');
          const allFailedRecords = [...existingRecords, ...recordsToProcess];

          // Limit stored records to prevent localStorage overflow
          const maxStoredRecords = 100;
          const recordsToStore = allFailedRecords.slice(-maxStoredRecords);

          localStorage.setItem('timeTracking_pendingRecords', JSON.stringify(recordsToStore));
          console.log(`Stored ${recordsToStore.length} failed time records for retry`);
        } catch (storageError) {
          console.error('Failed to store time records in localStorage:', storageError);
        }
      }
    }
  }, [pendingRecords, lastBatchTime, batchRecordTimeSpent]);

  // Process pending records periodically
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      processPendingRecords();
    }, 60000) as unknown as NodeJS.Timeout; // Check every minute

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Remove dependencies to prevent infinite loop

  // Process pending records when online
  useEffect(() => {
    const handleOnline = () => {
      // Try to get records from localStorage
      try {
        const storedRecords = JSON.parse(localStorage.getItem('timeTracking_pendingRecords') || '[]');
        if (storedRecords.length > 0) {
          // Send stored records to server
          batchRecordTimeSpent.mutateAsync({
            records: storedRecords
          }).then(() => {
            // Clear records from localStorage
            localStorage.removeItem('timeTracking_pendingRecords');
          }).catch(error => {
            console.error('Failed to sync stored time records:', error);
          });
        }
      } catch (error) {
        console.error('Failed to process stored time records:', error);
      }

      // Process current pending records
      processPendingRecords();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingRecords]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Only run on mount/unmount

  const contextValue: TimeTrackingContextType = useMemo(() => ({
    startTracking,
    stopTracking,
    isTracking,
    getElapsedTime,
  }), [startTracking, stopTracking, isTracking, getElapsedTime]);

  return (
    <TimeTrackingContext.Provider value={contextValue}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

// Custom hook to use the time tracking context
export function useTimeTracking() {
  const context = useContext(TimeTrackingContext);
  if (context === undefined) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
}
