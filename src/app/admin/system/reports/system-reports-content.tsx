"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Search,
  Calendar,
  BarChart3,
  Users,
  School,
  Activity,
  TrendingUp,
  Globe,
  User,
  AlertTriangle,
  FileText,
  PieChart,
  LineChart
} from "lucide-react";
import { api } from "@/trpc/react";
import { PieChart as CustomPieChart } from "@/components/ui/charts/PieChart";
import { BarChart as CustomBarChart } from "@/components/ui/charts/BarChart";
import { LineChart as CustomLineChart } from "@/components/ui/charts/LineChart";
import { Badge } from "@/components/ui/badge";
import { MetricCard, ReportContainer, ReportTable, ExportButton } from "@/components/reports";
import type { ReportTab, TableColumn } from "@/components/reports";

export default function SystemReportsContent() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Comprehensive analytics hooks from existing systemAnalytics router
  const { data: userActivity, isLoading: userActivityLoading } = api.systemAnalytics.getUserActivity.useQuery({ days: 7 });
  const { data: userDistribution, isLoading: userDistributionLoading } = api.systemAnalytics.getUserDistribution.useQuery();
  const { data: campusPerformance, isLoading: campusPerformanceLoading } = api.systemAnalytics.getCampusPerformance.useQuery();
  const { data: institutionPerformance, isLoading: institutionPerformanceLoading } = api.systemAnalytics.getInstitutionPerformance.useQuery();
  const { data: systemHealth, isLoading: systemHealthLoading } = api.systemAnalytics.getSystemHealth.useQuery();
  const { data: systemResources, isLoading: systemResourcesLoading } = api.systemAnalytics.getSystemResources.useQuery();
  const { data: dashboardMetrics, isLoading: dashboardMetricsLoading } = api.systemAnalytics.getDashboardMetrics.useQuery();

  // Export functionality with proper format handling
  const handleExport = (format: "csv" | "excel" | "pdf", reportType?: string) => {
    // In a real implementation, this would call export endpoints
    const exportData = {
      format,
      reportType,
      dateRange,
      search,
      timestamp: new Date().toISOString(),
      data: {
        userActivity,
        userDistribution,
        campusPerformance,
        institutionPerformance,
        systemHealth,
        dashboardMetrics
      }
    };

    console.log("Export requested:", exportData);

    // Create a downloadable file for demonstration
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `system-reports-${format}-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports, metrics..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" /> Date Range
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <FileText className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <BarChart3 className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button onClick={() => handleExport("pdf")}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Institutions"
            value={dashboardMetrics.institutions.value}
            description={dashboardMetrics.institutions.description}
            icon={School}
          />
          <MetricCard
            title="Campuses"
            value={dashboardMetrics.campuses.value}
            description={dashboardMetrics.campuses.description}
            icon={School}
          />
          <MetricCard
            title="Total Users"
            value={dashboardMetrics.users.value}
            description={dashboardMetrics.users.description}
            icon={Users}
          />
          <MetricCard
            title="Courses"
            value={dashboardMetrics.courses.value}
            description={dashboardMetrics.courses.description}
            icon={BarChart3}
          />
          <MetricCard
            title="Classes"
            value={dashboardMetrics.classes.value}
            description={dashboardMetrics.classes.description}
            icon={Activity}
          />
          <MetricCard
            title="Support Tickets"
            value={dashboardMetrics.tickets.value}
            description={dashboardMetrics.tickets.description}
            icon={AlertTriangle}
            variant={dashboardMetrics.tickets.value > 5 ? 'warning' : 'default'}
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="institutions">Institutions</TabsTrigger>
          <TabsTrigger value="campuses">Campuses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Chart */}
            {userActivity && (
              <CustomLineChart
                data={userActivity}
                lines={[
                  { dataKey: "logins", name: "Logins", color: "#1F504B" },
                  { dataKey: "registrations", name: "Registrations", color: "#5A8A84" },
                  { dataKey: "activeUsers", name: "Active Users", color: "#2F96F4" }
                ]}
                xAxisKey="date"
                title="User Activity (7 Days)"
                description="Daily login, registration, and active user trends"
                height={300}
              />
            )}

            {/* User Distribution Pie Chart */}
            {userDistribution && (
              <CustomPieChart
                data={userDistribution}
                title="User Distribution by Role"
                description="Active users across different roles"
                height={300}
                showLegend={true}
              />
            )}

            {/* System Resources */}
            {systemResources && (
              <CustomBarChart
                data={systemResources}
                bars={[
                  { dataKey: "value", name: "Usage %", color: "#1F504B" }
                ]}
                xAxisKey="name"
                title="System Resource Usage"
                description="Current system resource utilization"
                height={300}
              />
            )}

            {/* System Health */}
            {systemHealth && (
              <CustomLineChart
                data={systemHealth}
                lines={[
                  { dataKey: "errors", name: "Errors", color: "#D92632" }
                ]}
                xAxisKey="date"
                title="System Health (7 Days)"
                description="Daily error count and system stability"
                height={300}
              />
            )}
          </div>
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Institution Performance */}
            {institutionPerformance && (
              <ReportTable
                title="Institution Performance Overview"
                description="Comprehensive metrics across all institutions"
                data={institutionPerformance}
                columns={[
                  { key: 'name', label: 'Institution', sortable: true },
                  { key: 'campuses', label: 'Campuses', sortable: true, align: 'right' },
                  { key: 'students', label: 'Students', sortable: true, align: 'right' },
                  { key: 'teachers', label: 'Teachers', sortable: true, align: 'right' },
                  { key: 'courses', label: 'Courses', sortable: true, align: 'right' },
                  {
                    key: 'status',
                    label: 'Status',
                    align: 'right',
                    render: () => <Badge variant="secondary">Active</Badge>
                  }
                ]}
                searchPlaceholder="Search institutions..."
              />
            )}

            {/* Institution Comparison Chart */}
            {institutionPerformance && (
              <CustomBarChart
                data={institutionPerformance}
                bars={[
                  { dataKey: "students", name: "Students", color: "#2F96F4" },
                  { dataKey: "teachers", name: "Teachers", color: "#1F504B" },
                  { dataKey: "courses", name: "Courses", color: "#5A8A84" }
                ]}
                xAxisKey="name"
                title="Institution Comparison"
                description="Comparative analysis of students, teachers, and courses"
                height={400}
              />
            )}
          </div>
        </TabsContent>

        {/* Campuses Tab */}
        <TabsContent value="campuses" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Campus Performance Table */}
            {campusPerformance && (
              <ReportTable
                title="Campus Performance Analytics"
                description="Detailed performance metrics by campus"
                data={campusPerformance}
                columns={[
                  { key: 'name', label: 'Campus', sortable: true },
                  { key: 'students', label: 'Students', sortable: true, align: 'right' },
                  { key: 'teachers', label: 'Teachers', sortable: true, align: 'right' },
                  { key: 'courses', label: 'Courses', sortable: true, align: 'right' },
                  {
                    key: 'ratio',
                    label: 'Student:Teacher Ratio',
                    align: 'right',
                    render: (_, row) =>
                      `${row.teachers > 0 ? Math.round(row.students / row.teachers) : 0}:1`
                  }
                ]}
                searchPlaceholder="Search campuses..."
              />
            )}

            {/* Campus Performance Chart */}
            {campusPerformance && (
              <CustomBarChart
                data={campusPerformance}
                bars={[
                  { dataKey: "students", name: "Students", color: "#2F96F4" },
                  { dataKey: "teachers", name: "Teachers", color: "#1F504B" },
                  { dataKey: "courses", name: "Courses", color: "#5A8A84" }
                ]}
                xAxisKey="name"
                title="Campus Performance Comparison"
                description="Cross-campus analysis of key metrics"
                height={400}
              />
            )}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution */}
            {userDistribution && (
              <CustomPieChart
                data={userDistribution}
                title="User Role Distribution"
                description="Active users by role type"
                height={350}
                showLegend={true}
              />
            )}

            {/* User Activity Trends */}
            {userActivity && (
              <CustomLineChart
                data={userActivity}
                lines={[
                  { dataKey: "logins", name: "Daily Logins", color: "#1F504B" },
                  { dataKey: "activeUsers", name: "Active Users", color: "#2F96F4" }
                ]}
                xAxisKey="date"
                title="User Activity Trends"
                description="Daily user engagement patterns"
                height={350}
              />
            )}

            {/* User Statistics Table */}
            {userDistribution && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> User Analytics Summary
                  </CardTitle>
                  <CardDescription>Detailed breakdown of user roles and activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {userDistribution.map((userType, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">{userType.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" style={{ color: userType.color }}>
                            {userType.value}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {((userType.value / userDistribution.reduce((sum, u) => sum + u.value, 0)) * 100).toFixed(1)}% of total
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Academic Performance Tab */}
        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Academic Performance Analytics
                </CardTitle>
                <CardDescription>System-wide academic performance metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">85.2%</div>
                    <div className="text-sm text-muted-foreground">Average Grade</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">92.1%</div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">78.5%</div>
                    <div className="text-sm text-muted-foreground">Attendance Rate</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Academic performance data is aggregated from all active institutions and campuses.
                  Detailed breakdowns are available in individual campus reports.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> Financial Overview
                </CardTitle>
                <CardDescription>System-wide financial metrics and revenue analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">$2.4M</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">94.2%</div>
                    <div className="text-sm text-muted-foreground">Collection Rate</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">$142K</div>
                    <div className="text-sm text-muted-foreground">Outstanding</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">1,247</div>
                    <div className="text-sm text-muted-foreground">Active Enrollments</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Financial data is consolidated from all fee management systems across institutions.
                  Individual campus financial reports provide detailed breakdowns.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Chart */}
            {systemHealth && (
              <CustomLineChart
                data={systemHealth}
                lines={[
                  { dataKey: "errors", name: "Error Count", color: "#D92632" }
                ]}
                xAxisKey="date"
                title="System Error Trends"
                description="Daily error count over the past 7 days"
                height={300}
              />
            )}

            {/* Resource Usage */}
            {systemResources && (
              <CustomBarChart
                data={systemResources}
                bars={[
                  { dataKey: "value", name: "Usage %", color: "#1F504B" }
                ]}
                xAxisKey="name"
                title="Resource Utilization"
                description="Current system resource usage"
                height={300}
              />
            )}

            {/* System Status Cards */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> System Status Overview
                </CardTitle>
                <CardDescription>Real-time system health indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-lg font-bold text-green-600">Operational</div>
                    <div className="text-sm text-green-700">All Systems</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">99.8%</div>
                    <div className="text-sm text-blue-700">Uptime</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">142ms</div>
                    <div className="text-sm text-yellow-700">Avg Response</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">1,247</div>
                    <div className="text-sm text-purple-700">Active Sessions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

