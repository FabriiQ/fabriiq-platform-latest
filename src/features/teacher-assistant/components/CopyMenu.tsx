'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/core/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/core/dropdown-menu';
import { 
  Copy, 
  FileText, 
  Code, 
  Download, 
  Share2, 
  Check,
  Clipboard,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyMenuProps {
  content: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Enhanced copy menu with multiple format options
 */
export function CopyMenu({ 
  content, 
  className, 
  variant = 'ghost', 
  size = 'sm' 
}: CopyMenuProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const convertToMarkdown = (text: string): string => {
    // Simple HTML to Markdown conversion
    let markdown = text
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
      .replace(/\n\n\n+/g, '\n\n') // Clean up extra newlines
      .trim();
    
    return markdown;
  };

  const convertToPlainText = (text: string): string => {
    // Strip HTML and clean up formatting
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
  };

  const generateShareableLink = (): string => {
    // Create a shareable link with encoded content
    const encodedContent = encodeURIComponent(content);
    return `${window.location.origin}/shared-content?content=${encodedContent}`;
  };

  const downloadAsFile = (text: string, filename: string, mimeType: string) => {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatOptions = [
    {
      id: 'html',
      label: 'Rich Text (HTML)',
      icon: Code,
      description: 'Copy with formatting preserved',
      action: () => copyToClipboard(content, 'html')
    },
    {
      id: 'markdown',
      label: 'Markdown',
      icon: Hash,
      description: 'Copy as Markdown format',
      action: () => copyToClipboard(convertToMarkdown(content), 'markdown')
    },
    {
      id: 'plain',
      label: 'Plain Text',
      icon: FileText,
      description: 'Copy without formatting',
      action: () => copyToClipboard(convertToPlainText(content), 'plain')
    }
  ];

  const downloadOptions = [
    {
      id: 'txt',
      label: 'Download as TXT',
      action: () => downloadAsFile(
        convertToPlainText(content), 
        'teacher-assistant-content.txt', 
        'text/plain'
      )
    },
    {
      id: 'md',
      label: 'Download as Markdown',
      action: () => downloadAsFile(
        convertToMarkdown(content), 
        'teacher-assistant-content.md', 
        'text/markdown'
      )
    },
    {
      id: 'html',
      label: 'Download as HTML',
      action: () => downloadAsFile(
        `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Teacher Assistant Content</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        p { line-height: 1.6; }
        ul, ol { padding-left: 20px; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`, 
        'teacher-assistant-content.html', 
        'text/html'
      )
    }
  ];

  if (!content || content.trim().length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn("gap-2", className)}
        >
          <Copy className="h-4 w-4" />
          {size !== 'icon' && 'Copy'}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Copy Format
        </div>
        
        {formatOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={option.action}
            className="flex items-start gap-3 p-3"
          >
            <div className="flex items-center gap-2 flex-1">
              {copiedFormat === option.id ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <option.icon className="h-4 w-4" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Download
        </div>
        
        {downloadOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={option.action}
            className="flex items-center gap-2 p-3"
          >
            <Download className="h-4 w-4" />
            <span className="text-sm">{option.label}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            const shareableLink = generateShareableLink();
            copyToClipboard(shareableLink, 'share');
          }}
          className="flex items-center gap-2 p-3"
        >
          {copiedFormat === 'share' ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span className="text-sm">Copy Shareable Link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
