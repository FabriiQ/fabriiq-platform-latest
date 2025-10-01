'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { LearningPatternsDashboard } from '@/features/learning-patterns';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Zap, Users, TrendingUp, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TeacherLearningPatternsPage() {
  const { data: session, status } = useSession();

  // Redirect if not authenticated or not a teacher
  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.userType !== 'CAMPUS_TEACHER') {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available to teachers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get teacher's classes
  const { data: teacherClasses, isLoading: classesLoading } = 
    api.class.getTeacherClasses.useQuery({ teacherId: session.user.id });

  if (classesLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Learning Patterns Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered insights into student learning behaviors and performance patterns across all your classes
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherClasses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active classes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacherClasses?.reduce((total, cls) => total + (cls.studentCount || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pattern Analysis</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI-Powered</div>
            <p className="text-xs text-muted-foreground">
              Advanced analytics
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Real-time</div>
            <p className="text-xs text-muted-foreground">
              Live updates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classes Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Classes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherClasses?.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{classItem.name}</CardTitle>
                <CardDescription>
                  {classItem.studentCount || 0} students • {classItem.subject?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Grade Level:</span>
                    <span className="font-medium">{classItem.gradeLevel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Academic Year:</span>
                    <span className="font-medium">{classItem.academicYear}</span>
                  </div>
                  <Link 
                    href={`/teacher/classes/${classItem.id}/learning-patterns`}
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    View Learning Patterns
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!teacherClasses || teacherClasses.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classes Found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have any classes assigned yet. Once you have classes, you'll be able to view detailed learning patterns and insights for your students.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Features Overview */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Learning Pattern Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI-Powered Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Advanced machine learning algorithms analyze student behavior patterns, learning preferences, and performance trends to provide actionable insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monitor student progress over time, identify improvement trends, and detect early warning signs for students who may need additional support.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Individual Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Detailed learning profiles for each student including learning style preferences, cognitive patterns, and personalized recommendations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Adaptive Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Receive AI-generated suggestions for teaching strategies, content delivery methods, and interventions tailored to each student's learning pattern.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
