'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import equal from 'fast-deep-equal';
import type { UIMessage } from 'ai';

import { Message } from './message';
import { useScrollToBottom } from '../hooks/use-scroll-to-bottom';
import { useDataStream } from './data-stream-provider';
import { cn } from '../lib/utils';
import type { ChatMessage } from '../lib/types';
import { TypingIndicator, SkeletonMessage } from './enhanced-loading-states';
import { ArtifactPreview } from './artifact-preview';
import { useArtifact } from '../contexts/artifact-context';

interface MessagesProps {
  chatId: string;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  isLoading: boolean;
  userName?: string;
  className?: string;
  onRegenerate?: (prompt: string) => void;
  onShareToClassWall?: (content: string) => void;
}

function PureMessages({
  chatId,
  messages,
  setMessages,
  isLoading,
  userName,
  className,
  onRegenerate,
  onShareToClassWall,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  const { artifact } = useArtifact();
  useDataStream();

  return (
    <div
      ref={messagesContainerRef}
      className={cn("h-full overflow-y-auto overflow-x-hidden", className)}
    >
      <div className="flex flex-col min-w-0 gap-6 pt-4 pb-4 px-4 max-w-4xl mx-auto min-h-full">
        <div className="flex flex-col gap-6 flex-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🎓</span>
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Welcome to your Teacher Assistant{userName ? `, ${userName}` : ''}!
              </h2>
              <p className="text-muted-foreground max-w-md mb-6">
                I'm here to help you create worksheets, lesson plans, assessments, and answer any educational questions you have.
              </p>
              <div className="text-sm text-muted-foreground">
                Try asking me to create a worksheet, lesson plan, or assessment for your class.
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const getPrevUserContent = () => {
              for (let i = index - 1; i >= 0; i--) {
                const m = messages[i] as any;
                if (m.role === 'user') {
                  if (typeof m.content === 'string') return m.content;
                  const parts = Array.isArray(m.parts) ? m.parts : [];
                  const text = parts.filter((p: any) => p?.type === 'text').map((p: any) => p.text || '').join('');
                  return text;
                }
              }
              return '';
            };
            return (
              <Message
                key={message.id}
                chatId={chatId}
                message={message}
                isLoading={isLoading && messages.length - 1 === index}
                setMessages={setMessages}
                className="w-full max-w-none break-words"
                onRegenerate={onRegenerate}
                onShareToClassWall={onShareToClassWall}
                previousUserContent={getPrevUserContent()}
              />
            );
          })}

          {/* Show artifact preview when artifact exists but is not visible and has actual content */}
          {artifact.documentId !== 'init' &&
           !artifact.isVisible &&
           artifact.title &&
           artifact.content &&
           artifact.content.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              <ArtifactPreview artifact={artifact} />
            </motion.div>
          )}

          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex flex-col gap-1">
                <TypingIndicator message="Analyzing your request..." />
                <div className="text-xs text-muted-foreground">
                  Searching for relevant content and preparing response...
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            ref={messagesEndRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
            onViewportEnter={onViewportEnter}
            onViewportLeave={onViewportLeave}
          />
        </div>
      </div>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.chatId !== nextProps.chatId) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;

  return true;
});
