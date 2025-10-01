'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { PersonalCalendar, type PersonalCalendarEvent } from '@/components/common/calendar/PersonalCalendar';
import { EventModal } from '@/components/common/calendar/EventModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/core/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/trpc/react';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

export default function StudentCalendarPage() {
  const { data: session, status } = useSession();
  const [selectedEvent, setSelectedEvent] = useState<PersonalCalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

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
  if (session.user.userType !== 'STUDENT') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This page is only accessible to students. Please use the appropriate calendar for your role.
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
              My Calendar 📅
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Organize your schedule and stay on track with your studies
            </p>
          </div>
        </div>

        {/* Personal Calendar */}
        <PersonalCalendar
          userId={session.user.id}
          userRole="STUDENT"
          view={view}
          onViewChange={setView}
          className="bg-card rounded-lg border shadow-sm"
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onCreateEvent={handleCreateEvent}
        />

        {/* Quick Actions */}
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
                  <CalendarIcon className="h-4 w-4" />
                  <span>Add Study Session</span>
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
                  <CalendarIcon className="h-4 w-4" />
                  <span>Schedule Assignment</span>
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
                  <CalendarIcon className="h-4 w-4" />
                  <span>Plan Exam Prep</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                📚 Study Tips
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Use your personal calendar to schedule study sessions, track assignment deadlines, 
                and plan exam preparation. Color-coded events help you quickly identify different 
                types of activities at a glance.
              </p>
            </div>
          </CardContent>
        </Card>
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
