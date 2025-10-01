'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BloomsTaxonomyLevel } from '../../types/bloom-taxonomy';
import { StudentBloomsPerformance } from '../../types/analytics';
import { BLOOMS_LEVEL_METADATA } from '../../constants/bloom-levels';
// ResponsiveRadar completely removed for demo mode

interface StudentBloomsPerformanceChartProps {
  performance: StudentBloomsPerformance;
  title?: string;
  description?: string;
  height?: number;
  isLoading?: boolean;
  className?: string;
}

export function StudentBloomsPerformanceChart({
  performance,
  title = "Student Cognitive Performance",
  description = "Performance across Bloom's Taxonomy cognitive levels",
  height = 300,
  isLoading = false,
  className = ""
}: StudentBloomsPerformanceChartProps) {
  // Transform performance data for the radar chart
  const chartData = Object.values(BloomsTaxonomyLevel).map(level => {
    const metadata = BLOOMS_LEVEL_METADATA[level];

    return {
      level: metadata.name,
      value: performance[level],
      color: metadata.color
    };
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse bg-gray-200 rounded-md w-full h-4/5" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-4">Demo Bloom's Performance Radar</h3>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  {chartData.map((item, index) => (
                    <div key={item.level} className="text-center">
                      <div
                        className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.value}%
                      </div>
                      <div className="text-sm font-medium">{item.level}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Demo visualization - Real implementation would show interactive radar chart
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
