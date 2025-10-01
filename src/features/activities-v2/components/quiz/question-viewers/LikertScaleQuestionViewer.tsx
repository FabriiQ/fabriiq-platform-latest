'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BarChart3, RotateCcw } from 'lucide-react';

interface LikertScaleItem {
  id: string;
  text: string;
  required?: boolean;
}

interface LikertScaleOption {
  id: string;
  text: string;
  value: number;
}

interface LikertScaleQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      items?: LikertScaleItem[];
      scaleOptions?: LikertScaleOption[];
      scaleType?: 'agreement' | 'satisfaction' | 'frequency' | 'importance' | 'custom';
      showNeutral?: boolean;
      allowNeutral?: boolean;
      explanation?: string;
    };
  };
  answer?: Record<string, number>; // itemId -> scaleValue
  onAnswerChange: (answer: Record<string, number>) => void;
  showFeedback?: boolean;
  className?: string;
}

// Predefined scale types
const SCALE_PRESETS = {
  agreement: [
    { id: 'strongly_disagree', text: 'Strongly Disagree', value: 1 },
    { id: 'disagree', text: 'Disagree', value: 2 },
    { id: 'neutral', text: 'Neutral', value: 3 },
    { id: 'agree', text: 'Agree', value: 4 },
    { id: 'strongly_agree', text: 'Strongly Agree', value: 5 },
  ],
  satisfaction: [
    { id: 'very_dissatisfied', text: 'Very Dissatisfied', value: 1 },
    { id: 'dissatisfied', text: 'Dissatisfied', value: 2 },
    { id: 'neutral', text: 'Neutral', value: 3 },
    { id: 'satisfied', text: 'Satisfied', value: 4 },
    { id: 'very_satisfied', text: 'Very Satisfied', value: 5 },
  ],
  frequency: [
    { id: 'never', text: 'Never', value: 1 },
    { id: 'rarely', text: 'Rarely', value: 2 },
    { id: 'sometimes', text: 'Sometimes', value: 3 },
    { id: 'often', text: 'Often', value: 4 },
    { id: 'always', text: 'Always', value: 5 },
  ],
  importance: [
    { id: 'not_important', text: 'Not Important', value: 1 },
    { id: 'slightly_important', text: 'Slightly Important', value: 2 },
    { id: 'moderately_important', text: 'Moderately Important', value: 3 },
    { id: 'very_important', text: 'Very Important', value: 4 },
    { id: 'extremely_important', text: 'Extremely Important', value: 5 },
  ],
};

export const LikertScaleQuestionViewer: React.FC<LikertScaleQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>(answer);

  useEffect(() => {
    setUserAnswers(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const items = question.content?.items || [];
  const scaleType = question.content?.scaleType || 'agreement';
  const showNeutral = question.content?.showNeutral ?? true;
  const allowNeutral = question.content?.allowNeutral ?? true;
  const explanation = question.content?.explanation;

  // Get scale options (custom or preset)
  const scaleOptions = question.content?.scaleOptions || SCALE_PRESETS[scaleType] || SCALE_PRESETS.agreement;
  
  // Filter out neutral option if not allowed
  const filteredScaleOptions = showNeutral && allowNeutral 
    ? scaleOptions 
    : scaleOptions.filter(option => option.value !== 3);

  const handleAnswerChange = (itemId: string, value: number) => {
    if (showFeedback) return;
    
    const newAnswers = { ...userAnswers, [itemId]: value };
    setUserAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const handleReset = () => {
    if (showFeedback) return;
    setUserAnswers({});
    onAnswerChange({});
  };

  const getCompletionPercentage = () => {
    const requiredItems = items.filter(item => item.required !== false);
    const answeredRequired = requiredItems.filter(item => userAnswers[item.id] !== undefined);
    return requiredItems.length > 0 ? (answeredRequired.length / requiredItems.length) * 100 : 0;
  };

  const getScaleColor = (value: number, maxValue: number) => {
    const percentage = (value - 1) / (maxValue - 1);
    if (percentage <= 0.25) return 'bg-red-500';
    if (percentage <= 0.5) return 'bg-orange-500';
    if (percentage <= 0.75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (items.length === 0) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No Likert scale items available</p>
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

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            {showFeedback 
              ? "Review your responses below:"
              : "Please rate each statement using the scale provided. Click on the option that best represents your opinion."
            }
          </p>
        </div>

        {/* Progress and Reset */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Progress: {Math.round(getCompletionPercentage())}%
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
          
          {!showFeedback && Object.keys(userAnswers).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset All
            </Button>
          )}
        </div>

        {/* Scale Header */}
        <div className="mb-4 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <div className="text-sm font-medium text-gray-700">Statement</div>
              </div>
              <div className="col-span-7">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${filteredScaleOptions.length}, 1fr)` }}>
                  {filteredScaleOptions.map((option) => (
                    <div key={option.id} className="text-center">
                      <div className="text-xs font-medium text-gray-600 px-1">
                        {option.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Likert Scale Items */}
        <div className="space-y-4 overflow-x-auto">
          <div className="min-w-[600px]">
            {items.map((item, index) => {
              const selectedValue = userAnswers[item.id];
              const isRequired = item.required !== false;
              
              return (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-100 last:border-b-0">
                  {/* Statement */}
                  <div className="col-span-5">
                    <div className="text-sm text-gray-900 pr-4">
                      {item.text}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </div>
                  </div>
                  
                  {/* Scale Options */}
                  <div className="col-span-7">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${filteredScaleOptions.length}, 1fr)` }}>
                      {filteredScaleOptions.map((option) => {
                        const isSelected = selectedValue === option.value;
                        
                        return (
                          <div key={option.id} className="flex justify-center">
                            <button
                              onClick={() => handleAnswerChange(item.id, option.value)}
                              disabled={showFeedback}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all duration-200",
                                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                                {
                                  "border-gray-300 bg-white hover:border-gray-400": !isSelected && !showFeedback,
                                  "border-blue-500 bg-blue-500": isSelected && !showFeedback,
                                  "cursor-not-allowed opacity-50": showFeedback,
                                }
                              )}
                              title={`${option.text} (${option.value})`}
                            >
                              {isSelected && (
                                <div className="w-full h-full rounded-full bg-white scale-50" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Response Summary */}
        {showFeedback && Object.keys(userAnswers).length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border rounded-md">
            <h5 className="font-medium text-gray-900 mb-3">Response Summary</h5>
            <div className="space-y-2">
              {items.map((item) => {
                const value = userAnswers[item.id];
                const option = filteredScaleOptions.find(opt => opt.value === value);
                
                if (!value || !option) return null;
                
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="text-gray-700 flex-1 pr-4">{item.text}</div>
                    <div className="flex items-center gap-2">
                      <div 
                        className={cn(
                          "w-3 h-3 rounded-full",
                          getScaleColor(value, filteredScaleOptions.length)
                        )}
                      />
                      <span className="font-medium text-gray-900">{option.text}</span>
                      <span className="text-gray-500">({value})</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Average Score */}
            {Object.keys(userAnswers).length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-gray-700">Average Score:</span>
                  <span className="text-gray-900">
                    {(Object.values(userAnswers).reduce((sum, val) => sum + val, 0) / Object.values(userAnswers).length).toFixed(1)}
                    /{filteredScaleOptions[filteredScaleOptions.length - 1]?.value || 5}
                  </span>
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

export default LikertScaleQuestionViewer;
