'use client';

/**
 * Activity Analytics Dashboard for Activities V2
 * 
 * Comprehensive analytics dashboard that displays when teachers view their created activities
 * Shows performance metrics, student engagement, and detailed insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

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

interface ActivityAnalyticsDashboardProps {
  activityId: string;
  data: ActivityAnalyticsData;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

export const ActivityAnalyticsDashboard: React.FC<ActivityAnalyticsDashboardProps> = ({
  activityId,
  data,
  isLoading = false,
  onRefresh,
  onExport,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEngagementLevel = (rate: number) => {
    if (rate >= 80) return { label: 'High', color: 'bg-green-100 text-green-800' };
    if (rate >= 60) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Low', color: 'bg-red-100 text-red-800' };
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const engagementLevel = getEngagementLevel(data.engagementRate);

  return (
    <div className={`activity-analytics-dashboard space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Activity Analytics
          </h2>
          <p className="text-gray-600 mt-1">{data.activityTitle}</p>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{data.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{data.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={data.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(data.averageScore)}`}>
                  {data.averageScore}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Time Spent</p>
                <p className="text-2xl font-bold">{formatTime(data.averageTimeSpent)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Engagement Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Engagement Level</p>
              <Badge className={engagementLevel.color}>
                {engagementLevel.label}
              </Badge>
              <p className="text-lg font-semibold mt-1">{data.engagementRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Students Attempted</p>
              <p className="text-lg font-semibold">{data.attemptedStudents}</p>
              <p className="text-xs text-gray-500">
                {Math.round((data.attemptedStudents / data.totalStudents) * 100)}% of class
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Retry Rate</p>
              <p className="text-lg font-semibold">{data.retryRate}%</p>
              <p className="text-xs text-gray-500">Students who retried</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.scoreDistribution.map((range, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{range.range}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={range.percentage} className="w-20" />
                        <span className="text-sm font-medium">{range.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Time Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.timeDistribution.map((range, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{range.range}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={range.percentage} className="w-20" />
                        <span className="text-sm font-medium">{range.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• High completion rate ({data.completionRate}%)</li>
                      <li>• Good average performance ({data.averageScore}%)</li>
                      <li>• Appropriate time investment</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">Areas for Improvement</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• {data.totalStudents - data.attemptedStudents} students haven't attempted</li>
                      <li>• Consider reviewing difficult questions</li>
                      <li>• Monitor time allocation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          {data.questionAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle>Question-Level Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.questionAnalytics.map((question, index) => (
                    <div key={question.questionId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <Badge variant={
                          question.difficulty === 'easy' ? 'default' :
                          question.difficulty === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {question.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{question.questionText}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Correct Rate</p>
                          <p className={`font-semibold ${getPerformanceColor(question.correctRate)}`}>
                            {question.correctRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg. Time</p>
                          <p className="font-semibold">{formatTime(question.averageTime)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Student Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentSubmissions.map((submission, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {submission.studentName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{submission.studentName}</p>
                        <p className="text-xs text-gray-500">
                          {formatTime(submission.timeSpent)} • {submission.submittedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getPerformanceColor(submission.score)}`}>
                        {submission.score}%
                      </p>
                      <Badge variant={
                        submission.status === 'completed' ? 'default' :
                        submission.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {submission.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Mock data generator for development/testing
export function generateMockAnalyticsData(activityId: string, activityTitle: string, activityType: 'quiz' | 'reading' | 'video'): ActivityAnalyticsData {
  return {
    activityId,
    activityTitle,
    activityType,
    totalStudents: 30,
    attemptedStudents: 25,
    completedStudents: 22,
    averageScore: 78,
    averageTimeSpent: 15.5,
    engagementRate: 83,
    completionRate: 73,
    retryRate: 12,
    scoreDistribution: [
      { range: '90-100%', count: 8, percentage: 36 },
      { range: '80-89%', count: 6, percentage: 27 },
      { range: '70-79%', count: 4, percentage: 18 },
      { range: '60-69%', count: 3, percentage: 14 },
      { range: '0-59%', count: 1, percentage: 5 }
    ],
    timeDistribution: [
      { range: '0-10 min', count: 5, percentage: 23 },
      { range: '10-20 min', count: 12, percentage: 55 },
      { range: '20-30 min', count: 4, percentage: 18 },
      { range: '30+ min', count: 1, percentage: 4 }
    ],
    questionAnalytics: activityType === 'quiz' ? [
      {
        questionId: 'q1',
        questionText: 'What is the capital of France?',
        correctRate: 95,
        averageTime: 1.2,
        difficulty: 'easy'
      },
      {
        questionId: 'q2',
        questionText: 'Explain the process of photosynthesis.',
        correctRate: 65,
        averageTime: 3.8,
        difficulty: 'hard'
      }
    ] : undefined,
    recentSubmissions: [
      {
        studentName: 'Alice Johnson',
        score: 92,
        timeSpent: 18,
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        studentName: 'Bob Smith',
        score: 78,
        timeSpent: 22,
        submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        studentName: 'Carol Davis',
        score: 0,
        timeSpent: 5,
        submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'in_progress'
      }
    ]
  };
}
