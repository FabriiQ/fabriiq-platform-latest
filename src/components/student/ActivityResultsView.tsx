'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { AlertCircle, Award, CheckCircle, ChevronLeft, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/feedback/confetti';

interface ActivityResultsViewProps {
  activityId: string;
  studentId?: string; // Optional, will use current user if not provided
  classId: string;
  subjectId: string;
  onBack?: () => void;
  activity?: any; // Allow passing the activity directly
}

export function ActivityResultsView({
  activityId,
  studentId,
  classId,
  subjectId,
  onBack,
  activity: activityProp // Rename to avoid conflict with the fetched activity
}: ActivityResultsViewProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Fetch activity details if not provided as prop
  const { data: fetchedActivity, isLoading: activityLoading } = api.activity.getById.useQuery(
    { id: activityId },
    { enabled: !!activityId && !activityProp } // Only fetch if not provided as prop
  );

  // Use the provided activity prop or the fetched activity
  const activity = activityProp || fetchedActivity;

  // Fetch activity grade
  const {
    data: grade,
    isLoading: gradeLoading,
    error: gradeError,
    refetch: refetchGrade
  } = api.activityGrade.get.useQuery(
    {
      activityId,
      studentId: studentId || 'current' // API should handle 'current' to use the logged-in user
    },
    {
      enabled: !!activityId,
      retry: 3,
      retryDelay: 1500,
      onError: (error) => {
        console.error('Error fetching activity grade:', error);
      }
    }
  );

  // Fetch achievements related to this activity completion
  const {
    data: achievements,
    isLoading: achievementsLoading
  } = api.student.getAchievements.useQuery(
    {
      classId,
      activityId
    },
    {
      enabled: !!activityId && !!classId,
      retry: 2,
    }
  );

  // Fetch learning time data for this activity
  const {
    data: learningTimeStats,
    isLoading: timeStatsLoading
  } = api.learningTime.getLearningTimeStats.useQuery(
    {
      classId
    },
    {
      enabled: !!classId,
      retry: 2,
    }
  );

  // Show confetti on first load if the score is good
  useEffect(() => {
    if (grade && !gradeLoading && grade.score) {
      const passingScore = activity?.maxScore ? activity.maxScore * 0.7 : 70;
      if (grade.score >= passingScore) {
        setShowConfetti(true);

        // Hide confetti after 5 seconds
        const timer = setTimeout(() => {
          setShowConfetti(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [grade, gradeLoading, activity]);

  // Check for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-retry on connection errors
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  useEffect(() => {
    // If there's a "Failed to fetch" error, try to automatically recover
    if (gradeError && gradeError.message === "Failed to fetch" && autoRetryCount < 3 && !isOffline) {
      const retryTimer = setTimeout(() => {
        console.log(`Auto-retrying activity grade fetch (attempt ${autoRetryCount + 1}/3)...`);
        refetchGrade();
        setAutoRetryCount(prev => prev + 1);
      }, 3000); // Wait 3 seconds before retrying

      return () => clearTimeout(retryTimer);
    }

    // If we're back online after being offline, retry once
    if (!isOffline && autoRetryCount === 0) {
      const onlineRetryTimer = setTimeout(() => {
        refetchGrade();
      }, 1000);

      return () => clearTimeout(onlineRetryTimer);
    }
  }, [gradeError, refetchGrade, autoRetryCount, isOffline]);

  // Handle back button click
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(`/student/class/${classId}/subjects/${subjectId}/activities`);
    }
  };

  // Calculate percentage score
  const getPercentage = (score: number, total: number) => {
    if (!total) return 0;
    return Math.round((score / total) * 100);
  };

  // Get grade letter based on percentage
  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  // Get color based on grade
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    if (percentage >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  // Loading state - only show if we're loading data and don't have the activity prop
  if ((activityLoading && !activityProp) || gradeLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Activity Results</h2>
            <p className="text-sm text-muted-foreground">
              {activity?.title || 'Loading activity...'}
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32 mb-2" />
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading results...
              </div>
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {autoRetryCount > 0 ? `Retrying... (Attempt ${autoRetryCount}/3)` : 'Fetching your results...'}
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state - no grade found
  if (!grade) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Activity Results</h2>
            <p className="text-sm text-muted-foreground">
              {activity?.title || 'Activity'}
            </p>
          </div>
        </div>
        <Alert className="border-destructive/50 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Results Found</AlertTitle>
          <AlertDescription>
            {gradeError ? (
              <>
                <div className="mb-2">
                  <strong>Error:</strong> {isOffline
                    ? "You are currently offline. Please check your internet connection."
                    : gradeError.message === "Failed to fetch"
                      ? "Connection error. The server might be temporarily unavailable."
                      : gradeError.message || "Failed to load activity results"}
                </div>
                <div className="flex flex-col gap-2">
                  <p>This could be due to one of the following reasons:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {isOffline ? (
                      <>
                        <li>Your device is not connected to the internet</li>
                        <li>The school network may be experiencing issues</li>
                        <li>The server might be temporarily down for maintenance</li>
                      </>
                    ) : (
                      <>
                        <li>You haven't completed this activity yet</li>
                        <li>Your submission is still being processed</li>
                        <li>There was a temporary server issue</li>
                      </>
                    )}
                  </ul>
                  <p className="mt-2">
                    {isOffline
                      ? "Please check your internet connection and try again when you're back online."
                      : "Please try again in a few moments or contact your teacher if the problem persists."}
                  </p>
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchGrade()}
                    className="flex items-center gap-2"
                    disabled={isOffline}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </Button>
                </div>
              </>
            ) : (
              <>
                We couldn't find any results for this activity. If you've completed it, please try again later.
                {(
                  // Check all possible places where activity type might be stored
                  activity?.learningType === 'NUMERIC' ||
                  activity?.type === 'NUMERIC' ||
                  (activity?.content && typeof activity.content === 'object' &&
                   ((activity.content as any).activityType === 'NUMERIC' ||
                    (activity.content as any).type === 'NUMERIC'))
                ) && (
                  <p className="mt-2">
                    <strong>Note:</strong> For NUMERIC activities, make sure you've submitted your answers and they've been graded.
                  </p>
                )}
              </>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button onClick={handleBack}>
            Back to Activities
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/student/class/${classId}/subjects/${subjectId}/activities/${activityId}`)}
          >
            Try Activity Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate percentage score
  const scorePercentage = getPercentage(grade.score || 0, activity?.maxScore || 100);
  const gradeLetter = getGradeLetter(scorePercentage);
  const gradeColor = getGradeColor(scorePercentage);
  const isPassing = scorePercentage >= 60;

  return (
    <div className="space-y-4">
      {/* Confetti effect for good scores */}
      {showConfetti && <Confetti />}

      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Activity Results</h2>
          <p className="text-sm text-muted-foreground">
            {activity?.title || 'Activity'}
          </p>
        </div>
      </div>

      {/* Results card */}
      <Card className="overflow-hidden">
        <CardHeader className={cn(
          "pb-2",
          isPassing ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
        )}>
          <CardTitle className="flex justify-between items-center">
            <span>Your Results</span>
            <Badge className={cn(
              "px-3 py-1",
              isPassing ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            )}>
              {isPassing ? "Passed" : "Not Passed"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Completed on {new Date(grade.submittedAt || grade.updatedAt || new Date()).toLocaleDateString()}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score */}
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <div className={cn("text-4xl font-bold mb-2", gradeColor)}>
                {grade.score || 0}/{activity?.maxScore || 100}
              </div>
              <p className="text-lg font-medium">{scorePercentage}%</p>
              <Badge variant="outline" className={cn("mt-2 text-base px-3 py-1", gradeColor)}>
                {gradeLetter}
              </Badge>
            </div>

            {/* Time spent */}
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {/* Use timeSpentMinutes first, then content.timeSpent, otherwise show N/A */}
                {(grade as any).timeSpentMinutes 
                  ? `${Math.round((grade as any).timeSpentMinutes)} min`
                  : grade.content && typeof grade.content === 'object' && 'timeSpent' in grade.content
                    ? `${Math.round(Number(grade.content.timeSpent))} min`
                    : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground">Time Spent</p>
            </div>

            {/* Attempts */}
            <div className="flex flex-col items-center text-center p-4 border rounded-lg">
              <Award className="h-8 w-8 mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {/* Use content.attemptNumber if available, otherwise default to 1 */}
                {grade.content && typeof grade.content === 'object' && 'attemptNumber' in grade.content
                  ? Number(grade.content.attemptNumber)
                  : 1}
              </div>
              <p className="text-sm text-muted-foreground">Attempt</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Score</span>
              <span className="font-medium">{scorePercentage}%</span>
            </div>
            <Progress value={scorePercentage} className="h-3" />
          </div>

          {/* Feedback */}
          {grade.feedback && (
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Feedback</h3>
              <p className="text-sm">{grade.feedback}</p>
            </div>
          )}

          {/* Achievements - Check both grade content and separate achievements API */}
          {(
            // First check if achievements are in the grade content (Activities V2)
            (grade.content && (grade.content as any).achievements && (grade.content as any).achievements.length > 0) ||
            // Fallback to separate achievements API
            (achievements && achievements.achievements && achievements.achievements.length > 0)
          ) && (
            <div className="mt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements Earned
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  // Use achievements from grade content (Activities V2) first
                  const gradeAchievements = grade.content && (grade.content as any).achievements ? (grade.content as any).achievements : [];
                  const apiAchievements = achievements?.achievements?.filter(a => a.unlocked) || [];
                  
                  // Combine and format achievements
                  const displayAchievements = [...gradeAchievements.map((ach: any) => ({
                    id: `grade-${ach.type}`,
                    title: ach.title,
                    description: ach.description,
                    icon: ach.icon,
                    unlocked: true,
                    unlockedAt: new Date()
                  })), ...apiAchievements];
                  
                  return displayAchievements.slice(0, 4).map((achievement) => (
                  <div key={achievement.id} className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        {achievement.icon ? (
                          <span className="text-lg">{achievement.icon}</span>
                        ) : (
                          <Award className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                        {achievement.unlockedAt && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Earned {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  ));
                })()}
              </div>
              {achievements.newAchievements && achievements.newAchievements.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">New Achievement{achievements.newAchievements.length > 1 ? 's' : ''} Unlocked!</span>
                  </div>
                  <div className="space-y-2">
                    {achievements.newAchievements.map((newAchievement) => (
                      <div key={newAchievement.id} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <span>{newAchievement.icon || '🏆'}</span>
                        <span>{newAchievement.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions Breakdown */}
          {grade.content && typeof grade.content === 'object' && (grade.content as any).responses && (
            <div className="mt-6">
              <h3 className="font-medium mb-4">Questions Breakdown</h3>
              <div className="space-y-3">
                {((grade.content as any).responses as Array<any>).map((response: any, index: number) => {
                  const isCorrect = response.correct || response.isCorrect || false;
                  const userAnswer = response.userAnswer || response.answer || 'No answer';
                  const correctAnswer = response.correctAnswer || response.expectedAnswer || 'N/A';
                  const questionText = response.question || response.questionText || `Question ${index + 1}`;
                  
                  return (
                    <div key={index} className={cn(
                      "p-4 rounded-lg border",
                      isCorrect 
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          isCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                        )}>
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-2">{questionText}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex gap-4">
                              <span className="text-muted-foreground min-w-[100px]">Your answer:</span>
                              <span className={isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                                {userAnswer}
                              </span>
                            </div>
                            {!isCorrect && (
                              <div className="flex gap-4">
                                <span className="text-muted-foreground min-w-[100px]">Correct answer:</span>
                                <span className="text-green-700 dark:text-green-300">{correctAnswer}</span>
                              </div>
                            )}
                            {response.explanation && (
                              <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                <strong>Explanation:</strong> {response.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Questions Summary */}
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Questions Summary:</span>
                    <div className="flex gap-4">
                      <span className="text-green-600">
                        ✓ {((grade.content as any).responses as Array<any>).filter(r => r.correct || r.isCorrect).length} Correct
                      </span>
                      <span className="text-red-600">
                        ✗ {((grade.content as any).responses as Array<any>).filter(r => !(r.correct || r.isCorrect)).length} Incorrect
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={handleBack}>
            Back to Activities
          </Button>
          <Button
            onClick={() => router.push(`/student/class/${classId}/subjects/${subjectId}/activities/${activityId}`)}
            variant="default"
          >
            {isPassing ? "Review Activity" : "Try Again"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
