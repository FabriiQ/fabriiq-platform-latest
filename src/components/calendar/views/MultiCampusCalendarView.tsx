/**
 * Multi-Campus Calendar View Component
 * 
 * Displays calendar events across multiple campuses with campus-specific filtering
 * and cross-campus resource management capabilities.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Home,
  Calendar,
  Users,
  MapPin,
  Filter,
  Eye,
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { UnifiedCalendarView } from '../enhanced/UnifiedCalendarView';
import {
  UnifiedCalendarEvent,
  CalendarEventType,
  EventSource,
  CalendarViewType,
  CalendarFilter,
  FilterOperator
} from '@/types/calendar/unified-events';
import { format } from 'date-fns';

// Campus interface
interface Campus {
  id: string;
  name: string;
  code: string;
  location?: string;
  timezone?: string;
  isActive: boolean;
  color?: string;
  eventCount?: number;
  conflictCount?: number;
  utilizationRate?: number;
}

// Cross-campus event interface
interface CrossCampusEvent extends UnifiedCalendarEvent {
  involvedCampuses: string[];
  primaryCampusId: string;
  resourceSharing?: {
    sharedResources: string[];
    requestingCampus: string;
    providingCampus: string;
  };
}

interface MultiCampusCalendarViewProps {
  initialSelectedCampuses?: string[];
  onCampusToggle?: (campusId: string, selected: boolean) => void;
  onCrossCampusEvent?: (event: CrossCampusEvent, targetCampusId: string) => void;
  onResourceShare?: (resourceId: string, fromCampus: string, toCampus: string) => void;
  allowCrossCampusBooking?: boolean;
  showResourceSharing?: boolean;
  className?: string;
}

export const MultiCampusCalendarView: React.FC<MultiCampusCalendarViewProps> = ({
  initialSelectedCampuses = [],
  onCampusToggle,
  onCrossCampusEvent,
  onResourceShare,
  allowCrossCampusBooking = false,
  showResourceSharing = false,
  className
}) => {
  const { toast } = useToast();
  
  // State management
  const [selectedCampuses, setSelectedCampuses] = useState<Set<string>>(
    new Set(initialSelectedCampuses)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'unified' | 'comparison' | 'resource'>('unified');
  const [showCampusColors, setShowCampusColors] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper functions for date manipulation
  const startOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  };

  // Calculate date range for current month
  const dateRange = {
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate)
  };

  // Fetch campuses
  const { data: campusesData = [], isLoading: campusesLoading } = api.campus.getAll.useQuery();

  // Transform campuses data
  const campuses: Campus[] = useMemo(() => {
    return campusesData.map((campus: any, index: number) => ({
      id: campus.id,
      name: campus.name,
      code: campus.code || campus.name.substring(0, 3).toUpperCase(),
      location: campus.location || 'Not specified',
      isActive: campus.status === 'ACTIVE',
      color: getCampusColor(index),
      eventCount: 0, // Will be populated from events
      conflictCount: 0,
      utilizationRate: 0
    }));
  }, [campusesData]);

  // Fetch unified events for selected campuses
  const campusFilters: CalendarFilter[] = selectedCampuses.size > 0 
    ? [{
        field: 'campusId',
        operator: FilterOperator.IN,
        value: Array.from(selectedCampuses)
      }]
    : [];

  const { data: events = [], isLoading: eventsLoading } = api.unifiedCalendar.getEvents.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    filters: campusFilters,
    includeTimetables: true,
    includeAcademic: true,
    includeHolidays: true,
    includePersonal: false
  });

  // Fetch conflicts for selected campuses
  const { data: conflicts = [] } = api.unifiedCalendar.detectConflicts.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  // Calculate campus statistics
  const campusStatistics = useMemo(() => {
    const stats = new Map<string, { eventCount: number; conflictCount: number; utilizationRate: number }>();
    
    // Initialize stats for all campuses
    campuses.forEach(campus => {
      stats.set(campus.id, { eventCount: 0, conflictCount: 0, utilizationRate: 0 });
    });

    // Count events per campus
    events.forEach(event => {
      if (event.campusId) {
        const campusStats = stats.get(event.campusId);
        if (campusStats) {
          campusStats.eventCount++;
        }
      }
    });

    // Count conflicts per campus
    conflicts.forEach(conflict => {
      const affectedEvents = events.filter(event => 
        conflict.affectedEvents.includes(event.id)
      );
      
      affectedEvents.forEach(event => {
        if (event.campusId) {
          const campusStats = stats.get(event.campusId);
          if (campusStats) {
            campusStats.conflictCount++;
          }
        }
      });
    });

    // Calculate utilization rates (simplified)
    stats.forEach((stat, campusId) => {
      const totalPossibleSlots = 30 * 10; // 30 days * 10 hours per day
      stat.utilizationRate = Math.min((stat.eventCount / totalPossibleSlots) * 100, 100);
    });

    return stats;
  }, [campuses, events, conflicts]);

  // Filter events by selected campuses
  const filteredEvents = useMemo(() => {
    if (selectedCampuses.size === 0) return events;
    
    return events.filter(event => 
      !event.campusId || selectedCampuses.has(event.campusId)
    );
  }, [events, selectedCampuses]);

  // Group events by campus
  const eventsByCampus = useMemo(() => {
    const grouped = new Map<string, UnifiedCalendarEvent[]>();
    
    campuses.forEach(campus => {
      grouped.set(campus.id, []);
    });

    filteredEvents.forEach(event => {
      if (event.campusId) {
        const campusEvents = grouped.get(event.campusId) || [];
        campusEvents.push(event);
        grouped.set(event.campusId, campusEvents);
      }
    });

    return grouped;
  }, [campuses, filteredEvents]);

  // Event handlers
  const handleCampusToggle = (campusId: string) => {
    const newSelectedCampuses = new Set(selectedCampuses);
    const isSelected = newSelectedCampuses.has(campusId);
    
    if (isSelected) {
      newSelectedCampuses.delete(campusId);
    } else {
      newSelectedCampuses.add(campusId);
    }
    
    setSelectedCampuses(newSelectedCampuses);
    onCampusToggle?.(campusId, !isSelected);
  };

  const handleSelectAllCampuses = () => {
    const allCampusIds = new Set(campuses.map(c => c.id));
    setSelectedCampuses(allCampusIds);
  };

  const handleDeselectAllCampuses = () => {
    setSelectedCampuses(new Set());
  };

  const handleEventClick = (event: UnifiedCalendarEvent) => {
    // Handle cross-campus event logic if needed
    console.log('Event clicked:', event);
  };

  // Utility functions
  function getCampusColor(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#EC4899', // Pink
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1'  // Indigo
    ];
    return colors[index % colors.length];
  }

  if (campusesLoading || eventsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading multi-campus calendar...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2" />
            Multi-Campus Calendar
          </CardTitle>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCampusColors(!showCampusColors)}
            >
              {showCampusColors ? <Eye className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Campus Colors
            </Button>
            
            {allowCrossCampusBooking && (
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4 mr-1" />
                Cross-Campus Booking
              </Button>
            )}
          </div>
        </div>

        {/* Campus Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Campus Selection</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAllCampuses}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeselectAllCampuses}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {campuses.map(campus => {
              const stats = campusStatistics.get(campus.id);
              const isSelected = selectedCampuses.has(campus.id);
              
              return (
                <div
                  key={campus.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCampusToggle(campus.id)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox checked={isSelected} />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: showCampusColors ? campus.color : '#6B7280' }}
                    />
                    <span className="font-medium text-sm">{campus.name}</span>
                  </div>
                  
                  {stats && (
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Events:</span>
                        <span>{stats.eventCount}</span>
                      </div>
                      {stats.conflictCount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Conflicts:</span>
                          <span>{stats.conflictCount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Utilization:</span>
                        <span>{stats.utilizationRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Statistics */}
        {selectedCampuses.size > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedCampuses.size}</div>
              <div className="text-sm text-gray-600">Selected Campuses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{filteredEvents.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Array.from(campusStatistics.values())
                  .reduce((sum, stats) => sum + stats.utilizationRate, 0) / campusStatistics.size}%
              </div>
              <div className="text-sm text-gray-600">Avg Utilization</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="unified">Unified View</TabsTrigger>
            <TabsTrigger value="comparison">Campus Comparison</TabsTrigger>
            {showResourceSharing && (
              <TabsTrigger value="resource">Resource Sharing</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="unified">
            {selectedCampuses.size === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">No Campuses Selected</h3>
                <p className="mt-1">Select one or more campuses to view their calendar events.</p>
              </div>
            ) : (
              <UnifiedCalendarView
                initialView={CalendarViewType.MONTH}
                showFilters={true}
                showConflicts={true}
                onEventClick={handleEventClick}
                className="border-0 shadow-none"
              />
            )}
          </TabsContent>

          <TabsContent value="comparison">
            <div className="space-y-4">
              {Array.from(selectedCampuses).map(campusId => {
                const campus = campuses.find(c => c.id === campusId);
                const campusEvents = eventsByCampus.get(campusId) || [];
                const stats = campusStatistics.get(campusId);
                
                if (!campus) return null;

                return (
                  <Card key={campusId} className="border-l-4" style={{ borderLeftColor: campus.color }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{campus.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{campusEvents.length} events</Badge>
                          {stats && stats.conflictCount > 0 && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {stats.conflictCount} conflicts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Location:</span>
                          <p>{campus.location || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Utilization:</span>
                          <p>{stats?.utilizationRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className="text-green-600">Active</p>
                        </div>
                      </div>
                      
                      {/* Mini event timeline */}
                      <div className="mt-4">
                        <div className="flex space-x-1 h-2">
                          {campusEvents.slice(0, 20).map((event, index) => (
                            <div
                              key={event.id}
                              className="flex-1 rounded"
                              style={{ backgroundColor: event.color || '#6B7280' }}
                              title={event.title}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Event distribution for {format(currentDate, 'MMMM yyyy')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {showResourceSharing && (
            <TabsContent value="resource">
              <div className="text-center py-8 text-gray-500">
                <ArrowRight className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium">Resource Sharing</h3>
                <p className="mt-1">Cross-campus resource sharing features will be implemented here.</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
