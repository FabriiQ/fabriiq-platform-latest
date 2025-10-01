# Teacher Assistant Chat UI/UX Revamp — Porting ai-chatbot-main

This document summarizes how the ai-chatbot-main chat experience works and how we can port its UI/UX (including the Artifact panel and related components) into our Teacher Assistant with our educational context.

## Goals
- Replace the current Teacher Assistant chat UI with an experience equivalent to ai-chatbot-main
- Include the “Artifact” panel pattern (document/image/sheet) and the sticky, responsive chat with attachments
- Keep our educational context, prompts, and role/permissions
- Minimize backend changes by creating a thin adapter that bridges our tRPC streaming to the AI SDK-compatible API used by ai-chatbot-main

---

## What ai-chatbot-main Provides
Key folders/files reviewed:
- components/chat.tsx — Top-level chat controller using @ai-sdk/react useChat + DefaultChatTransport
- components/messages.tsx, components/message.tsx — Virtualized/sticky conversation rendering with support for tool parts and editing
- components/multimodal-input.tsx — Input area with model selector, attachments, submit/stop
- components/artifact.tsx (+ artifact-* files) — Right-side animated panel that shows/edit artifacts with versioning toolbar
- components/data-stream-provider.tsx — Context for UI data stream pieces
- components/elements/* — Conversation shell, prompt input, tool header/content layouts
- lib/ai/* — Model list, prompts, tools; structured tool parts (createDocument/updateDocument/requestSuggestions/getWeather)

Runtime/UX characteristics:
- Streaming via AI SDK (DefaultChatTransport -> /api/chat) and useChat
- Attachments (uploads via /api/files/upload)
- Framer-motion animations, SWR for votes/documents, usehooks-ts, sonner toasts
- Artifact overlay animates from message bounding box to full right side, with a toolbar and version footer

Dependencies to account for: react, next/app router, @ai-sdk/react and ai, swr, framer-motion, usehooks-ts, sonner, next-auth, lucide-react, Tailwind + shadcn-style UI.

---

## Our Current Teacher Assistant (summary)
Main areas reviewed:
- src/features/teacher-assistant/providers/teacher-assistant-provider.tsx — central state; sendMessage calls tRPC teacherAssistantRouter.getAssistantResponse or streamResponse; educational priming; role-gating
- src/app/teacher/assistant/page.tsx and components/* — MessageList, MessageInput, TypingIndicator, SettingsPanel, optional CanvasMode panel
- Message model is simple: id, role, content (markdown), optional image search, no structured “parts” or tool calls

Gaps vs ai-chatbot-main:
- No AI SDK useChat transport; we use tRPC mutations/subscriptions
- No attachments pipeline or Artifact overlay
- Chat UI lacks the refined sticky layout, scroll-to-bottom affordance, message edit/regenerate, tool rendering, and model/visibility control

---

## Porting Strategy (recommended)
We will bring the ai-chatbot-main UI layer as a module and bridge our backend with a thin adapter.

Phases:
1) Shell + Chat: adopt DataStreamProvider, Chat and Messages with our theming; plug into an adapter API that proxies to our tRPC streaming
2) Artifact: bring Artifact overlay and the text artifact first (for worksheets/assessments/documents). Defer code/image/sheet until needed
3) Tools: implement createDocument/updateDocument/requestSuggestions to work with our document store (or a minimal store) and our educational prompt policies
4) Sidebar/history/votes: optional; wire later or stub

Why: isolates risk, keeps our data model/policies, and gets the UI win early.

---

## File/Component Mapping
- New feature root: src/features/teacher-assistant-v2/
  - ui/ChatFrame.tsx — A wrapper that composes DataStreamProvider + Chat (ported)
  - adapters/aiTransport.ts — Adapter exposing a DefaultChatTransport-compatible API that calls our tRPC streamResponse
  - adapters/types.ts — ChatMessage, Attachment, CustomUIDataTypes mapped to our types
  - artifacts/ (ported subset) — text artifact first; wire to our document service or a stub
  - elements/, icons/, ui/ shims — re-export or thin wrappers to integrate with our shadcn components
- API: app/api/chat/route.ts — Single endpoint the DefaultChatTransport will call; it internally calls tRPC teacherAssistantRouter.streamResponse and re-emits chunks in AI SDK format

---

## Backend Adapter Plan
ai-chatbot-main expects:
- POST /api/chat with streaming (Server-Sent Events or fetch streaming) that yields UI data parts and message deltas
- Optional: /api/files/upload and /api/document endpoints for artifact versions

We have:
- tRPC: teacherAssistantRouter.streamResponse(message, classId, courseId, context) — Async generator that yields chunks

Adapter outline:
- In app/api/chat/route.ts, accept body {id, message, selectedChatModel, selectedVisibilityType}
- Call tRPC stream procedure server-side and transform its chunks into AI SDK “data parts” (text delta -> {type:'text-delta'}, tool calls -> map to tool parts). If we do not emit tools initially, we can emit only text parts
- End stream with a final message object

---

## Artifacts in Our Context
- Start with text artifact for worksheets and documents
- Map artifact actions to our document store or (initially) to an in-memory store with server routes:
  - GET /api/document?id=... -> returns versions
  - POST /api/document?id=... -> appends new version
- Later, extend to: code (not needed), image (inline image search results already in our memory requirements), sheet (optional)

Educational tailoring:
- Ensure prompts add our tone/format rules (already in provider). The adapter can prepend the same priming when calling the stream

---

## Styling and Theming
- ai-chatbot-main uses Tailwind + shadcn-like components; our codebase has compatible utilities (Button, Select, Card, Tabs)
- Where the ai components import from ./ui/button or elements/*, either:
  1) copy the minimal element components into src/features/teacher-assistant-v2/elements and wire them to our ui/core components
  2) or refactor imports to our existing components to reduce duplication

---

## Minimal Integration Surface (initial PR)
1) Create new page at src/app/teacher/assistant/v2/page.tsx that renders the new ChatFrame
2) Add app/api/chat/route.ts adapter (no DB or files yet)
3) Port components: DataStreamProvider, Messages, Message, MultimodalInput, Chat (with our adapter), basic icons/elements
4) Keep Artifact disabled behind a feature flag env TEACHER_ASSISTANT_ARTIFACTS=true; ship text artifact in a follow-up

---

## Risks and Constraints
- Streaming shape differences between our tRPC stream and AI SDK expectations — mitigated by adapter
- Attachments pipeline requires /api/files/upload or using our existing storage service
- Artifacts rely on a document store and versioning; we can stub then back it with our DB
- Dependency alignment (framer-motion, swr, usehooks-ts, sonner, ai/@ai-sdk/react)

---

## Work Estimate
- Phase 1 (Chat shell + adapter + basic messages/input): 1–2 days
- Phase 2 (Text artifact + simple versions + toolbar): 1–2 days
- Phase 3 (Tools + uploads + polishing + mobile QA): 2–3 days

---

## Open Questions
1) Do we want votes/history now, or later? Answer we already have teacher chat histry implimenetd we can use that with this
2) Where should documents live (our existing tables vs. new minimal tables)? you can decide whihc more alignes with our system without breaking
3) Attachments: use our storage service or local upload API initially? our storage
4) Should we keep current page at /teacher/assistant or introduce /teacher/assistant/v2 and switch after QA? v2 and later after testing we can replace v1 with v2

---

## Next Steps (proposal)
- Approve this plan and the initial dependency list
- I’ll scaffold src/features/teacher-assistant-v2 with the Chat shell and an /api/chat adapter that streams from tRPC
- After QA, iterate on artifacts and tools

