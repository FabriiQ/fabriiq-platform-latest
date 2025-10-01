'use client';

import { React, useState } from '@/utils/react-fixes';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, BarChartIcon, FileTextIcon, TargetIcon } from '@/utils/icon-fixes';
import { Button } from '@/components/ui/atoms/button';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { api } from '@/trpc/react';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { ClassDashboardFixed as ClassDashboard } from '@/components/class/ClassDashboardFixed';
import { ClassPerformanceReport } from '@/features/reports/components/ClassPerformanceReport';
import { ClassEngagementReport } from '@/features/reports/components/ClassEngagementReport';
import { ClassAnalyticsReport } from '@/features/reports/components/ClassAnalyticsReport';
import { CognitiveBalanceReport, MasteryProgressReport } from '@/features/bloom/components';

export default function SystemClassDetailPage() {
  const params = useParams();

  const classId = params?.id as string;
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch class details using the class API
  const { data: classData, isLoading: isLoadingClass } = api.class.getById.useQuery(
    {
      classId,
      include: {
        students: true,
        teachers: true,
        classTeacher: {
          include: {
            user: true
          }
        }
      }
    },
    {
      enabled: !!classId,
      retry: 1,
    }
  );

  if (isLoadingClass) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <PageHeader
          title="Class Not Found"
          description="The requested class could not be found."
        />
        <Button asChild>
          <Link href="/admin/system/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system/classes">
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Back to Classes
            </Link>
          </Button>
          <PageHeader
            title={`Class: ${classData.name}`}
            description={`${classData.code} - ${classData.courseCampus?.course?.name || 'Course'}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="bloom-analytics">Bloom Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClassDashboard
            classId={classId}
            className={classData.name}
            initialData={{
              studentsCount: classData.students?.length || 0,
              assessmentsCount: 0, // Will be loaded by the component
              activitiesCount: 0, // Will be loaded by the component
              attendanceRecordsCount: 0 // Will be loaded by the component
            }}
          />
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <FileTextIcon className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Class Reports</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ClassPerformanceReport classId={classId} period="monthly" isLoading={false} />
              <ClassEngagementReport classId={classId} period="monthly" isLoading={false} />
            </div>

            <ClassAnalyticsReport classId={classId} period="monthly" isLoading={false} />
          </div>
        </TabsContent>

        <TabsContent value="bloom-analytics">
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <TargetIcon className="h-6 w-6" />
              <h2 className="text-2xl font-bold">Bloom's Taxonomy Analytics</h2>
            </div>

            <Tabs defaultValue="mastery" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="mastery">Mastery Progress</TabsTrigger>
                <TabsTrigger value="cognitive">Cognitive Balance</TabsTrigger>
              </TabsList>

              <TabsContent value="mastery">
                <MasteryProgressReport
                  classId={classId}
                  teacherId="system-admin" // System admin view
                />
              </TabsContent>

              <TabsContent value="cognitive">
                <CognitiveBalanceReport
                  classId={classId}
                  teacherId="system-admin" // System admin view
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
