'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ConversationHistory } from './conversation-history';

import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { DataStreamProvider } from './data-stream-provider';

import { ModeSelector, type TeacherMode } from './mode-selector';
import { Artifact } from './artifact';
import { useArtifact, ArtifactProvider } from '../contexts/artifact-context';
import { MarkdownRenderer } from './markdown-renderer';
import { DocumentPreview } from './document-preview';
import { api } from '@/utils/api';
import type { ChatMessage, Attachment, TeacherContext } from '../lib/types';
import type { ContextData } from './enhanced-context-selector';

// Define streaming data types
interface ArtifactCompleteData {
  title: string;
  content: string;
  kind: 'text';
  documentId: string;
  shouldCreateArtifact: boolean;
  conversationalResponse: string;
  searchResults?: {
    webResults?: any[];
    imageResults?: any[];
    query?: string;
  };
}

interface TextCompleteData {
  content: string;
  shouldCreateArtifact: boolean;
  searchResults?: {
    webResults?: any[];
    imageResults?: any[];
    query?: string;
  };
}

interface StreamingData {
  type: 'artifact-complete' | 'text-complete' | 'error';
  data: ArtifactCompleteData | TextCompleteData | string;
}
import { generateUUID } from '../lib/utils';

// Helper function to extract title from content
function extractTitleFromContent(content: string): string {
  // Clean the content
  const cleanContent = content.trim();

  // Look for specific educational patterns
  const patterns = [
    // Worksheet patterns
    /(?:create|make|generate).*?worksheet.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /worksheet.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Lesson patterns
    /(?:create|make|generate).*?lesson.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /lesson.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Activity patterns
    /(?:create|make|generate).*?activity.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /activity.*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // Assessment patterns
    /(?:create|make|generate).*?(?:assessment|quiz|test).*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,
    /(?:assessment|quiz|test).*?(?:on|about|for)\s+(.+?)(?:\.|$|for|with)/i,

    // General topic patterns
    /(?:help|teach|explain|about)\s+(.+?)(?:\.|$|for|with)/i,
    /(?:on|about)\s+(.+?)(?:\s+for|\s+worksheet|\s+lesson|\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanContent.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();

      // Clean up the title
      title = title.replace(/\s+/g, ' '); // Remove extra spaces
      title = title.replace(/[^\w\s-]/g, ''); // Remove special chars except hyphens

      if (title.length > 3 && title.length < 60) {
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
    }
  }

  // Fallback: use first meaningful words
  const words = cleanContent.split(' ').filter(word => word.length > 2).slice(0, 5);
  if (words.length > 0) {
    const title = words.join(' ');
    if (title.length > 5 && title.length < 60) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  return 'New Conversation';
}

interface ChatProps {
  id: string;
  initialMessages?: ChatMessage[];
  teacherContext: TeacherContext;
  className?: string;
}

function ChatContent({ id, initialMessages = [], teacherContext, className }: ChatProps) {
  const { data: session } = useSession();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TeacherMode | null>(null);
  const { artifact, setArtifact, resetArtifact } = useArtifact();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [isActivelyMessaging, setIsActivelyMessaging] = useState(false);



  // Helper function to extract title from content
  const extractTitleFromContent = (content: string): string => {
    const lines = content.split('\n');
    const firstLine = lines[0]?.replace(/^#+\s*/, '').trim();
    return firstLine || 'Educational Document';
  };

  // State for current streaming message
  const [currentStreamMessage, setCurrentStreamMessage] = useState('');

  // tRPC mutations for conversation management (moved up to fix declaration order)
  const createConversation = api.teacherAssistantV2.createConversation.useMutation();
  const saveMessage = api.teacherAssistantV2.saveMessage.useMutation();

  const sharePost = api.socialWall.createPost.useMutation();

  // Don't auto-create conversation on mount - only create when user sends first message

  // Conversation management functions
  const handleNewConversation = async () => {
    try {
      const result = await createConversation.mutateAsync({
        title: 'New Conversation',
      });
      setCurrentConversationId(result.conversationId);
      setMessages([]);
      resetArtifact();
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleConversationSelect = useCallback(async (conversationId: string) => {
    try {
      // Clear current messages first to avoid mixing conversations
      setMessages([]);
      resetArtifact();
      setCurrentConversationId(conversationId);
      // Messages will be loaded by the query automatically
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error('Failed to load conversation');
    }
  }, [resetArtifact]);

  // tRPC mutations for conversation management (declarations moved up)
  const { data: conversationMessages } = api.teacherAssistantV2.getConversationMessages.useQuery(
    { conversationId: currentConversationId! },
    {
      enabled: !!currentConversationId,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch automatically
    }
  );

  // Load conversation messages when conversation changes (but not during active messaging)
  // Also restore last artifact preview (document) from saved message metadata if present
  useEffect(() => {
    if (conversationMessages?.messages && !isActivelyMessaging && !isLoading) {
      console.log('Loading conversation messages:', conversationMessages.messages.length);

      // Restore artifact/document preview from message metadata if available
      try {
        const lastWithArtifact = [...conversationMessages.messages]
          .reverse()
          .find((m: any) => m.role === 'assistant' && m.metadata && m.metadata.artifact);
        if (lastWithArtifact && artifact.status !== 'streaming') {
          const art = (lastWithArtifact as any).metadata.artifact;
          if (art && (artifact.documentId !== art.documentId || artifact.content !== art.content)) {
            setArtifact(prev => ({
              ...prev,
              title: art.title || prev.title,
              documentId: art.documentId || prev.documentId,
              kind: art.kind || prev.kind,
              content: art.content || prev.content,
              status: 'idle',
              isVisible: true, // Show artifact when restoring from history
            }));
          }
        }
      } catch (e) {
        console.warn('Failed to restore artifact from history metadata', e);
      }

      const loadedMessages: ChatMessage[] = conversationMessages.messages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        createdAt: msg.createdAt,
      }));

      // Only set messages if they're different to avoid unnecessary re-renders
      setMessages(prev => {
        // If no previous messages, set the loaded messages
        if (prev.length === 0 && loadedMessages.length > 0) {
          console.log('Setting initial messages from conversation');
          return loadedMessages;
        }

        // If lengths are different, update
        if (prev.length !== loadedMessages.length) {
          console.log('Message count changed, updating messages');
          return loadedMessages;
        }

        // Check if messages are actually different
        const isDifferent = prev.some((msg, index) =>
          msg.id !== loadedMessages[index]?.id ||
          msg.content !== loadedMessages[index]?.content
        );

        if (isDifferent) {
          console.log('Messages content changed, updating messages');
          return loadedMessages;
        }

        return prev;
      });
    }
  }, [conversationMessages, isActivelyMessaging, isLoading, artifact.status, artifact.documentId, artifact.content, setArtifact]);

  const saveMessageToConversation = async (role: 'user' | 'assistant', content: string) => {
    if (!currentConversationId) {
      console.warn('Cannot save message: no current conversation ID');
      return;
    }

    try {
      console.log('Saving message to conversation:', { role, conversationId: currentConversationId });
      await saveMessage.mutateAsync({
        conversationId: currentConversationId,
        role,
        content,
      });
      console.log('Message saved successfully');
    } catch (error) {
      console.error('Failed to save message:', error);
      // Don't show error to user as this is background operation
    }
  };

  // Streaming response handler
  const handleStreamingResponse = async (
    message: string,
    teacherContext: TeacherContext,
    searchEnabled: boolean,
    serverContext: any,
    conversationId: string | null
  ) => {
    try {
      const response = await fetch('/api/teacher-assistant/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          teacherContext,
          searchEnabled,
          context: serverContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentAssistantMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text-delta') {
                // Regular chat streaming
                if (!currentAssistantMessage) {
                  currentAssistantMessage = {
                    id: generateUUID(),
                    role: 'assistant',
                    content: '',
                    createdAt: new Date(),
                  };
                  setMessages(prev => [...prev, currentAssistantMessage!]);
                }

                const textDelta = data.textDelta || data.text || '';
                currentAssistantMessage.content += textDelta;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === currentAssistantMessage!.id
                      ? { ...msg, content: currentAssistantMessage!.content }
                      : msg
                  )
                );
              } else if (data.type === 'data-textDelta') {
                // Artifact content streaming
                console.log('Streaming artifact content:', data.data);
                setArtifact(prev => ({
                  ...prev,
                  content: (prev.content || '') + data.data,
                  status: 'streaming' as const,
                  isVisible: true,
                }));
              } else if (data.type === 'data-artifactComplete') {
                // Artifact completion - only set if shouldCreateArtifact is true
                console.log('Artifact complete:', data.data);
                const artifactData = data.data;
                if (artifactData.shouldCreateArtifact) {
                  setArtifact(prev => ({
                    ...prev,
                    kind: artifactData.kind,
                    title: artifactData.title,
                    documentId: artifactData.documentId,
                    content: artifactData.content,
                    status: 'idle' as const,
                    isVisible: true,
                  }));
                }

                // Add conversational response
                const assistantMessage: ChatMessage = {
                  id: generateUUID(),
                  role: 'assistant',
                  content: artifactData.conversationalResponse,
                  createdAt: new Date(),
                  searchResults: artifactData.searchResults,
                };
                setMessages(prev => [...prev, assistantMessage]);

                // Save assistant message directly using conversation ID
                if (conversationId) {
                  try {
                    await saveMessage.mutateAsync({
                      conversationId,
                      role: 'assistant',
                      content: artifactData.conversationalResponse,
                      metadata: {
                        artifact: {
                          documentId: artifactData.documentId,
                          title: artifactData.title,
                          kind: artifactData.kind,
                          content: artifactData.content,
                        },
                      },
                    });
                  } catch (error) {
                    console.error('Failed to save assistant message:', error);
                  }
                }
              } else if (data.type === 'data-textComplete') {
                // Regular text completion
                const textData = data.data;
                if (currentAssistantMessage) {
                  currentAssistantMessage.searchResults = textData.searchResults;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === currentAssistantMessage!.id
                        ? { ...msg, searchResults: textData.searchResults }
                        : msg
                    )
                  );
                  // Save assistant message directly using conversation ID
                  if (conversationId && currentAssistantMessage.content) {
                    try {
                      await saveMessage.mutateAsync({
                        conversationId,
                        role: 'assistant',
                        content: currentAssistantMessage.content,
                      });
                      // Mark as saved to avoid duplicate saves
                      (currentAssistantMessage as any).saved = true;
                    } catch (error) {
                      console.error('Failed to save assistant message:', error);
                    }
                  }
                }
              } else if (data.type === 'stream-complete') {
                // Stream completion signal - ensure everything is finalized
                console.log('Stream completed');
                if (artifact.status === 'streaming') {
                  setArtifact(prev => ({ ...prev, status: 'idle' }));
                }
                setIsLoading(false);
                setIsActivelyMessaging(false);
                break; // Exit the streaming loop
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }

      // If we have a current assistant message but no completion data was sent, save it
      if (currentAssistantMessage && currentAssistantMessage.content && conversationId && !(currentAssistantMessage as any).saved) {
        try {
          await saveMessage.mutateAsync({
            conversationId,
            role: 'assistant',
            content: currentAssistantMessage.content,
          });
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Ensure artifact is properly completed if it was streaming
      if (artifact.status === 'streaming') {
        setArtifact(prev => ({ ...prev, status: 'idle' }));
      }

      console.log('Streaming completed successfully');

      setIsLoading(false);
      setIsActivelyMessaging(false);
    } catch (error) {
      console.error('Streaming error:', error);
      toast.error('Failed to send message. Please try again.');

      // Reset artifact state if it was streaming
      if (artifact.status === 'streaming') {
        setArtifact(prev => ({ ...prev, status: 'idle' }));
      }

      setIsLoading(false);
      setIsActivelyMessaging(false);
    }
  };

  const sendMessage = async (content: string, searchEnabled = true, context?: ContextData) => {
    console.log('sendMessage called with:', { content, searchEnabled, context });

    if (!session?.user) {
      toast.error('Please sign in to use the Teacher Assistant');
      return;
    }

    if (!content.trim() && attachments.length === 0) {
      return;
    }

    // Transform ContextData to server expected format
    const serverContext = context ? {
      class: 'General', // Default value since we don't have class selection yet
      subject: context.subjectName || 'General',
      topic: context.topicNames.join(', ') || 'General',
      learningOutcomes: context.learningOutcomes.join(', ') || '',
      assessmentCriteria: context.assessmentCriteria.join(', ') || '',
      gradeLevel: context.gradeLevel || 'General',
    } : undefined;

    // Check if this is a content generation request
    const isContentGeneration = /\b(create|generate|make|build|design|develop|worksheet|lesson plan|assessment|quiz|test|handout|activity|exercise|assignment|rubric|curriculum|syllabus|outline|template|format)\b/i.test(content);

    // If it's not content generation and we have a story/narrative request, reset artifact
    const isNarrativeRequest = /\b(story|tale|narrative|fiction|novel|chapter|character|plot|adventure|fairy tale|fable)\b/i.test(content);
    if (!isContentGeneration || isNarrativeRequest) {
      resetArtifact();
    }

    // Enhance content with selected mode if available
    let enhancedContent = content;
    if (selectedMode) {
      enhancedContent = `${selectedMode.prompt}\n\nUser Request: ${content}`;
    }

    // Create conversation if none exists and get the conversation ID to use
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const result = await createConversation.mutateAsync({
          title: extractTitleFromContent(content),
        });
        conversationId = result.conversationId;
        setCurrentConversationId(conversationId);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        toast.error('Failed to create conversation');
        return;
      }
    }

    // Add user message to messages (show original content to user)
    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsActivelyMessaging(true);

    // Save user message to conversation using the correct conversation ID
    if (conversationId) {
      try {
        await saveMessage.mutateAsync({
          conversationId,
          role: 'user',
          content,
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
        // Don't stop the flow, just log the error
      }
    }

    // Use the new streaming handler (send enhanced content to AI)
    await handleStreamingResponse(enhancedContent, teacherContext, searchEnabled, serverContext, conversationId || null);
  };

  const stop = () => {
    setIsLoading(false);
    setIsActivelyMessaging(false);
  };



  const status: 'idle' | 'loading' | 'error' = isLoading ? 'loading' : 'idle';

  // Convert ChatMessage to UIMessage for artifact components
  const convertToUIMessages = (chatMessages: ChatMessage[]): any[] => {
    return chatMessages.map(msg => ({
      ...msg,
      parts: msg.parts || [],
    }));
  };

  const convertedMessages = convertToUIMessages(messages);

  const handleShareToClassWall = useCallback(async (content: string) => {
    try {
      const classId = teacherContext?.currentClass?.id;
      if (!classId) {
        toast.error('Please select a class to share to the class wall');
        return;
      }
      await sharePost.mutateAsync({
        classId,
        content,
        contentType: 'TEXT',
        postType: 'REGULAR',
      } as any);
      toast.success('Shared to class wall');
    } catch (err) {
      console.error('Failed to share to class wall', err);
      toast.error('Failed to share to class wall');
    }
  }, [teacherContext?.currentClass?.id, sharePost]);

  return (
    <DataStreamProvider>
      <div className={`flex h-full min-h-0 overflow-hidden ${className || ''}`}>
        {/* Conversation History Sidebar - Re-enabled */}
        {showHistory && (
          <div className="flex-shrink-0 h-full">
            <ConversationHistory
              currentConversationId={currentConversationId}
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              className="h-full"
              collapsed={false}
              onToggleCollapse={() => setShowHistory(false)}
            />
          </div>
        )}

        {/* Main Chat Area - Responsive layout based on artifact visibility */}
        <div className={`flex flex-col h-full transition-all duration-300 ${
          artifact.isVisible
            ? 'w-full md:w-[50%] lg:w-[45%] xl:w-[40%] flex-shrink-0 min-w-[320px]'
            : 'flex-1'
        }`}>
          {/* Messages area - Sticky scrollable container */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Messages
              chatId={id}
              messages={convertedMessages}
              setMessages={(msgs: any[]) => setMessages(msgs as ChatMessage[])}
              isLoading={isLoading}
              userName={session?.user?.name || undefined}
              onRegenerate={(prompt) => sendMessage(prompt)}
              onShareToClassWall={handleShareToClassWall}
            />
          </div>

          {/* Input area - Sticky at bottom */}
          <div className="flex-shrink-0 border-t border-border bg-background">
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={convertedMessages}
              sendMessage={sendMessage}
              selectedMode={selectedMode}
              onModeChange={setSelectedMode}
              onToggleHistory={() => setShowHistory(!showHistory)}
            />
          </div>
        </div>

        {/* Document Preview Area - Side by side when artifact is visible */}
        {artifact.isVisible && (
          <DocumentPreview
            artifact={artifact}
            onClose={() => setArtifact(prev => ({ ...prev, isVisible: false }))}
          />
        )}
      </div>

      {/* Full-screen artifact overlay for mobile */}
      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={convertedMessages}
        setMessages={(msgs: any[]) => setMessages(msgs as ChatMessage[])}
        sendMessage={sendMessage}
        isReadonly={false}
      />
    </DataStreamProvider>
  );
}

export function Chat(props: ChatProps) {
  return (
    <ArtifactProvider>
      <ChatContent {...props} />
    </ArtifactProvider>
  );
}
