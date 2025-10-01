'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/atoms/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { QuickTeacherLoading } from '@/components/teacher/loading/TeacherLoadingState';
import {
  Download,
  UploadCloud,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  FileText,
  Eye,
  Edit,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface EnhancedGradebookProps {
  classId: string;
}

interface GradeStats {
  totalStudents: number;
  averageGrade: number;
  passingRate: number;
  completionRate: number;
  gradedActivities: number;
  gradedAssessments: number;
}

interface StudentGradeData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  currentGrade: number | null;
  letterGrade: string | null;
  activitiesCompleted: number;
  assessmentsCompleted: number;
  lastActivity: Date | null;
  trend: 'up' | 'down' | 'stable';
}

export function EnhancedGradebook({ classId }: EnhancedGradebookProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch class details with real-time updates and proper cleanup
  const { data: classDetails, isLoading: isLoadingClass, refetch: refetchClass } = api.class.getById.useQuery({
    classId,
    include: {
      students: true,
      teachers: true
    }
  }, {
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: false, // Stop refetching when tab is not active
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch activities for the class
  const { data: activities, isLoading: isLoadingActivities, refetch: refetchActivities } = api.teacher.getClassActivities.useQuery({
    classId,
    limit: 50
  }, {
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

  // Fetch assessments for the class
  const { data: assessmentsData, isLoading: isLoadingAssessments, refetch: refetchAssessments } = api.assessment.listByClass.useQuery({
    classId,
    page: 1,
    pageSize: 100
  }, {
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

  // Extract assessments from the paginated response
  const assessments = assessmentsData?.items || [];

  // Fetch gradebook data
  const { data: gradebookData, isLoading: isLoadingGradebook, refetch: refetchGradebook } = api.gradebook.getByClassId.useQuery({
    classId
  }, {
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Extract the first gradebook from the array (assuming one gradebook per class)
  const gradebook = gradebookData?.[0];

  // Calculate grade statistics
  const gradeStats: GradeStats = useMemo(() => {
    if (!classDetails || !activities?.items || !assessments) {
      return {
        totalStudents: 0,
        averageGrade: 0,
        passingRate: 0,
        completionRate: 0,
        gradedActivities: 0,
        gradedAssessments: 0
      };
    }

    const students = classDetails.students || [];
    const totalStudents = students.length;

    // Calculate graded activities and assessments
    const gradedActivities = activities.items?.filter(activity =>
      activity.analytics?.gradedSubmissions && activity.analytics.gradedSubmissions > 0
    ).length || 0;

    const gradedAssessments = assessments?.filter(assessment =>
      assessment.submissions && assessment.submissions.length > 0
    ).length || 0;

    // Calculate average grade and passing rate from gradebook
    let averageGrade = 0;
    let passingRate = 0;
    let completionRate = 0;

    if (gradebook && gradebook.studentGrades) {
      const validGrades = gradebook.studentGrades.filter(sg => sg.finalGrade !== null);
      if (validGrades.length > 0) {
        averageGrade = validGrades.reduce((sum, sg) => sum + (sg.finalGrade || 0), 0) / validGrades.length;
        passingRate = (validGrades.filter(sg => (sg.finalGrade || 0) >= 60).length / validGrades.length) * 100;
        completionRate = (validGrades.length / totalStudents) * 100;
      }
    }

    return {
      totalStudents,
      averageGrade,
      passingRate,
      completionRate,
      gradedActivities,
      gradedAssessments
    };
  }, [classDetails, activities, assessments, gradebook]);

  // Process student grade data
  const studentGradeData: StudentGradeData[] = useMemo(() => {
    if (!classDetails || !activities?.items || !assessments) return [];

    return (classDetails.students || []).map(enrollment => {
      const studentId = enrollment.studentId;
      // Note: We'll need to fetch student details separately or include them in the class query
      
      // Find student grade in gradebook
      const studentGrade = gradebook?.studentGrades?.find(sg => sg.studentId === studentId);
      
      // Count completed activities (simplified for now)
      const activitiesCompleted = 0; // TODO: Implement proper activity completion tracking

      // Count completed assessments (simplified for now)
      const assessmentsCompleted = 0; // TODO: Implement proper assessment completion tracking

      // Find last activity (simplified - would need more complex logic for real trend)
      const lastActivity = studentGrade?.updatedAt || null;

      return {
        studentId,
        studentName: `Student ${studentId}`, // TODO: Fetch actual student name
        studentEmail: '', // TODO: Fetch actual student email
        currentGrade: studentGrade?.finalGrade || null,
        letterGrade: studentGrade?.letterGrade || null,
        activitiesCompleted,
        assessmentsCompleted,
        lastActivity,
        trend: 'stable' as const // Simplified - would calculate based on grade history
      };
    });
  }, [classDetails, activities?.items, assessments, gradebook]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchClass(),
        refetchActivities(),
        refetchAssessments(),
        refetchGradebook()
      ]);
      setLastRefresh(new Date());
      toast({
        title: 'Data refreshed',
        description: 'Gradebook data has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh gradebook data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = isLoadingClass || isLoadingActivities || isLoadingAssessments || isLoadingGradebook;

  if (isLoading) {
    return <QuickTeacherLoading configKey="grades" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Class Gradebook</h1>
          <p className="text-muted-foreground">
            {classDetails?.name} • Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Export Feature',
                description: 'Export functionality will be available soon.',
              });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast({
                title: 'Import Feature',
                description: 'Import functionality will be available soon.',
              });
            }}
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {gradeStats.completionRate.toFixed(1)}% have grades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeStats.averageGrade.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {gradeStats.passingRate.toFixed(1)}% passing rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeStats.gradedActivities}</div>
            <p className="text-xs text-muted-foreground">
              {activities?.items?.length || 0} total activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeStats.gradedAssessments}</div>
            <p className="text-xs text-muted-foreground">
              {assessments?.length || 0} total assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>A (90-100%)</span>
                  <span>{studentGradeData.filter(s => (s.currentGrade || 0) >= 90).length} students</span>
                </div>
                <Progress 
                  value={(studentGradeData.filter(s => (s.currentGrade || 0) >= 90).length / gradeStats.totalStudents) * 100} 
                  className="h-2" 
                />
                
                <div className="flex justify-between text-sm">
                  <span>B (80-89%)</span>
                  <span>{studentGradeData.filter(s => (s.currentGrade || 0) >= 80 && (s.currentGrade || 0) < 90).length} students</span>
                </div>
                <Progress 
                  value={(studentGradeData.filter(s => (s.currentGrade || 0) >= 80 && (s.currentGrade || 0) < 90).length / gradeStats.totalStudents) * 100} 
                  className="h-2" 
                />
                
                <div className="flex justify-between text-sm">
                  <span>C (70-79%)</span>
                  <span>{studentGradeData.filter(s => (s.currentGrade || 0) >= 70 && (s.currentGrade || 0) < 80).length} students</span>
                </div>
                <Progress 
                  value={(studentGradeData.filter(s => (s.currentGrade || 0) >= 70 && (s.currentGrade || 0) < 80).length / gradeStats.totalStudents) * 100} 
                  className="h-2" 
                />
                
                <div className="flex justify-between text-sm">
                  <span>D (60-69%)</span>
                  <span>{studentGradeData.filter(s => (s.currentGrade || 0) >= 60 && (s.currentGrade || 0) < 70).length} students</span>
                </div>
                <Progress 
                  value={(studentGradeData.filter(s => (s.currentGrade || 0) >= 60 && (s.currentGrade || 0) < 70).length / gradeStats.totalStudents) * 100} 
                  className="h-2" 
                />
                
                <div className="flex justify-between text-sm">
                  <span>F (Below 60%)</span>
                  <span>{studentGradeData.filter(s => (s.currentGrade || 0) < 60).length} students</span>
                </div>
                <Progress 
                  value={(studentGradeData.filter(s => (s.currentGrade || 0) < 60).length / gradeStats.totalStudents) * 100} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Student</th>
                      <th className="text-left py-3 px-4 font-medium">Current Grade</th>
                      <th className="text-left py-3 px-4 font-medium">Activities</th>
                      <th className="text-left py-3 px-4 font-medium">Assessments</th>
                      <th className="text-left py-3 px-4 font-medium">Trend</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGradeData.map((student) => (
                      <tr key={student.studentId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{student.studentName}</div>
                            <div className="text-sm text-gray-500">{student.studentEmail}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {student.currentGrade !== null ? `${student.currentGrade.toFixed(1)}%` : '-'}
                            </span>
                            {student.letterGrade && (
                              <Badge variant="outline">{student.letterGrade}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {student.activitiesCompleted}/{activities?.items?.length || 0}
                        </td>
                        <td className="py-3 px-4">
                          {student.assessmentsCompleted}/{assessments?.length || 0}
                        </td>
                        <td className="py-3 px-4">
                          {student.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                          {student.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                          {student.trend === 'stable' && <div className="h-4 w-4" />}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teacher/classes/${classId}/students/${student.studentId}/grades`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activities Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage and grade class activities
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Activity</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium">Submissions</th>
                      <th className="text-left py-3 px-4 font-medium">Graded</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities?.items?.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{activity.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {activity.description}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{activity.type}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {activity.dueDate ? new Date(activity.dueDate).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="py-3 px-4">
                          {activity.analytics?.totalSubmissions || 0}
                        </td>
                        <td className="py-3 px-4">
                          {activity.analytics?.gradedSubmissions || 0}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teacher/classes/${classId}/activities/${activity.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teacher/classes/${classId}/activities/${activity.id}/grade`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!activities?.items || activities.items.length === 0) && (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No activities found for this class</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessments Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage and grade class assessments
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Assessment</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium">Submissions</th>
                      <th className="text-left py-3 px-4 font-medium">Avg Score</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments?.map((assessment) => (
                      <tr key={assessment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{assessment.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {assessment.description}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{assessment.category || 'Assessment'}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="py-3 px-4">
                          {assessment.submissions?.length || 0}
                        </td>
                        <td className="py-3 px-4">
                          {assessment.submissions?.length ?
                            (assessment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / assessment.submissions.length).toFixed(1) + '%'
                            : 'N/A'
                          }
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teacher/classes/${classId}/assessments/${assessment.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teacher/classes/${classId}/assessments/${assessment.id}/grade`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!assessments || assessments.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No assessments found for this class</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
