"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { AttendanceStatusType } from "@/server/api/constants";
import { cn } from "@/lib/utils";

interface TeacherAttendanceReportsProps {
  campusId: string;
  userRole?: string;
}

const reportTypes = [
  { value: "summary", label: "Summary Report", icon: FileText },
  { value: "detailed", label: "Detailed Report", icon: Calendar },
  { value: "trends", label: "Trends Report", icon: TrendingUp },
  { value: "individual", label: "Individual Teacher Report", icon: Users },
];

const periodOptions = [
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "current_year", label: "Current Year" },
  { value: "custom", label: "Custom Range" },
];

// Helper functions to replace date-fns functions
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);
const endOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31);

const statusColors = {
  [AttendanceStatusType.PRESENT]: "#22c55e",
  [AttendanceStatusType.ABSENT]: "#ef4444",
  [AttendanceStatusType.LATE]: "#f59e0b",
  [AttendanceStatusType.EXCUSED]: "#3b82f6",
  [AttendanceStatusType.LEAVE]: "#8b5cf6",
};

export function TeacherAttendanceReports({
  campusId,
  userRole = "admin",
}: TeacherAttendanceReportsProps) {
  const [reportType, setReportType] = useState("summary");
  const [period, setPeriod] = useState("current_month");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch teachers for individual reports
  const {
    data: teachersData,
  } = api.teacherAttendance.getTeachersForAttendance.useQuery(
    {
      campusId,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch attendance data for reports
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance,
  } = api.teacherAttendance.getByQuery.useQuery(
    {
      campusId,
      teacherId: selectedTeacherId || undefined,
      startDate,
      endDate,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch campus statistics
  const {
    data: campusStats,
    isLoading: isLoadingStats,
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

  // Fetch attendance summary for trends
  const {
    data: attendanceSummary,
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

  const teachers = teachersData?.teachers || [];
  const attendanceRecords = attendanceData?.attendanceRecords || [];

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const now = new Date();
    
    switch (newPeriod) {
      case "current_month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case "last_3_months":
        setStartDate(subMonths(now, 3));
        setEndDate(now);
        break;
      case "current_year":
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        break;
      case "custom":
        // Keep current dates for custom range
        break;
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await refetchAttendance();
    setIsGenerating(false);
  };

  const handleExportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // Implementation for export functionality
    console.log(`Exporting ${reportType} report as ${format}`);
    // This would typically call an API endpoint to generate and download the report
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      [AttendanceStatusType.PRESENT]: { label: "Present", color: "bg-green-500" },
      [AttendanceStatusType.ABSENT]: { label: "Absent", color: "bg-red-500" },
      [AttendanceStatusType.LATE]: { label: "Late", color: "bg-yellow-500" },
      [AttendanceStatusType.EXCUSED]: { label: "Excused", color: "bg-blue-500" },
      [AttendanceStatusType.LEAVE]: { label: "Leave", color: "bg-purple-500" },
    };

    const config = statusConfig[status as AttendanceStatusType];
    if (!config) return <Badge variant="secondary">{status}</Badge>;

    return (
      <Badge variant="secondary" className={cn("text-white", config.color)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teacher Attendance Reports</h2>
          <p className="text-muted-foreground">
            Generate comprehensive attendance reports and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport('pdf')}
            disabled={isGenerating}
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportReport('excel')}
            disabled={isGenerating}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Configure your attendance report parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Report Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher (for individual reports) */}
            {reportType === "individual" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Teacher</label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Custom Date Range */}
          {period === "custom" && (
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <DatePicker
                  value={startDate}
                  onChange={(date) => date && setStartDate(date)}
                  placeholder="Start date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <DatePicker
                  value={endDate}
                  onChange={(date) => date && setEndDate(date)}
                  placeholder="End date"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {/* Summary Report */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Status Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Distribution</CardTitle>
              <CardDescription>Breakdown by attendance status</CardDescription>
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
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {/* Detailed Report */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance Records</CardTitle>
              <CardDescription>
                Complete attendance records for the selected period ({attendanceRecords.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAttendance ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading attendance records...
                      </TableCell>
                    </TableRow>
                  ) : attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.teacher.user?.name || 'Unknown Teacher'}</div>
                            <div className="text-sm text-muted-foreground">
                              {record.teacher.user?.email || 'No email'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell>
                          {record.checkInTime 
                            ? format(new Date(record.checkInTime), "HH:mm")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          {record.checkOutTime 
                            ? format(new Date(record.checkOutTime), "HH:mm")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate" title={record.remarks || ""}>
                            {record.remarks || "-"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Trends Report */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>Daily attendance patterns over time</CardDescription>
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
                  No trend data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Breakdown</CardTitle>
              <CardDescription>Present vs absent teachers by day</CardDescription>
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
                    <Bar dataKey="late" fill="#f59e0b" name="Late" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No trend data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {/* Individual Teacher Report */}
          {selectedTeacherId ? (
            <div className="space-y-4">
              {/* Teacher Info */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {teachers.find(t => t.id === selectedTeacherId)?.name || "Selected Teacher"}
                  </CardTitle>
                  <CardDescription>
                    Individual attendance report for the selected period
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Individual teacher records */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords
                        .filter(record => record.teacher.id === selectedTeacherId)
                        .map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {format(new Date(record.date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(record.status)}
                            </TableCell>
                            <TableCell>
                              {record.checkInTime 
                                ? format(new Date(record.checkInTime), "HH:mm")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {record.checkOutTime 
                                ? format(new Date(record.checkOutTime), "HH:mm")
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              {record.remarks || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Teacher</h3>
                <p className="text-muted-foreground">
                  Please select a teacher from the dropdown above to view their individual attendance report.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
