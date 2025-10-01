# ActivitiesV2 Implementation Plan

## 🎯 Executive Summary

This implementation plan provides a detailed roadmap for implementing ActivitiesV2 without breaking the existing system. The plan follows a **zero-downtime, backward-compatible** approach that allows gradual migration while maintaining full functionality of the current system.

## 📋 Implementation Phases

### Phase 1: Foundation & Compatibility Layer (Week 1-2)
**Goal**: Establish V2 infrastructure without affecting existing functionality

### Phase 2: Core V2 Services (Week 3-4)
**Goal**: Implement core V2 functionality

### Phase 3: Advanced Features (Week 5-6)
**Goal**: Implement CAT and Spaced Repetition

### Phase 4: Migration & Optimization (Week 7-8)
**Goal**: Create migration tools and optimize performance

#### 1.1 Database Schema Extensions
```typescript
// No database migrations needed - only JSON schema extensions
// File: src/types/activities-v2.types.ts

export interface ActivitiesV2Content {
  // Existing V1 fields preserved
  version: string;
  activityType: string;
  settings: ActivitySettings;
  blocks?: ActivityBlock[];
  metadata?: ActivityMetadata;

  // NEW: V2 extensions
  v2?: {
    assessmentMode: 'CBT' | 'CAT' | 'SPACED_REPETITION' | 'TRADITIONAL';
    questionSelection: QuestionSelectionConfig;
    deliverySettings: DeliverySettings;
    bloomsAnalytics: BloomsAnalyticsConfig;
  };
}

// Validation schemas
export const activitiesV2ContentSchema = z.object({
  // V1 schema (existing)
  version: z.string(),
  activityType: z.string(),
  settings: activitySettingsSchema,
  blocks: z.array(activityBlockSchema).optional(),
  metadata: activityMetadataSchema.optional(),

  // V2 extensions
  v2: z.object({
    assessmentMode: z.enum(['CBT', 'CAT', 'SPACED_REPETITION', 'TRADITIONAL']),
    questionSelection: questionSelectionConfigSchema,
    deliverySettings: deliverySettingsSchema,
    bloomsAnalytics: bloomsAnalyticsConfigSchema,
  }).optional(),
});
```

#### 1.2 Compatibility Detection Service
```typescript
// File: src/server/api/services/activities-v2-detection.service.ts

export class ActivitiesV2DetectionService {
  static isV2Activity(activity: Activity): boolean {
    return activity.content?.v2 !== undefined;
  }

  static getAssessmentMode(activity: Activity): AssessmentMode {
    if (!this.isV2Activity(activity)) {
      return 'TRADITIONAL';
    }
    return activity.content.v2.assessmentMode;
  }

  static requiresQuestionBank(activity: Activity): boolean {
    if (!this.isV2Activity(activity)) {
      return false;
    }
    return activity.content.v2.questionSelection.strategy !== 'MANUAL';
  }
}
```

#### 1.3 Backward Compatible API Extensions
```typescript
// File: src/server/api/routers/activity.ts (extend existing)

// Add new optional endpoints alongside existing ones
export const activityRouter = createTRPCRouter({
  // ALL EXISTING ENDPOINTS PRESERVED
  submitActivity,
  autoGrade,
  getById,
  // ... all existing endpoints unchanged

  // NEW: V2 endpoints (optional, backward compatible)
  detectV2Features: protectedProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ ctx, input }) => {
      const activity = await ctx.prisma.activity.findUnique({
        where: { id: input.activityId }
      });

      return {
        isV2: ActivitiesV2DetectionService.isV2Activity(activity),
        assessmentMode: ActivitiesV2DetectionService.getAssessmentMode(activity),
        features: activity?.content?.v2 || null,
      };
    }),

  // Enhanced submission that falls back to existing logic
  submitActivityEnhanced: protectedProcedure
    .input(z.object({
      // All existing fields preserved
      activityId: z.string(),
      answers: z.any(),
      clientResult: z.any().optional(),
      storeDetailedResults: z.boolean().optional().default(true),
      priority: z.number().optional().default(1),
      timeSpentMinutes: z.number().optional(),

      // NEW: Optional V2 fields
      v2Data: z.object({
        irtParameters: z.any().optional(),
        spacedRepetitionData: z.any().optional(),
        bloomsAnalytics: z.any().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Route to appropriate processor
      const activity = await ctx.prisma.activity.findUnique({
        where: { id: input.activityId }
      });

      if (ActivitiesV2DetectionService.isV2Activity(activity)) {
        return processActivityV2Submission(ctx, input, activity);
      } else {
        // Fallback to existing submission processing
        return processActivitySubmission(
          ctx.prisma,
          input.activityId,
          ctx.session.user.studentProfile.id,
          input.answers,
          input.clientResult,
          { storeDetailedResults: input.storeDetailedResults },
          input.timeSpentMinutes
        );
      }
    }),
});
```

