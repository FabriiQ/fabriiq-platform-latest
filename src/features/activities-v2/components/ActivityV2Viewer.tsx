'use client';

/**
 * Activities V2 Viewer Component
 * 
 * Main component for viewing/taking Activities V2
 * Routes to appropriate viewer based on activity type
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuizViewer } from './quiz/QuizViewer';
import { ReadingViewer } from './reading/ReadingViewer';
import { VideoViewer } from './video/VideoViewer';
import { StudentPerformanceStats } from './student/StudentPerformanceStats';
import { useStudentPerformance } from '../hooks/useStudentPerformance';
import { ActivityV2Content } from '../types';
import { api } from '@/trpc/react';
import { BookOpen, Play, HelpCircle, Clock, Award, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ActivityCompletionHandler, RewardResult } from '@/features/activties/components/reward-integration/ActivityCompletionHandler';
import { MasteryUpdateHandler } from '@/features/bloom/components/mastery/MasteryUpdateHandler';

interface ActivityV2ViewerProps {
  activityId: string;
  studentId?: string; // For teacher preview mode
  onComplete?: (result: any) => void;
  onBack?: () => void;
}

export const ActivityV2Viewer: React.FC<ActivityV2ViewerProps> = ({
  activityId,
  studentId,
  onComplete,
  onBack
}) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [activityResult, setActivityResult] = useState<any>(null);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
  const [activityGradeId, setActivityGradeId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Check student performance and attempt status with optimized loading
  const {
    data: performanceData,
    isLoading: performanceLoading,
    error: performanceError
  } = useStudentPerformance(activityId, studentId || '');

  // Get activity data with error handling
  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity
  } = api.activityV2.getById.useQuery({
    id: activityId
  }, {
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get student's previous attempts (if any) with optimized loading
  const {
    data: attempts,
    isLoading: attemptsLoading,
    error: attemptsError
  } = api.activityV2.getAttempts.useQuery({
    activityId,
    studentId
  }, {
    enabled: !!studentId,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Combined loading state
  const isLoading = activityLoading || (studentId && attemptsLoading);
  const hasError = activityError || attemptsError || performanceError;

  // Countdown and redirect functionality
  const startResultsCountdown = () => {
    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGoToActivities();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoToActivities = () => {
    if (onBack) {
      onBack();
    } else {
      // Default redirect logic - you can customize this
      window.history.back();
    }
  };

  const handleStart = () => {
    setHasStarted(true);
  };

  // Get tRPC utils for query invalidation
  const utils = api.useContext();

  // Wire submission to server and then surface result
  const submitMutation = api.activityV2.submit.useMutation();

  const handleActivityComplete = async (payload: any) => {
    console.log('Activity completion payload:', payload); // Debug log
    console.log('Time spent from payload:', payload?.timeSpent, typeof payload?.timeSpent); // Debug time specifically
    
    // Ensure timeSpent is properly converted to number
    const timeSpent = payload?.timeSpent ? Number(payload.timeSpent) : 0;
    console.log('Processed timeSpent:', timeSpent); // Debug processed time
    
    try {
      // Submit to Activities V2 API so grade/progress are persisted
      const submission = await submitMutation.mutateAsync({
        activityId,
        answers: payload?.answers || {},
        timeSpent: timeSpent,
        questionTimings: payload?.questionTimings || {},
        assessmentMode: (activity?.content as any)?.assessmentMode || 'standard',
        catSession: payload?.catData || null
      });

      console.log('Activity submission result:', submission); // Debug log

      // Extract achievement data for animation
      const result = submission.result || submission;
      const achievements = result.achievements || [];
      const totalPoints = achievements.reduce((sum: number, ach: any) => sum + (ach.points || 0), 0);

      // Extract activity grade ID for mastery updates
      if (result.activityGradeId) {
        setActivityGradeId(result.activityGradeId);
      }

      // Set up reward result for animations
      if (achievements.length > 0 || totalPoints > 0) {
        setRewardResult({
          points: totalPoints,
          achievements: achievements.map((ach: any) => ({
            id: ach.id || `achievement-${Date.now()}`,
            title: ach.title || 'Achievement Unlocked!',
            description: ach.description,
            type: ach.type || 'activity',
            icon: ach.icon
          }))
        });
      }

      setActivityResult(submission);
      setShowResults(true);
      
      // Invalidate relevant queries to refresh points and achievements
      try {
        await utils.student.getClassDetails.invalidate();
        await utils.points.getPointsHistory.invalidate();
        await utils.achievement.getStudentAchievements.invalidate();
        console.log('Queries invalidated after quiz submission');
      } catch (invalidationError) {
        console.warn('Failed to invalidate queries:', invalidationError);
      }
      
      // Start countdown for auto-redirect
      startResultsCountdown();
      
      if (onComplete) {
        onComplete(submission);
      }
    } catch (e) {
      console.error('Failed to submit activity v2:', e);
      // Fall back to previous behavior to avoid blocking the user
      setActivityResult(payload);
      setShowResults(true);
      startResultsCountdown();
      if (onComplete) onComplete(payload);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return HelpCircle;
      case 'reading': return BookOpen;
      case 'video': return Play;
      default: return HelpCircle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-blue-500';
      case 'reading': return 'bg-green-500';
      case 'video': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const canStartActivity = (): boolean => {
    if (!activity) return false;

    const activityContent = activity.content as unknown as ActivityV2Content;

    // Check if activity has attempts limit
    if (activityContent.type === 'quiz') {
      const quizContent = activityContent as any;
      if (quizContent.settings?.attemptsAllowed) {
        const attemptsUsed = attempts?.length || 0;
        if (quizContent.settings.attemptsAllowed !== -1 && attemptsUsed >= quizContent.settings.attemptsAllowed) {
          return false;
        }
      }
    }

    return true;
  };

  const getAttemptInfo = () => {
    if (!attempts || attempts.length === 0) return null;
    
    const lastAttempt = attempts[0]; // Assuming sorted by date desc
    const passed = activity?.passingScore
      ? (lastAttempt.score || 0) >= activity.passingScore
      : true; // If no passing score set, consider passed

    return {
      count: attempts.length,
      lastScore: lastAttempt.score,
      lastDate: new Date(lastAttempt.createdAt),
      passed
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {activityLoading ? 'Loading activity...' :
             attemptsLoading ? 'Loading your progress...' :
             'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (hasError || !activity) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="text-red-500 text-lg mb-2">⚠️ Unable to Load Activity</div>
          <p className="text-gray-600 mb-4">
            {activityError ? 'Failed to load activity data.' :
             attemptsError ? 'Failed to load your progress.' :
             performanceError ? 'Failed to load performance data.' :
             'Activity not found.'}
          </p>
          <div className="space-x-2">
            <Button
              onClick={() => refetchActivity()}
              variant="outline"
              disabled={activityLoading}
            >
              {activityLoading ? 'Retrying...' : 'Try Again'}
            </Button>
            {onBack && (
              <Button onClick={onBack} variant="ghost">
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const content = activity.content as unknown as ActivityV2Content;
  const Icon = getActivityIcon(content.type);
  const attemptInfo = getAttemptInfo();

  // Show performance stats if student has exhausted all attempts
  if (performanceData && performanceData.hasExhaustedAttempts && !performanceData.canRetake && studentId) {
    return (
      <div className="max-w-4xl mx-auto">
        <StudentPerformanceStats
          activityTitle={performanceData.activityTitle}
          activityType={performanceData.activityType}
          attempts={performanceData.attempts}
          maxAttempts={performanceData.maxAttempts}
          performanceAreas={performanceData.performanceAreas}
          classComparison={performanceData.classComparison}
          totalTimeSpent={performanceData.totalTimeSpent}
          bestScore={performanceData.bestScore}
          averageScore={performanceData.averageScore}
          improvementTrend={performanceData.improvementTrend}
          achievements={performanceData.achievements}
          recommendations={performanceData.recommendations}
        />
        {onBack && (
          <div className="text-center mt-6">
            <Button onClick={onBack} variant="outline">
              Back to Activities
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Show completion result
  if (showResults && activityResult) {
    return (
      <>
        <div className="activity-result max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className={`w-16 h-16 ${getActivityColor(content.type)} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            <CardTitle className="text-2xl">Activity Completed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {activityResult?.result?.percentage || activityResult?.percentage || 0}%
                </div>
                <div className="text-sm text-blue-600">Score</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {activityResult?.result?.achievements?.reduce((sum: number, ach: any) => sum + (ach.points || 0), 0) || 0}
                </div>
                <div className="text-sm text-green-600">Points Earned</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((activityResult?.timeSpent || 0) / 60)}m
                </div>
                <div className="text-sm text-purple-600">Time Spent</div>
              </div>
            </div>
            
            {(activityResult?.result?.passed || activityResult?.passed) && (
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 font-medium">
                  🎉 Congratulations! You passed this activity!
                </p>
              </div>
            )}

            {/* Auto-redirect countdown */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Returning to activities in {redirectCountdown} seconds...
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleGoToActivities} size="sm">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Go to Activities Now
                </Button>
              </div>
            </div>
            
            {onBack && (
              <Button onClick={onBack} variant="outline" className="mt-2">
                Continue Learning
              </Button>
            )}
          </CardContent>
        </Card>
        </div>
        
        {/* Mastery Update Handler for bloom analytics and topic mastery */}
        {activityGradeId && (
          <MasteryUpdateHandler
            activityGradeId={activityGradeId}
            onMasteryUpdated={(masteryId) => {
              console.log('Topic mastery updated via MasteryUpdateHandler:', masteryId);
              toast.success('Your topic mastery has been updated!');
            }}
          />
        )}
      </>
    );
  }

  // Show activity viewer if started
  if (hasStarted) {
    return (
      <ActivityCompletionHandler
        rewardResult={rewardResult}
        onComplete={(data) => {
          console.log('Achievement animations completed:', data);
          // Reset reward result after animations complete
          setRewardResult(null);
        }}
      >
        <div className="activity-viewer">
          {content.type === 'quiz' && (
            <QuizViewer
              activityId={activityId}
              content={content as any}
              studentId={studentId}
              onComplete={handleActivityComplete}
            />
          )}

          {content.type === 'reading' && (
            <ReadingViewer
              activityId={activityId}
              content={content as any}
              onComplete={handleActivityComplete}
            />
          )}

          {content.type === 'video' && (
            <VideoViewer
              activityId={activityId}
              content={content as any}
              onComplete={handleActivityComplete}
            />
          )}
        </div>
      </ActivityCompletionHandler>
    );
  }

  // Show activity introduction/start screen
  return (
    <div className="activity-intro max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className={`w-16 h-16 ${getActivityColor(content.type)} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize">
              {content.type} Activity
            </Badge>
            {content.estimatedTimeMinutes && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {content.estimatedTimeMinutes} min
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {content.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <div 
                className="text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: content.description }}
              />
            </div>
          )}

          {/* Activity-specific information */}
          {content.type === 'quiz' && (
            <div>
              <h3 className="font-medium mb-2">Quiz Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Questions:</span>
                  <span className="ml-2 font-medium">{(content as any).questions?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Points:</span>
                  <span className="ml-2 font-medium">
                    {(content as any).questions?.reduce((sum: number, q: any) => sum + q.points, 0) || 0}
                  </span>
                </div>
                {(content as any).settings?.timeLimitMinutes && (
                  <div>
                    <span className="text-gray-600">Time Limit:</span>
                    <span className="ml-2 font-medium">{(content as any).settings.timeLimitMinutes} minutes</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Attempts:</span>
                  <span className="ml-2 font-medium">
                    {(content as any).settings?.attemptsAllowed === -1 ? 'Unlimited' : (content as any).settings?.attemptsAllowed || 1}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Previous attempts */}
          {attemptInfo && (
            <div>
              <h3 className="font-medium mb-2">Previous Attempts</h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Attempts: {attemptInfo.count}</span>
                  <span>Last Score: {attemptInfo.lastScore}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Last attempt: {attemptInfo.lastDate.toLocaleDateString()}
                </div>
                {attemptInfo.passed && (
                  <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                    Passed
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Start button */}
          <div className="text-center pt-4">
            {canStartActivity() ? (
              <Button onClick={handleStart} size="lg" className="px-8">
                Start Activity
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-red-600 mb-2">
                  You have used all available attempts for this activity.
                </p>
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    Go Back
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
