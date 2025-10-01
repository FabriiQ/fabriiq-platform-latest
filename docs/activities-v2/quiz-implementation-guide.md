# Quiz Implementation in Activities V2

## Overview

Activities V2 Quiz system provides a comprehensive assessment platform supporting multiple assessment modes including Computer-Based Testing (CBT), Computer Adaptive Testing (CAT), Paper-Based Testing (PBT), and Spaced Repetition. The system integrates seamlessly with the Question Bank and provides real-time grading, analytics, and achievement tracking.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Assessment Modes](#assessment-modes)
3. [Question Bank Integration](#question-bank-integration)
4. [Computer-Based Testing (CBT)](#computer-based-testing-cbt)
5. [Computer Adaptive Testing (CAT)](#computer-adaptive-testing-cat)
6. [Paper-Based Testing (PBT)](#paper-based-testing-pbt)
7. [Spaced Repetition](#spaced-repetition)
8. [Grading System](#grading-system)
9. [Achievement System](#achievement-system)
10. [Analytics & Reporting](#analytics--reporting)
11. [Implementation Examples](#implementation-examples)

## Architecture Overview

### Core Components

```typescript
// Core Quiz Structure
interface QuizV2Content extends ActivityV2Content {
  type: 'quiz';
  questions: QuizV2Question[];
  settings: QuizSettings;
  assessmentMode: 'standard' | 'cat' | 'spaced_repetition';
  catSettings?: CATSettings;
  spacedRepetitionSettings?: SpacedRepetitionSettings;
}

// Question Reference
interface QuizV2Question {
  id: string; // Question Bank question ID
  order: number;
  points: number;
  shuffleOptions?: boolean;
}

// Quiz Configuration
interface QuizSettings {
  shuffleQuestions: boolean;
  showFeedbackImmediately: boolean;
  showCorrectAnswers: boolean;
  timeLimitMinutes?: number;
  attemptsAllowed: number;
  passingScore?: number;
  allowReview: boolean;
  showProgressBar: boolean;
}
```

### Data Flow

1. **Quiz Creation**: Teacher selects questions from Question Bank
2. **Session Management**: System creates quiz sessions for students
3. **Question Delivery**: Questions served based on assessment mode
4. **Response Collection**: Student answers collected and validated
5. **Grading**: Real-time or batch grading based on question types
6. **Analytics**: Performance data collected for reporting
7. **Achievement Processing**: Points and badges awarded based on performance

## Assessment Modes

### 1. Standard Mode (CBT)
- Linear question presentation
- Fixed question set for all students
- Traditional computer-based testing approach
- Suitable for standardized assessments

### 2. Computer Adaptive Testing (CAT)
- Dynamic question selection based on student ability
- Personalized difficulty progression
- Efficient assessment with fewer questions
- Advanced psychometric algorithms

### 3. Spaced Repetition
- Questions repeated at optimal intervals
- Focuses on long-term retention
- Adaptive scheduling based on performance
- Ideal for vocabulary and concept reinforcement

## Question Bank Integration

### Question Selection Process

```typescript
// Question Selection Flow
1. Teacher selects Subject → Topic
2. System filters Question Bank by criteria:
   - Subject/Topic alignment
   - Bloom's Taxonomy level
   - Difficulty level
   - Question type compatibility
3. Teacher reviews and selects specific questions
4. Questions added to quiz with custom points/settings
```

### Supported Question Types

- **Multiple Choice**: Single and multiple correct answers
- **True/False**: Binary choice questions
- **Fill in the Blanks**: Text input with exact/fuzzy matching
- **Short Answer**: Open-ended text responses
- **Essay**: Long-form written responses
- **Matching**: Pair items from two lists
- **Ordering**: Arrange items in correct sequence

### Question Metadata Integration

```typescript
interface QuestionBankQuestion {
  id: string;
  content: string;
  type: QuestionType;
  bloomsLevel: BloomsTaxonomyLevel;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  topic: string;
  learningOutcomes: string[];
  estimatedTime: number;
  // CAT-specific metadata
  discriminationIndex?: number;
  difficultyParameter?: number;
  guessingParameter?: number;
}
```

## Computer-Based Testing (CBT)

### Features

- **Linear Progression**: Students answer questions in predetermined order
- **Time Management**: Global and per-question time limits
- **Auto-Save**: Responses automatically saved
- **Navigation**: Forward/backward navigation (if enabled)
- **Review Mode**: Students can review answers before submission

### Configuration Options

```typescript
interface CBTSettings {
  timeLimitMinutes?: number;
  allowBackNavigation: boolean;
  autoSubmitOnTimeExpiry: boolean;
  showQuestionNumbers: boolean;
  showProgressBar: boolean;
  allowReview: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}
```

### Implementation

```typescript
// CBT Session Management
class CBTSession {
  private questions: QuizSessionQuestion[];
  private currentIndex: number = 0;
  private answers: Record<string, any> = {};
  private timeRemaining?: number;

  async startSession(quizId: string, studentId: string) {
    // Initialize session with fixed question set
    this.questions = await this.loadQuestions(quizId);
    this.timeRemaining = this.calculateTimeLimit();
    return this.getCurrentQuestion();
  }

  async submitAnswer(questionId: string, answer: any) {
    this.answers[questionId] = answer;
    await this.saveProgress();
    return this.moveToNext();
  }

  async completeSession() {
    return await this.processGrading();
  }
}
```

## Computer Adaptive Testing (CAT)

### Algorithm Overview

CAT uses Item Response Theory (IRT) to dynamically select questions based on the student's estimated ability level.

### Supported Algorithms

```typescript
interface CATSettings {
  algorithm: 'irt_2pl' | 'irt_3pl' | 'rasch';
  startingDifficulty: number;
  terminationCriteria: {
    maxQuestions: number;
    minQuestions: number;
    standardErrorThreshold: number;
  };
  itemSelectionMethod: 'maximum_information' | 'bayesian' | 'weighted';
}
```

### IRT Models

#### 1. Rasch Model (1PL)
- Single parameter: difficulty
- Assumes equal discrimination across items
- Simplest implementation

#### 2. Two-Parameter Logistic (2PL)
- Parameters: difficulty and discrimination
- More accurate ability estimation
- Recommended for most use cases

#### 3. Three-Parameter Logistic (3PL)
- Parameters: difficulty, discrimination, and guessing
- Accounts for random guessing
- Most sophisticated model

### CAT Implementation

```typescript
class CATEngine {
  private abilityEstimate: number = 0;
  private standardError: number = 1;
  private questionsAsked: QuizSessionQuestion[] = [];

  async selectNextQuestion(availableQuestions: QuestionBankQuestion[]): Promise<QuestionBankQuestion> {
    // Filter out already asked questions
    const candidates = availableQuestions.filter(q => 
      !this.questionsAsked.find(asked => asked.id === q.id)
    );

    // Calculate information function for each candidate
    const questionScores = candidates.map(question => ({
      question,
      information: this.calculateInformation(question, this.abilityEstimate)
    }));

    // Select question with maximum information
    const selected = questionScores.reduce((max, current) => 
      current.information > max.information ? current : max
    );

    return selected.question;
  }

  async updateAbilityEstimate(response: boolean, questionDifficulty: number) {
    // Update ability estimate using Maximum Likelihood Estimation
    this.abilityEstimate = this.calculateMLE(response, questionDifficulty);
    this.standardError = this.calculateStandardError();
  }

  shouldTerminate(): boolean {
    return (
      this.questionsAsked.length >= this.settings.terminationCriteria.maxQuestions ||
      (this.questionsAsked.length >= this.settings.terminationCriteria.minQuestions &&
       this.standardError <= this.settings.terminationCriteria.standardErrorThreshold)
    );
  }
}
```

### CAT Benefits

- **Efficiency**: Fewer questions needed for accurate assessment
- **Precision**: More accurate ability estimation
- **Engagement**: Appropriately challenging questions
- **Reduced Test Anxiety**: Questions matched to ability level

## Paper-Based Testing (PBT)

### Overview

PBT mode generates printable question papers for traditional classroom testing, with digital grading support.

### Features

- **PDF Generation**: Professional question paper layout
- **Answer Sheet Creation**: Standardized bubble sheets or custom formats
- **Manual Grading Interface**: Teacher-friendly grading tools
- **Scan Integration**: OCR support for automated answer sheet processing
- **Hybrid Workflow**: Combine paper testing with digital analytics

### PBT Configuration

```typescript
interface PBTSettings {
  paperFormat: 'A4' | 'Letter' | 'Legal';
  questionsPerPage: number;
  includeAnswerSheet: boolean;
  answerSheetFormat: 'bubble' | 'written' | 'mixed';
  includeInstructions: boolean;
  headerInfo: {
    schoolName: string;
    examTitle: string;
    duration: string;
    instructions: string[];
  };
}
```

### PBT Workflow

```typescript
// PBT Generation Process
class PBTGenerator {
  async generateQuestionPaper(quiz: QuizV2Content): Promise<PDFDocument> {
    const pdf = new PDFDocument();
    
    // Add header with school/exam info
    this.addHeader(pdf, quiz.settings.pbtSettings.headerInfo);
    
    // Add instructions
    this.addInstructions(pdf, quiz.settings.pbtSettings.instructions);
    
    // Add questions with proper formatting
    for (const questionRef of quiz.questions) {
      const question = await this.getQuestionFromBank(questionRef.id);
      this.addQuestion(pdf, question, questionRef.points);
    }
    
    return pdf;
  }

  async generateAnswerSheet(quiz: QuizV2Content): Promise<PDFDocument> {
    // Generate standardized answer sheet for bubble marking
    // Include student info section and question response areas
  }
}
```

### Manual Grading Interface

```typescript
// PBT Grading Component
const PBTGradingInterface = ({ quiz, submissions }) => {
  return (
    <div className="grading-interface">
      <QuestionNavigator questions={quiz.questions} />
      <StudentResponseViewer 
        responses={submissions}
        onGrade={handleGrading}
      />
      <GradingTools 
        rubrics={quiz.rubrics}
        quickComments={quiz.quickComments}
      />
    </div>
  );
};
```

## Spaced Repetition

### Algorithm Implementation

Spaced repetition uses scientifically-proven algorithms to optimize review timing for long-term retention.

### Supported Algorithms

```typescript
interface SpacedRepetitionSettings {
  algorithm: 'sm2' | 'anki' | 'supermemo';
  initialInterval: number; // days
  maxInterval: number; // days
  easeFactor: number;
}
```

### SM-2 Algorithm (SuperMemo 2)

```typescript
class SM2Algorithm {
  calculateNextReview(
    quality: number, // 0-5 response quality
    repetition: number, // number of repetitions
    easeFactor: number, // ease factor
    interval: number // current interval in days
  ): { nextInterval: number; newEaseFactor: number; newRepetition: number } {
    
    if (quality >= 3) {
      // Correct response
      if (repetition === 0) {
        return { nextInterval: 1, newEaseFactor: easeFactor, newRepetition: 1 };
      } else if (repetition === 1) {
        return { nextInterval: 6, newEaseFactor: easeFactor, newRepetition: 2 };
      } else {
        const newInterval = Math.round(interval * easeFactor);
        return { nextInterval: newInterval, newEaseFactor: easeFactor, newRepetition: repetition + 1 };
      }
    } else {
      // Incorrect response - reset repetition
      return { nextInterval: 1, newEaseFactor: easeFactor, newRepetition: 0 };
    }
  }

  updateEaseFactor(currentEF: number, quality: number): number {
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    return Math.max(1.3, newEF); // Minimum ease factor of 1.3
  }
}
```

### Spaced Repetition Session

```typescript
class SpacedRepetitionSession {
  async getDueQuestions(studentId: string): Promise<QuestionBankQuestion[]> {
    const now = new Date();
    return await this.prisma.spacedRepetitionCard.findMany({
      where: {
        studentId,
        nextReviewDate: { lte: now },
        isActive: true
      },
      include: { question: true },
      orderBy: { nextReviewDate: 'asc' }
    });
  }

  async processResponse(cardId: string, quality: number) {
    const card = await this.getCard(cardId);
    const algorithm = new SM2Algorithm();
    
    const result = algorithm.calculateNextReview(
      quality,
      card.repetition,
      card.easeFactor,
      card.interval
    );

    await this.updateCard(cardId, {
      repetition: result.newRepetition,
      easeFactor: result.newEaseFactor,
      interval: result.nextInterval,
      nextReviewDate: this.addDays(new Date(), result.nextInterval),
      lastReviewDate: new Date()
    });
  }
}
```

## Grading System

### Automatic Grading

```typescript
interface GradingEngine {
  gradeMultipleChoice(answer: string[], correctAnswers: string[]): GradingResult;
  gradeTrueFalse(answer: boolean, correctAnswer: boolean): GradingResult;
  gradeFillInBlanks(answer: string, correctAnswer: string, fuzzyMatch: boolean): GradingResult;
  gradeShortAnswer(answer: string, rubric: GradingRubric): GradingResult;
}

interface GradingResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  feedback?: string;
  partialCredit?: number;
}
```

### Manual Grading Support

```typescript
// For essay questions and complex responses
interface ManualGradingInterface {
  questionId: string;
  studentResponse: string;
  rubric: GradingRubric;
  suggestedScore?: number; // AI-assisted scoring
  teacherScore?: number;
  feedback: string;
  gradingCriteria: GradingCriterion[];
}
```

## Achievement System

### Point Calculation

```typescript
interface AchievementConfiguration {
  enabled: boolean;
  pointsAnimation: boolean;
  celebrationLevel: 'minimal' | 'standard' | 'enthusiastic';
  points: {
    base: number;
    perfectScore?: number;
    speedBonus?: number;
    firstAttempt?: number;
    improvement?: number;
  };
  speedBonusThresholdSeconds?: number;
  triggers: {
    completion: boolean;
    perfectScore: boolean;
    speedBonus: boolean;
    firstAttempt: boolean;
    improvement: boolean;
  };
}
```

### Achievement Processing

```typescript
class AchievementProcessor {
  async processQuizCompletion(
    studentId: string,
    quizResult: ActivityV2GradingResult,
    config: AchievementConfiguration
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    // Base completion points
    if (config.triggers.completion) {
      achievements.push({
        type: 'completion',
        title: 'Quiz Completed',
        description: 'Successfully completed the quiz',
        points: config.points.base,
        icon: 'check-circle',
        color: 'green'
      });
    }

    // Perfect score bonus
    if (config.triggers.perfectScore && quizResult.percentage === 100) {
      achievements.push({
        type: 'perfect_score',
        title: 'Perfect Score!',
        description: 'Achieved 100% on the quiz',
        points: config.points.perfectScore || 0,
        icon: 'star',
        color: 'gold'
      });
    }

    // Speed bonus
    if (config.triggers.speedBonus && this.qualifiesForSpeedBonus(quizResult, config)) {
      achievements.push({
        type: 'speed_bonus',
        title: 'Speed Demon',
        description: 'Completed quiz quickly with high accuracy',
        points: config.points.speedBonus || 0,
        icon: 'zap',
        color: 'blue'
      });
    }

    return achievements;
  }
}
```

## Analytics & Reporting

### Performance Metrics

```typescript
interface QuizAnalytics {
  // Overall Performance
  averageScore: number;
  completionRate: number;
  averageTimeSpent: number;
  
  // Question-Level Analysis
  questionDifficulty: Record<string, number>;
  discriminationIndex: Record<string, number>;
  responseDistribution: Record<string, Record<string, number>>;
  
  // Student Performance
  abilityDistribution: number[];
  improvementTrends: StudentProgress[];
  
  // Assessment Mode Specific
  catEfficiency?: CATAnalytics;
  spacedRepetitionRetention?: SRAnalytics;
}
```

### Real-time Dashboard

```typescript
const QuizAnalyticsDashboard = ({ quizId }) => {
  const { data: analytics } = useQuizAnalytics(quizId);
  
  return (
    <div className="analytics-dashboard">
      <PerformanceOverview metrics={analytics.overall} />
      <QuestionAnalysis questions={analytics.questions} />
      <StudentProgress students={analytics.students} />
      <RealtimeActivity activity={analytics.realtime} />
    </div>
  );
};
```

## Implementation Examples

### Creating a Standard CBT Quiz

```typescript
const createCBTQuiz = async () => {
  const quizContent: QuizV2Content = {
    version: '2.0',
    type: 'quiz',
    title: 'Mathematics Assessment',
    description: 'Chapter 5: Algebra Basics',
    estimatedTimeMinutes: 45,
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: { base: 100, perfectScore: 50, speedBonus: 25 },
      triggers: { completion: true, perfectScore: true, speedBonus: true }
    },
    questions: [
      { id: 'q1', order: 1, points: 10, shuffleOptions: true },
      { id: 'q2', order: 2, points: 15, shuffleOptions: false },
      // ... more questions
    ],
    settings: {
      shuffleQuestions: false,
      showFeedbackImmediately: false,
      showCorrectAnswers: true,
      timeLimitMinutes: 45,
      attemptsAllowed: 2,
      passingScore: 70,
      allowReview: true,
      showProgressBar: true
    },
    assessmentMode: 'standard'
  };

  return await createActivity({
    title: quizContent.title,
    subjectId: 'math-101',
    classId: 'class-a',
    content: quizContent,
    isGradable: true,
    maxScore: 100,
    passingScore: 70
  });
};
```

### Setting up CAT Assessment

```typescript
const createCATQuiz = async () => {
  const catQuiz: QuizV2Content = {
    // ... base quiz properties
    assessmentMode: 'cat',
    catSettings: {
      algorithm: 'irt_2pl',
      startingDifficulty: 0, // Neutral starting point
      terminationCriteria: {
        maxQuestions: 20,
        minQuestions: 10,
        standardErrorThreshold: 0.3
      },
      itemSelectionMethod: 'maximum_information'
    },
    questions: [], // Questions selected dynamically
    settings: {
      // CAT-specific settings
      showProgressBar: false, // Unknown total questions
      allowReview: false, // No back navigation in CAT
      timeLimitMinutes: undefined // No global time limit
    }
  };

  return await createActivity({
    title: 'Adaptive Mathematics Assessment',
    content: catQuiz,
    // ... other properties
  });
};
```

### Spaced Repetition Setup

```typescript
const createSpacedRepetitionQuiz = async () => {
  const srQuiz: QuizV2Content = {
    // ... base properties
    assessmentMode: 'spaced_repetition',
    spacedRepetitionSettings: {
      algorithm: 'sm2',
      initialInterval: 1, // Start with 1 day
      maxInterval: 365, // Max 1 year
      easeFactor: 2.5 // Default ease factor
    },
    questions: [
      // Vocabulary or concept questions for repetition
      { id: 'vocab1', order: 1, points: 5 },
      { id: 'vocab2', order: 2, points: 5 }
    ],
    settings: {
      attemptsAllowed: -1, // Unlimited attempts for spaced repetition
      showFeedbackImmediately: true,
      showCorrectAnswers: true,
      allowReview: false
    }
  };

  return await createActivity({
    title: 'Vocabulary Review',
    content: srQuiz,
    isGradable: false, // Focus on learning, not grading
    // ... other properties
  });
};
```

### PBT Quiz Generation

```typescript
const generatePBTQuiz = async (quizId: string) => {
  const quiz = await getQuiz(quizId);

  const pbtSettings: PBTSettings = {
    paperFormat: 'A4',
    questionsPerPage: 2,
    includeAnswerSheet: true,
    answerSheetFormat: 'bubble',
    includeInstructions: true,
    headerInfo: {
      schoolName: 'ABC International School',
      examTitle: quiz.title,
      duration: `${quiz.settings.timeLimitMinutes} minutes`,
      instructions: [
        'Read all questions carefully before answering',
        'Use a #2 pencil to fill in the answer sheet',
        'Erase completely to change an answer',
        'No electronic devices allowed'
      ]
    }
  };

  const questionPaper = await generateQuestionPaper(quiz, pbtSettings);
  const answerSheet = await generateAnswerSheet(quiz, pbtSettings);

  return { questionPaper, answerSheet };
};
```

## Best Practices

### 1. Question Bank Integration
- Always validate question compatibility before adding to quiz
- Use consistent point values across similar question types
- Leverage question metadata for better CAT performance
- Regularly update question difficulty parameters based on student performance

### 2. Assessment Mode Selection
- **Standard CBT**: Use for formal assessments, standardized tests
- **CAT**: Ideal for placement tests, diagnostic assessments
- **Spaced Repetition**: Perfect for vocabulary, facts, concept reinforcement
- **PBT**: Use when technology access is limited or for high-stakes exams

### 3. Performance Optimization
- Implement question pre-loading for smooth user experience
- Use database indexing for quick question retrieval
- Cache frequently accessed question metadata
- Implement progressive loading for large question sets

### 4. Security Considerations
- Implement session timeouts to prevent cheating
- Use secure question delivery to prevent answer key exposure
- Log all student interactions for audit trails
- Implement browser lockdown for high-stakes assessments

### 5. Accessibility
- Ensure all question types support screen readers
- Provide keyboard navigation for all quiz interfaces
- Support high contrast modes and font size adjustments
- Include alternative text for images and diagrams

## Troubleshooting

### Common Issues

1. **CAT Algorithm Not Converging**
   - Check question bank has sufficient items across difficulty range
   - Verify IRT parameters are properly calibrated
   - Adjust termination criteria if needed

2. **Spaced Repetition Cards Not Appearing**
   - Verify nextReviewDate is correctly calculated
   - Check timezone handling in date calculations
   - Ensure card status is set to active

3. **PBT Generation Failures**
   - Validate question content for PDF compatibility
   - Check image references are accessible
   - Ensure proper font licensing for PDF generation

4. **Grading Inconsistencies**
   - Verify answer key format matches question type
   - Check for case sensitivity in text matching
   - Review partial credit calculations

## API Reference

### Quiz Management Endpoints

```typescript
// Create Quiz
POST /api/activities-v2/quiz
{
  title: string;
  subjectId: string;
  classId: string;
  content: QuizV2Content;
}

// Start Quiz Session
POST /api/activities-v2/quiz/:id/start
{
  studentId: string;
  assessmentMode?: 'standard' | 'cat' | 'spaced_repetition';
}

// Submit Answer
POST /api/activities-v2/quiz/session/:sessionId/answer
{
  questionId: string;
  answer: any;
  timeSpent: number;
}

// Complete Quiz
POST /api/activities-v2/quiz/session/:sessionId/complete
{
  finalAnswers: Record<string, any>;
  totalTimeSpent: number;
}
```

### Analytics Endpoints

```typescript
// Get Quiz Analytics
GET /api/activities-v2/quiz/:id/analytics
Response: QuizAnalytics

// Get Student Performance
GET /api/activities-v2/quiz/:id/students/:studentId/performance
Response: StudentPerformance

// Export Results
GET /api/activities-v2/quiz/:id/export?format=csv|xlsx|pdf
Response: File download
```

This comprehensive guide covers all aspects of the Quiz Implementation in Activities V2, providing developers with the knowledge needed to implement, customize, and extend the quiz functionality.
