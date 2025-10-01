import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Clock, Users, UserPlus, UserMinus } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemAttendanceSelector } from "@/components/attendance/SystemAttendanceSelector";
import { SimpleAttendanceDashboard } from "@/components/attendance/SimpleAttendanceDashboard";

export const metadata: Metadata = {
  title: "Attendance Management | System Admin",
  description: "Manage attendance across the entire system",
};

export default async function SystemAttendancePage() {
  const session = await getSessionCache();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user details from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      userType: true,
    },
  });

  if (!user || user.userType !== 'SYSTEM_ADMIN') {
    redirect("/login");
  }

  // Get attendance statistics for today (mock data)
  // const todayAttendanceStats = {
  //   totalStudents: 1234,
  //   presentStudents: 1156,
  //   absentStudents: 78,
  //   lateStudents: 23,
  //   attendanceRate: 93.7,
  // };

  // Get all classes for the system
  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      programCampus: {
        select: {
          program: {
            select: {
              name: true,
            },
          },
          campus: {
            select: {
              name: true,
            },
          },
        },
      },
      courseCampus: {
        select: {
          course: {
            select: {
              name: true,
            },
          },
          campus: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">Manage student and teacher attendance across the system</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/system/attendance/take">
            <Button>
              <Clock className="mr-2 h-4 w-4" />
              Take Attendance
            </Button>
          </Link>
          <Link href="/admin/system/attendance/export">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </Link>
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
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              Across all classes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">1,156</div>
            <p className="text-xs text-muted-foreground">
              93.7% attendance rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserMinus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">78</div>
            <p className="text-xs text-muted-foreground">
              6.3% absence rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">23</div>
            <p className="text-xs text-muted-foreground">
              1.9% late arrivals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="student-attendance">Student Attendance</TabsTrigger>
          <TabsTrigger value="teacher-attendance">Teacher Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Classes Overview</CardTitle>
                <CardDescription>Total classes in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active classes across all campuses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common attendance tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/system/attendance/take">
                  <Button className="w-full" variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Take Attendance
                  </Button>
                </Link>
                <Link href="/admin/system/attendance/export">
                  <Button className="w-full" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Statistics</CardTitle>
                <CardDescription>Overall attendance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Attendance Rate</span>
                    <span className="text-sm font-medium">93.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Present Today</span>
                    <span className="text-sm font-medium text-green-600">1,156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Absent Today</span>
                    <span className="text-sm font-medium text-red-600">78</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="student-attendance" className="space-y-6">
          <SystemAttendanceSelector />
        </TabsContent>

        <TabsContent value="teacher-attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Attendance Management</CardTitle>
              <CardDescription>
                Manage teacher attendance across all campuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Teacher attendance management interface will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <SimpleAttendanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
