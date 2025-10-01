'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit, BookOpen, Calendar, GraduationCap, MapPin, Mail, User, School, Target, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/atoms/button';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/atoms/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { format } from 'date-fns';
import { StudentMasteryProfile } from '@/features/bloom/components/mastery/StudentMasteryProfile';
import { StudentLearningProfile } from '@/features/learning-patterns/components/StudentLearningProfile';

export default function SystemStudentDetailPage() {
  const params = useParams();
  const studentId = params?.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch student details with real-time updates
  const { data: student, isLoading: isLoadingStudent, error: studentError } = api.systemAnalytics.getStudentById.useQuery(
    { id: studentId },
    {
      enabled: !!studentId,
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      onSuccess: () => {
        setIsOnline(true);
        setLastUpdate(new Date());
      },
      onError: () => {
        setIsOnline(false);
      }
    }
  );

  // Fetch learning patterns for the student with real-time updates
  const { data: learningPatterns, isLoading: isLoadingPatterns, error: learningPatternsError, refetch: refetchPatterns } = api.learningPatterns.analyzeStudentPatterns.useQuery(
    { studentId },
    {
      enabled: !!studentId,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for real-time updates
      staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
      onSuccess: () => {
        setIsOnline(true);
        setLastUpdate(new Date());
      },
      onError: () => {
        setIsOnline(false);
      }
    }
  );

  // Fetch mastery analytics for the student with real-time updates
  const { data: masteryAnalytics, isLoading: isLoadingMastery, error: masteryError, refetch: refetchMastery } = api.mastery.getStudentAnalytics.useQuery(
    { studentId },
    {
      enabled: !!studentId,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for real-time updates
      staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
      onSuccess: () => {
        setIsOnline(true);
        setLastUpdate(new Date());
      },
      onError: () => {
        setIsOnline(false);
      }
    }
  );

  // Manual refresh function for real-time updates
  const handleRefreshData = () => {
    refetchPatterns();
    refetchMastery();
  };

  // Monitor network status for real-time updates
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Refetch data when coming back online
      handleRefreshData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-refresh data every 5 minutes when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      handleRefreshData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isOnline]);

  if (isLoadingStudent) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (studentError) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <PageHeader
          title="Error Loading Student"
          description={studentError.message || "An error occurred while loading the student details."}
        />
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/admin/system/students">Back to Students</Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <PageHeader
          title="Student Not Found"
          description="The requested student could not be found."
        />
        <Button asChild>
          <Link href="/admin/system/students">Back to Students</Link>
        </Button>
      </div>
    );
  }

  // Format date function
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system/students">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Link>
          </Button>
          <PageHeader
            title={`Student: ${student.name}`}
            description={student.email}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={
            student.status === 'ACTIVE' ? 'success' :
            student.status === 'INACTIVE' || student.status === 'ARCHIVED' ? 'warning' :
            'secondary'
          }>
            {student.status.charAt(0) + student.status.slice(1).toLowerCase()}
          </Badge>

          {/* Connection Status */}
          <Badge variant={isOnline ? 'success' : 'destructive'} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: isOnline ? 'rgb(22 163 74)' : 'rgb(220 38 38)' }} />
            {isOnline ? 'Live' : 'Offline'}
          </Badge>

          {/* Last Update Time */}
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isLoadingPatterns || isLoadingMastery}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingPatterns || isLoadingMastery) ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/system/students/${studentId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={`https://avatar.vercel.sh/${student.name}`} alt={student.name} />
                <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
              </div>
            </div>

            {student.profile?.enrollmentNumber && (
              <div className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">ID:</span>
                <span className="ml-2">{student.profile.enrollmentNumber}</span>
              </div>
            )}

            {student.campuses.length > 0 && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Campus:</span>
                <span className="ml-2">{student.campuses.find(c => c.isPrimary)?.name || student.campuses[0].name}</span>
              </div>
            )}

            {student.enrollments.length > 0 && (
              <div className="flex items-center">
                <School className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Program:</span>
                <span className="ml-2">{student.enrollments[0]?.program?.name || 'Not assigned'}</span>
              </div>
            )}

            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">Enrolled:</span>
              <span className="ml-2">{formatDate(student.createdAt)}</span>
            </div>

            {student.profile?.currentGrade && (
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium">Current Grade:</span>
                <span className="ml-2">{student.profile.currentGrade}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">{student.classes.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">Programs</p>
                <p className="text-2xl font-bold">{student.enrollments.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold">{student.profile?.attendanceRate ? `${Math.round(student.profile.attendanceRate * 100)}%` : 'N/A'}</p>
              </div>
              <div className="p-3 bg-muted rounded-md text-center">
                <p className="text-sm text-muted-foreground">Academic Score</p>
                <p className="text-2xl font-bold">{student.profile?.academicScore ? student.profile.academicScore.toFixed(1) : 'N/A'}</p>
              </div>
            </div>

            {student.profile?.participationRate !== null && student.profile?.participationRate !== undefined && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Participation Rate</p>
                <p className="font-bold">{Math.round(student.profile.participationRate * 100)}%</p>
              </div>
            )}

            {student.profile?.lastCounseling && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Last Counseling</p>
                <p className="font-bold">{formatDate(student.profile.lastCounseling)}</p>
              </div>
            )}

            {student.profile?.lastParentMeeting && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Last Parent Meeting</p>
                <p className="font-bold">{formatDate(student.profile.lastParentMeeting)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="font-medium">Email:</span>
              <span className="ml-2">{student.email}</span>
            </div>

            {student.profile?.guardianInfo && (
              <div>
                <h3 className="text-sm font-medium mb-2">Guardian Information</h3>
                <div className="space-y-2 pl-2 border-l-2 border-muted">
                  {typeof student.profile.guardianInfo === 'object' && student.profile.guardianInfo !== null && (
                    <>
                      {'name' in student.profile.guardianInfo && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Name:</span>
                          <span className="ml-2">{(student.profile.guardianInfo as any).name}</span>
                        </div>
                      )}
                      {'email' in student.profile.guardianInfo && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Email:</span>
                          <span className="ml-2">{(student.profile.guardianInfo as any).email}</span>
                        </div>
                      )}
                      {'phone' in student.profile.guardianInfo && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Phone:</span>
                          <span className="ml-2">{(student.profile.guardianInfo as any).phone}</span>
                        </div>
                      )}
                      {'relationship' in student.profile.guardianInfo && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Relationship:</span>
                          <span className="ml-2">{(student.profile.guardianInfo as any).relationship}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="learning-profile">
            <User className="h-4 w-4 mr-2" />
            Learning Profile
          </TabsTrigger>
          <TabsTrigger value="mastery">
            <Target className="h-4 w-4 mr-2" />
            Mastery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Student Overview</CardTitle>
              <CardDescription>General information about this student</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{student.classes?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Active Classes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {student.profile?.academicHistory ? 'Yes' : 'No'}
                    </div>
                    <div className="text-sm text-muted-foreground">Academic History</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {student.profile?.interests?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Interests</div>
                  </div>
                </div>

                {/* Basic Student Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Student Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Student ID:</span>
                        <span className="font-medium">{student.profile?.enrollmentNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{student.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={student.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Joined:</span>
                        <span className="font-medium">{formatDate(student.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      {typeof student.profile?.guardianInfo === 'object' && student.profile?.guardianInfo && 'phone' in student.profile.guardianInfo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{(student.profile.guardianInfo as any).phone}</span>
                        </div>
                      )}
                      {typeof student.profile?.guardianInfo === 'object' && student.profile?.guardianInfo && 'address' in student.profile.guardianInfo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-medium">{(student.profile.guardianInfo as any).address}</span>
                        </div>
                      )}
                      {typeof student.profile?.guardianInfo === 'object' && student.profile?.guardianInfo && 'dateOfBirth' in student.profile.guardianInfo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date of Birth:</span>
                          <span className="font-medium">{formatDate((student.profile.guardianInfo as any).dateOfBirth as any)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {student.profile?.interests && student.profile.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {student.profile.interests.map((interest, index) => (
                        <Badge key={index} variant="outline">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {student.profile?.achievements && student.profile.achievements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Achievements</h3>
                    <div className="space-y-2">
                      {student.profile.achievements.map((achievement, index) => {
                        if (typeof achievement === 'object' && achievement !== null) {
                          return (
                            <div key={index} className="p-3 border rounded-md">
                              {'title' in achievement && <p className="font-medium">{(achievement as any).title}</p>}
                              {'date' in achievement && <p className="text-sm text-muted-foreground">{formatDate((achievement as any).date)}</p>}
                              {'description' in achievement && <p className="mt-1">{(achievement as any).description}</p>}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {student.profile?.academicHistory && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Academic History</h3>
                    <div className="p-3 border rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(student.profile.academicHistory, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {student.profile?.specialNeeds && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Special Needs</h3>
                    <div className="p-3 border rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">
                        {JSON.stringify(student.profile.specialNeeds, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Classes this student is enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {student.classes.length > 0 ? (
                <div className="space-y-4">
                  {student.classes.map((cls) => (
                    <div key={cls.id} className="p-4 border rounded-md">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{cls.class.name}</h3>
                          <p className="text-sm text-muted-foreground">{cls.class.code}</p>
                        </div>
                        <Badge variant={cls.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {cls.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{cls.class.course.name}</span>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{cls.class.term.name}</span>
                        </div>

                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{cls.class.campus.name}</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/system/classes/${cls.class.id}`}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Class
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No classes found for this student.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grades</CardTitle>
              <CardDescription>Academic performance and grades</CardDescription>
            </CardHeader>
            <CardContent>
              {student.grades.length > 0 ? (
                <div className="space-y-4">
                  {student.grades.map((grade) => (
                    <div key={grade.id} className="p-4 border rounded-md">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{grade.class?.name || 'Unknown Class'}</h3>
                          <p className="text-sm text-muted-foreground">Grade recorded on {formatDate(grade.createdAt)}</p>
                        </div>
                        {grade.letterGrade && (
                          <Badge variant="outline" className="text-lg">
                            {grade.letterGrade}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {grade.finalGrade !== null && grade.finalGrade !== undefined && (
                          <div className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">Final Grade:</span>
                            <span className="ml-2">{grade.finalGrade.toFixed(1)}</span>
                          </div>
                        )}

                        {grade.attendance !== null && grade.attendance !== undefined && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">Attendance:</span>
                            <span className="ml-2">{Math.round(grade.attendance * 100)}%</span>
                          </div>
                        )}
                      </div>

                      {grade.comments && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">Comments:</p>
                          <p className="text-sm mt-1">{grade.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No grades found for this student.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <CardTitle>Program Enrollments</CardTitle>
              <CardDescription>Programs this student is enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {student.enrollments.length > 0 ? (
                <div className="space-y-4">
                  {student.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="p-4 border rounded-md">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{enrollment.program?.name || 'Unknown Program'}</h3>
                          <p className="text-sm text-muted-foreground">{enrollment.campus.name}</p>
                        </div>
                        <Badge variant={enrollment.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Term:</span>
                          <span className="ml-2">{enrollment.term.name}</span>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">Start Date:</span>
                          <span className="ml-2">{formatDate(enrollment.startDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No program enrollments found for this student.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning-profile">
          <Card>
            <CardHeader>
              <CardTitle>Learning Profile</CardTitle>
              <CardDescription>Student's learning patterns and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPatterns ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : learningPatterns ? (
                <>
                  <StudentLearningProfile
                    studentId={studentId}
                    studentName={student?.name || 'Student'}
                    profile={learningPatterns}
                  />

                  {student.profile?.achievements && student.profile.achievements.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Achievements</h3>
                      <div className="space-y-2">
                        {student.profile.achievements.map((achievement, index) => (
                          typeof achievement === 'object' && achievement !== null ? (
                            <div key={index} className="p-3 border rounded-md">
                              {'title' in achievement && <p className="font-medium">{(achievement as any).title}</p>}
                              {'date' in achievement && <p className="text-sm text-muted-foreground">{formatDate((achievement as any).date)}</p>}
                              {'description' in achievement && <p className="mt-1">{(achievement as any).description}</p>}
                            </div>
                          ) : null
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Learning Profile Data</h3>
                  <p className="text-muted-foreground">
                    {learningPatternsError
                      ? "Unable to analyze learning patterns. This may be due to insufficient activity data."
                      : "Learning patterns will appear as the student completes more activities."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mastery">
          <Card>
            <CardHeader>
              <CardTitle>Mastery Profile</CardTitle>
              <CardDescription>Student's mastery across cognitive levels and topics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMastery ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : masteryError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Unable to load mastery data. Please try refreshing the page.
                  </p>
                </div>
              ) : (
                <StudentMasteryProfile
                  studentId={studentId}
                  studentName={student?.name || 'Student'}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
