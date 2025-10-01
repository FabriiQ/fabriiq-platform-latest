# Activities V2 Technical Specifications

## 🏗️ Architecture Overview

### Core Components
```
src/features/activities-v2/
├── types/                    # TypeScript definitions
├── services/                 # Business logic services
├── components/              # React components
│   ├── editors/            # Teacher activity editors
│   ├── viewers/            # Student activity viewers
│   └── shared/             # Shared components
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
├── analytics/              # Analytics integration
└── integrations/           # External system integrations
```

## 📊 Data Models and Schemas

### Core Type Definitions

```typescript
// src/features/activities-v2/types/core.ts
export type ActivityV2Type = 'quiz' | 'reading' | 'video';
export type AssessmentMode = 'traditional' | 'cat' | 'spaced_repetition';
export type CelebrationLevel = 'minimal' | 'standard' | 'enthusiastic';
export type VideoProvider = 'youtube' | 'vimeo' | 'file' | 'hls';
export type ReadingContentType = 'rich_text' | 'url' | 'file';

// Base achievement configuration
export interface AchievementConfiguration {
  enabled: boolean;
  pointsAnimation: boolean;
  celebrationLevel: CelebrationLevel;
  
  points: {
    base: number;
    multiplier: number;
    perfectScoreBonus: number;
    speedBonus: number;
    firstAttemptBonus: number;
  };
  
  triggers: {
    perfectScore: boolean;
    speedAchievement: boolean;
    firstAttempt: boolean;
    improvement: boolean;
  };
  
  speedBonusThresholdSeconds?: number;
}

// Base activity content interface
export interface ActivityV2Content {
  version: '2.0';
  activityType: ActivityV2Type;
  title: string;
  description?: string;
  instructions?: string;
  
  // Learning context
  bloomsObjectives?: BloomsTaxonomyLevel[];
  learningOutcomeIds?: string[];
  estimatedTimeMinutes?: number;
  
  // Achievement configuration
  achievementConfig: AchievementConfiguration;
  
  // Assessment mode (primarily for quizzes)
  assessmentMode?: AssessmentMode;
}
```

### Quiz-Specific Types

```typescript
// src/features/activities-v2/types/quiz.ts
export interface QuizQuestion {
  id: string; // Question Bank question ID
  points: number;
  shuffleOptions: boolean;
  required: boolean;
  timeLimit?: number; // per-question time limit in seconds
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  showFeedbackImmediately: boolean;
  showCorrectAnswers: boolean;
  timeLimitMinutes?: number;
  attemptsAllowed: number;
  passingScore?: number; // percentage 0-100
  allowReview: boolean;
  showProgressBar: boolean;
}

export interface CATSettings {
  algorithm: 'irt_2pl' | 'irt_3pl' | 'rasch';
  startingDifficulty: number;
  terminationCriteria: {
    maxQuestions: number;
    minQuestions: number;
    standardErrorThreshold: number;
    confidenceLevel: number;
  };
  itemSelectionMethod: 'maximum_information' | 'bayesian' | 'weighted';
}

export interface SpacedRepetitionSettings {
  algorithm: 'sm2' | 'anki' | 'supermemo' | 'custom';
  intervals: number[];
  difficultyAdjustment: boolean;
  performanceWeighting: boolean;
  forgettingCurveIntegration: boolean;
}

export interface QuizV2Content extends ActivityV2Content {
  activityType: 'quiz';
  questions: QuizQuestion[];
  settings: QuizSettings;
  catSettings?: CATSettings;
  spacedRepetitionSettings?: SpacedRepetitionSettings;
}
```

### Reading-Specific Types

```typescript
// src/features/activities-v2/types/reading.ts
export interface ReadingContent {
  type: ReadingContentType;
  data: string; // Rich text HTML, URL, or file path
  metadata?: {
    wordCount?: number;
    estimatedReadingTime?: number;
    language?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

export interface ReadingCompletionCriteria {
  minTimeSeconds?: number;
  scrollPercentage?: number; // for rich text content
  interactionRequired?: boolean;
  comprehensionQuestions?: string[]; // Question Bank question IDs
}

export interface ReadingFeatures {
  allowBookmarking: boolean;
  showProgress: boolean;
  enableHighlighting: boolean;
  enableNotes: boolean;
  showWordCount: boolean;
  enableTextToSpeech: boolean;
}

export interface ReadingV2Content extends ActivityV2Content {
  activityType: 'reading';
  content: ReadingContent;
  completionCriteria: ReadingCompletionCriteria;
  features: ReadingFeatures;
}
```

### Video-Specific Types

