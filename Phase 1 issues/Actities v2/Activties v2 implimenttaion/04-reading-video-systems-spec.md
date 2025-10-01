# Reading & Video Systems Detailed Specification

## 🎯 Overview

Reading and Video activities provide content consumption experiences with sophisticated completion tracking, engagement analytics, and achievement integration.

## 📖 Reading Activity System

### Architecture
```
src/features/activities-v2/reading/
├── types/                  # Reading-specific types
├── services/              # Reading business logic
├── components/            # Reading UI components
│   ├── editor/           # Teacher reading creation
│   ├── viewer/           # Student reading experience
│   └── analytics/        # Reading analytics
├── content-processors/   # Content handling
└── completion-tracking/  # Progress monitoring
```

### Reading Editor Component

```typescript
// src/features/activities-v2/reading/components/editor/ReadingEditor.tsx
export const ReadingEditor: React.FC<ReadingEditorProps> = ({
  activity,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<ReadingV2Content>(
    activity?.content || getDefaultReadingContent()
  );

  return (
    <div className="reading-editor">
      {/* Basic Information */}
      <ReadingBasicInfo
        content={content}
        onChange={setContent}
      />

      {/* Content Configuration */}
      <ReadingContentConfig
        content={content.content}
        onChange={(contentData) => setContent({
          ...content,
          content: contentData
        })}
      />

      {/* Completion Criteria */}
      <ReadingCompletionCriteria
        criteria={content.completionCriteria}
        onChange={(criteria) => setContent({
          ...content,
          completionCriteria: criteria
        })}
      />

      {/* Reading Features */}
      <ReadingFeatures
        features={content.features}
        onChange={(features) => setContent({
          ...content,
          features
        })}
      />

      {/* Achievement Configuration */}
      <AchievementConfigPanel
        config={content.achievementConfig}
        onChange={(achievementConfig) => setContent({
          ...content,
          achievementConfig
        })}
        activityType="reading"
      />

      {/* Preview and Save */}
      <ReadingPreview content={content} />
      <EditorActions onSave={handleSave} onCancel={onCancel} />
    </div>
  );
};
```

### Reading Content Configuration

