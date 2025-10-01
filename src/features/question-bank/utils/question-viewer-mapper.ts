/**
 * Question Bank Viewer Mapper
 * 
 * Centralized mapping system for question types to their viewer components
 */

import { QuestionType } from '../models/types';
import { lazy } from 'react';

// Lazy load question viewer components for better performance
const MultipleChoiceViewer = lazy(() => import('@/features/activties/components/multiple-choice/MultipleChoiceViewer'));
const TrueFalseViewer = lazy(() => import('@/features/activties/components/true-false/TrueFalseViewer'));
const MultipleResponseViewer = lazy(() => import('@/features/activties/components/multiple-response/MultipleResponseViewer'));
const FillInTheBlanksViewer = lazy(() => import('@/features/activties/components/fill-in-the-blanks/FillInTheBlanksViewer'));
const MatchingViewer = lazy(() => import('@/features/activties/components/matching/MatchingViewer'));
const SequenceViewer = lazy(() => import('@/features/activties/components/sequence/SequenceViewer'));
const DragAndDropViewer = lazy(() => import('@/features/activties/components/drag-and-drop/DragAndDropViewer'));
const DragTheWordsViewer = lazy(() => import('@/features/activties/components/drag-the-words/DragTheWordsViewer'));
const FlashCardsViewer = lazy(() => import('@/features/activties/components/flash-cards/FlashCardsViewer'));
const NumericViewer = lazy(() => import('@/features/activties/components/numeric/NumericViewer'));
const ReadingViewer = lazy(() => import('@/features/activties/components/reading/ReadingViewer'));
const VideoViewer = lazy(() => import('@/features/activties/components/video/VideoViewer'));
const EssayViewer = lazy(() => import('@/features/activties/components/essay/EssayViewer'));

// Question type to viewer component mapping
export const QUESTION_VIEWER_MAP: Record<QuestionType, React.ComponentType<any> | null> = {
  [QuestionType.MULTIPLE_CHOICE]: MultipleChoiceViewer,
  [QuestionType.TRUE_FALSE]: TrueFalseViewer,
  [QuestionType.MULTIPLE_RESPONSE]: MultipleResponseViewer,
  [QuestionType.FILL_IN_THE_BLANKS]: FillInTheBlanksViewer,
  [QuestionType.MATCHING]: MatchingViewer,
  [QuestionType.DRAG_AND_DROP]: DragAndDropViewer,
  [QuestionType.DRAG_THE_WORDS]: DragTheWordsViewer,
  [QuestionType.NUMERIC]: NumericViewer,
  [QuestionType.SEQUENCE]: SequenceViewer,
  [QuestionType.FLASH_CARDS]: FlashCardsViewer,
  [QuestionType.READING]: ReadingViewer,
  [QuestionType.VIDEO]: VideoViewer,
  [QuestionType.SHORT_ANSWER]: null, // TODO: Create ShortAnswerViewer
  [QuestionType.ESSAY]: EssayViewer,
  [QuestionType.HOTSPOT]: null, // TODO: Create HotspotViewer
  [QuestionType.LIKERT_SCALE]: null, // TODO: Create LikertScaleViewer
};

// Question type display names
export const QUESTION_TYPE_DISPLAY_NAMES: Record<QuestionType, string> = {
  [QuestionType.MULTIPLE_CHOICE]: 'Multiple Choice',
  [QuestionType.TRUE_FALSE]: 'True/False',
  [QuestionType.MULTIPLE_RESPONSE]: 'Multiple Response',
  [QuestionType.FILL_IN_THE_BLANKS]: 'Fill in the Blanks',
  [QuestionType.MATCHING]: 'Matching',
  [QuestionType.DRAG_AND_DROP]: 'Drag and Drop',
  [QuestionType.DRAG_THE_WORDS]: 'Drag the Words',
  [QuestionType.NUMERIC]: 'Numeric',
  [QuestionType.SEQUENCE]: 'Sequence',
  [QuestionType.FLASH_CARDS]: 'Flash Cards',
  [QuestionType.READING]: 'Reading',
  [QuestionType.VIDEO]: 'Video',
  [QuestionType.SHORT_ANSWER]: 'Short Answer',
  [QuestionType.ESSAY]: 'Essay',
  [QuestionType.HOTSPOT]: 'Hotspot',
  [QuestionType.LIKERT_SCALE]: 'Likert Scale'
};

