# 📅 Personal Calendar Implementation Plan
## FabriiQ Brand-Aligned Calendar System

---

## 🎨 **Brand Alignment Summary**

### **Simple UX Colors Applied:**
- **Primary**: System primary color
- **Secondary**: System secondary color
- **Accent**: System accent color
- **Muted**: System muted color
- **Foreground/Background**: System text and background colors

### **Design Principles:**
- **Simple but Aesthetic**: Clean, minimal interface without gradients
- **System Consistency**: Uses standard UX color tokens
- **User-Centric**: Personal productivity focus, not institutional
- **Mobile-First**: Responsive design for all devices

---

## 🏗️ **Implementation Strategy**

### **Phase 1: Database & API Foundation**
1. **PersonalCalendarEvent Model** - User-specific events
2. **Calendar API Router** - CRUD operations for personal events
3. **Event Types & Categories** - Study, personal, deadlines, etc.

### **Phase 2: Core Components**
1. **PersonalCalendar Component** - Main calendar view
2. **EventModal Component** - Create/edit events
3. **CalendarHeader Component** - Navigation and view controls
4. **EventCard Component** - Individual event display

### **Phase 3: Pages & Integration**
1. **Student Calendar Page** - `/student/calendar`
2. **Teacher Calendar Page** - `/teacher/calendar`
3. **Header Icon Integration** - Calendar access from header
4. **Mobile Optimization** - Touch-friendly interface

---

## 🗄️ **Database Schema**

```prisma
model PersonalCalendarEvent {
  id          String    @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  isAllDay    Boolean   @default(false)
  type        PersonalEventType
  color       String?   @default("#1F504B") // Primary Green
  
  // User association
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  
  // Metadata
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  status      SystemStatus @default(ACTIVE)
  
  @@index([userId, startDate])
  @@index([userId, type])
  @@map("personal_calendar_events")
}

enum PersonalEventType {
  STUDY_SESSION    // Study/work sessions
  ASSIGNMENT       // Assignment deadlines
  EXAM_PREP        // Exam preparation
  MEETING          // Meetings, appointments
  PERSONAL         // Personal events
  REMINDER         // Simple reminders
  BREAK            // Rest/break periods
}
```

---

## 🎨 **Component Design Specifications**

### **Color Coding by Event Type:**
- **Study Sessions**: Primary color
- **Assignments**: Secondary color
- **Exam Prep**: Accent color
- **Meetings**: Muted color
- **Personal**: Primary variant
- **Reminders**: Secondary variant
- **Breaks**: Muted variant

### **Calendar Views:**
1. **Month View (Default)**
   - Clean grid layout with system colors
   - Events as colored dots/bars
   - Today highlighted with primary color
   - Simple hover effects

2. **Week View**
   - Time-slot based layout
   - Drag-and-drop event creation
   - System-colored time indicators

3. **Day View**
   - Detailed hourly schedule
   - Full event details visible
   - Easy inline editing

---

## 📱 **Component Architecture**

### **PersonalCalendar.tsx**
```typescript
interface PersonalCalendarProps {
  userId: string;
  userRole: 'TEACHER' | 'STUDENT';
  initialView?: 'month' | 'week' | 'day';
  className?: string;
}

// Features:
// - System UX color scheme
// - Responsive design
// - Touch-friendly mobile interface
// - Simple animations
```

### **EventModal.tsx**
```typescript
interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: PersonalCalendarEvent;
  selectedDate?: Date;
  onSave: (event: CreateEventInput) => void;
}

// Features:
// - System UX styling
// - Event type selection with color preview
// - Date/time pickers
// - Form validation
```

### **CalendarHeader.tsx**
```typescript
interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onCreateEvent: () => void;
}

// Features:
// - System-colored navigation buttons
// - View switcher (Month/Week/Day)
// - Today button with primary color
// - Create event button
```

---

## 🔧 **API Implementation**

### **Personal Calendar Router**
```typescript
export const personalCalendarRouter = createTRPCRouter({
  // Get user's events in date range
  getEvents: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      types: z.array(z.nativeEnum(PersonalEventType)).optional()
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.personalCalendarEvent.findMany({
        where: {
          userId: ctx.session.user.id,
          startDate: { gte: input.startDate },
          endDate: { lte: input.endDate },
          status: 'ACTIVE',
          ...(input.types && { type: { in: input.types } })
        },
        orderBy: { startDate: 'asc' }
      });
    }),

  // Create new event
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.personalCalendarEvent.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
          color: getEventTypeColor(input.type)
        }
      });
    }),

  // Update event
  updateEvent: protectedProcedure
    .input(updateEventSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.personalCalendarEvent.update({
        where: { 
          id: input.id,
          userId: ctx.session.user.id // Ensure user owns the event
        },
        data: input
      });
    }),

  // Delete event
  deleteEvent: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.personalCalendarEvent.update({
        where: { 
          id: input,
          userId: ctx.session.user.id
        },
        data: { status: 'DELETED' }
      });
    })
});
```

---

## 📄 **Page Implementation**

### **Student Calendar Page**
```typescript
// src/app/student/calendar/page.tsx
export default function StudentCalendarPage() {
  const { data: session } = useSession();
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary rounded-full">
              <Calendar className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              My Calendar 📅
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Organize your schedule and stay on track
            </p>
          </div>
        </div>

        {/* Personal Calendar */}
        <PersonalCalendar
          userId={session?.user?.id!}
          userRole="STUDENT"
          className="bg-card rounded-lg border"
        />
      </div>
    </div>
  );
}
```

---

## 🚀 **Implementation Timeline**

### **Week 1: Foundation**
- [ ] Create PersonalCalendarEvent model
- [ ] Build personal calendar API router
- [ ] Create basic calendar grid component
- [ ] Implement month view

### **Week 2: Core Features**
- [ ] Add event creation modal
- [ ] Implement event editing/deletion
- [ ] Add week and day views
- [ ] Apply FabriiQ brand colors

### **Week 3: Polish & Integration**
- [ ] Create student and teacher calendar pages
- [ ] Integrate with header calendar icon
- [ ] Add mobile responsiveness
- [ ] Performance optimization and testing

---

## 🎯 **Success Metrics**

- **User Engagement**: Calendar page visits per user
- **Event Creation**: Events created per user per week
- **Mobile Usage**: Mobile vs desktop usage patterns
- **Feature Adoption**: View preferences (month/week/day)

This implementation will provide users with a beautiful, brand-aligned personal calendar that enhances productivity while maintaining the clean, aesthetic design principles of FabriiQ.
