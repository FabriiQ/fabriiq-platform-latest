# 📅 **Calendar Feature Analysis & Implementation Plan**
## Personal User-Level Calendar System

---

## 🔍 **Current State Analysis**

### **What's Already Implemented:**

1. **Institution-Level Calendar (✅ Complete)**
   - System admin manages holidays and events
   - Institution-wide calendar functionality exists
   - Used for institutional scheduling

2. **Calendar Infrastructure:**
   - Calendar icon in teacher and student headers
   - Positioned alongside messages and notifications
   - Header integration already planned

### **What We're Building:**

**User-Level Personal Calendars:**
- **Teacher Calendar:** Personal schedule management for individual teachers
- **Student Calendar:** Personal schedule management for individual students
- **NOT Class-Level:** These are personal productivity tools, not class-wide calendars
- **Header Access:** Accessible via calendar icon in user headers

---

## 🎯 **Gap Analysis**

### **Missing Components:**

1. **Personal Calendar Pages**
   - No teacher personal calendar page
   - No student personal calendar page
   - No personal event management

2. **Calendar Components**
   - No personal calendar viewer
   - No event creation/editing interface
   - No personal schedule management

3. **Integration Points**
   - Calendar header icon not connected to personal calendars
   - No personal event storage system
   - No user-specific calendar data

---

## 🏗️ **Implementation Strategy**

### **Simple Personal Calendar Approach:**

**Core Functionality:**
1. **Personal Event Management** - Users can add/edit/delete personal events
2. **Calendar Views** - Month, week, day views for personal scheduling
3. **Event Types** - Personal tasks, appointments, reminders, study sessions
4. **Header Integration** - Accessible via existing calendar icon

**Architecture:**
- **User-Centric:** Each user has their own calendar
- **Privacy-First:** Personal events are private by default
- **Simple Interface:** Clean, intuitive calendar management
- **Mobile-Responsive:** Works well on all devices

---

## 🎨 **UX Psychology Principles**

### **Time Management Psychology:**

1. **Temporal Landmarks Theory**
   - **Benefit:** Users can set meaningful deadlines and milestones
   - **Implementation:** Visual markers for important dates
   - **UX Note:** Highlight weekends, holidays, and personal milestones

2. **Implementation Intentions**
   - **Benefit:** "If-then" planning improves goal achievement
   - **Implementation:** Event templates and recurring event options
   - **UX Note:** Smart suggestions for study sessions and deadlines

3. **Present Bias Mitigation**
   - **Benefit:** Visual future planning reduces procrastination
   - **Implementation:** Future event visualization and reminders
   - **UX Note:** Color-coded urgency and importance indicators

### **Cognitive Load Reduction:**

1. **Progressive Disclosure**
   - Show month view by default
   - Drill down to week/day views as needed
   - Event details on demand

2. **Visual Hierarchy**
   - Clear distinction between event types
   - Consistent color coding
   - Intuitive navigation patterns

---

## 📋 **Detailed Implementation Plan**

### **File Structure:**
```
src/app/teacher/calendar/
├── page.tsx                    # Teacher personal calendar
└── components/
    ├── CalendarView.tsx       # Main calendar component
    ├── EventModal.tsx         # Event creation/editing
    ├── EventList.tsx          # List view of events
    └── CalendarHeader.tsx     # Calendar navigation

src/app/student/calendar/
├── page.tsx                    # Student personal calendar
└── components/
    ├── CalendarView.tsx       # Main calendar component
    ├── EventModal.tsx         # Event creation/editing
    ├── EventList.tsx          # List view of events
    └── CalendarHeader.tsx     # Calendar navigation

src/components/common/calendar/
├── PersonalCalendar.tsx       # Shared calendar component
├── EventCard.tsx              # Individual event display
├── CalendarGrid.tsx           # Calendar grid layout
└── EventForm.tsx              # Event creation form
```

### **Component Specifications:**

#### **1. PersonalCalendar Component:**
```typescript
interface PersonalCalendarProps {
  userId: string;
  userRole: 'TEACHER' | 'STUDENT';
  initialView?: 'month' | 'week' | 'day';
  onEventClick?: (event: CalendarEvent) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: EventType;
  color?: string;
  isAllDay: boolean;
  recurrence?: RecurrencePattern;
}
```

