/**
 * Unified Calendar View Component
 * 
 * Enhanced calendar component that displays all types of events in a unified interface
 * with advanced filtering, conflict detection, and multiple view modes.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  Eye,
  Settings,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  UnifiedCalendarEvent,
  CalendarEventType,
  EventSource,
  CalendarViewType,
  CalendarFilter,
  FilterOperator,
  CalendarConflict
} from '@/types/calendar/unified-events';
import {
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  format,
  isSameDay,
  isWithinInterval
} from 'date-fns';

interface UnifiedCalendarViewProps {
  initialView?: CalendarViewType;
  initialDate?: Date;
  showFilters?: boolean;
  showConflicts?: boolean;
  allowEventCreation?: boolean;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventCreate?: (date: Date) => void;
  className?: string;
}

export const UnifiedCalendarView: React.FC<UnifiedCalendarViewProps> = ({
  initialView = CalendarViewType.MONTH,
  initialDate = new Date(),
  showFilters = true,
  showConflicts = true,
  allowEventCreation = false,
  onEventClick,
  onDateClick,
  onEventCreate,
  className
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Helper functions for missing date-fns functions
  const startOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  };

  const startOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  const endOfDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return isSameDay(date, today);
  };
  
  // State management
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewType, setViewType] = useState(initialView);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<CalendarFilter[]>([]);
  const [visibleSources, setVisibleSources] = useState<Set<EventSource>>(
    new Set([EventSource.TIMETABLE, EventSource.ACADEMIC, EventSource.HOLIDAY, EventSource.PERSONAL])
  );
  const [visibleTypes, setVisibleTypes] = useState<Set<CalendarEventType>>(
    new Set(Object.values(CalendarEventType))
  );

  // Calculate date range based on view type
  const dateRange = useMemo(() => {
    switch (viewType) {
      case CalendarViewType.DAY:
        return {
          startDate: startOfDay(currentDate),
          endDate: endOfDay(currentDate)
        };
      case CalendarViewType.WEEK:
        return {
          startDate: startOfWeek(currentDate),
          endDate: endOfWeek(currentDate)
        };
      case CalendarViewType.MONTH:
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate)
        };
      case CalendarViewType.YEAR:
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(addMonths(currentDate, 11))
        };
      default:
        return {
          startDate: startOfMonth(currentDate),
          endDate: endOfMonth(currentDate)
        };
    }
  }, [currentDate, viewType]);

  // Add campus filtering for campus admins
  const campusFilters = React.useMemo(() => {
    const filters = [...activeFilters];

    // For campus admins, automatically filter by their campus
    if (user?.userType === 'CAMPUS_ADMIN' && (user as any)?.primaryCampusId) {
      filters.push({
        field: 'campusId',
        operator: FilterOperator.EQUALS,
        value: (user as any).primaryCampusId
      });
    }

    return filters;
  }, [activeFilters, user]);

  // Fetch unified calendar events
  const {
    data: events = [],
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = api.unifiedCalendar.getEvents.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    filters: campusFilters,
    includeTimetables: visibleSources.has(EventSource.TIMETABLE),
    includeAcademic: visibleSources.has(EventSource.ACADEMIC),
    includeHolidays: visibleSources.has(EventSource.HOLIDAY),
    includePersonal: visibleSources.has(EventSource.PERSONAL)
  });

  // Fetch conflicts if enabled
  const { 
    data: conflicts = [],
    isLoading: conflictsLoading
  } = api.unifiedCalendar.detectConflicts.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  }, {
    enabled: showConflicts
  });

  // Fetch calendar statistics
  const { data: statistics } = api.unifiedCalendar.getStatistics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Filter events by visible types and sources
  const filteredEvents = useMemo(() => {
    return events.filter(event => 
      visibleSources.has(event.source) && visibleTypes.has(event.type)
    );
  }, [events, visibleSources, visibleTypes]);

  // Navigation handlers
  const handlePrevious = () => {
    switch (viewType) {
      case CalendarViewType.DAY:
        setCurrentDate(subDays(currentDate, 1));
        break;
      case CalendarViewType.WEEK:
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case CalendarViewType.MONTH:
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case CalendarViewType.YEAR:
        setCurrentDate(subMonths(currentDate, 12));
        break;
    }
  };

  const handleNext = () => {
    switch (viewType) {
      case CalendarViewType.DAY:
        setCurrentDate(addDays(currentDate, 1));
        break;
      case CalendarViewType.WEEK:
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case CalendarViewType.MONTH:
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case CalendarViewType.YEAR:
        setCurrentDate(addMonths(currentDate, 12));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleEventClick = (event: UnifiedCalendarEvent) => {
    onEventClick?.(event);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  const handleCreateEvent = (date: Date) => {
    onEventCreate?.(date);
  };

  // Filter handlers
  const toggleSourceVisibility = (source: EventSource) => {
    const newVisibleSources = new Set(visibleSources);
    if (newVisibleSources.has(source)) {
      newVisibleSources.delete(source);
    } else {
      newVisibleSources.add(source);
    }
    setVisibleSources(newVisibleSources);
  };

  const toggleTypeVisibility = (type: CalendarEventType) => {
    const newVisibleTypes = new Set(visibleTypes);
    if (newVisibleTypes.has(type)) {
      newVisibleTypes.delete(type);
    } else {
      newVisibleTypes.add(type);
    }
    setVisibleTypes(newVisibleTypes);
  };

  // Get title for current view
  const getViewTitle = () => {
    switch (viewType) {
      case CalendarViewType.DAY:
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case CalendarViewType.WEEK:
        return `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`;
      case CalendarViewType.MONTH:
        return format(currentDate, 'MMMM yyyy');
      case CalendarViewType.YEAR:
        return format(currentDate, 'yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  // Get event color with conflict indication
  const getEventDisplayColor = (event: UnifiedCalendarEvent) => {
    const hasConflict = conflicts.some(conflict => 
      conflict.affectedEvents.includes(event.id)
    );
    
    if (hasConflict) {
      return '#EF4444'; // Red for conflicts
    }
    
    return event.color || '#6B7280';
  };

  if (eventsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading calendar...</span>
        </CardContent>
      </Card>
    );
  }

  if (eventsError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Calendar</h3>
            <p className="text-gray-600 mb-4">Failed to load calendar events</p>
            <Button onClick={() => refetchEvents()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Calendar
            </CardTitle>
            
            {/* View Type Selector */}
            <Select value={viewType} onValueChange={(value) => setViewType(value as CalendarViewType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CalendarViewType.DAY}>Day</SelectItem>
                <SelectItem value={CalendarViewType.WEEK}>Week</SelectItem>
                <SelectItem value={CalendarViewType.MONTH}>Month</SelectItem>
                <SelectItem value={CalendarViewType.YEAR}>Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            {/* Statistics */}
            {statistics && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{statistics.totalEvents} events</span>
                {statistics.conflictCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {statistics.conflictCount} conflicts
                  </Badge>
                )}
              </div>
            )}

            {/* Filters Toggle */}
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
            )}

            {/* Navigation */}
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Current View Title */}
        <div className="text-lg font-medium text-gray-900">
          {getViewTitle()}
        </div>

        {/* Filters Panel */}
        {showFiltersPanel && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Sources */}
              <div>
                <h4 className="text-sm font-medium mb-2">Event Sources</h4>
                <div className="space-y-2">
                  {Object.values(EventSource).map(source => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source}`}
                        checked={visibleSources.has(source)}
                        onCheckedChange={() => toggleSourceVisibility(source)}
                      />
                      <label htmlFor={`source-${source}`} className="text-sm capitalize">
                        {source.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Types */}
              <div>
                <h4 className="text-sm font-medium mb-2">Event Types</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.values(CalendarEventType).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={visibleTypes.has(type)}
                        onCheckedChange={() => toggleTypeVisibility(type)}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm capitalize">
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Calendar View Component will be rendered here */}
        <div className="calendar-view-container">
          {/* This would contain the actual calendar grid/view */}
          {/* For now, showing a simple event list */}
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">No Events Found</h3>
                <p className="mt-1">No events found for the selected period and filters.</p>
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEventClick(event)}
                  style={{ borderLeftColor: getEventDisplayColor(event), borderLeftWidth: '4px' }}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ')}
                      </Badge>
                      {conflicts.some(conflict => conflict.affectedEvents.includes(event.id)) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Conflict
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(event.startDate, 'MMM d, h:mm a')} - {format(event.endDate, 'h:mm a')}
                    </p>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
