'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Calendar,
  Clock,
  Eye
} from 'lucide-react';

export type CalendarView = 'month' | 'week' | 'day';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onCreateEvent: () => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  eventsCount?: number;
  isLoading?: boolean;
  className?: string;
}

const VIEW_OPTIONS: Array<{
  value: CalendarView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    value: 'month',
    label: 'Month',
    icon: Calendar,
    description: 'Monthly overview'
  },
  {
    value: 'week',
    label: 'Week',
    icon: Clock,
    description: 'Weekly schedule'
  },
  {
    value: 'day',
    label: 'Day',
    icon: Eye,
    description: 'Daily agenda'
  },
];

export function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onCreateEvent,
  onNavigate,
  eventsCount,
  isLoading = false,
  className,
}: CalendarHeaderProps) {
  const formatDateForView = (date: Date, currentView: CalendarView): string => {
    switch (currentView) {
      case 'month':
        return format(date, 'MMMM yyyy');
      case 'week':
        return format(date, 'MMM d, yyyy');
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy');
      default:
        return format(date, 'MMMM yyyy');
    }
  };

  const getViewDescription = (currentView: CalendarView): string => {
    const option = VIEW_OPTIONS.find(opt => opt.value === currentView);
    return option?.description || '';
  };

  return (
    <div className={cn("flex flex-col space-y-4 p-4 border-b bg-card", className)}>
      {/* Main Header Row */}
      <div className="flex items-center justify-between">
        {/* Left Section - Date Navigation */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {formatDateForView(currentDate, view)}
              </h2>
              <p className="text-sm text-muted-foreground">
                {getViewDescription(view)}
                {eventsCount !== undefined && eventsCount > 0 && (
                  <span className="ml-2">
                    • {eventsCount} event{eventsCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('prev')}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous {view}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('next')}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next {view}</span>
            </Button>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3">
          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('today')}
            disabled={isLoading}
            className="hidden sm:inline-flex"
          >
            Today
          </Button>

          {/* View Switcher */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = view === option.value;
              
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange(option.value)}
                  disabled={isLoading}
                  className={cn(
                    "h-8 px-3 text-xs font-medium transition-all",
                    isActive && "shadow-sm"
                  )}
                  title={option.description}
                >
                  <Icon className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Create Event Button */}
          <Button
            onClick={onCreateEvent}
            disabled={isLoading}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Add Event</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="flex items-center justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('today')}
          disabled={isLoading}
        >
          Today
        </Button>
        
        {eventsCount !== undefined && eventsCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {eventsCount} event{eventsCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Quick Stats or Additional Info */}
      {view === 'month' && eventsCount !== undefined && (
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Personal Events</span>
            </div>
            {eventsCount > 0 && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="h-3 w-3" />
                <span>{eventsCount} this month</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export additional types for use in parent components
export type { CalendarHeaderProps };