#### **2. Event Types:**
```typescript
enum EventType {
  PERSONAL = 'PERSONAL',           // General personal events
  STUDY_SESSION = 'STUDY_SESSION', // Study/work sessions
  APPOINTMENT = 'APPOINTMENT',     // Meetings, appointments
  DEADLINE = 'DEADLINE',           // Important deadlines
  REMINDER = 'REMINDER',           // Simple reminders
  BREAK = 'BREAK'                  // Rest/break periods
}
```

---

## 🔧 **Technical Implementation**

### **Database Schema:**

```sql
-- Personal Calendar Events
model PersonalCalendarEvent {
  id          String    @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  isAllDay    Boolean   @default(false)
  type        EventType
  color       String?   @default("#3b82f6")
  
  // Recurrence support
  recurrenceRule String? // RRULE format
  parentEventId  String? // For recurring event instances
  
  // User association
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  
  // Metadata
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  status      SystemStatus @default(ACTIVE)
  
  @@index([userId, startDate])
  @@index([userId, type])
}
```

### **API Endpoints:**

```typescript
// Personal calendar router
export const personalCalendarRouter = createTRPCRouter({
  // Get user's calendar events
  getEvents: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      types: z.array(z.nativeEnum(EventType)).optional()
    }))
    .query(async ({ ctx, input }) => {
      // Return user's events in date range
    }),

  // Create new event
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Create personal calendar event
    }),

  // Update event
  updateEvent: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Update existing event
    }),

  // Delete event
  deleteEvent: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      // Soft delete event
    })
});
```

---

## 🎨 **Design Specifications**

### **Calendar Views:**

1. **Month View (Default)**
   - Grid layout showing full month
   - Events displayed as colored bars/dots
   - Quick navigation between months
   - Today indicator

2. **Week View**
   - 7-day horizontal layout
   - Time slots for detailed scheduling
   - Drag-and-drop event creation
   - Current time indicator

3. **Day View**
   - Detailed single-day schedule
   - Hourly time slots
   - Event details visible
   - Easy event editing

### **Event Creation Flow:**

1. **Quick Add**
   - Click on date/time to create event
   - Minimal form with title and time
   - Smart defaults based on context

2. **Detailed Add**
   - Full event form with all options
   - Recurrence patterns
   - Color and type selection
   - Description and notes

### **Color Coding:**

- **Study Sessions:** Blue (#3b82f6)
- **Deadlines:** Red (#ef4444)
- **Appointments:** Green (#10b981)
- **Personal:** Purple (#8b5cf6)
- **Reminders:** Orange (#f59e0b)
- **Breaks:** Gray (#6b7280)

---

## 📱 **Header Integration**

### **Calendar Icon Functionality:**

1. **Click Behavior:**
   - Opens personal calendar page
   - Shows today's events in dropdown (optional)
   - Quick event creation shortcut

2. **Notification Integration:**
   - Show upcoming events count
   - Event reminders
   - Deadline alerts

3. **Responsive Design:**
   - Mobile: Navigate to calendar page
   - Desktop: Option for dropdown preview

---

## 📊 **Success Metrics**

### **Usage Metrics:**
- Calendar page visits per user
- Events created per user per week
- Calendar view preferences (month/week/day)
- Event completion rates

### **Productivity Metrics:**
- Time spent in calendar vs other features
- Event reminder effectiveness
- Recurring event usage
- Mobile vs desktop usage patterns

---

## 🚀 **Implementation Timeline**

### **Week 1: Core Calendar**
- [ ] Create PersonalCalendarEvent model
- [ ] Build basic calendar API endpoints
- [ ] Create month view component
- [ ] Implement event creation modal

### **Week 2: Enhanced Features**
- [ ] Add week and day views
- [ ] Implement event editing/deletion
- [ ] Add color coding and event types
- [ ] Create responsive design

### **Week 3: Integration & Polish**
- [ ] Integrate with header calendar icon
- [ ] Add event reminders/notifications
- [ ] Implement recurring events
- [ ] Performance optimization and testing

---

## 🎯 **Key Design Principles**

1. **Personal Focus:** Each user's calendar is private and personal
2. **Simplicity:** Clean, intuitive interface without overwhelming features
3. **Flexibility:** Support different planning styles and preferences
4. **Integration:** Seamless access via header navigation
5. **Mobile-First:** Excellent experience on all devices
6. **Privacy:** Personal events remain private to the user

This approach provides users with a powerful yet simple personal calendar system that enhances their productivity and time management within the FabriiQ platform.
