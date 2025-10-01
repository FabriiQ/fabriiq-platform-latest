'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users } from 'lucide-react';
import { ClassSelector } from './components';

/**
 * Main Circle Page
 * 
 * Shows all classes that the student is enrolled in
 * Allows navigation to specific class circles
 * 
 * Route: /student/circle
 */
export default function CirclePage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Fetch student's classes with member counts
  const { 
    data: classesData, 
    isLoading, 
    error 
  } = api.circle.getStudentClassesWithMembers.useQuery(
    undefined,
    {
      enabled: !!session?.user?.id,
      retry: 2,
      refetchOnWindowFocus: false,
    }
  );

  // Handle class selection
  const handleClassSelect = (classId: string) => {
    router.push(`/student/circle/${classId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          </div>

          {/* Content Skeleton */}
          <ClassSelector
            classes={[]}
            onClassSelect={() => {}}
            isLoading={true}
          />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load your classes. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="cursor-pointer">Error details</summary>
                <pre className="text-xs mt-1 whitespace-pre-wrap">
                  {error.message}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
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
            Please log in to view your class circles.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const classes = classesData?.classes || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary rounded-full">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Your Circle 🌟
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Connect with your learning community
              </p>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="bg-muted/50 rounded-lg p-8 border">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome to your learning community! 👋
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Your Circle shows you who's learning alongside you in each class.
                Connect with classmates, collaborate with peers, and build meaningful relationships in your educational journey.
              </p>
              <div className="flex justify-center space-x-6 text-sm text-muted-foreground mt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  <span>See classmates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-secondary rounded-full"></span>
                  <span>Connect with teachers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  <span>Build community</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Class Selector */}
        <ClassSelector
          classes={classes}
          onClassSelect={handleClassSelect}
          isLoading={false}
        />

        {/* Additional Info */}
        {classes.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">
              About Circle
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• See all students and teachers in your classes</li>
              <li>• Build connections with your learning community</li>
              <li>• Know who's on your learning journey with you</li>
              <li>• Feel more connected in your online learning experience</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
