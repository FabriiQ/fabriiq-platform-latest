'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  X, 
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ErrorBoundaryProps {
  error: Error | null;
  onRetry: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBoundary({ error, onRetry, onDismiss, className }: ErrorBoundaryProps) {
  if (!error) return null;

  const getErrorType = (error: Error) => {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network';
    }
    if (error.message.includes('timeout')) {
      return 'timeout';
    }
    if (error.message.includes('rate limit')) {
      return 'rateLimit';
    }
    return 'general';
  };

  const getErrorConfig = (type: string) => {
    switch (type) {
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
          icon: WifiOff,
          color: 'red',
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Contact support if the problem persists'
          ]
        };
      case 'timeout':
        return {
          title: 'Request Timeout',
          message: 'The request took too long to complete.',
          icon: AlertTriangle,
          color: 'yellow',
          suggestions: [
            'Try again with a shorter message',
            'Check your internet connection',
            'The server might be busy, try again later'
          ]
        };
      case 'rateLimit':
        return {
          title: 'Too Many Requests',
          message: 'You\'ve made too many requests. Please wait a moment.',
          icon: AlertTriangle,
          color: 'orange',
          suggestions: [
            'Wait a few minutes before trying again',
            'Consider upgrading your plan for higher limits'
          ]
        };
      default:
        return {
          title: 'Something went wrong',
          message: error.message || 'An unexpected error occurred.',
          icon: XCircle,
          color: 'red',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Contact support if the problem persists'
          ]
        };
    }
  };

  const errorType = getErrorType(error);
  const config = getErrorConfig(errorType);
  const Icon = config.icon;

  return (
    <motion.div
      className={cn("p-4", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Alert className={cn("border-l-4", {
        'border-l-red-500 bg-red-50 dark:bg-red-900/20': config.color === 'red',
        'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20': config.color === 'yellow',
        'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20': config.color === 'orange',
      })}>
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 mt-0.5", {
            'text-red-600 dark:text-red-400': config.color === 'red',
            'text-yellow-600 dark:text-yellow-400': config.color === 'yellow',
            'text-orange-600 dark:text-orange-400': config.color === 'orange',
          })} />
          
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{config.title}</h4>
            <AlertDescription className="text-sm mb-3">
              {config.message}
            </AlertDescription>
            
            {config.suggestions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium mb-2 text-muted-foreground">
                  Suggestions:
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {config.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
              
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </motion.div>
  );
}

interface OfflineDetectorProps {
  onRetry?: () => void;
}

export function OfflineDetector({ onRetry }: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      toast.success('Connection restored!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      toast.error('Connection lost. Working offline...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showOfflineMessage && (
        <motion.div
          className="fixed top-4 right-4 z-50 max-w-sm"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <Alert className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20">
            <WifiOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-sm">
              <div className="flex items-center justify-between">
                <span>You're offline. Some features may not work.</span>
                <Button
                  onClick={() => setShowOfflineMessage(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface RetryMechanismProps {
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  children: (retry: () => void, isRetrying: boolean, retryCount: number) => React.ReactNode;
}

export function RetryMechanism({ 
  onRetry, 
  maxRetries = 3, 
  retryDelay = 1000,
  children 
}: RetryMechanismProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached.`);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Add delay before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
      await onRetry();
      setRetryCount(0); // Reset on success
    } catch (error) {
      console.error(`Retry attempt ${retryCount + 1} failed:`, error);
      if (retryCount + 1 >= maxRetries) {
        toast.error('All retry attempts failed. Please try again later.');
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return <>{children(handleRetry, isRetrying, retryCount)}</>;
}

interface ToastNotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function showEnhancedToast({ type, title, message, action }: ToastNotificationProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  };

  const Icon = icons[type];

  toast.custom((t) => (
    <motion.div
      className={cn(
        "flex items-start gap-3 p-4 bg-background border rounded-lg shadow-lg max-w-md",
        {
          'border-green-200 bg-green-50 dark:bg-green-900/20': type === 'success',
          'border-red-200 bg-red-50 dark:bg-red-900/20': type === 'error',
          'border-blue-200 bg-blue-50 dark:bg-blue-900/20': type === 'info',
          'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20': type === 'warning',
        }
      )}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
    >
      <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", {
        'text-green-600 dark:text-green-400': type === 'success',
        'text-red-600 dark:text-red-400': type === 'error',
        'text-blue-600 dark:text-blue-400': type === 'info',
        'text-yellow-600 dark:text-yellow-400': type === 'warning',
      })} />
      
      <div className="flex-1">
        <h4 className="font-semibold text-sm">{title}</h4>
        {message && (
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        )}
        {action && (
          <Button
            onClick={() => {
              action.onClick();
              toast.dismiss(t);
            }}
            size="sm"
            variant="outline"
            className="mt-2 h-7"
          >
            {action.label}
          </Button>
        )}
      </div>
      
      <Button
        onClick={() => toast.dismiss(t)}
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
      >
        <X className="w-3 h-3" />
      </Button>
    </motion.div>
  ));
}
