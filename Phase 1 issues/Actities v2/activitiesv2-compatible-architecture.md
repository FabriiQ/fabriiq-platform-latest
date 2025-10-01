# ActivitiesV2 Compatible Architecture

## Phase 1 scope update (clean rollout, no backward compatibility)

The immediate goal is a lean Activities V2 that replaces existing activities without migration/compat layers. We will purge legacy Activity records as needed and operate only in the new model with three activity types:
- Quiz
- Reading
- Video

Key principles for Phase 1:
- Keep it simple: no CAT/IRT/spaced repetition/PBT in this phase.
- Question Bank is the single source of truth for all quiz questions; support all existing question types already present in the Question Bank.
- Reuse existing Prisma Activity model and tRPC routers; store V2 content in a simple JSON shape per activity type.
- Ensure time tracking, analytics, and achievements integration works end-to-end.
- Performance- and ops-friendly; avoid over-engineering.

Note: Sections below that describe backward compatibility, CAT/IRT, spaced repetition, and PBT remain future references. They are out of scope for Phase 1.

### Minimal data model (JSON stored in Activity.content)

```ts
// Common envelope
interface ActivityContentV2 {
  activityType: 'quiz' | 'reading' | 'video';
  title?: string;
  instructions?: string;
  // Optional learning context for analytics/filters
  bloomsObjectives?: string[];
  learningOutcomeIds?: string[];
  estimatedTime?: number; // minutes
}

// Quiz content (Question Bank–first)
interface QuizContentV2 extends ActivityContentV2 {
  activityType: 'quiz';
  questions: Array<{
    id: string;            // QuestionBank Question.id
    points?: number;       // default 1
    shuffleOptions?: boolean;
  }>;
  settings?: {
    timeLimitMinutes?: number;
    attemptsAllowed?: number; // default 1
    shuffleQuestions?: boolean;
    showFeedback?: boolean;
    passingScore?: number;    // percentage 0-100
  };
}

interface ReadingContentV2 extends ActivityContentV2 {
  activityType: 'reading';
  resourceUrl?: string;     // if hosted content
  richText?: string;        // if inline content
  completionCriteria?: {
    minTimeSeconds?: number; // optional threshold
  };
}

interface VideoContentV2 extends ActivityContentV2 {
  activityType: 'video';
  videoUrl: string;
  provider?: 'youtube' | 'vimeo' | 'file' | 'hls';
  completionCriteria?: {
    minWatchPercentage?: number; // e.g., 0.8 for 80%
  };
  enableSeeking?: boolean;  // default true
}
```

### Grading and submissions (Phase 1)
- Quiz: auto-grade via existing grading functions per question type; compute total score and percentage; store in ActivityGrade; emit analytics and award points/achievements.
- Reading/Video: completion is time-and-progress based; no grading, but record completion, time spent, and award completion points/achievements where configured.

### Question Bank compatibility
- Use existing Question Bank question types as-is; Quiz references questions by ID only.
- Editors leverage existing QuestionBankIntegration/Selector components for selection, ordering, preview, and Bloom’s distribution preview.
- Optional filters: subject/topic/Bloom’s/difficulty; NO adaptive/CAT selection in Phase 1.

### Time tracking (reuse existing services)
- Start tracking when an activity viewer mounts; stop when completed/unmounted.
- Use existing TimeTrackingProvider/HOC and learning-time tRPC endpoints to persist minutes with proper partition keys.

### Analytics and achievements
- Use existing activity analytics manager to track: activity_start, question_answer, activity_complete, and time_spent.
- Use existing rewards/points and achievement services to award points on quiz grading and on reading/video completion.

### Minimal API surface (tRPC)
- activity.create/update: persists Activity.content in the shapes above.
- activity.submitQuiz: accepts answers keyed by Question ID; returns grading result; records ActivityGrade; updates analytics/time/achievements.
- activity.markReadingComplete / activity.markVideoComplete: records completion and time; updates analytics and achievements.

### Out of scope for Phase 1
- CAT/IRT, spaced repetition, paper-based testing, legacy compatibility layers, and migration utilities.
- These can be revisited as Phase 2+ enhancements using the simplified foundations above.


## 🎯 Executive Summary

