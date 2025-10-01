'use client';

import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import ListItem from '@tiptap/extension-list-item';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TableExtension from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import History from '@tiptap/extension-history';
// import Focus from '@tiptap/extension-focus'; // Commented out - extension not installed
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Mathematics from '@tiptap/extension-mathematics';
import { Node, mergeAttributes } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { EmbedDialog } from '@/components/ui/embed-dialog';
import { MathDialog } from '@/components/ui/math-dialog';
import { useTheme } from 'next-themes';
import 'katex/dist/katex.min.css';

// Custom Iframe Extension for TipTap
const IframeExtension = Node.create({
  name: 'iframe',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: '400',
      },
      frameborder: {
        default: '0',
      },
      allowfullscreen: {
        default: 'true',
      },
      title: {
        default: 'Embedded content',
      },
      style: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
      {
        tag: 'div[data-iframe-wrapper]',
        getAttrs: (element) => {
          const iframe = element.querySelector('iframe');
          if (iframe) {
            return {
              src: iframe.getAttribute('src'),
              width: iframe.getAttribute('width') || iframe.style.width || '100%',
              height: iframe.getAttribute('height') || iframe.style.height || '400',
              frameborder: iframe.getAttribute('frameborder') || '0',
              allowfullscreen: iframe.hasAttribute('allowfullscreen') ? 'true' : 'false',
              title: iframe.getAttribute('title') || 'Embedded content',
              style: iframe.getAttribute('style'),
            };
          }
          return false;
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { style, ...iframeAttrs } = HTMLAttributes;

    // Enhanced iframe attributes for better security and functionality
    const enhancedAttrs = {
      ...iframeAttrs,
      sandbox: iframeAttrs.sandbox || 'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation',
      referrerpolicy: iframeAttrs.referrerpolicy || 'no-referrer-when-downgrade',
      loading: iframeAttrs.loading || 'lazy',
    };

    // Create iframe with enhanced attributes
    const iframeHTML = `<iframe ${Object.entries(enhancedAttrs)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')}${style ? ` style="${style}"` : ''}></iframe>`;

    // Wrap in a responsive container with error handling
    return [
      'div',
      {
        'data-iframe-wrapper': 'true',
        style: 'position: relative; width: 100%; max-width: 100%; border-radius: 8px; overflow: hidden; margin: 1rem 0; border: 1px solid #e5e7eb;',
      },
      ['div', { innerHTML: iframeHTML }],
    ];
  },

  addCommands() {
    return {
      setIframe: (options: any) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        });
      },
    } as any;
  },
});
import {
  List,
  Monitor,
  // Most icons are not available in the current lucide-react setup
  // Will use custom components for missing icons
  Plus,
  Trash2,
  MoreHorizontal,
  Eye,
  Play,
  CheckCircle,
  MessageSquare,
  FileText,
  Clock,
  Edit,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Custom icon components for missing icons
const Bold = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M8 11h4.5a2.5 2.5 0 1 0 0-5H8v5Zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.613A4.5 4.5 0 0 1 18 15.5ZM8 13v5h5.5a2.5 2.5 0 1 0 0-5H8Z" />
  </svg>
);

const Italic = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const Heading = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M6 12h12" />
    <path d="M6 20V4" />
    <path d="M18 20V4" />
  </svg>
);

const AlignLeft = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="15" y1="12" x2="3" y2="12" />
    <line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);

const AlignCenter = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="18" y1="6" x2="6" y2="6" />
    <line x1="21" y1="12" x2="3" y2="12" />
    <line x1="16" y1="18" x2="8" y2="18" />
  </svg>
);

const AlignRight = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="12" x2="9" y2="12" />
    <line x1="21" y1="18" x2="7" y2="18" />
  </svg>
);

const Link = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Additional missing icons
const Undo = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const Redo = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </svg>
);

const UnderlineIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
);

const Strikethrough = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />
    <path d="M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
);

const CodeIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
);

const ListOrdered = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </svg>
);

const Quote = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);



const SubscriptIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M4 5h6M14 5h6M4 19h6M14 19h6M4 5l8 14M20 5l-8 14" />
    <path d="M20 16h-4c0-1.5.442-2 1.5-2.5S20 12.5 20 11c0-.5-.5-1-1-1s-1 .5-1 1" />
  </svg>
);

const SuperscriptIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M4 7h6M14 7h6M4 17h6M14 17h6M4 7l8 10M20 7l-8 10" />
    <path d="M20 4h-4c0-1.5.442-2 1.5-2.5S20 .5 20-1c0-.5-.5-1-1-1s-1 .5-1 1" />
  </svg>
);

const CheckSquare = (props: React.SVGProps<SVGSVGElement>) => (
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
    <polyline points="9,11 12,14 22,4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const FileCode = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" />
    <path d="M10 12l-2 2 2 2" />
    <path d="M14 16l2-2-2-2" />
  </svg>
);

const Minus = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M5 12h14" />
  </svg>
);

const Highlighter = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M9 11l-6 6v3h3l6-6" />
    <path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

const Palette = (props: React.SVGProps<SVGSVGElement>) => (
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
    <circle cx="13.5" cy="6.5" r=".5" />
    <circle cx="17.5" cy="10.5" r=".5" />
    <circle cx="8.5" cy="7.5" r=".5" />
    <circle cx="6.5" cy="12.5" r=".5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const Type = (props: React.SVGProps<SVGSVGElement>) => (
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
    <polyline points="4,7 4,4 20,4 20,7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const Hash = (props: React.SVGProps<SVGSVGElement>) => (
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
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const Table = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

interface EnhancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  onAIWrite?: () => void;
}

export interface EnhancedRichTextEditorRef {
  insertContentAtCursor: (content: string) => void;
}

