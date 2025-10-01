'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GripVertical, RotateCcw } from 'lucide-react';

interface DragAndDropItem {
  id: string;
  text: string;
  category?: string;
}

interface DropZone {
  id: string;
  label: string;
  acceptedItems?: string[];
}

interface DragAndDropQuestionViewerProps {
  question: {
    id: string;
    content: {
      text?: string;
      question?: string;
      items?: DragAndDropItem[];
      dropZones?: DropZone[];
      correctPlacements?: Record<string, string>; // itemId -> dropZoneId
      explanation?: string;
    };
  };
  answer?: Record<string, string>; // itemId -> dropZoneId
  onAnswerChange: (answer: Record<string, string>) => void;
  showFeedback?: boolean;
  className?: string;
}

export const DragAndDropQuestionViewer: React.FC<DragAndDropQuestionViewerProps> = ({
  question,
  answer = {},
  onAnswerChange,
  showFeedback = false,
  className
}) => {
  const [placements, setPlacements] = useState<Record<string, string>>(answer);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPlacements(answer);
  }, [answer]);

  const questionText = question.content?.text || question.content?.question || '';
  const items = question.content?.items || [];
  const dropZones = question.content?.dropZones || [];
  const correctPlacements = question.content?.correctPlacements || {};
  const explanation = question.content?.explanation;

  // Get items that are not placed in any drop zone
  const unplacedItems = items.filter(item => !placements[item.id]);

  // Get items in a specific drop zone
  const getItemsInZone = (zoneId: string) => {
    return items.filter(item => placements[item.id] === zoneId);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    if (showFeedback) return;
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(zoneId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverZone(null);
    }
  };

  const handleDrop = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    
    if (itemId && !showFeedback) {
      const newPlacements = { ...placements, [itemId]: zoneId };
      setPlacements(newPlacements);
      onAnswerChange(newPlacements);
    }
    
    setDragOverZone(null);
    setDraggedItem(null);
  };

  const handleRemoveFromZone = (itemId: string) => {
    if (showFeedback) return;
    const newPlacements = { ...placements };
    delete newPlacements[itemId];
    setPlacements(newPlacements);
    onAnswerChange(newPlacements);
  };

  const handleReset = () => {
    if (showFeedback) return;
    setPlacements({});
    onAnswerChange({});
  };

  const getItemStatus = (itemId: string) => {
    if (!showFeedback) return 'default';
    
    const placedZone = placements[itemId];
    const correctZone = correctPlacements[itemId];
    
    if (!placedZone) return 'unplaced';
    if (placedZone === correctZone) return 'correct';
    return 'incorrect';
  };

  const getZoneStatus = (zoneId: string) => {
    if (!showFeedback) return 'default';
    
    const itemsInZone = getItemsInZone(zoneId);
    const allCorrect = itemsInZone.every(item => correctPlacements[item.id] === zoneId);
    const hasIncorrect = itemsInZone.some(item => correctPlacements[item.id] !== zoneId);
    
    if (hasIncorrect) return 'incorrect';
    if (itemsInZone.length > 0 && allCorrect) return 'correct';
    return 'default';
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

        {/* Reset Button */}
        {!showFeedback && Object.keys(placements).length > 0 && (
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Items Bank */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Items to Drag</h4>
            <div 
              className={cn(
                "min-h-[120px] p-4 border-2 border-dashed rounded-lg",
                "border-gray-300 bg-gray-50",
                unplacedItems.length === 0 && "border-green-300 bg-green-50"
              )}
            >
              {unplacedItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  All items have been placed
                </div>
              ) : (
                <div className="space-y-2">
                  {unplacedItems.map((item) => {
                    const status = getItemStatus(item.id);
                    return (
                      <div
                        key={item.id}
                        draggable={!showFeedback}
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-md transition-all duration-200",
                          "cursor-move select-none",
                          {
                            "border-blue-300 bg-blue-50": draggedItem === item.id,
                            "border-gray-300 bg-white hover:border-gray-400": status === 'default' && !showFeedback,
                            "opacity-50": draggedItem === item.id,
                            "cursor-not-allowed": showFeedback,
                          }
                        )}
                      >
                        {!showFeedback && (
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Drop Zones */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Drop Zones</h4>
            <div className="space-y-3">
              {dropZones.map((zone) => {
                const zoneStatus = getZoneStatus(zone.id);
                const itemsInZone = getItemsInZone(zone.id);
                
                return (
                  <div
                    key={zone.id}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, zone.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, zone.id)}
                    className={cn(
                      "min-h-[80px] p-4 border-2 border-dashed rounded-lg transition-all duration-200",
                      {
                        "border-gray-300 bg-gray-50": zoneStatus === 'default',
                        "border-blue-400 bg-blue-100": dragOverZone === zone.id,
                        "border-green-500 bg-green-100": zoneStatus === 'correct',
                        "border-red-500 bg-red-100": zoneStatus === 'incorrect',
                      }
                    )}
                  >
                    <div className="font-medium text-sm text-gray-700 mb-2">
                      {zone.label}
                    </div>
                    
                    {itemsInZone.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-4">
                        Drop items here
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {itemsInZone.map((item) => {
                          const status = getItemStatus(item.id);
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center justify-between p-2 border rounded-md text-sm",
                                {
                                  "border-green-500 bg-green-50 text-green-900": status === 'correct',
                                  "border-red-500 bg-red-50 text-red-900": status === 'incorrect',
                                  "border-gray-300 bg-white": status === 'default',
                                }
                              )}
                            >
                              <span>{item.text}</span>
                              {!showFeedback && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFromZone(item.id)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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

export default DragAndDropQuestionViewer;
