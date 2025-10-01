'use client';

/**
 * Quiz Viewer Component for Activities V2
 *
 * Student quiz taking interface
 * Supports all Question Bank question types
 * Simplified and mobile-responsive design
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { QuizV2Content, QuizSessionQuestion } from '../../types';
import { useTimeTracking } from '@/components/providers/TimeTrackingProvider';
import { useEnhancedTimeTracking } from '../../hooks/useEnhancedTimeTracking';
import { api } from '@/trpc/react';
import { ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, Target, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { getActivitiesV2QuestionViewer } from '../../utils/question-viewer-mapper';
import { Suspense } from 'react';

interface QuizViewerProps {
  activityId: string;
  content: QuizV2Content;
  studentId?: string;
  onComplete: (result: any) => void;
}

export const QuizViewer: React.FC<QuizViewerProps> = ({
  activityId,
  content,
  studentId,
  onComplete
}) => {
  // Core state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<QuizSessionQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Advanced features state
  const [isCAT, setIsCAT] = useState(false);
  const [catSession, setCatSession] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [catLoadingTimeout, setCatLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [catQuestionTimeout, setCatQuestionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Refs for timing
  const handleSubmitRef = useRef<() => Promise<void>>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Time tracking hooks
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();
  const {
    session: timeSession,
    startQuestionTiming,
    endQuestionTiming,
    pauseSession,
    resumeSession,
    getTimeAnalytics,
    endSession
  } = useEnhancedTimeTracking(activityId);

  // Question Bank hydration and Advanced Assessment hooks
  const questionIds = content?.questions?.map(q => q.id) ?? [];
  const { data: qbQuestions, isLoading: qbLoading } = api.questionBank.getQuestionsByIds.useQuery(
    { ids: questionIds },
    { enabled: !content.settings?.catSettings?.enabled && questionIds.length > 0 }
  );

  // Advanced assessment hooks (CAT / Spaced Repetition)
  const startAdvancedAssessment = api.activityV2.startAdvancedAssessment.useMutation();
  const processAdvancedAnswer = api.activityV2.processAdvancedAnswer.useMutation();
  const nextAdvancedQuestionQuery = api.activityV2.getNextAdvancedQuestion.useQuery(
    { sessionId: (catSession?.id as string) || '' },
    { enabled: !!catSession?.id }
  );

  // Initialize quiz session
  useEffect(() => {
    // Set flags - check multiple possible locations for CAT settings
    // Enable CAT if assessment mode is set to 'cat' (backend will provide defaults if needed)
    const hasAssessmentMode = (content as any).assessmentMode === 'cat';
    const hasCatSettings = !!(content.settings?.catSettings?.enabled || (content as any).catSettings?.enabled);
    const hasValidCatConfig = !!(content.settings?.catSettings || (content as any).catSettings);

    // CAT should be enabled if assessment mode is 'cat' (backend handles missing settings)
    const catSettingsEnabled = hasAssessmentMode;

    console.log('CAT mode detection:', {
      assessmentMode: (content as any).assessmentMode,
      hasAssessmentMode,
      settingsCatEnabled: content.settings?.catSettings?.enabled,
      rootCatEnabled: (content as any).catSettings?.enabled,
      hasCatSettings,
      settingsCatConfig: content.settings?.catSettings,
      rootCatConfig: (content as any).catSettings,
      hasValidCatConfig,
      finalCATMode: catSettingsEnabled,
      note: 'Backend will provide default CAT settings if none configured'
    });

    setIsCAT(!!catSettingsEnabled);

    // Timer setup (support both timeLimitMinutes and timeLimit)
    const timeLimit = (content.settings as any).timeLimitMinutes ?? content.settings.timeLimit;
    if (timeLimit) setTimeRemaining(timeLimit * 60);

    setIsLoading(false);
  }, [content.settings?.catSettings, (content as any).catSettings, (content as any).assessmentMode, content.settings.timeLimitMinutes, content.settings.timeLimit]);

  // Start time tracking separately to avoid dependency issues
  useEffect(() => {
    if (startTracking && activityId) {
      console.log('Starting time tracking for quiz activity:', activityId);
      startTracking(activityId);
    }
  }, [activityId]); // Only depend on activityId, not startTracking

  // Hydrate questions for non-CAT mode from Question Bank
  useEffect(() => {
    if (!isCAT && content.questions?.length && qbQuestions && !qbLoading) {
      try {
        // Keep activity order, merge QB question details
        const mergedQuestions = content.questions
          .map(q => {
            const qbQuestion = (qbQuestions as any[]).find(x => x.id === q.id);
            if (!qbQuestion) {
              console.warn(`Question ${q.id} not found in question bank`);
              return null;
            }
            return {
              id: q.id,
              questionType: qbQuestion.questionType,
              content: qbQuestion.content,
              points: q.points,
              order: q.order,
              shuffleOptions: q.shuffleOptions
            } as QuizSessionQuestion;
          })
          .filter(Boolean) as QuizSessionQuestion[];

        setQuestions(mergedQuestions);

        // Start timing for first question
        if (mergedQuestions[0] && startQuestionTiming) {
          startQuestionTiming(mergedQuestions[0].id);
        }
      } catch (error) {
        console.error('Error hydrating questions:', error);
        toast.error('Failed to load questions');
      }
    }
  }, [isCAT, content.questions, qbQuestions, qbLoading, startQuestionTiming]);

  // Handle quiz submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // End timing for current question
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        endQuestionTiming(currentQuestion.id);
      }

      // End session and get analytics
      const sessionData = await endSession();

      // Stop overall time tracking
      stopTracking(activityId);
      const totalTimeSpent = getElapsedTime(activityId);

      // Get enhanced analytics
      const enhancedAnalytics = getTimeAnalytics?.();

      // Convert questionTimings from objects to numbers for tRPC validation
      const questionTimings: Record<string, number> = {};
      if (sessionData?.questionTimings) {
        Object.entries(sessionData.questionTimings).forEach(([questionId, timing]) => {
          if (timing && typeof timing === 'object' && 'totalTime' in timing) {
            questionTimings[questionId] = (timing as any).totalTime || 0;
          } else if (typeof timing === 'number') {
            questionTimings[questionId] = timing;
          } else {
            questionTimings[questionId] = 0;
          }
        });
      }

      // Prepare submission data
      const submissionData = {
        activityId,
        answers,
        timeSpent: totalTimeSpent,
        questionTimings,
        enhancedAnalytics,
        catData: isCAT ? catSession : null
      };

      // Call completion handler
      onComplete(submissionData);

      toast.success('Quiz submitted successfully!');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz. Please try again.');
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    questions,
    currentQuestionIndex,
    endQuestionTiming,
    endSession,
    stopTracking,
    activityId,
    getElapsedTime,
    getTimeAnalytics,
    answers,
    isCAT,
    catSession,
    onComplete
  ]);

  // Update submit ref whenever handleSubmit changes
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Initialize CAT session with improved error handling and retry logic
  useEffect(() => {
    const initCAT = async () => {
      if (!isCAT || !studentId || catSession?.id || startAdvancedAssessment.isLoading) {
        console.log('CAT init skipped:', { isCAT, studentId: !!studentId, catSessionExists: !!catSession?.id, isLoading: startAdvancedAssessment.isLoading });
        return;
      }

      // Clear any existing timeout
      if (catLoadingTimeout) {
        clearTimeout(catLoadingTimeout);
        setCatLoadingTimeout(null);
      }

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('CAT initialization timeout - falling back to standard mode');
        toast.error('Adaptive assessment is taking too long to load. Switching to standard mode.');
        setIsCAT(false);
      }, 15000); // 15 second timeout

      setCatLoadingTimeout(timeout);

      try {
        console.log('Starting CAT session for activity:', activityId, 'student:', studentId);
        console.log('Activity content CAT settings:', content.settings?.catSettings);
        console.log('Activity assessment mode:', (content as any).assessmentMode);

        const session = await startAdvancedAssessment.mutateAsync({ activityId, studentId });
        console.log('CAT session created successfully:', session);
        setCatSession(session);

        // Clear timeout on success
        clearTimeout(timeout);
        setCatLoadingTimeout(null);
      } catch (error) {
        console.error('Failed to start CAT session:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          activityId,
          studentId,
          catSettings: content.settings?.catSettings
        });

        // Clear timeout on error
        clearTimeout(timeout);
        setCatLoadingTimeout(null);

        // Provide more specific error messages
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        if (errorMessage.includes('not found')) {
          toast.error('Activity not found. Please refresh the page.');
        } else if (errorMessage.includes('CAT settings')) {
          toast.error('This activity is not properly configured for adaptive testing.');
        } else {
          toast.error('Failed to start adaptive session. Please try again.');
        }

        // Fallback to standard mode if CAT fails
        setIsCAT(false);
        console.log('Falling back to standard quiz mode due to CAT initialization failure');
      }
    };

    if (isCAT && studentId && activityId) {
      console.log('Attempting to initialize CAT session...');
      initCAT();
    }

    // Cleanup timeout on unmount
    return () => {
      if (catLoadingTimeout) {
        clearTimeout(catLoadingTimeout);
      }
    };
  }, [isCAT, studentId, activityId, catSession?.id, startAdvancedAssessment]);

  // Fetch first question when CAT session is ready with improved error handling
  useEffect(() => {
    console.log('CAT question loading effect triggered:', {
      isCAT,
      catSessionId: catSession?.id,
      hasQueryData: !!nextAdvancedQuestionQuery.data,
      queryError: nextAdvancedQuestionQuery.error,
      isQueryLoading: nextAdvancedQuestionQuery.isLoading,
      questionsLength: questions.length
    });

    // Clear any existing question timeout when session changes
    if (catQuestionTimeout) {
      clearTimeout(catQuestionTimeout);
      setCatQuestionTimeout(null);
    }

    if (isCAT && catSession?.id && nextAdvancedQuestionQuery.data) {
      console.log('Processing CAT question data:', nextAdvancedQuestionQuery.data);
      const question = (nextAdvancedQuestionQuery.data as any)?.question;

      if (question) {
        console.log('First CAT question loaded successfully:', {
          questionId: question.id,
          questionType: question.questionType,
          hasContent: !!question.content
        });
        const firstQuestion: QuizSessionQuestion = {
          id: question.id,
          questionType: question.questionType,
          content: question.content,
          points: 1,
          order: 1
        };
        setQuestions([firstQuestion]);
        if (startQuestionTiming) {
          startQuestionTiming(firstQuestion.id);
        }
      } else {
        console.error('No question returned from CAT service. Query data:', nextAdvancedQuestionQuery.data);
        toast.error('No question available to start CAT');

        // Fallback to standard mode if no questions available
        setIsCAT(false);
        console.log('Falling back to standard quiz mode due to no CAT questions');
      }
    }

    // Handle CAT question loading errors
    if (isCAT && catSession?.id && nextAdvancedQuestionQuery.error) {
      console.error('Error loading CAT question:', nextAdvancedQuestionQuery.error);
      console.error('Error details:', {
        message: nextAdvancedQuestionQuery.error.message,
        data: nextAdvancedQuestionQuery.error.data,
        shape: nextAdvancedQuestionQuery.error.shape
      });
      toast.error('Failed to load adaptive question. Switching to standard mode.');
      setIsCAT(false);
    }

    // Set timeout for question loading if CAT session exists but no question loaded yet
    if (isCAT && catSession?.id && !questions.length && !nextAdvancedQuestionQuery.data && !nextAdvancedQuestionQuery.error && !nextAdvancedQuestionQuery.isLoading) {
      console.log('Setting timeout for CAT question loading...');
      const timeout = setTimeout(() => {
        console.warn('CAT question loading timeout - falling back to standard mode');
        toast.error('Questions are taking too long to load. Switching to standard mode.');
        setIsCAT(false);
      }, 10000); // 10 second timeout for question loading

      setCatQuestionTimeout(timeout);
    }

    // Cleanup timeout on unmount
    return () => {
      if (catQuestionTimeout) {
        clearTimeout(catQuestionTimeout);
      }
    };
  }, [isCAT, catSession?.id, nextAdvancedQuestionQuery.data, nextAdvancedQuestionQuery.error, nextAdvancedQuestionQuery.isLoading, questions.length, startQuestionTiming]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining === null || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining, isPaused]);

  // Handle answer changes
  const handleAnswerChange = useCallback((questionId: string, answer: any) => {
    console.log('Answer changed:', { questionId, answer }); // Debug log
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  // Handle navigation between questions (with CAT support)
  const handleNavigation = useCallback(async (direction: 'prev' | 'next') => {
    const currentQuestion = questions[currentQuestionIndex];

    // End timing for current question
    if (currentQuestion) {
      endQuestionTiming(currentQuestion.id);

      // In CAT mode, process answer and fetch next question when moving forward
      if (isCAT && direction === 'next' && catSession?.id) {
        try {
          const answer = answers[currentQuestion.id];
          await processAdvancedAnswer.mutateAsync({
            sessionId: catSession.id,
            questionId: currentQuestion.id,
            answer,
            responseTime: 30 // Default response time for now
          });

          const res = await nextAdvancedQuestionQuery.refetch();
          const nextQuestion = (res.data as any)?.question;

          if (nextQuestion) {
            const newQuestion: QuizSessionQuestion = {
              id: nextQuestion.id,
              questionType: nextQuestion.questionType,
              content: nextQuestion.content,
              points: 1,
              order: questions.length + 1
            };
            setQuestions(prev => [...prev, newQuestion]);
          } else {
            // No more questions -> submit
            await handleSubmitRef.current?.();
            return;
          }
        } catch (error) {
          console.error('CAT navigation failed:', error);
          toast.error('Failed to load next adaptive question');
          return;
        }
      }
    }

    // Navigate to next/previous question
    const newIndex = direction === 'next'
      ? Math.min(currentQuestionIndex + 1, questions.length - 1)
      : Math.max(currentQuestionIndex - 1, 0);

    setCurrentQuestionIndex(newIndex);

    // Start timing for new question
    const newQuestion = questions[newIndex];
    if (newQuestion && startQuestionTiming) {
      startQuestionTiming(newQuestion.id);
    }
  }, [
    isCAT,
    catSession,
    currentQuestionIndex,
    questions,
    answers,
    endQuestionTiming,
    processAdvancedAnswer,
    nextAdvancedQuestionQuery
  ]);



  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeSession();
      setIsPaused(false);
      toast.success('Quiz resumed');
    } else {
      pauseSession();
      setIsPaused(true);
      toast.info('Quiz paused');
    }
  }, [isPaused, pauseSession, resumeSession]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state - improved logic for CAT activities
  const shouldShowLoading = () => {
    // Always show loading if initial loading is true
    if (isLoading) return true;

    // For CAT mode, show loading if:
    // - CAT session is not created yet, OR
    // - CAT session exists but no questions loaded yet, OR
    // - Next question query is loading
    if (isCAT) {
      if (!catSession?.id) return true;
      if (catSession?.id && !questions.length && nextAdvancedQuestionQuery.isLoading) return true;
      if (catSession?.id && !questions.length && !nextAdvancedQuestionQuery.data && !nextAdvancedQuestionQuery.error) return true;
      return false;
    }

    // For standard mode, show loading if no questions loaded
    return !questions.length;
  };

  if (shouldShowLoading()) {
    const loadingMessage = isCAT
      ? (!catSession?.id ? 'Initializing adaptive assessment...' : 'Loading first question...')
      : 'Loading quiz...';

    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{loadingMessage}</p>
          {isCAT && catSession?.id && (
            <p className="text-sm text-gray-500 mt-2">Preparing adaptive questions...</p>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Safety check for current question
  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-viewer w-full max-w-4xl mx-auto space-y-4 p-2 sm:p-4">
      {/* Quiz Header */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col space-y-3">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {content.title}
              </CardTitle>
              {content.description && (
                <div 
                  className="text-gray-600 mt-1 text-sm sm:text-base prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.description }}
                />
              )}
            </div>

            {/* Mobile-first controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Assessment Mode Indicator */}
                {isCAT && (
                  <Badge className="bg-purple-500 text-white px-2 py-1 text-xs font-medium">
                    <Target className="h-3 w-3 mr-1" />
                    CAT Mode
                  </Badge>
                )}

                {/* Pause/Resume Button */}
                {timeRemaining !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePauseResume}
                    className="flex items-center gap-1 h-8 px-3 text-xs"
                  >
                    {isPaused ? <Play className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                )}
              </div>

              {/* Timer Display */}
              {timeRemaining !== null && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md font-mono text-sm font-bold ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  <Clock className="h-4 w-4" />
                  {formatTime(timeRemaining)}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {Object.keys(answers).length} answered
              </span>
            </div>
            <Progress
              value={((currentQuestionIndex + 1) / questions.length) * 100}
              className="h-2 bg-gray-200"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b border-gray-100 pb-3 px-3 sm:px-6">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full font-bold text-sm sm:text-base">
                  {currentQuestionIndex + 1}
                </div>
                <span className="text-base sm:text-lg font-bold text-gray-900">
                  Question {currentQuestionIndex + 1}
                </span>
              </div>
              {answers[currentQuestion.id] && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm font-medium">Answered</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-100 text-green-800 px-2 py-1 text-xs">
                {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
              </Badge>
              {currentQuestion.difficulty && (
                <Badge className="bg-orange-100 text-orange-800 px-2 py-1 text-xs">
                  {currentQuestion.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <QuestionRenderer
            question={currentQuestion}
            answer={answers[currentQuestion.id]}
            onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
            showFeedback={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border">
        <div className="flex flex-col space-y-4">
          {/* Question Numbers Grid - Mobile First */}
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
            {questions.map((_, index) => {
              const isAnswered = answers[questions[index].id];
              const isCurrent = index === currentQuestionIndex;

              return (
                <Button
                  key={index}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Handle direct navigation to question
                    const currentQ = questions[currentQuestionIndex];
                    if (currentQ && endQuestionTiming) {
                      endQuestionTiming(currentQ.id);
                    }

                    setCurrentQuestionIndex(index);

                    const newQ = questions[index];
                    if (newQ && startQuestionTiming) {
                      startQuestionTiming(newQ.id);
                    }
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold ${
                    isAnswered && !isCurrent
                      ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                      : isCurrent && isAnswered
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : ''
                  }`}
                >
                  {index + 1}
                </Button>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigation('prev')}
              disabled={currentQuestionIndex === 0}
              className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-2">
              {/* Finish Quiz Button - Always visible except on last question */}
              {currentQuestionIndex < questions.length - 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-3 py-2 text-sm font-medium text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Finish Quiz'}
                </Button>
              )}

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleNavigation('next')}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

// Question Renderer Component
interface QuestionRendererProps {
  question: QuizSessionQuestion;
  answer: any;
  onAnswerChange: (answer: any) => void;
  showFeedback: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback
}) => {
  // Check if question data is valid
  if (!question || !question.id) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-800">
          Question data is missing or invalid.
        </p>
      </div>
    );
  }

  // Check if question content exists
  if (!question.content) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
        <p className="text-yellow-800">
          Question content is missing. Question ID: {question.id}
        </p>
      </div>
    );
  }

  // Use Question Bank viewer mapper for all question types
  if (!question.questionType) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <p className="text-red-800">
          Question type is missing. Question ID: {question.id}
        </p>
      </div>
    );
  }

  const ViewerComponent = getActivitiesV2QuestionViewer(question.questionType as string);

  if (!ViewerComponent) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
        <p className="text-yellow-800">
          Question type "{question.questionType}" does not have a viewer component yet.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          This question type is supported but needs a viewer component to be implemented.
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-4 text-center">Loading question...</div>}>
      <ViewerComponent
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        showFeedback={showFeedback}
        className="border-0 shadow-none"
      />
    </Suspense>
  );
};
