'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { EnhancedRichTextEditor } from './enhanced-rich-text-editor';
import { MarkdownRenderer } from './markdown-renderer';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';


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

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<any>;
};

function PureEditor({
  content,
  onSaveContent,
  status,
  isCurrentVersion,
}: EditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);



  useEffect(() => {
    if (content !== localContent && status === 'streaming') {
      setLocalContent(content);
    }
  }, [content, status, localContent]);

  const handleChange = useCallback(
    (newContent: string) => {
      setLocalContent(newContent);
      if (isCurrentVersion) {
        onSaveContent(newContent, true);
      }
    },
    [onSaveContent, isCurrentVersion]
  );





  return (
    <div className="h-full flex flex-col">
      {/* Header - responsive */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm md:text-base">Educational Content</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
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
          </div>
        </div>
      </div>

      {/* Content area - responsive */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col relative">
          {isEditing ? (
            <RichTextEditor
              content={localContent}
              onChange={handleChange}
              placeholder="Start creating your educational content..."
              minHeight="100%"
              className="flex-1 border-0"
              disabled={!isCurrentVersion || status === 'streaming'}
              simple={true}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <MarkdownRenderer content={unwrapMarkdownCodeFences(localContent)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.onSaveContent === nextProps.onSaveContent
  );
}

export const Editor = memo(PureEditor, areEqual);

// Keep the old TextEditor for backward compatibility
interface TextEditorProps {
  content: string;
  isEditable: boolean;
  onContentChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function TextEditor({
  content,
  isEditable,
  onContentChange,
  placeholder = 'Start writing...',
}: TextEditorProps) {
  if (!isEditable) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="prose prose-sm max-w-none dark:prose-invert p-6">
          <MarkdownRenderer content={unwrapMarkdownCodeFences(content || '')} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <EnhancedRichTextEditor
          content={content}
          onChange={onContentChange}
          placeholder={placeholder}
          minHeight="100%"
          className="h-full [&_.ProseMirror]:p-6 [&_.ProseMirror]:focus:outline-none"
          disabled={!isEditable}
        />
      </div>
    </div>
  );
}
