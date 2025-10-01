# 🔧 Circle, Library & Personal Calendar - Technical Specifications

## 📋 Overview

This document provides detailed technical specifications for implementing Circle, Library, and Personal Calendar features in the FabriiQ student portal, leveraging existing system components and APIs.

## 🗄️ Database Schema Specifications

### Existing Models to Leverage
- **User**: Already has id, name, userType, primaryCampusId
- **StudentProfile**: Has userId, enrollmentNumber, achievements
- **Class**: Has id, name, campusId for Circle context
- **StudentAchievement**: Can be extended for Circle social features
- **Holiday/AcademicCalendarEvent**: Base for Personal Calendar integration

### New Models Required

#### Circle Models
```prisma
model Circle {
  id          String   @id @default(cuid())
  classId     String
  name        String   @default("Class Circle")
  description String?
  settings    Json?    // Psychology settings, visibility rules
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  class       Class    @relation(fields: [classId], references: [id])
  members     CircleMember[]
  socialAchievements SocialAchievement[]
  
  @@unique([classId]) // One circle per class
  @@map("circles")
}

model CircleMember {
  id           String   @id @default(cuid())
  circleId     String
  studentId    String
  displayName  String?  // Anonymous display option
  joinedAt     DateTime @default(now())
  lastActive   DateTime @default(now())
  isVisible    Boolean  @default(true)
  privacyLevel PrivacyLevel @default(ANONYMOUS)
  
  circle       Circle   @relation(fields: [circleId], references: [id])
  student      StudentProfile @relation(fields: [studentId], references: [id])
  comparisons  PeerComparison[]
  
  @@unique([circleId, studentId])
  @@map("circle_members")
}

model SocialAchievement {
  id           String   @id @default(cuid())
  circleId     String
  studentId    String
  type         AchievementType
  title        String
  description  String?
  points       Int      @default(0)
  level        Int      @default(1)
  isVisible    Boolean  @default(true)
  achievedAt   DateTime @default(now())
  
  circle       Circle   @relation(fields: [circleId], references: [id])
  student      StudentProfile @relation(fields: [studentId], references: [id])
  
  @@map("social_achievements")
}

model PeerComparison {
  id           String   @id @default(cuid())
  memberId     String
  metric       ComparisonMetric
  value        Float
  percentile   Float
  lastUpdated  DateTime @default(now())
  
  member       CircleMember @relation(fields: [memberId], references: [id])
  
  @@map("peer_comparisons")
}

enum PrivacyLevel {
  ANONYMOUS
  SEMI_ANONYMOUS
  PUBLIC
}

enum AchievementType {
  ACTIVITY_COMPLETION
  STREAK_MILESTONE
  GRADE_IMPROVEMENT
  PARTICIPATION
  COLLABORATION
}

enum ComparisonMetric {
  ACTIVITY_COMPLETION_RATE
  AVERAGE_GRADE
  PARTICIPATION_SCORE
  LEARNING_TIME
  STREAK_LENGTH
}
```

#### Library Models
```prisma
model LibraryResource {
  id              String   @id @default(cuid())
  title           String
  description     String?
  type            ResourceType
  url             String?
  content         String?  // For text-based resources
  thumbnailUrl    String?
  categoryId      String?
  subjectId       String?  // Link to existing Subject model
  difficulty      Int      @default(1) // 1-5 scale
  estimatedTime   Int?     // Minutes
  tags            String[] // Array of tags
  metadata        Json?    // Additional metadata
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  category        ResourceCategory? @relation(fields: [categoryId], references: [id])
  subject         Subject?          @relation(fields: [subjectId], references: [id])
  progress        UserResourceProgress[]
  recommendations ResourceRecommendation[]
  
  @@map("library_resources")
}

model ResourceCategory {
  id          String   @id @default(cuid())
  name        String
  description String?
  parentId    String?  // For nested categories
  color       String?  // Hex color for UI
  icon        String?  // Icon name
  sortOrder   Int      @default(0)
  
  parent      ResourceCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ResourceCategory[] @relation("CategoryHierarchy")
  resources   LibraryResource[]
  
  @@map("resource_categories")
}

model UserResourceProgress {
  id           String   @id @default(cuid())
  userId       String
  resourceId   String
  progress     Float    @default(0) // 0-100 percentage
  timeSpent    Int      @default(0) // Minutes
  completed    Boolean  @default(false)
  bookmarked   Boolean  @default(false)
  rating       Int?     // 1-5 star rating
  notes        String?  // Personal notes
  lastAccessed DateTime @default(now())
  completedAt  DateTime?
  
  user         User     @relation(fields: [userId], references: [id])
  resource     LibraryResource @relation(fields: [resourceId], references: [id])
  
  @@unique([userId, resourceId])
  @@map("user_resource_progress")
}

model ResourceRecommendation {
  id         String   @id @default(cuid())
  userId     String
  resourceId String
  score      Float    // Recommendation confidence score
  reason     String?  // Why this was recommended
  algorithm  String   // Which algorithm generated this
  createdAt  DateTime @default(now())
  viewedAt   DateTime?
  
  user       User     @relation(fields: [userId], references: [id])
  resource   LibraryResource @relation(fields: [resourceId], references: [id])
  
  @@unique([userId, resourceId])
  @@map("resource_recommendations")
}

enum ResourceType {
  VIDEO
  DOCUMENT
  INTERACTIVE
  QUIZ
  ARTICLE
  PODCAST
  SIMULATION
  GAME
}
```

