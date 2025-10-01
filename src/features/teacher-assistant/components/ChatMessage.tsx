'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { cn } from '@/lib/utils';
import { Edit, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/core/button';
import { Textarea } from '@/components/ui/core/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { VoiceService } from '../utils/voice';
import { TeacherAssistantAnalytics, TeacherAssistantEventType } from '../utils/analytics';
import { CopyMenu } from './CopyMenu';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';

// Custom icon components
const ThumbsUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbsDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

const Volume2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const VolumeOff = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);

interface ChatMessageProps {
  message: Message;
  className?: string;
}

/**
 * Component to display a single chat message
 *
 * Features:
 * - Different styling for user and assistant messages
 * - Markdown rendering for assistant messages
 * - Feedback buttons for assistant messages
 * - Copy to clipboard functionality
 * - Edit response functionality for assistant messages
 */
export function ChatMessage({ message, className }: ChatMessageProps) {
  const { sendMessage } = useTeacherAssistant();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const voiceServiceRef = useRef<VoiceService | null>(null);
  const analyticsRef = useRef<TeacherAssistantAnalytics | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isError = message.role === 'error';

  // Initialize voice service
  useEffect(() => {
    voiceServiceRef.current = new VoiceService();
    setIsSpeechSupported(voiceServiceRef.current.isSpeechSynthesisSupported());

    // Initialize analytics
    if (message.metadata?.teacherId) {
      analyticsRef.current = new TeacherAssistantAnalytics(message.metadata.teacherId as string);
    }

    return () => {
      // Clean up voice service
      if (voiceServiceRef.current && isSpeaking) {
        voiceServiceRef.current.stopSpeaking();
      }
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Track copy event
    if (analyticsRef.current) {
      analyticsRef.current.trackEvent(TeacherAssistantEventType.MESSAGE_COPIED, {
        messageId: message.id,
        contentLength: message.content.length
      }).catch(console.error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(message.content);
  };

  const handleSaveEdit = () => {
    // TODO: Implement message editing in the backend
    setIsEditing(false);
    console.log('Saving edited message:', editedContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleRegenerate = async () => {
    // Find the last user message to regenerate response
    // TODO: Implement regenerate functionality
    console.log('Regenerating response for message:', message.id);
  };

  const handleFeedback = (isPositive: boolean) => {
    // TODO: Implement feedback submission to backend
    setFeedbackSubmitted(true);

    // Track feedback event
    if (analyticsRef.current) {
      analyticsRef.current.trackFeedback(
        message.id,
        isPositive
      ).catch(console.error);
    }
  };

  const toggleSpeech = async () => {
    if (!voiceServiceRef.current) return;

    if (isSpeaking) {
      // Stop speaking
      voiceServiceRef.current.stopSpeaking();
      setIsSpeaking(false);
    } else {
      // Start speaking
      setIsSpeaking(true);

      try {
        // Extract plain text from message content (remove markdown)
        const plainText = message.content
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1')     // Remove italic
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Remove links
          .replace(/```([\s\S]*?)```/g, '') // Remove code blocks
          .replace(/`(.*?)`/g, '$1')       // Remove inline code
          .replace(/#{1,6}\s(.*?)(\n|$)/g, '$1$2'); // Remove headings

        await voiceServiceRef.current.speak(plainText, {
          rate: 1.0,
          pitch: 1.0
        });
      } catch (error) {
        console.error('Speech synthesis error:', error);
      } finally {
        setIsSpeaking(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col",
        isUser ? "items-end" : "items-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2",
          isUser && "bg-primary text-primary-foreground",
          isAssistant && "bg-muted",
          isSystem && "bg-secondary text-secondary-foreground text-sm italic",
          isError && "bg-destructive text-destructive-foreground"
        )}
      >
        {isAssistant ? (
          isEditing ? (
            <div className="w-full">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px] mb-2"
                placeholder="Edit the response..."
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                // Enhanced headings with emojis
                h1: ({ children, ...props }) => (
                  <h1 className="text-xl font-bold text-primary mb-3 flex items-center gap-2" {...props}>
                    📚 {children}
                  </h1>
                ),
                h2: ({ children, ...props }) => (
                  <h2 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2" {...props}>
                    ✨ {children}
                  </h2>
                ),
                h3: ({ children, ...props }) => (
                  <h3 className="text-base font-medium text-primary mb-2 flex items-center gap-2" {...props}>
                    🎯 {children}
                  </h3>
                ),
                // Enhanced paragraphs with better spacing
                p: ({ children, ...props }) => (
                  <p className="mb-3 leading-relaxed" {...props}>
                    {children}
                  </p>
                ),
                // Interactive lists with emojis
                ul: ({ children, ...props }) => (
                  <ul className="mb-3 space-y-1" {...props}>
                    {children}
                  </ul>
                ),
                li: ({ children, ...props }) => (
                  <li className="flex items-start gap-2" {...props}>
                    <span className="text-primary mt-1">•</span>
                    <span>{children}</span>
                  </li>
                ),
                // Enhanced blockquotes for stories
                blockquote: ({ children, ...props }) => (
                  <blockquote className="border-l-4 border-primary bg-primary/5 pl-4 py-2 my-3 italic" {...props}>
                    {children}
                  </blockquote>
                ),
                // Custom styling for code blocks
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <code className={cn("bg-muted px-2 py-1 rounded text-sm font-mono", className)} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                // Enhanced links
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    className="text-primary hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  >
                    🔗 {children}
                  </a>
                ),
                // Enhanced tables for worksheets
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border border-border rounded-lg" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="border border-border bg-muted px-3 py-2 text-left font-semibold" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td className="border border-border px-3 py-2" {...props}>
                    {children}
                  </td>
                ),
                // Story sections with special styling
                strong: ({ children, ...props }) => (
                  <strong className="font-semibold text-primary" {...props}>
                    {children}
                  </strong>
                ),
                em: ({ children, ...props }) => (
                  <em className="italic text-muted-foreground" {...props}>
                    {children}
                  </em>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          )
        ) : (
          <p className="leading-relaxed">{message.content}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground mt-1 px-1">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>

      {/* Action buttons for assistant messages */}
      {isAssistant && !isEditing && (
        <div className="flex items-center space-x-1 mt-2">
          {/* Primary action buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleEdit}
              aria-label="Edit response"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleRegenerate}
              aria-label="Regenerate response"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
            <CopyMenu
              content={message.content}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
            />
          </div>

          {/* Secondary action buttons */}
          <div className="flex items-center space-x-1 ml-2">
            {/* Text-to-speech button */}
            {isSpeechSupported && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0",
                  isSpeaking && "text-primary"
                )}
                onClick={toggleSpeech}
                aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
              >
                {isSpeaking ? (
                  <VolumeOff className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
            )}

            {/* Feedback buttons */}
            {!feedbackSubmitted ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleFeedback(true)}
                  aria-label="Helpful"
                >
                  <ThumbsUpIcon className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleFeedback(false)}
                  aria-label="Not helpful"
                >
                  <ThumbsDownIcon className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Thanks for your feedback!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
