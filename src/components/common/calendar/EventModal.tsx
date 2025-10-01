'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/trpc/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { toast } from '@/components/ui/use-toast';
import { PersonalEventType } from '@/types/calendar';
import { type PersonalCalendarEvent } from './PersonalCalendar';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: PersonalCalendarEvent | null;
  selectedDate?: Date;
  onSave?: (event: PersonalCalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  type: PersonalEventType;
  color: string;
}

const EVENT_TYPE_OPTIONS = [
  { value: PersonalEventType.STUDY_SESSION, label: 'Study Session', color: '#1F504B' },
  { value: PersonalEventType.ASSIGNMENT, label: 'Assignment', color: '#2563eb' },
  { value: PersonalEventType.EXAM_PREP, label: 'Exam Preparation', color: '#dc2626' },
  { value: PersonalEventType.MEETING, label: 'Meeting', color: '#6b7280' },
  { value: PersonalEventType.PERSONAL, label: 'Personal', color: '#059669' },
  { value: PersonalEventType.REMINDER, label: 'Reminder', color: '#d97706' },
  { value: PersonalEventType.BREAK, label: 'Break', color: '#9ca3af' },
];

export function EventModal({
  isOpen,
  onClose,
  event,
  selectedDate,
  onSave,
  onDelete,
}: EventModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: selectedDate || new Date(),
    endDate: selectedDate || new Date(),
    isAllDay: false,
    type: PersonalEventType.PERSONAL,
    color: '#059669',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutations
  const createEventMutation = api.personalCalendar.createEvent.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Event created successfully',
      });
      onSave?.({
        ...data,
        status: data.status === 'INACTIVE' ? 'DELETED' : 'ACTIVE'
      } as any);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const updateEventMutation = api.personalCalendar.updateEvent.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });
      onSave?.({
        ...data,
        status: data.status === 'INACTIVE' ? 'DELETED' : 'ACTIVE'
      } as any);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const deleteEventMutation = api.personalCalendar.deleteEvent.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
      onDelete?.(event!.id);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
    },
  });

  // Initialize form data when event or selectedDate changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        isAllDay: event.isAllDay,
        type: event.type as any,
        color: event.color || '#059669',
      });
    } else if (selectedDate) {
      const endDate = new Date(selectedDate);
      endDate.setHours(endDate.getHours() + 1); // Default 1-hour duration
      
      setFormData(prev => ({
        ...prev,
        startDate: selectedDate,
        endDate: endDate,
      }));
    }
  }, [event, selectedDate]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSubmitting(false);
      if (!event) {
        setFormData({
          title: '',
          description: '',
          startDate: selectedDate || new Date(),
          endDate: selectedDate || new Date(),
          isAllDay: false,
          type: PersonalEventType.PERSONAL,
          color: '#059669',
        });
      }
    }
  }, [isOpen, event, selectedDate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    if (event) {
      // Update existing event
      updateEventMutation.mutate({
        id: event.id,
        ...formData,
      });
    } else {
      // Create new event
      createEventMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (event && window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const handleTypeChange = (type: PersonalEventType) => {
    const typeOption = EVENT_TYPE_OPTIONS.find(option => option.value === type);
    setFormData(prev => ({
      ...prev,
      type,
      color: typeOption?.color || prev.color,
    }));
  };

  const handleAllDayChange = (isAllDay: boolean) => {
    setFormData(prev => {
      if (isAllDay) {
        // Set to full day
        const start = new Date(prev.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(prev.startDate);
        end.setHours(23, 59, 59, 999);
        
        return {
          ...prev,
          isAllDay,
          startDate: start,
          endDate: end,
        };
      } else {
        // Set to 1-hour duration
        const start = new Date(prev.startDate);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        
        return {
          ...prev,
          isAllDay,
          endDate: end,
        };
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Update your event details' : 'Add a new event to your calendar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter event description (optional)"
              rows={3}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleTypeChange(value as PersonalEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="allDay"
              checked={formData.isAllDay}
              onCheckedChange={handleAllDayChange}
            />
            <Label htmlFor="allDay">All day event</Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start {formData.isAllDay ? 'Date' : 'Date & Time'}</Label>
              <DatePicker
                date={formData.startDate}
                setDate={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                placeholder="Select start date"
              />
            </div>
            <div className="space-y-2">
              <Label>End {formData.isAllDay ? 'Date' : 'Date & Time'}</Label>
              <DatePicker
                date={formData.endDate}
                setDate={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                placeholder="Select end date"
                className={errors.endDate ? 'border-red-500' : ''}
              />
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {event && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEventMutation.isLoading}
                >
                  {deleteEventMutation.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {event ? 'Update' : 'Create'} Event
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