```typescript
// src/features/activities-v2/types/video.ts
export interface VideoSource {
  provider: VideoProvider;
  url: string;
  duration?: number; // seconds
  thumbnail?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    subtitles?: Array<{
      language: string;
      url: string;
    }>;
  };
}

export interface VideoInteractionPoint {
  timeSeconds: number;
  type: 'question' | 'note' | 'bookmark' | 'quiz';
  data: any;
  required?: boolean;
}

export interface VideoCompletionCriteria {
  minWatchPercentage: number; // 0-100
  minWatchTimeSeconds?: number;
  interactionPoints?: VideoInteractionPoint[];
  comprehensionQuiz?: string; // Quiz activity ID
}

export interface VideoFeatures {
  enableSeeking: boolean;
  allowSpeedControl: boolean;
  showTranscript: boolean;
  enableClosedCaptions: boolean;
  allowDownload: boolean;
  enableChapters: boolean;
}

export interface VideoV2Content extends ActivityV2Content {
  activityType: 'video';
  video: VideoSource;
  completionCriteria: VideoCompletionCriteria;
  features: VideoFeatures;
}
```

## 🔧 Service Layer Architecture

### Core Activity Service

```typescript
// src/features/activities-v2/services/activity-v2.service.ts
export class ActivityV2Service {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService,
    private analyticsService: ActivityAnalyticsService,
    private achievementService: AchievementService
  ) {}

  async createActivity(input: CreateActivityV2Input): Promise<Activity> {
    // Validate content based on activity type
    await this.validateActivityContent(input.content);
    
    // Create activity with V2 content
    const activity = await this.prisma.activity.create({
      data: {
        title: input.content.title,
        description: input.content.description,
        purpose: this.mapActivityTypeToPurpose(input.content.activityType),
        assessmentType: this.mapActivityTypeToAssessmentType(input.content.activityType),
        content: input.content,
        classId: input.classId,
        subjectId: input.subjectId,
        topicId: input.topicId,
        createdById: input.createdById,
        isGradable: input.content.activityType === 'quiz',
        maxScore: await this.calculateMaxScore(input.content),
        bloomsLevel: this.determineBloomsLevel(input.content),
        duration: input.content.estimatedTimeMinutes,
      }
    });

    // Initialize analytics tracking
    await this.analyticsService.initializeActivityTracking(activity.id);

    return activity;
  }

  async updateActivity(id: string, updates: Partial<ActivityV2Content>): Promise<Activity> {
    const activity = await this.getActivity(id);
    const updatedContent = { ...activity.content, ...updates };
    
    await this.validateActivityContent(updatedContent);
    
    return this.prisma.activity.update({
      where: { id },
      data: {
        content: updatedContent,
        maxScore: await this.calculateMaxScore(updatedContent),
        bloomsLevel: this.determineBloomsLevel(updatedContent),
        duration: updatedContent.estimatedTimeMinutes,
      }
    });
  }

  private async validateActivityContent(content: ActivityV2Content): Promise<void> {
    switch (content.activityType) {
      case 'quiz':
        await this.validateQuizContent(content as QuizV2Content);
        break;
      case 'reading':
        await this.validateReadingContent(content as ReadingV2Content);
        break;
      case 'video':
        await this.validateVideoContent(content as VideoV2Content);
        break;
    }
  }

  private async validateQuizContent(content: QuizV2Content): Promise<void> {
    // Validate all question IDs exist in Question Bank
    const questionIds = content.questions.map(q => q.id);
    const existingQuestions = await this.questionBankService.getQuestionsByIds(questionIds);
    
    if (existingQuestions.length !== questionIds.length) {
      throw new Error('Some questions not found in Question Bank');
    }

    // Validate CAT settings if present
    if (content.catSettings) {
      this.validateCATSettings(content.catSettings);
    }

    // Validate spaced repetition settings if present
    if (content.spacedRepetitionSettings) {
      this.validateSpacedRepetitionSettings(content.spacedRepetitionSettings);
    }
  }
}
```

### Quiz-Specific Service

