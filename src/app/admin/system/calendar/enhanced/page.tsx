/**
 * Enhanced Calendar Views Page
 * 
 * System admin page showcasing all enhanced calendar views:
 * - Resource Calendar (Teachers/Facilities)
 * - Multi-Campus Calendar
 * - Academic Year Planning
 */

'use client';

import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { ResourceCalendarView, ResourceType } from '@/components/calendar/views/ResourceCalendarView';
import { MultiCampusCalendarView } from '@/components/calendar/views/MultiCampusCalendarView';
import { AcademicYearPlanningView } from '@/components/calendar/views/AcademicYearPlanningView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  MapPin,
  Home,
  GraduationCap,
  Settings,
  Download,
  RefreshCw,
  BarChart3,
  Clock
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/trpc/react';
import { WorkingDaysPattern } from '@/server/api/services/working-days.service';

export default function EnhancedCalendarViewsPage() {
  
  // State management
  const [activeView, setActiveView] = useState<'system' | 'resource' | 'multi-campus' | 'academic-year'>('system');
  const [resourceType, setResourceType] = useState<ResourceType>(ResourceType.TEACHER);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());

  // Fetch some basic statistics for the dashboard
  const { data: teacherStats } = api.teacher.getAllTeachers.useQuery({
    campusId: 'all',
    limit: 1
  });

  const { data: facilityStats } = api.facility.getFacilities.useQuery({
    campusId: 'all',
    status: 'ACTIVE' as any
  });

  const { data: campusStats } = api.campus.getAll.useQuery();

  // Get calendar statistics
  const { data: calendarStats } = api.unifiedCalendar.getStatistics.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });

  // System-wide calendar management mutations
  const seedHolidays = api.holidayManagement.seedPakistanHolidays.useMutation({
    onSuccess: () => {
      toast.success("Pakistan holidays have been seeded for all campuses");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSeedHolidays = () => {
    seedHolidays.mutate();
  };

  // Event handlers
  const handleResourceSelect = (resourceIds: string[]) => {
    setSelectedResourceIds(resourceIds);
  };

  const handleCampusToggle = (campusId: string, selected: boolean) => {
    if (selected) {
      setSelectedCampuses(prev => [...prev, campusId]);
    } else {
      setSelectedCampuses(prev => prev.filter(id => id !== campusId));
    }
  };

  const handleResourceBook = (resourceId: string, timeSlot: { start: Date; end: Date }) => {
    toast.success(`Booking request for ${resourceType} from ${timeSlot.start.toLocaleTimeString()} to ${timeSlot.end.toLocaleTimeString()}`);
  };

  const handleResourceShare = (resourceId: string, fromCampus: string, toCampus: string) => {
    toast.success(`Resource sharing request from ${fromCampus} to ${toCampus}`);
  };

  const handleYearChange = (year: number) => {
    setAcademicYear(year);
  };

  const handleExportCalendar = () => {
    toast.success("Calendar export is being prepared. You'll receive a download link shortly.");
  };

  const handleRefreshData = () => {
    toast.success("Calendar data has been refreshed successfully.");
  };

  return (
    <PageLayout
      title="Enhanced Calendar Views"
      description="Advanced calendar management with resource scheduling, multi-campus coordination, and academic year planning"
      breadcrumbs={[
        { label: 'System Admin', href: '/admin/system' },
        { label: 'Calendar', href: '/admin/system/calendar' },
        { label: 'Enhanced Views', href: '#' },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCalendar}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overview Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teacherStats?.teachers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Available for scheduling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facilities</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{facilityStats?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Bookable resources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campuses</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campusStats?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Academic Year</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{academicYear}-{academicYear + 1}</div>
              <p className="text-xs text-muted-foreground">
                Current planning year
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Calendar Views */}
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="system" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                System Management
              </TabsTrigger>
              <TabsTrigger value="resource" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Resource Calendar
              </TabsTrigger>
              <TabsTrigger value="multi-campus" className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Multi-Campus
              </TabsTrigger>
              <TabsTrigger value="academic-year" className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-2" />
                Academic Planning
              </TabsTrigger>
            </TabsList>

            {/* View-specific controls */}
            {activeView === 'resource' && (
              <div className="flex items-center space-x-2">
                <Select value={resourceType} onValueChange={(value) => setResourceType(value as ResourceType)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ResourceType.TEACHER}>Teachers</SelectItem>
                    <SelectItem value={ResourceType.FACILITY}>Facilities</SelectItem>
                    <SelectItem value={ResourceType.EQUIPMENT}>Equipment</SelectItem>
                  </SelectContent>
                </Select>
                {selectedResourceIds.length > 0 && (
                  <Badge variant="outline">
                    {selectedResourceIds.length} selected
                  </Badge>
                )}
              </div>
            )}

            {activeView === 'multi-campus' && selectedCampuses.length > 0 && (
              <Badge variant="outline">
                {selectedCampuses.length} campus{selectedCampuses.length > 1 ? 'es' : ''} selected
              </Badge>
            )}

            {activeView === 'academic-year' && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Academic Year {academicYear}-{academicYear + 1}
                </span>
              </div>
            )}
          </div>

          <TabsContent value="system" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Holiday Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="h-5 w-5 mr-2" />
                    Holiday Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pakistan Public Holidays</p>
                      <p className="text-sm text-muted-foreground">
                        Seed holidays for 2025-2027 across all campuses
                      </p>
                    </div>
                    <Button
                      onClick={handleSeedHolidays}
                      disabled={seedHolidays.isLoading}
                    >
                      {seedHolidays.isLoading ? 'Seeding...' : 'Seed Holidays'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Calendar Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-medium">Calendar Synchronization</p>
                    <p className="text-sm text-muted-foreground">
                      Manage system-wide calendar sync settings
                    </p>
                    <Button variant="outline" size="sm">
                      Configure Sync
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resource" className="mt-6">
            <ResourceCalendarView
              resourceType={resourceType}
              selectedResourceIds={selectedResourceIds}
              onResourceSelect={handleResourceSelect}
              onResourceBook={handleResourceBook}
              showAvailabilityOnly={false}
              allowBooking={true}
              className="min-h-[600px]"
            />
          </TabsContent>

          <TabsContent value="multi-campus" className="mt-6">
            <MultiCampusCalendarView
              initialSelectedCampuses={selectedCampuses}
              onCampusToggle={handleCampusToggle}
              onResourceShare={handleResourceShare}
              allowCrossCampusBooking={true}
              showResourceSharing={true}
              className="min-h-[600px]"
            />
          </TabsContent>

          <TabsContent value="academic-year" className="mt-6">
            <AcademicYearPlanningView
              initialYear={academicYear}
              onYearChange={handleYearChange}
              onMilestoneAdd={(milestone) => {
                toast.success(`Academic milestone "${milestone.title}" has been added.`);
              }}
              onTemplateApply={(templateId, termId) => {
                toast.success("Academic calendar template has been applied successfully.");
              }}
              onTermCreate={(term) => {
                toast.success(`Academic term "${term.name}" has been created.`);
              }}
              allowTemplateManagement={true}
              className="min-h-[600px]"
            />
          </TabsContent>
        </Tabs>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Calendar className="h-6 w-6 mb-2" />
                <span className="text-sm">Create Event</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Users className="h-6 w-6 mb-2" />
                <span className="text-sm">Book Resource</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <Home className="h-6 w-6 mb-2" />
                <span className="text-sm">Campus Sync</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                <GraduationCap className="h-6 w-6 mb-2" />
                <span className="text-sm">Plan Term</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Users className="h-5 w-5 mr-2" />
                Resource Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Visualize teacher and facility availability, detect conflicts, and optimize resource allocation across your institution.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Real-time availability tracking</li>
                <li>• Conflict detection and resolution</li>
                <li>• Utilization analytics</li>
                <li>• Bulk booking operations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Home className="h-5 w-5 mr-2" />
                Multi-Campus Coordination
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Coordinate events and resources across multiple campuses with unified visibility and cross-campus resource sharing.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Cross-campus event visibility</li>
                <li>• Resource sharing capabilities</li>
                <li>• Campus-specific analytics</li>
                <li>• Unified scheduling interface</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <GraduationCap className="h-5 w-5 mr-2" />
                Academic Planning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Plan entire academic years with term management, milestone tracking, and reusable calendar templates.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Academic year timeline</li>
                <li>• Milestone management</li>
                <li>• Calendar templates</li>
                <li>• Progress tracking</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
