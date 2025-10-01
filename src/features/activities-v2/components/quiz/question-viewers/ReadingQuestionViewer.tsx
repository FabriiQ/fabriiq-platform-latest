'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface ReadingQuestion {
  id: string;
  text: string;
  type: string;
  content: any;
}

interface ReadingQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      passage?: string;
      questions?: ReadingQuestion[];
      timeLimit?: number; // in minutes
      explanation?: string;
    };
  };
  answer?: Record<string, any>; // questionId -> answer
  onAnswerChange: (answer: Record<string, any>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const ReadingQuestionViewer: React.FC<ReadingQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>(answer);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    setUserAnswers(answer);
  }, [answer]);

  useEffect(() => {
    if (!showFeedback) {
      const timer = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, showFeedback]);

  const questionText = question.content?.text || question.content?.question || '';
  const passage = question.content?.passage || '';
  const questions = question.content?.questions || [];
  const timeLimit = question.content?.timeLimit;
  const explanation = question.content?.explanation;

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = (questionId: string, value: any) => {
    if (showFeedback) return;
    
    const newAnswers = { ...userAnswers, [questionId]: value };
    setUserAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestionContent = (q: ReadingQuestion) => {
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
              Question type "{q.type}" is not supported in reading questions.
            </p>
          </div>
        );
    }
  };

  if (!passage && questions.length === 0) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No reading content available</p>
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

        {/* Time Tracking */}
        {(timeLimit || !showFeedback) && (
          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {timeLimit 
                  ? `Time Limit: ${timeLimit} minutes` 
                  : `Time Spent: ${formatTime(timeSpent)}`
                }
              </span>
            </div>
            {questions.length > 0 && (
              <div className="text-sm text-blue-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            )}
          </div>
        )}

        {/* Reading Passage */}
        {passage && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Reading Passage</h3>
            </div>
            <div className="p-4 bg-gray-50 border rounded-md">
              <div className="prose prose-sm max-w-none">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {passage}
                </div>
              </div>
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
                
                <div className="text-sm text-gray-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
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
                  <h4 className="font-medium text-gray-900 mb-4">
                    {currentQuestion.text}
                  </h4>
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

export default ReadingQuestionViewer;
