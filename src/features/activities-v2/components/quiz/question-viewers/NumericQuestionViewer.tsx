'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NumericQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      correctAnswer?: number;
      acceptableRange?: {
        min: number;
        max: number;
      };
      unit?: string;
      decimalPlaces?: number;
      explanation?: string;
    };
  };
  answer?: number;
  onAnswerChange: (answer: number) => void;
  showFeedback?: boolean;
  className?: string;
}

export const NumericQuestionViewer: React.FC<NumericQuestionViewerProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [inputValue, setInputValue] = useState<string>(answer?.toString() || '');
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    setInputValue(answer?.toString() || '');
  }, [answer]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Validate numeric input
    const numericValue = parseFloat(value);
    if (value === '' || isNaN(numericValue)) {
      setIsValid(value === '');
      if (value === '') {
        onAnswerChange(0); // or undefined, depending on your needs
      }
      return;
    }

    setIsValid(true);
    onAnswerChange(numericValue);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const correctAnswer = question.content?.correctAnswer;
  const acceptableRange = question.content?.acceptableRange;
  const unit = question.content?.unit;
  const decimalPlaces = question.content?.decimalPlaces;
  const explanation = question.content?.explanation;

  const isAnswerCorrect = (): boolean => {
    if (answer === undefined || answer === null) return false;
    
    if (acceptableRange) {
      return answer >= acceptableRange.min && answer <= acceptableRange.max;
    }
    
    if (correctAnswer !== undefined) {
      // Handle decimal places for comparison
      if (decimalPlaces !== undefined) {
        const roundedAnswer = Math.round(answer * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
        const roundedCorrect = Math.round(correctAnswer * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
        return roundedAnswer === roundedCorrect;
      }
      return answer === correctAnswer;
    }
    
    return false;
  };

  const formatNumber = (num: number): string => {
    if (decimalPlaces !== undefined) {
      return num.toFixed(decimalPlaces);
    }
    return num.toString();
  };

  const getInputStatus = () => {
    if (!showFeedback) return 'default';
    if (!isValid) return 'invalid';
    if (answer === undefined || answer === null) return 'unanswered';
    return isAnswerCorrect() ? 'correct' : 'incorrect';
  };

  const inputStatus = getInputStatus();

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-gray-900 leading-relaxed">{questionText}</p>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <em>Enter a numeric value{unit ? ` (${unit})` : ''}</em>
          </div>
        </div>

        {/* Numeric Input */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="number"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`Enter number${unit ? ` in ${unit}` : ''}...`}
              disabled={showFeedback}
              step={decimalPlaces !== undefined ? Math.pow(10, -decimalPlaces) : 'any'}
              className={cn(
                "text-lg font-mono text-center",
                {
                  "border-green-500 bg-green-50": inputStatus === 'correct',
                  "border-red-500 bg-red-50": inputStatus === 'incorrect',
                  "border-yellow-500 bg-yellow-50": inputStatus === 'unanswered' && showFeedback,
                  "border-red-300 bg-red-50": inputStatus === 'invalid',
                }
              )}
            />
            {unit && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Badge variant="outline" className="text-xs">
                  {unit}
                </Badge>
              </div>
            )}
          </div>

          {/* Input Validation */}
          {!isValid && (
            <div className="text-sm text-red-600">
              Please enter a valid number.
            </div>
          )}

          {/* Decimal Places Hint */}
          {decimalPlaces !== undefined && (
            <div className="text-sm text-gray-500">
              Answer should have {decimalPlaces} decimal place{decimalPlaces !== 1 ? 's' : ''}.
            </div>
          )}

          {/* Range Hint */}
          {acceptableRange && !showFeedback && (
            <div className="text-sm text-gray-500">
              Acceptable range: {formatNumber(acceptableRange.min)} to {formatNumber(acceptableRange.max)}
              {unit ? ` ${unit}` : ''}
            </div>
          )}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="mt-6 space-y-3">
            {/* Answer Status */}
            <div className={cn(
              "p-3 rounded-md border",
              {
                "bg-green-50 border-green-200": inputStatus === 'correct',
                "bg-red-50 border-red-200": inputStatus === 'incorrect',
                "bg-yellow-50 border-yellow-200": inputStatus === 'unanswered',
                "bg-gray-50 border-gray-200": inputStatus === 'invalid',
              }
            )}>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {inputStatus === 'correct' && 'Correct!'}
                  {inputStatus === 'incorrect' && 'Incorrect'}
                  {inputStatus === 'unanswered' && 'No answer provided'}
                  {inputStatus === 'invalid' && 'Invalid input'}
                </span>
                <span className={cn(
                  "text-sm",
                  {
                    "text-green-800": inputStatus === 'correct',
                    "text-red-800": inputStatus === 'incorrect',
                    "text-yellow-800": inputStatus === 'unanswered',
                    "text-gray-800": inputStatus === 'invalid',
                  }
                )}>
                  Your answer: {inputValue || 'None'}{unit ? ` ${unit}` : ''}
                </span>
              </div>
            </div>

            {/* Correct Answer */}
            {(inputStatus === 'incorrect' || inputStatus === 'unanswered') && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Correct answer:</strong>{' '}
                  {acceptableRange ? (
                    `${formatNumber(acceptableRange.min)} to ${formatNumber(acceptableRange.max)}`
                  ) : correctAnswer !== undefined ? (
                    formatNumber(correctAnswer)
                  ) : (
                    'Not specified'
                  )}
                  {unit ? ` ${unit}` : ''}
                </p>
              </div>
            )}

            {/* Explanation */}
            {explanation && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>Explanation:</strong> {explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NumericQuestionViewer;
