'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  BarChart3, 
  Users, 
  Target,
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  Play,
  HelpCircle,
  Download,
  RefreshCw
} from "lucide-react";
import { ActivityV2Content } from "@/features/activities-v2/types";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface ActivityV2AnalyticsPageProps {
  activity: any;
  classId: string;
  teacherId: string;
}

export function ActivityV2AnalyticsPage({ activity, classId, teacherId }: ActivityV2AnalyticsPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  const content = activity.content as ActivityV2Content;

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
    router.push(`/teacher/classes/${classId}/activities-v2/${activity.id}`);
  };

  const handleExportAnalytics = async () => {
    setIsExporting(true);
    try {
      // TODO: Implement analytics export
      toast.success('Analytics export will be available soon');
    } catch (error) {
      toast.error('Failed to export analytics');
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = getActivityIcon(content.type);
  const submissions = activity.activityGrades || [];
  const completionRate = submissions.length > 0 ? 
    (submissions.filter((s: any) => s.status === 'GRADED').length / submissions.length) * 100 : 0;
  const averageScore = submissions.length > 0 ? 
    submissions.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / submissions.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activity
          </Button>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getActivityColor(content.type)}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Analytics: {content.title}</h1>
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
          <Button variant="outline" onClick={handleExportAnalytics} disabled={isExporting}>
            {isExporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Analytics
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Submissions</span>
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Performance Trend</span>
            </div>
            <p className="text-2xl font-bold">+5.2%</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="questions">Question Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{submissions.length}</p>
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{completionRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{averageScore.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {content.estimatedTimeMinutes || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Est. Time (min)</p>
                  </div>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Detailed Analytics Coming Soon</p>
                  <p className="text-sm">
                    Advanced analytics including performance trends, question-level analysis, 
                    time tracking, and engagement metrics will be available in the next update.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Performance Analytics</p>
                <p className="text-sm">
                  Detailed performance metrics, score distributions, and improvement trends 
                  will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Engagement Analytics</p>
                <p className="text-sm">
                  Time spent, interaction patterns, and engagement metrics 
                  will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Question Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Question-Level Analytics</p>
                <p className="text-sm">
                  Individual question performance, difficulty analysis, and response patterns 
                  will be shown here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
