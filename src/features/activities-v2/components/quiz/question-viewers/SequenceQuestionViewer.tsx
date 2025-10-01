'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GripVertical, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';

interface SequenceItem {
  id: string;
  text: string;
  order?: number;
}

interface SequenceQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      items?: SequenceItem[];
      correctOrder?: string[]; // Array of item IDs in correct order
      explanation?: string;
    };
  };
  answer?: string[]; // Array of item IDs in user's order
  onAnswerChange: (answer: string[]) => void;
  showFeedback?: boolean;
  className?: string;
}

export const SequenceQuestionViewer: React.FC<SequenceQuestionViewerProps> = ({
  question,
  answer = [],
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [sequence, setSequence] = useState<string[]>(answer);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSequence(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const items = question.content?.items || [];
  const correctOrder = question.content?.correctOrder || [];
  const explanation = question.content?.explanation;

  // Initialize sequence with all items if empty
  useEffect(() => {
    if (sequence.length === 0 && items.length > 0) {
      // Shuffle items initially for a challenge
      const shuffledIds = items.map(item => item.id).sort(() => Math.random() - 0.5);
      setSequence(shuffledIds);
      onAnswerChange(shuffledIds);
    }
  }, [items, sequence.length, onAnswerChange]);

  const getItemById = (id: string) => items.find(item => item.id === id);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (showFeedback) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex && !showFeedback) {
      const newSequence = [...sequence];
      const draggedItem = newSequence[dragIndex];
      
      // Remove the dragged item
      newSequence.splice(dragIndex, 1);
      
      // Insert at the new position
      newSequence.splice(dropIndex, 0, draggedItem);
      
      setSequence(newSequence);
      onAnswerChange(newSequence);
    }
    
    setDraggedIndex(null);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (showFeedback || fromIndex === toIndex) return;
    
    const newSequence = [...sequence];
    const item = newSequence[fromIndex];
    
    newSequence.splice(fromIndex, 1);
    newSequence.splice(toIndex, 0, item);
    
    setSequence(newSequence);
    onAnswerChange(newSequence);
  };

  const handleReset = () => {
    if (showFeedback) return;
    const shuffledIds = items.map(item => item.id).sort(() => Math.random() - 0.5);
    setSequence(shuffledIds);
    onAnswerChange(shuffledIds);
  };

  const getItemStatus = (itemId: string, index: number) => {
    if (!showFeedback) return 'default';
    
    const correctIndex = correctOrder.indexOf(itemId);
    if (correctIndex === index) return 'correct';
    return 'incorrect';
  };

  const isSequenceCorrect = () => {
    return sequence.length === correctOrder.length && 
           sequence.every((id, index) => id === correctOrder[index]);
  };

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-0">
        {/* Question Text */}
        <div className="mb-6">
          <div className="prose prose-sm sm:prose-base max-w-none">
            <p className="text-gray-900 leading-relaxed">{questionText}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            {showFeedback 
              ? "Review the correct sequence below:"
              : "Drag and drop the items to arrange them in the correct order, or use the arrow buttons."
            }
          </p>
        </div>

        {/* Reset Button */}
        {!showFeedback && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Shuffle
            </Button>
          </div>
        )}

        {/* Sequence Items */}
        <div className="space-y-2">
          {sequence.map((itemId, index) => {
            const item = getItemById(itemId);
            if (!item) return null;

            const status = getItemStatus(itemId, index);
            const isDragged = draggedIndex === index;

            return (
              <div
                key={`${itemId}-${index}`}
                draggable={!showFeedback}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-md transition-all duration-200",
                  {
                    "border-gray-300 bg-white hover:border-gray-400": status === 'default' && !showFeedback,
                    "border-green-500 bg-green-100 text-green-900": status === 'correct',
                    "border-red-500 bg-red-100 text-red-900": status === 'incorrect',
                    "opacity-50 scale-105": isDragged,
                    "cursor-move": !showFeedback,
                    "cursor-not-allowed": showFeedback,
                  }
                )}
              >
                {/* Order Number */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm",
                  {
                    "border-gray-400 bg-white text-gray-600": status === 'default',
                    "border-green-600 bg-green-600 text-white": status === 'correct',
                    "border-red-600 bg-red-600 text-white": status === 'incorrect',
                  }
                )}>
                  {index + 1}
                </div>

                {/* Drag Handle */}
                {!showFeedback && (
                  <GripVertical className="h-4 w-4 text-gray-400" />
                )}

                {/* Item Text */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm sm:text-base break-words">{item.text}</span>
                </div>

                {/* Move Buttons */}
                {!showFeedback && (
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItem(index, Math.min(sequence.length - 1, index + 1))}
                      disabled={index === sequence.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feedback Summary */}
        {showFeedback && (
          <div className="mt-6">
            <div className={cn(
              "p-4 border rounded-md",
              {
                "border-green-500 bg-green-50": isSequenceCorrect(),
                "border-red-500 bg-red-50": !isSequenceCorrect(),
              }
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  {
                    "bg-green-500": isSequenceCorrect(),
                    "bg-red-500": !isSequenceCorrect(),
                  }
                )} />
                <span className={cn(
                  "font-medium",
                  {
                    "text-green-900": isSequenceCorrect(),
                    "text-red-900": !isSequenceCorrect(),
                  }
                )}>
                  {isSequenceCorrect() ? "Correct Sequence!" : "Incorrect Sequence"}
                </span>
              </div>
              
              {!isSequenceCorrect() && (
                <div className="text-sm text-red-800">
                  <p className="mb-2">Correct order:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {correctOrder.map((itemId, index) => {
                      const item = getItemById(itemId);
                      return (
                        <li key={itemId} className="text-sm">
                          {item?.text}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explanation */}
        {showFeedback && explanation && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
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

export default SequenceQuestionViewer;
