# ActivitiesV2 Architecture: Next-Generation Assessment System

## Executive Summary

ActivitiesV2 is a revolutionary assessment system that replaces the fragmented activities architecture with a unified, question bank-driven approach. This system supports both Computer-Based Testing (CBT) and Paper-Based Testing (PBT) with intelligent question selection, automatic grading, and comprehensive analytics integration.

## 1. Core Architecture Principles

### 1.1 Unified Assessment Model

**Single Activity Type**: Replace 15+ individual activity types with **3 core assessment types**:

```typescript
// Core Assessment Types
export enum AssessmentType {
  CONTENT = 'content',      // Reading, Video, Book activities
  ASSESSMENT = 'assessment', // Quiz-based assessments using question bank
  SUBMISSION = 'submission'  // Essay, Project, Manual grading activities
}

// Assessment Delivery Modes
export enum DeliveryMode {
  CBT = 'computer-based',   // Computer-Based Testing
  PBT = 'paper-based',      // Paper-Based Testing
  HYBRID = 'hybrid'         // Mixed delivery
}
```

### 1.2 Question Bank Integration

**Direct Integration**: All assessments use question bank questions directly, eliminating conversion layers:

```typescript
// Unified Assessment Model
interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  deliveryMode: DeliveryMode;
  
  // Question Bank Integration
  questionSelection: QuestionSelection;
  
  // Academic Context
  academic: AcademicContext;
  
  // Grading Configuration
  grading: GradingConfig;
  
  // Analytics Integration
  analytics: AnalyticsConfig;
}

interface QuestionSelection {
  mode: 'manual' | 'dynamic' | 'hybrid';
  criteria: SelectionCriteria;
  questions: QuestionReference[];
}

interface SelectionCriteria {
  bloomsDistribution: BloomsDistribution;
  topicIds: string[];
  learningOutcomeIds: string[];
  difficultyProgression: DifficultyProgression;
  questionCount: number;
  timeLimit?: number;
}
```

## 2. System Architecture

### 2.1 Component Structure

```
src/features/activitiesv2/
├── core/
│   ├── models/           # Core data models
│   ├── services/         # Business logic services
│   └── types/           # TypeScript definitions
├── components/
│   ├── assessment/      # Assessment creation & management
│   ├── delivery/        # CBT/PBT delivery systems
│   ├── grading/         # Grading interfaces
│   └── analytics/       # Analytics dashboards
├── integrations/
│   ├── question-bank/   # Question bank integration
│   ├── grading/         # Grading system integration
│   ├── analytics/       # Analytics integration
│   └── bloom/           # Bloom's taxonomy integration
└── utils/
    ├── question-selection/ # Dynamic question selection
    ├── paper-generation/   # PBT paper generation
    └── scoring/           # Scoring algorithms
```

### 2.2 Core Models

```typescript
// Assessment Model
export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: AssessmentType;
  deliveryMode: DeliveryMode;
  
  // Academic Integration
  subjectId: string;
  courseId?: string;
  classId: string;
  topicIds: string[];
  gradeLevel: number;
  
  // Question Configuration
  questionConfig: QuestionConfiguration;
  
  // Grading Setup
  gradingConfig: GradingConfiguration;
  
  // Scheduling
  schedule: AssessmentSchedule;
  
  // Analytics
  analyticsConfig: AnalyticsConfiguration;
  
  // System Fields
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: AssessmentStatus;
}

// Question Configuration
export interface QuestionConfiguration {
  selectionMode: QuestionSelectionMode;
  totalQuestions: number;
  timeLimit?: number;
  
  // Dynamic Selection Criteria
  bloomsDistribution: {
    [key in BloomsTaxonomyLevel]: number; // percentage
  };
  
  difficultyDistribution: {
    [key in DifficultyLevel]: number; // percentage
  };
  
  // Manual Selection
  selectedQuestions: QuestionReference[];
  
  // Question Pool Filters
  filters: QuestionFilters;
}

// Question Reference (No Data Duplication)
export interface QuestionReference {
  questionId: string;
  points: number;
  required: boolean;
  bloomsLevel?: BloomsTaxonomyLevel;
  difficulty?: DifficultyLevel;
}
```

## 3. Question Bank Integration

### 3.1 Direct Question Usage

