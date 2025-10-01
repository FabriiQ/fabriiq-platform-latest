'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface DragTheWordsBlank {
  id: string;
  correctWord: string;
  alternatives?: string[];
}

interface DragTheWordsQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      textWithBlanks?: string; // Text with {{blankId}} placeholders
      blanks?: DragTheWordsBlank[];
      distractors?: string[]; // Extra words that don't belong
      explanation?: string;
    };
  };
  answer?: Record<string, string>; // blankId -> selectedWord
  onAnswerChange: (answer: Record<string, string>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const DragTheWordsQuestionViewer: React.FC<DragTheWordsQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [selections, setSelections] = useState<Record<string, string>>(answer);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [dragOverBlank, setDragOverBlank] = useState<string | null>(null);

  useEffect(() => {
    setSelections(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const textWithBlanks = question.content?.textWithBlanks || '';
  const blanks = question.content?.blanks || [];
  const distractors = question.content?.distractors || [];
  const explanation = question.content?.explanation;

  // Get all available words (correct words + distractors)
  const allWords = [
    ...blanks.map(blank => blank.correctWord),
    ...blanks.flatMap(blank => blank.alternatives || []),
    ...distractors
  ].filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

  // Get words that haven't been used yet
  const availableWords = allWords.filter(word => 
    !Object.values(selections).includes(word)
  );

  // Parse text with blanks to create renderable parts
  const parseTextWithBlanks = (text: string) => {
    const parts: Array<{ type: 'text' | 'blank', content: string, blankId?: string }> = [];
    let currentIndex = 0;
    
    const blankRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = blankRegex.exec(text)) !== null) {
      // Add text before the blank
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.substring(currentIndex, match.index)
        });
      }
      
      // Add the blank
      parts.push({
        type: 'blank',
        content: match[1],
        blankId: match[1]
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex)
      });
    }
    
    return parts;
  };

  const textParts = parseTextWithBlanks(textWithBlanks);

  const handleDragStart = (e: React.DragEvent, word: string) => {
    if (showFeedback) return;
    setDraggedWord(word);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', word);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
    setDragOverBlank(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, blankId: string) => {
    e.preventDefault();
    setDragOverBlank(blankId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverBlank(null);
    }
  };

  const handleDrop = (e: React.DragEvent, blankId: string) => {
    e.preventDefault();
    const word = e.dataTransfer.getData('text/plain');
    
    if (word && !showFeedback) {
      // Remove the word from its current position if it was already placed
      const newSelections = { ...selections };
      
      // Remove word from any existing blank
      Object.keys(newSelections).forEach(key => {
        if (newSelections[key] === word) {
          delete newSelections[key];
        }
      });
      
      // Place word in new blank
      newSelections[blankId] = word;
      
      setSelections(newSelections);
      onAnswerChange(newSelections);
    }
    
    setDragOverBlank(null);
    setDraggedWord(null);
  };

  const handleWordClick = (word: string, blankId?: string) => {
    if (showFeedback) return;
    
    if (blankId) {
      // Remove word from blank
      const newSelections = { ...selections };
      delete newSelections[blankId];
      setSelections(newSelections);
      onAnswerChange(newSelections);
    }
  };

  const handleReset = () => {
    if (showFeedback) return;
    setSelections({});
    onAnswerChange({});
  };

  const getBlankStatus = (blankId: string) => {
    if (!showFeedback) return 'default';
    
    const selectedWord = selections[blankId];
    const blank = blanks.find(b => b.id === blankId);
    
    if (!selectedWord) return 'empty';
    if (!blank) return 'default';
    
    const isCorrect = selectedWord === blank.correctWord || 
                     (blank.alternatives && blank.alternatives.includes(selectedWord));
    
    return isCorrect ? 'correct' : 'incorrect';
  };

  const getWordStatus = (word: string) => {
    if (!showFeedback) return 'default';
    
    // Check if this word is correctly placed
    const placedBlankId = Object.keys(selections).find(blankId => selections[blankId] === word);
    if (placedBlankId) {
      const blank = blanks.find(b => b.id === placedBlankId);
      if (blank) {
        const isCorrect = word === blank.correctWord || 
                         (blank.alternatives && blank.alternatives.includes(word));
        return isCorrect ? 'correct' : 'incorrect';
      }
    }
    
    return 'default';
  };

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
              ? "Review your answers below:"
              : "Drag words from the word bank to fill in the blanks, or click on placed words to remove them."
            }
          </p>
        </div>

        {/* Reset Button */}
        {!showFeedback && Object.keys(selections).length > 0 && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Text with Blanks */}
        <div className="mb-6 p-4 bg-gray-50 border rounded-md">
          <div className="text-base leading-relaxed">
            {textParts.map((part, index) => {
              if (part.type === 'text') {
                return <span key={index}>{part.content}</span>;
              } else if (part.type === 'blank' && part.blankId) {
                const selectedWord = selections[part.blankId];
                const status = getBlankStatus(part.blankId);
                
                return (
                  <span
                    key={index}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, part.blankId!)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, part.blankId!)}
                    className={cn(
                      "inline-block min-w-[80px] px-3 py-1 mx-1 border-b-2 text-center transition-all duration-200",
                      {
                        "border-gray-400 bg-white": status === 'default' || status === 'empty',
                        "border-blue-400 bg-blue-100": dragOverBlank === part.blankId,
                        "border-green-500 bg-green-100 text-green-900": status === 'correct',
                        "border-red-500 bg-red-100 text-red-900": status === 'incorrect',
                      }
                    )}
                  >
                    {selectedWord ? (
                      <span
                        onClick={() => handleWordClick(selectedWord, part.blankId)}
                        className={cn(
                          "cursor-pointer font-medium",
                          !showFeedback && "hover:opacity-70"
                        )}
                      >
                        {selectedWord}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">
                        {dragOverBlank === part.blankId ? "Drop here" : "___"}
                      </span>
                    )}
                  </span>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Word Bank */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Word Bank</h4>
          <div className={cn(
            "min-h-[80px] p-4 border-2 border-dashed rounded-lg",
            "border-gray-300 bg-gray-50"
          )}>
            {availableWords.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                All words have been used
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableWords.map((word, index) => {
                  const status = getWordStatus(word);
                  return (
                    <div
                      key={`${word}-${index}`}
                      draggable={!showFeedback}
                      onDragStart={(e) => handleDragStart(e, word)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "px-3 py-2 border rounded-md transition-all duration-200 text-sm",
                        "cursor-move select-none",
                        {
                          "border-gray-300 bg-white hover:border-gray-400": status === 'default' && !showFeedback,
                          "opacity-50": draggedWord === word,
                          "cursor-not-allowed": showFeedback,
                        }
                      )}
                    >
                      {word}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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

export default DragTheWordsQuestionViewer;
