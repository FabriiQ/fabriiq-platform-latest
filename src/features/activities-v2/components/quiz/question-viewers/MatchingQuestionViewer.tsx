'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface MatchingQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      pairs?: MatchingPair[];
      leftItems?: Array<{ id: string; text: string }>;
      rightItems?: Array<{ id: string; text: string }>;
      correctMatches?: Record<string, string>;
      explanation?: string;
    };
  };
  answer?: Record<string, string>;
  onAnswerChange: (answer: Record<string, string>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const MatchingQuestionViewer: React.FC<MatchingQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [matches, setMatches] = useState<Record<string, string>>(answer);
  const [leftItems, setLeftItems] = useState<Array<{ id: string; text: string }>>([]);
  const [rightItems, setRightItems] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => {
    setMatches(answer);
  }, [answer]);

  useEffect(() => {
    // Handle both formats: pairs or separate left/right items
    if (question.content?.pairs) {
      const pairs = question.content.pairs;
      const left = pairs.map(p => ({ id: p.id, text: p.left }));
      const right = pairs.map(p => ({ id: p.id, text: p.right }));
      
      // Shuffle right items for matching challenge
      const shuffledRight = [...right].sort(() => Math.random() - 0.5);
      
      setLeftItems(left);
      setRightItems(shuffledRight);
    } else if (question.content?.leftItems && question.content?.rightItems) {
      setLeftItems(question.content.leftItems);
      setRightItems([...question.content.rightItems].sort(() => Math.random() - 0.5));
    }
  }, [question.content]);

  const handleMatch = (leftId: string, rightId: string) => {
    const newMatches = { ...matches, [leftId]: rightId };
    setMatches(newMatches);
    onAnswerChange(newMatches);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const correctMatches = question.content?.correctMatches || {};
  const explanation = question.content?.explanation;

  const getMatchStatus = (leftId: string) => {
    if (!showFeedback) return 'default';
    
    const selectedRightId = matches[leftId];
    const correctRightId = correctMatches[leftId];
    
    if (!selectedRightId) return 'unanswered';
    if (selectedRightId === correctRightId) return 'correct';
    return 'incorrect';
  };

  const getRightItemText = (rightId: string) => {
    return rightItems.find(item => item.id === rightId)?.text || '';
  };

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-gray-900 leading-relaxed">{questionText}</p>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <em>Match each item on the left with the correct item on the right</em>
          </div>
        </div>

        {/* Matching Interface */}
        <div className="space-y-4">
          {leftItems.map((leftItem, index) => {
            const status = getMatchStatus(leftItem.id);
            const selectedRightId = matches[leftItem.id];

            return (
              <div
                key={leftItem.id}
                className={cn(
                  "flex items-center gap-4 p-4 border rounded-lg transition-all",
                  {
                    "border-green-500 bg-green-50": status === 'correct',
                    "border-red-500 bg-red-50": status === 'incorrect',
                    "border-yellow-500 bg-yellow-50": status === 'unanswered' && showFeedback,
                    "border-gray-200": status === 'default',
                  }
                )}
              >
                {/* Left Item */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-sm sm:text-base break-words">
                      {leftItem.text}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-0.5 bg-gray-300 relative">
                    <div className="absolute right-0 top-0 w-0 h-0 border-l-4 border-l-gray-300 border-t-2 border-b-2 border-t-transparent border-b-transparent transform -translate-y-1/2"></div>
                  </div>
                </div>

                {/* Right Item Selector */}
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedRightId || ''}
                    onValueChange={(value) => handleMatch(leftItem.id, value)}
                    disabled={showFeedback}
                  >
                    <SelectTrigger className={cn(
                      "w-full",
                      {
                        "border-green-500": status === 'correct',
                        "border-red-500": status === 'incorrect',
                        "border-yellow-500": status === 'unanswered' && showFeedback,
                      }
                    )}>
                      <SelectValue placeholder="Select match..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rightItems.map((rightItem) => (
                        <SelectItem key={rightItem.id} value={rightItem.id}>
                          {rightItem.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Indicator */}
                {showFeedback && (
                  <div className="flex-shrink-0 w-6">
                    {status === 'correct' && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    {status === 'incorrect' && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✗</span>
                      </div>
                    )}
                    {status === 'unanswered' && (
                      <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">?</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className="mt-6 space-y-3">
            {/* Correct Answers */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium mb-2">Correct Matches:</p>
              <div className="space-y-1">
                {Object.entries(correctMatches).map(([leftId, rightId]) => {
                  const leftText = leftItems.find(item => item.id === leftId)?.text;
                  const rightText = getRightItemText(rightId);
                  return (
                    <div key={leftId} className="text-sm text-green-700">
                      {leftText} → {rightText}
                    </div>
                  );
                })}
              </div>
            </div>

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

export default MatchingQuestionViewer;
