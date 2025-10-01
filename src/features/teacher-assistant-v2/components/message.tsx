'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { UIMessage } from 'ai';
import { toast } from 'sonner';

import { BotIcon, UserIcon, LoaderIcon } from './icons';
import { ArtifactPreview } from './artifact-preview';
import { useArtifact } from '../contexts/artifact-context';
import { SearchResults } from './search-results';
import { cn } from '../lib/utils';

interface MessageProps {
  chatId: string;
  message: UIMessage;
  isLoading: boolean;
  setMessages: (messages: UIMessage[]) => void;
  className?: string;
  onRegenerate?: (prompt: string) => void;
  onShareToClassWall?: (content: string) => void;
  previousUserContent?: string;
}

// Sanitize model output to avoid excessive horizontal rulers and separators
function sanitizeResponse(md: string): string {
  // Remove lines that are just long sequences of dashes/underscores
  const withoutLongRules = md.replace(/(^|\n)[ \t]*[-_]{3,}[ \t]*(?=\n|$)/g, '\n');
  // Collapse 2+ consecutive blank lines
  return withoutLongRules.replace(/\n{3,}/g, '\n\n');
}

function PureMessage({
  chatId,
  message,
  isLoading,
  setMessages,
  className,
}: MessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const { artifact } = useArtifact();

  // Extract text content from message parts or content
  const getMessageContent = () => {
    if ('content' in message && typeof message.content === 'string') {
      return message.content;
    }
    // For UIMessage, extract from parts
    const textParts = message.parts?.filter(part => part.type === 'text') || [];
    return textParts.map(part => part.text).join('') || '';
  };

  const contentToRender = sanitizeResponse(getMessageContent());

  // Extract search results if available
  const searchResults = (message as any).searchResults;

  // Artifact preview is now handled at the Messages component level to avoid duplication
  // Individual messages should not show artifact previews
  const shouldShowArtifactPreview = false;

  return (
    <motion.div
      className={cn(
        'flex gap-4 p-4 rounded-lg overflow-hidden',
        isUser && 'ml-8 md:ml-12 bg-primary/5',
        isAssistant && 'mr-8 md:mr-12',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isUser && 'bg-primary text-primary-foreground',
          isAssistant && 'bg-muted'
        )}>
          {isUser ? (
            <UserIcon />
          ) : (
            <BotIcon />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'Teacher Assistant'}
          </span>
          {isLoading && isAssistant && (
            <div className="animate-spin">
              <LoaderIcon size={12} />
            </div>
          )}
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden">
          {typeof contentToRender === 'string' ? (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                // Custom components for better educational formatting
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mb-3 text-primary">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mb-2 text-primary">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium mb-2">{children}</h3>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-4">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-4">{children}</ol>
                ),
                li: ({ children, ...props }) => (
                  <li className="text-sm" {...props}>{children}</li>
                ),
                p: ({ children, ...props }) => (
                  <div className="mb-3 text-sm leading-relaxed" {...props}>{children}</div>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic mb-4 bg-muted/30 py-2 rounded-r">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-4 border-border/40" />,
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono text-foreground">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <pre className="bg-muted/30 border border-border p-4 rounded-lg overflow-x-auto mb-4">
                      <code className="text-xs font-mono text-foreground">{children}</code>
                    </pre>
                  );
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full border border-border rounded-lg bg-background">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 bg-muted/50 font-medium text-left text-xs text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-xs text-foreground bg-background">
                    {children}
                  </td>
                ),
                // Educational emphasis
                strong: ({ children }) => (
                  <strong className="font-semibold text-primary">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-muted-foreground">{children}</em>
                ),
                // Image support with responsive scaling and error handling
                img: ({ src, alt, ...props }) => {
                  const fallback =
                    'data:image/svg+xml;utf8,' +
                    encodeURIComponent(
                      `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"300\"><rect width=\"100%\" height=\"100%\" fill=\"#1E40AF\"/><text x=\"50%\" y=\"50%\" fill=\"#FFFFFF\" font-size=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\">Educational Image</text></svg>`
                    );
                  try {
                    const s = typeof src === 'string' ? src : '';
                    const lower = s.trim().toLowerCase();
                    const valid =
                      s &&
                      !lower.startsWith('placeholder_') &&
                      lower !== 'image_url' &&
                      (lower.startsWith('http://') ||
                        lower.startsWith('https://') ||
                        lower.startsWith('data:') ||
                        lower.startsWith('blob:') ||
                        lower.startsWith('/'));
                    const safeSrc = valid ? s : fallback;
                    return (
                      <span className="block my-4">
                        <img
                          src={safeSrc}
                          alt={(typeof alt === 'string' && alt) || 'Educational content image'}
                          className="max-w-full h-auto rounded-lg border border-border shadow-sm"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallback;
                          }}
                          {...props}
                        />
                        {typeof alt === 'string' && alt && (
                          <span className="block text-xs text-muted-foreground mt-2 text-center italic">
                            {alt}
                          </span>
                        )}
                      </span>
                    );
                  } catch {
                    return (
                      <span className="block my-4">
                        <img
                          src={fallback}
                          alt={(typeof alt === 'string' && alt) || 'Educational content image'}
                          className="max-w-full h-auto rounded-lg border border-border shadow-sm"
                          loading="lazy"
                          {...props}
                        />
                      </span>
                    );
                  }
                },
              }}
            >
              {contentToRender}
            </ReactMarkdown>
          ) : (
            <div className="text-sm text-muted-foreground">
              [Complex message content not supported yet]
            </div>
          )}
        </div>

        {/* Search Results */}
        {isAssistant && searchResults && (searchResults.webResults?.length > 0 || searchResults.imageResults?.length > 0) && (
          <div className="mt-4">
            <SearchResults
              webResults={searchResults.webResults}
              imageResults={searchResults.imageResults}
              query={searchResults.query}
            />
          </div>
        )}

        {/* Artifact Preview */}
        {shouldShowArtifactPreview && (
          <div className="mt-4">
            <ArtifactPreview artifact={artifact} />
          </div>
        )}

        {/* Message actions */}
        {isAssistant && !isLoading && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                try {
                  const text = typeof contentToRender === 'string' ? contentToRender : '';
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard');
                } catch {
                  toast.error('Failed to copy');
                }
              }}
            >
              Copy
            </button>
            {typeof previousUserContent === 'string' && previousUserContent.trim().length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onRegenerate?.(previousUserContent!)}
              >
                Regenerate
              </button>
            )}
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onShareToClassWall?.(typeof contentToRender === 'string' ? contentToRender : '')}
            >
              Share to Class Wall
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const Message = memo(PureMessage, (prevProps, nextProps) => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.isLoading !== nextProps.isLoading) return false;

  // Compare message parts for content changes
  const prevParts = prevProps.message.parts || [];
  const nextParts = nextProps.message.parts || [];

  if (prevParts.length !== nextParts.length) return false;

  for (let i = 0; i < prevParts.length; i++) {
    const prevPart = prevParts[i];
    const nextPart = nextParts[i];

    if (prevPart.type !== nextPart.type) return false;

    if (prevPart.type === 'text' && nextPart.type === 'text') {
      if (prevPart.text !== nextPart.text) return false;
    }
  }

  return true;
});
