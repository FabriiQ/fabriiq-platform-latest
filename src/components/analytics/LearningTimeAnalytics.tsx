'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/trpc/react';
import { Clock, TrendingUp, BookOpen, Target, Calendar, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { createStableLearningTimeParams } from '@/utils/date-helpers';

interface LearningTimeAnalyticsProps {
  studentId: string;
  classId?: string;
  timeframe?: 'week' | 'month' | 'term';
  showComparison?: boolean;
}

export function LearningTimeAnalytics({
  studentId,
  classId,
  timeframe = 'month',
  showComparison = false
}: LearningTimeAnalyticsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Create stable date references to prevent infinite re-renders
  const queryParams = useMemo(() => {
    return createStableLearningTimeParams(classId, selectedTimeframe);
  }, [classId, selectedTimeframe]);

  // Get learning time statistics - DISABLED FOR DEMO MODE
  const { data: timeStats } = api.learningTime.getStudentLearningTimeStats.useQuery(
    {
      studentId,
      ...queryParams,
    },
    {
      enabled: false, // DISABLED - Show demo data only
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  // Force loading state to false for demo mode
  const isLoading = false;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Create demo data if no real data is available
  const demoTimeStats = {
    totalTimeSpentMinutes: 420, // 7 hours
    totalActivitiesCompleted: 15,
    averageTimePerActivity: 28, // 28 minutes
    mostActiveDay: 'Monday',
    mostActiveTime: 180, // 3 hours on Monday
    dailyAverage: 60, // 1 hour per day
    timeSpentBySubject: [
      { subjectId: '1', subjectName: 'Mathematics', timeSpentMinutes: 180, activitiesCompleted: 6 },
      { subjectId: '2', subjectName: 'Science', timeSpentMinutes: 120, activitiesCompleted: 4 },
      { subjectId: '3', subjectName: 'English', timeSpentMinutes: 90, activitiesCompleted: 3 },
      { subjectId: '4', subjectName: 'History', timeSpentMinutes: 30, activitiesCompleted: 2 }
    ],
    timeSpentByActivityType: [
      { activityType: 'Quiz', timeSpentMinutes: 150, activitiesCompleted: 8 },
      { activityType: 'Reading', timeSpentMinutes: 120, activitiesCompleted: 4 },
      { activityType: 'Video', timeSpentMinutes: 90, activitiesCompleted: 2 },
      { activityType: 'Assignment', timeSpentMinutes: 60, activitiesCompleted: 1 }
    ],
    dailyTrends: [
      { date: '2025-09-08', timeSpentMinutes: 90 },
      { date: '2025-09-09', timeSpentMinutes: 60 },
      { date: '2025-09-10', timeSpentMinutes: 75 },
      { date: '2025-09-11', timeSpentMinutes: 45 },
      { date: '2025-09-12', timeSpentMinutes: 80 },
      { date: '2025-09-13', timeSpentMinutes: 40 },
      { date: '2025-09-14', timeSpentMinutes: 30 }
    ],
    dailyTimeSpent: [
      { day: 'Mon', timeSpentMinutes: 90 },
      { day: 'Tue', timeSpentMinutes: 60 },
      { day: 'Wed', timeSpentMinutes: 75 },
      { day: 'Thu', timeSpentMinutes: 45 },
      { day: 'Fri', timeSpentMinutes: 80 },
      { day: 'Sat', timeSpentMinutes: 40 },
      { day: 'Sun', timeSpentMinutes: 30 }
    ],
    weeklyTrend: [
      { week: 'Week 1', timeSpentMinutes: 300 },
      { week: 'Week 2', timeSpentMinutes: 350 },
      { week: 'Week 3', timeSpentMinutes: 420 },
      { week: 'Week 4', timeSpentMinutes: 380 }
    ],
    efficiencyScore: 78,
    peakLearningTime: 'Morning',
    averageSessionLength: 28,
    consistencyScore: 85,
    efficiencyMetrics: {
      averageScorePerMinute: 2.5,
      completionRate: 85,
      focusScore: 78
    }
  };

  const displayTimeStats = timeStats || demoTimeStats;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeDecimal = (minutes: number) => {
    return (minutes / 60).toFixed(1) + 'h';
  };

  // Helper functions to safely access properties from different data structures
  const getDailyTrendsData = (stats: any) => {
    return stats?.dailyTrends || stats?.dailyTimeSpent || [];
  };

  const getEfficiencyScore = (stats: any) => {
    return stats?.efficiencyMetrics?.focusScore || stats?.efficiencyScore || 0;
  };

  const getConsistencyScore = (stats: any) => {
    return stats?.efficiencyMetrics?.completionRate || stats?.consistencyScore || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Learning Time Analytics</h3>
        </div>
        <Select value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="term">This Term</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Time</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatTimeDecimal(displayTimeStats.totalTimeSpentMinutes)}</div>
              <p className="text-xs text-muted-foreground">
                {displayTimeStats.totalActivitiesCompleted} activities
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Avg per Activity</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {formatTime(Math.round(displayTimeStats.averageTimePerActivity || 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Per activity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Most Active</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold">
                {displayTimeStats.timeSpentBySubject?.[0]?.subjectName || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {displayTimeStats.timeSpentBySubject?.[0] ? formatTime(displayTimeStats.timeSpentBySubject[0].timeSpentMinutes) : '0m'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Daily Average</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {formatTime(Math.round(displayTimeStats.dailyAverage || 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Per day (est.)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="activities">By Activity Type</TabsTrigger>
          <TabsTrigger value="trends">Time Trends</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Time Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time by Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={displayTimeStats.timeSpentBySubject}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatTime(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="timeSpentMinutes"
                    >
                      {displayTimeStats.timeSpentBySubject?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatTime(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Details List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {displayTimeStats.timeSpentBySubject?.map((subject, index) => (
                  <div key={subject.subjectId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{subject.subjectName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatTime(subject.timeSpentMinutes)}</div>
                      <div className="text-xs text-muted-foreground">
                        {subject.activitiesCompleted || 0} activities
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time by Activity Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayTimeStats?.timeSpentByActivityType || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="activityType" />
                  <YAxis tickFormatter={(value) => formatTime(value)} />
                  <Tooltip formatter={(value: any) => formatTime(value)} />
                  <Bar dataKey="timeSpentMinutes" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Time Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getDailyTrendsData(displayTimeStats)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={getDailyTrendsData(displayTimeStats).length > 0 && getDailyTrendsData(displayTimeStats)[0]?.date ? "date" : "day"} />
                  <YAxis tickFormatter={(value) => formatTime(value)} />
                  <Tooltip formatter={(value: any) => formatTime(value)} />
                  <Line type="monotone" dataKey="timeSpentMinutes" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Learning Efficiency</CardTitle>
                <CardDescription>Time spent vs. performance correlation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Efficiency Score</span>
                      <span className="font-medium">{Math.round(getEfficiencyScore(displayTimeStats))}%</span>
                    </div>
                    <Progress value={getEfficiencyScore(displayTimeStats)} className="h-2" />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Based on time spent relative to activities completed.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Study Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Peak Learning Time</span>
                  <Badge variant="outline">{'Morning'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Session Length</span>
                  <span className="text-sm font-medium">
                    {formatTime(Math.round(displayTimeStats.averageTimePerActivity || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Study Consistency</span>
                  <Badge variant={getConsistencyScore(displayTimeStats) > 70 ? 'default' : 'secondary'}>
                    {getConsistencyScore(displayTimeStats) > 70 ? 'High' : 'Moderate'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get start date based on timeframe
function getStartDate(timeframe: string): Date {
  const now = new Date();
  switch (timeframe) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'term':
      // Assuming term starts 3 months ago
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
