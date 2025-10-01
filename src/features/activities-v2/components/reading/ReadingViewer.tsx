'use client';

/**
 * Reading Viewer Component for Activities V2
 *
 * Student reading experience with progress tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ReadingV2Content, ReadingProgress } from '../../types';
import { useTimeTracking } from '@/components/providers/TimeTrackingProvider';
import { api } from '@/trpc/react';
import { NotesDialog } from '@/components/ui/notes-dialog';
import { getEnhancedContent } from '@/lib/content-sanitizer';
import { EnhancedContentRenderer } from '@/components/ui/enhanced-content-renderer';
import { Clock, BookOpen, BookOpen as BookmarkIcon, Edit as Pen, FileText as StickyNote, CheckCircle, Download, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ReadingViewerProps {
  activityId: string;
  content: ReadingV2Content;
  onComplete: (result: any) => void;
}

export const ReadingViewer: React.FC<ReadingViewerProps> = ({
  activityId,
  content,
  onComplete
}) => {
  const [progress, setProgress] = useState<ReadingProgress>({
    scrollPercentage: 0,
    timeSpent: 0,
    bookmarks: [],
    highlights: [],
    notes: []
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [externalOpened, setExternalOpened] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();

  // Submit reading mutation
  const submitReadingMutation = api.activityV2.submit.useMutation({
    onSuccess: (result) => {
      stopTracking(activityId);
      setIsCompleted(true);
      onComplete(result.result);
      toast.success('Reading completed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to complete reading: ' + error.message);
      setIsSubmitting(false);
    }
  });

  // Initialize tracking
  useEffect(() => {
    console.log('Starting time tracking for activity:', activityId);
    startTracking(activityId);
    return () => {
      console.log('Stopping time tracking for activity:', activityId);
      stopTracking(activityId);
    };
  }, [activityId]); // Only depend on activityId, not tracking functions

  // Tick every second so time-based criteria and UI update even without scrolling
  useEffect(() => {
    const id = setInterval(() => setElapsedTick(getElapsedTime(activityId)), 1000);
    return () => clearInterval(id);
  }, [activityId, getElapsedTime]);

  // Scroll tracking - now tracks page scroll instead of container scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      // Get the reading content element position and dimensions
      const element = contentRef.current;
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const elementHeight = element.scrollHeight;

      // Calculate how much of the content has been scrolled past
      const windowScrollTop = window.scrollY;
      const windowHeight = window.innerHeight;

      // Calculate scroll percentage based on how much content is visible/passed
      let scrollPercentage = 0;
      if (windowScrollTop > elementTop) {
        const scrolledPastTop = windowScrollTop - elementTop;
        const maxScrollDistance = elementHeight - windowHeight;
        scrollPercentage = maxScrollDistance > 0 ? Math.min((scrolledPastTop / maxScrollDistance) * 100, 100) : 100;
      }

      const currentTimeSpent = getElapsedTime(activityId);
      console.log('Current time spent:', currentTimeSpent, 'seconds', 'Scroll:', scrollPercentage + '%');

      setProgress(prev => ({
        ...prev,
        scrollPercentage: Math.max(prev.scrollPercentage, scrollPercentage),
        timeSpent: currentTimeSpent
      }));

      checkCompletionCriteria(scrollPercentage);
    };

    // Listen to window scroll instead of element scroll
    window.addEventListener('scroll', handleScroll);
    // Also trigger on resize to recalculate positions
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [activityId]); // Only depend on activityId, not getElapsedTime

  const handleAutoComplete = useCallback(async () => {
    if (isSubmitting || isCompleted) return;

    setIsSubmitting(true);
    const timeSpent = getElapsedTime(activityId);

    await submitReadingMutation.mutateAsync({
      activityId,
      progress: {
        ...progress,
        timeSpent
      },
      timeSpent,
      assessmentMode: 'standard'
    });
  }, [isSubmitting, isCompleted, activityId, progress, getElapsedTime, submitReadingMutation]);

  const checkCompletionCriteria = useCallback((scrollPercentage: number) => {
    if (isCompleted) return;

    const criteria = content.completionCriteria;
    const timeSpent = getElapsedTime(activityId);

    let completed = true;

    if (criteria.minTimeSeconds && timeSpent < criteria.minTimeSeconds) {
      completed = false;
    }

    if (criteria.scrollPercentage) {
      if (content.content.type === 'rich_text') {
        if (scrollPercentage < criteria.scrollPercentage) {
          completed = false;
        }
      } else if (content.content.type === 'url') {
        // For external links, treat "opened" as the scroll requirement
        if (!externalOpened) {
          completed = false;
        }
      } else {
        // For files (e.g., PDFs in iframes), we cannot reliably track scroll; don't block
      }
    }

    if (criteria.interactionRequired &&
        progress.bookmarks.length === 0 &&
        progress.highlights.length === 0 &&
        progress.notes.length === 0) {
      completed = false;
    }

    if (completed) {
      handleAutoComplete();
    }
  }, [isCompleted, content.completionCriteria, activityId, progress.bookmarks.length, progress.highlights.length, progress.notes.length, getElapsedTime, handleAutoComplete, content.content.type, externalOpened]);

  const canComplete = useCallback((): boolean => {
    const criteria = content.completionCriteria;
    const timeSpent = getElapsedTime(activityId);

    if (criteria.minTimeSeconds && timeSpent < criteria.minTimeSeconds) {
      return false;
    }

    if (criteria.scrollPercentage) {
      if (content.content.type === 'rich_text') {
        if (progress.scrollPercentage < criteria.scrollPercentage) {
          return false;
        }
      } else if (content.content.type === 'url') {
        if (!externalOpened) {
          return false;
        }
      } else {
        // files (e.g., PDFs) - ignore scroll requirement
      }
    }

    if (criteria.interactionRequired &&
        progress.bookmarks.length === 0 &&
        progress.highlights.length === 0 &&
        progress.notes.length === 0) {
      return false;
    }

    return true;
  }, [content.completionCriteria, activityId, progress.scrollPercentage, progress.bookmarks.length, progress.highlights.length, progress.notes.length, getElapsedTime, content.content.type, externalOpened]);

  const handleManualComplete = useCallback(() => {
    if (!canComplete()) {
      toast.error('Please meet the completion criteria before finishing.');
      return;
    }
    handleAutoComplete();
  }, [canComplete, handleAutoComplete]);

  const addBookmark = () => {
    const bookmark = {
      id: Date.now().toString(),
      position: progress.scrollPercentage,
      title: `Bookmark ${progress.bookmarks.length + 1}`,
      createdAt: new Date()
    };

    setProgress(prev => ({
      ...prev,
      bookmarks: [...prev.bookmarks, bookmark]
    }));

    toast.success('Bookmark added!');
  };

  const addNote = (note: { title: string; content: string; position: number }) => {
    const newNote = {
      id: Date.now().toString(),
      content: note.content,
      position: note.position,
      createdAt: new Date()
    };

    setProgress(prev => ({
      ...prev,
      notes: [...prev.notes, newNote]
    }));

    toast.success('Note added!');
  };

  const updateNote = (id: string, updates: Partial<any>) => {
    setProgress(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === id ? { ...note, ...updates } : note
      )
    }));
  };

  const deleteNote = (id: string) => {
    setProgress(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== id)
    }));
    toast.success('Note deleted!');
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getFileUrl = (url: string): string => {
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it's a Supabase storage path, construct the full URL
    if (url.startsWith('misc-content/') || url.startsWith('documents/')) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return `${supabaseUrl}/storage/v1/object/public/${url}`;
    }

    return url;
  };

  const getCompletionStatus = (): Array<{label: string, met: boolean, current: string}> => {
    const criteria = content.completionCriteria;
    const timeSpent = getElapsedTime(activityId);
    const status: Array<{label: string, met: boolean, current: string}> = [];

    if (criteria.minTimeSeconds) {
      const met = timeSpent >= criteria.minTimeSeconds;
      status.push({
        label: `Minimum time: ${formatTime(criteria.minTimeSeconds)}`,
        met,
        current: formatTime(timeSpent)
      });
    }

    if (criteria.scrollPercentage) {
      if (content.content.type === 'rich_text') {
        const met = progress.scrollPercentage >= criteria.scrollPercentage;
        status.push({
          label: `Scroll progress: ${criteria.scrollPercentage}%`,
          met,
          current: `${Math.round(progress.scrollPercentage)}%`
        });
      } else if (content.content.type === 'url') {
        status.push({
          label: 'Opened external link',
          met: externalOpened,
          current: externalOpened ? 'Opened' : 'Not opened'
        });
      } else {
        status.push({
          label: 'Scroll progress (not tracked for files)',
          met: true,
          current: 'N/A'
        });
      }
    }

    if (criteria.interactionRequired) {
      const interactionCount = progress.bookmarks.length + progress.highlights.length + progress.notes.length;
      const met = interactionCount > 0;
      status.push({
        label: 'Interaction required',
        met,
        current: `${interactionCount} interaction${interactionCount !== 1 ? 's' : ''}`
      });
    }

    return status;
  };

  return (
    <div className="reading-viewer max-w-4xl mx-auto space-y-6">
      {/* Reading Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {content.title}
              </CardTitle>
              {content.description && (
                <EnhancedContentRenderer
                  content={content.description}
                  className="text-gray-600 mt-1 prose prose-sm max-w-none"
                  allowImageFallback={true}
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(getElapsedTime(activityId))}</span>
              </div>
              {content.estimatedTimeMinutes && (
                <Badge variant="outline">
                  Est. {content.estimatedTimeMinutes} min
                </Badge>
              )}
            </div>
          </div>

          {content.features.showProgress && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Reading Progress</span>
                <span>{Math.round(progress.scrollPercentage)}%</span>
              </div>
              <Progress value={progress.scrollPercentage} className="h-2" />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Reading Tools */}
      {(content.features.allowBookmarking || content.features.allowNotes) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {content.features.allowBookmarking && (
                <Button variant="outline" size="sm" onClick={addBookmark}>
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Add Bookmark ({progress.bookmarks.length})
                </Button>
              )}
              {content.features.allowNotes && (
                <Button variant="outline" size="sm" onClick={() => setIsNotesDialogOpen(true)}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Notes ({progress.notes.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reading Content */}
      <Card>
        <CardContent className="p-6">
          <div
            ref={contentRef}
            className="reading-content-container max-h-[70vh] overflow-y-auto"
            style={{ scrollBehavior: 'smooth' }}
            onScroll={(e) => {
              const element = e.currentTarget;
              const scrollTop = element.scrollTop;
              const scrollHeight = element.scrollHeight;
              const clientHeight = element.clientHeight;

              // Calculate scroll percentage for container scroll
              const scrollPercentage = scrollHeight > clientHeight
                ? Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100)
                : 100;

              const currentTimeSpent = getElapsedTime(activityId);

              setProgress(prev => ({
                ...prev,
                scrollPercentage: Math.max(prev.scrollPercentage, scrollPercentage),
                timeSpent: currentTimeSpent
              }));

              checkCompletionCriteria(scrollPercentage);
            }}
          >
            {content.content.type === 'rich_text' && (
              <EnhancedContentRenderer
                content={content.content.data}
                className="reading-content"
                allowImageFallback={true}
              />
            )}

            {content.content.type === 'url' && (
              <div className="text-center py-8">
                <p className="mb-4">This reading material is hosted externally.</p>
                <Button asChild>
                  <a href={content.content.data} target="_blank" rel="noopener noreferrer" onClick={() => setExternalOpened(true)}>
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    Open Reading Material
                  </a>
                </Button>
              </div>
            )}

            {content.content.type === 'file' && (
              <div>
                {/* Check if it's a PDF file */}
                {content.content.data.toLowerCase().endsWith('.pdf') || content.content.data.includes('application/pdf') ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-gray-600" />
                        <span className="font-medium">PDF Document</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={getFileUrl(content.content.data)} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>

                    {/* PDF Viewer with error handling */}
                    <div className="border rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                      <iframe
                        src={`${getFileUrl(content.content.data)}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                        className="w-full h-full border-0"
                        title="PDF Reading Material"
                        onLoad={() => {
                          console.log('PDF loaded successfully:', getFileUrl(content.content.data));
                        }}
                        onError={(e) => {
                          console.error('Failed to load PDF:', e, 'URL:', getFileUrl(content.content.data));
                          toast.error('Failed to load PDF. Please try downloading the file.');
                        }}
                      />
                      {/* Fallback message */}
                      <div className="hidden pdf-fallback p-4 text-center">
                        <p className="text-gray-600 mb-4">
                          Unable to display PDF in browser. Please download the file to view it.
                        </p>
                        <Button asChild>
                          <a href={getFileUrl(content.content.data)} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Other file types - show download option */
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center gap-4">
                      <StickyNote className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="font-medium mb-2">Reading Material File</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Download the file to view the reading material.
                        </p>
                      </div>
                      <Button asChild>
                        <a href={getFileUrl(content.content.data)} download target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download File
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className={`h-5 w-5 ${canComplete() ? 'text-green-600' : 'text-gray-400'}`} />
            Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getCompletionStatus().map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className={item.met ? 'text-green-600' : 'text-gray-600'}>
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{item.current}</span>
                  {item.met ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={handleManualComplete}
              disabled={!canComplete() || isSubmitting || isCompleted}
              className="w-full"
            >
              {isSubmitting ? 'Completing...' : isCompleted ? 'Completed' : 'Complete Reading'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookmarks and Notes */}
      {(progress.bookmarks.length > 0 || progress.notes.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Bookmarks & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progress.bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
                  <BookmarkIcon className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">{bookmark.title}</div>
                    <div className="text-sm text-gray-500">
                      At {Math.round(bookmark.position)}% • {bookmark.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {progress.notes.map((note) => (
                <div key={note.id} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-md">
                  <StickyNote className="h-4 w-4 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">{note.content}</div>
                    <div className="text-sm text-gray-500">
                      At {Math.round(note.position)}% • {note.createdAt.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Dialog */}
      <NotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        notes={progress.notes.map(note => ({
          ...note,
          title: `Note ${progress.notes.indexOf(note) + 1}` // Add title for compatibility
        }))}
        onAddNote={addNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
        currentPosition={progress.scrollPercentage}
      />
    </div>
  );
};
