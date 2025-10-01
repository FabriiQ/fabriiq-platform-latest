# Existing Activities System Analysis

## 🎯 Executive Summary

This document provides a comprehensive analysis of the current FabriiQ activities system from the student perspective, database structure, and API architecture. This analysis is critical for designing ActivitiesV2 that maintains full compatibility while adding advanced features like CBT, CAT (Computer Adaptive Testing), and spaced repetition.

## 📊 Current Database Schema Analysis

### Activity Model (Existing - Must Preserve)
```typescript
model Activity {
  id                String              @id @default(cuid())
  title             String
  purpose           ActivityPurpose     // LEARNING, PRACTICE, ASSESSMENT, REVIEW
  learningType      LearningActivityType // INDIVIDUAL, GROUP, COLLABORATIVE
  assessmentType    AssessmentType      // QUIZ, TEST, EXAM, ASSIGNMENT, etc.
  content           Json                // Flexible JSON content storage
  isGradable        Boolean             @default(true)
  maxScore          Float?
  passingScore      Float?
  timeLimit         Int?                // in minutes
  status            SystemStatus        @default(ACTIVE)
  classId           String
  subjectId         String?
  topicId           String?
  lessonPlanId      String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  // Relations
  grades            ActivityGrade[]
  class             Class               @relation(fields: [classId], references: [id])
  subject           Subject?            @relation(fields: [subjectId], references: [id])
  topic             Topic?              @relation(fields: [topicId], references: [id])
  lessonPlan        LessonPlan?         @relation(fields: [lessonPlanId], references: [id])
}
```

### ActivityGrade Model (Existing - Must Preserve)
```typescript
model ActivityGrade {
  id            String            @id @default(cuid())
  activityId    String
  studentId     String
  score         Float?
  feedback      String?
  status        SubmissionStatus  // DRAFT, SUBMITTED, GRADED, etc.
  content       Json?             // Student's submission content
  attachments   Json?             // Files, detailed results, metadata
  submittedAt   DateTime?
  gradedAt      DateTime?
  gradedById    String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  // Relations
  activity      Activity          @relation(fields: [activityId], references: [id])
  student       StudentProfile    @relation(fields: [studentId], references: [id])
  gradedBy      User?             @relation(fields: [gradedById], references: [id])
}
```

## 🎮 Current Student Experience Analysis

### 1. Activity Submission Workflow
```typescript
// Current submission process (src/server/api/routers/activity.ts)
submitActivity: protectedProcedure
  .input(z.object({
    activityId: z.string(),
    answers: z.any(),                    // Flexible answer format
    clientResult: z.any().optional(),    // Client-side calculations
    storeDetailedResults: z.boolean().optional().default(true),
    priority: z.number().optional().default(1),
    timeSpentMinutes: z.number().optional(),
  }))
```

**Key Features:**
- ✅ Priority-based processing (1-5 scale)
- ✅ Batch processing for normal priority (1-3)
- ✅ Immediate processing for high priority (4-5)
- ✅ Time tracking integration
- ✅ Detailed results storage in `attachments` JSON field
- ✅ Client-side result validation

### 2. Current Activity Types Support
```typescript
// Existing activity types in content JSON
interface ActivityContent {
  version: string;
  activityType: string;  // 'quiz', 'essay', 'assignment', etc.
  settings: {
    timeLimit?: number;
    passingPercentage?: number;
    allowRetakes?: boolean;
    showCorrectAnswers?: boolean;
  };
  blocks: ActivityBlock[];
  metadata: {
    bloomsLevels?: string[];
    difficulty?: number;
    estimatedTime?: number;
  };
}
```

### 3. Student-Side Components
```typescript
// Main activity viewer (src/components/activities/DirectActivityViewer.tsx)
const DirectActivityViewer: React.FC<DirectActivityViewerProps> = ({
  activity,
  studentId,
  onComplete,
  onSubmit,
  className = '',
}) => {
  // Maps activity types to specific viewers
  // Supports offline mode, analytics tracking, theme wrapper
}
```

**Current Viewers:**
- QuizViewer (most advanced)
- EssayViewer
- AssignmentViewer
- PresentationViewer
- ProjectViewer
- And 10+ other specialized viewers

## 🔄 Current API Structure (Must Preserve)

