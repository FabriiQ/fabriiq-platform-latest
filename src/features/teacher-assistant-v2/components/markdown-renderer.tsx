'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-foreground leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-3">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground">{children}</em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            const fallback =
              'data:image/svg+xml;utf8,' +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#1E40AF"/><text x="50%" y="50%" fill="#FFFFFF" font-size="18" text-anchor="middle" dominant-baseline="middle">Educational Image</text></svg>`
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
                <img
                  src={safeSrc}
                  alt={typeof alt === 'string' ? alt : 'Educational content image'}
                  className="max-w-full h-auto rounded-lg mb-3"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallback;
                  }}
                />
              );
            } catch {
              return (
                <img
                  src={fallback}
                  alt={typeof alt === 'string' ? alt : 'Educational content image'}
                  className="max-w-full h-auto rounded-lg mb-3"
                />
              );
            }
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