#### Personal Calendar Models
```prisma
model PersonalEvent {
  id              String   @id @default(cuid())
  userId          String
  title           String
  description     String?
  startDate       DateTime
  endDate         DateTime
  allDay          Boolean  @default(false)
  type            PersonalEventType
  priority        Priority @default(MEDIUM)
  color           String?  // Hex color
  location        String?
  isRecurring     Boolean  @default(false)
  recurringPattern Json?   // Recurrence rules
  reminderMinutes Int?     // Minutes before event
  isCompleted     Boolean  @default(false)
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@map("personal_events")
}

model HabitTracker {
  id            String   @id @default(cuid())
  userId        String
  name          String
  description   String?
  category      HabitCategory
  targetDays    Int      @default(21) // Target streak length
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  totalDays     Int      @default(0)
  color         String?  // Hex color for UI
  icon          String?  // Icon name
  reminderTime  String?  // HH:MM format
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id])
  entries       HabitEntry[]
  
  @@map("habit_trackers")
}

model HabitEntry {
  id        String   @id @default(cuid())
  habitId   String
  date      DateTime @db.Date
  completed Boolean  @default(true)
  notes     String?
  createdAt DateTime @default(now())
  
  habit     HabitTracker @relation(fields: [habitId], references: [id])
  
  @@unique([habitId, date])
  @@map("habit_entries")
}

model GoalVisualization {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  targetDate  DateTime
  category    GoalCategory
  progress    Float    @default(0) // 0-100 percentage
  milestones  Json?    // Array of milestone objects
  isCompleted Boolean  @default(false)
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@map("goal_visualizations")
}

model CalendarPreference {
  id              String   @id @default(cuid())
  userId          String   @unique
  defaultView     CalendarView @default(MONTH)
  weekStartsOn    Int      @default(0) // 0 = Sunday, 1 = Monday
  workingHours    Json?    // Start/end times for each day
  timeZone        String   @default("UTC")
  showWeekends    Boolean  @default(true)
  showHolidays    Boolean  @default(true)
  showAcademicEvents Boolean @default(true)
  theme           String   @default("default")
  notifications   Json?    // Notification preferences
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@map("calendar_preferences")
}

enum PersonalEventType {
  STUDY_SESSION
  ASSIGNMENT
  EXAM_PREP
  MEETING
  PERSONAL
  HEALTH
  SOCIAL
  OTHER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum HabitCategory {
  STUDY
  HEALTH
  PERSONAL
  SOCIAL
  PRODUCTIVITY
  WELLNESS
}

enum GoalCategory {
  ACADEMIC
  PERSONAL
  HEALTH
  CAREER
  SKILL
  HABIT
}

enum CalendarView {
  DAY
  WEEK
  MONTH
  YEAR
}
```

## 🔌 API Specifications

### Circle API Router (`/api/circle`)

```typescript
export const circleRouter = createTRPCRouter({
  // Get circle for a class
  getByClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Return circle with members and achievements
    }),

  // Get anonymous leaderboard
  getLeaderboard: protectedProcedure
    .input(z.object({ 
      circleId: z.string(),
      metric: z.enum(['ACTIVITY_COMPLETION_RATE', 'AVERAGE_GRADE', 'PARTICIPATION_SCORE'])
    }))
    .query(async ({ ctx, input }) => {
      // Return anonymized peer comparison data
    }),

  // Get social achievements
  getAchievements: protectedProcedure
    .input(z.object({ circleId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Return visible achievements with privacy controls
    }),

  // Update privacy settings
  updatePrivacy: protectedProcedure
    .input(z.object({
      circleId: z.string(),
      privacyLevel: z.enum(['ANONYMOUS', 'SEMI_ANONYMOUS', 'PUBLIC'])
    }))
    .mutation(async ({ ctx, input }) => {
      // Update member privacy settings
    })
});
```

### Library API Router (`/api/library`)