ActivitiesV2 is designed as a **backward-compatible enhancement** of the existing activities system. It preserves all current functionality while adding advanced features like CBT (Computer-Based Testing), CAT (Computer Adaptive Testing with Item Response Theory), and intelligent spaced repetition. The architecture uses existing database tables and APIs without breaking changes.

## 🏗️ Core Architecture Principles

### 1. **Zero Breaking Changes**
- Uses existing `Activity` and `ActivityGrade` database tables
- Preserves all current API endpoints and schemas
- Maintains existing student experience
- Supports all current activity types

### 2. **Enhanced JSON Content Structure**
- Extends existing `content` JSON field in Activity table
- Adds new capabilities through JSON schema evolution
- Maintains backward compatibility with existing content

### 3. **Question Bank First Approach**
- Primary question creation through Question Bank editors
- Intelligent question selection algorithms
- Dynamic question pools with IRT support
- Seamless integration without data duplication

## 📊 Enhanced Database Schema (Backward Compatible)

### Extended Activity Content Schema
```typescript
// Enhanced content JSON structure (backward compatible)
interface ActivitiesV2Content {
  // Existing fields (preserved)
  version: string;
  activityType: string;
  settings: ActivitySettings;
  blocks?: ActivityBlock[];
  metadata?: ActivityMetadata;

  // NEW: ActivitiesV2 enhancements
  v2?: {
    assessmentMode: 'CBT' | 'CAT' | 'SPACED_REPETITION' | 'TRADITIONAL';
    questionSelection: {
      strategy: 'MANUAL' | 'INTELLIGENT' | 'ADAPTIVE' | 'SPACED';
      questionBankIds: string[];
      selectionCriteria: QuestionSelectionCriteria;
      adaptiveSettings?: CATSettings;
      spacedRepetitionSettings?: SpacedRepetitionSettings;
    };
    deliverySettings: {
      computerBased: boolean;
      adaptiveTesting: boolean;
      itemResponseTheory: boolean;
      realTimeAnalytics: boolean;
    };
    bloomsAnalytics: {
      targetDistribution: Record<BloomsTaxonomyLevel, number>;
      trackingEnabled: boolean;
      adaptiveAdjustment: boolean;
    };
  };
}

// Question Selection Criteria
interface QuestionSelectionCriteria {
  bloomsDistribution?: Record<BloomsTaxonomyLevel, number>;
  difficultyRange?: { min: number; max: number };
  topicIds?: string[];
  questionTypes?: string[];
  qualityThreshold?: number;
  excludeRecentlyUsed?: boolean;
  studentPerformanceAdaptation?: boolean;
}

// CAT (Computer Adaptive Testing) Settings
interface CATSettings {
  algorithm: 'IRT_2PL' | 'IRT_3PL' | 'RASCH';
  startingDifficulty: number;
  terminationCriteria: {
    maxQuestions: number;
    minQuestions: number;
    standardErrorThreshold: number;
    confidenceLevel: number;
  };
  itemSelectionMethod: 'MAXIMUM_INFORMATION' | 'BAYESIAN' | 'WEIGHTED';
}

// Spaced Repetition Settings
interface SpacedRepetitionSettings {
  algorithm: 'SM2' | 'ANKI' | 'SUPERMEMO' | 'CUSTOM';
  intervals: number[];
  difficultyAdjustment: boolean;
  performanceWeighting: boolean;
  forgettingCurveIntegration: boolean;
}
```

### Enhanced ActivityGrade Attachments Schema
```typescript
// Enhanced attachments JSON structure (backward compatible)
interface ActivitiesV2Attachments {
  // Existing fields (preserved)
  detailedResults?: any;
  attemptHistory?: any[];
  gradingDetails?: any;

  // NEW: ActivitiesV2 enhancements
  v2?: {
    assessmentAnalytics: {
      irtParameters?: IRTParameters;
      abilityEstimate?: number;
      standardError?: number;
      itemDifficulties?: Record<string, number>;
      responsePatterns?: ResponsePattern[];
    };
    spacedRepetitionData: {
      nextReviewDate?: Date;
      repetitionInterval?: number;
      easeFactor?: number;
      reviewHistory?: ReviewSession[];
    };
    bloomsAnalytics: {
      levelPerformance: Record<BloomsTaxonomyLevel, number>;
      strengthAreas: BloomsTaxonomyLevel[];
      improvementAreas: BloomsTaxonomyLevel[];
      progressTrend: BloomsTrendData[];
    };
    adaptiveInsights: {
      recommendedDifficulty?: number;
      suggestedTopics?: string[];
      learningPath?: LearningPathStep[];
      nextOptimalQuestions?: string[];
    };
  };
}
```

