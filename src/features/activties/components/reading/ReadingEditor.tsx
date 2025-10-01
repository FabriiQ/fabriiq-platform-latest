'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ReadingActivity, ReadingSection, createDefaultReadingActivity, createDefaultReadingSection } from '../../models/reading';
import { ActivityButton } from '../ui/ActivityButton';
import { RichTextEditor } from '../ui/RichTextEditor';
import { RichTextDisplay } from '../ui/RichTextDisplay';
import { MediaUploader } from '../ui/MediaUploader';
import { ThemeWrapper } from '../ui/ThemeWrapper';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, AlertCircle, HelpCircle, Clock, FileText } from 'lucide-react';
import { AIActivityGeneratorButton } from '@/features/ai-question-generator/components/AIActivityGeneratorButton';
import { BloomsTaxonomyLevel } from '@/features/bloom/types/bloom-taxonomy';

/**
 * Format AI-generated content to proper HTML
 */
function formatAIContentToHTML(content: string): string {
  if (!content) return '';

  let html = content.trim();

  // Remove markdown code fences if present
  html = html.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

  // Convert markdown-style formatting to HTML
  // Convert headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>');

  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Convert paragraphs (split by double newlines)
  const paragraphs = html.split(/\n\s*\n/);
  html = paragraphs.map(paragraph => {
    paragraph = paragraph.trim();
    if (!paragraph) return '';

    // Don't wrap if already wrapped in HTML tags
    if (paragraph.match(/^<(h[1-6]|ul|ol|li|div|blockquote)/)) {
      return paragraph;
    }

    return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
  }).filter(p => p).join('\n');

  return html;
}

export interface ReadingEditorProps {
  activity?: ReadingActivity;
  onChange?: (activity: ReadingActivity) => void;
  onSave?: (activity: ReadingActivity) => void;
  className?: string;
}

/**
 * Reading Activity Editor
 *
 * This component provides an interface for creating and editing reading activities.
 * It includes:
 * - Activity metadata editing
 * - Section management
 * - Rich text content editing
 * - Settings configuration
 * - Accessibility features
 */
