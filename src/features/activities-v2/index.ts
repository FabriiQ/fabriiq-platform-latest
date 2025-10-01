/**
 * Activities V2 - Main Export File
 * 
 * Exports all Activities V2 components, services, and types
 */

// Types
export * from './types';

// Services
export { ActivityV2Service } from './services/activity-v2.service';

// Main Components
export { ActivityV2Creator } from './components/ActivityV2Creator';
export { ActivityV2Viewer } from './components/ActivityV2Viewer';

// Quiz Components
export { QuizEditor } from './components/quiz/QuizEditor';
export { QuizViewer } from './components/quiz/QuizViewer';

// Reading Components
export { ReadingEditor } from './components/reading/ReadingEditor';
export { ReadingViewer } from './components/reading/ReadingViewer';

// Video Components
export { VideoEditor } from './components/video/VideoEditor';
export { VideoViewer } from './components/video/VideoViewer';

// Test utilities (for development)
export { runAllTests } from './scripts/test-activities';
export { 
  sampleQuizContent, 
  sampleReadingContent, 
  sampleVideoContent 
} from './scripts/test-activities';
