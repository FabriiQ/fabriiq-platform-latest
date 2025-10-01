'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/core/button';
import { Textarea } from '@/components/ui/core/textarea';
import { cn } from '@/lib/utils';
// Using minimal icons to ensure compatibility across lucide-react versions
import { Eye, Edit, Download, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface CanvasEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Canvas Editor component with markdown support and real-time preview
 * 
 * Features:
 * - Split view with editor and preview
 * - Markdown toolbar with common formatting options
 * - Real-time markdown rendering
 * - Copy and download functionality
 */
export function CanvasEditor({ content, onChange, className, placeholder }: CanvasEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert markdown at cursor position
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    onChange(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // Toolbar actions
  const formatActions = [
    { icon: () => <span className="font-bold">B</span>, label: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: () => <span className="italic">I</span>, label: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: () => <span className="font-semibold">H1</span>, label: 'Heading 1', action: () => insertMarkdown('# ') },
    { icon: () => <span className="font-semibold">H2</span>, label: 'Heading 2', action: () => insertMarkdown('## ') },
    { icon: () => <span className="font-semibold">H3</span>, label: 'Heading 3', action: () => insertMarkdown('### ') },
    { icon: () => <span>•</span>, label: 'Bullet List', action: () => insertMarkdown('- ') },
    { icon: () => <span>1.</span>, label: 'Numbered List', action: () => insertMarkdown('1. ') },
    { icon: () => <span>“”</span>, label: 'Quote', action: () => insertMarkdown('> ') },
    { icon: () => <span>{'{ }'}</span>, label: 'Code', action: () => insertMarkdown('`', '`') },
    { icon: () => <span className="underline">Link</span>, label: 'Link', action: () => insertMarkdown('[', '](url)') },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border rounded-lg", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center space-x-1">
          {formatActions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={action.action}
              title={action.label}
            >
              <span className="h-4 w-4 flex items-center justify-center text-xs"><action.icon /></span>
            </Button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
          >
            <Copy className="h-4 w-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            variant={isPreviewMode ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="h-8 px-2"
          >
            {isPreviewMode ? (
              <>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {isPreviewMode ? (
          /* Preview Mode */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2" {...props}>
                      📚 {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="text-xl font-semibold text-primary mb-3 flex items-center gap-2" {...props}>
                      ✨ {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="text-lg font-medium text-primary mb-2 flex items-center gap-2" {...props}>
                      🎯 {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="mb-4 leading-relaxed" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="mb-4 space-y-2" {...props}>
                      {children}
                    </ul>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="flex items-start gap-2" {...props}>
                      <span className="text-primary mt-1">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote className="border-l-4 border-primary bg-primary/5 pl-4 py-2 my-4 italic" {...props}>
                      {children}
                    </blockquote>
                  ),
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
                }}
              >
                {content || '*Start typing to see your content here...*'}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="flex-1 p-4">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Start writing your content here...\n\nYou can use markdown formatting:\n- **bold text**\n- *italic text*\n- # Headings\n- - Lists\n- > Quotes\n- `code`"}
              className="w-full h-full resize-none border-0 focus:ring-0 text-sm font-mono leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