### Core Endpoints
```typescript
// Activity Router (src/server/api/routers/activity.ts)
export const activityRouter = createTRPCRouter({
  // Submission
  submitActivity,           // Main submission endpoint
  submitActivityBatch,      // Batch submission
  
  // Grading
  autoGrade,               // Automatic grading
  manualGrade,             // Manual grading
  
  // Retrieval
  getById,                 // Get single activity
  getMany,                 // Get multiple activities
  getStudentActivityStats, // Student analytics
  
  // Management
  create,                  // Create activity
  update,                  // Update activity
  delete,                  // Delete activity
});
```

### Integration Points
```typescript
// Current integrations that MUST be preserved
1. Grading System Integration
   - ActivityBatchService for processing
   - Advanced grading service with AI
   - Rubric-based grading
   - Bloom's taxonomy scoring

2. Analytics Integration
   - ActivityAnalyticsService
   - Student performance tracking
   - Learning pattern recognition
   - Spaced repetition suggestions (basic)

3. Achievement System Integration
   - Reward points calculation
   - Level progression
   - Achievement unlocking
   - Gamification features

4. Question Bank Integration (Limited)
   - Manual question selection
   - Basic question bank references
   - No intelligent selection
```

## 🧠 Current Question Bank Integration Analysis

### Existing Question Bank Features
```typescript
// Question Bank Editor (src/features/question-bank/components/editor/QuestionEditor.tsx)
- Rich text editing with media support
- Bloom's taxonomy integration
- Comprehensive validation
- Advanced question types support
- Analytics and usage tracking
```

### Current Integration Gaps
```typescript
// Problems with current integration
1. Manual Selection Only
   - No intelligent question selection
   - No adaptive algorithms
   - No spaced repetition integration

2. Data Model Inconsistencies
   - Question bank uses QuestionType enum
   - Activities use string literals
   - Conversion complexity

3. Limited Workflow Integration
   - No seamless question bank → activity workflow
   - Duplicate editor implementations
   - Inconsistent UX
```

## 🎯 Current Grading System Analysis

### Automatic Grading
```typescript
// Current auto-grading (src/server/api/services/activity-grading.service.ts)
- Multiple choice questions
- True/false questions
- Fill-in-the-blank questions
- Basic essay grading with AI
- Rubric-based grading
- Bloom's taxonomy scoring
```

### Manual Grading
```typescript
// Current manual grading features
- Teacher feedback interface
- Rubric application
- Score adjustment
- Detailed feedback storage
- Grade history tracking
```

## 📈 Current Analytics & Achievements

### Student Analytics
```typescript
// Current analytics (src/server/api/services/learning-pattern-recognition.service.ts)
- Learning pattern recognition
- Performance trend analysis
- Weakness identification
- Strength mapping
- Adaptive content recommendations
```

### Achievement System
```typescript
// Current achievements integration
- Points-based rewards
- Level progression
- Badge unlocking
- Leaderboards
- Progress tracking
```

## 🔍 Key Compatibility Requirements

### 1. Database Compatibility
- ✅ Must use existing Activity and ActivityGrade tables
- ✅ Must preserve all existing fields
- ✅ Can extend JSON content fields
- ✅ Must maintain all existing relations

### 2. API Compatibility
- ✅ Must preserve all existing endpoints
- ✅ Must maintain input/output schemas
- ✅ Can add new optional parameters
- ✅ Must support existing client applications

### 3. Student Experience Compatibility
- ✅ Must support all existing activity types
- ✅ Must maintain current submission workflow
- ✅ Must preserve offline capabilities
- ✅ Must maintain analytics integration

### 4. Integration Compatibility
- ✅ Must work with existing grading system
- ✅ Must integrate with current achievement system
- ✅ Must support existing analytics
- ✅ Must maintain question bank compatibility

## 🚀 Opportunities for Enhancement

### 1. Question Bank Integration
- Intelligent question selection algorithms
- Dynamic question pools
- Adaptive question difficulty
- Spaced repetition integration

### 2. Assessment Types
- Computer-Based Testing (CBT) support
- Computer Adaptive Testing (CAT) with IRT
- Advanced spaced repetition algorithms
- Personalized learning paths

### 3. Analytics Enhancement
- Real-time performance tracking
- Predictive analytics
- Learning outcome optimization
- Advanced Bloom's taxonomy analysis

## 📋 Next Steps

This analysis provides the foundation for designing ActivitiesV2 that:
1. **Preserves** all existing functionality
2. **Extends** capabilities without breaking changes
3. **Enhances** question bank integration
4. **Adds** advanced assessment features (CBT, CAT, spaced repetition)
5. **Maintains** full compatibility with existing systems

The next document will present the ActivitiesV2 architecture that builds upon this foundation.
