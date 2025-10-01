'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TextQuestionViewerProps {
  question: {
    id: string;
    questionType: string;
    content: {
      text?: string;
      question?: string;
      correctAnswer?: string;
      explanation?: string;
    };
  };
  answer?: string;
  onAnswerChange: (answer: string) => void;
  showFeedback?: boolean;
  className?: string;
}

export const TextQuestionViewer: React.FC<TextQuestionViewerProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [inputValue, setInputValue] = useState<string>(answer || '');

  useEffect(() => {
    setInputValue(answer || '');
  }, [answer]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onAnswerChange(value);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const correctAnswer = question.content?.correctAnswer;
  const explanation = question.content?.explanation;
  const isEssay = question.questionType === 'ESSAY';
  const isShortAnswer = question.questionType === 'SHORT_ANSWER';

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-gray-900 leading-relaxed">{questionText}</p>
          </div>
        </div>

        {/* Answer Input */}
        <div className="space-y-4">
          {isEssay ? (
            <Textarea
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[120px] resize-none"
              disabled={showFeedback}
            />
          ) : (
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type your answer here..."
              disabled={showFeedback}
            />
          )}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="mt-4 space-y-3">
            {correctAnswer && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>Correct Answer:</strong> {correctAnswer}
                </p>
              </div>
            )}
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

export default TextQuestionViewer;
