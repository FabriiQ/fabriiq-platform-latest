"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/feedback/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface FeeErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface FeeErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>;
}

export class FeeErrorBoundary extends React.Component<FeeErrorBoundaryProps, FeeErrorBoundaryState> {
  constructor(props: FeeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FeeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Fee Management Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultFeeErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface FeeErrorFallbackProps {
  error?: Error;
  retry?: () => void;
}

export function DefaultFeeErrorFallback({ error, retry }: FeeErrorFallbackProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Fee Management Error
        </CardTitle>
        <CardDescription>
          Something went wrong while loading the fee management system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button onClick={retry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for handling API errors in fee management
export function useFeeErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    console.error(`Fee Management Error${context ? ` (${context})` : ''}:`, error);
    
    // You can add additional error reporting here
    // For example, send to error tracking service
    
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      context,
    };
  };

  return { handleError };
}

// Loading component for fee management
export function FeeLoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Empty state component for fee management
export function FeeEmptyState({ 
  title = "No data found", 
  description = "There are no items to display at the moment.",
  action
}: { 
  title?: string; 
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
