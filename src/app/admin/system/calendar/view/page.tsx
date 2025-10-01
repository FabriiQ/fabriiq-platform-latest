'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/data-display/card';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { api } from '@/trpc/react';
import { Calendar } from '@/components/calendar/base/Calendar';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/forms/select';
import { DatePicker } from '@/components/ui/forms/date-picker-adapter';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';

export default function CalendarViewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [view, setView] = useState<'month' | 'week' | 'day' | 'year'>('month');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0)
  });
  const [selectedFilters, setSelectedFilters] = useState({
    campusId: 'all',
    eventType: 'all',
  });

  // Modal state for event details
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch unified calendar events (holidays, academic events, etc.)
  const { data: unifiedEvents, isLoading: isLoadingEvents, error: eventsError } = api.unifiedCalendar.getEvents.useQuery({
    startDate: dateRange.from || new Date(),
    endDate: dateRange.to || new Date(),
    filters: [], // Add empty filters array
    includeTimetables: false,
    includeAcademic: true,
    includeHolidays: true,
    includePersonal: false
  }, {
    enabled: !!dateRange.from && !!dateRange.to
  });

  // Debug: Also fetch holidays directly to compare
  const { data: debugHolidays } = api.unifiedCalendar.debugHolidays.useQuery();

  // Test holiday creation
  const testCreateHoliday = api.unifiedCalendar.createHolidayWithSync.useMutation({
    onSuccess: () => {
      console.log('Test holiday created successfully');
      window.location.reload();
    },
    onError: (error) => {
      console.error('Failed to create test holiday:', error);
    }
  });

  // Fetch campuses for filter
  const { data: campuses = [] } = api.campus.getAll.useQuery(undefined, {
    enabled: !!user
  });

  // Format events for calendar
  const calendarEvents = React.useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      type: 'SCHEDULE' | 'ACADEMIC_EVENT' | 'HOLIDAY';
      color?: string;
      description?: string;
      source?: string;
      location?: string;
      campusId?: string;
      campusName?: string;
      createdAt?: Date;
      status?: string;
    }> = [];

    // Debug logging
    console.log('System Calendar Debug:', {
      unifiedEvents: unifiedEvents?.length || 0,
      dateRange,
      debugHolidays: debugHolidays?.count || 0,
      eventsError: eventsError?.message,
      sampleEvents: unifiedEvents?.slice(0, 3),
      sampleDebugHolidays: debugHolidays?.holidays?.slice(0, 2)
    });

    // Add unified calendar events (holidays, academic events, etc.)
    if (unifiedEvents && Array.isArray(unifiedEvents)) {
      unifiedEvents.forEach(event => {
        // Find campus name if campusId exists
        const campus = campuses?.find(c => c.id === event.campusId);

        // Map event types to calendar event types
        let calendarEventType: 'SCHEDULE' | 'ACADEMIC_EVENT' | 'HOLIDAY' = 'SCHEDULE';
        if (event.source === 'holiday') {
          calendarEventType = 'HOLIDAY';
        } else if (event.source === 'academic') {
          calendarEventType = 'ACADEMIC_EVENT';
        }

        events.push({
          id: event.id,
          title: event.title,
          start: new Date(event.startDate),
          end: new Date(event.endDate),
          type: calendarEventType,
          source: event.source,
          color: event.color || (event.source === 'holiday' ? '#EF4444' : event.source === 'academic' ? '#10B981' : '#3B82F6'),
          description: event.description || '',
          location: event.location,
          campusId: event.campusId,
          campusName: campus?.name,
          createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
          status: event.status,
        });
      });
    }

    console.log('Formatted Calendar Events:', events.length, events.slice(0, 3));
    return events;
  }, [unifiedEvents, dateRange, campuses, debugHolidays]);

  // Event handlers
  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };



  const handleViewChange = (newView: 'month' | 'week' | 'day' | 'year') => {
    setView(newView);
  };

  const handleDateRangeChange = (range?: { from?: Date; to?: Date }) => {
    if (range) {
      setDateRange(range);
    }
  };

  const isLoading = isLoadingEvents || !user;

  if (!user) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Academic Calendar"
            description="Loading user information..."
          />
        </div>
        <Card className="p-6 flex items-center justify-center h-64">
          <CalendarIcon className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading user information...</span>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Academic Calendar"
          description="View academic events and schedule patterns"
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <DatePicker
              type="range"
              label="Date Range"
              selected={dateRange}
              onSelect={handleDateRangeChange}
              dateFormat="MMM d, yyyy"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              testCreateHoliday.mutate({
                name: `Test Holiday ${new Date().getTime()}`,
                description: 'Debug test holiday',
                startDate: new Date(),
                endDate: new Date(),
                campusIds: [],
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
            {testCreateHoliday.isLoading ? 'Creating...' : 'Test Holiday'}
          </Button>

          <div className="w-48">
            <Select
              value={selectedFilters.campusId}
              onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, campusId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {campuses?.map(campus => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-48">
            <Select
              value={selectedFilters.eventType}
              onValueChange={(value) => setSelectedFilters(prev => ({ ...prev, eventType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Event Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                <SelectItem value="REGISTRATION">Registration</SelectItem>
                <SelectItem value="ADD_DROP">Add/Drop</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="EXAMINATION">Examination</SelectItem>
                <SelectItem value="GRADING">Grading</SelectItem>
                <SelectItem value="ORIENTATION">Orientation</SelectItem>
                <SelectItem value="GRADUATION">Graduation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <CalendarIcon className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading calendar...</span>
          </div>
        ) : calendarEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium">No Events Found</h3>
            <p className="mt-1">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <Calendar 
            events={calendarEvents}
            onEventClick={handleEventClick}
            userType={user.userType as any}
            view={view}
            onViewChange={handleViewChange}
          />
        )}
      </Card>

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
      />
    </div>
  );
}