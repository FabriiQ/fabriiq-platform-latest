'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Building, Users, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    type: string;
    source?: string;
    color?: string;
    location?: string;
    campusId?: string;
    campusName?: string;
    createdBy?: string;
    createdAt?: Date;
    status?: string;
  } | null;
}

export function EventDetailModal({ isOpen, onClose, event }: EventDetailModalProps) {
  if (!event) return null;

  const getEventTypeLabel = (type: string, source?: string) => {
    if (source === 'HOLIDAY') return 'Holiday';
    if (source === 'ACADEMIC') return 'Academic Event';
    if (source === 'TIMETABLE') return 'Timetable Event';
    if (source === 'PERSONAL') return 'Personal Event';
    return type || 'Event';
  };

  const getEventTypeColor = (source?: string) => {
    switch (source) {
      case 'HOLIDAY': return 'bg-red-100 text-red-800';
      case 'ACADEMIC': return 'bg-green-100 text-green-800';
      case 'TIMETABLE': return 'bg-blue-100 text-blue-800';
      case 'PERSONAL': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (date: Date) => {
    return format(date, 'PPP p'); // e.g., "January 1, 2024 at 9:00 AM"
  };

  const formatDate = (date: Date) => {
    return format(date, 'PPP'); // e.g., "January 1, 2024"
  };

  const isAllDay = event.start.getHours() === 0 && event.start.getMinutes() === 0 && 
                   event.end.getHours() === 23 && event.end.getMinutes() === 59;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: event.color || '#3B82F6' }}
            />
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Type Badge */}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Badge className={getEventTypeColor(event.source)}>
              {getEventTypeLabel(event.type, event.source)}
            </Badge>
            {event.status && (
              <Badge variant={event.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {event.status}
              </Badge>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Description</h4>
              <p className="text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Date & Time</span>
            </div>
            <div className="ml-6 space-y-1">
              {isAllDay ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">All day on {formatDate(event.start)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">Starts: {formatDateTime(event.start)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">Ends: {formatDateTime(event.end)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Location</span>
              </div>
              <p className="ml-6 text-sm">{event.location}</p>
            </div>
          )}

          {/* Campus */}
          {event.campusName && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Campus</span>
              </div>
              <p className="ml-6 text-sm">{event.campusName}</p>
            </div>
          )}

          {/* Created By */}
          {event.createdBy && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Created By</span>
              </div>
              <p className="ml-6 text-sm">{event.createdBy}</p>
            </div>
          )}

          {/* Created Date */}
          {event.createdAt && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Created On</span>
              </div>
              <p className="ml-6 text-sm">{formatDateTime(event.createdAt)}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
