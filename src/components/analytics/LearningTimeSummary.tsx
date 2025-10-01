'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/trpc/react';
import { Clock, TrendingUp, BookOpen, Target } from 'lucide-react';
import {
  createStableLearningTimeParams,
  formatTimeMinutes,
  formatTimeDecimal,
  getTimeframeLabel
} from '@/utils/date-helpers';

interface LearningTimeSummaryProps {
  studentId: string;
  classId?: string;
  timeframe?: 'week' | 'month' | 'term';
  compact?: boolean;
}

export function LearningTimeSummary({
  studentId,
  classId,
  timeframe = 'month',
  compact = false
}: LearningTimeSummaryProps) {
  // Create stable date references to prevent infinite re-renders
  const queryParams = useMemo(() => {
    return createStableLearningTimeParams(classId, timeframe);
  }, [classId, timeframe]);

  // Get learning time statistics
  const { data: timeStats, isLoading } = api.learningTime.getLearningTimeStats.useQuery(
    queryParams,
    {
      enabled: !!studentId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create demo data when no real data is available
  const demoTimeStats = {
    totalTimeSpentMinutes: 450, // 7.5 hours
    totalActivitiesCompleted: 12,
    averageTimePerActivity: 37.5, // 37.5 minutes average
    dailyAverage: 64.3, // About 1 hour per day
    peakLearningTime: 'Afternoon',
    averageSessionLength: 25, // 25 minutes per session
    consistencyScore: 78,
    efficiencyScore: 85,
    timeSpentBySubject: [
      {
        subjectName: 'Mathematics',
        timeSpentMinutes: 180,
        activityCount: 5
      },
      {
        subjectName: 'Science',
        timeSpentMinutes: 150,
        activityCount: 4
      },
      {
        subjectName: 'English',
        timeSpentMinutes: 120,
        activityCount: 3
      }
    ]
  };

  // Use demo data if no real data is available
  const displayTimeStats = timeStats || demoTimeStats;

  // Use helper functions from utils
  const formatTime = formatTimeMinutes;
  const formatTimeDecimalLocal = formatTimeDecimal;
  const getTimeframeLabelLocal = () => getTimeframeLabel(timeframe);

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Learning Time</span>
            </div>
            <Badge variant="outline">{getTimeframeLabelLocal()}</Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{formatTimeDecimalLocal(displayTimeStats.totalTimeSpentMinutes)}</div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{displayTimeStats.totalActivitiesCompleted} activities</span>
              <span>Avg: {formatTime(Math.round(displayTimeStats.averageTimePerActivity || 0))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Learning Time Investment
        </CardTitle>
        <CardDescription>{getTimeframeLabelLocal()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {formatTimeDecimalLocal(displayTimeStats.totalTimeSpentMinutes)}
            </div>
            <p className="text-sm text-muted-foreground">Total Time</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {displayTimeStats.totalActivitiesCompleted}
            </div>
            <p className="text-sm text-muted-foreground">Activities</p>
          </div>
        </div>

        {/* Average Time per Activity */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Average per Activity</span>
            <span className="font-medium">{formatTime(Math.round(displayTimeStats.averageTimePerActivity || 0))}</span>
          </div>
          <Progress
            value={Math.min(100, (displayTimeStats.averageTimePerActivity || 0) / 30 * 100)}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Target: 30 minutes per activity
          </p>
        </div>

        {/* Top Subject */}
        {displayTimeStats.timeSpentBySubject && displayTimeStats.timeSpentBySubject.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Most Time Spent</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="font-medium">{displayTimeStats.timeSpentBySubject[0].subjectName}</div>
                <div className="text-sm text-muted-foreground">
                  {displayTimeStats.timeSpentBySubject[0].activityCount || 0} activities
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {formatTime(displayTimeStats.timeSpentBySubject[0].timeSpentMinutes)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((displayTimeStats.timeSpentBySubject[0].timeSpentMinutes / displayTimeStats.totalTimeSpentMinutes) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Learning Efficiency */}
        {displayTimeStats.efficiencyScore !== undefined && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Learning Efficiency</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Efficiency Score</span>
              <span className="font-medium">{Math.round(displayTimeStats.efficiencyScore)}%</span>
            </div>
            <Progress value={displayTimeStats.efficiencyScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Based on time spent vs. performance achieved
            </p>
          </div>
        )}

        {/* Study Pattern Insights */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Study Insights</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Average:</span>
              <span className="font-medium">{formatTime(Math.round(displayTimeStats.dailyAverage || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peak Time:</span>
              <span className="font-medium">{displayTimeStats.peakLearningTime || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session Length:</span>
              <span className="font-medium">{formatTime(Math.round(displayTimeStats.averageSessionLength || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consistency:</span>
              <Badge variant={(displayTimeStats.consistencyScore || 0) > 70 ? 'default' : 'secondary'} className="text-xs">
                {(displayTimeStats.consistencyScore || 0) > 70 ? 'High' : 'Moderate'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


