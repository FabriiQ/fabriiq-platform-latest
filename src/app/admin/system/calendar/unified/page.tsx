/**
 * Unified Calendar Management Page
 * 
 * System admin page for managing all calendar events in a unified interface
 */

'use client';

import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { UnifiedCalendarView } from '@/components/calendar/enhanced/UnifiedCalendarView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon,
  Plus,
  Settings,
  Download,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/trpc/react';
import { UnifiedCalendarEvent, CalendarViewType } from '@/types/calendar/unified-events';
import { useToast } from '@/components/ui/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function UnifiedCalendarPage() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get calendar statistics for the current month
  const currentDate = new Date();
  const { data: statistics } = api.unifiedCalendar.getStatistics.useQuery({
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate)
  });

  // Get conflicts for the current month
  const { data: conflicts = [] } = api.unifiedCalendar.detectConflicts.useQuery({
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate)
  });

  const handleEventClick = (event: UnifiedCalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = (date: Date) => {
    setSelectedDate(date);
    setIsCreateDialogOpen(true);
  };

  const handleExportCalendar = () => {
    toast({
      title: "Export Started",
      description: "Calendar export is being prepared. You'll receive a download link shortly.",
    });
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'timetable_period': 'bg-blue-100 text-blue-800',
      'academic_event': 'bg-green-100 text-green-800',
      'holiday': 'bg-red-100 text-red-800',
      'exam': 'bg-orange-100 text-orange-800',
      'meeting': 'bg-purple-100 text-purple-800',
      'personal': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PageLayout
      title="Unified Calendar Management"
      description="Manage all calendar events across the institution in a unified interface"
      breadcrumbs={[
        { label: 'System Admin', href: '/admin/system' },
        { label: 'Calendar', href: '/admin/system/calendar' },
        { label: 'Unified View', href: '#' },
      ]}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCalendar}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.upcomingEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Next 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conflicts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.conflictCount}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(statistics.eventsBySource).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Event sources
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Calendar Conflicts Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found that require attention.
              </p>
              <div className="space-y-2">
                {conflicts.slice(0, 3).map((conflict) => (
                  <div key={conflict.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="font-medium text-sm">{conflict.description}</p>
                      <p className="text-xs text-gray-600">
                        {conflict.affectedEvents.length} events affected
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {conflict.severity}
                    </Badge>
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <p className="text-sm text-red-600">
                    And {conflicts.length - 3} more conflicts...
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-4">
                View All Conflicts
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Calendar View */}
        <UnifiedCalendarView
          initialView={CalendarViewType.MONTH}
          showFilters={true}
          showConflicts={true}
          allowEventCreation={true}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventCreate={handleCreateEvent}
          className="min-h-[600px]"
        />

        {/* Event Details Dialog */}
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
              <DialogDescription>
                View and manage calendar event information
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge className={getEventTypeColor(selectedEvent.type)}>
                      {selectedEvent.type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {selectedEvent.source}
                    </Badge>
                  </div>
                </div>

                {selectedEvent.description && (
                  <p className="text-gray-600">{selectedEvent.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-sm">{selectedEvent.startDate.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Date</label>
                    <p className="text-sm">{selectedEvent.endDate.toLocaleString()}</p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-sm">{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.teacherName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Teacher</label>
                    <p className="text-sm">{selectedEvent.teacherName}</p>
                  </div>
                )}

                {selectedEvent.className && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Class</label>
                    <p className="text-sm">{selectedEvent.className}</p>
                  </div>
                )}

                {selectedEvent.subject && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Subject</label>
                    <p className="text-sm">{selectedEvent.subject}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  {selectedEvent.canEdit && (
                    <Button variant="outline">Edit Event</Button>
                  )}
                  {selectedEvent.canDelete && (
                    <Button variant="destructive">Delete Event</Button>
                  )}
                  <Button onClick={() => setIsEventDialogOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Event Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Add a new event to the calendar
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Event creation form would go here...
              </p>
              {selectedDate && (
                <p className="text-sm">
                  Selected date: {selectedDate.toLocaleDateString()}
                </p>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Create Event</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
