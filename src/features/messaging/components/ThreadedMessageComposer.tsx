'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Smile,
  X,
  AtSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { toast } from 'sonner';

interface ThreadedMessageComposerProps {
  conversationId: string;
  parentMessageId?: string; // For replies
  onMessageSent?: () => void;
  onCancel?: () => void; // For reply mode
  placeholder?: string;
  className?: string;
}

export const ThreadedMessageComposer: React.FC<ThreadedMessageComposerProps> = ({
  conversationId,
  parentMessageId,
  onMessageSent,
  onCancel,
  placeholder = "Type your message...",
  className
}) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Send message mutation
  const utils = api.useUtils();
  const sendMessageMutation = api.messaging.sendMessage.useMutation({
    onSuccess: async () => {
      setContent('');
      setMentions([]);

      // Invalidate and refetch conversation messages
      await utils.messaging.getThreadedMessages.invalidate({ conversationId });
      await utils.messaging.getConversations.invalidate();

      onMessageSent?.();
      toast.success('Message sent!');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  // Get conversation participants for mentions
  const { data: conversation } = api.messaging.getConversation.useQuery({
    conversationId
  });

  const handleSend = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        conversationId,
        content: content.trim(),
        parentMessageId,
        mentions,
        messageType: 'text'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };



  const handleMention = () => {
    // TODO: Implement mention picker
    console.log('Open mention picker');
  };

  const handleEmoji = () => {
    // TODO: Implement emoji picker
    console.log('Open emoji picker');
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const isReplyMode = !!parentMessageId;

  return (
    <div className={cn(
      "border-t border-border/50 bg-gradient-to-r from-background to-background/95 p-4",
      isReplyMode && "border border-accent/30 rounded-xl m-3 p-4 bg-gradient-to-br from-accent/5 to-accent/10 shadow-sm",
      className
    )}>
      {/* Reply indicator */}
      {isReplyMode && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-accent/20">
          <div className="flex items-center gap-2 text-sm text-foreground/80">
            <div className="w-1 h-4 bg-accent rounded-full"></div>
            <span className="font-medium">Replying to message</span>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 w-7 p-0 rounded-full hover:bg-accent/20 transition-all hover:scale-105"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}



      {/* Message input */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="min-h-[44px] max-h-32 resize-none border-border/50 focus:border-primary/50 bg-background/50 focus:bg-background transition-all duration-200 rounded-xl"
            disabled={sendMessageMutation.isLoading}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEmoji}
            className="h-9 w-9 p-0 rounded-full hover:bg-accent/20 transition-all duration-200 hover:scale-105"
            disabled={sendMessageMutation.isLoading}
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Mention button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMention}
            className="h-9 w-9 p-0 rounded-full hover:bg-accent/20 transition-all duration-200 hover:scale-105"
            disabled={sendMessageMutation.isLoading}
            title="Mention someone"
          >
            <AtSign className="h-4 w-4" />
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!content.trim() || sendMessageMutation.isLoading}
            size="sm"
            className="h-9 w-9 p-0 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Character count */}
      {content.length > 0 && (
        <div className="flex justify-end mt-2">
          <span className={cn(
            "text-xs transition-colors",
            content.length > 1800 ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {content.length}/2000
          </span>
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="text-xs text-primary flex items-center gap-2 mt-2">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="font-medium">Typing...</span>
        </div>
      )}
    </div>
  );
};

// Alias for backward compatibility
export const EnhancedMessageComposer = ThreadedMessageComposer;
