'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Eye, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { CompactModeSelector, type TeacherMode } from '@/features/teacher-assistant-v2/components/compact-mode-selector';

interface AIWriterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (content: string) => void;
  context?: {
    subjectName?: string;
    topicNames?: string[];
    className?: string;
    activityTitle?: string;
  };
}

// Remove the old WRITING_MODES - we'll use TeacherMode from CompactModeSelector instead

export function AIWriterDialog({ open, onOpenChange, onInsert, context }: AIWriterDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<TeacherMode | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [conversationResponse, setConversationResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Teacher Assistant API mutation
  const teacherAssistantMutation = api.teacherAssistantV2.generateResponse.useMutation();

  // Function to get educational image URL based on search query
  const getEducationalImageUrl = (searchQuery: string): string => {
    // Create a more relevant educational image URL
    const cleanQuery = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '+');

    // Use more reliable educational image sources
    const educationalSources = [
      // Use more reliable sources that are less likely to break
      `https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=500&h=400&fit=crop&crop=center&auto=format&q=60`, // Education/learning
      `https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=400&fit=crop&crop=center&auto=format&q=60`, // Books/library
      `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&h=400&fit=crop&crop=center&auto=format&q=60`, // Classroom
      `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=400&fit=crop&crop=center&auto=format&q=60`, // Study/learning
      `https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=400&fit=crop&crop=center&auto=format&q=60`  // Academic/science
    ];

    // Select a source based on the query hash for consistency
    const sourceIndex = Math.abs(searchQuery.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % educationalSources.length;
    return educationalSources[sourceIndex];
  };

  // Function to process image URLs and convert them to proper img tags
  const processImageUrls = (content: string): string => {
    let processedContent = content;

    // First, handle search: syntax images
    const searchImagePattern = /!\[([^\]]*)\]\(search:([^)]+)\)/gi;
    processedContent = processedContent.replace(searchImagePattern, (match, altText, searchQuery) => {
      // Get an educational image URL based on the search query
      const imageUrl = getEducationalImageUrl(searchQuery);
      const alt = altText || `Educational image about ${searchQuery}`;

      // Create a proper HTML img tag with responsive styling and better error handling
      return `<div class="my-4 text-center">
        <img src="${imageUrl}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-sm mx-auto" style="max-height: 400px;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
             onload="this.nextElementSibling.style.display='none';" />
        <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center" style="display: none;">
          <div class="text-gray-500 mb-2">📷</div>
          <p class="text-sm text-gray-600">${alt}</p>
          <p class="text-xs text-gray-500 mt-1">Image placeholder - content will display properly when saved</p>
        </div>
        <p class="text-sm text-gray-600 mt-2 italic">${alt}</p>
      </div>`;
    });

    // Then, handle regular image URLs (both standalone and in markdown format)
    const imageUrlPattern = /(?:!\[([^\]]*)\]\(([^)]+)\)|(?:^|\s)(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?))(?=\s|$)/gi;
    processedContent = processedContent.replace(imageUrlPattern, (match, altText, markdownUrl, standaloneUrl) => {
      const imageUrl = markdownUrl || standaloneUrl;

      // Skip if this is a search: URL (already processed above)
      if (imageUrl && imageUrl.startsWith('search:')) {
        return match;
      }

      const alt = altText || 'Educational image';

      // Create a proper HTML img tag with responsive styling and better error handling
      return `<div class="my-4 text-center">
        <img src="${imageUrl}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-sm mx-auto" style="max-height: 400px;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
             onload="this.nextElementSibling.style.display='none';" />
        <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center" style="display: none;">
          <div class="text-gray-500 mb-2">📷</div>
          <p class="text-sm text-gray-600">${alt}</p>
          <p class="text-xs text-gray-500 mt-1">Image placeholder - content will display properly when saved</p>
        </div>
        ${altText ? `<p class="text-sm text-gray-600 mt-2 italic">${altText}</p>` : ''}
      </div>`;
    });

    return processedContent;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedMode) return;

    setIsGenerating(true);
    try {
      // Build context information
      const contextInfo = context ? `
Subject: ${context.subjectName || 'Not specified'}
Topics: ${context.topicNames?.join(', ') || 'Not specified'}
Class: ${context.className || 'Not specified'}
Activity: ${context.activityTitle || 'Not specified'}` : '';

      // Use the selected teacher mode's prompt and information
      const enhancedPrompt = `${selectedMode.prompt}

User Request: ${prompt}

Writing Style: ${selectedMode.label}
Style Description: ${selectedMode.description}

Context Information:${contextInfo}

Requirements:
- Create substantial, educational content (300-800 words)
- Use age-appropriate language for K-12 students
- Include engaging introductions and clear explanations
- Structure content with proper headings and paragraphs
- Make content interactive and thought-provoking
- Align with the educational context provided
- Format the response as clean HTML that can be directly inserted into a rich text editor
- Use semantic HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- Do not include wrapper divs or classes - just the content itself

Please generate well-structured, educational reading content in HTML format.`;

      // Call Teacher Assistant API
      const response = await teacherAssistantMutation.mutateAsync({
        message: enhancedPrompt,
        teacherContext: {
          teacher: {
            id: 'current-teacher',
            name: 'Teacher',
            subjects: context?.subjectName ? [context.subjectName] : []
          },
          currentClass: context?.className ? {
            id: 'current-class',
            name: context.className,
            subject: context?.subjectName ? {
              id: 'current-subject',
              name: context.subjectName
            } : undefined
          } : undefined,
          currentPage: 'Reading Activity Editor'
        },
        searchEnabled: false,
        context: {
          class: context?.className || '',
          subject: context?.subjectName || '',
          topic: context?.topicNames?.join(', ') || '',
          learningOutcomes: 'Reading comprehension and content understanding',
          assessmentCriteria: 'Understanding of key concepts and ability to engage with content',
          gradeLevel: 'K-12'
        }
      });

      // Separate conversation from actual content
      let actualContent = '';
      let conversation = response.content;

      // If the response contains artifact content, use that as the actual content
      if (response.artifactContent) {
        actualContent = response.artifactContent;
      } else {
        // Try to extract content from markdown code blocks
        if (response.content.includes('```html')) {
          const htmlMatch = response.content.match(/```html\n([\s\S]*?)\n```/);
          if (htmlMatch) {
            actualContent = htmlMatch[1];
            // Remove the code block from conversation
            conversation = response.content.replace(/```html\n[\s\S]*?\n```/, '[Content generated - see preview below]');
          }
        } else if (response.content.includes('```')) {
          const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)\n```/);
          if (codeMatch) {
            actualContent = codeMatch[1];
            // Remove the code block from conversation
            conversation = response.content.replace(/```[\w]*\n[\s\S]*?\n```/, '[Content generated - see preview below]');
          }
        }

        // If no code blocks found, try to separate based on common patterns
        if (!actualContent) {
          // Look for HTML content that starts with tags
          const htmlContentMatch = response.content.match(/<[^>]+>[\s\S]*<\/[^>]+>/);
          if (htmlContentMatch) {
            actualContent = htmlContentMatch[0];
            conversation = response.content.replace(htmlContentMatch[0], '[Content generated - see preview below]');
          } else {
            // If no clear separation, use the full response as content
            actualContent = response.content;
            conversation = 'Content has been generated successfully. Please review it in the preview below.';
          }
        }
      }

      // Process image URLs in the content
      const processedContent = processImageUrls(actualContent);

      setGeneratedContent(processedContent);
      setConversationResponse(conversation);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating content:', error);
      // Fallback to mock content if API fails
      // Use selectedMode directly since it's now a TeacherMode object
      const fallbackContent = `<h2>Understanding ${prompt}</h2>
        <p>I apologize, but I'm currently unable to generate content using the AI service. This is a placeholder response.</p>
        <p><strong>Writing Mode:</strong> ${selectedMode?.label || 'Unknown'}</p>
        <p><strong>Context:</strong> ${context?.subjectName || 'General'} - ${context?.topicNames?.join(', ') || 'Various topics'}</p>
        <p>Please try again later or contact support if the issue persists.</p>
        <h3>Key Points</h3>
        <ul>
          <li>Educational content tailored to your needs</li>
          <li>Structured for easy reading and comprehension</li>
          <li>Aligned with your subject and topic context</li>
        </ul>`;
      setGeneratedContent(fallbackContent);
      setShowPreview(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (generatedContent) {
      onInsert(generatedContent);
      handleClose();
    }
  };

  const handleClose = () => {
    setPrompt('');
    setSelectedMode('');
    setGeneratedContent('');
    setConversationResponse('');
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            AI Writing Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Context Display */}
          {context && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Context</h4>
              <div className="flex flex-wrap gap-2">
                {context.subjectName && (
                  <Badge variant="secondary">{context.subjectName}</Badge>
                )}
                {context.topicNames?.map((topic, index) => (
                  <Badge key={index} variant="outline">{topic}</Badge>
                ))}
                {context.className && (
                  <Badge variant="secondary">Class: {context.className}</Badge>
                )}
              </div>
            </div>
          )}

          {!showPreview ? (
            <>
              {/* Teacher Assistant Mode Selection */}
              <div className="space-y-2">
                <Label>Content Generation Mode</Label>
                <CompactModeSelector
                  onModeChange={setSelectedMode}
                  selectedMode={selectedMode}
                  className="w-full"
                />
                {selectedMode && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                    <strong>{selectedMode.label}:</strong> {selectedMode.description}
                  </div>
                )}
              </div>

              {/* Prompt Input */}
              <div className="space-y-2">
                <Label htmlFor="prompt">What would you like me to write about?</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe what you want the AI to write. For example: 'Explain photosynthesis in simple terms' or 'Write a story about the water cycle'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Generate Button */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !selectedMode || isGenerating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* AI Response */}
              {conversationResponse && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Response
                  </h4>
                  <div className="border rounded-lg p-4 bg-blue-50 text-sm">
                    <div className="prose prose-sm max-w-none">
                      {conversationResponse.split('\n').map((line, index) => (
                        <p key={index} className="mb-2 last:mb-0">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Generated Content Preview
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(false)}
                  >
                    Edit Request
                  </Button>
                </div>

                <div className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto shadow-sm">
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700
                      [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:shadow-sm [&_iframe]:min-h-[300px]
                      [&_div[data-iframe-wrapper]]:w-full [&_div[data-iframe-wrapper]]:rounded-lg [&_div[data-iframe-wrapper]]:overflow-hidden [&_div[data-iframe-wrapper]]:shadow-sm [&_div[data-iframe-wrapper]]:border [&_div[data-iframe-wrapper]]:border-gray-200
                      [&_div[data-iframe-wrapper]_iframe]:w-full [&_div[data-iframe-wrapper]_iframe]:h-full [&_div[data-iframe-wrapper]_iframe]:border-0
                      [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                </div>

                {/* Content Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                  <span>
                    Words: {generatedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length}
                  </span>
                  <span>
                    Est. reading time: {Math.ceil(generatedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length / 200)} min
                  </span>
                  <span>
                    Writing mode: {selectedMode?.label || 'Unknown'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    variant="outline"
                    disabled={isGenerating}
                    className="w-full sm:w-auto"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleInsert}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Insert Content
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