**No Data Conversion**: Questions are used directly from question bank without copying:

```typescript
// Question Service
export class QuestionService {
  // Get questions for assessment
  async getQuestionsForAssessment(
    assessmentId: string,
    studentId?: string
  ): Promise<Question[]> {
    const assessment = await this.getAssessment(assessmentId);
    
    if (assessment.questionConfig.selectionMode === 'dynamic') {
      return this.selectQuestionsDynamically(assessment.questionConfig, studentId);
    } else {
      return this.getSelectedQuestions(assessment.questionConfig.selectedQuestions);
    }
  }
  
  // Dynamic Question Selection
  private async selectQuestionsDynamically(
    config: QuestionConfiguration,
    studentId?: string
  ): Promise<Question[]> {
    const criteria: QuestionSelectionCriteria = {
      topicIds: config.filters.topicIds,
      learningOutcomeIds: config.filters.learningOutcomeIds,
      bloomsDistribution: config.bloomsDistribution,
      difficultyDistribution: config.difficultyDistribution,
      totalQuestions: config.totalQuestions,
      excludeUsedQuestions: studentId ? true : false,
      studentId
    };
    
    return this.questionBankService.selectQuestions(criteria);
  }
}
```

### 3.2 Question Viewer Integration

**Unified Question Rendering**: Use question bank viewers directly:

```typescript
// Assessment Viewer Component
export const AssessmentViewer: React.FC<AssessmentViewerProps> = ({
  assessment,
  mode,
  studentId,
  onSubmit
}) => {
  const { data: questions } = useQuestions(assessment.id, studentId);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  return (
    <div className="assessment-viewer">
      <AssessmentHeader assessment={assessment} />
      
      {questions?.map((question, index) => (
        <QuestionRenderer
          key={question.id}
          question={question}
          questionNumber={index + 1}
          answer={answers[question.id]}
          onAnswerChange={(answer) => 
            setAnswers(prev => ({ ...prev, [question.id]: answer }))
          }
          mode={mode}
          showExplanation={false}
        />
      ))}
      
      <AssessmentSubmission
        assessment={assessment}
        answers={answers}
        onSubmit={onSubmit}
      />
    </div>
  );
};

// Question Renderer (Uses Question Bank Components)
const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionNumber,
  answer,
  onAnswerChange,
  mode,
  showExplanation
}) => {
  // Import question bank viewer components
  const ViewerComponent = getQuestionViewer(question.questionType);
  
  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber}</span>
        <span className="question-points">{question.points || 1} points</span>
      </div>
      
      <ViewerComponent
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        mode={mode}
        showExplanation={showExplanation}
      />
    </div>
  );
};
```

## 4. Computer-Based Testing (CBT) System

### 4.1 CBT Delivery Engine

```typescript
// CBT Delivery Service
export class CBTDeliveryService {
  async startAssessment(assessmentId: string, studentId: string): Promise<CBTSession> {
    const assessment = await this.assessmentService.getAssessment(assessmentId);
    const questions = await this.questionService.getQuestionsForAssessment(
      assessmentId, 
      studentId
    );
    
    // Create CBT session
    const session: CBTSession = {
      id: generateId(),
      assessmentId,
      studentId,
      questions: questions.map(q => ({ questionId: q.id, points: q.points || 1 })),
      startTime: new Date(),
      timeLimit: assessment.questionConfig.timeLimit,
      status: 'active',
      answers: {},
      analytics: {
        questionStartTimes: {},
        questionEndTimes: {},
        navigationHistory: []
      }
    };
    
    await this.saveCBTSession(session);
    return session;
  }
  
  async submitAnswer(
    sessionId: string, 
    questionId: string, 
    answer: any
  ): Promise<void> {
    const session = await this.getCBTSession(sessionId);
    
    // Update answer
    session.answers[questionId] = answer;
    session.analytics.questionEndTimes[questionId] = new Date();
    
    // Auto-save
    await this.saveCBTSession(session);
    
    // Track in question bank analytics
    await this.trackQuestionUsage(questionId, answer, session);
  }
}
```

### 4.2 CBT Interface Components