/**
 * Get the viewer component for a question type
 */
export function getQuestionBankViewer(questionType: QuestionType): React.ComponentType<any> | null {
  return QUESTION_VIEWER_MAP[questionType] || null;
}

/**
 * Get the display name for a question type
 */
export function getQuestionTypeDisplayName(questionType: QuestionType): string {
  return QUESTION_TYPE_DISPLAY_NAMES[questionType] || String(questionType);
}

/**
 * Check if a question type has a viewer component
 */
export function hasQuestionViewer(questionType: QuestionType): boolean {
  return QUESTION_VIEWER_MAP[questionType] !== null;
}

/**
 * Get all supported question types (those with viewer components)
 */
export function getSupportedQuestionTypes(): QuestionType[] {
  return Object.entries(QUESTION_VIEWER_MAP)
    .filter(([_, component]) => component !== null)
    .map(([type, _]) => type as QuestionType);
}

/**
 * Get all unsupported question types (those without viewer components)
 */
export function getUnsupportedQuestionTypes(): QuestionType[] {
  return Object.entries(QUESTION_VIEWER_MAP)
    .filter(([_, component]) => component === null)
    .map(([type, _]) => type as QuestionType);
}

/**
 * Convert question bank question type to legacy activity type format
 */
export function convertQuestionTypeToActivityType(questionType: QuestionType): string {
  const typeMap: Record<QuestionType, string> = {
    [QuestionType.MULTIPLE_CHOICE]: 'multiple-choice',
    [QuestionType.TRUE_FALSE]: 'true-false',
    [QuestionType.MULTIPLE_RESPONSE]: 'multiple-response',
    [QuestionType.FILL_IN_THE_BLANKS]: 'fill-in-the-blanks',
    [QuestionType.MATCHING]: 'matching',
    [QuestionType.DRAG_AND_DROP]: 'drag-and-drop',
    [QuestionType.DRAG_THE_WORDS]: 'drag-the-words',
    [QuestionType.NUMERIC]: 'numeric',
    [QuestionType.SEQUENCE]: 'sequence',
    [QuestionType.FLASH_CARDS]: 'flash-cards',
    [QuestionType.READING]: 'reading',
    [QuestionType.VIDEO]: 'video',
    [QuestionType.SHORT_ANSWER]: 'short-answer',
    [QuestionType.ESSAY]: 'essay',
    [QuestionType.HOTSPOT]: 'hotspot',
    [QuestionType.LIKERT_SCALE]: 'likert-scale'
  };

  return typeMap[questionType] || questionType.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert legacy activity type to question bank question type format
 */
export function convertActivityTypeToQuestionType(activityType: string): QuestionType | null {
  const typeMap: Record<string, QuestionType> = {
    'multiple-choice': QuestionType.MULTIPLE_CHOICE,
    'true-false': QuestionType.TRUE_FALSE,
    'multiple-response': QuestionType.MULTIPLE_RESPONSE,
    'fill-in-the-blanks': QuestionType.FILL_IN_THE_BLANKS,
    'matching': QuestionType.MATCHING,
    'drag-and-drop': QuestionType.DRAG_AND_DROP,
    'drag-the-words': QuestionType.DRAG_THE_WORDS,
    'numeric': QuestionType.NUMERIC,
    'sequence': QuestionType.SEQUENCE,
    'flash-cards': QuestionType.FLASH_CARDS,
    'reading': QuestionType.READING,
    'video': QuestionType.VIDEO,
    'short-answer': QuestionType.SHORT_ANSWER,
    'essay': QuestionType.ESSAY,
    'hotspot': QuestionType.HOTSPOT,
    'likert-scale': QuestionType.LIKERT_SCALE
  };

  return typeMap[activityType] || null;
}