### Phase 2: Core V2 Services (Week 3-4)
**Goal**: Implement core V2 functionality

#### 2.1 Intelligent Question Selection Service
```typescript
// File: src/server/api/services/intelligent-question-selection.service.ts

export class IntelligentQuestionSelectionService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  async selectQuestions(
    config: QuestionSelectionConfig,
    studentContext: StudentContext,
    activityContext: ActivityContext
  ): Promise<SelectedQuestion[]> {

    switch (config.strategy) {
      case 'MANUAL':
        return this.manualSelection(config);
      case 'INTELLIGENT':
        return this.intelligentSelection(config, studentContext);
      case 'ADAPTIVE':
        return this.adaptiveSelection(config, studentContext);
      case 'SPACED':
        return this.spacedRepetitionSelection(config, studentContext);
      default:
        throw new Error(`Unknown selection strategy: ${config.strategy}`);
    }
  }

  private async intelligentSelection(
    config: QuestionSelectionConfig,
    context: StudentContext
  ): Promise<SelectedQuestion[]> {

    // Use existing QuizAutoSelectionAgent
    const agent = new QuizAutoSelectionAgent();

    const request: QuizAutoSelectionRequest = {
      subjectId: context.subjectId,
      topicIds: config.selectionCriteria.topicIds || [],
      questionCount: config.selectionCriteria.questionCount || 10,
      targetBloomsDistribution: config.selectionCriteria.bloomsDistribution,
      targetDifficultyDistribution: config.selectionCriteria.difficultyRange,
      qualityThreshold: config.selectionCriteria.qualityThreshold || 3,
      excludeRecentlyUsed: config.selectionCriteria.excludeRecentlyUsed || true,
      studentPerformanceData: {
        averageScore: context.averageScore || 0,
        weakAreas: context.weakAreas || [],
        strongAreas: context.strongAreas || [],
      },
    };

    const result = await agent.execute('selectOptimalQuestions', request);
    return result.selectedQuestions;
  }
}
```

#### 2.2 CBT Assessment Engine
```typescript
// File: src/server/api/services/cbt-assessment.service.ts

export class CBTAssessmentService {
  constructor(
    private questionSelectionService: IntelligentQuestionSelectionService,
    private analyticsService: BloomsAnalyticsServiceV2
  ) {}

  async initializeCBTSession(
    activity: Activity,
    studentId: string
  ): Promise<CBTSession> {

    const studentContext = await this.buildStudentContext(studentId, activity);
    const questions = await this.questionSelectionService.selectQuestions(
      activity.content.v2.questionSelection,
      studentContext,
      { activityId: activity.id, subjectId: activity.subjectId }
    );

    return {
      sessionId: generateUniqueId(),
      activityId: activity.id,
      studentId,
      questions: questions,
      currentQuestionIndex: 0,
      startTime: new Date(),
      deliverySettings: activity.content.v2.deliverySettings,
      analytics: {
        realTimeTracking: activity.content.v2.deliverySettings.realTimeAnalytics,
        bloomsTracking: activity.content.v2.bloomsAnalytics.trackingEnabled,
      },
    };
  }

  async processQuestionResponse(
    sessionId: string,
    questionId: string,
    response: QuestionResponse
  ): Promise<CBTResponseResult> {

    const session = await this.getSession(sessionId);

    // Process response using existing grading logic
    const gradingResult = await this.gradeQuestionResponse(
      questionId,
      response,
      session.questions.find(q => q.id === questionId)
    );

    // Update session with response
    await this.updateSessionWithResponse(sessionId, questionId, gradingResult);

    // Real-time analytics if enabled
    if (session.analytics.realTimeTracking) {
      await this.analyticsService.trackQuestionResponse(
        session.studentId,
        questionId,
        gradingResult,
        session.questions.find(q => q.id === questionId)?.bloomsLevel
      );
    }

    return {
      isCorrect: gradingResult.isCorrect,
      score: gradingResult.score,
      feedback: gradingResult.feedback,
      nextQuestionIndex: session.currentQuestionIndex + 1,
      sessionComplete: session.currentQuestionIndex + 1 >= session.questions.length,
    };
  }
}
```
export class DynamicQuestionSelectionService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  async selectQuestions(criteria: SelectionCriteria): Promise<Question[]> {
    // Step 1: Get question pool based on filters
    const questionPool = await this.getQuestionPool(criteria);
    
