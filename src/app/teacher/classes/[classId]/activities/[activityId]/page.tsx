'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/feedback/toast';
import { api } from '@/trpc/react';
import { ActivityViewer, ActivityEditor } from '@/components/teacher/activities-new';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ActivityDetailPage() {
  const params = useParams<{ classId: string; activityId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const classId = params?.classId || '';
  const activityId = params?.activityId || '';

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Validate activityId before making the API call
  const isValidId = Boolean(activityId && activityId !== 'grade' && activityId !== 'edit' && activityId.trim() !== '');

  // First try to fetch as Activities V2
  const { data: activityV2, isLoading: isLoadingV2, error: errorV2 } = api.activityV2.getById.useQuery({
    id: activityId
  }, {
    enabled: isValidId,
    retry: false,
    onError: (error) => {
      // If V2 fails, we'll try legacy below
      console.log('Activity V2 fetch failed, trying legacy:', error.message);
    }
  });

  // If V2 fetch is successful, redirect to V2 route
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  React.useEffect(() => {
    if (activityV2 && !isLoadingV2 && !isRedirecting) {
      console.log('Redirecting to Activities V2 route for activity:', activityId);
      setIsRedirecting(true);
      router.push(`/teacher/classes/${classId}/activities-v2/${activityId}`);
      return;
    }
  }, [activityV2, isLoadingV2, router, classId, activityId, isRedirecting]);

  // Fetch legacy activity only if V2 failed
  const { data: activity, isLoading, error, refetch } = api.activity.getById.useQuery({
    id: activityId
  }, {
    // Only enable if V2 failed and we have a valid ID
    enabled: isValidId && !activityV2 && !isLoadingV2 && !!errorV2,
    retry: false,
    onError: (error) => {
      console.error('Legacy activity fetch error:', error);
      if (error.message.includes('Activity not found')) {
        toast({
          title: "Activity Not Found",
          description: "The requested activity could not be found. Redirecting to activities list...",
          variant: "destructive",
        });
        // Redirect to activities list after a short delay
        setTimeout(() => {
          router.push(`/teacher/classes/${classId}/activities`);
        }, 2000);
      }
    }
  });

  // Check if activity has attempts (submissions)
  const { data: attemptsData } = api.activityGrade.getByActivity.useQuery({
    activityId: activityId
  }, {
    enabled: isValidId && !!activity
  });

  const hasAttempts = attemptsData && attemptsData.length > 0;

  // Update activity mutation
  const updateActivity = api.activity.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Activity updated successfully",
      });
      setMode('view');
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update activity: ${error.message}`,
        variant: "error",
      });
    },
  });

  // Delete activity mutation
  const deleteActivity = api.activity.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Activity deleted successfully",
      });
      router.push(`/teacher/classes/${classId}/activities`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete activity: ${error.message}`,
        variant: "error",
      });
    },
  });

  // Handle edit
  const handleEdit = () => {
    if (hasAttempts) {
      toast({
        title: "Cannot Edit Activity",
        description: "This activity cannot be edited because students have already submitted attempts.",
        variant: "error",
      });
      return;
    }
    setMode('edit');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setMode('view');
  };

  // Handle save
  const handleSave = (updatedActivity: any) => {
    updateActivity.mutate({
      id: activityId,
      title: updatedActivity.title,
      content: updatedActivity,
      isGradable: updatedActivity.isGradable,
    });
  };

  // Handle delete
  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteActivity.mutate({ id: activityId });
  };

  // Handle grade
  const handleGrade = () => {
    router.push(`/teacher/classes/${classId}/activities/${activityId}/grade`);
  };

  // Handle analytics
  const handleAnalytics = () => {
    // Navigate to analytics page (not implemented yet)
    toast({
      title: "Not implemented",
      description: "Analytics functionality is not yet implemented",
    });
  };

  // Loading state - show loading if either V2 or legacy is loading, or if redirecting
  if (isLoadingV2 || isLoading || isRedirecting) {
    return (
      <div className="container mx-auto py-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="text-sm text-gray-500 mt-2">
          {isRedirecting 
            ? 'Redirecting to Activities V2...' 
            : isLoadingV2 
            ? 'Loading activity...' 
            : 'Checking activity format...'
          }
        </div>
      </div>
    );
  }

  // Error state
  if (!isValidId) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Invalid activity ID. Please use the correct URL format.</p>
        </div>
      </div>
    );
  }

  // Show error only if both V2 and legacy have failed and we're not loading
  if ((errorV2 && error && !isLoadingV2 && !isLoading) || (!activity && !activityV2 && !isLoadingV2 && !isLoading && isValidId)) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <h3 className="font-semibold mb-2">Activity Not Found</h3>
          <p className="mb-4">
            {error?.message || errorV2?.message || 'The requested activity could not be found or may have been deleted.'}
          </p>
          <div className="text-sm text-gray-600 mb-4">
            <p>Checked both Activities V2 and legacy formats.</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/teacher/classes/${classId}/activities`)}
              variant="outline"
              size="sm"
            >
              Back to Activities
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure activity content is properly structured
  if (!activity.content || typeof activity.content !== 'object') {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>Invalid activity format. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {mode === 'view' ? (
        <ActivityViewer
          activity={activity.content}
          classId={classId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGrade={handleGrade}
          onAnalytics={handleAnalytics}
        />
      ) : (
        <ActivityEditor
          activity={activity.content}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this activity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
