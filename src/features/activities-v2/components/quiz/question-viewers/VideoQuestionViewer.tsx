'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Video, Play, Pause, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface VideoQuestion {
  id: string;
  text: string;
  type: string;
  content: any;
  timestamp?: number; // in seconds
}

interface VideoQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      videoUrl?: string;
      questions?: VideoQuestion[];
      explanation?: string;
    };
  };
  answer?: Record<string, any>; // questionId -> answer
  onAnswerChange: (answer: Record<string, any>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const VideoQuestionViewer: React.FC<VideoQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>(answer);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setUserAnswers(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const videoUrl = question.content?.videoUrl || '';
  const questions = question.content?.questions || [];
  const explanation = question.content?.explanation;

  const currentQuestion = questions[currentQuestionIndex];

  // Extract YouTube video ID for embedding
  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}?enablejsapi=1`;
    }
    return url;
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    if (showFeedback) return;
    
    const newAnswers = { ...userAnswers, [questionId]: value };
    setUserAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Jump to timestamp if available
      if (questions[currentQuestionIndex + 1]?.timestamp && videoRef.current) {
        videoRef.current.currentTime = questions[currentQuestionIndex + 1].timestamp!;
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Jump to timestamp if available
      if (questions[currentQuestionIndex - 1]?.timestamp && videoRef.current) {
        videoRef.current.currentTime = questions[currentQuestionIndex - 1].timestamp!;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionContent = (q: VideoQuestion) => {
    const questionAnswer = userAnswers[q.id];
    
    switch (q.type) {
      case 'MULTIPLE_CHOICE':
        const options = q.content?.options || [];
        return (
          <div className="space-y-3">
            {options.map((option: any, index: number) => {
              const isSelected = questionAnswer === option.id;
              const optionLetter = String.fromCharCode(65 + index);
              
              let status = 'default';
              if (showFeedback) {
                if (option.isCorrect && isSelected) status = 'correct';
                else if (option.isCorrect && !isSelected) status = 'missed';
                else if (!option.isCorrect && isSelected) status = 'incorrect';
              } else if (isSelected) {
                status = 'selected';
              }
              
              return (
                <Button
                  key={option.id}
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswerChange(q.id, option.id)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full justify-start p-4 h-auto text-left transition-all duration-200",
                    {
                      "border-blue-500 bg-blue-50 text-blue-900": status === 'selected',
                      "border-green-500 bg-green-50 text-green-900": status === 'correct',
                      "border-red-500 bg-red-50 text-red-900": status === 'incorrect',
                      "border-orange-500 bg-orange-50 text-orange-900": status === 'missed',
                    }
                  )}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                      {
                        "border-gray-300 text-gray-600": status === 'default',
                        "border-blue-500 bg-blue-500 text-white": status === 'selected',
                        "border-green-500 bg-green-500 text-white": status === 'correct',
                        "border-red-500 bg-red-500 text-white": status === 'incorrect',
                        "border-orange-500 bg-orange-500 text-white": status === 'missed',
                      }
                    )}>
                      {optionLetter}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{option.text}</div>
                      {showFeedback && option.feedback && (isSelected || option.isCorrect) && (
                        <div className="mt-1 text-xs opacity-75">
                          {option.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        );
        
      case 'SHORT_ANSWER':
      case 'ESSAY':
        return (
          <div>
            <textarea
              value={questionAnswer || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              disabled={showFeedback}
              placeholder="Type your answer here..."
              className={cn(
                "w-full min-h-[100px] p-3 border rounded-md resize-vertical",
                "focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                {
                  "bg-gray-50 cursor-not-allowed": showFeedback,
                }
              )}
            />
            {showFeedback && q.content?.correctAnswer && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-medium text-green-900 mb-1">Sample Answer:</div>
                <div className="text-sm text-green-800">{q.content.correctAnswer}</div>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">
              Question type "{q.type}" is not supported in video questions.
            </p>
          </div>
        );
    }
  };

  if (!videoUrl && questions.length === 0) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No video content available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        {questionText && (
          <div className="mb-6">
            <div className="prose prose-sm sm:prose-base max-w-none">
              <p className="text-gray-900 leading-relaxed">{questionText}</p>
            </div>
          </div>
        )}

        {/* Video Player */}
        {videoUrl && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Video className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Video</h3>
            </div>
            
            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px', maxHeight: '80vh' }}>
              {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setVideoLoaded(true)}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  onLoadedData={() => setVideoLoaded(true)}
                  onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                >
                  Your browser does not support the video tag.
                </video>
              )}
              
              {!videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-white text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">Loading video...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="space-y-6">
            {/* Question Navigation */}
            {questions.length > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="text-center">
                  <div className="text-sm text-gray-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  {currentQuestion?.timestamp && (
                    <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(currentQuestion.timestamp)}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Current Question */}
            {currentQuestion && (
              <div className="space-y-4">
                <div className="p-4 border rounded-md bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-gray-900 flex-1">
                      {currentQuestion.text}
                    </h4>
                    {currentQuestion.timestamp && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 ml-4">
                        <Clock className="h-3 w-3" />
                        {formatTime(currentQuestion.timestamp)}
                      </div>
                    )}
                  </div>
                  {renderQuestionContent(currentQuestion)}
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            {questions.length > 1 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{currentQuestionIndex + 1} / {questions.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation */}
        {showFeedback && explanation && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h5 className="font-medium text-blue-900 mb-2">Explanation</h5>
            <div className="text-sm text-blue-800 prose prose-sm max-w-none">
              <p>{explanation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoQuestionViewer;