```typescript
// src/features/activities-v2/services/quiz-v2.service.ts
export class QuizV2Service {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService,
    private gradingService: ActivityGradingService,
    private catEngine: CATEngine,
    private spacedRepetitionEngine: SpacedRepetitionEngine
  ) {}

  async startQuizSession(activityId: string, studentId: string): Promise<QuizSession> {
    const activity = await this.getQuizActivity(activityId);
    const content = activity.content as QuizV2Content;

    let questions: Question[];
    
    switch (content.assessmentMode) {
      case 'cat':
        questions = await this.catEngine.initializeSession(activity, studentId);
        break;
      case 'spaced_repetition':
        questions = await this.spacedRepetitionEngine.selectQuestions(activity, studentId);
        break;
      default:
        questions = await this.getTraditionalQuestions(content);
    }

    // Shuffle questions if enabled
    if (content.settings.shuffleQuestions) {
      questions = this.shuffleArray(questions);
    }

    // Create session
    const session = await this.prisma.quizSession.create({
      data: {
        activityId,
        studentId,
        questions: questions.map(q => ({ id: q.id, order: questions.indexOf(q) })),
        startTime: new Date(),
        status: 'active',
      }
    });

    return {
      id: session.id,
      questions: questions,
      settings: content.settings,
      achievementConfig: content.achievementConfig,
    };
  }

  async submitQuizAnswer(
    sessionId: string,
    questionId: string,
    answer: any,
    timeSpent: number
  ): Promise<QuestionResult> {
    const session = await this.getQuizSession(sessionId);
    const question = await this.questionBankService.getQuestion(questionId);
    
    // Grade the answer
    const result = await this.gradingService.gradeQuestion(question, answer);
    
    // Update session with answer
    await this.updateSessionAnswer(sessionId, questionId, answer, result, timeSpent);
    
    // Track question analytics
    await this.trackQuestionAnalytics(questionId, result, timeSpent);
    
    // For CAT, determine next question
    if (session.assessmentMode === 'cat') {
      const nextQuestion = await this.catEngine.getNextQuestion(session, result);
      if (nextQuestion) {
        result.nextQuestion = nextQuestion;
      }
    }

    return result;
  }

  async completeQuiz(sessionId: string): Promise<QuizResult> {
    const session = await this.getQuizSession(sessionId);
    const activity = await this.getQuizActivity(session.activityId);
    
    // Calculate final score
    const finalResult = await this.calculateFinalScore(session);
    
    // Create activity grade
    const grade = await this.createActivityGrade(session, finalResult);
    
    // Award achievements and points
    await this.awardAchievements(session, finalResult);
    
    // Update analytics
    await this.updateQuizAnalytics(session, finalResult);
    
    return finalResult;
  }

  private async trackQuestionAnalytics(
    questionId: string,
    result: QuestionResult,
    timeSpent: number
  ): Promise<void> {
    // Update Question Bank analytics
    await this.questionBankService.updateQuestionAnalytics(questionId, {
      used: true,
      correct: result.isCorrect,
      timeSpent,
      difficulty: result.perceivedDifficulty,
    });
  }
}
```

## 🎯 Integration Specifications

### Question Bank Analytics Integration

```typescript
// src/features/activities-v2/integrations/question-bank-analytics.ts
export class QuestionBankAnalyticsIntegration {
  async trackQuestionUsage(questionId: string, context: QuestionUsageContext): Promise<void> {
    await this.prisma.questionUsageAnalytics.create({
      data: {
        questionId,
        activityId: context.activityId,
        studentId: context.studentId,
        isCorrect: context.isCorrect,
        timeSpentSeconds: context.timeSpent,
        attemptNumber: context.attemptNumber,
        usedAt: new Date(),
      }
    });

    // Update question performance metrics
    await this.updateQuestionMetrics(questionId, context);
  }

  async getQuestionPerformanceAnalytics(questionId: string): Promise<QuestionAnalytics> {
    const usage = await this.prisma.questionUsageAnalytics.findMany({
      where: { questionId },
    });

    return {
      totalUsage: usage.length,
      correctRate: usage.filter(u => u.isCorrect).length / usage.length,
      averageTimeSpent: usage.reduce((sum, u) => sum + u.timeSpentSeconds, 0) / usage.length,
      difficultyIndex: this.calculateDifficultyIndex(usage),
      discriminationIndex: this.calculateDiscriminationIndex(usage),
      bloomsEffectiveness: await this.calculateBloomsEffectiveness(questionId, usage),
    };
  }
}
```

### Time Tracking Integration

```typescript
// src/features/activities-v2/integrations/time-tracking.ts
export class ActivityV2TimeTracking {
  async startActivityTracking(activityId: string, studentId: string): Promise<void> {
    // Use existing TimeTrackingProvider
    const timeTracker = useTimeTracking();
    timeTracker.startTracking(activityId);
    
    // Initialize activity-specific tracking
    await this.initializeActivitySession(activityId, studentId);
  }

  async recordSectionTime(
    activityId: string,
    studentId: string,
    section: string,
    timeSpent: number
  ): Promise<void> {
    await this.prisma.activityTimeTracking.create({
      data: {
        activityId,
        studentId,
        section,
        timeSpentSeconds: timeSpent,
        recordedAt: new Date(),
      }
    });
  }

  async completeActivityTracking(
    activityId: string,
    studentId: string,
    totalTime: number
  ): Promise<void> {
    // Use existing learning-time service
    const learningTimeService = new LearningTimeService({ prisma: this.prisma });
    await learningTimeService.recordTimeSpent({
      studentId,
      activityId,
      timeSpentMinutes: Math.ceil(totalTime / 60),
    });
  }
}
```

This technical specification provides the foundation for implementing Activities V2 with comprehensive type safety, proper service architecture, and seamless integration with existing systems.
