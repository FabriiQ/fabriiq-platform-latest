'use client';

import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { AlertCircle, BookOpen, Clock, Calendar, CheckCircle, ChevronRight } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { EducationalLoadingFact } from '@/components/ui/loading/EducationalLoadingFact';
import { LaborIllusionLoader } from '@/components/ui/loading/LaborIllusionLoader';
import { useState } from 'react';
import { RecentAchievements } from '@/components/rewards/RecentAchievements';
import { useSession } from 'next-auth/react';

// Define a type for activities to help TypeScript
interface ActivityWithDates {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  endDate?: Date; // Optional end date
  subject?: { id: string; name: string; code: string };
  subjectId?: string;
  [key: string]: any; // Allow other properties
}

// Custom refresh icon
const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

/**
 * Subjects page for a class in the student portal
 *
 * Shows all subjects for a class with their progress and activities
 */
export default function ClassSubjectsPage() {
  // Get route parameters and router
  const params = useParams();
  const router = useRouter();
  const classId = params?.id as string || "";
  const { data: session } = useSession();
  const studentId = session?.user?.id || "";

  // State for authentication errors
  const [authError, setAuthError] = useState<string | null>(null);

  // Get class details
  const {
    data: classData,
    isLoading: isClassLoading,
    error: classError,
    refetch: refetchClass
  } = api.student.getClassDetails.useQuery(
    { classId },
    {
      enabled: !!classId,
      retry: 1,
      onError: (error) => {
        console.error("Error fetching class details:", error);
        if (error.data?.code === 'UNAUTHORIZED') {
          setAuthError("Your session has expired. Please refresh the page or log in again.");
        }
      }
    }
  );

  // Get subjects for this class
  const {
    data: subjectsData,
    isLoading: isSubjectsLoading,
    error: subjectsError,
    refetch: refetchSubjects
  } = api.subject.list.useQuery(
    {
      courseId: classData?.courseId,
      take: 100
    },
    {
      enabled: !!classData?.courseId,
      retry: 1,
      onError: (error) => {
        console.error("Error fetching subjects:", error);
        if (error.data?.code === 'UNAUTHORIZED') {
          setAuthError("Your session has expired. Please refresh the page or log in again.");
        }
      }
    }
  );

  // Get activities for this class - fetch even if subjects aren't loaded yet
  const {
    data: activitiesData,
    error: activitiesError,
    refetch: refetchActivities,
    isLoading: isActivitiesLoading
  } = api.student.getClassActivities.useQuery(
    { classId },
    {
      enabled: !!classId, // Don't wait for subjects to load
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 1, // Allow one retry
      onSuccess: (data) => {
        console.log('Activities loaded:', data?.length || 0, 'activities');
        if (data && data.length > 0) {
          console.log('Sample activity:', data[0]);
        }
      },
      onError: (error) => {
        console.error("Error fetching activities:", error);
        if (error.data?.code === 'UNAUTHORIZED') {
          setAuthError("Your session has expired. Please refresh the page or log in again.");
        }
      }
    }
  );

  // Combined loading and error states
  const isLoading = isClassLoading || isSubjectsLoading;
  const error = classError || subjectsError;
  
  // Process subjects data
  const subjects = subjectsData?.items || [];

  // Function to refresh session
  const refreshSession = async () => {
    try {
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing session:", error);
      router.push('/login?callbackUrl=' + encodeURIComponent(`/student/class/${classId}/subjects`));
    }
  };

  // Function to refresh all data
  const refreshData = () => {
    refetchClass();
    refetchSubjects();
    if (refetchActivities) {
      refetchActivities();
    }
  };
  
  // Alternative activity fetch using class.listActivities if student API fails
  const {
    data: alternativeActivitiesData,
    error: altActivitiesError
  } = api.class.listActivities.useQuery(
    {
      classId,
      status: 'ACTIVE' as any
    },
    {
      enabled: !!activitiesError && !!classId, // Only run if main query failed
      onSuccess: (data) => {
        console.log('Alternative activities loaded:', data?.items?.length || 0);
      }
    }
  );
  
  // Show activities loading status
  const shouldShowActivitiesLoading = isActivitiesLoading && !isLoading;
  const hasActivitiesError = activitiesError && altActivitiesError;
  
  // Use alternative data if main query failed
  const finalActivitiesData = activitiesData || alternativeActivitiesData?.items || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-muted-foreground">
            View all subjects and their activities
          </p>
        </div>

        <div className="mb-8">
          <EducationalLoadingFact
            isLoading={true}
            autoRotate={true}
            interval={5000}
          />
        </div>

        <div className="bg-background text-foreground p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">Loading Your Subjects</h2>
          <LaborIllusionLoader
            isLoading={true}
            showTimeRemaining={true}
            totalEstimatedTime={7}
            steps={[
              { label: 'Verifying your session...', duration: 1, weight: 10 },
              { label: 'Loading subject information...', duration: 1.5, weight: 15 },
              { label: 'Fetching activity counts...', duration: 1.5, weight: 15 },
              { label: 'Calculating progress data...', duration: 2, weight: 25 },
              { label: 'Preparing subject materials...', duration: 1.5, weight: 15 },
              { label: 'Checking for new activities...', duration: 1.5, weight: 15 },
              { label: 'Finalizing subject data...', duration: 1, weight: 15 },
            ]}
          />
        </div>
      </div>
    );
  }

  // Show authentication error
  if (authError) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-destructive/50 text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            {authError}
            <div className="mt-4 flex space-x-4">
              <Button
                onClick={refreshSession}
                className="flex items-center"
              >
                <RefreshIcon className="h-4 w-4 mr-2" />
                Refresh Session
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/login?callbackUrl=' + encodeURIComponent(`/student/class/${classId}/subjects`))}
              >
                Log In Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle error state
  if (error || !classData) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-destructive/50 text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? error.message : "Failed to load subjects"}
          </AlertDescription>
        </Alert>
        <Button onClick={refreshData}>Try Again</Button>
      </div>
    );
  }

  // Process activities data and enrich subjects
  const activitiesErrorAlert = hasActivitiesError && (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Activities Not Available</AlertTitle>
      <AlertDescription>
        We couldn't load activities for this class. You can still view subjects, but activity counts may not be accurate.
        {activitiesError && (
          <div className="mt-2 text-xs opacity-75">
            Error: {activitiesError.message}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
  
  // Show loading indicator for activities if needed
  const activitiesLoadingAlert = shouldShowActivitiesLoading && (
    <Alert className="border-blue-200 bg-blue-50 text-blue-800 mb-4">
      <Clock className="h-4 w-4" />
      <AlertTitle>Loading Activities</AlertTitle>
      <AlertDescription>
        Loading activity data to show accurate counts on subject cards...
      </AlertDescription>
    </Alert>
  );



  // Prepare enriched subjects with activity data
  const enrichedSubjects = subjects.map(subject => {
    // Filter activities for this subject with better matching logic
    const subjectActivities = finalActivitiesData?.filter(
      (activity: any) => {
        // Check if the subject property exists and matches the subject id
        if (activity.subject && activity.subject.id === subject.id) {
          return true;
        }
        // Fallback to subjectId if subject object is not available
        if (activity.subjectId === subject.id) {
          return true;
        }
        // Additional check for topic-based activities
        if (activity.topic && activity.topic.subjectId === subject.id) {
          return true;
        }
        return false;
      }
    ) || [];
    
    // Debug logging to help identify issues
    console.log(`Subject ${subject.name} (${subject.id}):`, {
      totalActivities: finalActivitiesData?.length || 0,
      matchedActivities: subjectActivities.length,
      sampleActivity: finalActivitiesData?.[0] ? {
        id: finalActivitiesData[0].id,
        subjectId: finalActivitiesData[0].subjectId,
        subject: finalActivitiesData[0].subject,
        topic: finalActivitiesData[0].topic
      } : null
    });

    // Count completed and pending activities
    const completedActivities = subjectActivities.filter(
      (activity: any) => {
        try {
          // Check for different status formats (uppercase, lowercase)
          const status = activity.status ? String(activity.status).toUpperCase() : '';
          // Include SUBMITTED status as completed to match the behavior in SubjectActivitiesView
          return status === 'COMPLETED' || status === 'GRADED' || status === 'SUBMITTED';
        } catch (e) {
          console.error("Error checking completed status:", e);
          return false;
        }
      }
    ).length;

    const pendingActivities = subjectActivities.filter(
      (activity: any) => {
        try {
          if (!activity.status) return true;
          const status = String(activity.status).toUpperCase();
          // Make sure we don't count activities that are already marked as completed
          if (status === 'COMPLETED' || status === 'GRADED' || status === 'SUBMITTED') {
            return false;
          }
          return status === 'PENDING' || status === 'ASSIGNED' || status === 'ACTIVE';
        } catch (e) {
          console.error("Error checking pending status:", e);
          return true; // Default to pending if there's an error
        }
      }
    ).length;

    // Calculate progress
    const progress = subjectActivities.length > 0
      ? Math.round((completedActivities / subjectActivities.length) * 100)
      : 0;

    // Get the most recent activity
    let lastActivityText = 'No activity';

    try {
      if (subjectActivities.length > 0) {
        // Create a safe copy of the activities array and cast to our interface
        const sortedActivities = [...subjectActivities].sort((a, b) => {
          // Cast to our interface to help TypeScript
          const activityA = a as ActivityWithDates;
          const activityB = b as ActivityWithDates;

          // Safely get dates, defaulting to current time if missing
          let dateA: Date, dateB: Date;

          try {
            dateA = activityA.updatedAt ? new Date(activityA.updatedAt) :
                   activityA.endDate ? new Date(activityA.endDate) :
                   activityA.createdAt ? new Date(activityA.createdAt) : new Date();
          } catch (e) {
            dateA = new Date();
          }

          try {
            dateB = activityB.updatedAt ? new Date(activityB.updatedAt) :
                   activityB.endDate ? new Date(activityB.endDate) :
                   activityB.createdAt ? new Date(activityB.createdAt) : new Date();
          } catch (e) {
            dateB = new Date();
          }

          return dateB.getTime() - dateA.getTime();
        });

        if (sortedActivities.length > 0) {
          // Cast to our interface to help TypeScript
          const mostRecent = sortedActivities[0] as ActivityWithDates;
          let lastActivityDate: Date;

          try {
            // Safely access properties with our interface
            lastActivityDate = mostRecent.updatedAt ? new Date(mostRecent.updatedAt) :
                              mostRecent.endDate ? new Date(mostRecent.endDate) :
                              mostRecent.createdAt ? new Date(mostRecent.createdAt) : new Date();

            const now = new Date();
            const diffDays = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
              lastActivityText = 'Today';
            } else if (diffDays === 1) {
              lastActivityText = 'Yesterday';
            } else if (diffDays < 7) {
              lastActivityText = `${diffDays} days ago`;
            } else {
              lastActivityText = lastActivityDate.toLocaleDateString();
            }
          } catch (e) {
            console.error("Error formatting activity date:", e);
            lastActivityText = 'Recently';
          }
        }
      }
    } catch (e) {
      console.error("Error processing activity dates:", e);
      lastActivityText = 'Recently';
    }

    // Find in-progress activities
    const inProgressActivities = subjectActivities.filter(
      (activity: any) => {
        try {
          if (!activity.status) return false;
          const status = String(activity.status).toUpperCase();
          // Make sure we don't count activities that are already marked as completed
          if (status === 'COMPLETED' || status === 'GRADED' || status === 'SUBMITTED') {
            return false;
          }
          // Check for in-progress status
          return status === 'PENDING' || status === 'UPCOMING' || status === 'IN_PROGRESS' || status === 'STARTED' || status === 'DRAFT';
        } catch (e) {
          console.error("Error checking activity status:", e);
          return false;
        }
      }
    ).length;

    // Assign an icon based on subject name
    let icon = '📚';
    const subjectNameLower = subject.name.toLowerCase();
    if (subjectNameLower.includes('math')) icon = '📐';
    else if (subjectNameLower.includes('science') || subjectNameLower.includes('physics') || subjectNameLower.includes('chemistry')) icon = '🔬';
    else if (subjectNameLower.includes('english') || subjectNameLower.includes('literature')) icon = '📚';
    else if (subjectNameLower.includes('history')) icon = '🏛️';
    else if (subjectNameLower.includes('art')) icon = '🎨';
    else if (subjectNameLower.includes('music')) icon = '🎵';
    else if (subjectNameLower.includes('computer') || subjectNameLower.includes('programming')) icon = '💻';

    // Extract description from syllabus properly
    let description = `${subject.name} activities and resources`;
    if (subject.syllabus) {
      if (typeof subject.syllabus === 'string') {
        description = subject.syllabus.substring(0, 100);
      } else if (typeof subject.syllabus === 'object') {
        // If syllabus is an object, try to extract meaningful text
        if (subject.syllabus.description) {
          description = subject.syllabus.description.substring(0, 100);
        } else if (subject.syllabus.overview) {
          description = subject.syllabus.overview.substring(0, 100);
        } else if (subject.syllabus.summary) {
          description = subject.syllabus.summary.substring(0, 100);
        } else {
          // If it's an object but no clear description field, create a readable summary
          const keys = Object.keys(subject.syllabus);
          if (keys.length > 0) {
            description = `Covers ${keys.join(', ').toLowerCase()} and related topics`;
          }
        }
      }
    }

    return {
      id: subject.id,
      name: subject.name,
      description: description,
      progress,
      activitiesCount: subjectActivities.length,
      completedActivities,
      pendingActivities,
      nextDeadline: pendingActivities > 0 ? 'Check activities' : 'No deadlines',
      lastActivity: lastActivityText,
      icon,
      inProgressActivities
    };
  });

  // Handle empty subjects
  if (enrichedSubjects.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-muted-foreground">
            View all subjects and their activities
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{classData?.className}</h2>
          <p className="text-muted-foreground">
            {classData?.courseName} {classData?.termName ? `• ${classData?.termName}` : ''}
          </p>
        </div>

        {/* Show activities loading or error alerts */}
        {activitiesLoadingAlert}
        {activitiesErrorAlert}

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Subjects Available</h3>
              <p className="text-muted-foreground">
                There are no subjects available for this class yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content with subjects
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Subjects</h1>
        <p className="text-muted-foreground">
          View all subjects and their activities
        </p>
      </div>

      {/* Class info */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{classData?.className}</h2>
        <p className="text-muted-foreground">
          {classData?.courseName} {classData?.termName ? `• ${classData?.termName}` : ''}
        </p>
      </div>

      {/* Show activities loading or error alerts */}
      {activitiesLoadingAlert}
      {activitiesErrorAlert}

      {/* Subjects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrichedSubjects.map((subject) => (
          <Card key={subject.id} className="overflow-hidden hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <span className="mr-2">{subject.icon}</span>
                    {subject.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{subject.description}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pb-2">
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{subject.progress}%</span>
                  </div>
                  <Progress
                    value={subject.progress}
                    className="h-2"
                  />
                </div>

                {/* Activity stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Activities</span>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1 text-primary" />
                      <span className="font-medium">{subject.activitiesCount}</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Completed</span>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      <span className="font-medium">{subject.completedActivities}</span>
                    </div>
                  </div>
                </div>

                {/* Deadline and last activity */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>Next: {subject.nextDeadline}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span>{subject.lastActivity}</span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                variant="outline"
                className="w-full group"
                asChild
              >
                <Link href={`/student/class/${classId}/subjects/${subject.id}/activities`}>
                  <span className="flex items-center justify-center">
                    View Activities
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Recent Achievements Section */}
      {studentId && (
        <RecentAchievements
          studentId={studentId}
          classId={classId}
          limit={3}
          showViewAll={true}
          animated={true}
          title="Recent Class Achievements"
        />
      )}
    </div>
  );
}