```typescript
// CBT Assessment Interface
export const CBTInterface: React.FC<CBTInterfaceProps> = ({
  session,
  onSubmit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(session.timeLimit);
  
  return (
    <div className="cbt-interface">
      {/* CBT Header */}
      <CBTHeader
        assessment={session.assessment}
        timeRemaining={timeRemaining}
        progress={(currentQuestionIndex + 1) / session.questions.length * 100}
      />
      
      {/* Question Navigation */}
      <QuestionNavigation
        questions={session.questions}
        currentIndex={currentQuestionIndex}
        answers={session.answers}
        onNavigate={setCurrentQuestionIndex}
      />
      
      {/* Current Question */}
      <QuestionRenderer
        question={session.questions[currentQuestionIndex]}
        answer={session.answers[session.questions[currentQuestionIndex].id]}
        onAnswerChange={(answer) => 
          handleAnswerChange(session.questions[currentQuestionIndex].id, answer)
        }
        mode="student"
      />
      
      {/* CBT Controls */}
      <CBTControls
        canNavigateBack={currentQuestionIndex > 0}
        canNavigateNext={currentQuestionIndex < session.questions.length - 1}
        onBack={() => setCurrentQuestionIndex(prev => prev - 1)}
        onNext={() => setCurrentQuestionIndex(prev => prev + 1)}
        onSubmit={() => handleSubmitAssessment()}
      />
    </div>
  );
};
```

## 5. Paper-Based Testing (PBT) System

### 5.1 Paper Generation Service

```typescript
// PBT Generation Service
export class PBTGenerationService {
  async generatePaper(assessmentId: string): Promise<PaperDocument> {
    const assessment = await this.assessmentService.getAssessment(assessmentId);
    const questions = await this.questionService.getQuestionsForAssessment(assessmentId);
    
    const paper: PaperDocument = {
      id: generateId(),
      assessmentId,
      title: assessment.title,
      instructions: this.generateInstructions(assessment),
      questions: await this.formatQuestionsForPaper(questions),
      answerSheet: this.generateAnswerSheet(questions),
      gradingRubric: this.generateGradingRubric(questions),
      metadata: {
        generatedAt: new Date(),
        totalQuestions: questions.length,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        estimatedTime: assessment.questionConfig.timeLimit
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
      answerSpace: this.calculateAnswerSpace(question)
    }));
  }
}
```

### 5.2 Paper Scanning & Grading

```typescript
// Paper Scanning Service
export class PaperScanningService {
  async processScannnedPaper(
    assessmentId: string,
    studentId: string,
    scannedImages: File[]
  ): Promise<ScanningResult> {
    // OCR Processing
    const ocrResults = await this.ocrService.processImages(scannedImages);
    
    // Answer Extraction
    const extractedAnswers = await this.extractAnswers(ocrResults, assessmentId);
    
    // Validation
    const validationResult = await this.validateExtractedAnswers(
      extractedAnswers, 
      assessmentId
    );
    
    return {
      studentId,
      assessmentId,
      extractedAnswers,
      confidence: validationResult.confidence,
      requiresManualReview: validationResult.confidence < 0.8,
      scanningMetadata: {
        processedAt: new Date(),
        imageCount: scannedImages.length,
        ocrEngine: 'tesseract-v5'
      }
    };
  }
}
```

## 6. Dynamic Question Selection

### 6.1 Bloom's Taxonomy-Based Selection

```typescript
// Dynamic Question Selection Service
export class DynamicQuestionSelectionService {
  async selectQuestions(criteria: SelectionCriteria): Promise<Question[]> {
    // Get question pool
    const questionPool = await this.getQuestionPool(criteria);
    
    // Apply Bloom's distribution
    const bloomsSelection = this.applyBloomsDistribution(
      questionPool, 
      criteria.bloomsDistribution
    );
    
    // Apply difficulty progression
    const difficultySelection = this.applyDifficultyProgression(
      bloomsSelection,
      criteria.difficultyProgression
    );
    
    // Apply learning outcome filters
    const outcomeSelection = this.filterByLearningOutcomes(
      difficultySelection,
      criteria.learningOutcomeIds
    );
    
    // Final selection with randomization
    return this.finalizeSelection(outcomeSelection, criteria.questionCount);
  }
  
  private applyBloomsDistribution(
    questions: Question[],
    distribution: BloomsDistribution
  ): Question[] {
    const selected: Question[] = [];
    
    for (const [level, percentage] of Object.entries(distribution)) {
      const levelQuestions = questions.filter(q => q.bloomsLevel === level);
      const count = Math.round((percentage / 100) * questions.length);
      
      selected.push(...this.randomSelect(levelQuestions, count));
    }
    
    return selected;
  }
}
```

