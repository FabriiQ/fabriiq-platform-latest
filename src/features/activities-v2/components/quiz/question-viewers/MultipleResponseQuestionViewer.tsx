'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface MultipleResponseOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface MultipleResponseQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      options?: MultipleResponseOption[];
      correctAnswers?: string[];
      explanation?: string;
    };
  };
  answer?: string[];
  onAnswerChange: (answer: string[]) => void;
  showFeedback?: boolean;
  shuffleOptions?: boolean;
  className?: string;
}

export const MultipleResponseQuestionViewer: React.FC<MultipleResponseQuestionViewerProps> = ({
  question,
  answer = [],
  onAnswerChange,
  showFeedback = false,
  shuffleOptions = false,
  className
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(answer);
  const [options, setOptions] = useState<MultipleResponseOption[]>([]);

  useEffect(() => {
    setSelectedAnswers(answer);
  }, [answer]);

  useEffect(() => {
    const questionOptions = question.content?.options || [];
    if (shuffleOptions) {
      // Simple shuffle algorithm
      const shuffled = [...questionOptions].sort(() => Math.random() - 0.5);
      setOptions(shuffled);
    } else {
      setOptions(questionOptions);
    }
  }, [question.content?.options, shuffleOptions]);

  const handleAnswerToggle = (optionId: string) => {
    const newAnswers = selectedAnswers.includes(optionId)
      ? selectedAnswers.filter(id => id !== optionId)
      : [...selectedAnswers, optionId];
    
    setSelectedAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const correctAnswers = question.content?.correctAnswers || [];
  const explanation = question.content?.explanation;

  const getOptionStatus = (option: MultipleResponseOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    
    if (!showFeedback) {
      return isSelected ? 'selected' : 'default';
    }

    const isCorrect = option.isCorrect || correctAnswers.includes(option.id);
    
    if (isCorrect && isSelected) return 'correct';
    if (isCorrect && !isSelected) return 'missed';
    if (!isCorrect && isSelected) return 'incorrect';
    return 'default';
  };

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <div 
              className="text-gray-900 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: questionText }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <em>Select all that apply</em>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const status = getOptionStatus(option);
            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
            const isSelected = selectedAnswers.includes(option.id);

            return (
              <Button
                key={`option-${option.id}-${index}`}
                variant="outline"
                size="lg"
                onClick={() => handleAnswerToggle(option.id)}
                disabled={showFeedback}
                className={cn(
                  "w-full justify-start p-4 h-auto text-left transition-all duration-200",
                  {
                    "border-blue-500 bg-blue-50 text-blue-900": status === 'selected',
                    "border-green-500 bg-green-50 text-green-900": status === 'correct',
                    "border-red-500 bg-red-50 text-red-900": status === 'incorrect',
                    "border-orange-500 bg-orange-50 text-orange-900": status === 'missed',
                    "hover:border-gray-400 hover:bg-gray-50": status === 'default' && !showFeedback,
                  }
                )}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex items-center justify-center mt-0.5">
                    <Checkbox
                      checked={isSelected}
                      className={cn(
                        "w-5 h-5",
                        {
                          "border-blue-500 data-[state=checked]:bg-blue-500": status === 'selected',
                          "border-green-500 data-[state=checked]:bg-green-500": status === 'correct',
                          "border-red-500 data-[state=checked]:bg-red-500": status === 'incorrect',
                          "border-orange-500": status === 'missed',
                        }
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-bold text-gray-500 flex-shrink-0">
                      {optionLetter}.
                    </span>
                    <span 
                      className="text-sm sm:text-base break-words"
                      dangerouslySetInnerHTML={{ __html: option.text }}
                    />
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && explanation && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Explanation:</strong> {explanation}
            </p>
          </div>
        )}

        {/* Answer Summary */}
        {showFeedback && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Your selections:</strong> {selectedAnswers.length} option{selectedAnswers.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-blue-600 mt-1">
              <strong>Correct answers:</strong> {correctAnswers.length} option{correctAnswers.length !== 1 ? 's' : ''} required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultipleResponseQuestionViewer;
