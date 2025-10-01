# Teacher Assistant – Complete Implementation Plan & Full-Screen Canvas Mode

Last updated: 2025-09-03
Owner: Augment Agent (assessment)

## Executive Summary
- The current Teacher Assistant chat is not wired to a live LLM on the frontend; it uses a local Orchestrator with canned responses. This explains why answers look very similar/repetitive and are not “real‑time” (no streaming UI).
- A complete backend exists (tRPC router + Gemini service) that can return real AI responses, but the frontend does not call it.
- Search UI exists, but results are hardcoded. A Jina AI client/tool is present in the codebase but is not integrated into the Teacher Assistant search. Image search is supported by the tool but not exposed in the UI.
- Copy-to-clipboard for assistant responses is already implemented in ChatMessage.
- Class context is basic (teacher, class, subject name). There is no automatic retrieval of subject-topic-learning outcomes or criteria for alignment when generating content.
- **NEW REQUIREMENT**: Full-screen canvas mode for worksheet generation, markdown editing with rich text editor, PDF export, and task planning capabilities.

This document details what’s implemented, gaps, and a prioritized plan to achieve: real-time chat, Jina text/image search, stronger class/subject/topic/outcomes alignment, full-screen canvas mode with document generation, and a comprehensive authoring experience for teachers.

---

## What’s Implemented Today

### Frontend (Teacher Assistant)
- Provider: src/features/teacher-assistant/providers/teacher-assistant-provider.tsx
  - Manages open state, messages, typing indicator, search state
  - Uses TeacherAssistantOrchestrator to process messages LOCALLY (no backend call)
  - No streaming support (adds full response once it’s ready)
- Orchestrator: src/features/teacher-assistant/orchestrator/teacher-assistant-orchestrator.ts
  - Classifies intent and returns predefined response templates for multiple categories
  - Includes AIVY system prompt generation, but does NOT call any AI model
  - Search() returns hardcoded sample results
- Components:
  - TeacherAssistantDialog: shows either chat or search UI, no settings wired
  - MessageList + ChatMessage: render messages; ChatMessage includes copy button and text-to-speech
  - MessageInput: voice input placeholder; sends whole messages only
  - SearchInterface: search input with filters; calls provider.executeSearch() => orchestrator.search() (hardcoded)

### Backend (Server)
- Router: src/server/api/routers/teacher-assistant.ts
  - getAssistantResponse: Validates teacher, builds context, calls TeacherAssistantService.generateResponse() (Gemini 2.0 Flash via @google/generative-ai) and logs interaction
  - search: Validates teacher, RETURNS HARDCODED RESULTS; logs usage
  - preferences: save/get implemented
- Service: src/features/teacher-assistant/services/teacher-assistant.service.ts
  - generateResponse(): Calls Gemini model with a structured prompt derived from TeacherContext
  - classifyIntent(), suggestion helpers exist (not used by frontend)

### Jina Search Tools (Available but not wired)
- src/features/agents/tools/jinaSearchTool.ts
  - Real client wrapper using axios; supports modalities: text, image, video, multimodal
  - Requires JINA_API_KEY env var

### Copy Generated Content
- Implemented: ChatMessage uses navigator.clipboard and provides UI feedback.

---

## Gaps vs Requirements

1) Real-time chat and unique answers
- Current frontend uses local canned responses (same-ish answers). No streaming.
- Backend can generate real responses, but frontend does not call it.

2) Search with Jina + Images option
- UI exists but uses mocked results.
- Jina tools exist (text/image/video/multimodal), not integrated in router nor UI.
- No images tab/grid in the Teacher Assistant search interface.

3) Copy generated content
- Already implemented for assistant messages. Optionally add “Copy as Markdown/Plain Text”.

4) Class/Subject/Topic/Learning Outcomes alignment
- Context passed: teacher profile + currentClass + first subject name.
- Not fetching subject-topic-learning outcomes/criteria from DB and not aligning generated content explicitly.
- No explicit “Curriculum Alignment Agent” that validates outcomes/criteria.

---

## Root Causes of “Same Answer” and “Not Real-time”
- Orchestrator returns predefined templates per intent; many requests map to the same template.
- Frontend bypasses backend LLM; no dynamic generation => similar outputs.
- No streaming pipeline implemented (no SSE/web stream handling in provider/components).

---

## Recommended Architecture Changes

1) Wire Chat to Backend + Add Streaming
- Short term (non-streaming, fast):
  - Replace orchestrator.processMessage() call in provider with a tRPC call to teacherAssistant.getAssistantResponse. Return the string and display it.
- Medium term (streaming):
  - Add a streaming endpoint (Next.js route handler or tRPC subscription) that proxies Google Generative AI streamGenerateContent.
  - Update provider to set currentStreamingMessageId, append tokens to the last assistant message, similar to student-assistant streaming pattern.
  - Add graceful fallback to non-streaming if stream fails.

2) Integrate Jina Search (text + images)
- Backend:
  - Update teacher-assistant router search to call Jina via a small server utility (wrap the existing Jina client). Support contentType: text, image, video, multimodal. Include safeSearch + educational filters.
- Frontend:
  - Extend SearchInterface filters to include modality (Text, Images, Videos, All).
  - For images: render a responsive grid of thumbnails, with source attribution and “Insert into Chat” or “Copy URL”.
  - Add pagination/limit and loading states.

3) Curriculum Alignment and Class Context
- Extend TeacherContext to carry:
  - subjectId/topicId (or names), gradeLevel
  - learningOutcomes: array of outcome statements
  - assessmentCriteria/rubrics if available
- Backend router getAssistantResponse:
  - When classId/subject/topic params are present, fetch outcomes/criteria from Prisma and include in context.
- Prompting:
  - Create a CurriculumAlignmentAgent or prompt wrapper that: (a) maps request to subject/topic; (b) cites outcomes; (c) produces content that explicitly aligns with those outcomes and grade level; (d) includes success criteria.
- Output scaffolds:
  - For “generate lesson plan for [topic]”, return structured sections: Learning Outcomes, Success Criteria, Materials, Procedure, Differentiation, Assessment, Extensions.

4) UX Enhancements
- Copy options: add dropdown on copy button for “Copy as Markdown” vs “Copy as Plain Text”.
- Insert from search: clicking a resource/image can:
  - Insert annotated link or image markdown into the chat as assistant content, or
  - Open a side panel for assembling resources into a lesson draft.
- Settings panel: set preferred grade levels/subjects; default search filters.

5) Telemetry/Analytics
- Already present; ensure search events from Jina integration are tracked with resultCount/modality.

---

## Implementation Plan (Phased)

### Phase 1 – Fix Core Chat Issues (1–2 days)
- Frontend: In provider, replace orchestrator.processMessage() with tRPC teacherAssistant.getAssistantResponse() call; keep orchestrator only for intent tagging/analytics.
- Add error handling and preserve existing analytics. Maintain isTyping behavior (non-streaming for now).
- QA: distinct answers should now be produced by Gemini.

### Phase 2 – Add Streaming Support (2–3 days)
- Server: Add streaming route using Google Generative AI streaming API (Node SDK supports streaming). If tRPC is complex, add Next.js /api/teacher-assistant/stream with SSE/readable stream.
- Frontend: Add currentStreamingMessageId and incremental content updates (reuse Student Assistant pattern); show TypingIndicator until first tokens arrive; handle cancel.

### Phase 3 – Integrate Jina Search + Images (2–3 days)
- Server: Implement teacherAssistant.search to call Jina based on filters.modality/contentType. Support ‘image’ modality with safe/educational filters. Require JINA_API_KEY.
- Frontend: Update SearchInterface to allow modality; show text list and image grid; add insert/copy actions.

### Phase 4 – Full-Screen Canvas Mode (5–7 days)
**NEW MAJOR FEATURE**: Complete canvas-based authoring environment
- Architecture: Create full-screen mode that extends existing TeacherAssistantDialog
- Canvas Integration: Use existing Canvas system (CanvasStateProvider, ContentComposer, ArtifactRenderer)
- Rich Text Editor: Integrate existing RichTextEditor with markdown support
- Document Generation: Worksheet/lesson plan generation with structured templates
- PDF Export: Implement PDF generation using existing print utilities (html2canvas + jsPDF)
- Task Planning: Add task management for document creation workflow
- Mode Switching: Seamless toggle between chat and canvas modes

### Phase 5 – Curriculum Alignment (3–5 days)
- Data access: Fetch subject/topic/learning outcomes by class/subject/topic IDs.
- Context: Extend TeacherContext and router to pass outcomes/criteria.
- Prompting: Add CurriculumAlignmentAgent or prompt helper; make it the default for content-creation intents.
- UI: Provide a “Generate” panel template (Lesson Plan, Worksheet, Assessment) that displays aligned sections and allows copy/export.

### Phase 6 – Polish & Testing (2–3 days)
- Copy menu improvements, settings panel, better error states, loading skeletons.
- Add simple unit/integration tests for router search and response generation.
- Canvas mode testing and refinement.

---

## Risks & Prerequisites
- Keys/config: GEMINI_API_KEY and JINA_API_KEY required on server.
- Streaming through tRPC may need subscription support; Next.js route with streams may be simpler.
- Educational filters for images must be enforced for safety.
- DB model availability for outcomes/criteria: verify schema and data coverage.

---

## Quick Code Pointers
- Frontend state: src/features/teacher-assistant/providers/teacher-assistant-provider.tsx
- Orchestrator (currently canned): src/features/teacher-assistant/orchestrator/teacher-assistant-orchestrator.ts
- Backend chat router: src/server/api/routers/teacher-assistant.ts
- Gemini service: src/features/teacher-assistant/services/teacher-assistant.service.ts
- Jina tools: src/features/agents/tools/jinaSearchTool.ts
- Copy button: src/features/teacher-assistant/components/ChatMessage.tsx

---

## Definition of Done
- Chat uses backend LLM; answers vary appropriately; latency reasonable.
- Streaming: visible token-by-token or chunked updates; cancellable.
- Search: Jina-powered with modality filter; image grid supported; safe/educational filter applied.
- Copy: working; optional plain/markdown modes.
- Curriculum alignment: Generated content explicitly lists outcomes/success criteria for the selected subject/topic and matches grade level.

## Next Steps
1) Flip frontend to call getAssistantResponse (non-streaming) and validate.
2) Implement server streaming route and wire streaming UI.
3) Replace mocked search with Jina integration including image mode.
4) **Phase 4**: Build full-screen canvas mode with document generation capabilities.
5) **Phase 5**: Extend context + prompts for curriculum alignment and add a “Generate Aligned Plan” UI path.
6) **Phase 6**: Polish, testing, and refinement of all features.

---

## Full-Screen Canvas Mode Architecture

### Overview
The full-screen canvas mode transforms the Teacher Assistant into a comprehensive authoring environment where teachers can generate, edit, and export educational documents with AI assistance.

### Key Components

#### 1. Canvas Mode Toggle
- Add "Canvas Mode" button to TeacherAssistantDialog header
- Full-screen overlay that replaces the dialog when activated
- Preserves chat history and context when switching modes

#### 2. Canvas Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Chat Mode] [Canvas Mode] [Settings] [Export] [X]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Chat Sidebar    │ │ Canvas Area                         │ │
│ │ - Message List  │ │ ┌─────────────────────────────────┐ │ │
│ │ - Message Input │ │ │ Rich Text Editor                │ │ │
│ │ - Quick Actions │ │ │ - Markdown support              │ │ │
│ │                 │ │ │ - Live preview                  │ │ │
│ │ Task Panel      │ │ │ - AI-generated content          │ │ │
│ │ - Document Plan │ │ └─────────────────────────────────┘ │ │
│ │ - Progress      │ │ ┌─────────────────────────────────┐ │ │
│ │ - Templates     │ │ │ Document Structure Panel        │ │ │
│ └─────────────────┘ │ │ - Sections/Outline              │ │ │
│                     │ │ - Curriculum Alignment          │ │ │
│                     │ └─────────────────────────────────┘ │ │
│                     └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Document Generation Workflow
1. **Template Selection**: Choose from worksheet, lesson plan, assessment templates
2. **AI-Assisted Planning**: Chat with assistant to define structure and requirements
3. **Content Generation**: AI generates sections based on curriculum alignment
4. **Rich Text Editing**: Teachers can edit generated content with full formatting
5. **Task Management**: Track completion of document sections
6. **Export Options**: PDF, Word, or print-ready formats

#### 4. Integration Points

**Existing Components to Leverage:**
- `RichTextEditor` from `src/features/activties/components/ui/RichTextEditor.tsx`
- `WorksheetRenderer` from `src/features/canvas/artifacts/renderers/WorksheetRenderer.tsx`
- `Modal` with `size="full"` from `src/components/ui/feedback/modal.tsx`
- PDF generation utilities from existing print components
- Canvas system from `src/features/canvas/`

**New Components Needed:**
- `TeacherAssistantCanvasMode`: Full-screen container
- `DocumentStructurePanel`: Outline and section management
- `TaskPlanningPanel`: Document creation workflow
- `TemplateSelector`: Pre-built document templates
- `ExportControls`: PDF/Word export with formatting options

### Technical Implementation

#### 1. State Management
Extend existing TeacherAssistantProvider:
```typescript
interface TeacherAssistantContextValue {
  // Existing properties...

  // Canvas mode
  isCanvasMode: boolean;
  setIsCanvasMode: (mode: boolean) => void;

  // Document state
  currentDocument: Document | null;
  documentSections: DocumentSection[];
  updateDocumentSection: (id: string, content: string) => void;

  // Task management
  documentTasks: Task[];
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;

  // Templates
  selectedTemplate: DocumentTemplate | null;
  setSelectedTemplate: (template: DocumentTemplate) => void;
}
```

#### 2. Document Structure
```typescript
interface Document {
  id: string;
  title: string;
  type: 'worksheet' | 'lesson-plan' | 'assessment';
  sections: DocumentSection[];
  metadata: {
    subject?: string;
    gradeLevel?: string;
    learningOutcomes?: string[];
    estimatedTime?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentSection {
  id: string;
  title: string;
  content: string; // Markdown content
  type: 'text' | 'question' | 'table' | 'image';
  order: number;
  isComplete: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'complete';
  sectionId?: string;
  estimatedTime?: number;
}
```

#### 3. PDF Export Implementation
```typescript
// Extend existing PDF utilities
export async function exportDocumentToPDF(
  document: Document,
  options: {
    format: 'A4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    includeAnswerKey?: boolean;
  }
): Promise<Blob> {
  // Use WorksheetRenderer for structured content
  // Apply print-specific CSS
  // Generate PDF using html2canvas + jsPDF
}
```

### Updated Definition of Done
- Chat uses backend LLM; answers vary appropriately; latency reasonable.
- Streaming: visible token-by-token or chunked updates; cancellable.
- Search: Jina-powered with modality filter; image grid supported; safe/educational filter applied.
- Copy: working; optional plain/markdown modes.
- Curriculum alignment: Generated content explicitly lists outcomes/success criteria for the selected subject/topic and matches grade level.
- **Canvas Mode**: Full-screen authoring environment with rich text editing, document templates, task planning, and PDF export.
- **Document Generation**: AI-assisted worksheet/lesson plan creation with curriculum alignment.
- **Task Management**: Progress tracking for document creation workflow.
