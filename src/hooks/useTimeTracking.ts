'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/trpc/react';

/**
 * Hook to track time spent on an activity
 * 
 * @param activityId The ID of the activity being tracked
 * @returns An object with the current tracking status
 */
export function useTimeTracking(activityId: string) {
  const startTimeRef = useRef<number>(Date.now());
  const recordTimeSpent = api.learningTime.recordTimeSpent.useMutation({
    onSuccess: () => {
      console.log('Time tracking recorded successfully for activity:', activityId);
    },
    onError: (error) => {
      console.error('Failed to record time tracking:', error);
    },
  });
  
  // Start tracking when the component mounts
  useEffect(() => {
    // Reset the start time
    startTimeRef.current = Date.now();
    console.log('Started time tracking for activity:', activityId);
    
    // Record time spent when the component unmounts
    return () => {
      const endTime = Date.now();
      const timeSpentMs = endTime - startTimeRef.current;
      const timeSpentMinutes = Math.ceil(timeSpentMs / (1000 * 60)); // Convert to minutes and round up
      
      console.log(`Activity ${activityId} - Time spent: ${timeSpentMinutes} minutes (${timeSpentMs}ms)`);
      
      // Record even small amounts of time (30 seconds or more)
      if (timeSpentMs >= 30000) { // 30 seconds minimum
        console.log('Recording time spent for activity:', activityId);
        recordTimeSpent.mutate({
          activityId,
          timeSpentMinutes: Math.max(1, timeSpentMinutes), // Ensure at least 1 minute is recorded
          startedAt: new Date(startTimeRef.current),
          completedAt: new Date(endTime),
        });
      } else {
        console.log('Time spent too short, not recording:', timeSpentMs, 'ms');
      }
    };
  }, [activityId, recordTimeSpent]);
  
  return {
    isRecording: true,
    startTime: startTimeRef.current,
  };
}
