'use client';

/**
 * Activities V2 Creator Component
 * 
 * Main component for creating Activities V2
 * Routes to appropriate editor based on activity type
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuizEditor } from './quiz/QuizEditor';
import { ReadingEditor } from './reading/ReadingEditor';
import { VideoEditor } from './video/VideoEditor';
import { ActivityV2Content, CreateActivityV2Input, QuizV2Content, ReadingV2Content, VideoV2Content } from '../types';
import { api } from '@/trpc/react';
import { BookOpen, Play, HelpCircle, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityV2CreatorProps {
  classId: string;
  subjectId: string;
  topicId?: string;
  activityType?: 'quiz' | 'reading' | 'video';
  onSuccess: (activity: any) => void;
  onCancel: () => void;
}

export const ActivityV2Creator: React.FC<ActivityV2CreatorProps> = ({
  classId,
  subjectId,
  topicId,
  activityType,
  onSuccess,
  onCancel
}) => {
  const [selectedType, setSelectedType] = useState<'quiz' | 'reading' | 'video' | null>(activityType || null);
  const [isCreating, setIsCreating] = useState(false);

  // Create activity mutation
  const createActivityMutation = api.activityV2.create.useMutation({
    onSuccess: (result) => {
      toast.success('Activity created successfully!');
      onSuccess(result.activity);
    },
    onError: (error) => {
      toast.error('Failed to create activity: ' + error.message);
      setIsCreating(false);
    }
  });

  const handleSave = async (content: QuizV2Content | ReadingV2Content | VideoV2Content) => {
    setIsCreating(true);

    // Ensure content has all required fields for server validation
    const serverContent = {
      ...content,
      // Ensure all required fields are present based on type
      ...(content.type === 'quiz' && {
        assessmentMode: content.assessmentMode || 'standard',
        catSettings: content.catSettings || undefined,
        spacedRepetitionSettings: content.spacedRepetitionSettings || undefined
      }),
      ...(content.type === 'reading' && {
        content: (content as any).content || {
          type: 'rich_text',
          data: '',
          metadata: {
            wordCount: 0,
            readingLevel: undefined,
            estimatedReadingTime: 0
          }
        },
        completionCriteria: content.completionCriteria || {
          minTimeSeconds: 60,
          scrollPercentage: 80,
          interactionRequired: false
        },
        features: content.features || {
          allowBookmarking: true,
          allowHighlighting: true,
          allowNotes: true,
          showProgress: true
        }
      }),
      ...(content.type === 'video' && {
        video: (content as any).video || {
          provider: 'youtube',
          url: '',
          duration: undefined,
          metadata: {
            title: undefined,
            thumbnail: undefined,
            description: undefined
          }
        },
        completionCriteria: content.completionCriteria || {
          minWatchPercentage: 80,
          minWatchTimeSeconds: undefined,
          interactionPoints: []
        },
        features: content.features || {
          allowSeeking: true,
          showControls: true,
          allowSpeedChange: true,
          showTranscript: false
        }
      })
    };

    const input = {
      title: content.title,
      subjectId,
      topicId,
      classId,
      content: serverContent, // Use the properly transformed content
      isGradable: content.type === 'quiz',
      maxScore: calculateMaxScore(content),
      passingScore: calculatePassingScore(content),
      startDate: content.startDate, // Include start date if provided
      endDate: content.endDate      // Include end date if provided
    };

    await createActivityMutation.mutateAsync(input);
  };

  const calculateMaxScore = (content: QuizV2Content | ReadingV2Content | VideoV2Content): number => {
    switch (content.type) {
      case 'quiz':
        const quizContent = content as QuizV2Content;
        return quizContent.questions?.reduce((sum: number, q: any) => sum + q.points, 0) || 100;
      case 'reading':
      case 'video':
        return 100; // Default score for completion-based activities
      default:
        return 100;
    }
  };

  const calculatePassingScore = (content: QuizV2Content | ReadingV2Content | VideoV2Content): number => {
    const maxScore = calculateMaxScore(content);
    return Math.ceil(maxScore * 0.6); // 60% passing score
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const activityTypes = [
    {
      type: 'quiz' as const,
      title: 'Quiz Activity',
      description: 'Create interactive quizzes using questions from the Question Bank',
      icon: HelpCircle,
      color: 'bg-blue-500',
      features: [
        'Question Bank integration',
        'Multiple question types',
        'Auto-grading',
        'Achievement system',
        'Time tracking'
      ]
    },
    {
      type: 'reading' as const,
      title: 'Reading Activity',
      description: 'Create reading assignments with progress tracking and engagement features',
      icon: BookOpen,
      color: 'bg-green-500',
      features: [
        'Rich text content',
        'External URLs',
        'File uploads',
        'Progress tracking',
        'Bookmarks & notes'
      ]
    },
    {
      type: 'video' as const,
      title: 'Video Activity',
      description: 'Create video-based learning activities with watch progress tracking',
      icon: Play,
      color: 'bg-purple-500',
      features: [
        'YouTube & Vimeo support',
        'File uploads',
        'Watch progress tracking',
        'Completion criteria',
        'Interactive elements'
      ]
    }
  ];

  if (selectedType) {
    return (
      <div className="space-y-4">
        {selectedType === 'quiz' && (
          <QuizEditor
            subjectId={subjectId}
            topicId={topicId}
            onSave={handleSave}
            onCancel={onCancel}
          />
        )}

        {selectedType === 'reading' && (
          <ReadingEditor
            onSave={handleSave}
            onCancel={onCancel}
            subjectId={subjectId}
            topicId={topicId}
            classId={classId}
          />
        )}

        {selectedType === 'video' && (
          <VideoEditor
            onSave={handleSave}
            onCancel={onCancel}
          />
        )}
      </div>
    );
  }

  return (
    <div className="activity-v2-creator space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Create New Activity</h2>
        <p className="text-gray-600">
          Choose the type of activity you want to create using Activities V2
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activityTypes.map((activityType) => {
          const Icon = activityType.icon;
          
          return (
            <Card
              key={activityType.type}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
              onClick={() => setSelectedType(activityType.type)}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 ${activityType.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">{activityType.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center mb-4">
                  {activityType.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Key Features:</h4>
                  <div className="flex flex-wrap gap-1">
                    {activityType.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button className="w-full mt-4" variant="outline">
                  Create {activityType.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Loading State */}
      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="font-medium">Creating activity...</p>
              <p className="text-sm text-gray-500">Please wait while we set up your activity.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
