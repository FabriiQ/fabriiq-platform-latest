'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Error Boundary for Question Bank components
 * 
 * This component catches React errors, including infinite loop errors,
 * and provides a fallback UI with recovery options.
 */
export class QuestionBankErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `qb-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('[QuestionBankErrorBoundary] Caught error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Check if this is an infinite loop error
    const isInfiniteLoop = error.message.includes('Maximum update depth exceeded') ||
                          error.message.includes('Too many re-renders') ||
                          error.stack?.includes('setRef');

    if (isInfiniteLoop) {
      console.error('[QuestionBankErrorBoundary] Detected infinite loop error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }

    this.setState({
      error,
      errorInfo,
    });

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, {
        context: 'QuestionBankErrorBoundary',
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack,
        isInfiniteLoop,
      });
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[QuestionBankErrorBoundary] Retrying... (${this.retryCount}/${this.maxRetries})`);
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    } else {
      console.warn('[QuestionBankErrorBoundary] Max retries reached');
    }
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const isInfiniteLoop = error?.message.includes('Maximum update depth exceeded') ||
                            error?.message.includes('Too many re-renders');

      return (
        <div className="container mx-auto py-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {isInfiniteLoop ? 'Infinite Loop Detected' : 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {isInfiniteLoop ? (
                  <p>
                    An infinite loop was detected in the question bank interface. 
                    This usually happens when components repeatedly update their state.
                  </p>
                ) : (
                  <p>
                    An error occurred while loading the question bank. 
                    Please try refreshing the page or contact support if the problem persists.
                  </p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <div className="text-xs font-mono">
                      <div className="mb-2">
                        <strong>Error:</strong> {error.message}
                      </div>
                      {error.stack && (
                        <div className="mb-2">
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      {errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs mt-1">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}

              <div className="flex flex-wrap gap-2">
                {this.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} left)
                  </Button>
                )}
                
                <Button onClick={this.handleReset} variant="outline">
                  Reset Component
                </Button>
                
                <Button onClick={this.handleReload} variant="default">
                  Reload Page
                </Button>
              </div>

              {isInfiniteLoop && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Troubleshooting Tips:</strong>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Try clearing your browser cache and cookies</li>
                      <li>Disable browser extensions temporarily</li>
                      <li>Check if the issue persists in an incognito window</li>
                      <li>Contact support if the problem continues</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default QuestionBankErrorBoundary;
