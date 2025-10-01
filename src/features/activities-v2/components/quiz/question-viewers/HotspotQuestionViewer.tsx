'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface Hotspot {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  label?: string;
  feedback?: string;
  isCorrect: boolean;
}

interface HotspotQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      imageUrl?: string;
      hotspots?: Hotspot[];
      allowMultipleSelections?: boolean;
      showHotspotsOnFeedback?: boolean;
      explanation?: string;
    };
  };
  answer?: string[] | string; // hotspot IDs
  onAnswerChange: (answer: string[] | string) => void;
  showFeedback?: boolean;
  className?: string;
}

export const HotspotQuestionViewer: React.FC<HotspotQuestionViewerProps> = ({
  question,
  answer = [],
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [selectedHotspots, setSelectedHotspots] = useState<string[]>(
    Array.isArray(answer) ? answer : answer ? [answer] : []
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAllHotspots, setShowAllHotspots] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const newSelection = Array.isArray(answer) ? answer : answer ? [answer] : [];
    setSelectedHotspots(newSelection);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const imageUrl = question.content?.imageUrl || '';
  const hotspots = question.content?.hotspots || [];
  const allowMultipleSelections = question.content?.allowMultipleSelections ?? false;
  const showHotspotsOnFeedback = question.content?.showHotspotsOnFeedback ?? true;
  const explanation = question.content?.explanation;

  const handleHotspotClick = (hotspotId: string) => {
    if (showFeedback) return;

    let newSelection: string[];
    
    if (allowMultipleSelections) {
      // Multiple selection mode
      if (selectedHotspots.includes(hotspotId)) {
        newSelection = selectedHotspots.filter(id => id !== hotspotId);
      } else {
        newSelection = [...selectedHotspots, hotspotId];
      }
    } else {
      // Single selection mode
      newSelection = selectedHotspots.includes(hotspotId) ? [] : [hotspotId];
    }

    setSelectedHotspots(newSelection);
    onAnswerChange(allowMultipleSelections ? newSelection : newSelection[0] || '');
  };

  const handleReset = () => {
    if (showFeedback) return;
    setSelectedHotspots([]);
    onAnswerChange(allowMultipleSelections ? [] : '');
  };

  const getHotspotStatus = (hotspot: Hotspot) => {
    const isSelected = selectedHotspots.includes(hotspot.id);
    
    if (!showFeedback) {
      return isSelected ? 'selected' : 'default';
    }

    if (hotspot.isCorrect && isSelected) return 'correct';
    if (hotspot.isCorrect && !isSelected) return 'missed';
    if (!hotspot.isCorrect && isSelected) return 'incorrect';
    return 'default';
  };

  const shouldShowHotspot = (hotspot: Hotspot) => {
    if (!showFeedback) return true;
    if (!showHotspotsOnFeedback) return selectedHotspots.includes(hotspot.id);
    return showAllHotspots || selectedHotspots.includes(hotspot.id) || hotspot.isCorrect;
  };

  if (!imageUrl) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-0">
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No image available for hotspot question</p>
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
              ? "Review your selections below:"
              : allowMultipleSelections
                ? "Click on the image to select multiple hotspots. Click again to deselect."
                : "Click on the image to select the correct hotspot. Click again to deselect."
            }
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!showFeedback && selectedHotspots.length > 0 && (
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
          
          {showFeedback && showHotspotsOnFeedback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllHotspots(!showAllHotspots)}
              className="text-xs"
            >
              {showAllHotspots ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide All Hotspots
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show All Hotspots
                </>
              )}
            </Button>
          )}
        </div>

        {/* Hotspot Image */}
        <div className="mb-6">
          <div className="relative inline-block max-w-full">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Hotspot question image"
              className="max-w-full h-auto border rounded-md"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border rounded-md">
                <div className="text-center text-gray-500">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Loading image...</p>
                </div>
              </div>
            )}

            {/* Hotspots Overlay */}
            {imageLoaded && (
              <div className="absolute inset-0">
                {hotspots.map((hotspot) => {
                  if (!shouldShowHotspot(hotspot)) return null;
                  
                  const status = getHotspotStatus(hotspot);
                  const isSelected = selectedHotspots.includes(hotspot.id);
                  
                  return (
                    <div
                      key={hotspot.id}
                      className={cn(
                        "absolute cursor-pointer transition-all duration-200 border-2 rounded",
                        "hover:scale-105 hover:shadow-lg",
                        {
                          "border-gray-400 bg-gray-200 bg-opacity-50": status === 'default',
                          "border-blue-500 bg-blue-200 bg-opacity-70": status === 'selected',
                          "border-green-500 bg-green-200 bg-opacity-70": status === 'correct',
                          "border-red-500 bg-red-200 bg-opacity-70": status === 'incorrect',
                          "border-orange-500 bg-orange-200 bg-opacity-70": status === 'missed',
                          "cursor-not-allowed": showFeedback,
                        }
                      )}
                      style={{
                        left: `${hotspot.x}%`,
                        top: `${hotspot.y}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                      }}
                      onClick={() => handleHotspotClick(hotspot.id)}
                      title={hotspot.label || `Hotspot ${hotspot.id}`}
                    >
                      {/* Hotspot indicator */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 transition-all duration-200",
                          {
                            "border-gray-600 bg-white": status === 'default',
                            "border-blue-600 bg-blue-500": status === 'selected',
                            "border-green-600 bg-green-500": status === 'correct',
                            "border-red-600 bg-red-500": status === 'incorrect',
                            "border-orange-600 bg-orange-500": status === 'missed',
                          }
                        )} />
                      </div>
                      
                      {/* Label */}
                      {hotspot.label && (
                        <div className={cn(
                          "absolute -top-6 left-1/2 transform -translate-x-1/2",
                          "px-2 py-1 text-xs font-medium rounded shadow-sm whitespace-nowrap",
                          {
                            "bg-gray-800 text-white": status === 'default',
                            "bg-blue-600 text-white": status === 'selected',
                            "bg-green-600 text-white": status === 'correct',
                            "bg-red-600 text-white": status === 'incorrect',
                            "bg-orange-600 text-white": status === 'missed',
                          }
                        )}>
                          {hotspot.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selection Summary */}
        {selectedHotspots.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 border rounded-md">
            <h5 className="text-sm font-medium text-gray-900 mb-2">
              Selected Hotspots ({selectedHotspots.length})
            </h5>
            <div className="flex flex-wrap gap-2">
              {selectedHotspots.map((hotspotId) => {
                const hotspot = hotspots.find(h => h.id === hotspotId);
                const status = hotspot ? getHotspotStatus(hotspot) : 'default';
                
                return (
                  <div
                    key={hotspotId}
                    className={cn(
                      "px-2 py-1 text-xs rounded border",
                      {
                        "border-blue-300 bg-blue-100 text-blue-800": status === 'selected',
                        "border-green-300 bg-green-100 text-green-800": status === 'correct',
                        "border-red-300 bg-red-100 text-red-800": status === 'incorrect',
                      }
                    )}
                  >
                    {hotspot?.label || `Hotspot ${hotspotId}`}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback */}
        {showFeedback && (
          <div className="mb-4 space-y-2">
            {hotspots.map((hotspot) => {
              const isSelected = selectedHotspots.includes(hotspot.id);
              const status = getHotspotStatus(hotspot);
              
              if (!hotspot.feedback || (!isSelected && !hotspot.isCorrect)) return null;
              
              return (
                <div
                  key={`feedback-${hotspot.id}`}
                  className={cn(
                    "p-3 border rounded-md text-sm",
                    {
                      "border-green-200 bg-green-50 text-green-800": status === 'correct',
                      "border-red-200 bg-red-50 text-red-800": status === 'incorrect',
                      "border-orange-200 bg-orange-50 text-orange-800": status === 'missed',
                    }
                  )}
                >
                  <div className="font-medium mb-1">
                    {hotspot.label || `Hotspot ${hotspot.id}`}
                    {status === 'correct' && ' ✓'}
                    {status === 'incorrect' && ' ✗'}
                    {status === 'missed' && ' (Missed)'}
                  </div>
                  <div>{hotspot.feedback}</div>
                </div>
              );
            })}
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

export default HotspotQuestionViewer;
