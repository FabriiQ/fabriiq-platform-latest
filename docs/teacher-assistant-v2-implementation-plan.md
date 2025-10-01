# Teacher Assistant V2 Implementation Plan - COMPREHENSIVE PORT

## Overview
This plan details implementing Teacher Assistant V2 by copying ALL relevant components and artifacts from ai-chatbot-main (except auth), using direct Vercel AI SDK streaming, and replacing the current system once tested.

## Strategy: Complete Component Port
- **Copy Everything Useful**: All components, artifacts, UI elements, hooks, utilities
- **Direct Vercel Streaming**: Replace tRPC with Vercel AI SDK streaming
- **Keep Educational Context**: Maintain our teacher validation and prompting
- **Full Feature Parity**: Text editor, sidebar history, message actions, artifacts, etc.

## Current State Analysis

### ✅ What We Already Have
- **Gemini Integration**: `@google/generative-ai: ^0.24.0` with `gemini-2.0-flash` model
- **UI Dependencies**: `framer-motion: ^11.18.2`, `sonner: ^2.0.1`, `lucide-react: ^0.542.0`
- **Educational Context**: Proper teacher role validation and educational prompting
- **Storage & Auth**: Our existing systems work perfectly

### 🔧 What We Need to Add
- **Vercel AI SDK**: `ai` and `@ai-sdk/react` packages
- **Additional Dependencies**: `swr`, `usehooks-ts`, `fast-deep-equal`
- **Google AI Provider**: `@ai-sdk/google` for Vercel AI SDK integration

## Implementation Strategy

### Phase 1: Foundation Setup (Day 1)
**Goal**: Set up V2 structure without breaking existing system

#### 1.1 Install Dependencies
```bash
npm install ai @ai-sdk/react @ai-sdk/google swr usehooks-ts fast-deep-equal
```

#### 1.2 Create V2 Feature Structure - COMPLETE PORT
```
src/features/teacher-assistant-v2/
├── components/           # ALL components from ai-chatbot-main
│   ├── chat.tsx
│   ├── messages.tsx
│   ├── message.tsx
│   ├── multimodal-input.tsx
│   ├── data-stream-provider.tsx
│   ├── artifact.tsx
│   ├── artifact-*.tsx    # All artifact components
│   ├── message-actions.tsx
│   ├── message-editor.tsx
│   ├── sidebar-history.tsx
│   ├── sidebar-history-item.tsx
│   ├── text-editor.tsx
│   ├── code-editor.tsx
│   ├── sheet-editor.tsx
│   ├── image-editor.tsx
│   ├── document.tsx
│   ├── document-preview.tsx
│   ├── toolbar.tsx
│   ├── version-footer.tsx
│   ├── suggested-actions.tsx
│   ├── greeting.tsx
│   ├── icons.tsx
│   ├── toast.tsx
│   └── elements/         # ALL UI building blocks
│       ├── conversation.tsx
│       ├── message.tsx
│       ├── response.tsx
│       ├── prompt-input.tsx
│       ├── tool.tsx
│       └── ...
├── artifacts/            # ALL artifacts from ai-chatbot-main
│   ├── text/
│   ├── code/
│   ├── image/
│   └── sheet/
├── lib/
│   ├── ai/
│   │   ├── models.ts     # Gemini model config
│   │   ├── providers.ts  # Google AI provider setup
│   │   └── tools.ts      # Educational tools
│   ├── types.ts          # All type definitions
│   ├── utils.ts          # All utilities
│   └── errors.ts         # Error handling
├── hooks/                # ALL hooks from ai-chatbot-main
│   ├── use-artifact.ts
│   ├── use-messages.tsx
│   ├── use-scroll-to-bottom.tsx
│   ├── use-mobile.tsx
│   └── use-auto-resume.tsx
└── ui/                   # UI components (shadcn compatible)
    ├── button.tsx
    ├── input.tsx
    ├── textarea.tsx
    └── ...
```

#### 1.3 Create V2 Route
- `src/app/teacher/assistant/v2/page.tsx` - New page (doesn't affect existing)
- Feature flag: `NEXT_PUBLIC_TEACHER_ASSISTANT_V2=true`

### Phase 2: Core Chat Implementation (Day 1-2)
**Goal**: Working chat interface with Vercel AI SDK + Gemini

#### 2.1 Gemini Provider Setup
```typescript
// src/features/teacher-assistant-v2/lib/ai/providers.ts
import { google } from '@ai-sdk/google';

export const geminiProvider = google({
  apiKey: process.env.GEMINI_API_KEY,
});

export const geminiModel = geminiProvider('gemini-2.0-flash');
```

#### 2.2 API Route for AI SDK
```typescript
// src/app/api/teacher-assistant/v2/chat/route.ts
import { streamText } from 'ai';
import { geminiModel } from '@/features/teacher-assistant-v2/lib/ai/providers';

export async function POST(request: Request) {
  const { messages, teacherContext } = await request.json();
  
  // Apply our educational prompting
  const systemPrompt = `You are a teacher assistant for K-12 educators...`;
  
  const result = await streamText({
    model: geminiModel,
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxTokens: 300,
  });

  return result.toDataStreamResponse();
}
```

#### 2.3 Copy Core Components
Copy and adapt these files from ai-chatbot-main:
- `components/data-stream-provider.tsx` ✓ (minimal changes)
- `components/chat.tsx` → adapt transport to our API
- `components/messages.tsx` → use our styling
- `components/message.tsx` → educational context
- `components/multimodal-input.tsx` → remove model selector (fixed Gemini)

### Phase 3: Artifacts Implementation (Day 2-3)
**Goal**: Text artifacts for worksheets/documents

#### 3.1 Copy Artifact Components
From ai-chatbot-main:
- `components/artifact.tsx`
- `components/artifact-*.tsx` (actions, close, messages)
- `artifacts/text/` (text artifact implementation)

#### 3.2 Document Storage Integration
```typescript
// Use our existing document system or create minimal tables
interface TeacherDocument {
  id: string;
  teacherId: string;
  title: string;
  content: string;
  type: 'worksheet' | 'assessment' | 'lesson_plan';
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3.3 API Routes for Artifacts
- `GET /api/teacher-assistant/v2/document?id=...`
- `POST /api/teacher-assistant/v2/document` (create/update)

### Phase 4: Tools Integration (Day 3-4)
**Goal**: Educational tools (createDocument, updateDocument)

#### 4.1 Educational Tools
```typescript
// src/features/teacher-assistant-v2/lib/ai/tools.ts
export const createWorksheet = tool({
  description: 'Create educational worksheet',
  parameters: z.object({
    title: z.string(),
    subject: z.string(),
    gradeLevel: z.string(),
    content: z.string(),
  }),
  execute: async ({ title, subject, gradeLevel, content }) => {
    // Create worksheet in our system
    return { documentId: '...', title, content };
  },
});
```

## File Mapping & Adaptation Strategy

### Direct Copies (Minimal Changes)
- `data-stream-provider.tsx` ✓
- `elements/` folder (conversation, response, etc.)
- `hooks/use-scroll-to-bottom.tsx`
- `icons.tsx`

### Adaptations Required
- `chat.tsx`: Change API endpoint to our route
- `multimodal-input.tsx`: Remove model selector, use fixed Gemini
- `message.tsx`: Add educational styling/context
- `artifact.tsx`: Wire to our document storage

### Our Custom Components
- `gemini-adapter.ts`: Bridge our teacher context
- `educational-tools.ts`: Worksheet/assessment creation
- `teacher-context-provider.tsx`: Maintain our role validation

## Integration Points

### 1. Authentication & Authorization
```typescript
// Reuse our existing session validation
const session = await getServerSession(authOptions);
if (!session?.user || session.user.userType !== 'CAMPUS_TEACHER') {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Educational Context Preservation
```typescript
// Apply our existing educational prompting
const educationalPrompt = `You are a teacher assistant for K-12 educators. Always:
- Use educational tone with short, scannable sections and emojis when helpful
- If user asks for a worksheet, return a ready-to-use worksheet in Markdown
- Focus on curriculum alignment and pedagogical best practices`;
```

### 3. Chat History Integration
- Use our existing `TeacherChatHistory` tables
- Maintain conversation persistence
- Keep analytics tracking

## Risk Mitigation

### Zero Downtime Strategy
1. **Parallel Development**: V2 runs alongside V1
2. **Feature Flag**: `TEACHER_ASSISTANT_V2=true` to enable
3. **Gradual Rollout**: Test with subset of teachers first
4. **Fallback**: Keep V1 as backup during transition

### Data Safety
1. **Read-Only Initially**: V2 starts with read access to existing data
2. **Separate Tables**: New document storage doesn't affect existing
3. **Backup Strategy**: Full backup before any data migration

### Performance Considerations
1. **Lazy Loading**: Load V2 components only when needed
2. **Code Splitting**: Separate bundles for V1 and V2
3. **Caching**: Leverage SWR for document/chat caching

## Testing Strategy

### 1. Component Testing
- Unit tests for adapted components
- Integration tests for AI SDK + Gemini
- Visual regression tests for UI

### 2. User Acceptance Testing
- Test with 5-10 teachers initially
- Compare V1 vs V2 user experience
- Gather feedback on artifacts feature

### 3. Performance Testing
- Load testing with concurrent users
- Memory usage comparison V1 vs V2
- Streaming performance validation

## Rollout Plan

### Week 1: Foundation
- [ ] Install dependencies
- [ ] Set up V2 structure
- [ ] Create basic chat interface
- [ ] Test Gemini integration

### Week 2: Core Features
- [ ] Implement streaming chat
- [ ] Add message history
- [ ] Copy essential UI components
- [ ] Internal testing

### Week 3: Artifacts
- [ ] Implement text artifacts
- [ ] Document storage integration
- [ ] Worksheet creation tools
- [ ] Teacher testing group

### Week 4: Polish & Launch
- [ ] Bug fixes and optimizations
- [ ] Performance tuning
- [ ] Documentation updates
- [ ] Gradual rollout to all teachers

## Success Metrics

### Technical Metrics
- [ ] Zero downtime during rollout
- [ ] <2s response time for chat messages
- [ ] <1s artifact loading time
- [ ] 99.9% uptime

### User Experience Metrics
- [ ] Teacher satisfaction score >4.5/5
- [ ] Artifact usage >60% of teachers
- [ ] Chat engagement increase >30%
- [ ] Support tickets decrease >20%

## Next Steps

1. **Approve Dependencies**: Confirm AI SDK packages installation
2. **Create V2 Branch**: Start development in isolated branch
3. **Set Up Environment**: Add feature flags and API keys
4. **Begin Phase 1**: Foundation setup and basic structure

This plan ensures we get the superior ai-chatbot-main UX while maintaining our educational focus and system stability.
