'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileDown, Type, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToWord, exportToText, exportToHTML, exportElementToPDF, exportElementToWord } from '../utils/document-export';
import { ExportProgress } from './enhanced-loading-states';
import { showEnhancedToast } from './enhanced-error-handling';

interface DownloadMenuProps {
  content: string;
  title: string;
  className?: string;
}

export function DownloadMenu({ content, title, className }: DownloadMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'word' | 'text' | 'html') => {
    if (!content || !title) {
      toast.error('No content to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // Prefer exporting the live preview element for exact formatting
      const previewEl = typeof document !== 'undefined'
        ? (document.getElementById('ta-v2-document-preview') as HTMLElement | null)
        : null;
      switch (format) {
        case 'pdf':
          if (previewEl) {
            await exportElementToPDF(previewEl, title);
          } else {
            await exportToPDF(content, title);
          }
          toast.success('PDF exported successfully!');
          break;
        case 'word':
          if (previewEl) {
            await exportElementToWord(previewEl, title);
          } else {
            await exportToWord(content, title);
          }
          toast.success('Word document exported successfully!');
          break;
        case 'text':
          exportToText(content, title);
          toast.success('Text file exported successfully!');
          break;
        case 'html':
          exportToHTML(content, title);
          toast.success('HTML file exported successfully!');
          break;
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting || !content}
          className={`h-8 px-3 hover:bg-accent hover:text-accent-foreground border-border/50 hover:border-border transition-all duration-200 ${className}`}
        >
          <Download className="w-4 h-4 mr-1.5" />
          <span className="text-xs">{isExporting ? 'Exporting...' : 'Download'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg">
        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
        >
          <FileText className="w-4 h-4 mr-2 text-foreground" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('word')}
          disabled={isExporting}
          className="cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
        >
          <FileDown className="w-4 h-4 mr-2 text-foreground" />
          Export as Word
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => handleExport('html')}
          disabled={isExporting}
          className="cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
        >
          <Globe className="w-4 h-4 mr-2 text-foreground" />
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('text')}
          disabled={isExporting}
          className="cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
        >
          <Type className="w-4 h-4 mr-2 text-foreground" />
          Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
