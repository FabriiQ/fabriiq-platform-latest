'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface ReportTableProps {
  title: string;
  description?: string;
  data: Array<Record<string, any>>;
  columns: TableColumn[];
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  maxHeight?: string;
  onRowClick?: (row: any) => void;
}

/**
 * Reusable data table component for reports with search and sorting
 */
export function ReportTable({
  title,
  description,
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  className = '',
  maxHeight = '400px',
  onRowClick,
}: ReportTableProps) {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!search) return data;
    
    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [data, search]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {searchable && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" style={{ maxHeight }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`p-2 font-medium ${
                      column.align === 'center' ? 'text-center' :
                      column.align === 'right' ? 'text-right' : 'text-left'
                    } ${column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        <div className="flex flex-col">
                          <ArrowUp 
                            className={`h-3 w-3 ${
                              sortConfig?.key === column.key && sortConfig.direction === 'asc'
                                ? 'text-primary' : 'text-muted-foreground'
                            }`} 
                          />
                          <ArrowDown 
                            className={`h-3 w-3 -mt-1 ${
                              sortConfig?.key === column.key && sortConfig.direction === 'desc'
                                ? 'text-primary' : 'text-muted-foreground'
                            }`} 
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, index) => (
                <tr 
                  key={index} 
                  className={`border-b hover:bg-muted/50 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`p-2 ${
                        column.align === 'center' ? 'text-center' :
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {sortedData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No results found' : 'No data available'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
