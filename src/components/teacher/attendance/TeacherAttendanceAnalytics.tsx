"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import { format, subDays } from "date-fns";

// Helper functions to replace date-fns functions
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
import { AttendanceStatusType } from "@/server/api/constants";

interface TeacherAttendanceAnalyticsProps {
  campusId: string;
  teacherId?: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

const statusColors = {
  [AttendanceStatusType.PRESENT]: "#22c55e",
  [AttendanceStatusType.ABSENT]: "#ef4444",
  [AttendanceStatusType.LATE]: "#f59e0b",
  [AttendanceStatusType.EXCUSED]: "#3b82f6",
  [AttendanceStatusType.LEAVE]: "#8b5cf6",
};

export function TeacherAttendanceAnalytics({
  campusId,
  teacherId,
  initialStartDate = startOfMonth(new Date()),
  initialEndDate = endOfMonth(new Date()),
}: TeacherAttendanceAnalyticsProps) {
  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch campus statistics
  const {
    data: campusStats,
    isLoading: isLoadingCampusStats,
    refetch: refetchCampusStats,
  } = api.teacherAttendance.getCampusStats.useQuery(
    {
      campusId,
      startDate,
      endDate,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch individual teacher statistics if teacherId is provided
  const {
    data: teacherStats,
    isLoading: isLoadingTeacherStats,
    refetch: refetchTeacherStats,
  } = api.teacherAttendance.getTeacherStats.useQuery(
    {
      teacherId: teacherId!,
      startDate,
      endDate,
    },
    {
      enabled: !!teacherId,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch attendance summary for trend analysis
  const {
    data: attendanceSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = api.teacherAttendance.getAttendanceSummary.useQuery(
    {
      campusId,
      startDate,
      endDate,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchCampusStats(),
      teacherId ? refetchTeacherStats() : Promise.resolve(),
      refetchSummary(),
    ]);
    setIsRefreshing(false);
  };

  const handlePeriodChange = (newPeriod: "week" | "month" | "quarter" | "year") => {
    setPeriod(newPeriod);
    const now = new Date();
    
    switch (newPeriod) {
      case "week":
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "quarter":
        setStartDate(subDays(now, 90));
        setEndDate(now);
        break;
      case "year":
        setStartDate(subDays(now, 365));
        setEndDate(now);
        break;
    }
  };

  // Prepare data for charts
  const pieChartData = campusStats?.stats ? [
    { name: "Present", value: campusStats.stats.presentRecords, color: statusColors[AttendanceStatusType.PRESENT] },
    { name: "Absent", value: campusStats.stats.absentRecords, color: statusColors[AttendanceStatusType.ABSENT] },
    { name: "Late", value: campusStats.stats.lateRecords, color: statusColors[AttendanceStatusType.LATE] },
    { name: "Excused", value: campusStats.stats.excusedRecords, color: statusColors[AttendanceStatusType.EXCUSED] },
    { name: "Leave", value: campusStats.stats.leaveRecords, color: statusColors[AttendanceStatusType.LEAVE] },
  ].filter(item => item.value > 0) : [];

  const trendData = attendanceSummary?.summary?.map(item => ({
    date: format(new Date(item.date), "MMM dd"),
    present: item.present,
    absent: item.absent,
    late: item.late,
    total: item.total,
    attendanceRate: item.total > 0 ? (item.present / item.total) * 100 : 0,
  })) || [];

  const isLoading = isLoadingCampusStats || isLoadingSummary || (teacherId && isLoadingTeacherStats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teacher Attendance Analytics</h2>
          <p className="text-muted-foreground">
            {teacherId ? "Individual teacher" : "Campus-wide"} attendance insights and trends
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
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
            
            <DatePicker
              value={startDate}
              onChange={(date) => date && setStartDate(date)}
              placeholder="Start date"
            />

            <DatePicker
              value={endDate}
              onChange={(date) => date && setEndDate(date)}
              placeholder="End date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teacherId ? (
          // Individual teacher stats
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teacherStats?.stats?.totalDays || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(teacherStats?.stats?.attendanceRate || 0)}%
                </div>
                <Progress 
                  value={teacherStats?.stats?.attendanceRate || 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {teacherStats?.stats?.presentDays || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {teacherStats?.stats?.absentDays || 0}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          // Campus-wide stats
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campusStats?.stats?.totalTeachers || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {campusStats?.stats?.overallAttendanceRate?.toFixed(1) || 0}%
                </div>
                <Progress 
                  value={campusStats?.stats?.overallAttendanceRate || 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Records</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {campusStats?.stats?.presentRecords || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campusStats?.stats?.totalRecords || 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          {!teacherId && <TabsTrigger value="teachers">Teachers</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance</CardTitle>
                <CardDescription>Present vs Total by day</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="present" fill="#22c55e" name="Present" />
                      <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Rate Trend</CardTitle>
              <CardDescription>Daily attendance rate over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Attendance Rate"]} />
                    <Line 
                      type="monotone" 
                      dataKey="attendanceRate" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Attendance Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!teacherId && (
          <TabsContent value="teachers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Performance</CardTitle>
                <CardDescription>Individual teacher attendance rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campusStats?.stats?.teacherStats?.map((teacher, index) => (
                    <div key={teacher.teacherId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Teacher {index + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {teacher.presentDays}/{teacher.totalDays} days present
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={teacher.attendanceRate} className="w-32" />
                        <Badge variant={teacher.attendanceRate >= 90 ? "default" : teacher.attendanceRate >= 75 ? "secondary" : "destructive"}>
                          {teacher.attendanceRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
