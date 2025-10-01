'use client';

/**
 * Reading Editor Component for Activities V2
 * 
 * Simple reading activity creation interface
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReadingV2Content } from '../../types';
import { Save, FileText, ArrowUpRight as Link, Plus as Upload, FileText as File, Check, Loader2, Search, X, Zap, Eye, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActivityV2Viewer } from '../ActivityV2Viewer';
import { ActivityStatusManager } from '../status/ActivityStatusManager';
import { ActivityV2Status } from '../../types';
import { EnhancedRichTextEditor, EnhancedRichTextEditorRef } from '@/features/teacher-assistant-v2/components/enhanced-rich-text-editor';
import { FileUploader } from '@/components/ui/core/file-uploader';
import { AIWriterDialog } from '@/components/ui/ai-writer-dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { api } from '@/trpc/react';

interface ReadingEditorProps {
  initialContent?: ReadingV2Content;
  onSave: (content: ReadingV2Content) => void;
  onCancel: () => void;
  subjectId?: string;
  topicId?: string;
  classId?: string;
}

export const ReadingEditor: React.FC<ReadingEditorProps> = ({
  initialContent,
  onSave,
  onCancel,
  subjectId,
  topicId,
  classId
}) => {
  const [content, setContent] = useState<ReadingV2Content>(
    initialContent || getDefaultReadingContent()
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'completion' | 'achievements' | 'status'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(initialContent?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialContent?.endDate);

  // Ref for the rich text editor
  const richTextEditorRef = useRef<EnhancedRichTextEditorRef>(null);

  // Teacher Assistant API mutation
  const teacherAssistantMutation = api.teacherAssistant.getAssistantResponse.useMutation();

  // Get subject and topic information for context
  const { data: subject } = api.subject.getById.useQuery(
    { id: subjectId! },
    { enabled: !!subjectId }
  );

  const { data: topic } = api.topic.getById.useQuery(
    { id: topicId! },
    { enabled: !!topicId }
  );

  const { data: classInfo } = api.class.getById.useQuery(
    { id: classId! },
    { enabled: !!classId }
  );

  const handleSave = async () => {
    // Validate required fields
    if (!content.title.trim()) {
      toast.error('Please enter a title for the reading activity');
      return;
    }

    if (!content.content.data.trim()) {
      toast.error('Please add some content to the reading activity');
      return;
    }

    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save delay
      const contentWithDates = {
        ...content,
        startDate,
        endDate
      };
      onSave(contentWithDates);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000); // Hide success after 2 seconds
    } catch (error) {
      console.error('Error saving reading activity:', error);
      toast.error('Failed to save reading activity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (field: string, value: any) => {
    setContent({
      ...content,
      content: {
        ...content.content,
        [field]: value
      }
    });
  };

  const handleStatusChange = (status: ActivityV2Status) => {
    setContent(prev => ({
      ...prev,
      status
    }));
  };

  const calculateWordCount = (text: string): number => {
    // Strip HTML tags and calculate word count
    const plainText = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
    return plainText.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const estimateReadingTime = (wordCount: number): number => {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  };

  const handleRichTextChange = (text: string) => {
    console.log('Rich text change:', text); // Debug log
    const wordCount = calculateWordCount(text);
    const estimatedTime = estimateReadingTime(wordCount);

    handleContentChange('data', text);
    setContent(prev => ({
      ...prev,
      content: {
        ...prev.content,
        metadata: {
          ...prev.content.metadata,
          wordCount,
          estimatedReadingTime: estimatedTime
        }
      },
      estimatedTimeMinutes: estimatedTime
    }));
  };

  const handleAIContentInsert = (generatedContent: string) => {
    const currentContent = content.content.data || '';

    // If there's no existing content, just set the new content
    if (!currentContent.trim()) {
      handleRichTextChange(generatedContent);
      return;
    }

    // If there's existing content, try to insert at cursor position first
    if (richTextEditorRef.current) {
      richTextEditorRef.current.insertContentAtCursor('\n\n' + generatedContent);
    } else {
      // Fallback: append to existing content
      const newContent = currentContent + '\n\n' + generatedContent;
      handleRichTextChange(newContent);
    }
  };

  return (
    <div className="reading-editor space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Reading Activity</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          {/* Preview Button */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!content.title || !content.content}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Activity Preview - {content.title || 'Untitled Reading'}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Preview Mode:</strong> This shows exactly how students will see and interact with your reading activity.
                    All functionality is simulated including progress tracking and completion criteria.
                  </p>
                </div>
                <PreviewReadingViewer content={content} />
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={`transition-all duration-200 ${showSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : showSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Reading
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic Info' },
          { id: 'content', label: 'Content' },
          { id: 'completion', label: 'Completion' },
          { id: 'achievements', label: 'Achievements' },
          { id: 'status', label: 'Status' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Reading Title</Label>
              <Input
                id="title"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                placeholder="Enter reading title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <div className="border rounded-md">
                <EnhancedRichTextEditor
                  content={content.description || ''}
                  onChange={(value) => setContent({ ...content, description: value })}
                  placeholder="Enter reading description..."
                  minHeight="120px"
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  helperText="When students can start this activity"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  helperText="When this activity is no longer available"
                  fromDate={startDate}
                />
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => setActiveTab('content')}
                className="flex items-center gap-2"
              >
                Next: Content
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'content' && (
        <Card>
          <CardHeader>
            <CardTitle>Reading Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Content Type Selection */}
            <div>
              <Label>Content Type</Label>
              <Select
                value={content.content.type}
                onValueChange={(value: 'rich_text' | 'url' | 'file') => 
                  handleContentChange('type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rich_text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Rich Text (Inline)
                    </div>
                  </SelectItem>
                  <SelectItem value="url">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      External URL
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File Upload
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Input Based on Type */}
            {content.content.type === 'rich_text' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="richText">Content</Label>
                  <div className="flex items-center gap-2">
                    {/* AI Writer Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIWriter(true)}
                      className="gap-2 transition-all duration-200"
                    >
                      <Zap className="h-4 w-4" />
                      AI Writer
                    </Button>

                    {/* Search Toggle */}
                    <Button
                      variant={searchEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSearchEnabled(!searchEnabled)}
                      className="gap-2 transition-all duration-200"
                    >
                      {searchEnabled ? (
                        <>
                          <Search className="h-4 w-4 text-green-600" />
                          <span className="hidden sm:inline">Search On</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-gray-500" />
                          <span className="hidden sm:inline">Search Off</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>



                <div className="border rounded-md">
                  <EnhancedRichTextEditor
                    ref={richTextEditorRef}
                    content={content.content.data || ''}
                    onChange={handleRichTextChange}
                    placeholder="Enter your reading content here. Use the toolbar to format text, add images, links, tables, and embed content..."
                    minHeight="300px"
                    className="min-h-[300px]"
                    disabled={false}
                    onAIWrite={() => setShowAIWriter(true)}
                  />
                </div>
                {content.content.metadata.wordCount && (
                  <div className="mt-2 text-sm text-gray-600">
                    Word count: {content.content.metadata.wordCount} |
                    Estimated reading time: {content.content.metadata.estimatedReadingTime} minutes
                  </div>
                )}
                <div className="mt-2 text-sm text-gray-500">
                  <p>💡 <strong>Tip:</strong> You can embed videos, images, and other content using the rich text editor toolbar.</p>
                </div>
              </div>
            )}

            {content.content.type === 'url' && (
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={content.content.data}
                  onChange={(e) => handleContentChange('data', e.target.value)}
                  placeholder="https://example.com/article"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Students will be redirected to this URL to read the content.
                </p>
              </div>
            )}

            {content.content.type === 'file' && (
              <div>
                <Label>Upload Reading Material</Label>
                <FileUploader
                  onFilesAdded={(files) => {
                    if (files.length > 0) {
                      const file = files[0];
                      // For now, we'll just set the file name as the data
                      // In a real implementation, you'd upload the file and get a URL
                      handleContentChange('data', `/uploads/${file.name}`);
                    }
                  }}
                  maxFiles={1}
                  maxSize={50} // 50MB
                  acceptedFileTypes={['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']}
                  className="mt-2"
                />
                {content.content.data && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md flex items-center gap-2">
                    <File className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{content.content.data}</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  <strong>Supported formats:</strong> PDF (recommended), DOC, DOCX, TXT, MD
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Note:</strong> PDF files will be displayed in an embedded viewer for students.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setActiveTab('basic')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back: Basic Info
              </Button>
              <Button
                onClick={() => setActiveTab('completion')}
                className="flex items-center gap-2"
              >
                Next: Completion
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'completion' && (
        <Card>
          <CardHeader>
            <CardTitle>Completion Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="minTime">Minimum Reading Time (seconds)</Label>
              <Input
                id="minTime"
                type="number"
                value={content.completionCriteria.minTimeSeconds || ''}
                onChange={(e) => setContent({
                  ...content,
                  completionCriteria: {
                    ...content.completionCriteria,
                    minTimeSeconds: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                placeholder="e.g., 300 (5 minutes)"
              />
            </div>

            <div>
              <Label htmlFor="scrollPercentage">Minimum Scroll Percentage</Label>
              <Input
                id="scrollPercentage"
                type="number"
                min="0"
                max="100"
                value={content.completionCriteria.scrollPercentage || ''}
                onChange={(e) => setContent({
                  ...content,
                  completionCriteria: {
                    ...content.completionCriteria,
                    scrollPercentage: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                placeholder="e.g., 80"
              />
              <p className="text-sm text-gray-500 mt-1">
                Percentage of content that must be scrolled through
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={content.completionCriteria.interactionRequired || false}
                onCheckedChange={(checked) => setContent({
                  ...content,
                  completionCriteria: {
                    ...content.completionCriteria,
                    interactionRequired: checked
                  }
                })}
              />
              <Label>Require Interaction (bookmarks, highlights, or notes)</Label>
            </div>

            {/* Reading Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Reading Features</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.allowBookmarking}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, allowBookmarking: checked }
                  })}
                />
                <Label>Allow Bookmarking</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.allowHighlighting}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, allowHighlighting: checked }
                  })}
                />
                <Label>Allow Highlighting</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.allowNotes}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, allowNotes: checked }
                  })}
                />
                <Label>Allow Notes</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.showProgress}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, showProgress: checked }
                  })}
                />
                <Label>Show Reading Progress</Label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setActiveTab('content')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back: Content
              </Button>
              <Button
                onClick={() => setActiveTab('achievements')}
                className="flex items-center gap-2"
              >
                Next: Achievements
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'achievements' && (
        <Card>
          <CardHeader>
            <CardTitle>Achievement Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={content.achievementConfig.enabled}
                onCheckedChange={(enabled) => 
                  setContent({
                    ...content, 
                    achievementConfig: { ...content.achievementConfig, enabled }
                  })
                }
              />
              <Label>Enable Achievements</Label>
            </div>

            {content.achievementConfig.enabled && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={content.achievementConfig.pointsAnimation}
                    onCheckedChange={(pointsAnimation) => 
                      setContent({
                        ...content, 
                        achievementConfig: { ...content.achievementConfig, pointsAnimation }
                      })
                    }
                  />
                  <Label>Points Animation</Label>
                </div>

                <div>
                  <Label>Base Points</Label>
                  <Input
                    type="number"
                    value={content.achievementConfig.points.base}
                    onChange={(e) => setContent({
                      ...content, 
                      achievementConfig: { 
                        ...content.achievementConfig, 
                        points: { 
                          ...content.achievementConfig.points, 
                          base: parseInt(e.target.value) || 0 
                        }
                      }
                    })}
                  />
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setActiveTab('completion')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back: Completion
              </Button>
              <Button
                onClick={() => setActiveTab('status')}
                className="flex items-center gap-2"
              >
                Next: Status
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Management Tab */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <ActivityStatusManager
            currentStatus={content.status || ActivityV2Status.DRAFT}
            onStatusChange={handleStatusChange}
            hasStudentAttempts={false} // TODO: Check for actual student attempts
            studentCount={0} // TODO: Get actual student count
            className="max-w-2xl"
          />

          {/* Navigation Button */}
          <div className="flex justify-start pt-4 border-t max-w-2xl">
            <Button
              variant="outline"
              onClick={() => setActiveTab('achievements')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back: Achievements
            </Button>
          </div>
        </div>
      )}

      {/* AI Writer Dialog */}
      <AIWriterDialog
        open={showAIWriter}
        onOpenChange={setShowAIWriter}
        onInsert={handleAIContentInsert}
        context={{
          activityTitle: content.title,
          subjectName: subject?.name,
          topicNames: topic ? [topic.title] : undefined,
          className: classInfo?.name
        }}
      />
    </div>
  );
};

/**
 * Format AI response to proper HTML content
 */
function formatAIResponseToHTML(response: string, context: {
  title?: string;
  subjectName?: string;
  topicNames?: string[];
  learningOutcomes?: string;
}): string {
  // Clean the response first
  let cleanResponse = response.trim();

  // Remove markdown code fences if present
  cleanResponse = cleanResponse.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

  // Convert markdown-style formatting to HTML
  cleanResponse = convertMarkdownToHTML(cleanResponse);

  // Wrap in proper HTML structure
  const formattedContent = `
    <div class="reading-content">
      ${context.title ? `<h2 class="reading-title">${context.title}</h2>` : ''}
      <div class="ai-generated-content">
        ${cleanResponse}
      </div>
      ${context.subjectName ? `<div class="context-info"><strong>Subject:</strong> ${context.subjectName}</div>` : ''}
      ${context.topicNames?.length ? `<div class="context-info"><strong>Topics:</strong> ${context.topicNames.join(', ')}</div>` : ''}
      ${context.learningOutcomes ? `<div class="context-info"><strong>Learning Outcomes:</strong> ${context.learningOutcomes}</div>` : ''}
    </div>
  `;

  return formattedContent.trim();
}

/**
 * Convert basic markdown formatting to HTML
 */
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown;

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

function getDefaultReadingContent(): ReadingV2Content {
  return {
    version: '2.0',
    type: 'reading',
    title: 'New Reading Activity',
    description: '',
    estimatedTimeMinutes: 10,
    status: ActivityV2Status.DRAFT,
    startDate: undefined,
    endDate: undefined,
    content: {
      type: 'rich_text',
      data: '',
      metadata: {
        wordCount: 0,
        estimatedReadingTime: 0
      }
    },
    completionCriteria: {
      minTimeSeconds: 300, // 5 minutes
      scrollPercentage: 80,
      interactionRequired: false
    },
    features: {
      allowBookmarking: true,
      allowHighlighting: true,
      allowNotes: true,
      showProgress: true
    },
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: {
        base: 15
      },
      triggers: {
        completion: true,
        perfectScore: false,
        speedBonus: false,
        firstAttempt: true,
        improvement: false
      }
    }
  };
}

// Preview Reading Viewer Component
interface PreviewReadingViewerProps {
  content: ReadingV2Content;
}

const PreviewReadingViewer: React.FC<PreviewReadingViewerProps> = ({ content }) => {
  // Create a mock activity object for preview
  const mockActivity = {
    id: 'preview-reading-activity',
    title: content.title || 'Preview Reading',
    content: content,
    gradingConfig: {
      version: '2.0'
    }
  };

  return (
    <div className="preview-wrapper border rounded-lg p-4 bg-gray-50">
      <div className="bg-white rounded-md p-4">
        <ActivityV2Viewer
          activityId={mockActivity.id}
          studentId="preview-student"
          onComplete={(result) => {
            console.log('Preview completed:', result);
          }}
        />
      </div>
    </div>
  );
};
