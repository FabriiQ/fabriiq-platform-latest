/**
 * Resource Calendar View Component
 * 
 * Displays calendar focused on resource availability and bookings
 * (teachers, facilities, equipment)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { 
  Users, 
  MapPin, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  UnifiedCalendarEvent,
  CalendarEventType,
  EventSource
} from '@/types/calendar/unified-events';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  addDays,
  isSameDay,
  isWithinInterval
} from 'date-fns';

// Resource types
export enum ResourceType {
  TEACHER = 'teacher',
  FACILITY = 'facility',
  EQUIPMENT = 'equipment'
}

// Resource availability status
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
  TENTATIVE = 'tentative'
}

// Resource interface
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  email?: string;
  capacity?: number;
  location?: string;
  department?: string;
  specializations?: string[];
  workingHours?: {
    start: string;
    end: string;
    daysOfWeek: number[];
  };
  isActive: boolean;
}

// Time slot interface
export interface TimeSlot {
  start: Date;
  end: Date;
  status: AvailabilityStatus;
  event?: UnifiedCalendarEvent;
  conflictCount?: number;
}

interface ResourceCalendarViewProps {
  resourceType: ResourceType;
  selectedResourceIds?: string[];
  onResourceSelect?: (resourceIds: string[]) => void;
  onTimeSlotClick?: (resource: Resource, timeSlot: TimeSlot) => void;
  onResourceBook?: (resourceId: string, timeSlot: { start: Date; end: Date }) => void;
  showAvailabilityOnly?: boolean;
  allowBooking?: boolean;
  className?: string;
}

export const ResourceCalendarView: React.FC<ResourceCalendarViewProps> = ({
  resourceType,
  selectedResourceIds = [],
  onResourceSelect,
  onTimeSlotClick,
  onResourceBook,
  showAvailabilityOnly = false,
  allowBooking = false,
  className
}) => {
  const { toast } = useToast();
  
  // State management
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Calculate week range
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch resources based on type
  const { data: teachersData, isLoading: resourcesLoading } = api.teacher.getAllTeachers.useQuery(
    {
      campusId: 'all', // You might want to make this configurable
      limit: 100,
      search: searchQuery || undefined
    },
    {
      enabled: resourceType === ResourceType.TEACHER
    }
  );

  const { data: facilitiesData, isLoading: facilitiesLoading } = api.facility.getFacilities.useQuery(
    {
      campusId: 'all', // You might want to make this configurable
      status: 'ACTIVE' as any
    },
    {
      enabled: resourceType === ResourceType.FACILITY
    }
  );

  // Extract the actual arrays from the API responses
  const resources = teachersData?.teachers || [];
  const facilities = facilitiesData || [];

  // Fetch calendar events for the week
  const { data: events = [], isLoading: eventsLoading } = api.unifiedCalendar.getEvents.useQuery({
    startDate: weekStart,
    endDate: weekEnd,
    includeTimetables: true,
    includeAcademic: true,
    includeHolidays: false,
    includePersonal: false
  });

  // Transform data based on resource type
  const transformedResources: Resource[] = useMemo(() => {
    if (resourceType === ResourceType.TEACHER) {
      return resources.map((teacher: any) => ({
        id: teacher.id,
        name: teacher.user?.name || 'Unknown Teacher',
        type: ResourceType.TEACHER,
        email: teacher.user?.email || undefined,
        department: 'General', // Default department since field doesn't exist
        specializations: [], // Default empty array since qualifications might not exist
        isActive: true // Default to active since status field doesn't exist
      }));
    } else if (resourceType === ResourceType.FACILITY) {
      return facilities.map((facility: any) => ({
        id: facility.id,
        name: facility.name,
        type: ResourceType.FACILITY,
        capacity: facility.capacity,
        location: facility.campusId || undefined, // Use campusId instead of campus.name
        department: facility.type || undefined,
        isActive: facility.status === 'ACTIVE'
      }));
    }
    return [];
  }, [resourceType, resources, facilities]);

  // Filter resources
  const filteredResources = useMemo(() => {
    let filtered = transformedResources;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply department filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(resource => resource.department === selectedDepartment);
    }

    // Apply availability filter
    if (!showUnavailable) {
      filtered = filtered.filter(resource => resource.isActive);
    }

    return filtered;
  }, [transformedResources, searchQuery, selectedDepartment, showUnavailable]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(transformedResources.map(r => r.department).filter(Boolean));
    return Array.from(depts);
  }, [transformedResources]);

  // Helper functions for date manipulation
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

  // Generate time slots for each resource
  const generateTimeSlots = (resource: Resource, date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Generate hourly slots from 8 AM to 6 PM
    for (let hour = 8; hour < 18; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Find events that overlap with this slot
      const overlappingEvents = events.filter(event => {
        if (resourceType === ResourceType.TEACHER && event.teacherId !== resource.id) return false;
        if (resourceType === ResourceType.FACILITY && event.facilityId !== resource.id) return false;
        
        return isWithinInterval(slotStart, { start: event.startDate, end: event.endDate }) ||
               isWithinInterval(slotEnd, { start: event.startDate, end: event.endDate }) ||
               (slotStart <= event.startDate && slotEnd >= event.endDate);
      });

      let status = AvailabilityStatus.AVAILABLE;
      let conflictCount = 0;
      let primaryEvent: UnifiedCalendarEvent | undefined;

      if (overlappingEvents.length > 0) {
        status = AvailabilityStatus.BUSY;
        conflictCount = overlappingEvents.length - 1;
        primaryEvent = overlappingEvents[0];
      }

      slots.push({
        start: slotStart,
        end: slotEnd,
        status,
        event: primaryEvent,
        conflictCount
      });
    }

    return slots;
  };

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleThisWeek = () => {
    setCurrentWeek(new Date());
  };

  // Event handlers
  const handleTimeSlotClick = (resource: Resource, timeSlot: TimeSlot) => {
    onTimeSlotClick?.(resource, timeSlot);
  };

  const handleResourceToggle = (resourceId: string) => {
    const newSelection = selectedResourceIds.includes(resourceId)
      ? selectedResourceIds.filter(id => id !== resourceId)
      : [...selectedResourceIds, resourceId];
    
    onResourceSelect?.(newSelection);
  };

  const handleBookTimeSlot = (resource: Resource, timeSlot: TimeSlot) => {
    if (timeSlot.status === AvailabilityStatus.AVAILABLE && allowBooking) {
      onResourceBook?.(resource.id, { start: timeSlot.start, end: timeSlot.end });
    }
  };

  // Get status color
  const getStatusColor = (status: AvailabilityStatus, hasConflict: boolean = false) => {
    if (hasConflict) return 'bg-red-500';
    
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'bg-green-500';
      case AvailabilityStatus.BUSY:
        return 'bg-blue-500';
      case AvailabilityStatus.UNAVAILABLE:
        return 'bg-gray-500';
      case AvailabilityStatus.TENTATIVE:
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: AvailabilityStatus, hasConflict: boolean = false) => {
    if (hasConflict) return <XCircle className="h-3 w-3" />;
    
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return <CheckCircle className="h-3 w-3" />;
      case AvailabilityStatus.BUSY:
        return <Clock className="h-3 w-3" />;
      case AvailabilityStatus.UNAVAILABLE:
        return <XCircle className="h-3 w-3" />;
      case AvailabilityStatus.TENTATIVE:
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (resourcesLoading || facilitiesLoading || eventsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading resource calendar...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            {resourceType === ResourceType.TEACHER && <Users className="h-5 w-5 mr-2" />}
            {resourceType === ResourceType.FACILITY && <MapPin className="h-5 w-5 mr-2" />}
            {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Calendar
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* Week Navigation */}
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Current Week Display */}
        <div className="text-lg font-medium">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={`Search ${resourceType}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {departments.length > 0 && (
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept!}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-unavailable"
              checked={showUnavailable}
              onCheckedChange={(checked) => setShowUnavailable(checked === true)}
            />
            <label htmlFor="show-unavailable" className="text-sm">
              Show unavailable
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredResources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium">No Resources Found</h3>
            <p className="mt-1">No {resourceType}s match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Busy</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Conflict</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>

            {/* Resource Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header with days */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="p-2 font-medium text-sm">Resource</div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className="p-2 text-center">
                      <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                      <div className="text-xs text-gray-500">{format(day, 'MMM d')}</div>
                    </div>
                  ))}
                </div>

                {/* Resource rows */}
                {filteredResources.slice(0, 10).map(resource => (
                  <div key={resource.id} className="grid grid-cols-8 gap-1 mb-2 border-b pb-2">
                    {/* Resource info */}
                    <div className="p-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedResourceIds.includes(resource.id)}
                          onCheckedChange={() => handleResourceToggle(resource.id)}
                        />
                        <div>
                          <div className="font-medium text-sm">{resource.name}</div>
                          {resource.department && (
                            <div className="text-xs text-gray-500">{resource.department}</div>
                          )}
                          {resource.capacity && (
                            <div className="text-xs text-gray-500">Cap: {resource.capacity}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Daily availability */}
                    {weekDays.map(day => {
                      const daySlots = generateTimeSlots(resource, day);
                      const availableSlots = daySlots.filter(slot => slot.status === AvailabilityStatus.AVAILABLE).length;
                      const busySlots = daySlots.filter(slot => slot.status === AvailabilityStatus.BUSY).length;
                      const conflictSlots = daySlots.filter(slot => (slot.conflictCount || 0) > 0).length;

                      return (
                        <div key={`${resource.id}-${day.toISOString()}`} className="p-1">
                          <div className="space-y-1">
                            {/* Summary bar */}
                            <div className="flex h-4 rounded overflow-hidden">
                              <div 
                                className="bg-green-500" 
                                style={{ width: `${(availableSlots / daySlots.length) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-blue-500" 
                                style={{ width: `${(busySlots / daySlots.length) * 100}%` }}
                              ></div>
                              <div 
                                className="bg-red-500" 
                                style={{ width: `${(conflictSlots / daySlots.length) * 100}%` }}
                              ></div>
                            </div>
                            
                            {/* Stats */}
                            <div className="text-xs text-center">
                              <div className="text-green-600">{availableSlots}h free</div>
                              {conflictSlots > 0 && (
                                <div className="text-red-600">{conflictSlots} conflicts</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {filteredResources.length > 10 && (
                  <div className="text-center py-4 text-gray-500">
                    Showing first 10 resources. Use filters to narrow down results.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
