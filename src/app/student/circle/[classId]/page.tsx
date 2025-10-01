'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft, Users } from 'lucide-react';
import { CircleHeader, CircleGrid } from '../components';

/**
 * Class-Specific Circle Page
 * 
 * Shows all members (students and teachers) for a specific class
 * Provides social learning context and peer visibility
 * 
 * Route: /student/circle/[classId]
 */
export default function ClassCirclePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const classId = params?.classId as string;

  // Check if user has access to this class
  const { 
    data: accessData, 
    isLoading: isCheckingAccess 
  } = api.circle.checkClassAccess.useQuery(
    { classId },
    {
      enabled: !!classId && !!session?.user?.id,
      retry: 1,
    }
  );

  // Fetch class members
  const { 
    data: membersData, 
    isLoading: isLoadingMembers, 
    error: membersError 
  } = api.circle.getClassMembers.useQuery(
    { 
      classId,
      includeCurrentUser: true 
    },
    {
      enabled: !!classId && !!session?.user?.id && accessData?.hasAccess === true,
      retry: 2,
      refetchOnWindowFocus: false,
    }
  );

  // Handle back navigation
  const handleBack = () => {
    router.push('/student/circle');
  };

  // Loading state
  if (isCheckingAccess || isLoadingMembers) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span>Back to Circle</span>
          </Button>

          {/* Loading Content */}
          <div className="space-y-6">
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-muted rounded w-64" />
              <div className="h-4 bg-muted rounded w-96" />
              <div className="flex space-x-4">
                <div className="h-9 bg-muted rounded w-24" />
                <div className="h-9 bg-muted rounded w-20" />
                <div className="h-9 bg-muted rounded w-22" />
              </div>
            </div>
            
            <CircleGrid
              members={[]}
              currentUserId={session?.user?.id || ''}
              classInfo={{
                id: '',
                name: '',
                code: '',
                courseName: '',
                termName: ''
              }}
              isLoading={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // No session
  if (!session?.user?.id) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view class circles.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Access denied
  if (accessData && !accessData.hasAccess) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span>Back to Circle</span>
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have access to this class circle. You must be enrolled in the class to view its members.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Error state
  if (membersError) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span>Back to Circle</span>
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load class members. Please try refreshing the page.
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Error details</summary>
                  <pre className="text-xs mt-1 whitespace-pre-wrap">
                    {membersError.message}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // No data
  if (!membersData) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span>Back to Circle</span>
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No class data found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { classInfo, members, counts } = membersData;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <CircleHeader
          classInfo={classInfo}
          memberCounts={counts}
          showBackButton={true}
          onBack={handleBack}
        />

        {/* Members Grid */}
        <CircleGrid
          members={members}
          currentUserId={session.user.id}
          classInfo={classInfo}
          isLoading={false}
        />

        {/* Additional Context */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">
                Your Learning Community
              </h3>
              <p className="text-sm text-muted-foreground">
                These are the people sharing your learning journey in{' '}
                <span className="font-medium text-foreground">{classInfo.courseName}</span>.
                Connect, collaborate, and learn together!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
