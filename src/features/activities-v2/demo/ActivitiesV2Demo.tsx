'use client';

/**
 * Activities V2 Demo Page
 * 
 * Demonstrates all Activities V2 functionality
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityV2Creator } from '../components/ActivityV2Creator';
import { ActivityV2Viewer } from '../components/ActivityV2Viewer';
import { Play, BookOpen, HelpCircle, Settings, Trophy, Clock } from 'lucide-react';

interface DemoActivity {
  id: string;
  title: string;
  type: 'quiz' | 'reading' | 'video';
  description: string;
  estimatedTime: number;
  status: 'draft' | 'published' | 'completed';
  score?: number;
}

const sampleActivities: DemoActivity[] = [
  {
    id: 'demo-quiz-1',
    title: 'Mathematics Quiz - Algebra Basics',
    type: 'quiz',
    description: 'Test your understanding of basic algebraic concepts',
    estimatedTime: 20,
    status: 'published'
  },
  {
    id: 'demo-reading-1',
    title: 'Introduction to Photosynthesis',
    type: 'reading',
    description: 'Learn about the process of photosynthesis in plants',
    estimatedTime: 15,
    status: 'published'
  },
  {
    id: 'demo-video-1',
    title: 'Physics: Laws of Motion',
    type: 'video',
    description: 'Understanding Newton\'s laws through visual examples',
    estimatedTime: 12,
    status: 'published'
  },
  {
    id: 'demo-quiz-2',
    title: 'History Quiz - World War II',
    type: 'quiz',
    description: 'Test your knowledge of WWII events and timeline',
    estimatedTime: 25,
    status: 'completed',
    score: 85
  }
];

export const ActivitiesV2Demo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateActivity = () => {
    setShowCreator(true);
    setShowViewer(false);
    setSelectedActivity(null);
  };

  const handleViewActivity = (activityId: string) => {
    setSelectedActivity(activityId);
    setShowViewer(true);
    setShowCreator(false);
  };

  const handleActivityCreated = (activity: any) => {
    console.log('Activity created:', activity);
    setShowCreator(false);
    // In a real app, you'd refresh the activities list
  };

  const handleActivityCompleted = (result: any) => {
    console.log('Activity completed:', result);
    setShowViewer(false);
    setSelectedActivity(null);
    // In a real app, you'd update the activity status
  };

  const handleBack = () => {
    setShowCreator(false);
    setShowViewer(false);
    setSelectedActivity(null);
  };

  if (showCreator) {
    return (
      <div className="activities-v2-demo p-6">
        <ActivityV2Creator
          classId="demo-class"
          subjectId="demo-subject"
          topicId="demo-topic"
          onSuccess={handleActivityCreated}
          onCancel={handleBack}
        />
      </div>
    );
  }

  if (showViewer && selectedActivity) {
    return (
      <div className="activities-v2-demo p-6">
        <ActivityV2Viewer
          activityId={selectedActivity}
          onComplete={handleActivityCompleted}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="activities-v2-demo p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activities V2 Demo</h1>
        <p className="text-gray-600">
          Experience the new Activities V2 system with improved performance, 
          better user experience, and comprehensive analytics.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Quiz Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Interactive quizzes with Question Bank integration, 
                  auto-grading, and comprehensive analytics.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Multiple Choice</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>True/False</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Fill in Blanks</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Auto-grading</span>
                    <span>✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Reading Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Engaging reading experiences with progress tracking, 
                  bookmarks, highlights, and notes.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Rich Text</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>External URLs</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>File Uploads</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Progress Tracking</span>
                    <span>✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Video Activities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Video-based learning with watch progress tracking, 
                  completion criteria, and interactive elements.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>YouTube</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Vimeo</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>File Upload</span>
                    <span>✓</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Watch Tracking</span>
                    <span>✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Key Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">100%</div>
                  <div className="text-sm text-gray-600">Question Bank Integration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">Auto</div>
                  <div className="text-sm text-gray-600">Grading System</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">Real-time</div>
                  <div className="text-sm text-gray-600">Progress Tracking</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">Smart</div>
                  <div className="text-sm text-gray-600">Achievement System</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Sample Activities</h2>
            <Button onClick={handleCreateActivity}>
              Create New Activity
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              
              return (
                <Card key={activity.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 ${getActivityColor(activity.type)} rounded-lg flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{activity.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {activity.estimatedTime} min
                      </div>
                      {activity.score && (
                        <div className="text-green-600 font-medium">
                          Score: {activity.score}%
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full" 
                      variant={activity.status === 'completed' ? 'outline' : 'default'}
                      onClick={() => handleViewActivity(activity.id)}
                    >
                      {activity.status === 'completed' ? 'Review' : 'Start Activity'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Analytics dashboard will show comprehensive activity performance metrics,
                  student engagement data, and learning outcome insights.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activities V2 Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Configuration options for Activities V2 system including
                  default settings, achievement configurations, and integration preferences.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
