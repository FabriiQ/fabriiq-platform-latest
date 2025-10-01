'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RotateCcw, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashCard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

interface FlashCardsQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      cards?: FlashCard[];
      mode?: 'study' | 'quiz'; // study = can flip cards, quiz = must answer
      explanation?: string;
    };
  };
  answer?: Record<string, string>; // cardId -> user's answer (for quiz mode)
  onAnswerChange: (answer: Record<string, string>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const FlashCardsQuestionViewer: React.FC<FlashCardsQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(answer);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUserAnswers(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const cards = question.content?.cards || [];
  const mode = question.content?.mode || 'study';
  const explanation = question.content?.explanation;

  const currentCard = cards[currentCardIndex];

  const handleCardFlip = (cardId: string) => {
    if (showFeedback || mode === 'quiz') return;
    
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleAnswerChange = (cardId: string, value: string) => {
    if (showFeedback) return;
    
    const newAnswers = { ...userAnswers, [cardId]: value };
    setUserAnswers(newAnswers);
    onAnswerChange(newAnswers);
  };

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const handleReset = () => {
    if (showFeedback) return;
    setFlippedCards(new Set());
    setUserAnswers({});
    setShowHint({});
    setCurrentCardIndex(0);
    onAnswerChange({});
  };

  const toggleHint = (cardId: string) => {
    setShowHint(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getCardStatus = (cardId: string) => {
    if (!showFeedback || mode !== 'quiz') return 'default';
    
    const userAnswer = userAnswers[cardId];
    const card = cards.find(c => c.id === cardId);
    
    if (!userAnswer || !card) return 'unanswered';
    
    // Simple comparison - could be enhanced with fuzzy matching
    const isCorrect = userAnswer.toLowerCase().trim() === card.back.toLowerCase().trim();
    return isCorrect ? 'correct' : 'incorrect';
  };

  const isCardFlipped = (cardId: string) => flippedCards.has(cardId);

  if (!currentCard) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <p className="text-gray-500">No flash cards available</p>
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
            {mode === 'study' 
              ? "Click on the card to flip it and see the answer. Use the navigation buttons to move between cards."
              : showFeedback
                ? "Review your answers below:"
                : "Look at the front of each card and type your answer."
            }
          </p>
        </div>

        {/* Card Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Card {currentCardIndex + 1} of {cards.length}
            </span>
            
            {!showFeedback && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextCard}
            disabled={currentCardIndex === cards.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Flash Card */}
        <div className="mb-6">
          <div 
            className={cn(
              "relative w-full h-64 cursor-pointer transition-transform duration-300",
              mode === 'study' && "hover:scale-105"
            )}
            onClick={() => mode === 'study' && handleCardFlip(currentCard.id)}
          >
            <div className={cn(
              "absolute inset-0 w-full h-full transition-transform duration-500 preserve-3d",
              isCardFlipped(currentCard.id) && mode === 'study' && "rotate-y-180"
            )}>
              {/* Front of Card */}
              <div className={cn(
                "absolute inset-0 w-full h-full backface-hidden",
                "border-2 rounded-lg p-6 flex items-center justify-center",
                "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
              )}>
                <div className="text-center">
                  <div className="text-lg font-medium text-blue-900 mb-2">
                    {currentCard.front}
                  </div>
                  {mode === 'study' && (
                    <div className="text-sm text-blue-600">
                      Click to reveal answer
                    </div>
                  )}
                </div>
              </div>

              {/* Back of Card (Study Mode) */}
              {mode === 'study' && (
                <div className={cn(
                  "absolute inset-0 w-full h-full backface-hidden rotate-y-180",
                  "border-2 rounded-lg p-6 flex items-center justify-center",
                  "bg-gradient-to-br from-green-50 to-green-100 border-green-300"
                )}>
                  <div className="text-center">
                    <div className="text-lg font-medium text-green-900 mb-2">
                      {currentCard.back}
                    </div>
                    <div className="text-sm text-green-600">
                      Click to flip back
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hint Button */}
          {currentCard.hint && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleHint(currentCard.id)}
                className="text-xs"
              >
                {showHint[currentCard.id] ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Hide Hint
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show Hint
                  </>
                )}
              </Button>
              
              {showHint[currentCard.id] && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">{currentCard.hint}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quiz Mode Answer Input */}
        {mode === 'quiz' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer:
            </label>
            <div className="relative">
              <input
                type="text"
                value={userAnswers[currentCard.id] || ''}
                onChange={(e) => handleAnswerChange(currentCard.id, e.target.value)}
                disabled={showFeedback}
                placeholder="Type your answer here..."
                className={cn(
                  "w-full px-3 py-2 border rounded-md transition-colors",
                  {
                    "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500": !showFeedback,
                    "border-green-500 bg-green-50": showFeedback && getCardStatus(currentCard.id) === 'correct',
                    "border-red-500 bg-red-50": showFeedback && getCardStatus(currentCard.id) === 'incorrect',
                    "border-gray-400 bg-gray-50": showFeedback && getCardStatus(currentCard.id) === 'unanswered',
                  }
                )}
              />
              
              {showFeedback && (
                <div className="mt-2">
                  <div className={cn(
                    "text-sm font-medium",
                    {
                      "text-green-700": getCardStatus(currentCard.id) === 'correct',
                      "text-red-700": getCardStatus(currentCard.id) === 'incorrect',
                      "text-gray-600": getCardStatus(currentCard.id) === 'unanswered',
                    }
                  )}>
                    {getCardStatus(currentCard.id) === 'correct' && "Correct!"}
                    {getCardStatus(currentCard.id) === 'incorrect' && `Incorrect. Correct answer: ${currentCard.back}`}
                    {getCardStatus(currentCard.id) === 'unanswered' && `Not answered. Correct answer: ${currentCard.back}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{currentCardIndex + 1} / {cards.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
            />
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

export default FlashCardsQuestionViewer;
