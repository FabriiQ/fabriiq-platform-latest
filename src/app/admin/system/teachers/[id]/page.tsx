'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/atoms/button';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { TeacherProfileCard } from '@/components/teachers/teacher-profile-card';
import { TeacherOverviewTab } from '@/components/teachers/teacher-overview-tab';
import { TeacherClassesTab } from '@/components/teachers/teacher-classes-tab';
import { TeacherSubjectsTab } from '@/components/teachers/teacher-subjects-tab';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Card, CardContent } from '@/components/ui/data-display/card';
import { useToast } from '@/components/ui/feedback/toast';

export default function SystemTeacherDetailPage() {
  const params = useParams();
  const teacherId = params?.id as string;
  const [activeTab, setActiveTab] = useState('overview');
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [isAssignSubjectDialogOpen, setIsAssignSubjectDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const { toast } = useToast();

  // Fetch teacher details
  const { data: teacher, isLoading: isLoadingTeacher, refetch: refetchTeacher } = api.teacher.getTeacherById.useQuery(
    { id: teacherId },
    {
      enabled: !!teacherId,
      retry: 1,
    }
  );

  // Fetch available classes for assignment
  const { data: availableClasses } = api.class.getAvailableClassesForTeacher.useQuery(
    {
      teacherId,
      campusId: teacher?.user?.primaryCampusId || undefined
    },
    {
      enabled: !!teacherId && !!teacher?.user?.primaryCampusId,
    }
  );

  // Fetch available subjects for assignment
  const { data: subjects } = api.subject.getAll.useQuery(
    {
      campusId: teacher?.user?.primaryCampusId || undefined
    },
    {
      enabled: !!teacher?.user?.primaryCampusId,
    }
  );

  // Mutation for assigning classes
  const assignClassMutation = api.class.assignTeacher.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Class assigned successfully',
        variant: 'success',
      });
      setIsAssignClassDialogOpen(false);
      setSelectedClass('');
      void refetchTeacher();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to assign class: ${error.message}`,
        variant: 'error',
      });
    }
  });

  // Mutation for unassigning classes
  const unassignClassMutation = api.class.removeTeacher.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Teacher unassigned from class successfully',
        variant: 'success',
      });
      void refetchTeacher();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to unassign teacher from class: ${error.message}`,
        variant: 'error',
      });
    }
  });

  // Mutation for assigning subjects
  const assignSubjectMutation = api.teacher.assignSubject.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Subject qualification added successfully',
        variant: 'success',
      });
      setIsAssignSubjectDialogOpen(false);
      setSelectedSubject('');
      void refetchTeacher();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add subject qualification: ${error.message}`,
        variant: 'error',
      });
    }
  });

  // Handle class assignment
  const handleAssignClass = () => {
    if (!selectedClass) return;

    assignClassMutation.mutate({
      classId: selectedClass,
      teacherId,
      assignmentType: 'PRIMARY'
    });
  };

  // Handle subject assignment
  const handleAssignSubject = () => {
    if (!selectedSubject) return;

    assignSubjectMutation.mutate({
      teacherId,
      subjectId: selectedSubject,
      level: 'BASIC'
    });
  };

  // Handle class unassignment
  const handleUnassignClass = (classId: string) => {
    unassignClassMutation.mutate({
      classId,
      teacherId
    });
  };

  if (isLoadingTeacher) {
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

  if (!teacher) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <PageHeader
          title="Teacher Not Found"
          description="The requested teacher could not be found."
        />
        <Button asChild>
          <Link href="/admin/system/teachers">Back to Teachers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system/teachers">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Teachers
            </Link>
          </Button>
          <PageHeader
            title={`Teacher: ${teacher.user?.name || 'Unnamed'}`}
            description={teacher.user?.email || 'No email provided'}
          />
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/system/teachers/${teacherId}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <TeacherProfileCard teacher={teacher} showStatusToggle={true} />

        {/* Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TeacherOverviewTab teacher={teacher} />
            </TabsContent>

            <TabsContent value="classes">
              <TeacherClassesTab
                teacher={teacher}
                availableClasses={availableClasses || []}
                isAssignClassDialogOpen={isAssignClassDialogOpen}
                setIsAssignClassDialogOpen={setIsAssignClassDialogOpen}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                handleAssignClass={handleAssignClass}
                handleUnassignClass={handleUnassignClass}
              />
            </TabsContent>

            <TabsContent value="subjects">
              <TeacherSubjectsTab
                teacher={teacher}
                subjects={subjects || []}
                isAssignSubjectDialogOpen={isAssignSubjectDialogOpen}
                setIsAssignSubjectDialogOpen={setIsAssignSubjectDialogOpen}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                handleAssignSubject={handleAssignSubject}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}