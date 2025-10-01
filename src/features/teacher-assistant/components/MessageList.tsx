'use client';

import { useEffect, useRef, useState } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { ChatMessage } from './ChatMessage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/core/button';
import { ArrowDown } from 'lucide-react';

interface MessageListProps {
  className?: string;
}

/**
 * Component to display a list of chat messages
 *
 * Features:
 * - Automatic scrolling to the latest message
 * - Optimized rendering for large message lists
 * - Scroll to bottom button when not at bottom
 * - Better spacing and layout
 */
export function MessageList({ className }: MessageListProps) {
  const { messages } = useTeacherAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Check if user is near bottom
  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
      setIsUserScrolling(!isNearBottom);
    }
  };

  // Scroll to bottom when messages change (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUserScrolling]);

  // Handle scroll to bottom button
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsUserScrolling(false);
  };

  return (
    <div className={cn("relative flex h-full min-h-0", className)}>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0"
        onScroll={checkScrollPosition}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium mb-2">Welcome to Teacher Assistant</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                I'm here to help you with lesson planning, creating worksheets, assessments,
                and answering questions about teaching and student management.
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                Try asking me to create a worksheet, plan a lesson, or help with curriculum alignment.
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message.id} className={cn(
                "transition-all duration-200",
                index === messages.length - 1 && "animate-in slide-in-from-bottom-2"
              )}>
                <ChatMessage message={message} />
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
