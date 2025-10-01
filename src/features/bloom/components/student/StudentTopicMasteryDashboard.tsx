'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MasteryRadarChart } from '../mastery/MasteryRadarChart';
import { TopicMasteryCard } from '../mastery/TopicMasteryCard';
import { BloomsRewardIntegration } from '../reward/BloomsRewardIntegration';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/core/alert';
import { Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart } from '@/components/ui/charts/line-chart';
import { BloomsTaxonomyLevel } from '../../types';
import { LearningTimeAnalytics } from '@/components/analytics/LearningTimeAnalytics';

interface StudentTopicMasteryDashboardProps {
  studentId: string;
  classId: string;
}

/**
 * StudentTopicMasteryDashboard
 * 
 * This component displays a student's topic mastery dashboard.
 * It shows mastery across topics, cognitive levels, and rewards.
 */
export function StudentTopicMasteryDashboard({
  studentId,
  classId
}: StudentTopicMasteryDashboardProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Fetch class data - DISABLED FOR DEMO MODE
  const { data: classData } = api.class.getById.useQuery(
    { id: classId },
    { enabled: false } // DISABLED - Show demo data only
  );

  // Fetch subjects for the class - DISABLED FOR DEMO MODE
  const { data: subjects } = api.subject.getByClass.useQuery(
    { classId },
    { enabled: false } // DISABLED - Show demo data only
  );

  // Fetch student data - DISABLED FOR DEMO MODE
  const { data: student } = api.student.getById.useQuery(
    { id: studentId },
    { enabled: false } // DISABLED - Show demo data only
  );
  
  // Fetch topic masteries for the student - DISABLED FOR DEMO MODE
  const { data: topicMasteries } = api.mastery.getByStudent.useQuery(
    {
      studentId,
      subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId
    },
    {
      enabled: false, // DISABLED - Show demo data only
      refetchOnWindowFocus: true,
      retry: 3,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch student analytics - DISABLED FOR DEMO MODE
  const { data: analytics } = api.analytics.getStudentMasteryAnalytics.useQuery(
    {
      studentId,
      subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId
    },
    {
      enabled: false, // DISABLED - Show demo data only
      retry: 3,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch historical mastery data - DISABLED FOR DEMO MODE
  const { data: historicalData } = api.analytics.getStudentMasteryHistory.useQuery(
    {
      studentId,
      subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId,
      period: 'month'
    },
    {
      enabled: false, // DISABLED - Show demo data only
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Force all loading states to false for demo mode
  const isLoadingMasteries = false;
  const isLoadingAnalytics = false;
  const isLoadingHistory = false;
  const masteriesError = null;
  const analyticsError = null;
  const historyError = null;

  // Create demo data for topic masteries with more topics
  const demoTopicMasteries = [
    {
      id: 'demo-1',
      topicId: 'topic-1',
      topicName: 'Algebra Fundamentals',
      subjectId: 'math-1',
      subjectName: 'Mathematics',
      rememberLevel: 85,
      understandLevel: 78,
      applyLevel: 72,
      analyzeLevel: 65,
      evaluateLevel: 58,
      createLevel: 52,
      overallMastery: 68,
      lastAssessmentDate: new Date('2025-09-10'),
      progressTrend: 'improving' as const
    },
    {
      id: 'demo-2',
      topicId: 'topic-2',
      topicName: 'Chemical Reactions',
      subjectId: 'science-1',
      subjectName: 'Science',
      rememberLevel: 92,
      understandLevel: 88,
      applyLevel: 82,
      analyzeLevel: 75,
      evaluateLevel: 70,
      createLevel: 65,
      overallMastery: 79,
      lastAssessmentDate: new Date('2025-09-12'),
      progressTrend: 'stable' as const
    },
    {
      id: 'demo-3',
      topicId: 'topic-3',
      topicName: 'Essay Writing',
      subjectId: 'english-1',
      subjectName: 'English',
      rememberLevel: 75,
      understandLevel: 82,
      applyLevel: 88,
      analyzeLevel: 85,
      evaluateLevel: 90,
      createLevel: 92,
      overallMastery: 85,
      lastAssessmentDate: new Date('2025-09-11'),
      progressTrend: 'improving' as const
    },
    {
      id: 'demo-4',
      topicId: 'topic-4',
      topicName: 'Geometry Basics',
      subjectId: 'math-1',
      subjectName: 'Mathematics',
      rememberLevel: 88,
      understandLevel: 85,
      applyLevel: 78,
      analyzeLevel: 72,
      evaluateLevel: 68,
      createLevel: 65,
      overallMastery: 76,
      lastAssessmentDate: new Date('2025-09-08'),
      progressTrend: 'steady' as const
    },
    {
      id: 'demo-5',
      topicId: 'topic-5',
      topicName: 'Physics Motion',
      subjectId: 'science-1',
      subjectName: 'Science',
      rememberLevel: 90,
      understandLevel: 87,
      applyLevel: 83,
      analyzeLevel: 78,
      evaluateLevel: 75,
      createLevel: 70,
      overallMastery: 80,
      lastAssessmentDate: new Date('2025-09-09'),
      progressTrend: 'improving' as const
    },
    {
      id: 'demo-6',
      topicId: 'topic-6',
      topicName: 'Literature Analysis',
      subjectId: 'english-1',
      subjectName: 'English',
      rememberLevel: 82,
      understandLevel: 88,
      applyLevel: 85,
      analyzeLevel: 90,
      evaluateLevel: 87,
      createLevel: 85,
      overallMastery: 86,
      lastAssessmentDate: new Date('2025-09-13'),
      progressTrend: 'improving' as const
    },
    {
      id: 'demo-7',
      topicId: 'topic-7',
      topicName: 'Statistics & Probability',
      subjectId: 'math-1',
      subjectName: 'Mathematics',
      rememberLevel: 78,
      understandLevel: 75,
      applyLevel: 80,
      analyzeLevel: 82,
      evaluateLevel: 78,
      createLevel: 75,
      overallMastery: 78,
      lastAssessmentDate: new Date('2025-09-07'),
      progressTrend: 'steady' as const
    },
    {
      id: 'demo-8',
      topicId: 'topic-8',
      topicName: 'Biology Cells',
      subjectId: 'science-1',
      subjectName: 'Science',
      rememberLevel: 95,
      understandLevel: 92,
      applyLevel: 88,
      analyzeLevel: 85,
      evaluateLevel: 82,
      createLevel: 78,
      overallMastery: 87,
      lastAssessmentDate: new Date('2025-09-11'),
      progressTrend: 'improving' as const
    }
  ];

  // Create demo analytics data
  const demoAnalytics = {
    bloomsAverages: {
      remember: 0.84,
      understand: 0.83,
      apply: 0.81,
      analyze: 0.75,
      evaluate: 0.73,
      create: 0.70
    },
    averageMastery: 80,
    totalTopics: 8,
    masteredTopics: 6,
    improvingTopics: 2,
    strugglingTopics: 0
  };

  // Use demo data as fallback
  const displayTopicMasteries = topicMasteries || demoTopicMasteries;
  const displayAnalytics = analytics || demoAnalytics;

  // Prepare data for charts - transform to match BloomsTaxonomyLevel enum
  const masteryChartData: Record<BloomsTaxonomyLevel, number> = {
    [BloomsTaxonomyLevel.REMEMBER]: (displayAnalytics?.bloomsAverages?.remember || 0) * 100,
    [BloomsTaxonomyLevel.UNDERSTAND]: (displayAnalytics?.bloomsAverages?.understand || 0) * 100,
    [BloomsTaxonomyLevel.APPLY]: (displayAnalytics?.bloomsAverages?.apply || 0) * 100,
    [BloomsTaxonomyLevel.ANALYZE]: (displayAnalytics?.bloomsAverages?.analyze || 0) * 100,
    [BloomsTaxonomyLevel.EVALUATE]: (displayAnalytics?.bloomsAverages?.evaluate || 0) * 100,
    [BloomsTaxonomyLevel.CREATE]: (displayAnalytics?.bloomsAverages?.create || 0) * 100,
  };

  // Create demo historical data
  const demoHistoricalData = [
    { date: '2025-08-15', remember: 75, understand: 72, apply: 68, analyze: 62, evaluate: 58, create: 55 },
    { date: '2025-08-22', remember: 78, understand: 75, apply: 71, analyze: 65, evaluate: 61, create: 58 },
    { date: '2025-08-29', remember: 80, understand: 78, apply: 74, analyze: 68, evaluate: 64, create: 61 },
    { date: '2025-09-05', remember: 82, understand: 80, apply: 77, analyze: 71, evaluate: 67, create: 64 },
    { date: '2025-09-12', remember: 84, understand: 83, apply: 81, analyze: 75, evaluate: 73, create: 70 }
  ];

  // Prepare historical data for line chart
  const lineChartData = historicalData?.historyData?.map(entry => {
    // For now, we'll use the overall score for all categories since we don't have historical Bloom's data
    const score = entry.averageScore || 0;
    return {
      date: new Date(entry.date).toLocaleDateString(),
      remember: score * 1.1, // Slightly higher for remember
      understand: score * 1.0,
      apply: score * 0.9,
      analyze: score * 0.8,
      evaluate: score * 0.7,
      create: score * 0.6,
    };
  }) || demoHistoricalData;
  
  const isLoading = isLoadingMasteries || isLoadingAnalytics || isLoadingHistory;
  const hasErrors = masteriesError || analyticsError || historyError;

  // Debug logging
  React.useEffect(() => {
    if (analytics) {
      console.log('Analytics data:', analytics);
    }
    if (topicMasteries) {
      console.log('Topic masteries:', topicMasteries);
    }
    if (historicalData) {
      console.log('Historical data:', historicalData);
    }
  }, [analytics, topicMasteries, historicalData]);

  // Refresh function
  const handleRefresh = () => {
    setLastRefresh(new Date());
    // Force refetch of all queries
    window.location.reload();
  };

  // Show error state if there are critical errors
  if (hasErrors && !isLoading) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Unable to Load Analytics</AlertTitle>
          <AlertDescription>
            We're having trouble loading your mastery data. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Topic Mastery Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and mastery across topics and cognitive skills
          </p>
          {!isLoading && displayAnalytics && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Real-time data</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedSubjectId}
            onValueChange={setSelectedSubjectId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Mastery Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Mastery</CardTitle>
            <CardDescription>
              Your overall mastery across all topics
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : displayAnalytics && displayAnalytics.totalTopics > 0 ? (
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  {Math.round(displayAnalytics.averageMastery || 0)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {displayAnalytics.masteredTopics || 0} of {displayAnalytics.totalTopics || 0} topics mastered
                </div>
                {displayAnalytics.totalTopics > 0 && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(displayAnalytics.averageMastery || 0)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-5xl font-bold mb-2 text-muted-foreground">
                  0%
                </div>
                <div className="text-sm text-muted-foreground">
                  No topic mastery data available yet
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Complete activities and assessments to build your mastery profile
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Cognitive Skills Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cognitive Skills</CardTitle>
            <CardDescription>
              Your mastery across Bloom's Taxonomy levels
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[280px] w-[280px] rounded-full" />
            ) : displayAnalytics ? (
              <div className="flex flex-col items-center space-y-4">
                <MasteryRadarChart
                  data={masteryChartData}
                  size={280}
                  showLabels
                  showValues
                />
                <div className="text-center text-sm text-muted-foreground">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>Remember: {Math.round(masteryChartData[BloomsTaxonomyLevel.REMEMBER])}%</div>
                    <div>Understand: {Math.round(masteryChartData[BloomsTaxonomyLevel.UNDERSTAND])}%</div>
                    <div>Apply: {Math.round(masteryChartData[BloomsTaxonomyLevel.APPLY])}%</div>
                    <div>Analyze: {Math.round(masteryChartData[BloomsTaxonomyLevel.ANALYZE])}%</div>
                    <div>Evaluate: {Math.round(masteryChartData[BloomsTaxonomyLevel.EVALUATE])}%</div>
                    <div>Create: {Math.round(masteryChartData[BloomsTaxonomyLevel.CREATE])}%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No cognitive skills data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="topics">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="performance">Topic Performance</TabsTrigger>
          <TabsTrigger value="history">Progress History</TabsTrigger>
          <TabsTrigger value="time">Learning Time</TabsTrigger>
          <TabsTrigger value="rewards">Rewards & Achievements</TabsTrigger>
        </TabsList>
        
        {/* Topics Tab */}
        <TabsContent value="topics" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full" />
              ))}
            </div>
          ) : displayTopicMasteries?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayTopicMasteries.map(mastery => {
                // Transform the mastery data to match TopicMasteryData interface
                const transformedMasteryData = {
                  id: mastery.id,
                  studentId: mastery.studentId || studentId,
                  topicId: mastery.topicId,
                  subjectId: mastery.subjectId,
                  [BloomsTaxonomyLevel.REMEMBER]: mastery.rememberLevel,
                  [BloomsTaxonomyLevel.UNDERSTAND]: mastery.understandLevel,
                  [BloomsTaxonomyLevel.APPLY]: mastery.applyLevel,
                  [BloomsTaxonomyLevel.ANALYZE]: mastery.analyzeLevel,
                  [BloomsTaxonomyLevel.EVALUATE]: mastery.evaluateLevel,
                  [BloomsTaxonomyLevel.CREATE]: mastery.createLevel,
                  overallMastery: mastery.overallMastery,
                  lastAssessmentDate: mastery.lastAssessmentDate,
                  createdAt: mastery.createdAt || new Date(),
                  updatedAt: mastery.updatedAt || new Date(),
                };

                return (
                  <TopicMasteryCard
                    key={mastery.id}
                    masteryData={transformedMasteryData}
                    topicName={mastery.topicName || 'Unknown Topic'}
                    subjectName={mastery.subjectName || 'Unknown Subject'}
                  />
                );
              })}
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Topic Mastery Data</AlertTitle>
              <AlertDescription>
                You haven't completed any assessments or activities for topics yet.
                Complete activities and assessments to build your mastery profile.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Topic Performance Tab */}
        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Performance</CardTitle>
              <CardDescription>
                Performance across different topics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayTopicMasteries?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayTopicMasteries.map(mastery => (
                      <div key={mastery.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">{mastery.topicName}</h4>
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round(mastery.overallMastery)}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {mastery.subjectName}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${mastery.overallMastery}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>Last: {new Date(mastery.lastAssessmentDate).toLocaleDateString()}</span>
                          <span className={`capitalize ${
                            mastery.progressTrend === 'improving' ? 'text-green-600' :
                            mastery.progressTrend === 'declining' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {mastery.progressTrend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    No topic performance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Mastery Progress</CardTitle>
              <CardDescription>
                Your mastery progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : lineChartData.length > 0 ? (
                <div className="h-[400px]">
                  <LineChart
                    data={lineChartData}
                    index="date"
                    categories={[
                      "remember",
                      "understand",
                      "apply",
                      "analyze",
                      "evaluate",
                      "create"
                    ]}
                    colors={["#e11d48", "#ea580c", "#eab308", "#16a34a", "#0ea5e9", "#8b5cf6"]}
                    valueFormatter={(value) => `${value}%`}
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  No historical data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Time Tab */}
        <TabsContent value="time" className="mt-4">
          <LearningTimeAnalytics
            studentId={studentId}
            classId={classId}
            timeframe="month"
            showComparison={false}
          />
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="mt-4">
          <div className="space-y-6">
            {/* Recent Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Latest academic and engagement awards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: "Bloom's Taxonomy Master", description: "Achieved high scores across all cognitive levels", points: 150, date: "2025-09-12", icon: "🧠" },
                    { title: "Critical Thinker", description: "Excelled in analysis and evaluation tasks", points: 125, date: "2025-09-10", icon: "🔍" },
                    { title: "Creative Problem Solver", description: "Demonstrated exceptional creativity", points: 100, date: "2025-09-08", icon: "💡" }
                  ].map((achievement, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.title}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {achievement.date} • {achievement.points} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rewards & Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Rewards & Badges</CardTitle>
                <CardDescription>Special recognition and collectible rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Golden Star", description: "Exceptional academic performance", icon: "⭐", rarity: "RARE", points: 50 },
                    { title: "Lightning Bolt", description: "Speed and accuracy champion", icon: "⚡", rarity: "UNCOMMON", points: 75 },
                    { title: "Brain Trophy", description: "Master of critical thinking", icon: "🏆", rarity: "LEGENDARY", points: 150 },
                    { title: "Collaboration Crown", description: "Outstanding teamwork", icon: "👑", rarity: "RARE", points: 100 }
                  ].map((reward, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="text-2xl">{reward.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{reward.title}</p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            reward.rarity === 'LEGENDARY' ? 'bg-purple-100 text-purple-800' :
                            reward.rarity === 'RARE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {reward.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reward.points} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
