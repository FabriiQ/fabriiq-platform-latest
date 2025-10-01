'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { RichTextEditor } from '@/features/activties/components/ui/RichTextEditor';
import { MediaSelector } from '@/features/activties/components/ui/MediaSelector';
import { MultipleChoiceContent, MultipleChoiceOption } from '../../models/types';
import { generateId } from '@/features/activties/models/base';

interface MultipleChoiceEditorProps {
  content: MultipleChoiceContent;
  onChange: (content: MultipleChoiceContent) => void;
}

/**
 * Multiple Choice Question Editor for Question Bank
 *
 * This component provides an interface for creating and editing
 * multiple choice questions with:
 * - Question text editing
 * - Option management
 * - Explanation and hint fields
 * - Media attachment
 */
export const MultipleChoiceEditor: React.FC<MultipleChoiceEditorProps> = ({
  content,
  onChange
}) => {
  // Initialize with default content if empty
  const [localContent, setLocalContent] = useState<MultipleChoiceContent>(
    content.text ? content : {
      text: '',
      options: [
        { id: generateId(), text: 'Option 1', isCorrect: true, feedback: 'Correct!' },
        { id: generateId(), text: 'Option 2', isCorrect: false, feedback: 'Incorrect.' },
        { id: generateId(), text: 'Option 3', isCorrect: false, feedback: 'Incorrect.' },
        { id: generateId(), text: 'Option 4', isCorrect: false, feedback: 'Incorrect.' }
      ]
    }
  );

  // Track which options have expanded feedback fields
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());

  // Update the local content and call onChange
  const updateContent = (updates: Partial<MultipleChoiceContent>) => {
    const updatedContent = { ...localContent, ...updates };
    setLocalContent(updatedContent);
    onChange(updatedContent);
  };

  // Handle question text change
  const handleQuestionTextChange = (text: string) => {
    updateContent({ text });
  };

  // Handle explanation change
  const handleExplanationChange = (explanation: string) => {
    updateContent({ explanation });
  };

  // Handle hint change
  const handleHintChange = (hint: string) => {
    updateContent({ hint });
  };

  // Handle media change
  const handleMediaChange = (media?: any) => {
    // Convert MediaItem to QuestionMedia if needed
    if (media) {
      const questionMedia = {
        type: media.type,
        url: media.url,
        alt: media.alt,
        caption: media.caption
      };
      updateContent({ media: questionMedia });
    } else {
      updateContent({ media: undefined });
    }
  };

  // Handle option change
  const handleOptionChange = (optionIndex: number, updates: Partial<MultipleChoiceOption>) => {
    const newOptions = [...localContent.options];

    // If we're setting this option as correct, make sure others are not correct
    if (updates.isCorrect) {
      newOptions.forEach((option, i) => {
        if (i !== optionIndex) {
          option.isCorrect = false;
        }
      });
    }

    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      ...updates
    };

    updateContent({ options: newOptions });
  };

  // Add a new option
  const handleAddOption = () => {
    updateContent({
      options: [
        ...localContent.options,
        { id: generateId(), text: 'New option', isCorrect: false, feedback: '' }
      ]
    });
  };

  // Remove an option
  const handleRemoveOption = (optionIndex: number) => {
    const newOptions = [...localContent.options];
    const removedOption = newOptions[optionIndex];
    newOptions.splice(optionIndex, 1);

    // Remove from expanded feedback set
    setExpandedFeedback(prev => {
      const newSet = new Set(prev);
      newSet.delete(removedOption.id);
      return newSet;
    });

    // Ensure at least one option is marked as correct
    if (!newOptions.some(o => o.isCorrect) && newOptions.length > 0) {
      newOptions[0].isCorrect = true;
    }

    updateContent({ options: newOptions });
  };

  // Toggle feedback field visibility for an option
  const toggleFeedback = (optionId: string) => {
    setExpandedFeedback(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Label htmlFor="questionText" className="mb-2 block">Question Text</Label>
            <RichTextEditor
              content={localContent.text}
              onChange={handleQuestionTextChange}
              placeholder="Enter your question"
              minHeight="100px"
            />
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Options</Label>
            <div className="space-y-3">
              {localContent.options.map((option, index) => (
                <div key={option.id} className="p-3 border rounded-md space-y-3">
                  {/* Main option row */}
                  <div className="flex items-start gap-2">
                    <div className="flex items-center h-6 mt-1">
                      <input
                        type="radio"
                        checked={option.isCorrect}
                        onChange={() => handleOptionChange(index, { isCorrect: true })}
                        className="w-4 h-4 accent-primary-green dark:accent-medium-teal"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm text-gray-600 mb-1 block">Option {index + 1}</Label>
                      <RichTextEditor
                        content={option.text}
                        onChange={(text) => handleOptionChange(index, { text })}
                        placeholder="Enter option text"
                        minHeight="50px"
                        simple={true}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFeedback(option.id)}
                        title="Toggle feedback"
                      >
                        {expandedFeedback.has(option.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        disabled={localContent.options.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Collapsible feedback field */}
                  {expandedFeedback.has(option.id) && (
                    <div className="ml-6">
                      <Label className="text-sm text-gray-600 mb-1 block">Feedback (Optional)</Label>
                      <RichTextEditor
                        content={option.feedback || ''}
                        onChange={(feedback) => handleOptionChange(index, { feedback })}
                        placeholder="Feedback shown when this option is selected"
                        minHeight="50px"
                        simple={true}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Option
            </Button>
          </div>

          <div className="mb-4">
            <Label htmlFor="explanation" className="mb-2 block">Explanation (Optional)</Label>
            <RichTextEditor
              content={localContent.explanation || ''}
              onChange={handleExplanationChange}
              placeholder="Explain the correct answer"
              minHeight="100px"
              simple={true}
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="hint" className="mb-2 block">Hint (Optional)</Label>
            <RichTextEditor
              content={localContent.hint || ''}
              onChange={handleHintChange}
              placeholder="Provide a hint for students"
              minHeight="100px"
              simple={true}
            />
          </div>

          <div className="mb-4">
            <Label className="mb-2 block">Media (Optional)</Label>
            <MediaSelector
              media={localContent.media ?
                {
                  type: localContent.media.type as 'image' | 'video' | 'audio',
                  url: localContent.media.url || '',
                  alt: localContent.media.alt,
                  caption: localContent.media.caption
                } : undefined
              }
              onChange={handleMediaChange}
              allowedTypes={['image', 'video', 'audio']}
              enableJinaAI={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultipleChoiceEditor;
