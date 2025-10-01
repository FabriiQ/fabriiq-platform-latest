'use client';

import { useRef, useEffect, useState } from 'react';
import { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { AnalyticsService } from '../utils/analytics';
import { cn } from '@/lib/utils';
import { useStudentAssistant } from '../hooks/use-student-assistant';

interface MessageListProps {
  messages: Message[];
  className?: string;
  analyticsService?: AnalyticsService;
}

/**
 * MessageList component
 *
 * Displays a list of chat messages with automatic scrolling
 *
 * @param props Component props
 * @returns JSX element
 */
export function MessageList({ messages, className, analyticsService }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const { currentStreamingMessageId } = useStudentAssistant();

  // Check if user is manually scrolling
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsUserScrolling(!isAtBottom);
    }
  };

  // Auto-scroll to bottom when new messages are added (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolling && messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      });
    }
  }, [messages, isUserScrolling]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-y-auto overflow-x-hidden", className)}
      onScroll={handleScroll}
    >
      <div className="p-4 space-y-4 min-h-full flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <p>How can I help you with your learning today?</p>
              <p className="text-sm mt-2">Ask me a question about your coursework, or for help navigating the platform.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                analyticsService={analyticsService}
                isStreaming={message.id === currentStreamingMessageId && message.content === ''}
              />
            ))}
            <div ref={messagesEndRef} className="h-1 flex-shrink-0" />
          </>
        )}
      </div>
    </div>
  );
}