export const ReadingEditor: React.FC<ReadingEditorProps> = ({
  activity,
  onChange,
  onSave,
  className
}) => {
  // Initialize with default activity if none provided
  const [localActivity, setLocalActivity] = useState<ReadingActivity>(
    activity || createDefaultReadingActivity()
  );

  // Current section being edited
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Preview mode for testing
  const [previewMode, setPreviewMode] = useState(false);

  // Animation and feedback states
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [sectionPreview, setSectionPreview] = useState(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [estimatedReadingTime, setEstimatedReadingTime] = useState<number>(0);

  // Refs for scrolling to newly added sections
  const sectionEditorRef = useRef<HTMLDivElement>(null);

  // Update local activity when prop changes
  useEffect(() => {
    if (activity) {
      setLocalActivity(activity);
    }
  }, [activity]);

  // Get current section
  const currentSection = localActivity.sections[currentSectionIndex] || localActivity.sections[0];

  // Calculate word count and reading time
  useEffect(() => {
    if (currentSection && currentSection.content) {
      // Strip HTML tags and count words
      const text = currentSection.content.replace(/<[^>]*>/g, ' ');
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const count = words.length;

      // Calculate reading time (average reading speed: 200-250 words per minute)
      const readingSpeed = 225; // words per minute
      const time = Math.ceil(count / readingSpeed);

      setWordCount(count);
      setEstimatedReadingTime(time);
    } else {
      setWordCount(0);
      setEstimatedReadingTime(0);
    }
  }, [currentSection]);

  // Update activity with changes
  const updateActivity = (updates: Partial<ReadingActivity>) => {
    const updatedActivity = {
      ...localActivity,
      ...updates,
      updatedAt: new Date()
    };
    setLocalActivity(updatedActivity);

    if (onChange) {
      onChange(updatedActivity);
    }
  };

  // Update current section
  const updateSection = (updates: Partial<ReadingSection>) => {
    const updatedSections = [...localActivity.sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      ...updates
    };

    updateActivity({ sections: updatedSections });
  };

  // Add a new section with animation and feedback
  const handleAddSection = () => {
    setIsAddingSection(true);

    const newSection = createDefaultReadingSection();
    updateActivity({
      sections: [...localActivity.sections, newSection]
    });

    setCurrentSectionIndex(localActivity.sections.length);

    // Show feedback and reset animation state
    setFeedbackMessage({
      type: 'success',
      message: 'New section added successfully!'
    });

    // Scroll to the section editor after a short delay
    setTimeout(() => {
      sectionEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsAddingSection(false);
      // Clear feedback after 3 seconds
      setTimeout(() => setFeedbackMessage(null), 3000);
    }, 500);
  };

  // Remove current section with feedback
  const handleRemoveSection = () => {
    if (localActivity.sections.length <= 1) {
      setFeedbackMessage({
        type: 'error',
        message: 'Cannot remove the last section'
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    const updatedSections = [...localActivity.sections];
    const removedSectionTitle = updatedSections[currentSectionIndex].title;
    updatedSections.splice(currentSectionIndex, 1);

    updateActivity({ sections: updatedSections });
    setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1));

    // Show feedback
    setFeedbackMessage({
      type: 'info',
      message: `Section "${removedSectionTitle}" removed`
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Update section media
  const updateSectionMedia = (updates: Partial<NonNullable<ReadingSection['media']>>) => {
    const currentMedia = currentSection.media || { type: 'text' };
    const updatedMedia = {
      ...currentMedia,
      ...updates
    };

    // Ensure type is always defined
    if (!updatedMedia.type) {
      updatedMedia.type = 'text';
    }

    updateSection({ media: updatedMedia });
  };



  // Toggle preview mode
  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  // Toggle section preview
  const toggleSectionPreview = () => {
    setSectionPreview(!sectionPreview);
  };

  // Feedback message component
  const renderFeedback = () => {
    if (!feedbackMessage) return null;

    const bgColor =
      feedbackMessage.type === 'success' ? 'bg-primary-green' :
      feedbackMessage.type === 'error' ? 'bg-red-600' :
      'bg-medium-teal';

    const Icon =
      feedbackMessage.type === 'success' ? Check :
      feedbackMessage.type === 'error' ? AlertCircle :
      HelpCircle;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${bgColor} shadow-md flex items-center`}
      >
        <Icon className="w-5 h-5 mr-2" />
        {feedbackMessage.message}
      </motion.div>
    );
  };

  // Handle AI-generated content
  const handleAIContentGenerated = (content: any) => {
    if (content.passages && Array.isArray(content.passages)) {
      const newSections: ReadingSection[] = content.passages.map((passage: any) => ({
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        title: passage.title || 'AI Generated Reading',
        content: formatAIContentToHTML(passage.content),
        media: null,
        comprehensionQuestions: passage.comprehensionQuestions ? passage.comprehensionQuestions.map((q: any, index: number) => ({
          id: `q_${Date.now()}_${index}`,
          text: q.text,
          type: q.type || 'multiple-choice',
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          points: 1
        })) : [],
        vocabulary: passage.vocabulary ? passage.vocabulary.map((v: any, index: number) => ({
          id: `vocab_${Date.now()}_${index}`,
          word: v.word,
          definition: v.definition,
          context: v.context || ''
        })) : []
      }));

      // Add the new sections to the activity
      updateActivity({
        sections: [...localActivity.sections, ...newSections]
      });

      // Update current section index to show the first new section
      if (newSections.length > 0) {
        setCurrentSectionIndex(localActivity.sections.length);
      }

      // Show feedback
      setFeedbackMessage({
        type: 'success',
        message: `Generated ${newSections.length} reading passage${newSections.length > 1 ? 's' : ''} with AI`
      });
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <ThemeWrapper className={cn("w-full", className)}>
      {/* Feedback message */}
      <AnimatePresence>
        {feedbackMessage && renderFeedback()}
      </AnimatePresence>

      <div className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-primary-green" />
          Activity Details
        </h2>

        {/* Activity title */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            value={localActivity.title}
            onChange={(e) => updateActivity({ title: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Activity description */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            value={localActivity.description || ''}
            onChange={(e) => updateActivity({ description: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
        </div>

        {/* Activity instructions */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Instructions</label>
          <textarea
            value={localActivity.instructions || ''}
            onChange={(e) => updateActivity({ instructions: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
        </div>

        {/* Activity settings */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showTableOfContents"
                checked={localActivity.settings?.showTableOfContents !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    showTableOfContents: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="showTableOfContents" className="text-gray-700 dark:text-gray-300">
                Show Table of Contents
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableTextToSpeech"
                checked={localActivity.settings?.enableTextToSpeech !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    enableTextToSpeech: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="enableTextToSpeech" className="text-gray-700 dark:text-gray-300">
                Enable Text-to-Speech
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableHighlighting"
                checked={localActivity.settings?.enableHighlighting !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    enableHighlighting: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="enableHighlighting" className="text-gray-700 dark:text-gray-300">
                Enable Highlighting
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableNotes"
                checked={localActivity.settings?.enableNotes !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    enableNotes: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="enableNotes" className="text-gray-700 dark:text-gray-300">
                Enable Notes
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showProgressBar"
                checked={localActivity.settings?.showProgressBar !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    showProgressBar: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="showProgressBar" className="text-gray-700 dark:text-gray-300">
                Show Progress Bar
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="fontSizeAdjustable"
                checked={localActivity.settings?.fontSizeAdjustable !== false}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    fontSizeAdjustable: e.target.checked
                  }
                })}
                className="mr-2 accent-primary-green dark:accent-medium-teal"
              />
              <label htmlFor="fontSizeAdjustable" className="text-gray-700 dark:text-gray-300">
                Allow Font Size Adjustment
              </label>
            </div>

            <div>
              <label className="block mb-1 text-gray-700 dark:text-gray-300">
                Reading Time Estimate (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={localActivity.settings?.readingTimeEstimate || 5}
                onChange={(e) => updateActivity({
                  settings: {
                    ...localActivity.settings,
                    readingTimeEstimate: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div className="mb-4 p-3 bg-light-mint/30 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              value={currentSectionIndex}
              onChange={(e) => setCurrentSectionIndex(parseInt(e.target.value))}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[200px]"
              aria-label="Select section"
            >
              {localActivity.sections.map((section, index) => (
                <option key={section.id} value={index}>
                  Section {index + 1}: {section.title}
                </option>
              ))}
            </select>

            <ActivityButton
              onClick={handleRemoveSection}
              disabled={localActivity.sections.length <= 1}
              variant="danger"
              icon="trash"
              className="min-w-[140px]"
              ariaLabel="Remove current section"
            >
              Remove
            </ActivityButton>
          </div>

          <div className="flex flex-row items-center gap-2 flex-wrap justify-end">
            <ActivityButton
              onClick={toggleSectionPreview}
              variant="secondary"
              icon={sectionPreview ? "edit" : "file-text"}
              ariaLabel={sectionPreview ? "Edit section" : "Preview section"}
            >
              {sectionPreview ? "Edit Section" : "Section Preview"}
            </ActivityButton>

            <ActivityButton
              onClick={togglePreview}
              variant="secondary"
              icon={previewMode ? "edit" : "eye"}
              ariaLabel={previewMode ? "Switch to edit mode" : "Switch to preview mode"}
            >
              {previewMode ? "Edit" : "Preview"}
            </ActivityButton>

            <div className="flex gap-2">
              <ActivityButton
                onClick={handleAddSection}
                variant="secondary"
                icon="plus"
                ariaLabel="Add new section"
              >
                Add Section
              </ActivityButton>
            </div>
          </div>
        </div>

        {/* AI Reading Passage Generator */}
        <div className="mb-6">
          <AIActivityGeneratorButton
            activityType="reading"
            activityTitle={localActivity.title}
            selectedTopics={[localActivity.title]}
            selectedLearningOutcomes={[localActivity.description || 'Read and comprehend text passages']}
            selectedBloomsLevel={BloomsTaxonomyLevel.UNDERSTAND}
            selectedActionVerbs={['read', 'comprehend', 'analyze', 'interpret']}
            onContentGenerated={handleAIContentGenerated}
            onError={(error) => {
              console.error('AI Content Generation Error:', error);
            }}
          />
        </div>
      </div>

      {/* Section editor */}
      <motion.div
        ref={sectionEditorRef}
        className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
        initial={{ opacity: 0.8, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isAddingSection ? [1, 1.02, 1] : 1,
          transition: {
            duration: 0.3,
            scale: { duration: 0.5 }
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-green" />
            Section {currentSectionIndex + 1}
          </h3>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center mr-3">
              <FileText className="w-4 h-4 mr-1" />
              {wordCount} words
            </span>
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              ~{estimatedReadingTime} min read
            </span>
          </div>
        </div>

        {/* Section title */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Section Title</label>
          <input
            type="text"
            value={currentSection.title}
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Section content (rich text editor or preview) */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="font-medium text-gray-700 dark:text-gray-300">Content</label>
            <button
              onClick={toggleSectionPreview}
              className="text-sm text-primary-green hover:text-medium-teal flex items-center"
              aria-label={sectionPreview ? "Edit content" : "Preview content"}
            >
              {sectionPreview ? (
                <>
                  <span className="mr-1">Edit</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </>
              ) : (
                <>
                  <span className="mr-1">Preview</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sectionPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[300px] border border-gray-300 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-700 overflow-auto"
              >
                <RichTextDisplay
                  content={currentSection.content}
                  className="prose-sm sm:prose dark:prose-invert max-w-none"
                />
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RichTextEditor
                  content={currentSection.content}
                  onChange={(value) => updateSection({ content: value })}
                  className="min-h-[300px] border border-gray-300 dark:border-gray-600 rounded"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Media */}
        <div className="mb-4">
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Media (Optional)</label>

          <div className="mb-3">
            <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Media Type</label>
            <select
              value={currentSection.media?.type || 'none'}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'none') {
                  // Remove media
                  updateSection({ media: undefined });
                } else {
                  // Add or update media
                  updateSectionMedia({
                    type: type as 'image' | 'text',
                    url: type === 'image' ? '' : undefined,
                    content: type === 'text' ? '' : undefined
                  });
                }
              }}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="none">None</option>
              <option value="image">Image</option>
              <option value="text">Text</option>
            </select>
          </div>

          {currentSection.media?.type === 'image' && (
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Image URL</label>
              <input
                type="text"
                value={currentSection.media.url || ''}
                onChange={(e) => updateSectionMedia({ url: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />

              <label className="block mb-1 mt-2 text-sm text-gray-700 dark:text-gray-300">Alt Text</label>
              <input
                type="text"
                value={currentSection.media.alt || ''}
                onChange={(e) => updateSectionMedia({ alt: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Description of the image"
              />
            </div>
          )}

          {currentSection.media?.type === 'text' && (
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Additional Text</label>
              <textarea
                value={currentSection.media.content || ''}
                onChange={(e) => updateSectionMedia({ content: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
                placeholder="Additional text content"
              />
            </div>
          )}

          {currentSection.media && (
            <div className="mb-3">
              <label className="block mb-1 text-sm text-gray-700 dark:text-gray-300">Caption (Optional)</label>
              <input
                type="text"
                value={currentSection.media.caption || ''}
                onChange={(e) => updateSectionMedia({ caption: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Caption for the media"
              />
            </div>
          )}
        </div>
      </motion.div>


    </ThemeWrapper>
  );
};

export default ReadingEditor;