## 🎮 Enhanced Student Experience (Backward Compatible)

### 1. **Unified Activity Viewer Architecture**
```typescript
// Enhanced DirectActivityViewer (src/components/activities/DirectActivityViewer.tsx)
const DirectActivityViewerV2: React.FC<DirectActivityViewerProps> = ({
  activity,
  studentId,
  onComplete,
  onSubmit,
  className = '',
}) => {
  // Detect if activity uses V2 features
  const isV2Activity = activity.content?.v2 !== undefined;

  if (isV2Activity) {
    return <ActivitiesV2Viewer {...props} />;
  }

  // Fallback to existing viewers for backward compatibility
  return <LegacyActivityViewer {...props} />;
};
```

### 2. **ActivitiesV2 Viewer Components**
```typescript
// New V2 viewer architecture
const ActivitiesV2Viewer: React.FC<ActivitiesV2ViewerProps> = ({
  activity,
  studentId,
  onComplete,
  onSubmit,
}) => {
  const { assessmentMode } = activity.content.v2;

  switch (assessmentMode) {
    case 'CBT':
      return <CBTViewer {...props} />;
    case 'CAT':
      return <CATViewer {...props} />;
    case 'SPACED_REPETITION':
      return <SpacedRepetitionViewer {...props} />;
    default:
      return <EnhancedTraditionalViewer {...props} />;
  }
};
```

## 🧠 Question Bank Integration Architecture

### 1. **Intelligent Question Selection Service**
```typescript
// New service: src/server/api/services/intelligent-question-selection.service.ts
export class IntelligentQuestionSelectionService {
  async selectQuestions(
    criteria: QuestionSelectionCriteria,
    studentContext: StudentContext,
    activityContext: ActivityContext
  ): Promise<SelectedQuestion[]> {

    switch (criteria.strategy) {
      case 'INTELLIGENT':
        return this.intelligentSelection(criteria, studentContext);
      case 'ADAPTIVE':
        return this.adaptiveSelection(criteria, studentContext);
      case 'SPACED':
        return this.spacedRepetitionSelection(criteria, studentContext);
      default:
        return this.manualSelection(criteria);
    }
  }

  private async intelligentSelection(
    criteria: QuestionSelectionCriteria,
    context: StudentContext
  ): Promise<SelectedQuestion[]> {
    // Use existing QuizAutoSelectionAgent
    const agent = new QuizAutoSelectionAgent();
    return agent.selectOptimalQuestions(criteria, context);
  }

  private async adaptiveSelection(
    criteria: QuestionSelectionCriteria,
    context: StudentContext
  ): Promise<SelectedQuestion[]> {
    // Implement CAT question selection using IRT
    return this.catQuestionSelection(criteria, context);
  }
}
```

### 2. **Question Bank Viewer Integration**
```typescript
// Enhanced question rendering using existing question bank viewers
const QuestionBankQuestionRenderer: React.FC<{
  question: QuestionBankQuestion;
  onAnswer: (answer: any) => void;
  mode: 'CBT' | 'CAT' | 'TRADITIONAL';
}> = ({ question, onAnswer, mode }) => {
  // Use existing question bank viewer components
  const ViewerComponent = getQuestionBankViewer(question.type);

  return (
    <ViewerComponent
      question={question}
      onAnswer={onAnswer}
      enhancedMode={mode}
      analytics={mode !== 'TRADITIONAL'}
    />
  );
};
```

## 🔄 Enhanced API Architecture (Backward Compatible)

### 1. **Extended Activity Router**
```typescript
// Enhanced activity router (src/server/api/routers/activity.ts)
export const activityRouter = createTRPCRouter({
  // Existing endpoints (preserved)
  submitActivity,
  autoGrade,
  getById,
  // ... all existing endpoints

  // NEW: ActivitiesV2 endpoints
  submitActivityV2: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      answers: z.any(),
      clientResult: z.any().optional(),
      storeDetailedResults: z.boolean().optional().default(true),
      priority: z.number().optional().default(1),
      timeSpentMinutes: z.number().optional(),
      // NEW: V2 specific fields
      irtData: z.any().optional(),
      spacedRepetitionData: z.any().optional(),
      bloomsAnalytics: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Enhanced submission processing with V2 features
      return processActivityV2Submission(ctx, input);
    }),

  generateAdaptiveQuestions: protectedProcedure
    .input(z.object({
      activityId: z.string(),
      studentId: z.string(),
      currentPerformance: z.any(),
      targetDifficulty: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Generate next questions for CAT
      return generateCATQuestions(ctx, input);
    }),

  getSpacedRepetitionSchedule: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      subjectId: z.string().optional(),
      topicId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get spaced repetition schedule
      return getSpacedRepetitionSchedule(ctx, input);
    }),
});
```

