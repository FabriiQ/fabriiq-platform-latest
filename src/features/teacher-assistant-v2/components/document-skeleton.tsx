'use client';

import { cn } from '../lib/utils';

interface DocumentSkeletonProps {
  artifactKind: 'text' | 'code' | 'image' | 'sheet';
  className?: string;
}

export function DocumentSkeleton({ artifactKind, className }: DocumentSkeletonProps) {
  return (
    <div className={cn('p-4 space-y-4 animate-pulse', className)}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>

      {/* Content skeleton based on artifact type */}
      {artifactKind === 'text' && (
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-4/5"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      )}

      {artifactKind === 'code' && (
        <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </div>
      )}

      {artifactKind === 'image' && (
        <div className="aspect-video bg-muted rounded-lg"></div>
      )}

      {artifactKind === 'sheet' && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-6 bg-muted/60 rounded"></div>
            <div className="h-6 bg-muted/60 rounded"></div>
            <div className="h-6 bg-muted/60 rounded"></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-6 bg-muted/60 rounded"></div>
            <div className="h-6 bg-muted/60 rounded"></div>
            <div className="h-6 bg-muted/60 rounded"></div>
          </div>
        </div>
      )}

      {/* Footer skeleton */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}
