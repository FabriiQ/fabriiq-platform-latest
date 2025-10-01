'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/data-display/card';
import { Calendar as CalendarIcon, Plus as PlusIcon, Filter as FilterIcon, Eye, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/forms/select';
import { api } from '@/trpc/react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

import { AcademicEventType } from '@prisma/client';

export default function CalendarManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('holidays');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch holidays using unified calendar
  const { data: holidaysData, isLoading: isLoadingHolidays } = api.unifiedCalendar.getEvents.useQuery({
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    endDate: new Date(new Date().getFullYear() + 1, 11, 31), // End of next year
    filters: [],
    includeTimetables: false,
    includeAcademic: false,
    includeHolidays: true,
    includePersonal: false
  });

  // Also try the direct holiday API as backup
  const { data: directHolidaysData, isLoading: isLoadingDirectHolidays } = api.holiday.list.useQuery({
    page: 1,
    pageSize: 50,
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    endDate: new Date(new Date().getFullYear() + 1, 11, 31), // End of next year
  });

  // Debug: Check what's in the database
  const { data: debugData } = api.unifiedCalendar.debugHolidays.useQuery();

  // Test holiday creation mutation
  const testCreateHoliday = api.unifiedCalendar.createHolidayWithSync.useMutation({
    onSuccess: (result) => {
      console.log('Test holiday created:', result);
      // Refetch data
      window.location.reload();
    },
    onError: (error) => {
      console.error('Test holiday creation failed:', error);
    }
  });

  // Fetch academic events using unified calendar
  const { data: academicEvents, isLoading: isLoadingEvents } = api.unifiedCalendar.getEvents.useQuery({
    startDate: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    endDate: new Date(new Date().getFullYear() + 1, 11, 31), // End of next year
    filters: [],
    includeTimetables: false,
    includeAcademic: true,
    includeHolidays: false,
    includePersonal: false
  });

  // Process holidays from unified calendar (primary source)
  const holidays = React.useMemo(() => {
    const unifiedHolidays = (holidaysData || []).filter(event => event.source === 'holiday');
    const directHolidays = directHolidaysData?.data || [];

    console.log('Holiday Debug:', {
      unifiedHolidays: unifiedHolidays.length,
      directHolidays: directHolidays.length,
      databaseHolidays: debugData?.count || 0,
      sampleUnified: unifiedHolidays.slice(0, 2),
      sampleDirect: directHolidays.slice(0, 2),
      sampleDatabase: debugData?.holidays?.slice(0, 2)
    });

    // Prefer unified calendar holidays, fallback to direct API
    return unifiedHolidays.length > 0 ? unifiedHolidays : directHolidays;
  }, [holidaysData, directHolidaysData]);

  // Process academic events
  const events = React.useMemo(() => {
    const unifiedEvents = (academicEvents || []).filter(event => event.source === 'academic');
    console.log('Academic Events Debug:', {
      unifiedEvents: unifiedEvents.length,
      sampleEvents: unifiedEvents.slice(0, 2)
    });
    return unifiedEvents;
  }, [academicEvents]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Calendar Management"
          description="Manage holidays, academic events, and schedule patterns"
        />
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/admin/system/calendar/view')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <Button onClick={() => {
            switch (activeTab) {
              case 'holidays':
                router.push('/admin/system/calendar/holidays/create');
                break;
              case 'events':
                router.push('/admin/system/calendar/events/create');
                break;
              case 'patterns':
                router.push('/admin/system/calendar/patterns/create');
                break;
            }
          }}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {activeTab === 'holidays' && 'Add Holiday'}
            {activeTab === 'events' && 'Add Academic Event'}
            {activeTab === 'patterns' && 'Add Schedule Pattern'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              testCreateHoliday.mutate({
                name: 'Test Holiday',
                description: 'Test holiday for debugging',
                startDate: new Date(),
                endDate: new Date(),
                campusIds: [], // Empty for all campuses
                type: 'OTHER',
                isRecurring: false,
                syncOptions: {
                  syncToStudents: false,
                  syncToTeachers: false,
                  syncToCampusUsers: false,
                  notifyUsers: false
                }
              });
            }}
            disabled={testCreateHoliday.isLoading}
          >
            {testCreateHoliday.isLoading ? 'Creating...' : 'Test Create Holiday'}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="holidays" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
            <TabsTrigger value="events">Academic Events</TabsTrigger>
            <TabsTrigger value="patterns">Schedule Patterns</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-40">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <TabsContent value="holidays">
            <div className="space-y-6">
              {/* Holiday Management Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Holiday Management</h3>
                  <p className="text-sm text-gray-600">Manage system-wide holidays and special dates</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin/system/calendar/holidays/import')}
                  >
                    Import Holidays
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/system/calendar/holidays/create')}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Holiday
                  </Button>
                </div>
              </div>

              {/* Holiday Settings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Pakistan Holidays</h4>
                      <p className="text-sm text-gray-600">National & religious holidays</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Seed Pakistan Holidays
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Settings className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Holiday Settings</h4>
                      <p className="text-sm text-gray-600">Configure holiday behavior</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Configure Settings
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Holiday Calendar</h4>
                      <p className="text-sm text-gray-600">View all holidays</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View Calendar
                  </Button>
                </Card>
              </div>

              {/* Holidays List */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Current Holidays</h4>
                {isLoadingHolidays ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading holidays...</span>
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium">No Holidays Found</h3>
                    <p className="mt-1">Create your first holiday or seed Pakistan holidays.</p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/admin/system/calendar/holidays/create')}
                    >
                      Create Holiday
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holidays.map((holiday) => (
                      <Card key={holiday.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{holiday.name}</h5>
                            <p className="text-sm text-gray-600">
                              {format(new Date(holiday.startDate), 'PPP')}
                              {holiday.startDate !== holiday.endDate &&
                                ` - ${format(new Date(holiday.endDate), 'PPP')}`
                              }
                            </p>
                            {holiday.description && (
                              <p className="text-sm text-gray-500 mt-1">{holiday.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{holiday.type}</Badge>
                              {holiday.affectsAll && (
                                <Badge variant="secondary">All Campuses</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">Bulk Import</Button>
                  <Button variant="outline" size="sm">Export Holidays</Button>
                  <Button variant="outline" size="sm">Sync to Campuses</Button>
                  <Button variant="outline" size="sm">Holiday Templates</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="events">
            <div className="space-y-6">
              {/* Academic Events Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Academic Events</h3>
                  <p className="text-sm text-gray-600">Manage academic calendar events and milestones</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin/system/calendar/events/templates')}
                  >
                    Event Templates
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/system/calendar/events/create')}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              </div>

              {/* Event Management Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Registration Events</h4>
                      <p className="text-sm text-gray-600">Student registration periods</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Manage Registration
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Settings className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Examination Events</h4>
                      <p className="text-sm text-gray-600">Exam schedules & deadlines</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Manage Exams
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Academic Cycles</h4>
                      <p className="text-sm text-gray-600">Semester & term management</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Manage Cycles
                  </Button>
                </Card>
              </div>

              {/* Academic Events List */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Current Academic Events</h4>
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading events...</span>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium">No Academic Events Found</h3>
                    <p className="mt-1">Create your first academic event.</p>
                    <Button
                      className="mt-4"
                      onClick={() => router.push('/admin/system/calendar/events/create')}
                    >
                      Create Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <Card key={event.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{event.title}</h5>
                            <p className="text-sm text-gray-600">
                              {format(new Date(event.startDate), 'PPP')}
                              {event.startDate !== event.endDate &&
                                ` - ${format(new Date(event.endDate), 'PPP')}`
                              }
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{event.type}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Categories */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Event Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{events.filter(e => e.eventType === AcademicEventType.REGISTRATION).length}</div>
                    <div className="text-sm text-gray-600">Registration</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{events.filter(e => e.eventType === AcademicEventType.EXAMINATION).length}</div>
                    <div className="text-sm text-gray-600">Examinations</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{events.filter(e => e.eventType === AcademicEventType.ORIENTATION).length}</div>
                    <div className="text-sm text-gray-600">Orientation</div>
                  </div>
                  <div className="p-3 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{events.filter(e => e.eventType === AcademicEventType.GRADUATION).length}</div>
                    <div className="text-sm text-gray-600">Graduation</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="patterns">
            <div className="space-y-6">
              {/* Schedule Patterns Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Schedule Patterns</h3>
                  <p className="text-sm text-gray-600">Define and manage class schedule patterns and working days</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin/system/calendar/patterns/templates')}
                  >
                    Pattern Templates
                  </Button>
                  <Button
                    onClick={() => router.push('/admin/system/calendar/patterns/create')}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Pattern
                  </Button>
                </div>
              </div>

              {/* Pattern Management Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Working Days</h4>
                      <p className="text-sm text-gray-600">Configure working days per campus</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Configure Days
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Settings className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Time Slots</h4>
                      <p className="text-sm text-gray-600">Define class periods & breaks</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Manage Slots
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Schedule Templates</h4>
                      <p className="text-sm text-gray-600">Pre-defined schedule patterns</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View Templates
                  </Button>
                </Card>
              </div>

              {/* Working Days Configuration */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Working Days Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">5-Day Week Pattern</h5>
                    <p className="text-sm text-gray-600 mb-3">Monday to Friday working days</p>
                    <div className="flex space-x-1 mb-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                        <div key={day} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {day}
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm">Apply to Campuses</Button>
                  </Card>

                  <Card className="p-4">
                    <h5 className="font-medium mb-2">6-Day Week Pattern</h5>
                    <p className="text-sm text-gray-600 mb-3">Monday to Saturday working days</p>
                    <div className="flex space-x-1 mb-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {day}
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm">Apply to Campuses</Button>
                  </Card>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">Import Patterns</Button>
                  <Button variant="outline" size="sm">Export Patterns</Button>
                  <Button variant="outline" size="sm">Bulk Apply</Button>
                  <Button variant="outline" size="sm">Pattern Analytics</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
} 