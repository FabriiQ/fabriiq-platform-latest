'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * Rich Text Display Component
 * 
 * A component for displaying rich text content with proper styling.
 */
export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  className
}) => {
  if (!content) {
    return null;
  }

  // Ensure content is always a string
  let safeContent = '';
  if (typeof content === 'string') {
    safeContent = content;
  } else if (typeof content === 'object' && content !== null) {
    // If content is an object, try to extract meaningful text
    if ('text' in content) {
      safeContent = String(content.text || '');
    } else if ('html' in content) {
      safeContent = String(content.html || '');
    } else if ('content' in content) {
      safeContent = String(content.content || '');
    } else {
      // If it's an object with other keys, convert to JSON string for debugging
      console.warn('RichTextDisplay received object content, converting to string:', content);
      safeContent = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
    }
  } else {
    safeContent = String(content || '');
  }

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        className
      )}
      dangerouslySetInnerHTML={{ __html: safeContent }}
    />
  );
};

export default RichTextDisplay;