```typescript
// src/features/activities-v2/reading/components/editor/ReadingContentConfig.tsx
export const ReadingContentConfig: React.FC<ReadingContentConfigProps> = ({
  content,
  onChange
}) => {
  const [contentType, setContentType] = useState<ReadingContentType>(content.type);
  const [richTextEditor, setRichTextEditor] = useState<string>(
    content.type === 'rich_text' ? content.data : ''
  );

  const handleContentTypeChange = (type: ReadingContentType) => {
    setContentType(type);
    onChange({
      type,
      data: type === 'rich_text' ? richTextEditor : '',
      metadata: calculateContentMetadata(type, '')
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Type Selection */}
        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={handleContentTypeChange}>
            <SelectItem value="rich_text">Rich Text (Inline)</SelectItem>
            <SelectItem value="url">External URL</SelectItem>
            <SelectItem value="file">File Upload</SelectItem>
          </Select>
        </div>

        {/* Content Input Based on Type */}
        {contentType === 'rich_text' && (
          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              value={richTextEditor}
              onChange={(value) => {
                setRichTextEditor(value);
                onChange({
                  ...content,
                  data: value,
                  metadata: calculateContentMetadata('rich_text', value)
                });
              }}
              features={{
                formatting: true,
                images: true,
                links: true,
                lists: true,
                tables: true
              }}
            />
            <ContentMetadataDisplay metadata={content.metadata} />
          </div>
        )}

        {contentType === 'url' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                type="url"
                value={content.data}
                onChange={(e) => onChange({
                  ...content,
                  data: e.target.value,
                  metadata: calculateContentMetadata('url', e.target.value)
                })}
                placeholder="https://example.com/article"
              />
            </div>
            <URLPreview url={content.data} />
          </div>
        )}

        {contentType === 'file' && (
          <div className="space-y-4">
            <FileUploader
              accept=".pdf,.doc,.docx,.txt,.md"
              onUpload={(filePath) => onChange({
                ...content,
                data: filePath,
                metadata: calculateContentMetadata('file', filePath)
              })}
            />
            {content.data && <FilePreview filePath={content.data} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### Reading Viewer Component

```typescript
// src/features/activities-v2/reading/components/viewer/ReadingViewer.tsx
export const ReadingViewer: React.FC<ReadingViewerProps> = ({
  activity,
  studentId,
  onComplete
}) => {
  const content = activity.content as ReadingV2Content;
  const [progress, setProgress] = useState<ReadingProgress>({
    scrollPercentage: 0,
    timeSpent: 0,
    bookmarks: [],
    highlights: [],
    notes: []
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // Time tracking integration
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();
  useEffect(() => {
    startTracking(activity.id);
    return () => stopTracking(activity.id);
  }, [activity.id]);

  // Progress tracking
  const trackingRef = useRef<HTMLDivElement>(null);
  useScrollProgress(trackingRef, (scrollPercentage) => {
    setProgress(prev => ({ ...prev, scrollPercentage }));
    checkCompletionCriteria(scrollPercentage);
  });

  const checkCompletionCriteria = (scrollPercentage: number) => {
    const criteria = content.completionCriteria;
    const timeSpent = getElapsedTime(activity.id);
    
    let completed = true;
    
    if (criteria.minTimeSeconds && timeSpent < criteria.minTimeSeconds) {
      completed = false;
    }
    
    if (criteria.scrollPercentage && scrollPercentage < criteria.scrollPercentage) {
      completed = false;
    }
    
    if (criteria.interactionRequired && progress.bookmarks.length === 0 && progress.highlights.length === 0) {
      completed = false;
    }

    if (completed && !isCompleted) {
      handleCompletion();
    }
  };

  const handleCompletion = async () => {
    setIsCompleted(true);
    
    try {
      const result = await api.reading.complete.mutate({
        activityId: activity.id,
        studentId,
        progress,
        timeSpent: getElapsedTime(activity.id)
      });

      // Show achievement animation if enabled
      if (content.achievementConfig.pointsAnimation) {
        showAchievementAnimation(result.achievements);
      }

      onComplete(result);
    } catch (error) {
      console.error('Failed to complete reading activity:', error);
    }
  };

  return (
    <div className="reading-viewer">
      {/* Reading Header */}
      <ReadingHeader
        title={content.title}
        progress={progress.scrollPercentage}
        timeSpent={getElapsedTime(activity.id)}
        estimatedTime={content.estimatedTimeMinutes}
        features={content.features}
      />

      {/* Reading Content */}
      <div ref={trackingRef} className="reading-content">
        <ReadingContentRenderer
          content={content.content}
          features={content.features}
          progress={progress}
          onProgressUpdate={setProgress}
        />
      </div>

      {/* Reading Tools */}
      {content.features.allowBookmarking && (
        <BookmarkingTools
          bookmarks={progress.bookmarks}
          onBookmarkAdd={(bookmark) => setProgress(prev => ({
            ...prev,
            bookmarks: [...prev.bookmarks, bookmark]
          }))}
        />
      )}

      {/* Completion Status */}
      <ReadingCompletionStatus
        criteria={content.completionCriteria}
        progress={progress}
        isCompleted={isCompleted}
      />

      {/* Achievement Animation Overlay */}
      <AchievementAnimationOverlay
        celebrationLevel={content.achievementConfig.celebrationLevel}
      />
    </div>
  );
};
```

## 🎥 Video Activity System

### Architecture
```
src/features/activities-v2/video/
├── types/                 # Video-specific types
├── services/             # Video business logic
├── components/           # Video UI components
│   ├── editor/          # Teacher video creation
│   ├── viewer/          # Student video experience
│   └── analytics/       # Video analytics
├── players/             # Video player integrations
└── completion-tracking/ # Watch progress monitoring
```

### Video Editor Component

```typescript
// src/features/activities-v2/video/components/editor/VideoEditor.tsx
export const VideoEditor: React.FC<VideoEditorProps> = ({
  activity,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<VideoV2Content>(
    activity?.content || getDefaultVideoContent()
  );

  return (
    <div className="video-editor">
      {/* Basic Information */}
      <VideoBasicInfo
        content={content}
        onChange={setContent}
      />

      {/* Video Source Configuration */}
      <VideoSourceConfig
        video={content.video}
        onChange={(video) => setContent({ ...content, video })}
      />

      {/* Completion Criteria */}
      <VideoCompletionCriteria
        criteria={content.completionCriteria}
        onChange={(criteria) => setContent({
          ...content,
          completionCriteria: criteria
        })}
      />

      {/* Video Features */}
      <VideoFeatures
        features={content.features}
        onChange={(features) => setContent({
          ...content,
          features
        })}
      />

      {/* Interaction Points */}
      <VideoInteractionPoints
        interactionPoints={content.completionCriteria.interactionPoints || []}
        onChange={(interactionPoints) => setContent({
          ...content,
          completionCriteria: {
            ...content.completionCriteria,
            interactionPoints
          }
        })}
      />

      {/* Achievement Configuration */}
      <AchievementConfigPanel
        config={content.achievementConfig}
        onChange={(achievementConfig) => setContent({
          ...content,
          achievementConfig
        })}
        activityType="video"
      />

      {/* Preview and Save */}
      <VideoPreview content={content} />
      <EditorActions onSave={handleSave} onCancel={onCancel} />
    </div>
  );
};
```

### Video Source Configuration

```typescript
// src/features/activities-v2/video/components/editor/VideoSourceConfig.tsx
export const VideoSourceConfig: React.FC<VideoSourceConfigProps> = ({
  video,
  onChange
}) => {
  const [provider, setProvider] = useState<VideoProvider>(video.provider);
  const [videoMetadata, setVideoMetadata] = useState(video.metadata);

  const handleProviderChange = (newProvider: VideoProvider) => {
    setProvider(newProvider);
    onChange({
      ...video,
      provider: newProvider,
      url: '',
      metadata: undefined
    });
  };

  const handleUrlChange = async (url: string) => {
    const metadata = await extractVideoMetadata(url, provider);
    setVideoMetadata(metadata);
    
    onChange({
      ...video,
      url,
      metadata,
      duration: metadata?.duration
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>Video Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vimeo">Vimeo</SelectItem>
            <SelectItem value="file">File Upload</SelectItem>
            <SelectItem value="hls">HLS Stream</SelectItem>
          </Select>
        </div>

        {/* URL Input */}
        {(provider === 'youtube' || provider === 'vimeo' || provider === 'hls') && (
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              type="url"
              value={video.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={getPlaceholderForProvider(provider)}
            />
          </div>
        )}

        {/* File Upload */}
        {provider === 'file' && (
          <VideoFileUploader
            onUpload={(filePath, metadata) => {
              setVideoMetadata(metadata);
              onChange({
                ...video,
                url: filePath,
                metadata,
                duration: metadata.duration
              });
            }}
          />
        )}

        {/* Video Preview */}
        {video.url && (
          <VideoPreviewPlayer
            video={video}
            features={defaultVideoFeatures}
          />
        )}

        {/* Video Metadata Display */}
        {videoMetadata && (
          <VideoMetadataDisplay metadata={videoMetadata} />
        )}
      </CardContent>
    </Card>
  );
};
```

### Video Viewer Component

```typescript
// src/features/activities-v2/video/components/viewer/VideoViewer.tsx
export const VideoViewer: React.FC<VideoViewerProps> = ({
  activity,
  studentId,
  onComplete
}) => {
  const content = activity.content as VideoV2Content;
  const [watchProgress, setWatchProgress] = useState<VideoWatchProgress>({
    currentTime: 0,
    watchedPercentage: 0,
    watchedSegments: [],
    interactionResponses: []
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // Time tracking integration
  const { startTracking, stopTracking, getElapsedTime } = useTimeTracking();
  useEffect(() => {
    startTracking(activity.id);
    return () => stopTracking(activity.id);
  }, [activity.id]);

  const handleVideoProgress = (currentTime: number, duration: number) => {
    const watchedPercentage = (currentTime / duration) * 100;
    
    setWatchProgress(prev => ({
      ...prev,
      currentTime,
      watchedPercentage,
      watchedSegments: updateWatchedSegments(prev.watchedSegments, currentTime)
    }));

    checkCompletionCriteria(watchedPercentage, currentTime);
  };

  const checkCompletionCriteria = (watchedPercentage: number, currentTime: number) => {
    const criteria = content.completionCriteria;
    let completed = true;

    if (watchedPercentage < criteria.minWatchPercentage) {
      completed = false;
    }

    if (criteria.minWatchTimeSeconds && currentTime < criteria.minWatchTimeSeconds) {
      completed = false;
    }

    if (criteria.interactionPoints) {
      const requiredInteractions = criteria.interactionPoints.filter(ip => ip.required);
      const completedInteractions = watchProgress.interactionResponses.length;
      if (completedInteractions < requiredInteractions.length) {
        completed = false;
      }
    }

    if (completed && !isCompleted) {
      handleCompletion();
    }
  };

  const handleCompletion = async () => {
    setIsCompleted(true);

    try {
      const result = await api.video.complete.mutate({
        activityId: activity.id,
        studentId,
        watchProgress,
        timeSpent: getElapsedTime(activity.id)
      });

      // Show achievement animation if enabled
      if (content.achievementConfig.pointsAnimation) {
        showAchievementAnimation(result.achievements);
      }

      onComplete(result);
    } catch (error) {
      console.error('Failed to complete video activity:', error);
    }
  };

  return (
    <div className="video-viewer">
      {/* Video Header */}
      <VideoHeader
        title={content.title}
        progress={watchProgress.watchedPercentage}
        duration={content.video.duration}
        features={content.features}
      />

      {/* Video Player */}
      <VideoPlayer
        video={content.video}
        features={content.features}
        interactionPoints={content.completionCriteria.interactionPoints}
        onProgress={handleVideoProgress}
        onInteraction={(response) => setWatchProgress(prev => ({
          ...prev,
          interactionResponses: [...prev.interactionResponses, response]
        }))}
      />

      {/* Video Controls */}
      <VideoControls
        features={content.features}
        currentTime={watchProgress.currentTime}
        duration={content.video.duration || 0}
      />

      {/* Completion Status */}
      <VideoCompletionStatus
        criteria={content.completionCriteria}
        progress={watchProgress}
        isCompleted={isCompleted}
      />

      {/* Achievement Animation Overlay */}
      <AchievementAnimationOverlay
        celebrationLevel={content.achievementConfig.celebrationLevel}
      />
    </div>
  );
};
```

## 🏆 Completion Tracking & Analytics

### Reading Analytics Service

```typescript
// src/features/activities-v2/reading/services/reading-analytics.service.ts
export class ReadingAnalyticsService {
  async trackReadingProgress(
    activityId: string,
    studentId: string,
    progress: ReadingProgress
  ): Promise<void> {
    await this.prisma.readingAnalytics.upsert({
      where: {
        activityId_studentId: { activityId, studentId }
      },
      update: {
        scrollPercentage: progress.scrollPercentage,
        timeSpent: progress.timeSpent,
        bookmarksCount: progress.bookmarks.length,
        highlightsCount: progress.highlights.length,
        notesCount: progress.notes.length,
        lastAccessedAt: new Date()
      },
      create: {
        activityId,
        studentId,
        scrollPercentage: progress.scrollPercentage,
        timeSpent: progress.timeSpent,
        bookmarksCount: progress.bookmarks.length,
        highlightsCount: progress.highlights.length,
        notesCount: progress.notes.length,
        startedAt: new Date(),
        lastAccessedAt: new Date()
      }
    });
  }

  async completeReading(
    activityId: string,
    studentId: string,
    finalProgress: ReadingProgress
  ): Promise<ReadingCompletionResult> {
    // Record completion
    await this.trackReadingProgress(activityId, studentId, finalProgress);
    
    // Award achievements
    const achievements = await this.awardReadingAchievements(
      activityId,
      studentId,
      finalProgress
    );

    // Update analytics
    await this.updateReadingAnalytics(activityId, studentId, finalProgress);

    return {
      completed: true,
      achievements,
      finalProgress
    };
  }
}
```

This specification provides comprehensive Reading and Video activity systems with rich content support, sophisticated completion tracking, and seamless achievement integration.
