'use client';

/**
 * Activity Registry Initialization
 *
 * This file initializes all activity types in the registry.
 * It's separated from the registry definition to avoid circular dependencies.
 */

import { z } from 'zod';
import { ActivityPurpose, AssessmentType } from '@/server/api/constants';
import { BloomsTaxonomyLevel } from '@/features/bloom/types/bloom-taxonomy';
import { activityRegistry } from './index';
import { ManualGradingCreator } from '../components/activity-creators/ManualGradingCreator';
import { ManualGradingViewer } from '../components/activity-viewers/ManualGradingViewer';
import { registerEssayActivity } from '../types/essay';
import { QuizEditor } from '../components/quiz/QuizEditor';
import { QuizViewer } from '../components/quiz/QuizViewer';

// Initialize all activity types
export function initializeActivityRegistry() {
  // Register manual grading activity
  registerManualGradingActivity();

  // Register essay activity with AI grading capabilities
  registerEssayActivity();

  // Register quiz activity
  registerQuizActivity();

  // Add other activity type registrations here
  // registerMultipleChoiceActivity();
  // registerTrueFalseActivity();
  // etc.
}

// Manual Grading Activity Registration
function registerManualGradingActivity() {
  // Schema for manual grading activity configuration
  const ManualGradingSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    instructions: z.string().min(10, 'Instructions must be at least 10 characters'),
    bloomsLevel: z.nativeEnum(BloomsTaxonomyLevel),
    rubricId: z.string().optional(),
    submissionInstructions: z.string().optional(),
    settings: z.object({
      allowFileUpload: z.boolean().default(true),
      allowTextSubmission: z.boolean().default(true),
      allowLinkSubmission: z.boolean().default(false),
      maxFileSize: z.number().min(1).max(100).default(10),
      maxFiles: z.number().min(1).max(10).default(3),
      allowedFileTypes: z.array(z.string()).default(['pdf', 'docx', 'jpg', 'png']),
      dueDate: z.date().optional(),
      showRubricToStudents: z.boolean().default(true),
      gradingMethod: z.enum(['auto', 'manual']).default('manual'),
      gradingType: z.enum(['score', 'rubric']).default('score'),
    }).optional(),
  });

  // Default configuration for manual grading activities
  const defaultManualGradingConfig = {
    title: 'New Manual Grading Activity',
    description: 'Description of the activity...',
    instructions: 'Instructions for completing this activity...',
    bloomsLevel: BloomsTaxonomyLevel.APPLY,
    submissionInstructions: 'Please submit your work according to the instructions above.',
    settings: {
      allowFileUpload: true,
      allowTextSubmission: true,
      allowLinkSubmission: false,
      maxFileSize: 10, // 10 MB
      maxFiles: 3,
      allowedFileTypes: ['pdf', 'docx', 'jpg', 'png'],
      showRubricToStudents: true,
      gradingMethod: 'manual',
      gradingType: 'score',
    },
  };

  // Register the manual grading activity type
  activityRegistry.register({
    id: 'manual-grading',
    name: 'Manual Grading Activity',
    description: 'Create activities that require manual grading by teachers',
    category: ActivityPurpose.ASSESSMENT,
    subCategory: AssessmentType.ASSIGNMENT,
    configSchema: ManualGradingSchema,
    defaultConfig: defaultManualGradingConfig,
    capabilities: {
      isGradable: true,
      hasSubmission: true,
      hasInteraction: false,
      hasRealTimeComponents: false,
      requiresTeacherReview: true,
    },
    components: {
      editor: ManualGradingCreator,
      viewer: ManualGradingViewer,
    },
  });
}

// Quiz Activity Registration
function registerQuizActivity() {
  // Schema for quiz activity configuration
  const QuizSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    instructions: z.string().min(10, 'Instructions must be at least 10 characters'),
    bloomsLevel: z.nativeEnum(BloomsTaxonomyLevel),
    questions: z.array(z.object({
      id: z.string(),
      type: z.enum(['multiple-choice', 'true-false', 'multiple-response', 'fill-in-the-blanks', 'matching', 'sequence', 'numeric']),
      text: z.string().min(1, 'Question text is required'),
      points: z.number().min(0).default(1),
      options: z.array(z.object({
        id: z.string(),
        text: z.string(),
        isCorrect: z.boolean(),
        feedback: z.string().optional()
      })).optional(),
      isTrue: z.boolean().optional(),
      correctAnswer: z.number().optional(),
      explanation: z.string().optional(),
      hint: z.string().optional()
    })).min(1, 'At least one question is required'),
    settings: z.object({
      shuffleQuestions: z.boolean().default(false),
      showFeedbackImmediately: z.boolean().default(true),
      showCorrectAnswers: z.boolean().default(true),
      passingPercentage: z.number().min(0).max(100).default(60),
      attemptsAllowed: z.number().min(1).default(1),
      showQuestionNumbers: z.boolean().default(true),
      allowPartialCredit: z.boolean().default(true),
      showTimer: z.boolean().default(false),
      timeLimit: z.number().min(1).default(30),
      showProgressBar: z.boolean().default(true),
      allowNavigation: z.boolean().default(true),
      requireAllQuestions: z.boolean().default(true),
      showFeedbackAfterEachQuestion: z.boolean().default(false)
    }).optional()
  });

  // Default configuration for quiz activities
  const defaultQuizConfig = {
    title: 'New Quiz Activity',
    description: 'A quiz activity with sample questions',
    instructions: 'Answer all questions and submit to complete the quiz.',
    bloomsLevel: BloomsTaxonomyLevel.UNDERSTAND,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice' as const,
        text: 'What is the capital of France?',
        points: 1,
        options: [
          { id: 'opt1', text: 'Paris', isCorrect: true, feedback: 'Correct! Paris is the capital of France.' },
          { id: 'opt2', text: 'London', isCorrect: false, feedback: 'Incorrect. London is the capital of the United Kingdom.' },
          { id: 'opt3', text: 'Berlin', isCorrect: false, feedback: 'Incorrect. Berlin is the capital of Germany.' },
          { id: 'opt4', text: 'Madrid', isCorrect: false, feedback: 'Incorrect. Madrid is the capital of Spain.' }
        ],
        explanation: 'Paris is the capital and most populous city of France.',
        hint: 'Think about the city with the Eiffel Tower.'
      }
    ],
    settings: {
      shuffleQuestions: false,
      showFeedbackImmediately: true,
      showCorrectAnswers: true,
      passingPercentage: 60,
      attemptsAllowed: 1,
      showQuestionNumbers: true,
      allowPartialCredit: true,
      showTimer: false,
      timeLimit: 30,
      showProgressBar: true,
      allowNavigation: true,
      requireAllQuestions: true,
      showFeedbackAfterEachQuestion: false
    }
  };

  // Register the quiz activity type
  activityRegistry.register({
    id: 'quiz',
    name: 'Interactive Quiz',
    description: 'Create interactive quizzes with various question types',
    category: ActivityPurpose.ASSESSMENT,
    subCategory: AssessmentType.QUIZ,
    configSchema: QuizSchema,
    defaultConfig: defaultQuizConfig,
    capabilities: {
      isGradable: true,
      hasSubmission: true,
      hasInteraction: true,
      hasRealTimeComponents: false,
      requiresTeacherReview: false,
    },
    components: {
      editor: QuizEditor,
      viewer: QuizViewer,
    },
  });
}

// Initialize the registry when this module is imported
initializeActivityRegistry();
