'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

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

  useEffect(() => {
    if (content !== localContent && status === 'streaming') {
      setLocalContent(content);
    }
  }, [content, status, localContent]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);
      if (isCurrentVersion) {
        onSaveContent(newContent, true);
      }
    },
    [onSaveContent, isCurrentVersion]
  );

  return (
    <div className="flex flex-row py-8 md:p-20 px-4 h-full">
      <div className="w-full max-w-4xl mx-auto">
        <Textarea
          value={localContent}
          onChange={handleChange}
          className="min-h-[600px] resize-none border-0 focus-visible:ring-0 text-sm leading-relaxed"
          placeholder="Educational content will appear here..."
          readOnly={!isCurrentVersion || status === 'streaming'}
        />
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