export const EnhancedRichTextEditor = forwardRef<EnhancedRichTextEditorRef, EnhancedRichTextEditorProps>(({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = '100%',
  disabled = false,
  onAIWrite,
}, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [isMathDialogOpen, setIsMathDialogOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  const safeContent = typeof content === 'string' ? content : String(content || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        history: false,
      }),
      ListItem,
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Strike,
      Code,
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic',
        },
      }),
      HorizontalRule,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TableExtension.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm border border-gray-200 my-2',
          loading: 'eager',
          // Note: CORS attributes are now handled dynamically by content sanitizer
          // to avoid issues with Google Drive images
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            src: {
              default: null,
              parseHTML: element => element.getAttribute('src'),
              renderHTML: attributes => {
                if (!attributes.src) return {};
                
                // Check if this is a Google Drive image to avoid CORS attributes
                const isGoogleDriveImage = attributes.src.includes('drive.google.com') || 
                                         attributes.src.includes('googleusercontent.com');
                
                return {
                  src: attributes.src,
                  ...(isGoogleDriveImage ? {} : {
                    crossorigin: 'anonymous',
                    referrerpolicy: 'no-referrer'
                  })
                };
              },
            },
          };
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
      IframeExtension,
      Dropcursor,
      Gapcursor,
      // Focus extension not available - commented out
      // Focus.configure({
      //   className: 'has-focus',
      //   mode: 'all',
      // }),
      History,
    ],
    content: safeContent,
    editable: !disabled,
    editorProps: {
      handlePaste: (_view, event, _slice) => {
        // Get the pasted content
        const clipboardData = event.clipboardData;
        if (clipboardData) {
          const htmlData = clipboardData.getData('text/html');
          const textData = clipboardData.getData('text/plain');

          // Check if the pasted content contains iframe
          if (htmlData && htmlData.includes('<iframe')) {
            event.preventDefault();
            handleEmbedContent(htmlData);
            return true;
          } else if (textData && textData.includes('<iframe')) {
            event.preventDefault();
            handleEmbedContent(textData);
            return true;
          }
        }
        return false; // Let TipTap handle normal paste
      },
    },
    onUpdate: ({ editor }) => {
      try {
        if (editor && typeof editor.getHTML === 'function') {
          const content = editor.getHTML();
          if (typeof content === 'string') {
            onChange(content);
          }
        }
      } catch (error) {
        console.error('Error in editor onUpdate:', error);
      }
    },
  });

  useEffect(() => {
    if (editor && editor.commands && safeContent !== editor.getHTML()) {
      try {
        editor.commands.setContent(safeContent);
      } catch (error) {
        console.error('Error setting editor content:', error);
      }
    }
  }, [safeContent, editor]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    insertContentAtCursor: (content: string) => {
      if (editor) {
        editor.chain().focus().insertContent(content).run();
      }
    }
  }), [editor]);

  // Helper functions for editor actions
  const insertTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const insertImage = () => {
    if (editor) {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (src) {
              editor.chain().focus().setImage({ src }).run();
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const insertLink = () => {
    if (editor) {
      const url = prompt('Enter URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  const insertEmbed = () => {
    console.log('Opening embed dialog');
    setIsEmbedDialogOpen(true);
  };

  const insertMath = () => {
    setIsMathDialogOpen(true);
  };

  const handleMathInsert = (latex: string) => {
    if (editor) {
      editor.chain().focus().insertContent({
        type: 'mathematics',
        attrs: {
          latex: latex,
        },
      }).run();
    }
  };

  const handleEmbedContent = (embedCode: string) => {
    if (!editor) {
      console.error('Editor not available for embed content insertion');
      return;
    }

    console.log('Inserting embed content:', embedCode);

    try {
      // Try to parse iframe from the embed code
      const iframeMatch = embedCode.match(/<iframe[^>]*>/i);
      if (iframeMatch) {
        const iframeTag = iframeMatch[0];

        // Extract attributes from iframe tag
        const srcMatch = iframeTag.match(/src=["']([^"']+)["']/i);
        const widthMatch = iframeTag.match(/width=["']([^"']+)["']/i);
        const heightMatch = iframeTag.match(/height=["']([^"']+)["']/i);
        const titleMatch = iframeTag.match(/title=["']([^"']+)["']/i);
        const styleMatch = iframeTag.match(/style=["']([^"']+)["']/i);

        if (srcMatch) {
          console.log('Inserting structured iframe with src:', srcMatch[1]);

          // Use the iframe extension to insert structured iframe
          const success = editor.chain().focus().insertContent({
            type: 'iframe',
            attrs: {
              src: srcMatch[1],
              width: widthMatch ? widthMatch[1] : '100%',
              height: heightMatch ? heightMatch[1] : '400',
              title: titleMatch ? titleMatch[1] : 'Embedded content',
              style: styleMatch ? styleMatch[1] : null,
              allowfullscreen: iframeTag.includes('allowfullscreen') ? 'true' : 'false',
              frameborder: '0'
            }
          }).run();

          if (success) {
            console.log('Iframe inserted successfully');
            return;
          } else {
            console.warn('Failed to insert iframe using extension, falling back to raw HTML');
          }
        }
      }

      // Fallback: insert as raw HTML (for complex embed codes)
      console.log('Inserting raw HTML embed code');
      const success = editor.chain().focus().insertContent(embedCode).run();

      if (success) {
        console.log('Raw HTML embed inserted successfully');
      } else {
        console.error('Failed to insert embed content');
      }
    } catch (error) {
      console.error('Error inserting embed content:', error);
      // Final fallback - try to insert as plain HTML
      try {
        editor.commands.insertContent(embedCode);
      } catch (fallbackError) {
        console.error('Fallback embed insertion also failed:', fallbackError);
      }
    }
  };

  if (!isMounted) {
    return (
      <div className={cn("border border-border rounded-md p-3 bg-muted/20", className)}>
        <div className="animate-pulse h-24 bg-muted rounded"></div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("relative border border-border rounded-md", className)}>

      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert p-3",
          "focus-within:outline-none",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:focus:outline-none",
          "[&_.ProseMirror]:focus:ring-0",
          "[&_.ProseMirror]:focus:border-transparent",
          "[&_.ProseMirror]:caret-color-current",
          "[&_.ProseMirror]:selection:bg-blue-200",
          "[&_.ProseMirror]:dark:selection:bg-blue-800",
          "[&_.ProseMirror]:min-h-[200px]", // Ensure minimum height for easier clicking
          "[&_.ProseMirror]:cursor-text", // Ensure text cursor is shown
          // Image styling
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:border [&_img]:border-gray-200",
          // Iframe styling for embedded content - improved responsive design
          "[&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:shadow-sm [&_iframe]:min-h-[300px] [&_iframe]:max-w-full",
          "[&_div[data-iframe-wrapper]]:w-full [&_div[data-iframe-wrapper]]:rounded-lg [&_div[data-iframe-wrapper]]:overflow-hidden [&_div[data-iframe-wrapper]]:shadow-sm [&_div[data-iframe-wrapper]]:border [&_div[data-iframe-wrapper]]:border-gray-200 [&_div[data-iframe-wrapper]]:my-4",
          "[&_div[data-iframe-wrapper]_iframe]:w-full [&_div[data-iframe-wrapper]_iframe]:h-full [&_div[data-iframe-wrapper]_iframe]:border-0",
          disabled ? "opacity-75 cursor-not-allowed pointer-events-none" : "cursor-text",
          resolvedTheme === 'dark' ? 'dark' : ''
        )}
        style={{
          minHeight,
          '--tw-ring-shadow': 'none',
          '--tw-ring-offset-shadow': 'none',
        } as React.CSSProperties}
        onClick={() => {
          // Ensure editor gets focus when clicked
          if (!disabled && editor && !editor.isFocused) {
            editor.commands.focus();
          }
        }}
      />

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            placement: 'top',
            maxWidth: 'none',
            interactive: true,
            appendTo: () => document.body,
          }}
          className="z-50"
        >
          <div className="flex items-center bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-1 gap-1">
            {/* Text Formatting */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('bold') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('italic') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('underline') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('strike') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('highlight') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Headings */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('heading', { level: 1 }) && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
            >
              <span className="text-xs font-bold">H1</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('heading', { level: 2 }) && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists and Blocks */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('bulletList') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('orderedList') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                editor.isActive('blockquote') && "bg-accent text-accent-foreground"
              )}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Links and Media */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertLink}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertImage}
              title="Insert Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertMath}
              title="Insert Math Equation"
            >
              <span className="text-xs font-bold">∑</span>
            </Button>
          </div>
        </BubbleMenu>
      )}

      {/* Floating Menu for empty editor */}
      {editor && (
        <FloatingMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            placement: 'left',
            interactive: true,
            appendTo: () => document.body,
          }}
          className="z-40"
        >
          <div className="flex flex-col bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-1 gap-1">
            {/* Text Elements */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Add Heading 1"
            >
              <span className="text-xs font-bold">H1</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Add Heading 2"
            >
              <span className="text-xs font-bold">H2</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Add Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Add Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Add Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Add Divider"
            >
              <Minus className="h-4 w-4" />
            </Button>

            {/* Media Elements */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertImage}
              title="Add Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertEmbed}
              title="Add Embed"
            >
              <Monitor className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertTable}
              title="Add Table"
            >
              <Table className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertMath}
              title="Add Math Equation"
            >
              <span className="text-xs font-bold">∑</span>
            </Button>

            {/* AI Writer */}
            {onAIWrite && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onAIWrite?.()}
                title="AI Writer"
              >
                <span className="text-xs font-bold">✨</span>
              </Button>
            )}
          </div>
        </FloatingMenu>
      )}

      {/* Embed Dialog */}
      <EmbedDialog
        open={isEmbedDialogOpen}
        onOpenChange={setIsEmbedDialogOpen}
        onEmbed={handleEmbedContent}
      />

      {/* Math Dialog */}
      <MathDialog
        open={isMathDialogOpen}
        onOpenChange={setIsMathDialogOpen}
        onInsert={handleMathInsert}
      />
    </div>
  );
});

EnhancedRichTextEditor.displayName = 'EnhancedRichTextEditor';