### 2. **Backward Compatible Submission Processing**
```typescript
// Enhanced submission processing
async function processActivityV2Submission(
  ctx: Context,
  input: SubmissionInputV2
): Promise<SubmissionResult> {

  const activity = await ctx.prisma.activity.findUnique({
    where: { id: input.activityId }
  });

  // Check if this is a V2 activity
  const isV2 = activity?.content?.v2 !== undefined;

  if (isV2) {
    // Process with V2 enhancements
    return processV2EnhancedSubmission(ctx, input, activity);
  } else {
    // Fallback to existing processing
    return processActivitySubmission(
      ctx.prisma,
      input.activityId,
      input.studentId,
      input.answers,
      input.clientResult,
      { storeDetailedResults: input.storeDetailedResults },
      input.timeSpentMinutes
    );
  }
}
```

## 🎯 Assessment Mode Implementations

### 1. **Computer-Based Testing (CBT)**
```typescript
// CBT implementation
class CBTAssessmentEngine {
  async deliverAssessment(
    activity: Activity,
    student: StudentProfile
  ): Promise<CBTSession> {

    // Select questions using intelligent selection
    const questions = await this.questionSelectionService
      .selectQuestions(activity.content.v2.questionSelection, student);

    // Create CBT session with enhanced features
    return {
      sessionId: generateSessionId(),
      questions: questions,
      deliveryMode: 'CBT',
      features: {
        realTimeAnalytics: true,
        adaptiveHints: true,
        progressTracking: true,
        timeManagement: true,
      }
    };
  }
}
```

### 2. **Computer Adaptive Testing (CAT)**
```typescript
// CAT implementation with Item Response Theory
class CATAssessmentEngine {
  async initializeCATSession(
    activity: Activity,
    student: StudentProfile
  ): Promise<CATSession> {

    const catSettings = activity.content.v2.questionSelection.adaptiveSettings;

    // Initialize IRT parameters
    const irtEngine = new IRTEngine(catSettings.algorithm);

    // Start with medium difficulty question
    const firstQuestion = await this.selectNextQuestion(
      student,
      catSettings.startingDifficulty,
      irtEngine
    );

    return {
      sessionId: generateSessionId(),
      currentQuestion: firstQuestion,
      irtEngine: irtEngine,
      abilityEstimate: 0,
      standardError: 1,
      questionsAnswered: 0,
      maxQuestions: catSettings.terminationCriteria.maxQuestions,
    };
  }

  async processResponse(
    session: CATSession,
    response: QuestionResponse
  ): Promise<CATNextStep> {

    // Update ability estimate using IRT
    const updatedEstimate = session.irtEngine.updateAbilityEstimate(
      session.abilityEstimate,
      response.questionDifficulty,
      response.isCorrect
    );

    // Check termination criteria
    if (this.shouldTerminate(session, updatedEstimate)) {
      return { action: 'TERMINATE', finalScore: updatedEstimate };
    }

    // Select next question
    const nextQuestion = await this.selectNextQuestion(
      session.student,
      updatedEstimate,
      session.irtEngine
    );

    return { action: 'CONTINUE', nextQuestion };
  }
}
```

### 3. **Spaced Repetition System**
```typescript
// Spaced repetition implementation
class SpacedRepetitionEngine {
  async scheduleReview(
    student: StudentProfile,
    questionPerformance: QuestionPerformance[]
  ): Promise<ReviewSchedule> {

    const algorithm = new SM2Algorithm(); // SuperMemo 2 algorithm

    const reviewItems = questionPerformance.map(perf => {
      const nextReview = algorithm.calculateNextReview(
        perf.lastReview,
        perf.easeFactor,
        perf.interval,
        perf.quality
      );

      return {
        questionId: perf.questionId,
        nextReviewDate: nextReview.date,
        interval: nextReview.interval,
        easeFactor: nextReview.easeFactor,
      };
    });

    return {
      studentId: student.id,
      reviewItems: reviewItems,
      nextSessionDate: Math.min(...reviewItems.map(r => r.nextReviewDate)),
    };
  }
}
```

