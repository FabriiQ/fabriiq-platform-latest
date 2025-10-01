"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TeacherAttendanceRecorder } from "./TeacherAttendanceRecorder";
import { TeacherAttendanceAnalytics } from "./TeacherAttendanceAnalytics";
import { TeacherAttendanceReports } from "./TeacherAttendanceReports";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { AttendanceStatusType } from "@/server/api/constants";
import { cn } from "@/lib/utils";

interface TeacherAttendanceDashboardProps {
  campusId: string;
  userRole?: string;
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: AttendanceStatusType.PRESENT, label: "Present", color: "bg-green-500" },
  { value: AttendanceStatusType.ABSENT, label: "Absent", color: "bg-red-500" },
  { value: AttendanceStatusType.LATE, label: "Late", color: "bg-yellow-500" },
  { value: AttendanceStatusType.EXCUSED, label: "Excused", color: "bg-blue-500" },
  { value: AttendanceStatusType.LEAVE, label: "Leave", color: "bg-purple-500" },
];

export function TeacherAttendanceDashboard({
  campusId,
  userRole = "admin",
}: TeacherAttendanceDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  // Fetch attendance records
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
      status: statusFilter ? (statusFilter as AttendanceStatusType) : undefined,
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

  // Fetch teachers for filter dropdown
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

  const attendanceRecords = attendanceData?.attendanceRecords || [];
  const teachers = teachersData?.teachers || [];

  // Filter records based on search term
  const filteredRecords = attendanceRecords.filter(record =>
    record.teacher.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.teacher.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    if (!option || !option.color) return <Badge variant="secondary">{status}</Badge>;

    return (
      <Badge variant="secondary" className={cn("text-white", option.color)}>
        {option.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AttendanceStatusType.PRESENT:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case AttendanceStatusType.ABSENT:
        return <XCircle className="w-4 h-4 text-red-600" />;
      case AttendanceStatusType.LATE:
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case AttendanceStatusType.EXCUSED:
      case AttendanceStatusType.LEAVE:
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const handleRefresh = () => {
    refetchAttendance();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Attendance</h1>
          <p className="text-muted-foreground">
            Manage and track teacher attendance across your campus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
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
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campusStats?.stats?.overallAttendanceRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
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

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Records */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Latest teacher attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <div className="font-medium">{record.teacher.user?.name || 'Unknown Teacher'}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(record.date), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common attendance tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("mark")}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mark Today's Attendance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("analytics")}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab("records")}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search Records
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mark" className="space-y-4">
          <TeacherAttendanceRecorder
            campusId={campusId}
            onSuccess={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search teachers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>

                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-teachers">All Teachers</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {filteredRecords.length} records found
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
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
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

        <TabsContent value="analytics" className="space-y-4">
          <TeacherAttendanceAnalytics
            campusId={campusId}
            initialStartDate={startDate}
            initialEndDate={endDate}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <TeacherAttendanceReports
            campusId={campusId}
            userRole={userRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
