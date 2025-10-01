'use client';

import { React, useState, useEffect } from "@/utils/react-fixes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ClassSummaryStats } from "./ClassSummaryStats";
import { AttendanceOverview } from "./AttendanceOverview";
import { UpcomingAssessments } from "./UpcomingAssessments";
import { UpcomingActivities } from "./UpcomingActivities";
import { TopStudentsLeaderboard } from "@/app/admin/campus/classes/[id]/components/TopStudentsLeaderboard";
import { api } from '@/trpc/react';

interface ClassDashboardProps {
  classId: string;
  className?: string;
  initialData?: any;
}

export function ClassDashboardFixed({
  classId,
  className,
  initialData
}: ClassDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch class analytics data
  const { data: analyticsData, refetch: refetchAnalytics } = api.classAnalytics.getClassStats.useQuery(
    { classId },
    {
      initialData: {
        averageGrade: 0,
        completionRate: 0,
        attendanceData: {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0
        },
        weeklyAttendance: [],
        dailyAttendance: []
      },
      refetchOnWindowFocus: false
    }
  );

  // Fetch upcoming assessments
  const { data: upcomingAssessments, refetch: refetchAssessments } = api.assessment.getUpcomingForClass.useQuery(
    { classId, limit: 5 },
    {
      initialData: [],
      refetchOnWindowFocus: false
    }
  );

  // Fetch upcoming activities
  const { data: upcomingActivities, refetch: refetchActivities } = api.activity.getUpcomingForClass.useQuery(
    { classId, limit: 5 },
    {
      initialData: [],
      refetchOnWindowFocus: false
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchAssessments(),
        refetchActivities()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // FIXED: Add real-time event listeners for consistent dashboard updates
  useEffect(() => {
    const handleRealTimeUpdate = () => {
      // Refresh all dashboard data when real-time events occur
      handleRefresh();
    };

    // Add event listeners for real-time updates
    if (typeof window !== 'undefined') {
      window.addEventListener('activity-submitted', handleRealTimeUpdate);
      window.addEventListener('dashboard-update-needed', handleRealTimeUpdate);
      window.addEventListener('analytics-refresh-needed', handleRealTimeUpdate);
    }

    // Cleanup event listeners
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('activity-submitted', handleRealTimeUpdate);
        window.removeEventListener('dashboard-update-needed', handleRealTimeUpdate);
        window.removeEventListener('analytics-refresh-needed', handleRealTimeUpdate);
      }
    };
  }, [refetchAnalytics, refetchAssessments, refetchActivities]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">{className} Dashboard</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ClassSummaryStats 
            classId={classId} 
            analyticsData={analyticsData}
          />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceOverview
            attendanceData={analyticsData?.attendanceData || {
              present: 0,
              absent: 0,
              late: 0,
              excused: 0
            }}
            weeklyData={analyticsData?.weeklyAttendance || []}
            dailyData={analyticsData?.dailyAttendance || []}
          />
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          <UpcomingAssessments 
            classId={classId} 
            assessments={upcomingAssessments || []}
          />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <UpcomingActivities 
            classId={classId} 
            activities={upcomingActivities || []}
          />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <TopStudentsLeaderboard 
            classId={classId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
