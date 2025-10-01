'use client';

import React, { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ActivityCard } from "@/components/teacher/activities/ActivityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/feedback/toast";

export default function ClassActivitiesPage() {
  const params = useParams();
  const classId = params?.classId as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch V2 activities for this class with optimized caching
  const { data: activitiesData, isLoading: isLoadingActivities, error: activitiesError, refetch } = api.activityV2.getByClass.useQuery(
    {
      classId,
      pageSize: 50, // Increase limit to show more activities
    },
    {
      enabled: !!classId && !!session?.user?.id && status === 'authenticated',
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 1000 * 60 * 2, // Reduce to 2 minutes for more frequent updates
      cacheTime: 1000 * 60 * 10, // Reduce cache time to 10 minutes
      onError: (error) => {
        console.error('Failed to fetch V2 activities:', error);
        toast({
          title: "Error",
          description: "Failed to load activities. Please try again.",
          variant: "error",
        });
      },
      onSuccess: (data) => {
        console.log('V2 Activities query successful:', data);
      }
    }
  );

  // Transform V2 activities data to match the expected format
  const transformedActivities = useMemo(() => {
    console.log('Raw V2 activities data:', activitiesData);
    console.log('V2 Activities items:', activitiesData?.activities);
    console.log('V2 Activities total:', activitiesData?.total);

    if (!activitiesData?.activities) {
      console.log('No V2 activities found');
      return [];
    }

    return activitiesData.activities.map((activity: any) => {
      console.log('Processing V2 activity:', activity);

      // Ensure title is always present
      const title = activity.title || 'Untitled Activity';

      // Determine activity type from V2 content
      let activityType = 'Activity V2';
      if (activity.content?.type) {
        switch (activity.content.type) {
          case 'quiz':
            activityType = 'Quiz V2';
            break;
          case 'reading':
            activityType = 'Reading V2';
            break;
          case 'video':
            activityType = 'Video V2';
            break;
          default:
            activityType = `${activity.content.type.charAt(0).toUpperCase() + activity.content.type.slice(1)} V2`;
        }
      }

      return {
        id: activity.id,
        title: title,
        description: activity.content?.description || '',
        type: activityType,
        status: (activity.status?.toLowerCase() === 'active' ? 'published' : 'draft') as 'published' | 'draft' | 'archived',
        createdAt: new Date(activity.createdAt),
        updatedAt: new Date(activity.updatedAt),
        author: {
          id: activity.createdBy?.id || '',
          name: activity.createdBy?.name || 'Unknown',
          avatar: undefined,
        },
        stats: {
          totalSubmissions: activity.activityGrades?.length || 0,
          averageScore: 0, // TODO: Calculate from grades
          completionRate: 0, // TODO: Calculate completion rate
          timeSpent: activity.duration || 0,
        },
        settings: {
          maxScore: activity.maxScore || 100,
          timeLimit: activity.duration,
          attempts: 1, // TODO: Get from activity settings
          gradingMethod: (activity.isGradable ? 'auto' : 'manual') as 'auto' | 'manual' | 'hybrid',
        },
        tags: [],
        subject: activity.subject?.name,
        gradeLevel: undefined,
        // Additional properties for V2 activities
        dueDate: activity.endDate,
        startDate: activity.startDate,
        endDate: activity.endDate,
        subjectName: activity.subject?.name,
        topicName: activity.topic?.title,
        participantCount: activity.activityGrades?.length || 0,
        isGradable: activity.isGradable,
        maxScore: activity.maxScore,
        bloomsLevel: activity.bloomsLevel,
        duration: activity.duration,
        purpose: activity.purpose,
        learningType: activity.learningType,
        assessmentType: activity.assessmentType,
        gradingConfig: activity.gradingConfig, // V2 grading config
        classId: classId, // Add classId for ActivityCard
      };
    });
  }, [activitiesData, classId]);

  console.log('Transformed activities:', transformedActivities);
  console.log('Activities query params:', { classId, enabled: !!classId && !!session?.user?.id && status === 'authenticated' });
  console.log('Session status:', status, 'User ID:', session?.user?.id);

  // Show loading state first
  if (status === 'loading') {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Check authentication
  if (status === 'unauthenticated' || !session?.user?.id) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to view class activities.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user is a teacher
  if (session.user.userType !== 'CAMPUS_TEACHER' && session.user.userType !== 'TEACHER') {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be a teacher to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show error state for activities
  if (activitiesError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Class Activities (V2)</h1>
          <Link href={`/teacher/classes/${classId}/activities/create`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Activity
            </Button>
          </Link>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Activities</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load activities: {activitiesError.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state for activities
  if (isLoadingActivities) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Class Activities (V2)</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Class Activities (V2)</h1>
        <Link href={`/teacher/classes/${classId}/activities/create`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Activity
          </Button>
        </Link>
      </div>

      {transformedActivities.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Activities Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {activitiesData?.total === 0
                ? "There are no V2 activities for this class yet. Create your first activity to get started."
                : "No V2 activities match the current filters."
              }
            </p>
            <div className="space-y-2 mb-4 text-sm text-muted-foreground">
              <p>Debug info:</p>
              <p>• Class ID: {classId}</p>
              <p>• Session authenticated: {status === 'authenticated' ? 'Yes' : 'No'}</p>
              <p>• User ID: {session?.user?.id || 'None'}</p>
              <p>• Query enabled: {!!classId && !!session?.user?.id && status === 'authenticated' ? 'Yes' : 'No'}</p>
              <p>• V2 Activities data: {activitiesData ? 'Present' : 'None'}</p>
              <p>• V2 Activities total: {activitiesData?.total || 0}</p>
              <p>• V2 Activities items: {activitiesData?.activities?.length || 0}</p>
              <p>• Error: {typeof activitiesError === 'object' && activitiesError && 'message' in (activitiesError as any) ? (activitiesError as any).message : 'None'}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/teacher/classes/${classId}/activities/create`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </Button>
              </Link>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transformedActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              classId={classId}
              onEdit={() => {
                // Check if activity has attempts before allowing edit
                if (activity.stats.totalSubmissions > 0) {
                  toast({
                    title: "Cannot Edit Activity",
                    description: "This activity cannot be edited because students have already submitted attempts.",
                    variant: "error",
                  });
                  return;
                }
                // Navigate to V2 activity edit route
                router.push(`/teacher/classes/${classId}/activities-v2/${activity.id}?edit=true`);
              }}
              onDuplicate={() => {
                // Handle duplicate - TODO: Implement V2 activity duplication
                toast({
                  title: "Feature Coming Soon",
                  description: "Activity duplication will be available soon.",
                  variant: "info",
                });
              }}
              onDelete={() => {
                // Handle delete - TODO: Implement V2 activity deletion
                toast({
                  title: "Feature Coming Soon",
                  description: "Activity deletion will be available soon.",
                  variant: "info",
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}


