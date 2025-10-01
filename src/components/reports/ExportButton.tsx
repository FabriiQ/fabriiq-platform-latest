'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, BarChart3 } from 'lucide-react';

export interface ExportOptions {
  data: any;
  filename?: string;
  reportType?: string;
  dateRange?: { start?: string; end?: string };
  filters?: Record<string, any>;
}

export interface ExportButtonProps {
  data: any;
  filename?: string;
  reportType?: string;
  dateRange?: { start?: string; end?: string };
  filters?: Record<string, any>;
  onExport?: (format: 'csv' | 'excel' | 'pdf', options: ExportOptions) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Reusable export button component with multiple format options
 */
export function ExportButton({
  data,
  filename = 'report',
  reportType = 'general',
  dateRange,
  filters,
  onExport,
  className = '',
  variant = 'default',
  size = 'default',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    
    const options: ExportOptions = {
      data,
      filename: `${filename}-${format}-${Date.now()}`,
      reportType,
      dateRange,
      filters,
    };

    try {
      if (onExport) {
        await onExport(format, options);
      } else {
        // Default export behavior - create downloadable JSON file
        const exportData = {
          format,
          timestamp: new Date().toISOString(),
          ...options,
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${options.filename}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
