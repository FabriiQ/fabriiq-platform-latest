'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';

interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface MultipleChoiceQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      options?: MultipleChoiceOption[];
      correctAnswer?: string;
      explanation?: string;
    };
  };
  answer?: string;
  onAnswerChange: (answer: string) => void;
  showFeedback?: boolean;
  shuffleOptions?: boolean;
  className?: string;
}

export const MultipleChoiceQuestionViewer: React.FC<MultipleChoiceQuestionViewerProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback = false,
  shuffleOptions = false,
  className
}) => {
  // Use answer prop directly to avoid state sync issues
  const selectedAnswer = answer ?? null;

  // Get theme for consistent styling
  const { theme } = useTheme();

  // Process options with useMemo to avoid unnecessary re-renders
  const options = React.useMemo(() => {
    const questionOptions = question.content?.options || [];
    if (shuffleOptions) {
      return [...questionOptions].sort(() => Math.random() - 0.5);
    }
    return questionOptions;
  }, [question.content?.options, shuffleOptions]);

  const handleAnswerSelect = (optionId: string) => {
    console.log('Multiple choice option clicked:', optionId); // Debug log
    onAnswerChange(optionId);
  };

  const questionText = question.content?.text || question.content?.question || '';
  const correctAnswer = question.content?.correctAnswer;
  const explanation = question.content?.explanation;

  const getOptionStatus = (option: MultipleChoiceOption) => {
    if (!showFeedback) {
      return selectedAnswer === option.id ? 'selected' : 'default';
    }

    const isCorrect = option.isCorrect || option.id === correctAnswer;
    const isSelected = selectedAnswer === option.id;

    if (isCorrect && isSelected) return 'correct';
    if (isCorrect && !isSelected) return 'correct-unselected';
    if (!isCorrect && isSelected) return 'incorrect';
    return 'default';
  };

  // Enhanced SelectableOption component for CAT activities
  const SelectableOption: React.FC<{
    option: MultipleChoiceOption;
    index: number;
    isSelected: boolean;
    status: string;
    onSelect: () => void;
  }> = ({ option, index, isSelected, status, onSelect }) => {
    const optionRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isTouched, setIsTouched] = useState(false);

    // Reset touch state after delay
    useEffect(() => {
      if (isTouched) {
        const timer = setTimeout(() => {
          setIsTouched(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [isTouched]);

    // Handle click with enhanced animation
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (showFeedback) return;

      // Play selection animation
      if (optionRef.current) {
        optionRef.current.classList.add('pulse-animation');
        setTimeout(() => {
          optionRef.current?.classList.remove('pulse-animation');
        }, 500);
      }

      // Set touch state for mobile feedback
      setIsTouched(true);

      // Call the selection handler
      onSelect();
    };

    const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
    const isCorrect = option.isCorrect || option.id === correctAnswer;

    return (
      <div
        ref={optionRef}
        data-theme={theme}
        className={cn(
          "w-full p-4 border rounded-md transition-all duration-200 cursor-pointer select-none",
          {
            // Use brand colors for selected state
            "border-primary-green bg-light-mint dark:bg-primary-green/20 shadow-md": isSelected && !showFeedback,
            // Correct answer in feedback mode (selected)
            "border-green-600 bg-green-100 text-green-900": status === 'correct',
            // Correct answer in feedback mode (not selected)
            "border-green-600 bg-green-50 text-green-700": status === 'correct-unselected',
            // Incorrect answer in feedback mode
            "border-red-600 bg-red-100 text-red-900": status === 'incorrect',
            // Default state with enhanced hover
            "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800": !isSelected && !showFeedback && status === 'default' && !isHovered && !isTouched,
            "border-medium-teal dark:border-medium-teal/70 bg-gray-50 dark:bg-gray-700": !isSelected && !showFeedback && (isHovered || isTouched),
            // Disabled state
            "opacity-60 cursor-not-allowed": showFeedback,
            // Enhanced animations
            "transform scale-[1.02] shadow-sm": (isHovered || isTouched) && !showFeedback && !isSelected,
            "animate-shake": isTouched && !isSelected,
          },
          "pulse-animation:animate-[pulse_0.5s_ease-in-out]"
        )}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsTouched(true)}
        role="radio"
        aria-checked={isSelected}
        tabIndex={showFeedback ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
      >
        <div className="flex items-start gap-3 w-full">
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all flex-shrink-0 mt-0.5 font-bold text-xs",
            {
              // Use brand colors for selection indicator
              "border-primary-green bg-primary-green text-white": isSelected && !showFeedback,
              "border-green-600 bg-green-600 text-white": status === 'correct',
              "border-red-600 bg-red-600 text-white": status === 'incorrect',
              "border-gray-400 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400": !isSelected && !showFeedback,
            }
          )}>
            {isSelected && !showFeedback && <Check className="w-3 h-3" />}
            {status === 'correct' && <Check className="w-3 h-3" />}
            {status === 'incorrect' && <X className="w-3 h-3" />}
            {!isSelected && !showFeedback && (
              <span className="text-xs font-bold">
                {optionLetter}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span 
              className="text-sm sm:text-base break-words leading-relaxed"
              dangerouslySetInnerHTML={{ __html: option.text }}
            />
          </div>
        </div>
      </div>
    );
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
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const status = getOptionStatus(option);
            const isSelected = selectedAnswer === option.id;

            return (
              <SelectableOption
                key={`option-${option.id}-${index}`}
                option={option}
                index={index}
                isSelected={isSelected}
                status={status}
                onSelect={() => handleAnswerSelect(option.id)}
              />
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
      </CardContent>
    </Card>
  );
};

export default MultipleChoiceQuestionViewer;