## 📈 Enhanced Analytics Integration

### 1. **Real-Time Bloom's Analytics**
```typescript
// Enhanced Bloom's taxonomy analytics
class BloomsAnalyticsServiceV2 {
  async trackQuestionResponse(
    studentId: string,
    questionId: string,
    response: QuestionResponse,
    bloomsLevel: BloomsTaxonomyLevel
  ): Promise<void> {

    // Update real-time performance tracking
    await this.updateBloomsPerformance(studentId, bloomsLevel, response.isCorrect);

    // Trigger adaptive adjustments if needed
    if (this.shouldAdjustDifficulty(studentId, bloomsLevel)) {
      await this.triggerAdaptiveAdjustment(studentId, bloomsLevel);
    }
  }

  async generateBloomsInsights(
    studentId: string,
    timeRange?: DateRange
  ): Promise<BloomsInsights> {

    // Generate comprehensive Bloom's taxonomy insights
    return {
      strengthAreas: await this.identifyStrengthAreas(studentId, timeRange),
      improvementAreas: await this.identifyImprovementAreas(studentId, timeRange),
      progressTrend: await this.calculateProgressTrend(studentId, timeRange),
      recommendations: await this.generateRecommendations(studentId),
    };
  }
}
```

## 🔧 Implementation Strategy

### Phase 1: Foundation (No Breaking Changes)
1. Extend JSON schemas in existing tables
2. Add V2 detection logic to existing components
3. Implement backward compatibility layer
4. Create new V2 services alongside existing ones

### Phase 2: Enhanced Features
1. Implement CBT assessment engine
2. Add intelligent question selection
3. Integrate enhanced analytics
4. Create V2 viewer components

### Phase 3: Advanced Features
1. Implement CAT with IRT algorithms
2. Add spaced repetition engine
3. Create adaptive learning paths
4. Implement predictive analytics

### Phase 4: Migration Tools
1. Create V1 to V2 migration utilities
2. Add bulk conversion tools
3. Implement gradual migration support
4. Create teacher training materials

## 🎓 Integration with Existing Systems

### 1. **Grading System Integration**
```typescript
// Enhanced grading with V2 features
class ActivitiesV2GradingService {
  async gradeActivityV2(
    activity: Activity,
    submission: ActivityGrade
  ): Promise<GradingResult> {

    const isV2 = activity.content?.v2 !== undefined;

    if (isV2) {
      // Use enhanced grading with IRT, Bloom's analytics, etc.
      return this.enhancedGrading(activity, submission);
    } else {
      // Fallback to existing grading system
      return this.legacyGrading(activity, submission);
    }
  }

  private async enhancedGrading(
    activity: Activity,
    submission: ActivityGrade
  ): Promise<GradingResult> {

    // Apply IRT-based scoring for CAT activities
    if (activity.content.v2.assessmentMode === 'CAT') {
      return this.irtBasedGrading(activity, submission);
    }

    // Apply spaced repetition adjustments
    if (activity.content.v2.assessmentMode === 'SPACED_REPETITION') {
      return this.spacedRepetitionGrading(activity, submission);
    }

    // Enhanced traditional grading with Bloom's analytics
    return this.enhancedTraditionalGrading(activity, submission);
  }
}
```

### 2. **Achievement System Integration**
```typescript
// Enhanced achievement tracking
class ActivitiesV2AchievementService {
  async processAchievements(
    studentId: string,
    activityResult: ActivityResult
  ): Promise<AchievementResult> {

    // Process traditional achievements
    const baseAchievements = await this.processBaseAchievements(studentId, activityResult);

    // Process V2 specific achievements
    if (activityResult.isV2) {
      const v2Achievements = await this.processV2Achievements(studentId, activityResult);
      return this.mergeAchievements(baseAchievements, v2Achievements);
    }

    return baseAchievements;
  }

  private async processV2Achievements(
    studentId: string,
    result: ActivityResult
  ): Promise<Achievement[]> {

    const achievements: Achievement[] = [];

    // CAT-specific achievements
    if (result.assessmentMode === 'CAT') {
      achievements.push(...await this.processCATAchievements(studentId, result));
    }

    // Spaced repetition achievements
    if (result.assessmentMode === 'SPACED_REPETITION') {
      achievements.push(...await this.processSpacedRepetitionAchievements(studentId, result));
    }

    // Bloom's taxonomy achievements
    achievements.push(...await this.processBloomsAchievements(studentId, result));

    return achievements;
  }
}
```

