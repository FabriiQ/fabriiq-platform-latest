'use client';

import React, { useState } from 'react';
import { CognitiveBalanceReport, MasteryProgressReport } from '@/features/bloom/components';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { api } from '@/trpc/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface BloomReportsPageProps {
  params: Promise<{
    classId: string;
  }>;
}

export default function BloomReportsPage({ params }: BloomReportsPageProps) {
  const { classId } = React.use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('mastery');

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  // Get class data with optimized query options
  const { data: classData, isLoading: isLoadingClass } = api.teacher.getClassById.useQuery({
    classId
  }, {
    // Prevent unnecessary refetches
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Show loading state
  if (status === 'loading' || isLoadingClass) {
    return (
      <div className="container py-8">
        <Skeleton className="h-12 w-1/3 mb-6" />
        <Skeleton className="h-8 w-1/4 mb-8" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Check if user is a teacher
  if (session?.user?.userType !== 'TEACHER' && session?.user?.userType !== 'CAMPUS_TEACHER') {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the class reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if class exists
  if (!classData) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Class Not Found</AlertTitle>
          <AlertDescription>
            The class you are trying to view does not exist or you do not have permission to access it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href={`/teacher/classes/${classId}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Class
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {classData.name} - Bloom's Taxonomy Reports
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="mastery">Mastery Progress</TabsTrigger>
          <TabsTrigger value="cognitive">Cognitive Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="mastery">
          <MasteryProgressReport
            classId={classId}
            teacherId={session.user.id}
          />
        </TabsContent>

        <TabsContent value="cognitive">
          <CognitiveBalanceReport
            classId={classId}
            teacherId={session.user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
