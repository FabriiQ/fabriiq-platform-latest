'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';
import { ActivityV2Viewer } from '@/features/activities-v2/components/ActivityV2Viewer';

interface ActivityViewerProps {
  activity: any;
  mode?: 'preview' | 'student' | 'teacher';
  onInteraction?: (data: any) => void;
  onComplete?: (data: any) => void;
  disableAnalytics?: boolean;
  institutionId?: string;
  submitButtonProps?: {
    className?: string;
    priority?: number;
  };
}

/**
 * DirectActivityViewer - Exclusively uses Activities V2
 *
 * This component serves as the main entry point for viewing activities.
 * Since we're exclusively using Activities V2, all activities are routed
 * through the ActivityV2Viewer component.
 *
 * Legacy activity support has been completely removed in favor of the
 * unified Activities V2 architecture.
 */
export function DirectActivityViewer({
  activity,
  mode = 'student',
  onInteraction,
  onComplete,
  disableAnalytics = false,
  institutionId = '',
  submitButtonProps = {}
}: ActivityViewerProps) {
  const { data: session } = useSession();

  // Validate activity data
  if (!activity) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert className="border-destructive/50 text-destructive">
            <AlertTitle>Activity Not Found</AlertTitle>
            <AlertDescription>
              The requested activity could not be loaded. Please try again or contact support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Validate activity ID
  if (!activity.id) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert className="border-destructive/50 text-destructive">
            <AlertTitle>Invalid Activity</AlertTitle>
            <AlertDescription>
              This activity is missing required information. Please contact support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Always use ActivityV2Viewer since we're exclusively using Activities V2
  // This ensures consistent behavior and leverages all V2 features
  return (
    <ActivityV2Viewer
      activityId={activity.id}
      studentId={session?.user?.id}
      onComplete={onComplete}
    />
  );
}
