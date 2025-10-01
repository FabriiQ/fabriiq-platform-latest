'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Settings,
  Users,
  Clock,
  Plus,
  Filter,
  Download,
  Bell,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Home
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { UnifiedCalendarView } from '@/components/calendar/enhanced/UnifiedCalendarView';
import { CalendarViewType } from '@/types/calendar/unified-events';
import { WorkingDaysPattern } from '@/server/api/services/working-days.service';

export default function CampusAdminCalendarPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');

  // Get current user's campus (assuming campus admin has access to specific campus)
  const { data: campuses = [] } = api.campus.getAll.useQuery();
  const currentCampus = campuses[0]; // For demo, use first campus

  // Get calendar statistics
  const { data: calendarStats } = api.unifiedCalendar.getStatistics.useQuery({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  });

  // Get working days configuration
  const { data: workingDaysConfig } = api.workingDays.getConfig.useQuery({
    campusId: currentCampus?.id || ''
  }, {
    enabled: !!currentCampus?.id
  });

  // Get holidays
  const { data: holidays = [] } = api.holidayManagement.getHolidays.useQuery({
    campusId: currentCampus?.id,
    year: new Date().getFullYear()
  });

  // Mutations
  const seedHolidays = api.holidayManagement.seedPakistanHolidays.useMutation({
    onSuccess: () => {
      toast.success("Pakistan holidays have been seeded successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateWorkingDays = api.workingDays.setConfig.useMutation({
    onSuccess: () => {
      toast.success("Working days configuration updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSeedHolidays = () => {
    seedHolidays.mutate();
  };

  const handleUpdateWorkingDays = (pattern: WorkingDaysPattern) => {
    if (!currentCampus?.id) return;

    const config = pattern === WorkingDaysPattern.FIVE_DAYS ? {
      campusId: currentCampus.id,
      pattern: WorkingDaysPattern.FIVE_DAYS,
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '08:00',
      endTime: '16:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      isActive: true,
      effectiveFrom: new Date()
    } : {
      campusId: currentCampus.id,
      pattern: WorkingDaysPattern.SIX_DAYS,
      workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      startTime: '08:00',
      endTime: '14:00',
      breakStart: '11:00',
      breakEnd: '11:30',
      isActive: true,
      effectiveFrom: new Date()
    };

    updateWorkingDays.mutate(config);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campus Calendar Management</h1>
          <p className="text-muted-foreground">
            Manage calendar events, working days, and holidays for {currentCampus?.name || 'your campus'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calendarStats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calendarStats?.conflictCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduling conflicts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Holidays</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.length}</div>
            <p className="text-xs text-muted-foreground">
              This year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workingDaysConfig?.workingDays?.length || 5}
            </div>
            <p className="text-xs text-muted-foreground">
              Days per week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Working Days Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Working Days Configuration
                </CardTitle>
                <CardDescription>
                  Configure working days and hours for your campus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Pattern</p>
                    <p className="text-sm text-muted-foreground">
                      {workingDaysConfig?.pattern === 'FIVE_DAYS' ? '5 Days (Mon-Fri)' : 
                       workingDaysConfig?.pattern === 'SIX_DAYS' ? '6 Days (Mon-Sat)' : 
                       'Not configured'}
                    </p>
                  </div>
                  <Badge variant={workingDaysConfig?.isActive ? 'default' : 'secondary'}>
                    {workingDaysConfig?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={workingDaysConfig?.pattern === WorkingDaysPattern.FIVE_DAYS ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUpdateWorkingDays(WorkingDaysPattern.FIVE_DAYS)}
                    disabled={updateWorkingDays.isLoading}
                  >
                    5 Days Week
                  </Button>
                  <Button
                    variant={workingDaysConfig?.pattern === WorkingDaysPattern.SIX_DAYS ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleUpdateWorkingDays(WorkingDaysPattern.SIX_DAYS)}
                    disabled={updateWorkingDays.isLoading}
                  >
                    6 Days Week
                  </Button>
                </div>

                {workingDaysConfig && (
                  <div className="text-sm space-y-1">
                    <p><strong>Working Hours:</strong> {workingDaysConfig.startTime} - {workingDaysConfig.endTime}</p>
                    {workingDaysConfig.breakStart && workingDaysConfig.breakEnd && (
                      <p><strong>Break Time:</strong> {workingDaysConfig.breakStart} - {workingDaysConfig.breakEnd}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Holiday Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="h-5 w-5 mr-2" />
                  Holiday Management
                </CardTitle>
                <CardDescription>
                  Manage Pakistan public holidays and custom holidays
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pakistan Holidays</p>
                    <p className="text-sm text-muted-foreground">
                      2025-2027 public holidays
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleSeedHolidays}
                    disabled={seedHolidays.isLoading}
                  >
                    {seedHolidays.isLoading ? 'Seeding...' : 'Seed Holidays'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Holidays:</p>
                  {holidays.slice(0, 3).map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between text-sm">
                      <span>{holiday.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {holiday.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campus Calendar</CardTitle>
              <CardDescription>
                View and manage all calendar events for your campus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedCalendarView
                initialView={CalendarViewType.MONTH}
                showFilters={true}
                showConflicts={true}
                allowEventCreation={true}
                className="h-[600px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Calendar Settings
              </CardTitle>
              <CardDescription>
                Configure calendar preferences and synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Event Synchronization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sync to Students</label>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync academic events to student calendars
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sync to Teachers</label>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync academic events to teacher calendars
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Event Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Send reminders for upcoming events
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Bell className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Holiday Management</CardTitle>
              <CardDescription>
                View and manage holidays for your campus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium text-sm">
                    <div>Name</div>
                    <div>Date</div>
                    <div>Type</div>
                    <div>Actions</div>
                  </div>
                  {holidays.map((holiday) => (
                    <div key={holiday.id} className="grid grid-cols-4 gap-4 p-4 border-b">
                      <div className="font-medium">{holiday.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(holiday.startDate).toLocaleDateString()}
                      </div>
                      <div>
                        <Badge variant="outline">{holiday.type}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
