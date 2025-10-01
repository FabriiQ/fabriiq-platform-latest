'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, BarChart } from 'lucide-react';
import { use } from 'react';

interface PerformanceAnalyticsPageProps {
  params: Promise<{
    classId: string;
  }>;
}

export default function PerformanceAnalyticsPage({ params }: PerformanceAnalyticsPageProps) {
  // Unwrap the params Promise using React's use() hook
  const resolvedParams = use(params);
  const { classId } = resolvedParams;
  
  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Academic performance metrics and trends for Class {classId}
          </p>
        </div>
      </div>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Coming Soon</AlertTitle>
        <AlertDescription>
          Performance analytics are currently under development and will be available soon.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
          <CardDescription>
            Track student performance across assessments and activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12 text-center">
            <div className="text-muted-foreground">
              <BarChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p>
                We're working on comprehensive performance analytics for your class.
                This feature will be available in a future update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}