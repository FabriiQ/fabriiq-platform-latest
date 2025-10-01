'use client';

import { Message } from './message';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import type { UIMessage } from 'ai';
import type { UIArtifact } from '../lib/types';
import { motion } from 'framer-motion';
import { useScrollToBottom } from '../hooks/use-scroll-to-bottom';

interface ArtifactMessagesProps {
  chatId: string;
  status: 'idle' | 'loading' | 'error';
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  isReadonly: boolean;
  artifactStatus: UIArtifact['status'];
}

function PureArtifactMessages({
  chatId,
  status,
  messages,
  setMessages,
  isReadonly,
}: ArtifactMessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-4 p-4"
    >
      {messages.map((message, index) => (
        <Message
          chatId={chatId}
          key={message.id}
          message={message}
          isLoading={status === 'loading' && index === messages.length - 1}
          setMessages={setMessages}
          className="w-full max-w-none break-words"
        />
      ))}

      {status === 'loading' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm text-muted-foreground">Preparing your content...</span>
            </div>
          </div>
        )}

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

function areEqual(
  prevProps: ArtifactMessagesProps,
  nextProps: ArtifactMessagesProps,
) {
  if (
    prevProps.artifactStatus === 'streaming' &&
    nextProps.artifactStatus === 'streaming'
  )
    return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;

  return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