    // Step 2: Apply Bloom's taxonomy distribution
    const bloomsSelection = await this.applyBloomsDistribution(
      questionPool,
      criteria.bloomsDistribution,
      criteria.totalQuestions
    );
    
    // Step 3: Apply difficulty distribution within Bloom's levels
    const finalSelection = await this.applyDifficultyDistribution(
      bloomsSelection,
      criteria.difficultyDistribution
    );
    
    // Step 4: Randomize order if needed
    return this.randomizeQuestions(finalSelection);
  }

  private async getQuestionPool(criteria: SelectionCriteria): Promise<Question[]> {
    const filters = {
      topicIds: criteria.topicIds,
      learningOutcomeIds: criteria.learningOutcomeIds,
      status: 'ACTIVE',
      ...(criteria.excludeUsedQuestions && criteria.studentId && {
        excludeUsedByStudent: criteria.studentId
      })
    };
    
    return this.questionBankService.getQuestions({ filters });
  }

  private async applyBloomsDistribution(
    questions: Question[],
    distribution: Record<BloomsTaxonomyLevel, number>,
    totalQuestions: number
  ): Promise<Question[]> {
    const selected: Question[] = [];
    
    for (const [level, percentage] of Object.entries(distribution)) {
      if (percentage === 0) continue;
      
      const levelQuestions = questions.filter(q => q.bloomsLevel === level);
      const targetCount = Math.round((percentage / 100) * totalQuestions);
      
      if (levelQuestions.length >= targetCount) {
        selected.push(...this.randomSelect(levelQuestions, targetCount));
      } else {
        // If not enough questions at this level, take all available
        selected.push(...levelQuestions);
      }
    }
    
    return selected;
  }

  private randomSelect<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
```

### 2.6 CBT Delivery System

```typescript
// src/features/activitiesv2/components/delivery/CBTInterface.tsx
import React, { useState, useEffect } from 'react';
import { Assessment, AssessmentSession } from '../../core/models/assessment';
import { Question } from '@/features/question-bank/models/types';
import { QuestionRenderer } from '@/features/question-bank/components/QuestionRenderer';

interface CBTInterfaceProps {
  assessment: Assessment;
  session: AssessmentSession;
  onSubmit: (answers: Record<string, any>) => void;
}

