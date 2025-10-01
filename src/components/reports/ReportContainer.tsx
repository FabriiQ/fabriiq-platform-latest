'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, Filter } from 'lucide-react';
import { ExportButton, ExportOptions } from './ExportButton';

export interface ReportTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface ReportContainerProps {
  title: string;
  description?: string;
  tabs: ReportTab[];
  defaultTab?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  exportData?: any;
  exportFilename?: string;
  onSearch?: (query: string) => void;
  onDateRangeChange?: (range: { start?: string; end?: string }) => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf', options: ExportOptions) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable container component for reports with common functionality
 */
export function ReportContainer({
  title,
  description,
  tabs,
  defaultTab,
  searchable = true,
  searchPlaceholder = "Search reports, metrics...",
  exportable = true,
  exportData,
  exportFilename = 'report',
  onSearch,
  onDateRangeChange,
  onExport,
  className = '',
  children,
}: ReportContainerProps) {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  const handleDateRangeClick = () => {
    // In a real implementation, this would open a date picker
    console.log('Date range picker would open here');
    onDateRangeChange?.(dateRange);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {searchable && (
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-9"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        )}
        
        <Button variant="outline" onClick={handleDateRangeClick}>
          <Calendar className="mr-2 h-4 w-4" /> Date Range
        </Button>
        
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>

        {exportable && exportData && (
          <div className="ml-auto">
            <ExportButton
              data={exportData}
              filename={exportFilename}
              dateRange={dateRange}
              filters={{ search }}
              onExport={onExport}
            />
          </div>
        )}
      </div>

      {/* Custom children content (like metric cards) */}
      {children}

      {/* Tabs */}
      {tabs.length > 0 && (
        <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-${Math.min(tabs.length, 7)}`}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
