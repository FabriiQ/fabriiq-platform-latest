'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/core/skeleton';
import { cn } from '@/lib/utils';
import {
  format,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays
} from 'date-fns';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { isToday } from 'date-fns/isToday';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock
} from 'lucide-react';
import { PersonalEventType } from '@/types/calendar';

// Define the PersonalCalendarEvent type for calendar events
export interface PersonalCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  type: string;
  color?: string | null;
  source?: string;
  classId?: string;
  className?: string;
  subjectName?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  status?: 'ACTIVE' | 'DELETED' | 'INACTIVE';
}

interface PersonalCalendarProps {
  userId: string;
  userRole: 'TEACHER' | 'STUDENT';
  initialView?: 'month' | 'week' | 'day';
  view?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
  className?: string;
  onEventClick?: (event: PersonalCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onCreateEvent?: (date?: Date) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: PersonalCalendarEvent[];
}

// Event type colors mapping
const EVENT_TYPE_COLORS: Record<PersonalEventType, string> = {
  STUDY_SESSION: 'bg-primary text-primary-foreground',
  ASSIGNMENT: 'bg-blue-500 text-white',
  EXAM_PREP: 'bg-red-500 text-white',
  MEETING: 'bg-gray-500 text-white',
  PERSONAL: 'bg-green-500 text-white',
  REMINDER: 'bg-orange-500 text-white',
  BREAK: 'bg-gray-400 text-white',
};

const EVENT_TYPE_LABELS: Record<PersonalEventType, string> = {
  STUDY_SESSION: 'Study',
  ASSIGNMENT: 'Assignment',
  EXAM_PREP: 'Exam Prep',
  MEETING: 'Meeting',
  PERSONAL: 'Personal',
  REMINDER: 'Reminder',
  BREAK: 'Break',
};

export function PersonalCalendar({
  userId,
  userRole,
  initialView = 'month',
  view: controlledView,
  onViewChange,
  className,
  onEventClick,
  onDateClick,
  onCreateEvent,
}: PersonalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [internalView, setInternalView] = useState<'month' | 'week' | 'day'>(initialView);

  // Use controlled view if provided, otherwise use internal view
  const view = controlledView ?? internalView;
  const setView = (newView: 'month' | 'week' | 'day') => {
    if (onViewChange) {
      onViewChange(newView);
    } else {
      setInternalView(newView);
    }
  };

  // Calculate date range for API call based on view
  const getDateRange = () => {
    switch (view) {
      case 'day':
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate)
        };
      case 'week':
        return {
          startDate: startOfWeek(currentDate),
          endDate: endOfWeek(currentDate)
        };
      case 'month':
      default:
        return {
          startDate: startOfWeek(startOfMonth(currentDate)),
          endDate: endOfWeek(endOfMonth(currentDate))
        };
    }
  };

  const { startDate, endDate } = getDateRange();

  // Fetch personal events using tRPC
  const {
    data: personalEvents = [],
    isLoading: isLoadingPersonal,
    error: personalError,
    refetch: refetchPersonal
  } = api.personalCalendar.getEvents.useQuery({
    startDate,
    endDate,
  });

  // Get user's campus ID for filtering
  const { data: userProfile } = api.user.getById.useQuery(userId, {
    enabled: !!userId,
  });

  const userCampusId = userProfile?.primaryCampusId;

  // Fetch unified events (holidays, academic events) for students and teachers
  // Filter by user's campus to show only relevant events
  const {
    data: unifiedEvents = [],
    isLoading: isLoadingUnified,
    error: unifiedError,
    refetch: refetchUnified
  } = api.unifiedCalendar.getEvents.useQuery({
    startDate,
    endDate,
    filters: userCampusId ? [{
      field: 'campusId',
      operator: 'equals' as any,
      value: userCampusId
    }] : [],
    includePersonal: false, // We already fetch personal events separately
    includeTimetables: true,
    includeAcademic: true,
    includeHolidays: true
  }, {
    enabled: !!userCampusId, // Only fetch when we have the user's campus ID
  });

  // Fetch class activities for students
  const {
    data: classActivities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
    refetch: refetchActivities
  } = api.personalCalendar.getClassActivities.useQuery({
    startDate,
    endDate,
  }, {
    enabled: userRole === 'STUDENT',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Failed to fetch class activities:', error);
    }
  });

  // Convert unified events to personal calendar format
  const unifiedCalendarEvents = unifiedEvents.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description || '',
    startDate: event.startDate,
    endDate: event.endDate,
    type: event.source === 'holiday' ? 'PERSONAL' as const : 'REMINDER' as const,
    color: event.color || (event.source === 'holiday' ? '#EF4444' : '#10B981'),
    isAllDay: true,
    userId: userId,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Combine all events
  const events = [...personalEvents, ...classActivities, ...unifiedCalendarEvents];
  const isLoading = isLoadingPersonal || isLoadingUnified || (userRole === 'STUDENT' && isLoadingActivities);
  const error = personalError || unifiedError || activitiesError;
  const refetch = () => {
    refetchPersonal();
    refetchUnified();
    if (userRole === 'STUDENT') {
      refetchActivities();
    }
  };



  // Debug logging
  React.useEffect(() => {
    console.log('Calendar Debug Info:', {
      view,
      controlledView,
      internalView,
      dateRange: { startDate, endDate },
      userCampusId,
      personalEvents: personalEvents.length,
      classActivities: classActivities.length,
      unifiedEvents: unifiedEvents.length,
      totalEvents: events.length,
      isLoading,
      error: error?.message
    });

    if (classActivities.length > 0) {
      console.log('Class Activities Sample:', classActivities.slice(0, 3));
    }
    if (unifiedEvents.length > 0) {
      console.log('Unified Events Sample (Campus Filtered):', unifiedEvents.slice(0, 3));
    }
  }, [view, controlledView, internalView, startDate, endDate, userCampusId, personalEvents, classActivities, unifiedEvents, events, isLoading, error]);

  // Generate calendar days
  const generateCalendarDays = (): CalendarDay[] => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(date => ({
      date,
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isToday(date),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      events: events.filter(event =>
        isSameDay(new Date(event.startDate), date)
      ).map(event => ({
        ...event,
        status: (event as any).status === 'INACTIVE' ? 'DELETED' : ((event as any).status || 'ACTIVE')
      })),
    }));
  };

  const calendarDays = generateCalendarDays();

  // Group days into weeks
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Generate week days for week view
  const generateWeekDays = (): CalendarDay[] => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map(date => ({
      date,
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isToday(date),
      isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
      events: events.filter(event =>
        isSameDay(new Date(event.startDate), date)
      ).map(event => ({
        ...event,
        status: (event as any).status === 'INACTIVE' ? 'DELETED' : ((event as any).status || 'ACTIVE')
      })),
    }));
  };

  // Generate day events for day view
  const generateDayEvents = () => {
    return events.filter(event =>
      isSameDay(new Date(event.startDate), currentDate)
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setCurrentDate(day.date);
    // Switch to day view if there are events on this day
    if (day.events.length > 0) {
      setView('day');
    }
    onDateClick?.(day.date);
  };

  const handleEventClick = (event: PersonalCalendarEvent | any, e: React.MouseEvent) => {
    e.stopPropagation();

    // Handle navigation for class activities and commitments
    if ((event as any).source === 'activity' && (event as any).classId) {
      // Navigate to class activity
      const activityId = (event as any).id.replace('activity-', '');
      window.location.href = `/student/class/${(event as any).classId}/activities/${activityId}`;
      return;
    }

    if ((event as any).source === 'commitment' && (event as any).classId) {
      // Navigate to class commitments
      window.location.href = `/student/class/${(event as any).classId}/commitments`;
      return;
    }

    if ((event as any).source === 'goal' && (event as any).classId) {
      // Navigate to class goals/profile page
      window.location.href = `/student/class/${(event as any).classId}/profile`;
      return;
    }

    // Handle personal calendar events
    onEventClick?.(event);
  };

  const handleCreateEvent = (date?: Date) => {
    onCreateEvent?.(date || selectedDate || new Date());
  };

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (view) {
        case 'day':
          return direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
        case 'week':
          return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
        case 'month':
        default:
          return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      }
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Calendar Loading Error</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activitiesError ? 'Failed to load class activities and events' : 'Failed to load calendar events'}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="w-full"
              >
                Try Again
              </Button>
              {activitiesError && (
                <p className="text-xs text-muted-foreground">
                  Personal events may still be available
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Calendar Controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold">
          {view === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : view === 'week'
            ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
            : format(currentDate, 'MMMM yyyy')
          }
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="rounded-r-none"
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="rounded-none border-x-0"
            >
              Week
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className="rounded-l-none"
            >
              Day
            </Button>
          </div>

          {/* Create Event Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => onCreateEvent?.()}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

        {isLoading ? (
          <div className="p-6">
            {view === 'month' ? (
              <>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </>
            ) : view === 'week' ? (
              <>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center font-medium text-sm">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-96 w-full" />
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {view === 'month' && (
              <>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 gap-px mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div
                      key={day}
                      className="p-2 text-center font-medium text-sm text-muted-foreground bg-muted/50"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px border rounded-lg overflow-hidden">
                  {weeks.map((week, weekIndex) => (
                    <React.Fragment key={weekIndex}>
                      {week.map((day, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={cn(
                            'min-h-[100px] p-2 cursor-pointer transition-colors',
                            'border-r border-b last:border-r-0',
                            'hover:bg-muted/50',
                            !day.isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                            day.isToday && 'bg-primary/10 border-primary/20',
                            day.isSelected && 'bg-primary/20 border-primary/40'
                          )}
                          onClick={() => handleDateClick(day)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                              'text-sm font-medium',
                              day.isToday && 'text-primary font-bold'
                            )}>
                              {format(day.date, 'd')}
                            </span>
                            {day.events.length > 0 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                {day.events.length}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            {day.events.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  'text-xs p-1 rounded cursor-pointer truncate',
                                  EVENT_TYPE_COLORS[event.type]
                                )}
                                onClick={(e) => handleEventClick(event, e)}
                                title={`${event.title}${(event as any).className ? ` - ${(event as any).className}` : ''}`}
                              >
                                <div className="flex items-center gap-1">
                                  {(event as any).source === 'activity' && (
                                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                                  )}
                                  {(event as any).source === 'commitment' && (
                                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                                  )}
                                  {(event as any).source === 'goal' && (
                                    <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                                  )}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              </div>
                            ))}
                            {day.events.length > 2 && (
                              <div
                                className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors p-1 rounded hover:bg-muted/50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDateClick(day);
                                }}
                                title="Click to view all events for this day"
                              >
                                +{day.events.length - 2} more events
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </>
            )}

            {view === 'week' && (
              <>
                {/* Week Header */}
                <div className="grid grid-cols-7 gap-px mb-2">
                  {generateWeekDays().map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 text-center font-medium text-sm bg-muted/50",
                        day.isToday && "bg-primary/20 text-primary"
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(day.date, 'EEE')}
                      </div>
                      <div className={cn(
                        "text-lg font-bold",
                        day.isToday && "text-primary"
                      )}>
                        {format(day.date, 'd')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Week Grid */}
                <div className="grid grid-cols-7 gap-px border rounded-lg overflow-hidden">
                  {generateWeekDays().map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        'min-h-[400px] p-2 cursor-pointer transition-colors',
                        'border-r border-b last:border-r-0',
                        'hover:bg-muted/50',
                        day.isToday && 'bg-primary/10 border-primary/20',
                        day.isSelected && 'bg-primary/20 border-primary/40'
                      )}
                      onClick={() => handleDateClick(day)}
                    >
                      <div className="space-y-1">
                        {day.events.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              'text-xs p-2 rounded cursor-pointer',
                              EVENT_TYPE_COLORS[event.type]
                            )}
                            onClick={(e) => handleEventClick(event, e)}
                            title={event.description || event.title}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-xs opacity-75">
                              {format(new Date(event.startDate), 'HH:mm')}
                            </div>
                          </div>
                        ))}
                        {day.events.length === 0 && (
                          <div
                            className="text-xs text-muted-foreground p-2 rounded border-2 border-dashed border-muted hover:border-primary/50 transition-colors"
                            onClick={() => handleCreateEvent(day.date)}
                          >
                            Click to add event
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {view === 'day' && (
              <div className="space-y-4">
                {/* Day Header */}
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <h3 className="text-lg font-semibold">
                    {format(currentDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {generateDayEvents().length} event{generateDayEvents().length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>

                {/* Day Events */}
                <div className="space-y-2">
                  {generateDayEvents().length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-muted-foreground">No events today</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start planning your day by adding an event
                      </p>
                      <Button onClick={() => handleCreateEvent(currentDate)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                    </div>
                  ) : (
                    generateDayEvents().map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'p-4 rounded-lg cursor-pointer transition-colors border',
                          EVENT_TYPE_COLORS[event.type],
                          'hover:shadow-md'
                        )}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{event.title}</h4>
                              {(event as any).source && (
                                <Badge variant="outline" className="text-xs">
                                  {(event as any).source === 'activity' ? 'Activity' :
                                   (event as any).source === 'commitment' ? 'Commitment' :
                                   (event as any).source === 'goal' ? 'Goal' : 'Personal'}
                                </Badge>
                              )}

                              {(event as any).progress !== undefined && (
                                <Badge variant="secondary" className="text-xs">
                                  {(event as any).progress}% Complete
                                </Badge>
                              )}
                            </div>

                            {(event as any).className && (
                              <p className="text-sm font-medium text-primary mb-1">
                                {(event as any).className}
                                {(event as any).subjectName && ` - ${(event as any).subjectName}`}
                              </p>
                            )}

                            {event.description && (
                              <p className="text-sm opacity-75 mt-1">{event.description}</p>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {event.isAllDay ? 'All day' : (
                                    <>
                                      {format(new Date(event.startDate), 'HH:mm')}
                                      {event.endDate && event.startDate !== event.endDate &&
                                        ` - ${format(new Date(event.endDate), 'HH:mm')}`}
                                    </>
                                  )}
                                </span>
                              </div>

                              {(event as any).purpose && (
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-current"></span>
                                  <span>{(event as any).purpose.replace('_', ' ').toLowerCase()}</span>
                                </div>
                              )}

                              {(event as any).priority && (
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-current"></span>
                                  <span>Priority: {(event as any).priority.toLowerCase()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {event.type.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