export const CBTInterface: React.FC<CBTInterfaceProps> = ({
  assessment,
  session,
  onSubmit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(session.answers || {});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Load questions
  useEffect(() => {
    loadQuestions();
  }, [session.id]);

  // Timer management
  useEffect(() => {
    if (assessment.questionConfig.timeLimit) {
      const startTime = session.startTime || new Date();
      const endTime = new Date(startTime.getTime() + assessment.questionConfig.timeLimit * 60000);
      
      const timer = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
        
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          handleAutoSubmit();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session.startTime, assessment.questionConfig.timeLimit]);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessment.id}/questions?sessionId=${session.id}`);
      const questionsData = await response.json();
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const handleAnswerChange = async (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    
    // Auto-save answer
    try {
      await fetch(`/api/assessment-sessions/${session.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer })
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleNavigation = (direction: 'next' | 'prev' | number) => {
    if (typeof direction === 'number') {
      setCurrentQuestionIndex(direction);
    } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const handleAutoSubmit = () => {
    // Auto-submit when time expires
    onSubmit(answers);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return <div className="loading">Loading assessment...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="cbt-interface">
      {/* Header */}
      <div className="cbt-header">
        <div className="assessment-info">
          <h1>{assessment.title}</h1>
          <div className="progress-info">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>
        
        {timeRemaining !== null && (
          <div className={`timer ${timeRemaining < 300 ? 'warning' : ''}`}>
            Time Remaining: {formatTime(timeRemaining)}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {assessment.questionConfig.showProgressBar && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Question Navigation */}
      {assessment.questionConfig.allowNavigation && (
        <div className="question-navigation">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`nav-button ${index === currentQuestionIndex ? 'active' : ''} ${
                answers[questions[index].id] ? 'answered' : ''
              }`}
              onClick={() => handleNavigation(index)}
            >
              {assessment.questionConfig.showQuestionNumbers ? index + 1 : '●'}
            </button>
          ))}
        </div>
      )}

      {/* Current Question */}
      <div className="question-container">
        <QuestionRenderer
          question={currentQuestion}
          questionNumber={assessment.questionConfig.showQuestionNumbers ? currentQuestionIndex + 1 : undefined}
          answer={answers[currentQuestion.id]}
          onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
          mode="student"
          showExplanation={false}
        />
      </div>

      {/* Navigation Controls */}
      <div className="cbt-controls">
        <button
          onClick={() => handleNavigation('prev')}
          disabled={currentQuestionIndex === 0 || !assessment.questionConfig.allowNavigation}
          className="nav-control prev"
        >
          Previous
        </button>

        <div className="center-controls">
          <button
            onClick={handleSubmit}
            className="submit-button"
          >
            Submit Assessment
          </button>
        </div>

        <button
          onClick={() => handleNavigation('next')}
          disabled={currentQuestionIndex === questions.length - 1 || !assessment.questionConfig.allowNavigation}
          className="nav-control next"
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

### 2.7 Paper-Based Testing (PBT) System

```typescript
// src/features/activitiesv2/utils/paper-generation/paper-generator.service.ts
export class PaperGeneratorService {
  constructor(private prisma: PrismaClient) {}

  async generatePaper(assessmentId: string): Promise<PaperDocument> {
    const assessment = await this.getAssessment(assessmentId);
    const questions = await this.getQuestionsForAssessment(assessmentId);

    const paper: PaperDocument = {
      id: generateId(),
      assessmentId,
      title: assessment.title,
      instructions: this.generateInstructions(assessment),
      header: this.generateHeader(assessment),
      questions: await this.formatQuestionsForPaper(questions),
      answerSheet: this.generateAnswerSheet(questions),
      gradingRubric: this.generateGradingRubric(questions),
      metadata: {
        generatedAt: new Date(),
        totalQuestions: questions.length,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        estimatedTime: assessment.questionConfig.timeLimit,
        version: '1.0'
      }
    };

    return paper;
  }

  private async formatQuestionsForPaper(questions: Question[]): Promise<PaperQuestion[]> {
    return questions.map((question, index) => ({
      number: index + 1,
      id: question.id,
      type: question.questionType,
      content: this.convertToPaperFormat(question),
      points: question.points || 1,
      answerSpace: this.calculateAnswerSpace(question),
      bloomsLevel: question.bloomsLevel,
      difficulty: question.difficulty
    }));
  }

  private convertToPaperFormat(question: Question): PaperQuestionContent {
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return {
          text: question.content.text,
          options: question.content.options.map((opt, idx) => ({
            label: String.fromCharCode(65 + idx), // A, B, C, D
            text: opt.text
          })),
          instructions: 'Choose the best answer and mark it on the answer sheet.'
        };

      case 'TRUE_FALSE':
        return {
          text: question.content.text,
          instructions: 'Mark T for True or F for False on the answer sheet.'
        };

      case 'FILL_IN_THE_BLANKS':
        return {
          text: question.content.textWithBlanks,
          instructions: 'Fill in the blanks with appropriate words or phrases.'
        };

      default:
        return {
          text: question.content.text || question.title,
          instructions: 'Provide your answer in the space provided.'
        };
    }
  }
}
```

### 2.8 Grading Integration

```typescript
// src/features/activitiesv2/integrations/grading/assessment-grading.service.ts
export class AssessmentGradingService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService,
    private bloomAnalyticsService: BloomAnalyticsService
  ) {}

  async gradeAssessment(
    assessmentId: string,
    studentId: string,
    answers: Record<string, any>
  ): Promise<AssessmentResult> {
    const assessment = await this.getAssessment(assessmentId);
    const questions = await this.getQuestionsForAssessment(assessmentId, studentId);

    const result: AssessmentResult = {
      id: generateId(),
      assessmentId,
      studentId,
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
      questionResults: [],
      bloomsAnalysis: {},
      gradedAt: new Date(),
      feedback: ''
    };

    // Grade each question
    for (const question of questions) {
      const questionResult = await this.gradeQuestion(question, answers[question.id]);

      result.questionResults.push(questionResult);
      result.totalScore += questionResult.score;
      result.maxScore += questionResult.maxScore;

      // Update Bloom's analysis
      if (question.bloomsLevel) {
        const levelScore = questionResult.score / questionResult.maxScore;
        result.bloomsAnalysis[question.bloomsLevel] =
          (result.bloomsAnalysis[question.bloomsLevel] || 0) + levelScore;
      }
    }

    // Calculate percentage
    result.percentage = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;

    // Generate feedback
    result.feedback = await this.generateFeedback(result, assessment);

    // Save result
    await this.saveAssessmentResult(result);

    // Update analytics
    await this.updateAnalytics(result);

    // Update achievements
    await this.updateAchievements(result);

    // Update Bloom's mastery
    await this.updateBloomsMastery(result);

    return result;
  }

  private async gradeQuestion(question: Question, answer: any): Promise<QuestionResult> {
    const grader = this.getQuestionGrader(question.questionType);
    return grader.grade(question, answer);
  }

  private async updateBloomsMastery(result: AssessmentResult): Promise<void> {
    // Update student's Bloom's taxonomy mastery levels
    for (const [level, score] of Object.entries(result.bloomsAnalysis)) {
      await this.bloomAnalyticsService.updateStudentBloomsMastery(
        result.studentId,
        level as BloomsTaxonomyLevel,
        score,
        result.assessmentId
      );
    }
  }
}
```

### 2.9 Analytics Integration

```typescript
// src/features/activitiesv2/integrations/analytics/assessment-analytics.service.ts
export class AssessmentAnalyticsService {
  constructor(
    private prisma: PrismaClient,
    private bloomAnalyticsService: BloomAnalyticsService
  ) {}

  async generateAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalytics> {
    const results = await this.getAssessmentResults(assessmentId);
    const questions = await this.getAssessmentQuestions(assessmentId);

    return {
      overview: this.calculateOverviewMetrics(results),
      questionAnalysis: this.analyzeQuestions(questions, results),
      bloomsAnalysis: this.analyzeBloomsTaxonomy(results),
      difficultyAnalysis: this.analyzeDifficulty(questions, results),
      learningOutcomes: this.analyzeLearningOutcomes(results),
      timeAnalysis: this.analyzeTimeSpent(results),
      recommendations: await this.generateRecommendations(results, questions)
    };
  }

  private analyzeBloomsTaxonomy(results: AssessmentResult[]): BloomsAnalysis {
    const bloomsData: Record<BloomsTaxonomyLevel, BloomsLevelData> = {};

    for (const level of Object.values(BloomsTaxonomyLevel)) {
      const levelResults = results
        .filter(r => r.bloomsAnalysis[level] !== undefined)
        .map(r => r.bloomsAnalysis[level]);

      if (levelResults.length > 0) {
        bloomsData[level] = {
          averageScore: levelResults.reduce((sum, score) => sum + score, 0) / levelResults.length,
          masteryCount: levelResults.filter(score => score >= 0.7).length,
          totalAttempts: levelResults.length,
          masteryPercentage: (levelResults.filter(score => score >= 0.7).length / levelResults.length) * 100,
          distribution: this.calculateScoreDistribution(levelResults)
        };
      }
    }

    return {
      levelData: bloomsData,
      overallMastery: this.calculateOverallBloomsMastery(bloomsData),
      recommendations: this.generateBloomsRecommendations(bloomsData)
    };
  }
}
```

### 2.10 Migration Strategy

```typescript
// src/features/activitiesv2/migration/migration.service.ts
export class ActivitiesMigrationService {
  constructor(private prisma: PrismaClient) {}

  async migrateFromV1ToV2(): Promise<MigrationResult> {
    const migrationResult: MigrationResult = {
      totalActivities: 0,
      migratedActivities: 0,
      failedMigrations: [],
      createdAssessments: 0,
      warnings: []
    };

    try {
      // Get all V1 activities
      const v1Activities = await this.prisma.activity.findMany({
        where: { status: 'ACTIVE' },
        include: { subject: true, class: true }
      });

      migrationResult.totalActivities = v1Activities.length;

      for (const v1Activity of v1Activities) {
        try {
          await this.migrateActivity(v1Activity);
          migrationResult.migratedActivities++;
        } catch (error) {
          migrationResult.failedMigrations.push({
            activityId: v1Activity.id,
            error: error.message
          });
        }
      }

      return migrationResult;
    } catch (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  private async migrateActivity(v1Activity: any): Promise<void> {
    // Determine assessment type based on V1 activity type
    const assessmentType = this.mapV1TypeToV2Type(v1Activity.activityType);

    if (assessmentType === 'assessment') {
      await this.migrateToAssessment(v1Activity);
    } else if (assessmentType === 'content') {
      await this.migrateToContent(v1Activity);
    } else {
      await this.migrateToSubmission(v1Activity);
    }
  }

  private mapV1TypeToV2Type(v1Type: string): AssessmentType {
    const typeMapping: Record<string, AssessmentType> = {
      'quiz': 'assessment',
      'multiple-choice': 'assessment',
      'true-false': 'assessment',
      'fill-in-the-blanks': 'assessment',
      'matching': 'assessment',
      'reading': 'content',
      'video': 'content',
      'book': 'content',
      'essay': 'submission',
      'manual-grading': 'submission'
    };

    return typeMapping[v1Type] || 'assessment';
  }
}
```

## 3. Integration Points

### 3.1 Existing System Integration

```typescript
// Integration with existing grading system
export class GradingSystemIntegration {
  async integrateWithExistingGrading(result: AssessmentResult): Promise<void> {
    // Create activity grade record for backward compatibility
    await this.prisma.activityGrade.create({
      data: {
        activityId: result.assessmentId,
        studentId: result.studentId,
        score: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        feedback: result.feedback,
        status: 'GRADED',
        gradedAt: result.gradedAt,
        attachments: {
          assessmentV2Result: result,
          bloomsAnalysis: result.bloomsAnalysis,
          questionResults: result.questionResults
        }
      }
    });
  }
}

// Integration with achievement system
export class AchievementSystemIntegration {
  async updateAchievements(result: AssessmentResult): Promise<void> {
    const achievementService = new AchievementService(this.prisma);

    // Calculate achievement points based on performance
    const points = this.calculateAchievementPoints(result);

    await achievementService.awardPoints(
      result.studentId,
      points,
      'assessment_completion',
      {
        assessmentId: result.assessmentId,
        score: result.percentage,
        bloomsLevels: Object.keys(result.bloomsAnalysis)
      }
    );
  }
}
```

This implementation plan provides:

1. **Clean Architecture**: Simple 3-type system instead of 15+ activity types
2. **Question Bank Integration**: Direct usage without data duplication
3. **CBT/PBT Support**: Comprehensive testing delivery systems
4. **Dynamic Selection**: Intelligent question selection based on Bloom's taxonomy
5. **Full Integration**: Works with existing grading, analytics, and achievement systems
6. **Migration Strategy**: Clear path from V1 to V2
7. **Paper Generation**: Complete PBT support with answer sheets and grading rubrics

The system is designed to be efficient, maintainable, and scalable while providing advanced features for modern educational assessment needs.
