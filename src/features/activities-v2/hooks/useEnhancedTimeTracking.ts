/**
 * Enhanced Time Tracking Hook for Activities V2
 * Provides comprehensive timing analytics with pause/resume, per-question tracking,
 * and integration with existing time tracking APIs
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTimeTracking } from '@/components/providers/TimeTrackingProvider';

export interface QuestionTiming {
  questionId: string;
  startTime: number;
  endTime?: number;
  totalTime: number;
  pausedTime: number;
  attempts: number;
  isCompleted: boolean;
}

export interface TimeTrackingSession {
  activityId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalTime: number;
  activeTime: number;
  pausedTime: number;
  questionTimings: Record<string, QuestionTiming>;
  isPaused: boolean;
  pauseCount: number;
}

export interface TimeAnalytics {
  averageTimePerQuestion: number;
  fastestQuestion: { id: string; time: number } | null;
  slowestQuestion: { id: string; time: number } | null;
  totalActiveTime: number;
  totalPausedTime: number;
  efficiencyScore: number; // 0-100 based on time vs expected time
  focusScore: number; // 0-100 based on pause frequency and duration
}

export function useEnhancedTimeTracking(activityId: string) {
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();
  
  const [session, setSession] = useState<TimeTrackingSession>({
    activityId,
    sessionId: `session_${activityId}_${Date.now()}`,
    startTime: 0,
    totalTime: 0,
    activeTime: 0,
    pausedTime: 0,
    questionTimings: {},
    isPaused: false,
    pauseCount: 0
  });

  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const pauseStartTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<number>(0);

  /**
   * Start the overall activity session
   */
  const startSession = useCallback(() => {
    const now = Date.now();
    sessionStartTimeRef.current = now;

    setSession(prev => {
      // Only start if not already started
      if (prev.startTime > 0) return prev;

      return {
        ...prev,
        startTime: now
      };
    });

    // Start the existing time tracking
    startTracking(activityId);
  }, [activityId, startTracking]);

  /**
   * End timing for a specific question
   */
  const endQuestionTiming = useCallback((questionId: string) => {
    const now = Date.now();

    setSession(prev => {
      const questionTiming = prev.questionTimings[questionId];
      if (!questionTiming) return prev;

      const totalTime = now - questionTiming.startTime;
      const activeTime = totalTime - questionTiming.pausedTime;

      return {
        ...prev,
        questionTimings: {
          ...prev.questionTimings,
          [questionId]: {
            ...questionTiming,
            endTime: now,
            totalTime: activeTime,
            isCompleted: true
          }
        }
      };
    });

    setCurrentQuestionId(prev => prev === questionId ? null : prev);
  }, []);

  /**
   * End the overall activity session
   */
  const endSession = useCallback(() => {
    const now = Date.now();

    // End current question if active
    setCurrentQuestionId(prev => {
      if (prev) {
        endQuestionTiming(prev);
      }
      return null;
    });

    const totalTime = now - sessionStartTimeRef.current;

    setSession(prev => {
      const activeTime = totalTime - prev.pausedTime;
      return {
        ...prev,
        endTime: now,
        totalTime,
        activeTime
      };
    });

    // Stop the existing time tracking
    stopTracking(activityId);

    // Return session data at time of ending
    return new Promise<any>((resolve) => {
      setSession(prev => {
        resolve({
          totalTime,
          activeTime: totalTime - prev.pausedTime,
          pausedTime: prev.pausedTime,
          questionTimings: prev.questionTimings
        });
        return prev;
      });
    });
  }, [activityId, stopTracking, endQuestionTiming]);

  /**
   * Start timing for a specific question
   */
  const startQuestionTiming = useCallback((questionId: string) => {
    const now = Date.now();

    // End previous question if exists
    setCurrentQuestionId(prev => {
      if (prev && prev !== questionId) {
        endQuestionTiming(prev);
      }
      return questionId;
    });

    questionStartTimeRef.current = now;

    setSession(prev => ({
      ...prev,
      questionTimings: {
        ...prev.questionTimings,
        [questionId]: {
          questionId,
          startTime: now,
          totalTime: 0,
          pausedTime: 0,
          attempts: (prev.questionTimings[questionId]?.attempts || 0) + 1,
          isCompleted: false
        }
      }
    }));
  }, [endQuestionTiming]);



  /**
   * Pause the current session
   */
  const pauseSession = useCallback(() => {
    setSession(prev => {
      if (prev.isPaused) return prev;

      const now = Date.now();
      pauseStartTimeRef.current = now;

      return {
        ...prev,
        isPaused: true,
        pauseCount: prev.pauseCount + 1
      };
    });
  }, []);

  /**
   * Resume the current session
   */
  const resumeSession = useCallback(() => {
    setSession(prev => {
      if (!prev.isPaused) return prev;

      const now = Date.now();
      const pauseDuration = now - pauseStartTimeRef.current;

      return {
        ...prev,
        isPaused: false,
        pausedTime: prev.pausedTime + pauseDuration,
        questionTimings: currentQuestionId ? {
          ...prev.questionTimings,
          [currentQuestionId]: {
            ...prev.questionTimings[currentQuestionId],
            pausedTime: (prev.questionTimings[currentQuestionId]?.pausedTime || 0) + pauseDuration
          }
        } : prev.questionTimings
      };
    });
  }, [currentQuestionId]);

  /**
   * Toggle pause/resume
   */
  const togglePause = useCallback(() => {
    setSession(prev => {
      if (prev.isPaused) {
        resumeSession();
      } else {
        pauseSession();
      }
      return prev;
    });
  }, [pauseSession, resumeSession]);

  /**
   * Get current question timing
   */
  const getCurrentQuestionTime = useCallback(() => {
    if (!currentQuestionId) return 0;

    const questionTiming = session.questionTimings[currentQuestionId];
    if (!questionTiming) return 0;

    const now = Date.now();
    const elapsed = now - questionTiming.startTime;
    const pausedTime = session.isPaused 
      ? questionTiming.pausedTime + (now - pauseStartTimeRef.current)
      : questionTiming.pausedTime;

    return Math.max(0, elapsed - pausedTime);
  }, [currentQuestionId, session.questionTimings, session.isPaused]);

  /**
   * Get total session time
   */
  const getTotalSessionTime = useCallback(() => {
    if (session.startTime === 0) return 0;

    const now = Date.now();
    const elapsed = now - session.startTime;
    const pausedTime = session.isPaused 
      ? session.pausedTime + (now - pauseStartTimeRef.current)
      : session.pausedTime;

    return Math.max(0, elapsed - pausedTime);
  }, [session.startTime, session.pausedTime, session.isPaused]);

  /**
   * Calculate comprehensive time analytics
   */
  const getTimeAnalytics = useCallback((): TimeAnalytics => {
    const completedQuestions = Object.values(session.questionTimings).filter(q => q.isCompleted);
    const totalActiveTime = getTotalSessionTime();

    if (completedQuestions.length === 0) {
      return {
        averageTimePerQuestion: 0,
        fastestQuestion: null,
        slowestQuestion: null,
        totalActiveTime,
        totalPausedTime: session.pausedTime,
        efficiencyScore: 100,
        focusScore: 100
      };
    }

    const questionTimes = completedQuestions.map(q => ({ id: q.questionId, time: q.totalTime }));
    const averageTime = questionTimes.reduce((sum, q) => sum + q.time, 0) / questionTimes.length;
    
    const fastestQuestion = questionTimes.reduce((min, q) => q.time < min.time ? q : min);
    const slowestQuestion = questionTimes.reduce((max, q) => q.time > max.time ? q : max);

    // Calculate efficiency score (lower time = higher efficiency, capped at reasonable bounds)
    const expectedTimePerQuestion = 120000; // 2 minutes in milliseconds
    const efficiencyScore = Math.min(100, Math.max(0, 
      100 - ((averageTime - expectedTimePerQuestion) / expectedTimePerQuestion) * 50
    ));

    // Calculate focus score (fewer pauses and less pause time = higher focus)
    const maxReasonablePauses = 5;
    const maxReasonablePauseTime = 300000; // 5 minutes
    const pausePenalty = Math.min(50, (session.pauseCount / maxReasonablePauses) * 50);
    const pauseTimePenalty = Math.min(50, (session.pausedTime / maxReasonablePauseTime) * 50);
    const focusScore = Math.max(0, 100 - pausePenalty - pauseTimePenalty);

    return {
      averageTimePerQuestion: averageTime,
      fastestQuestion,
      slowestQuestion,
      totalActiveTime,
      totalPausedTime: session.pausedTime,
      efficiencyScore: Math.round(efficiencyScore),
      focusScore: Math.round(focusScore)
    };
  }, [session.questionTimings, session.pausedTime, session.pauseCount, getTotalSessionTime]);

  /**
   * Get formatted time string
   */
  const formatTime = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  }, []);

  // Auto-start session when component mounts
  useEffect(() => {
    if (session.startTime === 0) {
      startSession();
    }
    // Don't call endSession in cleanup to avoid infinite loops
    // Components should manually call endSession when needed
  }, [activityId]); // Only depend on activityId, not startSession

  return {
    // Session control
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    togglePause,

    // Question timing
    startQuestionTiming,
    endQuestionTiming,
    getCurrentQuestionTime,

    // Time getters
    getTotalSessionTime,
    getTimeAnalytics,
    formatTime,

    // Session state
    session,
    currentQuestionId,
    isPaused: session.isPaused,
    pauseCount: session.pauseCount,

    // Integration with existing time tracking
    getElapsedTime: () => getElapsedTime(activityId)
  };
}