## 7. Grading Integration

### 7.1 Unified Grading System

```typescript
// Assessment Grading Service
export class AssessmentGradingService {
  async gradeAssessment(
    assessmentId: string,
    studentId: string,
    answers: Record<string, any>
  ): Promise<GradingResult> {
    const assessment = await this.assessmentService.getAssessment(assessmentId);
    const questions = await this.questionService.getQuestionsForAssessment(
      assessmentId, 
      studentId
    );
    
    const gradingResult: GradingResult = {
      assessmentId,
      studentId,
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
      questionResults: [],
      bloomsAnalysis: {},
      gradedAt: new Date()
    };
    
    // Grade each question
    for (const question of questions) {
      const questionResult = await this.gradeQuestion(
        question,
        answers[question.id]
      );
      
      gradingResult.questionResults.push(questionResult);
      gradingResult.totalScore += questionResult.score;
      gradingResult.maxScore += questionResult.maxScore;
      
      // Update Bloom's analysis
      if (question.bloomsLevel) {
        gradingResult.bloomsAnalysis[question.bloomsLevel] = 
          (gradingResult.bloomsAnalysis[question.bloomsLevel] || 0) + 
          (questionResult.score / questionResult.maxScore);
      }
    }
    
    gradingResult.percentage = (gradingResult.totalScore / gradingResult.maxScore) * 100;
    
    // Save grading result
    await this.saveGradingResult(gradingResult);
    
    // Update analytics
    await this.updateAnalytics(gradingResult);
    
    return gradingResult;
  }
}
```

## 8. Analytics Integration

### 8.1 Comprehensive Analytics

```typescript
// Assessment Analytics Service
export class AssessmentAnalyticsService {
  async generateAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalytics> {
    const submissions = await this.getAssessmentSubmissions(assessmentId);
    const questions = await this.getAssessmentQuestions(assessmentId);
    
    return {
      overview: this.calculateOverviewMetrics(submissions),
      questionAnalysis: this.analyzeQuestions(questions, submissions),
      bloomsAnalysis: this.analyzeBloomsTaxonomy(submissions),
      difficultyAnalysis: this.analyzeDifficulty(questions, submissions),
      learningOutcomes: this.analyzeLearningOutcomes(submissions),
      timeAnalysis: this.analyzeTimeSpent(submissions),
      recommendations: this.generateRecommendations(submissions, questions)
    };
  }
  
  private analyzeBloomsTaxonomy(submissions: AssessmentSubmission[]): BloomsAnalysis {
    const bloomsData: Record<BloomsTaxonomyLevel, BloomsLevelData> = {};
    
    for (const level of Object.values(BloomsTaxonomyLevel)) {
      const levelSubmissions = submissions.filter(s => 
        s.gradingResult?.bloomsAnalysis?.[level] !== undefined
      );
      
      bloomsData[level] = {
        averageScore: this.calculateAverage(
          levelSubmissions.map(s => s.gradingResult!.bloomsAnalysis![level])
        ),
        masteryCount: levelSubmissions.filter(s => 
          s.gradingResult!.bloomsAnalysis![level] >= 0.7
        ).length,
        totalAttempts: levelSubmissions.length,
        masteryPercentage: (levelSubmissions.filter(s => 
          s.gradingResult!.bloomsAnalysis![level] >= 0.7
        ).length / levelSubmissions.length) * 100
      };
    }
    
    return { levelData: bloomsData };
  }
}
```

This architecture provides a clean, efficient foundation that:

1. **Eliminates Complexity**: 3 core types instead of 15+ activity types
2. **Leverages Question Bank**: Direct integration without data duplication
3. **Supports CBT/PBT**: Unified system for both delivery modes
4. **Dynamic Selection**: Intelligent question selection based on criteria
5. **Comprehensive Integration**: Works with existing grading, analytics, and Bloom's systems

The next document will provide detailed implementation plans and code examples for building this system.
