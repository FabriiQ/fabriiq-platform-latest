'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Settings,
  BookOpen,
  Play,
  HelpCircle,
  Calendar,
  Clock,
  Award,
  Target,
  Save,
  X
} from "lucide-react";
import { ActivityV2Content, QuizV2Content, ReadingV2Content, VideoV2Content } from "@/features/activities-v2/types";
import { QuizEditor } from "@/features/activities-v2/components/quiz/QuizEditor";
import { ReadingEditor } from "@/features/activities-v2/components/reading/ReadingEditor";
import { VideoEditor } from "@/features/activities-v2/components/video/VideoEditor";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface ActivityV2ViewerPageProps {
  activity: any;
  classId: string;
  teacherId: string;
}

export function ActivityV2ViewerPage({ activity, classId, teacherId }: ActivityV2ViewerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  const content = activity.content as ActivityV2Content;

  // Check if edit mode should be enabled from URL parameters
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return HelpCircle;
      case 'reading': return BookOpen;
      case 'video': return Play;
      default: return HelpCircle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-blue-500';
      case 'reading': return 'bg-green-500';
      case 'video': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleBack = () => {
    router.push(`/teacher/classes/${classId}/activities`);
  };

  // Update activity mutation
  const updateActivityMutation = api.activityV2.update.useMutation({
    onSuccess: () => {
      toast.success('Activity updated successfully!');
      setIsEditing(false);
      // Clear edit parameter from URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('edit');
      router.replace(currentUrl.pathname + currentUrl.search);
      router.refresh(); // Refresh the page to show updated data
    },
    onError: (error) => {
      toast.error('Failed to update activity: ' + error.message);
    }
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = async (updatedContent: QuizV2Content | ReadingV2Content | VideoV2Content) => {
    try {
      await updateActivityMutation.mutateAsync({
        id: activity.id,
        data: {
          content: updatedContent,
          title: updatedContent.title
        }
      });
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Clear edit parameter from URL
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('edit');
    router.replace(currentUrl.pathname + currentUrl.search);
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    toast.info('Delete functionality coming soon!');
  };

  const handleViewGrades = () => {
    router.push(`/teacher/classes/${classId}/activities-v2/${activity.id}/grades`);
  };

  const handleViewAnalytics = () => {
    router.push(`/teacher/classes/${classId}/activities-v2/${activity.id}/analytics`);
  };

  const Icon = getActivityIcon(content.type);
  const submissions = activity.activityGrades || [];
  const completionRate = submissions.length > 0 ? 
    (submissions.filter((s: any) => s.status === 'GRADED').length / submissions.length) * 100 : 0;
  const averageScore = submissions.length > 0 ?
    submissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / submissions.length : 0;

  // If in edit mode, show the appropriate editor
  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Edit Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-2" />
              Cancel Edit
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit {content.type.charAt(0).toUpperCase() + content.type.slice(1)}</h1>
              <p className="text-muted-foreground">{content.title}</p>
            </div>
          </div>
        </div>

        {/* Editor Component */}
        {content.type === 'quiz' && (
          <QuizEditor
            initialContent={content as QuizV2Content}
            subjectId={activity.subjectId}
            topicId={activity.topicId}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {content.type === 'reading' && (
          <ReadingEditor
            initialContent={content as ReadingV2Content}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {content.type === 'video' && (
          <VideoEditor
            initialContent={content as VideoV2Content}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${getActivityColor(content.type)} rounded-lg flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{content.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Activities V2
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {content.type}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Submissions</span>
            </div>
            <p className="text-2xl font-bold">{submissions.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completion Rate</span>
            </div>
            <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Average Score</span>
            </div>
            <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Max Score</span>
            </div>
            <p className="text-2xl font-bold">{activity.maxScore || 100}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subject:</span>
                  <span>{activity.subject?.name || 'No subject'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Topic:</span>
                  <span>{activity.topic?.title || 'No topic'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={activity.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {activity.status}
                  </Badge>
                </div>
                {content.estimatedTimeMinutes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Time:</span>
                    <span>{content.estimatedTimeMinutes} minutes</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achievement Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Achievements:</span>
                  <Badge variant={content.achievementConfig?.enabled ? 'default' : 'secondary'}>
                    {content.achievementConfig?.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {content.achievementConfig?.enabled && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Points:</span>
                      <span>{content.achievementConfig.points?.base || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Perfect Score Bonus:</span>
                      <span>{content.achievementConfig.points?.perfectScore || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Celebration Level:</span>
                      <span className="capitalize">{content.achievementConfig.celebrationLevel || 'standard'}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {content.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="text-muted-foreground prose prose-sm max-w-none
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:shadow-sm
                    [&_iframe]:w-full [&_iframe]:rounded [&_iframe]:border [&_iframe]:min-h-[150px]"
                  dangerouslySetInnerHTML={{ 
                    __html: content.description.replace(
                      /<img([^>]*?)>/gi, 
                      '<img$1 loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous">'
                    )
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Activity Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {content.type === 'quiz' && (
                  <QuizContentPreview content={content as any} />
                )}
                
                {content.type === 'reading' && (
                  <ReadingContentPreview content={content as any} />
                )}
                
                {content.type === 'video' && (
                  <VideoContentPreview content={content as any} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Student Grades
                <Button onClick={handleViewGrades}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View All Grades
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submissions.length > 0 ? (
                <div className="space-y-2">
                  {submissions.slice(0, 5).map((submission: any) => (
                    <div key={submission.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{submission.student?.user?.name || 'Unknown Student'}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={submission.status === 'GRADED' ? 'default' : 'secondary'}>
                          {submission.status}
                        </Badge>
                        <span className="font-medium">{submission.score || 0}/{activity.maxScore || 100}</span>
                      </div>
                    </div>
                  ))}
                  {submissions.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      And {submissions.length - 5} more submissions...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No submissions yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Activity Analytics
                <Button onClick={handleViewAnalytics}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Detailed analytics including question-level performance, time tracking, and engagement metrics will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Content Preview Components
function QuizContentPreview({ content }: { content: any }) {
  const { data: questions, isLoading } = api.questionBank.getQuestionsByIds.useQuery(
    { ids: content.questions?.map((q: any) => q.id) || [] },
    { enabled: !!content.questions?.length }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h4 className="font-medium mb-2">Quiz Questions</h4>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium mb-2">Quiz Questions ({content.questions?.length || 0})</h4>
      
      {questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question: any, index: number) => {
            const quizQuestion = content.questions.find((q: any) => q.id === question.id);
            return (
              <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-sm text-gray-600">Question {index + 1}</h5>
                  <div className="flex items-center gap-2">
                    {quizQuestion?.points && (
                      <Badge variant="outline" className="text-xs">
                        {quizQuestion.points} pt{quizQuestion.points !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {question.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {question.difficulty}
                      </Badge>
                    )}
                    {question.bloomsLevel && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                        {question.bloomsLevel}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div 
                  className="prose prose-sm max-w-none text-gray-800 mb-3
                    [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:shadow-sm
                    [&_iframe]:w-full [&_iframe]:rounded [&_iframe]:border [&_iframe]:min-h-[150px]"
                  dangerouslySetInnerHTML={{ 
                    __html: (question.content?.text || question.content?.question || 'No question text')
                      .replace(
                        /<img([^>]*?)>/gi, 
                        '<img$1 loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous">'
                      )
                  }} 
                />
                
                {question.questionType === 'MULTIPLE_CHOICE' && question.content?.options && (
                  <div className="space-y-1 ml-4">
                    {question.content.options.map((option: any, optIndex: number) => (
                      <div key={optIndex} className="flex items-center gap-2 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          option.isCorrect ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className={option.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}>
                          {option.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {question.questionType === 'TRUE_FALSE' && (
                  <div className="ml-4 text-sm">
                    <span className="text-gray-600">Answer: </span>
                    <span className="font-medium text-green-600">
                      {question.content?.isTrue ? 'True' : 'False'}
                    </span>
                  </div>
                )}
                
                {question.questionType === 'MULTIPLE_RESPONSE' && question.content?.options && (
                  <div className="space-y-1 ml-4">
                    {question.content.options.map((option: any, optIndex: number) => (
                      <div key={optIndex} className="flex items-center gap-2 text-sm">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                          option.isCorrect ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {option.isCorrect ? '✓' : '□'}
                        </span>
                        <span className={option.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}>
                          {option.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground p-4 bg-gray-50 rounded">
          No questions found in the Question Bank.
        </p>
      )}
    </div>
  );
}

function ReadingContentPreview({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium mb-2">Reading Content</h4>
      
      {content.content?.type === 'rich_text' && content.content?.data && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h5 className="font-medium text-sm text-gray-600 mb-2">Rich Text Content</h5>
          <div 
            className="prose prose-sm max-w-none
              [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:shadow-sm [&_img]:loading-eager
              [&_iframe]:w-full [&_iframe]:rounded [&_iframe]:border [&_iframe]:min-h-[200px]
              [&_img[src^='data:']]:inline-block
              [&_img[src*='drive.google.com']]:border-2 [&_img[src*='drive.google.com']]:border-dashed [&_img[src*='drive.google.com']]:border-yellow-300"
            dangerouslySetInnerHTML={{ 
              __html: content.content.data.replace(
                /<img([^>]*?)>/gi, 
                '<img$1 loading="eager" referrerpolicy="no-referrer" crossorigin="anonymous">'
              ) 
            }}
          />
        </div>
      )}
      
      {content.content?.type === 'url' && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h5 className="font-medium text-sm text-gray-600 mb-2">External URL</h5>
          <a 
            href={content.content.data} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {content.content.data}
          </a>
        </div>
      )}
      
      {content.content?.type === 'file' && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h5 className="font-medium text-sm text-gray-600 mb-2">File Upload</h5>
          <p className="text-sm text-gray-600">{content.content.data}</p>
        </div>
      )}
      
      {content.completionCriteria && (
        <div className="p-3 border rounded bg-blue-50">
          <h5 className="font-medium text-sm text-blue-800 mb-2">Completion Criteria</h5>
          <div className="text-xs text-blue-600 space-y-1">
            {content.completionCriteria.minTimeSeconds && (
              <p>• Minimum time: {Math.round(content.completionCriteria.minTimeSeconds / 60)} minutes</p>
            )}
            {content.completionCriteria.scrollPercentage && (
              <p>• Scroll progress: {content.completionCriteria.scrollPercentage}%</p>
            )}
            {content.completionCriteria.interactionRequired && (
              <p>• Student interaction required</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoContentPreview({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium mb-2">Video Content</h4>
      
      {content.video?.url && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h5 className="font-medium text-sm text-gray-600 mb-2">Video URL</h5>
          <p className="text-sm text-gray-600 mb-2">{content.video.url}</p>
          
          {content.video.provider && (
            <Badge variant="outline" className="text-xs">
              {content.video.provider.toUpperCase()}
            </Badge>
          )}
          
          {content.video.duration && (
            <Badge variant="secondary" className="text-xs ml-2">
              {Math.round(content.video.duration / 60)} min
            </Badge>
          )}
        </div>
      )}
      
      {content.completionCriteria && (
        <div className="p-3 border rounded bg-blue-50">
          <h5 className="font-medium text-sm text-blue-800 mb-2">Completion Criteria</h5>
          <div className="text-xs text-blue-600 space-y-1">
            {content.completionCriteria.minWatchPercentage && (
              <p>• Minimum watch: {content.completionCriteria.minWatchPercentage}%</p>
            )}
            {content.completionCriteria.minWatchTimeSeconds && (
              <p>• Minimum time: {Math.round(content.completionCriteria.minWatchTimeSeconds / 60)} minutes</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