## 🔄 Migration Strategy

### 1. **Gradual Migration Approach**
```typescript
// Migration utility service
class ActivitiesV1ToV2MigrationService {
  async migrateActivity(activityId: string): Promise<MigrationResult> {

    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    // Check if already migrated
    if (activity.content?.v2) {
      return { status: 'ALREADY_MIGRATED', activity };
    }

    // Create V2 content structure
    const v2Content = this.createV2ContentFromV1(activity.content);

    // Update activity with V2 structure
    const updatedActivity = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        content: {
          ...activity.content,
          v2: v2Content
        }
      }
    });

    return { status: 'MIGRATED', activity: updatedActivity };
  }

  private createV2ContentFromV1(v1Content: any): ActivitiesV2Content['v2'] {
    return {
      assessmentMode: this.determineAssessmentMode(v1Content),
      questionSelection: {
        strategy: 'MANUAL', // Start with manual, can be upgraded later
        questionBankIds: this.extractQuestionBankIds(v1Content),
        selectionCriteria: this.createDefaultCriteria(v1Content),
      },
      deliverySettings: {
        computerBased: true,
        adaptiveTesting: false,
        itemResponseTheory: false,
        realTimeAnalytics: true,
      },
      bloomsAnalytics: {
        targetDistribution: this.calculateBloomsDistribution(v1Content),
        trackingEnabled: true,
        adaptiveAdjustment: false,
      },
    };
  }
}
```

### 2. **Bulk Migration Tools**
```typescript
// Bulk migration for teachers
class BulkMigrationService {
  async migrateClassActivities(
    classId: string,
    migrationOptions: MigrationOptions
  ): Promise<BulkMigrationResult> {

    const activities = await this.prisma.activity.findMany({
      where: { classId, status: 'ACTIVE' }
    });

    const results: MigrationResult[] = [];

    for (const activity of activities) {
      try {
        const result = await this.migrationService.migrateActivity(activity.id);
        results.push(result);
      } catch (error) {
        results.push({
          status: 'FAILED',
          activityId: activity.id,
          error: error.message
        });
      }
    }

    return {
      totalActivities: activities.length,
      successful: results.filter(r => r.status === 'MIGRATED').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      alreadyMigrated: results.filter(r => r.status === 'ALREADY_MIGRATED').length,
      results
    };
  }
}
```

## 📊 Performance Considerations

### 1. **Lazy Loading of V2 Features**
```typescript
// Only load V2 features when needed
const useActivitiesV2Features = (activity: Activity) => {
  const isV2 = activity.content?.v2 !== undefined;

  // Lazy load V2 services only when needed
  const v2Services = useMemo(() => {
    if (!isV2) return null;

    return {
      questionSelection: new IntelligentQuestionSelectionService(),
      catEngine: new CATAssessmentEngine(),
      spacedRepetition: new SpacedRepetitionEngine(),
      bloomsAnalytics: new BloomsAnalyticsServiceV2(),
    };
  }, [isV2]);

  return { isV2, v2Services };
};
```

### 2. **Caching Strategy**
```typescript
// Enhanced caching for V2 features
class ActivitiesV2CacheService {
  // Cache question selections for reuse
  async getCachedQuestionSelection(
    criteria: QuestionSelectionCriteria,
    studentContext: StudentContext
  ): Promise<SelectedQuestion[] | null> {

    const cacheKey = this.generateSelectionCacheKey(criteria, studentContext);
    return this.redis.get(cacheKey);
  }

  // Cache IRT calculations
  async getCachedIRTParameters(
    questionId: string,
    studentId: string
  ): Promise<IRTParameters | null> {

    const cacheKey = `irt:${questionId}:${studentId}`;
    return this.redis.get(cacheKey);
  }
}
```

This architecture ensures **zero breaking changes** while providing a clear path to advanced assessment capabilities.
