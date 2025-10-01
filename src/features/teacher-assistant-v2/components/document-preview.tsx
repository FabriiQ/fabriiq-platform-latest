'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { X, Edit, Eye, Download, Copy, ChevronDown } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useArtifact } from '../contexts/artifact-context';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import type { UIArtifact } from '../lib/types';
import { exportToPDF, exportToWord, exportElementToPDF, exportElementToWord } from '../utils/document-export';

interface DocumentPreviewProps {
  artifact: UIArtifact;
  onClose: () => void;
}

// Normalize content coming from the model that may be wrapped in ```markdown fences
function unwrapMarkdownCodeFences(input: string): string {
  if (!input) return '';
  let out = input.trim();
  // Remove starting fence like ```markdown or ```
  out = out.replace(/^```(?:markdown|md)?\s*/i, '');
  // Remove trailing fence ``` (allow trailing whitespace)
  out = out.replace(/\s*```\s*$/i, '');
  return out;
}

// Convert markdown to HTML for rich text editor
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // Basic markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')

    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Lists
    .replace(/^\* (.+$)/gm, '<li>$1</li>')
    .replace(/^- (.+$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+$)/gm, '<li>$1</li>')

    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // Wrap in paragraphs if not already wrapped
  if (!html.startsWith('<') && html.trim()) {
    html = `<p>${html}</p>`;
  }

  return html;
}

// Convert HTML back to markdown for storage
function htmlToMarkdown(html: string): string {
  if (!html) return '';

  // Basic HTML to markdown conversion
  let markdown = html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

    // Lists
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`);
    })

    // Code blocks
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

    // Paragraphs and line breaks
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br[^>]*>/gi, '\n')

    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')

    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return markdown;
}

export function DocumentPreview({ artifact, onClose }: DocumentPreviewProps) {
  const { isEditing, setIsEditing, updateArtifact } = useArtifact();
  const [localContent, setLocalContent] = useState(artifact.content || '');
  const [editorContent, setEditorContent] = useState(''); // HTML content for editor
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // tRPC mutation for saving documents
  const saveDocumentMutation = api.teacherAssistantV2.saveDocument.useMutation();

  // tRPC query for fetching document when needed
  const { refetch: fetchDocument } = api.teacherAssistantV2.getDocument.useQuery(
    { id: artifact.documentId || '' },
    {
      enabled: false, // We'll manually trigger this
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Update local content when artifact content changes (e.g., during streaming)
  useEffect(() => {
    if (artifact.content !== localContent && artifact.status === 'streaming') {
      setLocalContent(artifact.content || '');
    }
  }, [artifact.content, artifact.status, localContent]);

  // Load document content if we don't have it and artifact is visible
  useEffect(() => {
    const loadDocument = async () => {
      if (
        artifact.documentId &&
        artifact.documentId !== 'init' &&
        (!artifact.content || artifact.content.trim().length === 0) &&
        artifact.status !== 'streaming'
      ) {
        setIsLoadingDocument(true);
        try {
          const result = await fetchDocument();
          if (result.data) {
            const documentData = Array.isArray(result.data) ? result.data[0] : result.data;
            if (documentData) {
              const content = documentData.content || '';
              setLocalContent(content);
              updateArtifact({
                content,
                title: documentData.title || artifact.title,
                status: 'idle'
              });
            }
          }
        } catch (error) {
          console.error('Failed to load document:', error);
          toast.error('Failed to load document');
        } finally {
          setIsLoadingDocument(false);
        }
      }
    };

    loadDocument();
  }, [artifact.documentId, artifact.content, artifact.status, fetchDocument, updateArtifact, artifact.title]);

  // Convert markdown to HTML when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const cleanMarkdown = unwrapMarkdownCodeFences(localContent);
      const htmlContent = markdownToHtml(cleanMarkdown);
      setEditorContent(htmlContent);
    }
  }, [isEditing, localContent]);

  const handleContentChange = useCallback(
    async (newHtmlContent: string) => {
      // Convert HTML back to markdown for storage
      const markdownContent = htmlToMarkdown(newHtmlContent);
      setLocalContent(markdownContent);
      setEditorContent(newHtmlContent);

      // Update artifact content immediately for UI responsiveness
      updateArtifact({ content: markdownContent });

      // Debounced save to database
      if (artifact.documentId && artifact.documentId !== 'init') {
        setIsSaving(true);
        try {
          await saveDocumentMutation.mutateAsync({
            id: artifact.documentId,
            content: markdownContent,
            title: artifact.title,
            kind: artifact.kind || 'text',
          });
        } catch (error) {
          console.error('Failed to save document:', error);
          toast.error('Failed to save changes');
        } finally {
          setIsSaving(false);
        }
      }
    },
    [artifact.documentId, artifact.title, updateArtifact, saveDocumentMutation]
  );

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(localContent);
    toast.success('Content copied to clipboard');
  }, [localContent]);

  const handleDownload = useCallback(async (format: 'pdf' | 'word' = 'pdf') => {
    try {
      const title = artifact.title || 'document';
      const isPreviewMode = !isEditing;

      if (isPreviewMode && previewRef.current) {
        if (format === 'pdf') {
          await exportElementToPDF(previewRef.current, title);
        } else {
          await exportElementToWord(previewRef.current, title);
        }
      } else {
        // Build a temporary element from current content to avoid layout flicker
        const temp = document.createElement('div');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        temp.style.top = '0';
        const cleanContent = unwrapMarkdownCodeFences(localContent);
        const html = isEditing ? editorContent : markdownToHtml(cleanContent);
        temp.innerHTML = `<div class="prose prose-sm">${html}</div>`;
        document.body.appendChild(temp);
        if (format === 'pdf') {
          await exportElementToPDF(temp, title);
        } else {
          await exportElementToWord(temp, title);
        }
        document.body.removeChild(temp);
      }

      toast.success(`${format.toUpperCase()} downloaded successfully`);
    } catch (error) {
      console.error('Failed to export document:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  }, [artifact.title, isEditing, localContent, editorContent]);

  return (
    <div className="hidden md:flex flex-1 min-w-0 h-full flex-col bg-background border-l border-border max-w-[50%] lg:max-w-[55%] xl:max-w-[60%]">
      {/* Document header - Sticky at top */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="font-semibold text-lg truncate">{artifact.title}</h2>
            {artifact.status === 'streaming' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Generating...
              </div>
            )}
            {isLoadingDocument && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Loading...
              </div>
            )}
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Saving...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit/Preview Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={artifact.status === 'streaming'}
              className="h-8 px-2"
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </>
              )}
            </Button>

            {/* Action buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyContent}
              className="h-8 px-2"
              title="Copy content"
            >
              <Copy className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  title="Download document"
                >
                  <Download className="w-4 h-4 mr-1" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('word')}>
                  Download as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 px-2"
              title="Close document"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document content - Scrollable area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {(artifact.content || localContent) && !isLoadingDocument ? (
          <div className="h-full flex flex-col">
            {isEditing ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <RichTextEditor
                  content={editorContent}
                  onChange={handleContentChange}
                  placeholder="Start creating your educational content..."
                  minHeight="100%"
                  className="h-full border-0 [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-w-0 [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:overflow-x-hidden"
                  disabled={artifact.status === 'streaming'}
                  simple={true}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
                <div id="ta-v2-document-preview" ref={previewRef} className="prose prose-sm max-w-none dark:prose-invert break-words">
                  <MarkdownRenderer content={unwrapMarkdownCodeFences(localContent)} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p>{isLoadingDocument ? 'Loading document...' : 'Generating content...'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
