'use client';

/**
 * Content Lock Hook for Activities V2
 * 
 * Manages content lock state based on student attempts
 * Provides utilities for checking and managing content protection
 */

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';

interface ContentLockState {
  hasStudentAttempts: boolean;
  studentAttemptCount: number;
  firstAttemptDate?: Date;
  lastAttemptDate?: Date;
  isContentLocked: boolean;
  isLoading: boolean;
  error?: string;
}

interface ContentLockActions {
  toggleLock: (locked: boolean) => Promise<void>;
  checkStudentAttempts: () => Promise<void>;
  canModifyContent: boolean;
}

export function useContentLock(activityId: string): ContentLockState & ContentLockActions {
  const [state, setState] = useState<ContentLockState>({
    hasStudentAttempts: false,
    studentAttemptCount: 0,
    isContentLocked: false,
    isLoading: true
  });

  // Query to check student attempts
  const { data: attemptData, isLoading: attemptsLoading, refetch: refetchAttempts } = api.activityV2.getStudentAttempts.useQuery(
    { activityId },
    { 
      enabled: !!activityId,
      refetchOnWindowFocus: false
    }
  );

  // Query to get activity lock status
  const { data: lockData, isLoading: lockLoading } = api.activityV2.getLockStatus.useQuery(
    { activityId },
    { 
      enabled: !!activityId,
      refetchOnWindowFocus: false
    }
  );

  // Mutation to toggle lock status
  const toggleLockMutation = api.activityV2.toggleContentLock.useMutation({
    onSuccess: () => {
      // Refetch lock status after successful toggle
      refetchAttempts();
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        error: error.message
      }));
    }
  });

  // Update state when data changes
  useEffect(() => {
    if (attemptData && lockData) {
      setState(prev => ({
        ...prev,
        hasStudentAttempts: attemptData.hasAttempts,
        studentAttemptCount: attemptData.attemptCount,
        firstAttemptDate: attemptData.firstAttemptDate ? new Date(attemptData.firstAttemptDate) : undefined,
        lastAttemptDate: attemptData.lastAttemptDate ? new Date(attemptData.lastAttemptDate) : undefined,
        isContentLocked: lockData.isLocked,
        isLoading: false,
        error: undefined
      }));
    }
  }, [attemptData, lockData]);

  // Update loading state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: attemptsLoading || lockLoading
    }));
  }, [attemptsLoading, lockLoading]);

  const toggleLock = async (locked: boolean) => {
    try {
      setState(prev => ({ ...prev, error: undefined }));
      await toggleLockMutation.mutateAsync({
        activityId,
        locked
      });
      
      setState(prev => ({
        ...prev,
        isContentLocked: locked
      }));
    } catch (error) {
      console.error('Error toggling content lock:', error);
      throw error;
    }
  };

  const checkStudentAttempts = async () => {
    try {
      await refetchAttempts();
    } catch (error) {
      console.error('Error checking student attempts:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to check student attempts'
      }));
    }
  };

  // Determine if content can be modified
  const canModifyContent = !state.hasStudentAttempts && !state.isContentLocked;

  return {
    ...state,
    toggleLock,
    checkStudentAttempts,
    canModifyContent
  };
}

// Utility function to check if content should be locked
export function shouldLockContent(hasStudentAttempts: boolean, isManuallyLocked: boolean): boolean {
  return hasStudentAttempts || isManuallyLocked;
}

// Utility function to get lock reason
export function getLockReason(hasStudentAttempts: boolean, isManuallyLocked: boolean): string {
  if (hasStudentAttempts) {
    return 'Content is locked because students have attempted this activity';
  } else if (isManuallyLocked) {
    return 'Content has been manually locked by the teacher';
  } else {
    return 'Content is not locked and can be modified';
  }
}

// Utility function to check if user can override lock
export function canOverrideLock(userRole: string): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
}
