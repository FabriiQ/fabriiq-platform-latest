// Remove unused import

// Core message types compatible with AI SDK
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: MessagePart[];
  createdAt?: Date;
  searchResults?: {
    webResults?: any[];
    imageResults?: any[];
    query?: string;
  };
}

export interface MessagePart {
  type: 'text' | 'file' | 'tool-call' | 'tool-result' | 'reasoning';
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
  toolCallId?: string;
  toolName?: string;
  input?: any;
  output?: any;
  state?: 'input-available' | 'output-available' | 'error';
}

// Attachment types
export interface Attachment {
  name: string;
  url: string;
  contentType: string;
  size?: number;
}

// Artifact types
export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

// Document types
export interface Document {
  id: string;
  title: string;
  content: string;
  kind: ArtifactKind;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Teacher context types
export interface TeacherContext {
  teacher: {
    id: string;
    name: string;
    subjects: string[];
  };
  currentClass?: {
    id: string;
    name: string;
    subject?: {
      id: string;
      name: string;
    };
  };
  currentPage?: string;
}

// Custom UI data types for streaming
export interface CustomUIDataTypes {
  createDocument: {
    title: string;
    content: string;
    kind: ArtifactKind;
  };
  updateDocument: {
    documentId: string;
    content: string;
  };
  requestSuggestions: {
    documentId: string;
    suggestions: string[];
  };
}

// Vote types
export interface Vote {
  id: string;
  messageId: string;
  chatId: string;
  isUpvoted: boolean;
  userId: string;
  createdAt: Date;
}

// Visibility types
export type VisibilityType = 'public' | 'private';

// Error types
export class ChatSDKError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message || code);
    this.name = 'ChatSDKError';
  }

  toResponse() {
    return new Response(JSON.stringify({ error: this.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
