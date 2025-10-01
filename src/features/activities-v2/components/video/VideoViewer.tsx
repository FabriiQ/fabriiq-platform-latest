'use client';

/**
 * Video Viewer Component for Activities V2
 *
 * Student video watching experience with progress tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { VideoV2Content, VideoWatchProgress } from '../../types';
import { useTimeTracking } from '@/components/providers/TimeTrackingProvider';
import { api } from '@/trpc/react';
import { Play, Pause, Volume2, Settings, CheckCircle, Clock, Square } from 'lucide-react';
import { toast } from 'sonner';

interface VideoViewerProps {
  activityId: string;
  content: VideoV2Content;
  onComplete: (result: any) => void;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  activityId,
  content,
  onComplete
}) => {
  const [watchProgress, setWatchProgress] = useState<VideoWatchProgress>({
    currentTime: 0,
    watchedPercentage: 0,
    watchedSegments: [],
    interactionResponses: []
  });
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [tick, setTick] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();

  // Submit video mutation
  const submitVideoMutation = api.activityV2.submit.useMutation({
    onSuccess: (result) => {
      stopTracking(activityId);
      setIsCompleted(true);
      onComplete(result.result);
      toast.success('Video completed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to complete video: ' + error.message);
      setIsSubmitting(false);
    }
  });

  // Infer provider from URL when not explicitly set to avoid broken embeds
  const provider = React.useMemo(() => {
    const p = (content.video as any)?.provider as string | undefined;
    const url = (content.video as any)?.url || '';
    if (p && typeof p === 'string') return p;
    if (/youtu(\.be|be\.com)/i.test(url)) return 'youtube';
    if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(url)) return 'file';
    return 'file';
  }, [content.video.provider, content.video.url]);

  // Initialize tracking
  useEffect(() => {
    console.log('Starting time tracking for video activity:', activityId);
    startTracking(activityId);
    return () => {
      console.log('Stopping time tracking for video activity:', activityId);
      stopTracking(activityId);
    };
  }, [activityId]); // Only depend on activityId, not tracking functions

  // For YouTube videos, tick every second to refresh time-based completion state
  useEffect(() => {
    if (provider !== 'youtube') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [provider]);

  // Helpers first to avoid TDZ issues with useCallback dependency arrays
  const updateWatchedSegments = useCallback((segments: any[], currentTime: number) => {
    // Simple segment tracking - can be enhanced
    const segmentSize = 10; // 10-second segments
    const segmentIndex = Math.floor(currentTime / segmentSize);

    const updatedSegments = [...segments];
    if (!updatedSegments.find(s => s.start === segmentIndex * segmentSize)) {
      updatedSegments.push({
        start: segmentIndex * segmentSize,
        end: (segmentIndex + 1) * segmentSize,
        watched: true
      });
    }

    return updatedSegments;
  }, []);

  const handleAutoComplete = useCallback(async () => {
    if (isSubmitting || isCompleted) return;

    setIsSubmitting(true);
    const timeSpent = getElapsedTime(activityId);

    await submitVideoMutation.mutateAsync({
      activityId,
      progress: {
        ...watchProgress,
        currentTime: videoRef.current?.currentTime || watchProgress.currentTime
      },
      timeSpent
    });
  }, [isSubmitting, isCompleted, activityId, watchProgress, getElapsedTime, submitVideoMutation]);

  const checkCompletionCriteria = useCallback((watchedPercentage: number, currentTime: number) => {
    if (isCompleted) return;

    const criteria = content.completionCriteria;
    let completed = true;

    if (watchedPercentage < criteria.minWatchPercentage) {
      completed = false;
    }

    if (criteria.minWatchTimeSeconds && currentTime < criteria.minWatchTimeSeconds) {
      completed = false;
    }

    // Check interaction points if any
    if (criteria.interactionPoints) {
      const requiredInteractions = criteria.interactionPoints.filter(ip => ip.required);
      const completedInteractions = watchProgress.interactionResponses.length;
      if (completedInteractions < requiredInteractions.length) {
        completed = false;
      }
    }

    if (completed) {
      handleAutoComplete();
    }
  }, [isCompleted, content.completionCriteria, watchProgress.interactionResponses.length, handleAutoComplete]);

  const canComplete = useCallback((): boolean => {
    const criteria = content.completionCriteria;

    // For YouTube videos, we can't track progress accurately due to iframe restrictions
    // So we'll use a more lenient approach based on time spent
    if (provider === 'youtube') {
      const timeSpent = getElapsedTime(activityId);
      const minTimeRequired = criteria.minWatchTimeSeconds || 30; // Default 30 seconds minimum

      return timeSpent >= minTimeRequired;
    }

    // For regular video files, use the normal progress tracking
    if (watchProgress.watchedPercentage < criteria.minWatchPercentage) {
      return false;
    }

    if (criteria.minWatchTimeSeconds && watchProgress.currentTime < criteria.minWatchTimeSeconds) {
      return false;
    }

    if (criteria.interactionPoints) {
      const requiredInteractions = criteria.interactionPoints.filter(ip => ip.required);
      const completedInteractions = watchProgress.interactionResponses.length;
      if (completedInteractions < requiredInteractions.length) {
        return false;
      }
    }

    return true;
  }, [content.completionCriteria, provider, watchProgress.watchedPercentage, watchProgress.currentTime, watchProgress.interactionResponses.length, getElapsedTime, activityId]);

  const handleManualComplete = useCallback(() => {
    if (!canComplete()) {
      toast.error('Please meet the completion criteria before finishing.');
      return;
    }
    handleAutoComplete();
  }, [canComplete, handleAutoComplete]);

  // Video progress tracking
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration || content.video.duration || 1;
    const watchedPercentage = (currentTime / duration) * 100;

    setWatchProgress(prev => ({
      ...prev,
      currentTime,
      watchedPercentage: Math.max(prev.watchedPercentage, watchedPercentage),
      watchedSegments: updateWatchedSegments(prev.watchedSegments, currentTime)
    }));

    checkCompletionCriteria(watchedPercentage, currentTime);
  }, [content.video.duration, updateWatchedSegments, checkCompletionCriteria]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getVideoUrl = (): string | null => {
    const { provider, url } = content.video;

    if (provider === 'youtube') {
      let videoId = '';

      // Handle different YouTube URL formats
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
      }

      // Validate video ID (should be 11 characters for YouTube)
      if (videoId && videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
        // Add parameters to ensure proper embedding
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
      }

      // Invalid or unsupported YouTube URL (e.g., homepage). Don't iframe it.
      console.warn('Invalid YouTube URL or video ID:', url, 'Extracted ID:', videoId);
      return null;
    }

    return url;
  };

  const getCompletionStatus = (): Array<{label: string, met: boolean, current: string}> => {
    const criteria = content.completionCriteria;
    const status: Array<{label: string, met: boolean, current: string}> = [];

    // For YouTube videos, show time-based completion since we can't track video progress
    if (provider === 'youtube') {
      const timeSpent = getElapsedTime(activityId);
      const minTimeRequired = criteria.minWatchTimeSeconds || 30;

      status.push({
        label: `Minimum viewing time: ${formatTime(minTimeRequired)}`,
        met: timeSpent >= minTimeRequired,
        current: formatTime(timeSpent)
      });

      // Add a note about YouTube tracking limitations
      status.push({
        label: 'YouTube video (time-based tracking)',
        met: true,
        current: 'Active'
      });
    } else {
      // For regular video files, use normal progress tracking
      status.push({
        label: `Watch progress: ${criteria.minWatchPercentage}%`,
        met: watchProgress.watchedPercentage >= criteria.minWatchPercentage,
        current: `${Math.round(watchProgress.watchedPercentage)}%`
      });

      if (criteria.minWatchTimeSeconds) {
        const met = watchProgress.currentTime >= criteria.minWatchTimeSeconds;
        status.push({
          label: `Minimum watch time: ${formatTime(criteria.minWatchTimeSeconds)}`,
          met,
          current: formatTime(watchProgress.currentTime)
        });
      }
    }

    if (criteria.interactionPoints && criteria.interactionPoints.length > 0) {
      const requiredInteractions = criteria.interactionPoints.filter(ip => ip.required);
      const completedInteractions = watchProgress.interactionResponses.length;
      const met = completedInteractions >= requiredInteractions.length;
      status.push({
        label: `Required interactions: ${requiredInteractions.length}`,
        met,
        current: `${completedInteractions} completed`
      });
    }

    return status;
  };

  return (
    <div className="video-viewer max-w-6xl mx-auto space-y-6">
      {/* Video Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                {content.title}
              </CardTitle>
              {content.description && (
                <div 
                  className="text-gray-600 mt-1 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.description }}
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

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Watch Progress</span>
              <span>{Math.round(watchProgress.watchedPercentage)}%</span>
            </div>
            <Progress value={watchProgress.watchedPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Video Player */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px', maxHeight: '80vh' }}>
            {provider === 'youtube' ? (
              <div className="relative w-full h-full">
                {(() => {
                  const embedUrl = getVideoUrl();
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        onError={(e) => {
                          console.error('YouTube video failed to load:', e);
                        }}
                      />
                    );
                  }
                  // Fallback when URL is not embeddable (e.g., https://www.youtube.com/)
                  return (
                    <div className="w-full h-full flex items-center justify-center text-white p-4 text-center">
                      <div>
                        <p className="mb-3">This YouTube URL is not embeddable. Open it in a new tab.</p>
                        <Button asChild variant="secondary" size="sm">
                          <a href={content.video.url} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                {/* YouTube progress tracking notice */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  YouTube Video
                </div>
              </div>
            ) : provider === 'file' ? (
              content.video.url ? (
                <video
                  ref={videoRef}
                  src={content.video.url}
                  className="w-full h-full"
                  controls={content.features.showControls}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controlsList={!content.features.allowSeeking ? 'nodownload nofullscreen noremoteplayback' : undefined}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400">No video URL provided</p>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Play className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Video Player</p>
                  <p className="text-sm opacity-75">
                    {provider.toUpperCase()} - {content.video.url}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Controls (if needed) */}
          {!content.features.showControls && provider === 'file' && (
            <div className="p-4 bg-gray-100 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
              >
                {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <div className="flex-1 mx-4">
                <div className="text-sm text-gray-600 mb-1">
                  {formatTime(watchProgress.currentTime)} / {formatTime(content.video.duration || 0)}
                </div>
                <Progress
                  value={(watchProgress.currentTime / (content.video.duration || 1)) * 100}
                  className="h-1"
                />
              </div>

              <Button variant="outline" size="sm">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          )}
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
              {isSubmitting ? 'Completing...' : isCompleted ? 'Completed' : 'Complete Video'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video Information */}
      {content.video.metadata?.title && (
        <Card>
          <CardHeader>
            <CardTitle>Video Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Title:</span>
                <span className="font-medium">{content.video.metadata.title}</span>
              </div>
              {content.video.duration && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{formatTime(content.video.duration)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium capitalize">{content.video.provider}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
