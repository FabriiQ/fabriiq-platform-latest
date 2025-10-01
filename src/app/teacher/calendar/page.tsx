'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { PersonalCalendar } from '@/components/common/calendar/PersonalCalendar';
import { EventModal } from '@/components/common/calendar/EventModal';
import { CalendarHeader } from '@/components/common/calendar/CalendarHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/core/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/trpc/react';
import { type PersonalCalendarEvent } from '@prisma/client';
import { Calendar as CalendarIcon, AlertCircle, BookOpen, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';

export default function TeacherCalendarPage() {
  const { data: session, status } = useSession();
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  // Get events count for the current month
  const { data: eventsCount } = api.personalCalendar.getEventsCount.useQuery(
    {
      startDate: startOfMonth(currentDate),
      endDate: endOfMonth(currentDate),
    },
    {
      enabled: !!session?.user?.id,
    }
  );

  // Refetch events when needed
  const utils = api.useUtils();

  const handleEventClick = (event: PersonalCalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = (date?: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date || new Date());
    setIsEventModalOpen(true);
  };

  const handleEventSave = (event: PersonalCalendarEvent) => {
    // Refetch events to update the calendar
    utils.personalCalendar.getEvents.invalidate();
    utils.personalCalendar.getEventsCount.invalidate();
  };

  const handleEventDelete = (eventId: string) => {
    // Refetch events to update the calendar
    utils.personalCalendar.getEvents.invalidate();
    utils.personalCalendar.getEventsCount.invalidate();
  };

  const handleCloseModal = () => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else if (direction === 'prev') {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() - 1);
        return newDate;
      });
    } else if (direction === 'next') {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
      });
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-64 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
          </div>

          {/* Calendar Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Authentication check
  if (status === 'unauthenticated' || !session?.user) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to access your personal calendar.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // User type check
  if (session.user.userType !== 'TEACHER') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This page is only accessible to teachers. Please use the appropriate calendar for your role.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary rounded-full">
              <CalendarIcon className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              My Teaching Calendar 📅
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage your schedule, plan lessons, and organize your teaching activities
            </p>
          </div>
        </div>

        {/* Calendar Header */}
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          onCreateEvent={() => handleCreateEvent()}
          onNavigate={handleNavigate}
          eventsCount={eventsCount?.count}
          className="bg-card rounded-lg border"
        />

        {/* Personal Calendar */}
        <PersonalCalendar
          userId={session.user.id}
          userRole="TEACHER"
          initialView={view}
          className="bg-card rounded-lg border shadow-sm"
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onCreateEvent={handleCreateEvent}
        />

        {/* Quick Actions for Teachers */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Quick Actions
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleCreateEvent()}
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Plan Lesson</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    handleCreateEvent(tomorrow);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Schedule Meeting</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    handleCreateEvent(nextWeek);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Set Reminder</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher-specific Tips Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                🍎 Teaching Tips
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Use your personal calendar to plan lessons, schedule parent meetings, 
                set grading deadlines, and organize professional development activities. 
                Keep your teaching schedule organized and never miss important dates.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Schedule Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground">Lesson Planning</h4>
              <p className="text-sm text-muted-foreground">
                Schedule and organize your lesson plans
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground">Meetings</h4>
              <p className="text-sm text-muted-foreground">
                Track parent conferences and staff meetings
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-foreground">Deadlines</h4>
              <p className="text-sm text-muted-foreground">
                Never miss grading or administrative deadlines
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        selectedDate={selectedDate || undefined}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  );
}
