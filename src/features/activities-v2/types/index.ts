/**
 * Activities V2 Core Types
 * 
 * Minimal, efficient type definitions for Activities V2 system
 * Aligns with existing grading system and question bank integration
 */

import { BloomsTaxonomyLevel, QuestionType } from '@prisma/client';

// Activity V2 Status Management
export enum ActivityV2Status {
  DRAFT = 'DRAFT',           // Activity is being created/edited, not visible to students
  PUBLISHED = 'PUBLISHED',   // Activity is published but not yet active for students
  ACTIVE = 'ACTIVE',         // Activity is active and available to students
  INACTIVE = 'INACTIVE'      // Activity is temporarily disabled, not available to students
}

// Base Activity V2 Content Structure
export interface ActivityV2Content {
  version: '2.0';
  type: 'quiz' | 'reading' | 'video';
  title: string;
  description?: string;
  estimatedTimeMinutes?: number;
  status?: ActivityV2Status; // Activity status for management
  startDate?: Date; // When students can start this activity
  endDate?: Date;   // When this activity is no longer available
  achievementConfig: AchievementConfiguration;
}

// Achievement Configuration
export interface AchievementConfiguration {
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

// Quiz V2 Content
export interface QuizV2Content extends ActivityV2Content {
  type: 'quiz';
  questions: QuizV2Question[];
  settings: QuizSettings;
  assessmentMode: 'standard' | 'cat' | 'spaced_repetition';
  catSettings?: CATSettings;
  spacedRepetitionSettings?: SpacedRepetitionSettings;
}

export interface QuizV2Question {
  id: string; // Question Bank question ID
  order: number;
  points: number;
  shuffleOptions?: boolean;
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  showFeedbackImmediately: boolean;
  showCorrectAnswers: boolean;
  timeLimitMinutes?: number;
  timeLimit?: number; // Add this for backward compatibility
  attemptsAllowed: number;
  passingScore?: number;
  allowReview: boolean;
  showProgressBar: boolean;
  catSettings?: CATSettings;
  spacedRepetitionSettings?: SpacedRepetitionSettings;
}

// CAT Settings
export interface CATSettings {
  enabled?: boolean;
  algorithm: 'irt_2pl' | 'irt_3pl' | 'rasch';
  startingDifficulty: number;
  terminationCriteria: {
    maxQuestions: number;
    minQuestions: number;
    standardErrorThreshold: number;
  };
  itemSelectionMethod: 'maximum_information' | 'bayesian' | 'weighted';
  questionTypes?: string[]; // Filter which question types to include in CAT
  difficultyRange?: {
    min: number;
    max: number;
  };
  bloomsLevels?: string[]; // Filter by Bloom's taxonomy levels
  markingConfig?: CATMarkingConfig; // Comprehensive marking configuration
}

// CAT Marking Configuration
export interface CATMarkingConfig {
  positiveMarking: {
    easy: number;    // Points for correct EASY questions (default: 1)
    medium: number;  // Points for correct MEDIUM questions (default: 2)
    hard: number;    // Points for correct HARD questions (default: 3)
  };
  negativeMarking: {
    enabled: boolean;           // Enable/disable negative marking (default: true)
    mcqPenalty: number;        // Penalty for wrong MCQ answers (default: -1)
    titaPenalty: number;       // Penalty for wrong TITA answers (default: 0)
    unansweredPenalty: number; // Penalty for unanswered questions (default: 0)
  };
  scoringMethod: 'raw' | 'percentile' | 'scaled'; // How to present final score
  percentileConfig?: {
    populationMean: number;    // Population mean theta (default: 0)
    populationStd: number;     // Population standard deviation (default: 1)
    minPercentile: number;     // Minimum percentile to show (default: 1)
    maxPercentile: number;     // Maximum percentile to show (default: 99)
  };
}

// Spaced Repetition Settings
export interface SpacedRepetitionSettings {
  enabled?: boolean;
  algorithm: 'sm2' | 'anki' | 'supermemo';
  initialInterval: number;
  maxInterval: number;
  easeFactor: number;
}

// Reading V2 Content
export interface ReadingV2Content extends ActivityV2Content {
  type: 'reading';
  content: ReadingContent;
  completionCriteria: ReadingCompletionCriteria;
  features: ReadingFeatures;
}

export interface ReadingContent {
  type: 'rich_text' | 'url' | 'file';
  data: string; // Rich text HTML, URL, or file path
  metadata: {
    wordCount?: number;
    readingLevel?: string;
    estimatedReadingTime?: number;
  };
}

export interface ReadingCompletionCriteria {
  minTimeSeconds?: number;
  scrollPercentage?: number;
  interactionRequired?: boolean;
}

export interface ReadingFeatures {
  allowBookmarking: boolean;
  allowHighlighting: boolean;
  allowNotes: boolean;
  showProgress: boolean;
}

// Video V2 Content
export interface VideoV2Content extends ActivityV2Content {
  type: 'video';
  video: VideoSource;
  completionCriteria: VideoCompletionCriteria;
  features: VideoFeatures;
}

export interface VideoSource {
  provider: 'youtube' | 'vimeo' | 'file' | 'hls';
  url: string;
  duration?: number;
  metadata?: {
    title?: string;
    thumbnail?: string;
    description?: string;
  };
}

export interface VideoCompletionCriteria {
  minWatchPercentage: number;
  minWatchTimeSeconds?: number;
  interactionPoints?: VideoInteractionPoint[];
}

export interface VideoInteractionPoint {
  timeSeconds: number;
  type: 'question' | 'note' | 'bookmark';
  content: string;
  required: boolean;
}

export interface VideoFeatures {
  allowSeeking: boolean;
  showControls: boolean;
  allowSpeedChange: boolean;
  showTranscript: boolean;
}

// Session and Progress Types
export interface QuizV2Session {
  id: string;
  activityId: string;
  studentId: string;
  questions: QuizSessionQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, any>;
  startedAt: Date;
  timeRemaining?: number;
  completed: boolean;
}

export interface QuizSessionQuestion {
  id: string;
  questionType?: QuestionType; // Make optional for compatibility
  content?: any; // Make optional for compatibility
  points: number;
  order: number;
  bloomsLevel?: BloomsTaxonomyLevel;
  difficulty?: string;
  shuffleOptions?: boolean;
}

export interface ReadingProgress {
  scrollPercentage: number;
  timeSpent: number;
  bookmarks: ReadingBookmark[];
  highlights: ReadingHighlight[];
  notes: ReadingNote[];
}

export interface ReadingBookmark {
  id: string;
  position: number;
  title: string;
  createdAt: Date;
}

export interface ReadingHighlight {
  id: string;
  startPosition: number;
  endPosition: number;
  text: string;
  color: string;
  createdAt: Date;
}

export interface ReadingNote {
  id: string;
  position: number;
  content: string;
  createdAt: Date;
}

export interface VideoWatchProgress {
  currentTime: number;
  watchedPercentage: number;
  watchedSegments: VideoSegment[];
  interactionResponses: VideoInteractionResponse[];
}

export interface VideoSegment {
  start: number;
  end: number;
  watched: boolean;
}

export interface VideoInteractionResponse {
  interactionPointId: string;
  response: string;
  timestamp: Date;
}

// Grading Integration Types
export interface ActivityV2GradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback: string;
  achievements: Achievement[];
  questionResults?: QuestionResult[];
  completedAt: Date;
  activityGradeId?: string; // For mastery updates
  // CAT-specific scoring
  catScoring?: {
    abilityEstimate: number;      // Final theta value
    standardError: number;       // Confidence in estimate
    percentile: number;          // Percentile rank (1-99)
    scaledScore?: number;        // Optional scaled score
    questionsAsked: number;      // Total questions in CAT session
    terminationReason: 'max_questions' | 'standard_error' | 'min_questions_reached';
  };
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeSpent: number;
  feedback?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  questionType?: string;
  wasUnanswered?: boolean;
  penaltyApplied?: number; // Negative marking penalty applied
}

