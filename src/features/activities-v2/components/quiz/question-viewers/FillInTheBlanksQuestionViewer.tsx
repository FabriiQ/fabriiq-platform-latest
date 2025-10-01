'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FillInTheBlanksQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      blanks?: Array<{
        id: string;
        correctAnswer: string;
        placeholder?: string;
      }>;
      explanation?: string;
    };
  };
  answer?: Record<string, string>;
  onAnswerChange: (answer: Record<string, string>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const FillInTheBlanksQuestionViewer: React.FC<FillInTheBlanksQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [blankAnswers, setBlankAnswers] = useState<Record<string, string>>(answer);

  useEffect(() => {
    setBlankAnswers(answer);
  }, [answer]);

  const handleBlankChange = (blankId: string, value: string) => {
    const newAnswers = { ...blankAnswers, [blankId]: value };
    setBlankAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const blanks = question.content?.blanks || [];
  const explanation = question.content?.explanation;

  // Parse the question text and replace blanks with input fields
  const renderQuestionWithBlanks = () => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    // If no blanks are configured, show simple input fields at the end
    if (blanks.length === 0) {
      elements.push(
        <span key="question-text">{questionText}</span>
      );
      elements.push(
        <div key="simple-input" className="mt-4">
          <Input
            value={blankAnswers['default'] || ''}
            onChange={(e) => handleBlankChange('default', e.target.value)}
            placeholder="Type your answer here..."
            className="w-full min-h-[40px]"
            disabled={showFeedback}
            autoComplete="off"
          />
          {!blankAnswers['default'] && !showFeedback && (
            <p className="text-sm text-muted-foreground mt-1">
              Please enter your answer above
            </p>
          )}
        </div>
      );
      return elements;
    }

    // Find all blank placeholders in the format {{blank_id}} or ___
    const blankRegex = /\{\{(\w+)\}\}|_{3,}/g;
    let match;

    while ((match = blankRegex.exec(questionText)) !== null) {
      const [fullMatch, blankId] = match;
      const matchStart = match.index;

      // Add text before the blank
      if (matchStart > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {questionText.slice(lastIndex, matchStart)}
          </span>
        );
      }

      // Find the blank configuration or use index-based ID
      const actualBlankId = blankId || `blank_${elements.filter(el => typeof el === 'object' && el && 'key' in el && String(el.key).startsWith('blank-')).length}`;
      const blankConfig = blanks.find(b => b.id === actualBlankId) || blanks[elements.filter(el => typeof el === 'object' && el && 'key' in el && String(el.key).startsWith('blank-')).length];

      const isCorrect = showFeedback && blankConfig &&
        blankAnswers[actualBlankId]?.toLowerCase().trim() === blankConfig.correctAnswer.toLowerCase().trim();
      const isIncorrect = showFeedback && blankConfig &&
        blankAnswers[actualBlankId] &&
        blankAnswers[actualBlankId]?.toLowerCase().trim() !== blankConfig.correctAnswer.toLowerCase().trim();

      // Add the input field
      elements.push(
        <Input
          key={`blank-${actualBlankId}`}
          value={blankAnswers[actualBlankId] || ''}
          onChange={(e) => handleBlankChange(actualBlankId, e.target.value)}
          placeholder={blankConfig?.placeholder || 'Type answer...'}
          className={cn(
            "inline-block w-32 mx-1 h-8 text-center min-h-[32px]",
            {
              "border-green-500 bg-green-50": isCorrect,
              "border-red-500 bg-red-50": isIncorrect,
              "border-gray-300": !isCorrect && !isIncorrect,
            }
          )}
          disabled={showFeedback}
        />
      );

      lastIndex = matchStart + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < questionText.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {questionText.slice(lastIndex)}
        </span>
      );
    }

    // If no blanks were found in text but blanks are configured, add them at the end
    if (elements.filter(el => typeof el === 'object' && el && 'key' in el && String(el.key).startsWith('blank-')).length === 0 && blanks.length > 0) {
      elements.push(
        <div key="blanks-section" className="mt-4 space-y-2">
          {blanks.map((blank, index) => {
            const isCorrect = showFeedback &&
              blankAnswers[blank.id]?.toLowerCase().trim() === blank.correctAnswer.toLowerCase().trim();
            const isIncorrect = showFeedback &&
              blankAnswers[blank.id] &&
              blankAnswers[blank.id]?.toLowerCase().trim() !== blank.correctAnswer.toLowerCase().trim();

            return (
              <div key={`blank-row-${blank.id}`} className="flex items-center gap-2">
                <span className="text-sm font-medium">Blank {index + 1}:</span>
                <Input
                  value={blankAnswers[blank.id] || ''}
                  onChange={(e) => handleBlankChange(blank.id, e.target.value)}
                  placeholder={blank.placeholder || 'Type answer...'}
                  className={cn(
                    "flex-1 min-h-[40px]",
                    {
                      "border-green-500 bg-green-50": isCorrect,
                      "border-red-500 bg-red-50": isIncorrect,
                      "border-gray-300": !isCorrect && !isIncorrect,
                    }
                  )}
                  autoComplete="off"
                  disabled={showFeedback}
                />
              </div>
            );
          })}
        </div>
      );
    }

    return elements.length > 0 ? elements : <span>{questionText}</span>;
  };

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question with Blanks */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <div className="text-gray-900 leading-relaxed flex flex-wrap items-center">
              {renderQuestionWithBlanks()}
            </div>
          </div>
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="mt-4 space-y-3">
            {blanks.map((blank) => {
              const userAnswer = blankAnswers[blank.id];
              const isCorrect = userAnswer?.toLowerCase().trim() === blank.correctAnswer.toLowerCase().trim();
              
              return (
                <div 
                  key={blank.id}
                  className={cn(
                    "p-3 rounded-md border",
                    {
                      "bg-green-50 border-green-200": isCorrect,
                      "bg-red-50 border-red-200": !isCorrect && userAnswer,
                      "bg-gray-50 border-gray-200": !userAnswer,
                    }
                  )}
                >
                  <p className="text-sm">
                    <strong>Blank {blank.id}:</strong>{' '}
                    <span className={cn({
                      "text-green-800": isCorrect,
                      "text-red-800": !isCorrect && userAnswer,
                      "text-gray-600": !userAnswer,
                    })}>
                      Your answer: {userAnswer || 'No answer'}
                    </span>
                    {!isCorrect && (
                      <span className="text-green-800 ml-2">
                        (Correct: {blank.correctAnswer})
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
            
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

export default FillInTheBlanksQuestionViewer;
