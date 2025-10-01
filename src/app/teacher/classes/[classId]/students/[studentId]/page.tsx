"use client";

import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronLeft, User, BookOpen, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';
import { StudentTopicMasteryDashboard } from '@/features/bloom/components/student/StudentTopicMasteryDashboard';
import { StudentLearningProfile } from '@/features/learning-patterns/components/StudentLearningProfile';
import { LearningTimeAnalytics } from '@/components/analytics/LearningTimeAnalytics';
import { createDemoStudentProfile, createDemoClassData, createDemoAchievements, createDemoLearningPatterns, createDemoRewards } from '@/utils/demo-data';

/**
 * Student Profile Analytics Page
 * Shows comprehensive student profile information and analytics for teachers
 */
export default function StudentProfilePage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const classId = params?.classId as string;
  const studentId = params?.studentId as string;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // DEMO MODE - All queries disabled, using demo data only
  const { data: classInfo } = api.class.getById.useQuery({ classId }, { enabled: false });
  const { data: studentInfo } = api.systemAnalytics.getStudentById.useQuery({ id: studentId }, { enabled: false });
  const { data: studentProfile } = api.user.getProfile.useQuery(
      { userId: studentId, userType: 'CAMPUS_STUDENT' },
      { enabled: false }
    );
  const { data: achievements } = api.achievement.getStudentAchievements.useQuery(
      { studentId, classId },
      { enabled: false }
    );
  const { data: learningPatterns } = api.learningPatterns.analyzeStudentPatterns.useQuery({ studentId }, { enabled: false });

  // Force all loading states to false for demo mode
  const classLoading = false;
  const studentLoading = false;
  const profileLoading = false;
  const achievementsLoading = false;
  const patternsLoading = false;
  const classError = null;
  const studentError = null;
  const patternsError = null;

  // Type guard to ensure we have a student profile
  const isStudentProfile = (profile: any): profile is {
    id: string;
    userId: string;
    enrollmentNumber: string;
    currentGrade: string | null;
    interests: string[];
    specialNeeds: any;
  } => {
    return profile && 'enrollmentNumber' in profile;
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!session?.user) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Authorization check
  if (session.user.userType !== 'CAMPUS_TEACHER' && session.user.userType !== 'TEACHER') {
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

  // Loading state
  if (classLoading || studentLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  // Error handling
  if (classError || studentError) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading student profile: {(classError as any)?.message || (studentError as any)?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fallback demo data if API fails
  const fallbackClassInfo = createDemoClassData(classId);
  const fallbackStudentInfo = createDemoStudentProfile(studentId);
  const fallbackStudentProfile = {
    id: `profile-${studentId}`,
    userId: studentId,
    enrollmentNumber: "STU2024001",
    currentGrade: "Grade 10",
    interests: ["Mathematics", "Science", "Technology"],
    specialNeeds: null
  };
  const fallbackAchievements = createDemoAchievements();
  const fallbackRewards = createDemoRewards();
  const fallbackLearningPatterns = createDemoLearningPatterns();

  // Use fallback data if API data is not available
  const displayClassInfo = classInfo || fallbackClassInfo;
  const displayStudentInfo = studentInfo || fallbackStudentInfo;
  const displayStudentProfile = studentProfile || fallbackStudentProfile;
  const displayAchievements = (achievements && achievements.length > 0) ? achievements : fallbackAchievements;
  const displayLearningPatterns = learningPatterns || fallbackLearningPatterns;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={`/teacher/classes/${classId}/students`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">
            Student Profile - {displayStudentInfo.name}
          </h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive profile and analytics for {displayStudentInfo.name} in {displayClassInfo.name}
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Student ID</p>
                <p className="text-xs text-muted-foreground">
                  {isStudentProfile(displayStudentProfile) ? displayStudentProfile.enrollmentNumber : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Grade Level</p>
                <p className="text-xs text-muted-foreground">
                  {isStudentProfile(displayStudentProfile) ? displayStudentProfile.currentGrade || 'N/A' : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Achievements</p>
                <p className="text-xs text-muted-foreground">{displayAchievements?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="mastery">Mastery Profile</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
                <CardDescription>Basic profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <p className="text-sm text-muted-foreground">{displayStudentInfo.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{displayStudentInfo.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Enrollment Number</label>
                    <p className="text-sm text-muted-foreground">
                      {isStudentProfile(displayStudentProfile) ? displayStudentProfile.enrollmentNumber : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Grade</label>
                    <p className="text-sm text-muted-foreground">
                      {isStudentProfile(displayStudentProfile) ? displayStudentProfile.currentGrade || 'N/A' : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Academic history and interests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Interests</label>
                    <p className="text-sm text-muted-foreground">
                      {isStudentProfile(displayStudentProfile) && displayStudentProfile.interests?.length > 0
                        ? displayStudentProfile.interests.join(', ')
                        : 'No interests recorded'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Special Needs</label>
                    <p className="text-sm text-muted-foreground">
                      {isStudentProfile(displayStudentProfile) && displayStudentProfile.specialNeeds
                        ? String(displayStudentProfile.specialNeeds)
                        : 'None recorded'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            {/* Learning Patterns */}
            {displayLearningPatterns ? (
              <StudentLearningProfile
                studentId={studentId}
                studentName={displayStudentInfo.name}
                classId={classId}
                profile={displayLearningPatterns}
              />
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No learning patterns data available yet. Data will appear as the student completes more activities.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Learning Time Analytics */}
            <LearningTimeAnalytics
              studentId={studentId}
              classId={classId}
              timeframe="month"
              showComparison={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="mastery">
          <StudentTopicMasteryDashboard
            studentId={studentId}
            classId={classId}
          />
        </TabsContent>

        <TabsContent value="achievements">
          <div className="space-y-6">
            {/* Achievements Section */}
            <Card>
              <CardHeader>
                <CardTitle>Student Achievements</CardTitle>
                <CardDescription>Academic and engagement awards earned</CardDescription>
              </CardHeader>
              <CardContent>
                {achievementsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : displayAchievements && displayAchievements.length > 0 ? (
                  <div className="space-y-4">
                    {displayAchievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">{achievement.title}</p>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Earned on {achievement.earnedAt.toLocaleDateString()} • {achievement.points} points
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No achievements recorded yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Rewards Section */}
            <Card>
              <CardHeader>
                <CardTitle>Rewards & Badges</CardTitle>
                <CardDescription>Special recognition and collectible rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fallbackRewards.map((reward, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="text-2xl">{reward.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{reward.title}</p>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            reward.rarity === 'LEGENDARY' ? 'bg-purple-100 text-purple-800' :
                            reward.rarity === 'RARE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {reward.rarity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reward.earnedAt.toLocaleDateString()} • {reward.points} points
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
