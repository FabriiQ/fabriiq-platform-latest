'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/core/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Quote,
  Link,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onFormat: (format: string, value?: string) => void;
  className?: string;
}

/**
 * Floating toolbar for rich text formatting
 * Appears when text is selected in canvas mode
 */
export function FloatingToolbar({ isVisible, position, onFormat, className }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep toolbar in viewport
  useEffect(() => {
    if (!isVisible || !toolbarRef.current) return;

    const toolbar = toolbarRef.current;
    const rect = toolbar.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth - 20) {
      x = viewportWidth - rect.width - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // Adjust vertical position
    if (y - rect.height < 20) {
      y = position.y + 40; // Show below selection instead
    } else {
      y = position.y - rect.height - 10; // Show above selection
    }

    setAdjustedPosition({ x, y });
  }, [isVisible, position]);

  if (!isVisible) return null;

  const formatButtons = [
    {
      icon: Bold,
      label: 'Bold',
      format: 'bold',
      shortcut: 'Ctrl+B'
    },
    {
      icon: Italic,
      label: 'Italic',
      format: 'italic',
      shortcut: 'Ctrl+I'
    },
    {
      icon: Underline,
      label: 'Underline',
      format: 'underline',
      shortcut: 'Ctrl+U'
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      format: 'heading',
      value: '1'
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      format: 'heading',
      value: '2'
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      format: 'heading',
      value: '3'
    },
    {
      icon: List,
      label: 'Bullet List',
      format: 'bulletList'
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      format: 'orderedList'
    },
    {
      icon: Quote,
      label: 'Quote',
      format: 'blockquote'
    },
    {
      icon: Link,
      label: 'Link',
      format: 'link'
    }
  ];

  const handleFormat = (format: string, value?: string) => {
    onFormat(format, value);
  };

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-50 bg-background border border-border rounded-lg shadow-lg p-1",
        "flex items-center gap-1 transition-all duration-200",
        "backdrop-blur-sm bg-background/95",
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {formatButtons.map((button, index) => {
        const Icon = button.icon;
        return (
          <Button
            key={button.format + (button.value || '')}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10"
            onClick={() => handleFormat(button.format, button.value)}
            title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Hook to manage floating toolbar state
 */
export function useFloatingToolbar() {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  const showToolbar = (x: number, y: number, text: string = '') => {
    setPosition({ x, y });
    setSelectedText(text);
    setIsVisible(true);
  };

  const hideToolbar = () => {
    setIsVisible(false);
    setSelectedText('');
  };

  const handleTextSelection = (event: MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hideToolbar();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const text = selection.toString();

    if (text.trim()) {
      showToolbar(
        rect.left + rect.width / 2,
        rect.top,
        text
      );
    } else {
      hideToolbar();
    }
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('keyup', handleTextSelection);
    };
  }, []);

  return {
    isVisible,
    position,
    selectedText,
    showToolbar,
    hideToolbar
  };
}

/**
 * Utility functions for text formatting
 */
export const formatText = {
  bold: (text: string) => `**${text}**`,
  italic: (text: string) => `*${text}*`,
  underline: (text: string) => `<u>${text}</u>`,
  heading: (text: string, level: string = '1') => `${'#'.repeat(parseInt(level))} ${text}`,
  bulletList: (text: string) => `- ${text}`,
  orderedList: (text: string, index: number = 1) => `${index}. ${text}`,
  blockquote: (text: string) => `> ${text}`,
  link: (text: string, url: string = '') => `[${text}](${url || 'https://example.com'})`,
  code: (text: string) => `\`${text}\``,
  codeBlock: (text: string, language: string = '') => `\`\`\`${language}\n${text}\n\`\`\``,
};

/**
 * Apply formatting to selected text in a textarea or contenteditable element
 */
export function applyFormatting(
  element: HTMLTextAreaElement | HTMLElement,
  format: string,
  value?: string
) {
  if (element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selectedText = element.value.substring(start, end);
    
    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = formatText.bold(selectedText);
        break;
      case 'italic':
        formattedText = formatText.italic(selectedText);
        break;
      case 'underline':
        formattedText = formatText.underline(selectedText);
        break;
      case 'heading':
        formattedText = formatText.heading(selectedText, value);
        break;
      case 'bulletList':
        formattedText = formatText.bulletList(selectedText);
        break;
      case 'orderedList':
        formattedText = formatText.orderedList(selectedText);
        break;
      case 'blockquote':
        formattedText = formatText.blockquote(selectedText);
        break;
      case 'link':
        const url = prompt('Enter URL:') || '';
        formattedText = formatText.link(selectedText, url);
        break;
      default:
        formattedText = selectedText;
    }
    
    const newValue = 
      element.value.substring(0, start) + 
      formattedText + 
      element.value.substring(end);
    
    element.value = newValue;
    element.focus();
    element.setSelectionRange(
      start + formattedText.length,
      start + formattedText.length
    );
    
    // Trigger change event
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }
}
