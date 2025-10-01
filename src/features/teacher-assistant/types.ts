/**
 * Types for the Teacher Assistant feature
 */

import { AgentType } from '@/features/agents';

/**
 * Intent categories for message classification
 */
export enum IntentCategory {
  LESSON_PLANNING = 'LESSON_PLANNING',
  ASSESSMENT = 'ASSESSMENT',
  WORKSHEET = 'WORKSHEET',
  CONTENT_CREATION = 'CONTENT_CREATION',
  CONTENT_REFINEMENT = 'CONTENT_REFINEMENT',
  SEARCH = 'SEARCH',
  STUDENT_MANAGEMENT = 'STUDENT_MANAGEMENT',
  TEACHING_STRATEGY = 'TEACHING_STRATEGY',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  GENERAL = 'GENERAL'
}

/**
 * Message in the Teacher Assistant chat
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Search result from Jina Search
 */
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  relevanceScore: number;
  imageUrl?: string;
  contentType?: 'text' | 'image' | 'video' | 'multimodal';
  metadata?: Record<string, any>;
}

/**
 * Search filters for Jina Search
 */
export interface SearchFilters {
  contentType?: string;
  subject?: string;
  gradeLevel?: string;
  modality?: 'text' | 'image' | 'video' | 'multimodal';
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

/**
 * Learning outcome for curriculum alignment
 */
export interface LearningOutcome {
  id: string;
  statement: string;
  description?: string;
  bloomsLevel: string;
  actionVerbs: string[];
  subjectId: string;
  topicId?: string;
}

/**
 * Subject topic for curriculum context
 */
export interface SubjectTopic {
  id: string;
  code: string;
  title: string;
  description?: string;
  learningOutcomesText?: string;
  competencyLevel?: string;
  keywords: string[];
  learningOutcomes: LearningOutcome[];
}

/**
 * Assessment criteria for curriculum alignment
 */
export interface AssessmentCriteria {
  id: string;
  name: string;
  description?: string;
  bloomsLevel?: string;
  weight: number;
  maxScore: number;
}

/**
 * Teacher context for the Teacher Assistant with curriculum alignment
 */
export interface TeacherContext {
  teacher?: {
    id: string;
    name: string;
    subjects?: { id: string; name: string }[];
    gradeLevels?: { id: string; name: string }[];
    preferences?: TeacherPreferences;
  };
  currentClass?: {
    id: string;
    name: string;
    subject?: {
      id: string;
      name: string;
      topics?: SubjectTopic[];
      learningOutcomes?: LearningOutcome[];
    };
    students?: number;
    gradeLevel?: string;
  };
  currentTopic?: SubjectTopic;
  assessmentCriteria?: AssessmentCriteria[];
  currentPage?: {
    path: string;
    title: string;
  };
  recentActivities?: {
    id: string;
    title: string;
    type: string;
    date: Date;
  }[];
}

/**
 * Teacher preferences for personalization
 */
export interface TeacherPreferences {
  teachingStyle?: string[];
  preferredResources?: string[];
  communicationPreferences?: string[];
  feedbackStyle?: string[];
}

/**
 * Document types for canvas mode
 */
export interface DocumentSection {
  id: string;
  title: string;
  content: string; // Markdown content
  type: 'text' | 'question' | 'table' | 'image';
  order: number;
  isComplete: boolean;
}

export interface Document {
  id: string;
  title: string;
  type: 'worksheet' | 'lesson-plan' | 'assessment' | 'handout';
  sections: DocumentSection[];
  metadata: {
    subject?: string;
    gradeLevel?: string;
    learningOutcomes?: string[];
    estimatedTime?: number;
    author?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'worksheet' | 'lesson-plan' | 'assessment' | 'handout';
  sections: Omit<DocumentSection, 'id' | 'content' | 'isComplete'>[];
  metadata: {
    subject?: string;
    gradeLevel?: string;
    estimatedTime?: number;
  };
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  type: string;
  confidence: number;
  agentType?: AgentType;
  metadata?: Record<string, any>;
}

/**
 * Teacher Assistant context value provided by the context provider
 */
export interface TeacherAssistantContextValue {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messages: Message[];
  isTyping: boolean;
  sendMessage: (content: string) => Promise<void>;
  currentStreamingMessageId?: string;
  isSearchMode: boolean;
  setIsSearchMode: (isSearchMode: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  executeSearch: (query: string, filters?: SearchFilters) => Promise<void>;
  context: TeacherContext;
  trackTeacherPreference: (preference: string, category: keyof TeacherPreferences) => void;
  hasNotification: boolean;

  // Canvas mode
  isCanvasMode: boolean;
  setIsCanvasMode: (mode: boolean) => void;
  currentDocument: Document | null;
  setCurrentDocument: (document: Document | null) => void;
  selectedTemplate: DocumentTemplate | null;
  setSelectedTemplate: (template: DocumentTemplate | null) => void;
}
