'use client';

import { motion } from 'framer-motion';
import { Loader2, FileText, MessageSquare, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkeletonMessageProps {
  className?: string;
}

export function SkeletonMessage({ className }: SkeletonMessageProps) {
  return (
    <div className={cn("flex gap-3 p-4", className)}>
      {/* Avatar skeleton */}
      <div className="w-8 h-8 bg-muted rounded-full animate-pulse flex-shrink-0" />
      
      {/* Message content skeleton */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-16 h-3 bg-muted rounded animate-pulse" />
          <div className="w-12 h-3 bg-muted/60 rounded animate-pulse" />
        </div>
        
        {/* Message lines */}
        <div className="space-y-2">
          <div className="w-full h-3 bg-muted rounded animate-pulse" />
          <div className="w-4/5 h-3 bg-muted rounded animate-pulse" />
          <div className="w-3/4 h-3 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface TypingIndicatorProps {
  className?: string;
  message?: string;
}

export function TypingIndicator({ className, message = "Analyzing your request..." }: TypingIndicatorProps) {
  return (
    <motion.div
      className={cn("flex items-center gap-3 p-4 text-muted-foreground", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
        <Zap className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm">{message}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface DocumentGenerationProgressProps {
  progress: number;
  stage: 'analyzing' | 'generating' | 'formatting' | 'finalizing';
  className?: string;
}

export function DocumentGenerationProgress({ 
  progress, 
  stage, 
  className 
}: DocumentGenerationProgressProps) {
  const stageMessages = {
    analyzing: 'Analyzing your request...',
    generating: 'Generating content...',
    formatting: 'Formatting document...',
    finalizing: 'Finalizing document...'
  };

  const stageIcons = {
    analyzing: Search,
    generating: MessageSquare,
    formatting: FileText,
    finalizing: Zap
  };

  const Icon = stageIcons[stage];

  return (
    <motion.div
      className={cn("p-4 bg-muted/30 rounded-lg border", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <span className="text-sm font-medium">{stageMessages[stage]}</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">
          {Math.round(progress)}% complete
        </span>
        <span className="text-xs text-muted-foreground">
          Stage {Object.keys(stageMessages).indexOf(stage) + 1} of 4
        </span>
      </div>
    </motion.div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  className, 
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

interface ContentSkeletonProps {
  lines?: number;
  className?: string;
}

export function ContentSkeleton({ lines = 5, className }: ContentSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div 
            className="h-3 bg-muted rounded animate-pulse"
            style={{ 
              width: `${Math.random() * 40 + 60}%`,
              animationDelay: `${i * 0.1}s`
            }}
          />
          {i % 3 === 0 && (
            <div 
              className="h-3 bg-muted/60 rounded animate-pulse"
              style={{ 
                width: `${Math.random() * 30 + 40}%`,
                animationDelay: `${i * 0.1 + 0.05}s`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface SearchingIndicatorProps {
  query?: string;
  className?: string;
}

export function SearchingIndicator({ query, className }: SearchingIndicatorProps) {
  return (
    <motion.div
      className={cn("flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
        <Search className="w-3 h-3 text-blue-600 dark:text-blue-300 animate-pulse" />
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Searching for information...
        </div>
        {query && (
          <div className="text-xs text-blue-600 dark:text-blue-300 truncate">
            "{query}"
          </div>
        )}
      </div>
      
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface ExportProgressProps {
  format: 'pdf' | 'word' | 'html' | 'text';
  stage: 'preparing' | 'converting' | 'downloading';
  className?: string;
}

export function ExportProgress({ format, stage, className }: ExportProgressProps) {
  const formatLabels = {
    pdf: 'PDF',
    word: 'Word',
    html: 'HTML',
    text: 'Text'
  };

  const stageMessages = {
    preparing: 'Preparing document...',
    converting: `Converting to ${formatLabels[format]}...`,
    downloading: 'Starting download...'
  };

  return (
    <motion.div
      className={cn("flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="w-6 h-6 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
        <FileText className="w-3 h-3 text-green-600 dark:text-green-300 animate-pulse" />
      </div>
      
      <span className="text-sm font-medium text-green-900 dark:text-green-100">
        {stageMessages[stage]}
      </span>
      
      <LoadingSpinner size="sm" className="text-green-600 dark:text-green-300" />
    </motion.div>
  );
}