export interface Achievement {
  type: string;
  title: string;
  description: string;
  points: number;
  icon?: string;
  color?: string;
}

// Analytics Types
export interface QuestionUsageEvent {
  questionId: string;
  activityId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  isCorrect: boolean;
  responseTime: number;
  attemptNumber: number;
  assessmentMode: string;
  questionOrder: number;
  totalQuestions: number;
  difficultyPerceived?: number;
  confidenceLevel?: number;
  startedAt: Date;
  completedAt: Date;
  deviceType?: string;
  browserInfo?: string;
  sessionDuration?: number;
  previousQuestions?: string[];
}

// API Input Types
export interface CreateActivityV2Input {
  title: string;
  subjectId: string;
  topicId?: string;
  classId: string;
  content: ActivityV2Content;
  isGradable: boolean;
  maxScore?: number;
  passingScore?: number;
  weightage?: number;
  startDate?: Date;
  endDate?: Date;
  bloomsLevel?: BloomsTaxonomyLevel;
  learningOutcomeIds?: string[];
}

export interface SubmitActivityV2Input {
  activityId: string;
  answers?: any;
  progress?: ReadingProgress | VideoWatchProgress;
  timeSpent: number;
  questionTimings?: Record<string, number>;
  assessmentMode?: 'standard' | 'cat' | 'spaced_repetition';
  catSession?: any;
  abilityEstimate?: number;
  analytics?: {
    totalQuestions: number;
    answeredQuestions: number;
    averageTimePerQuestion: number;
    pauseCount: number;
    bloomsDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
  };
}
