/**
 * Activities V2 Question Viewer Mapper
 * 
 * Maps question types to their corresponding viewer components for Activities V2
 */

import { lazy } from 'react';

// Lazy load Activities V2 question viewer components
const TrueFalseQuestionViewer = lazy(() => import('../components/quiz/question-viewers/TrueFalseQuestionViewer'));
const MultipleChoiceQuestionViewer = lazy(() => import('../components/quiz/question-viewers/MultipleChoiceQuestionViewer'));
const MultipleResponseQuestionViewer = lazy(() => import('../components/quiz/question-viewers/MultipleResponseQuestionViewer'));
const TextQuestionViewer = lazy(() => import('../components/quiz/question-viewers/TextQuestionViewer'));
const FillInTheBlanksQuestionViewer = lazy(() => import('../components/quiz/question-viewers/FillInTheBlanksQuestionViewer'));
const MatchingQuestionViewer = lazy(() => import('../components/quiz/question-viewers/MatchingQuestionViewer'));
const NumericQuestionViewer = lazy(() => import('../components/quiz/question-viewers/NumericQuestionViewer'));
const DragAndDropQuestionViewer = lazy(() => import('../components/quiz/question-viewers/DragAndDropQuestionViewer'));
const DragTheWordsQuestionViewer = lazy(() => import('../components/quiz/question-viewers/DragTheWordsQuestionViewer'));
const SequenceQuestionViewer = lazy(() => import('../components/quiz/question-viewers/SequenceQuestionViewer'));
const FlashCardsQuestionViewer = lazy(() => import('../components/quiz/question-viewers/FlashCardsQuestionViewer'));
const ReadingQuestionViewer = lazy(() => import('../components/quiz/question-viewers/ReadingQuestionViewer'));
const VideoQuestionViewer = lazy(() => import('../components/quiz/question-viewers/VideoQuestionViewer'));
const HotspotQuestionViewer = lazy(() => import('../components/quiz/question-viewers/HotspotQuestionViewer'));
const LikertScaleQuestionViewer = lazy(() => import('../components/quiz/question-viewers/LikertScaleQuestionViewer'));

// Question type to viewer component mapping for Activities V2
export const ACTIVITIES_V2_QUESTION_VIEWER_MAP: Record<string, React.ComponentType<any> | null> = {
  'MULTIPLE_CHOICE': MultipleChoiceQuestionViewer,
  'TRUE_FALSE': TrueFalseQuestionViewer,
  'MULTIPLE_RESPONSE': MultipleResponseQuestionViewer,
  'FILL_IN_THE_BLANKS': FillInTheBlanksQuestionViewer,
  'MATCHING': MatchingQuestionViewer,
  'DRAG_AND_DROP': DragAndDropQuestionViewer,
  'DRAG_THE_WORDS': DragTheWordsQuestionViewer,
  'NUMERIC': NumericQuestionViewer,
  'SEQUENCE': SequenceQuestionViewer,
  'FLASH_CARDS': FlashCardsQuestionViewer,
  'READING': ReadingQuestionViewer,
  'VIDEO': VideoQuestionViewer,
  'SHORT_ANSWER': TextQuestionViewer,
  'ESSAY': TextQuestionViewer,
  'HOTSPOT': HotspotQuestionViewer,
  'LIKERT_SCALE': LikertScaleQuestionViewer
};

// Question type display names
export const QUESTION_TYPE_DISPLAY_NAMES: Record<string, string> = {
  'MULTIPLE_CHOICE': 'Multiple Choice',
  'TRUE_FALSE': 'True/False',
  'MULTIPLE_RESPONSE': 'Multiple Response',
  'FILL_IN_THE_BLANKS': 'Fill in the Blanks',
  'MATCHING': 'Matching',
  'DRAG_AND_DROP': 'Drag and Drop',
  'DRAG_THE_WORDS': 'Drag the Words',
  'NUMERIC': 'Numeric',
  'SEQUENCE': 'Sequence',
  'FLASH_CARDS': 'Flash Cards',
  'READING': 'Reading',
  'VIDEO': 'Video',
  'SHORT_ANSWER': 'Short Answer',
  'ESSAY': 'Essay',
  'HOTSPOT': 'Hotspot',
  'LIKERT_SCALE': 'Likert Scale'
};

/**
 * Get the Activities V2 viewer component for a question type
 */
export function getActivitiesV2QuestionViewer(questionType: string): React.ComponentType<any> | null {
  return ACTIVITIES_V2_QUESTION_VIEWER_MAP[questionType] || null;
}

/**
 * Get the display name for a question type
 */
export function getQuestionTypeDisplayName(questionType: string): string {
  return QUESTION_TYPE_DISPLAY_NAMES[questionType] || String(questionType);
}

/**
 * Check if a question type has a viewer component in Activities V2
 */
export function hasActivitiesV2QuestionViewer(questionType: string): boolean {
  return ACTIVITIES_V2_QUESTION_VIEWER_MAP[questionType] !== null;
}

/**
 * Get all supported question types in Activities V2 (those with viewer components)
 */
export function getSupportedActivitiesV2QuestionTypes(): string[] {
  return Object.entries(ACTIVITIES_V2_QUESTION_VIEWER_MAP)
    .filter(([_, component]) => component !== null)
    .map(([type, _]) => type);
}

/**
 * Get all unsupported question types in Activities V2 (those without viewer components)
 */
export function getUnsupportedActivitiesV2QuestionTypes(): string[] {
  return Object.entries(ACTIVITIES_V2_QUESTION_VIEWER_MAP)
    .filter(([_, component]) => component === null)
    .map(([type, _]) => type);
}
