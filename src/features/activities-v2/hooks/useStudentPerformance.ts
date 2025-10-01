'use client';

/**
 * Student Performance Hook for Activities V2
 * 
 * Fetches and manages student performance data for post-submission experience
 * Provides comprehensive statistics and insights
 */

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';

interface AttemptData {
  attemptNumber: number;
  score: number;
  timeSpent: number; // in minutes
  submittedAt: Date;
  feedback?: string;
}

interface PerformanceArea {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  isStrength: boolean;
}

interface ClassComparison {
  classAverage: number;
  studentRank: number;
  totalStudents: number;
  percentile: number;
}

interface StudentPerformanceData {
  activityTitle: string;
  activityType: 'quiz' | 'reading' | 'video';
  attempts: AttemptData[];
  maxAttempts: number;
  performanceAreas: PerformanceArea[];
  classComparison: ClassComparison;
  totalTimeSpent: number; // in minutes
  bestScore: number;
  averageScore: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  achievements: string[];
  recommendations: string[];
  hasExhaustedAttempts: boolean;
  canRetake: boolean;
}

interface UseStudentPerformanceReturn {
  data: StudentPerformanceData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStudentPerformance(
  activityId: string, 
  studentId: string
): UseStudentPerformanceReturn {
  const [data, setData] = useState<StudentPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query for student's attempts and performance
  const { 
    data: performanceData, 
    isLoading: performanceLoading, 
    error: performanceError,
    refetch: refetchPerformance 
  } = api.activityV2.getStudentPerformance.useQuery(
    { activityId, studentId },
    { 
      enabled: !!activityId && !!studentId,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Query for class comparison data
  const { 
    data: comparisonData, 
    isLoading: comparisonLoading,
    refetch: refetchComparison 
  } = api.activityV2.getClassComparison.useQuery(
    { activityId, studentId },
    { 
      enabled: !!activityId && !!studentId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Query for performance insights and recommendations
  const { 
    data: insightsData, 
    isLoading: insightsLoading,
    refetch: refetchInsights 
  } = api.activityV2.getPerformanceInsights.useQuery(
    { activityId, studentId },
    { 
      enabled: !!activityId && !!studentId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Combine and process data when all queries complete
  useEffect(() => {
    if (performanceData && comparisonData && insightsData) {
      // Calculate improvement trend
      const attempts = performanceData.attempts;
      let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
      
      if (attempts.length >= 2) {
        const firstHalf = attempts.slice(0, Math.ceil(attempts.length / 2));
        const secondHalf = attempts.slice(Math.ceil(attempts.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.score, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.score, 0) / secondHalf.length;
        
        if (secondHalfAvg > firstHalfAvg + 5) {
          improvementTrend = 'improving';
        } else if (secondHalfAvg < firstHalfAvg - 5) {
          improvementTrend = 'declining';
        }
      }

      // Calculate performance areas (strengths and weaknesses)
      const performanceAreas: PerformanceArea[] = insightsData.topicPerformance.map((topic: any) => ({
        topic: topic.name,
        score: topic.score,
        maxScore: topic.maxScore,
        percentage: Math.round((topic.score / topic.maxScore) * 100),
        isStrength: (topic.score / topic.maxScore) >= 0.8 // 80% or higher is considered a strength
      }));

      // Generate achievements based on performance
      const achievements: string[] = [];
      if (performanceData.bestScore >= 90) achievements.push('Excellence Award');
      if (performanceData.bestScore >= 80) achievements.push('High Achiever');
      if (improvementTrend === 'improving') achievements.push('Most Improved');
      if (performanceData.attempts.length === 1 && performanceData.bestScore >= 80) {
        achievements.push('First Try Success');
      }
      if (comparisonData.percentile >= 90) achievements.push('Top Performer');

      // Generate recommendations based on weaknesses
      const recommendations: string[] = [];
      const weakAreas = performanceAreas.filter(area => !area.isStrength);
      
      if (weakAreas.length > 0) {
        recommendations.push(`Focus on improving ${weakAreas[0].topic} - review related materials`);
      }
      
      if (performanceData.averageScore < 60) {
        recommendations.push('Consider scheduling a review session with your teacher');
        recommendations.push('Practice similar questions to strengthen understanding');
      }
      
      if (improvementTrend === 'declining') {
        recommendations.push('Review your study approach and seek additional support');
      }

      const combinedData: StudentPerformanceData = {
        activityTitle: performanceData.activityTitle,
        activityType: performanceData.activityType,
        attempts: performanceData.attempts.map((attempt: any) => ({
          ...attempt,
          submittedAt: new Date(attempt.submittedAt)
        })),
        maxAttempts: performanceData.maxAttempts,
        performanceAreas,
        classComparison: comparisonData,
        totalTimeSpent: performanceData.totalTimeSpent,
        bestScore: performanceData.bestScore,
        averageScore: performanceData.averageScore,
        improvementTrend,
        achievements,
        recommendations,
        hasExhaustedAttempts: performanceData.attempts.length >= performanceData.maxAttempts,
        canRetake: performanceData.canRetake
      };

      setData(combinedData);
      setError(null);
    }
  }, [performanceData, comparisonData, insightsData]);

  // Update loading state
  useEffect(() => {
    setIsLoading(performanceLoading || comparisonLoading || insightsLoading);
  }, [performanceLoading, comparisonLoading, insightsLoading]);

  // Handle errors
  useEffect(() => {
    if (performanceError) {
      setError(performanceError.message);
    }
  }, [performanceError]);

  const refresh = async () => {
    try {
      setError(null);
      await Promise.all([
        refetchPerformance(),
        refetchComparison(),
        refetchInsights()
      ]);
    } catch (error) {
      setError('Failed to refresh performance data');
      console.error('Error refreshing performance data:', error);
    }
  };

  return {
    data,
    isLoading,
    error,
    refresh
  };
}

// Utility function to generate mock performance data for development/testing
export function generateMockStudentPerformanceData(
  activityId: string,
  studentId: string,
  activityTitle: string,
  activityType: 'quiz' | 'reading' | 'video'
): StudentPerformanceData {
  const attempts: AttemptData[] = [
    {
      attemptNumber: 1,
      score: 65,
      timeSpent: 18,
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      feedback: 'Good effort, but review the concepts on photosynthesis.'
    },
    {
      attemptNumber: 2,
      score: 78,
      timeSpent: 22,
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      feedback: 'Much improved! Focus on the cellular respiration section.'
    },
    {
      attemptNumber: 3,
      score: 85,
      timeSpent: 25,
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      feedback: 'Excellent work! You have mastered the key concepts.'
    }
  ];

  const performanceAreas: PerformanceArea[] = [
    {
      topic: 'Photosynthesis',
      score: 8,
      maxScore: 10,
      percentage: 80,
      isStrength: true
    },
    {
      topic: 'Cellular Respiration',
      score: 6,
      maxScore: 10,
      percentage: 60,
      isStrength: false
    },
    {
      topic: 'Plant Structure',
      score: 9,
      maxScore: 10,
      percentage: 90,
      isStrength: true
    }
  ];

  const classComparison: ClassComparison = {
    classAverage: 72,
    studentRank: 8,
    totalStudents: 28,
    percentile: 75
  };

  return {
    activityTitle,
    activityType,
    attempts,
    maxAttempts: 3,
    performanceAreas,
    classComparison,
    totalTimeSpent: 65, // Total across all attempts
    bestScore: 85,
    averageScore: 76,
    improvementTrend: 'improving',
    achievements: ['Most Improved', 'High Achiever'],
    recommendations: [
      'Review cellular respiration concepts to strengthen understanding',
      'Practice more questions on energy transfer in cells'
    ],
    hasExhaustedAttempts: true,
    canRetake: false
  };
}
