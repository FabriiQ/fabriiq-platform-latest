'use client';

/**
 * Video Editor Component for Activities V2
 * 
 * Simple video activity creation interface
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoV2Content } from '../../types';
import { Save, Play as Youtube, Monitor as Video, Plus as Upload, Settings as Radio, Check, Loader2, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ActivityV2Viewer } from '../ActivityV2Viewer';
import { ActivityStatusManager } from '../status/ActivityStatusManager';
import { ActivityV2Status } from '../../types';
import { FileUploader } from '@/components/ui/core/file-uploader';
import { EnhancedRichTextEditor } from '@/features/teacher-assistant-v2/components/enhanced-rich-text-editor';
import { DatePicker } from '@/components/ui/date-picker';

interface VideoEditorProps {
  initialContent?: VideoV2Content;
  onSave: (content: VideoV2Content) => void;
  onCancel: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  initialContent,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<VideoV2Content>(
    initialContent || getDefaultVideoContent()
  );
  const [activeTab, setActiveTab] = useState<'basic' | 'video' | 'completion' | 'achievements' | 'status'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(initialContent?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialContent?.endDate);

  const handleSave = async () => {
    // Validate required fields
    if (!content.title.trim()) {
      toast.error('Please enter a title for the video activity');
      return;
    }

    if (!content.video.url.trim()) {
      toast.error('Please add a video URL or upload a video file');
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
      console.error('Error saving video activity:', error);
      toast.error('Failed to save video activity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (status: ActivityV2Status) => {
    setContent(prev => ({
      ...prev,
      status
    }));
  };

  const handleVideoChange = (field: string, value: any) => {
    console.log('Video change:', field, value); // Debug log
    setContent(prevContent => ({
      ...prevContent,
      video: {
        ...prevContent.video,
        [field]: value
      }
    }));
  };

  const extractVideoMetadata = async (url: string, provider: string) => {
    let metadata = {};

    try {
      if (provider === 'youtube') {
        // Extract YouTube video ID from various URL formats
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
          metadata = {
            title: 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            description: 'YouTube video content'
          };
        }
      } else if (provider === 'vimeo') {
        // Extract Vimeo video ID
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) {
          const videoId = vimeoMatch[1];
          metadata = {
            title: 'Vimeo Video',
            thumbnail: `https://vumbnail.com/${videoId}.jpg`,
            description: 'Vimeo video content'
          };
        }
      } else if (provider === 'file') {
        // For file uploads, extract filename and basic info
        const filename = url.split('/').pop() || 'Video File';
        metadata = {
          title: filename,
          description: 'Uploaded video file'
        };
      } else if (provider === 'hls') {
        metadata = {
          title: 'HLS Stream',
          description: 'Live or on-demand video stream'
        };
      }
    } catch (error) {
      console.error('Error extracting video metadata:', error);
    }

    return metadata;
  };

  // Helper function to extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Validate URL based on provider
  const validateUrl = (url: string, provider: string): boolean => {
    if (!url) return false;

    try {
      const urlObj = new URL(url);

      switch (provider) {
        case 'youtube':
          return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
        case 'vimeo':
          return urlObj.hostname.includes('vimeo.com');
        case 'hls':
          return url.endsWith('.m3u8') || urlObj.protocol === 'https:';
        case 'file':
          return true; // File paths are handled differently
        default:
          return true;
      }
    } catch {
      return provider === 'file'; // File paths might not be valid URLs
    }
  };

  const handleUrlChange = async (url: string) => {
    console.log('URL change:', url); // Debug log
    handleVideoChange('url', url);

    if (url) {
      const metadata = await extractVideoMetadata(url, content.video.provider);
      handleVideoChange('metadata', metadata);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'vimeo': return <Video className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      case 'hls': return <Radio className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const getPlaceholderForProvider = (provider: string): string => {
    switch (provider) {
      case 'youtube': return 'https://www.youtube.com/watch?v=...';
      case 'vimeo': return 'https://vimeo.com/...';
      case 'file': return '/uploads/video.mp4';
      case 'hls': return 'https://example.com/stream.m3u8';
      default: return 'Enter video URL';
    }
  };

  return (
    <div className="video-editor space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Video Activity</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          {/* Preview Button */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!content.title || !content.video.url}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Activity Preview - {content.title || 'Untitled Video'}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Preview Mode:</strong> This shows exactly how students will see and interact with your video activity.
                    All functionality is simulated including video playback, progress tracking, and completion criteria.
                  </p>
                </div>
                <PreviewVideoViewer content={content} />
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
                Save Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic Info' },
          { id: 'video', label: 'Video Source' },
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
              <Label htmlFor="title">Video Title</Label>
              <Input
                id="title"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                placeholder="Enter video title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <div className="border rounded-md">
                <EnhancedRichTextEditor
                  content={content.description || ''}
                  onChange={(value) => setContent({ ...content, description: value })}
                  placeholder="Enter video description..."
                  minHeight="120px"
                  className="min-h-[120px]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={content.estimatedTimeMinutes || ''}
                onChange={(e) => setContent({ 
                  ...content, 
                  estimatedTimeMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="e.g., 15"
              />
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
          </CardContent>
        </Card>
      )}

      {activeTab === 'video' && (
        <Card>
          <CardHeader>
            <CardTitle>Video Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div>
              <Label>Video Provider</Label>
              <Select
                value={content.video.provider}
                onValueChange={(value: 'youtube' | 'vimeo' | 'file' | 'hls') => 
                  handleVideoChange('provider', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4" />
                      YouTube
                    </div>
                  </SelectItem>
                  <SelectItem value="vimeo">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Vimeo
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      File Upload
                    </div>
                  </SelectItem>
                  <SelectItem value="hls">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      HLS Stream
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL Input or File Upload */}
            {content.video.provider === 'file' ? (
              <div>
                <Label>Upload Video File</Label>
                <FileUploader
                  onFilesAdded={(files) => {
                    if (files.length > 0) {
                      const file = files[0];
                      // For now, we'll just set the file name as the URL
                      // In a real implementation, you'd upload the file and get a URL
                      handleUrlChange(`/uploads/videos/${file.name}`);
                    }
                  }}
                  maxFiles={1}
                  maxSize={500} // 500MB for video files
                  acceptedFileTypes={['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov']}
                  className="mt-2"
                />
                {content.video.url && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">{content.video.url}</span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  <strong>Supported formats:</strong> MP4 (recommended), WebM, OGG, AVI, MOV
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="videoUrl">Video URL</Label>
                <div className="flex items-center gap-2">
                  {getProviderIcon(content.video.provider)}
                  <Input
                    id="videoUrl"
                    value={content.video.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={getPlaceholderForProvider(content.video.provider)}
                    className={`flex-1 ${content.video.url && !validateUrl(content.video.url, content.video.provider) ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                </div>
                {content.video.url && !validateUrl(content.video.url, content.video.provider) && (
                  <p className="text-sm text-red-600 mt-1">
                    Please enter a valid {content.video.provider} URL
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {content.video.provider === 'youtube' && 'Enter a YouTube video URL (e.g., https://www.youtube.com/watch?v=...)'}
                  {content.video.provider === 'vimeo' && 'Enter a Vimeo video URL (e.g., https://vimeo.com/...)'}
                  {content.video.provider === 'hls' && 'Enter an HLS stream URL (e.g., https://example.com/stream.m3u8)'}
                </p>
              </div>
            )}

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={content.video.duration?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleVideoChange('duration', value ? parseInt(value) : undefined);
                }}
                placeholder="e.g., 900 (15 minutes)"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty for auto-detection (if supported)
              </p>
            </div>

            {/* Video Preview */}
            {content.video.url && (
              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="font-medium mb-3">Video Preview</h3>

                {/* Video Thumbnail/Preview */}
                <div className="aspect-video bg-gray-200 rounded-md flex items-center justify-center mb-3 relative overflow-hidden">
                  {content.video.metadata?.thumbnail ? (
                    <img
                      src={content.video.metadata.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if thumbnail fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      {getProviderIcon(content.video.provider)}
                      <span className="ml-2 text-gray-600 mt-2">
                        {content.video.provider.toUpperCase()} Video
                      </span>
                    </div>
                  )}
                </div>

                {/* Video Information */}
                <div className="space-y-2">
                  {content.video.metadata?.title && (
                    <p className="text-sm font-medium text-gray-900">{content.video.metadata.title}</p>
                  )}
                  {content.video.metadata?.description && (
                    <p className="text-xs text-gray-600">{content.video.metadata.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Provider: {content.video.provider.toUpperCase()}</span>
                    {content.video.duration && (
                      <span>Duration: {Math.floor(content.video.duration / 60)}:{(content.video.duration % 60).toString().padStart(2, '0')}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 break-all">
                    URL: {content.video.url}
                  </div>
                </div>
              </div>
            )}
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
              <Label htmlFor="minWatchPercentage">Minimum Watch Percentage</Label>
              <Input
                id="minWatchPercentage"
                type="number"
                min="0"
                max="100"
                value={content.completionCriteria.minWatchPercentage}
                onChange={(e) => setContent({
                  ...content,
                  completionCriteria: {
                    ...content.completionCriteria,
                    minWatchPercentage: parseInt(e.target.value) || 0
                  }
                })}
                placeholder="e.g., 80"
              />
              <p className="text-sm text-gray-500 mt-1">
                Percentage of video that must be watched
              </p>
            </div>

            <div>
              <Label htmlFor="minWatchTime">Minimum Watch Time (seconds)</Label>
              <Input
                id="minWatchTime"
                type="number"
                value={content.completionCriteria.minWatchTimeSeconds || ''}
                onChange={(e) => setContent({
                  ...content,
                  completionCriteria: {
                    ...content.completionCriteria,
                    minWatchTimeSeconds: e.target.value ? parseInt(e.target.value) : undefined
                  }
                })}
                placeholder="e.g., 600 (10 minutes)"
              />
            </div>

            {/* Video Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Video Features</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.allowSeeking}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, allowSeeking: checked }
                  })}
                />
                <Label>Allow Seeking (jumping to different parts)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.showControls}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, showControls: checked }
                  })}
                />
                <Label>Show Video Controls</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.allowSpeedChange}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, allowSpeedChange: checked }
                  })}
                />
                <Label>Allow Playback Speed Change</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.features.showTranscript}
                  onCheckedChange={(checked) => setContent({
                    ...content,
                    features: { ...content.features, showTranscript: checked }
                  })}
                />
                <Label>Show Transcript (if available)</Label>
              </div>
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
          </CardContent>
        </Card>
      )}

      {/* Status Management Tab */}
      {activeTab === 'status' && (
        <ActivityStatusManager
          currentStatus={content.status || ActivityV2Status.DRAFT}
          onStatusChange={handleStatusChange}
          hasStudentAttempts={false} // TODO: Check for actual student attempts
          studentCount={0} // TODO: Get actual student count
          className="max-w-2xl"
        />
      )}
    </div>
  );
};

function getDefaultVideoContent(): VideoV2Content {
  return {
    version: '2.0',
    type: 'video',
    title: 'New Video Activity',
    description: '',
    estimatedTimeMinutes: 15,
    status: ActivityV2Status.DRAFT,
    startDate: undefined,
    endDate: undefined,
    video: {
      provider: 'youtube',
      url: '',
      duration: undefined,
      metadata: {}
    },
    completionCriteria: {
      minWatchPercentage: 80,
      minWatchTimeSeconds: undefined,
      interactionPoints: []
    },
    features: {
      allowSeeking: true,
      showControls: true,
      allowSpeedChange: true,
      showTranscript: false
    },
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: {
        base: 10
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

// Preview Video Viewer Component
interface PreviewVideoViewerProps {
  content: VideoV2Content;
}

const PreviewVideoViewer: React.FC<PreviewVideoViewerProps> = ({ content }) => {
  // Create a mock activity object for preview
  const mockActivity = {
    id: 'preview-video-activity',
    title: content.title || 'Preview Video',
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
