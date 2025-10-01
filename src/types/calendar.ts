/**
 * Personal Calendar Types
 * 
 * These types define the structure for personal calendar events and related enums.
 * They should match the Prisma schema definitions.
 */

export enum PersonalEventType {
  STUDY_SESSION = 'STUDY_SESSION',    // Study/work sessions
  ASSIGNMENT = 'ASSIGNMENT',          // Assignment deadlines
  EXAM_PREP = 'EXAM_PREP',           // Exam preparation
  MEETING = 'MEETING',               // Meetings, appointments
  PERSONAL = 'PERSONAL',             // Personal events
  REMINDER = 'REMINDER',             // Simple reminders
  BREAK = 'BREAK'                    // Rest/break periods
}

export interface PersonalCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  type: PersonalEventType;
  color: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'DELETED';
}

export interface CreatePersonalEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay?: boolean;
  type: PersonalEventType;
  color?: string;
}

export interface UpdatePersonalEventInput {
  id: string;
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isAllDay?: boolean;
  type?: PersonalEventType;
  color?: string;
}

export interface GetEventsInput {
  startDate: Date;
  endDate: Date;
  types?: PersonalEventType[];
}

export interface EventsCountResponse {
  count: number;
}

// Event type color mapping
export const EVENT_TYPE_COLORS: Record<PersonalEventType, string> = {
  STUDY_SESSION: '#1F504B', // Primary color
  ASSIGNMENT: '#2563eb',    // Secondary color
  EXAM_PREP: '#dc2626',     // Accent color
  MEETING: '#6b7280',       // Muted color
  PERSONAL: '#059669',      // Primary variant
  REMINDER: '#d97706',      // Secondary variant
  BREAK: '#9ca3af',         // Muted variant
};

// Event type labels for UI
export const EVENT_TYPE_LABELS: Record<PersonalEventType, string> = {
  STUDY_SESSION: 'Study Session',
  ASSIGNMENT: 'Assignment',
  EXAM_PREP: 'Exam Preparation',
  MEETING: 'Meeting',
  PERSONAL: 'Personal',
  REMINDER: 'Reminder',
  BREAK: 'Break',
};
