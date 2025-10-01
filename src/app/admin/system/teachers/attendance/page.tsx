"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeacherAttendanceDashboard } from "@/components/teacher/attendance/TeacherAttendanceDashboard";
import { TeacherAttendanceAnalytics } from "@/components/teacher/attendance/TeacherAttendanceAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  School,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw
} from "lucide-react";
import { useSession } from "next-auth/react";

export default function SystemTeacherAttendancePage() {
  const { data: session } = useSession();
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all campuses for system admin
  const {
    data: campusesData,
    isLoading: isLoadingCampuses,
  } = api.campus.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch system-wide teacher attendance statistics
  const {
    data: systemStats,
    isLoading: isLoadingSystemStats,
    refetch: refetchSystemStats,
  } = api.teacherAttendance.getCampusStats.useQuery(
    {
      campusId: selectedCampusId || (campusesData?.[0]?.id || ""),
    },
    {
      enabled: !!selectedCampusId || !!campusesData?.[0]?.id,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const campuses = campusesData || [];
  const selectedCampus = campuses.find(c => c.id === selectedCampusId) || campuses[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchSystemStats();
    setIsRefreshing(false);
  };

  if (session?.user?.userType !== "SYSTEM_ADMIN") {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access system-wide teacher attendance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Teacher Attendance</h1>
          <p className="text-muted-foreground">
            Monitor teacher attendance across all campuses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Campus Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <School className="w-5 h-5 text-muted-foreground" />
            <Select 
              value={selectedCampusId} 
              onValueChange={setSelectedCampusId}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Campus" />
              </SelectTrigger>
              <SelectContent>
                {campuses.map(campus => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCampus && (
              <Badge variant="outline">
                {selectedCampus.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campuses</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campuses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Campus Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.stats?.totalTeachers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campus Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemStats?.stats?.overallAttendanceRate?.toFixed(1) || 0}%
            </div>
            <Progress 
              value={systemStats?.stats?.overallAttendanceRate || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.stats?.totalRecords || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campus Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Campus Performance Overview</CardTitle>
          <CardDescription>
            Teacher attendance performance across all campuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campuses.map((campus) => (
              <div key={campus.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <School className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{campus.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {campus.status}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {campus.id === selectedCampusId ? systemStats?.stats?.totalTeachers || 0 : "N/A"} Teachers
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {campus.id === selectedCampusId ? systemStats?.stats?.totalRecords || 0 : "N/A"} Records
                    </div>
                  </div>
                  <Progress 
                    value={campus.id === selectedCampusId ? systemStats?.stats?.overallAttendanceRate || 0 : 0} 
                    className="w-32" 
                  />
                  <Badge 
                    variant={
                      campus.id === selectedCampusId && systemStats?.stats?.overallAttendanceRate 
                        ? systemStats.stats.overallAttendanceRate >= 90 
                          ? "default" 
                          : systemStats.stats.overallAttendanceRate >= 75 
                            ? "secondary" 
                            : "destructive"
                        : "outline"
                    }
                  >
                    {campus.id === selectedCampusId && systemStats?.stats?.overallAttendanceRate 
                      ? `${systemStats.stats.overallAttendanceRate.toFixed(1)}%`
                      : "N/A"
                    }
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campus-Specific Content */}
      {selectedCampus && (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <TeacherAttendanceDashboard
              campusId={selectedCampus.id}
              userRole="SYSTEM_ADMIN"
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <TeacherAttendanceAnalytics
              campusId={selectedCampus.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