```typescript
export const libraryRouter = createTRPCRouter({
  // Get resources with filtering and pagination
  getResources: protectedProcedure
    .input(z.object({
      categoryId: z.string().optional(),
      type: z.enum(['VIDEO', 'DOCUMENT', 'INTERACTIVE', 'QUIZ']).optional(),
      difficulty: z.number().min(1).max(5).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10)
    }))
    .query(async ({ ctx, input }) => {
      // Return paginated resources with user progress
    }),

  // Get personalized recommendations
  getRecommendations: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      // Return AI-driven recommendations based on user patterns
    }),

  // Update resource progress
  updateProgress: protectedProcedure
    .input(z.object({
      resourceId: z.string(),
      progress: z.number().min(0).max(100),
      timeSpent: z.number().optional(),
      completed: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Update user progress and trigger recommendations refresh
    }),

  // Toggle bookmark
  toggleBookmark: protectedProcedure
    .input(z.object({ resourceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Toggle bookmark status
    })
});
```

### Personal Calendar API Router (`/api/personal-calendar`)

```typescript
export const personalCalendarRouter = createTRPCRouter({
  // Get events for date range
  getEvents: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      includeAcademic: z.boolean().default(true),
      includeHolidays: z.boolean().default(true)
    }))
    .query(async ({ ctx, input }) => {
      // Return personal events + academic events + holidays
    }),

  // Create personal event
  createEvent: protectedProcedure
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
      type: z.enum(['STUDY_SESSION', 'ASSIGNMENT', 'EXAM_PREP', 'MEETING', 'PERSONAL']),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
    }))
    .mutation(async ({ ctx, input }) => {
      // Create event and return with ID
    }),

  // Get habit trackers
  getHabits: protectedProcedure
    .query(async ({ ctx }) => {
      // Return user's habit trackers with recent entries
    }),

  // Log habit completion
  logHabit: protectedProcedure
    .input(z.object({
      habitId: z.string(),
      date: z.date(),
      completed: z.boolean().default(true),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Log habit entry and update streak calculations
    })
});
```

## 🎨 Component Specifications

### Circle Components

#### CircleGrid Component
```typescript
interface CircleGridProps {
  classId: string;
  showLeaderboard?: boolean;
  showAchievements?: boolean;
  anonymousMode?: boolean;
}

// Features:
// - Masonry layout for engagement
// - Anonymous peer achievement cards
// - Smooth animations on hover/interaction
// - Social proof indicators ("X% achieved this")
```

#### MemberCard Component
```typescript
interface MemberCardProps {
  member: CircleMember;
  achievements: SocialAchievement[];
  comparison: PeerComparison[];
  privacyLevel: PrivacyLevel;
  showDetails?: boolean;
}

// Features:
// - Psychology-driven card design
// - Anonymous display options
// - Achievement badges and progress indicators
// - Hover effects revealing achievement details
```

### Library Components

#### UniversalViewer Component
```typescript
interface UniversalViewerProps {
  resource: LibraryResource;
  progress: UserResourceProgress;
  onProgressUpdate: (progress: number) => void;
  onComplete: () => void;
}

// Features:
// - Distraction-free content consumption
// - Progress tracking with visual indicators
// - Bookmark and rating functionality
// - Adaptive UI based on resource type
```

#### RecommendationEngine Component
```typescript
interface RecommendationEngineProps {
  recommendations: ResourceRecommendation[];
  onResourceClick: (resourceId: string) => void;
  showReason?: boolean;
}

// Features:
// - AI-driven content suggestions
// - Curiosity gap theory implementation
// - Progressive disclosure of recommendations
// - Explanation of why content was recommended
```

### Personal Calendar Components

#### PsychologyCalendar Component
```typescript
interface PsychologyCalendarProps {
  events: (PersonalEvent | AcademicEvent | Holiday)[];
  habits: HabitTracker[];
  goals: GoalVisualization[];
  view: CalendarView;
  onEventCreate: (event: Partial<PersonalEvent>) => void;
  onHabitLog: (habitId: string, date: Date) => void;
}

// Features:
// - Emotion-aware design with color psychology
// - Habit streak visualization
// - Goal progress integration
// - Fresh start effect highlighting
```

## 🔄 Integration Points

### Navigation Integration
- **StudentShell**: Add "Calendar" to main navigation items
- **StudentSidebar**: Add "Circle" and "Library" to class-specific navigation
- **Mobile Navigation**: Ensure responsive design for all new features

### Existing API Integration
- **Academic Calendar**: Fetch holidays and academic events for personal calendar
- **Student Achievements**: Leverage existing achievement system for Circle
- **Class Data**: Use existing class enrollment data for Circle membership

### Performance Considerations
- **Caching**: Implement Redis caching for frequently accessed data
- **Pagination**: Use cursor-based pagination for large datasets
- **Lazy Loading**: Implement progressive loading for resource-heavy components
- **Optimistic Updates**: Use optimistic UI updates for better user experience

---

*This technical specification ensures seamless integration with existing systems while implementing cutting-edge UX psychology principles.*
