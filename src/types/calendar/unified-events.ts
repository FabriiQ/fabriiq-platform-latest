/**
 * Unified Calendar Event Types
 * 
 * This file defines the unified event system that integrates timetables,
 * academic events, holidays, and personal events into a single interface.
 */

import { DayOfWeek, PeriodType, SystemStatus, AcademicEventType } from '@prisma/client';

// Base event interface that all calendar events extend
export interface BaseCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: CalendarEventType;
  source: EventSource;
  color?: string;
  canEdit: boolean;
  canDelete: boolean;
  conflicts?: CalendarConflict[];
  recurrence?: RecurrencePattern;
  createdAt: Date;
  updatedAt: Date;
}

// Unified calendar event that includes all possible fields
export interface UnifiedCalendarEvent extends BaseCalendarEvent {
  // Timetable-specific fields
  timetableId?: string;
  periodId?: string;
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  facilityId?: string;
  facilityName?: string;
  subject?: string;
  dayOfWeek?: DayOfWeek;
  periodType?: PeriodType;
  
  // Academic event fields
  eventType?: AcademicEventType;
  campusId?: string;
  campusName?: string;
  programId?: string;
  programName?: string;
  academicCycleId?: string;
  
  // Holiday fields
  holidayType?: HolidayType;
  isNational?: boolean;
  isRecurring?: boolean;
  
  // Personal event fields
  userId?: string;
  isPrivate?: boolean;
  reminderMinutes?: number;
  
  // External integration fields
  externalId?: string;
  externalSource?: ExternalCalendarSource;
  syncStatus?: SyncStatus;
  lastSyncAt?: Date;
  
  // Metadata
  status: SystemStatus;
  priority?: EventPriority;
  tags?: string[];
  attendees?: EventAttendee[];
  location?: string;
  url?: string;
  notes?: string;
}

// Event type enumeration
export enum CalendarEventType {
  TIMETABLE_PERIOD = 'timetable_period',
  ACADEMIC_EVENT = 'academic_event',
  HOLIDAY = 'holiday',
  EXAM = 'exam',
  BREAK = 'break',
  MEETING = 'meeting',
  PERSONAL = 'personal',
  DEADLINE = 'deadline',
  REMINDER = 'reminder'
}

// Event source enumeration
export enum EventSource {
  TIMETABLE = 'timetable',
  ACADEMIC = 'academic',
  HOLIDAY = 'holiday',
  PERSONAL = 'personal',
  EXTERNAL = 'external',
  SYSTEM = 'system'
}

// Holiday types
export enum HolidayType {
  NATIONAL = 'national',
  RELIGIOUS = 'religious',
  ACADEMIC = 'academic',
  CAMPUS = 'campus',
  CUSTOM = 'custom'
}

// External calendar sources
export enum ExternalCalendarSource {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  ICAL = 'ical',
  EXCHANGE = 'exchange'
}

// Sync status for external events
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

// Event priority levels
export enum EventPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Calendar conflict interface
export interface CalendarConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedEvents: string[]; // Event IDs
  suggestedResolution?: ConflictResolution;
  status: ConflictStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Conflict types
export enum ConflictType {
  TIME_OVERLAP = 'time_overlap',
  RESOURCE_DOUBLE_BOOKING = 'resource_double_booking',
  FACILITY_UNAVAILABLE = 'facility_unavailable',
  TEACHER_UNAVAILABLE = 'teacher_unavailable',
  SCHEDULE_VIOLATION = 'schedule_violation',
  EXTERNAL_CONFLICT = 'external_conflict'
}

// Conflict severity levels
export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Conflict status
export enum ConflictStatus {
  UNRESOLVED = 'unresolved',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
  AUTO_RESOLVED = 'auto_resolved'
}

// Conflict resolution suggestions
export interface ConflictResolution {
  type: ResolutionType;
  description: string;
  actions: ResolutionAction[];
  confidence: number; // 0-1 confidence score
}

export enum ResolutionType {
  RESCHEDULE = 'reschedule',
  REASSIGN_RESOURCE = 'reassign_resource',
  SPLIT_EVENT = 'split_event',
  CANCEL_EVENT = 'cancel_event',
  MERGE_EVENTS = 'merge_events'
}

export interface ResolutionAction {
  type: string;
  description: string;
  parameters: Record<string, any>;
}

// Recurrence pattern interface
export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number;
  daysOfWeek?: DayOfWeek[];
  endDate?: Date;
  occurrences?: number;
  exceptions?: Date[];
}

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

// Event attendee interface
export interface EventAttendee {
  id: string;
  name: string;
  email?: string;
  role: AttendeeRole;
  status: AttendeeStatus;
  isRequired: boolean;
}

export enum AttendeeRole {
  ORGANIZER = 'organizer',
  TEACHER = 'teacher',
  STUDENT = 'student',
  ADMIN = 'admin',
  GUEST = 'guest'
}

export enum AttendeeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

// Calendar view interfaces
export interface CalendarViewConfig {
  type: CalendarViewType;
  startDate: Date;
  endDate: Date;
  filters: CalendarFilter[];
  groupBy?: CalendarGroupBy;
  showWeekends: boolean;
  showConflicts: boolean;
  showRecurring: boolean;
}

export enum CalendarViewType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  AGENDA = 'agenda',
  RESOURCE = 'resource',
  MULTI_CAMPUS = 'multi_campus'
}

export interface CalendarFilter {
  field: string;
  operator: FilterOperator;
  value?: any;
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  BETWEEN = 'between'
}

export enum CalendarGroupBy {
  NONE = 'none',
  TYPE = 'type',
  SOURCE = 'source',
  CAMPUS = 'campus',
  TEACHER = 'teacher',
  FACILITY = 'facility',
  CLASS = 'class',
  SUBJECT = 'subject'
}

// Event creation/update interfaces
export interface CreateEventInput {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: CalendarEventType;
  source: EventSource;
  color?: string;
  priority?: EventPriority;
  tags?: string[];
  location?: string;
  url?: string;
  notes?: string;
  recurrence?: RecurrencePattern;
  attendees?: Omit<EventAttendee, 'id'>[];
  reminderMinutes?: number;
  
  // Type-specific fields
  timetableData?: TimetableEventData;
  academicData?: AcademicEventData;
  holidayData?: HolidayEventData;
  personalData?: PersonalEventData;
}

export interface TimetableEventData {
  timetableId: string;
  periodId: string;
  classId: string;
  teacherId?: string;
  facilityId?: string;
  subject: string;
  dayOfWeek: DayOfWeek;
  periodType: PeriodType;
}

export interface AcademicEventData {
  eventType: AcademicEventType;
  campusId?: string;
  programId?: string;
  academicCycleId: string;
  classIds?: string[];
}

export interface HolidayEventData {
  holidayType: HolidayType;
  isNational: boolean;
  isRecurring: boolean;
  campusIds?: string[];
}

export interface PersonalEventData {
  userId: string;
  isPrivate: boolean;
  reminderMinutes?: number;
}

// Sync result interfaces
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors: SyncError[];
  conflicts: CalendarConflict[];
}

export interface SyncError {
  eventId?: string;
  message: string;
  code: string;
  details?: Record<string, any>;
}

// Calendar statistics interface
export interface CalendarStatistics {
  totalEvents: number;
  eventsByType: Record<CalendarEventType, number>;
  eventsBySource: Record<EventSource, number>;
  conflictCount: number;
  upcomingEvents: number;
  overdueEvents: number;
  syncStatus: Record<ExternalCalendarSource, SyncStatus>;
}
