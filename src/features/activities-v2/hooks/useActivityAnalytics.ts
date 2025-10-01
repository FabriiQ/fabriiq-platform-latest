'use client';

/**
 * Activity Analytics Hook for Activities V2
 * 
 * Fetches and manages analytics data for activity performance tracking
 * Provides comprehensive metrics for teacher insights
 */

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';

interface ActivityAnalyticsData {
  activityId: string;
  activityTitle: string;
  activityType: 'quiz' | 'reading' | 'video';
  
  // Overall metrics
  totalStudents: number;
  attemptedStudents: number;
  completedStudents: number;
  averageScore: number;
  averageTimeSpent: number; // in minutes
  
  // Engagement metrics
  engagementRate: number; // percentage
  completionRate: number; // percentage
  retryRate: number; // percentage
  
  // Performance distribution
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  
  // Time-based analytics
  timeDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  
  // Question-level analytics (for quizzes)
  questionAnalytics?: {
    questionId: string;
    questionText: string;
    correctRate: number;
    averageTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  
  // Recent activity
  recentSubmissions: {
    studentName: string;
    score: number;
    timeSpent: number;
    submittedAt: Date;
    status: 'completed' | 'in_progress' | 'not_started';
  }[];
}

interface UseActivityAnalyticsReturn {
  data: ActivityAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  exportData: () => Promise<void>;
}

export function useActivityAnalytics(activityId: string): UseActivityAnalyticsReturn {
  const [data, setData] = useState<ActivityAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Query for basic activity analytics
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics 
  } = api.activityV2.getAnalytics.useQuery(
    { activityId },
    { 
      enabled: !!activityId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Query for detailed performance metrics
  const { 
    data: performanceData, 
    isLoading: performanceLoading,
    refetch: refetchPerformance 
  } = api.activityV2.getPerformanceMetrics.useQuery(
    { activityId },
    { 
      enabled: !!activityId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Query for question-level analytics (for quizzes)
  const { 
    data: questionData, 
    isLoading: questionLoading,
    refetch: refetchQuestions 
  } = api.activityV2.getQuestionAnalytics.useQuery(
    { activityId },
    { 
      enabled: !!activityId,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Export analytics data mutation
  const exportMutation = api.activityV2.exportAnalytics.useMutation({
    onSuccess: (exportData) => {
      // Create and download CSV file
      const blob = new Blob([exportData.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-analytics-${activityId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      setError(`Export failed: ${error.message}`);
    }
  });

  // Combine and process data when all queries complete
  useEffect(() => {
    if (analyticsData && performanceData) {
      const combinedData: ActivityAnalyticsData = {
        activityId: analyticsData.activityId,
        activityTitle: analyticsData.activityTitle,
        activityType: analyticsData.activityType,
        
        // Basic metrics
        totalStudents: analyticsData.totalStudents,
        attemptedStudents: analyticsData.attemptedStudents,
        completedStudents: analyticsData.completedStudents,
        averageScore: performanceData.averageScore,
        averageTimeSpent: performanceData.averageTimeSpent,
        
        // Engagement metrics
        engagementRate: Math.round((analyticsData.attemptedStudents / analyticsData.totalStudents) * 100),
        completionRate: Math.round((analyticsData.completedStudents / analyticsData.totalStudents) * 100),
        retryRate: performanceData.retryRate,
        
        // Distributions
        scoreDistribution: performanceData.scoreDistribution,
        timeDistribution: performanceData.timeDistribution,
        
        // Question analytics (if available)
        questionAnalytics: questionData?.questions,
        
        // Recent submissions
        recentSubmissions: performanceData.recentSubmissions.map((submission: any) => ({
          ...submission,
          submittedAt: new Date(submission.submittedAt)
        }))
      };

      setData(combinedData);
      setError(null);
    }
  }, [analyticsData, performanceData, questionData]);

  // Update loading state
  useEffect(() => {
    setIsLoading(analyticsLoading || performanceLoading || questionLoading);
  }, [analyticsLoading, performanceLoading, questionLoading]);

  // Handle errors
  useEffect(() => {
    if (analyticsError) {
      setError(analyticsError.message);
    }
  }, [analyticsError]);

  const refresh = async () => {
    try {
      setError(null);
      await Promise.all([
        refetchAnalytics(),
        refetchPerformance(),
        refetchQuestions()
      ]);
    } catch (error) {
      setError('Failed to refresh analytics data');
      console.error('Error refreshing analytics:', error);
    }
  };

  const exportData = async () => {
    try {
      setError(null);
      await exportMutation.mutateAsync({ activityId });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    exportData
  };
}

// Utility function to calculate performance insights
export function getPerformanceInsights(data: ActivityAnalyticsData) {
  const insights = {
    strengths: [] as string[],
    improvements: [] as string[],
    recommendations: [] as string[]
  };

  // Analyze completion rate
  if (data.completionRate >= 80) {
    insights.strengths.push(`High completion rate (${data.completionRate}%)`);
  } else if (data.completionRate < 60) {
    insights.improvements.push(`Low completion rate (${data.completionRate}%)`);
    insights.recommendations.push('Consider reviewing activity difficulty or providing additional support');
  }

  // Analyze average score
  if (data.averageScore >= 80) {
    insights.strengths.push(`Strong average performance (${data.averageScore}%)`);
  } else if (data.averageScore < 60) {
    insights.improvements.push(`Below-average performance (${data.averageScore}%)`);
    insights.recommendations.push('Review content difficulty and provide additional learning resources');
  }

  // Analyze engagement
  if (data.engagementRate >= 80) {
    insights.strengths.push(`High student engagement (${data.engagementRate}%)`);
  } else if (data.engagementRate < 60) {
    insights.improvements.push(`Low student engagement (${data.engagementRate}%)`);
    insights.recommendations.push('Consider making the activity more interactive or providing clearer instructions');
  }

  // Analyze time spent
  if (data.averageTimeSpent < 5) {
    insights.improvements.push('Students are completing the activity very quickly');
    insights.recommendations.push('Consider adding more challenging questions or content');
  } else if (data.averageTimeSpent > 30) {
    insights.improvements.push('Students are taking longer than expected');
    insights.recommendations.push('Review activity length and complexity');
  }

  return insights;
}

// Utility function to format analytics data for export
export function formatAnalyticsForExport(data: ActivityAnalyticsData): string {
  const headers = [
    'Metric',
    'Value',
    'Description'
  ];

  const rows = [
    ['Activity Title', data.activityTitle, 'Name of the activity'],
    ['Activity Type', data.activityType, 'Type of activity (quiz, reading, video)'],
    ['Total Students', data.totalStudents.toString(), 'Total number of students in class'],
    ['Students Attempted', data.attemptedStudents.toString(), 'Number of students who attempted the activity'],
    ['Students Completed', data.completedStudents.toString(), 'Number of students who completed the activity'],
    ['Average Score', `${data.averageScore}%`, 'Average score across all completed attempts'],
    ['Average Time Spent', `${data.averageTimeSpent} minutes`, 'Average time spent on the activity'],
    ['Engagement Rate', `${data.engagementRate}%`, 'Percentage of students who attempted the activity'],
    ['Completion Rate', `${data.completionRate}%`, 'Percentage of students who completed the activity'],
    ['Retry Rate', `${data.retryRate}%`, 'Percentage of students who made multiple attempts']
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
