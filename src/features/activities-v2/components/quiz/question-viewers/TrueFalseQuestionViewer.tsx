'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrueFalseQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      isTrue?: boolean;
      explanation?: string;
    };
  };
  answer?: boolean;
  onAnswerChange: (answer: boolean) => void;
  showFeedback?: boolean;
  className?: string;
}

export const TrueFalseQuestionViewer: React.FC<TrueFalseQuestionViewerProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(answer ?? null);

  useEffect(() => {
    setSelectedAnswer(answer ?? null);
  }, [answer]);

  const handleAnswerSelect = (value: boolean) => {
    setSelectedAnswer(value);
    onAnswerChange(value);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const isCorrect = question.content?.isTrue;
  const explanation = question.content?.explanation;

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-gray-900 leading-relaxed">{questionText}</p>
          </div>
        </div>

        {/* True/False Options */}
        <div className="space-y-3">
          {/* True Option */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleAnswerSelect(true)}
            className={cn(
              "w-full justify-start p-4 h-auto text-left transition-all duration-200",
              {
                "border-blue-500 bg-blue-50 text-blue-900": selectedAnswer === true && !showFeedback,
                "border-green-500 bg-green-50 text-green-900": showFeedback && isCorrect === true,
                "border-red-500 bg-red-50 text-red-900": showFeedback && selectedAnswer === true && isCorrect !== true,
                "hover:border-gray-400 hover:bg-gray-50": selectedAnswer !== true && !showFeedback,
              }
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                {
                  "border-blue-500 bg-blue-500": selectedAnswer === true && !showFeedback,
                  "border-green-500 bg-green-500": showFeedback && isCorrect === true,
                  "border-red-500 bg-red-500": showFeedback && selectedAnswer === true && isCorrect !== true,
                  "border-gray-300": selectedAnswer !== true && !showFeedback,
                }
              )}>
                {(selectedAnswer === true || (showFeedback && isCorrect === true)) && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-base font-medium">True</span>
            </div>
          </Button>

          {/* False Option */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleAnswerSelect(false)}
            className={cn(
              "w-full justify-start p-4 h-auto text-left transition-all duration-200",
              {
                "border-blue-500 bg-blue-50 text-blue-900": selectedAnswer === false && !showFeedback,
                "border-green-500 bg-green-50 text-green-900": showFeedback && isCorrect === false,
                "border-red-500 bg-red-50 text-red-900": showFeedback && selectedAnswer === false && isCorrect !== false,
                "hover:border-gray-400 hover:bg-gray-50": selectedAnswer !== false && !showFeedback,
              }
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                {
                  "border-blue-500 bg-blue-500": selectedAnswer === false && !showFeedback,
                  "border-green-500 bg-green-500": showFeedback && isCorrect === false,
                  "border-red-500 bg-red-500": showFeedback && selectedAnswer === false && isCorrect !== false,
                  "border-gray-300": selectedAnswer !== false && !showFeedback,
                }
              )}>
                {(selectedAnswer === false || (showFeedback && isCorrect === false)) && (
                  <X className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-base font-medium">False</span>
            </div>
          </Button>
        </div>

        {/* Feedback */}
        {showFeedback && explanation && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Explanation:</strong> {explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrueFalseQuestionViewer;
