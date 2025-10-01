'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { useArtifact } from '../contexts/artifact-context';
import { MarkdownRenderer } from './markdown-renderer';
import type { UIArtifact } from '../lib/types';

interface ArtifactPreviewProps {
  artifact: UIArtifact;
  className?: string;
}

// Normalize content coming from the model that may be wrapped in ```markdown fences
function unwrapMarkdownCodeFences(input: string): string {
  if (!input) return '';
  let out = input.trim();
  // Remove starting fence like ```markdown or ```
  out = out.replace(/^```(?:markdown|md)?\s*/i, '');
  // Remove trailing fence ``` (allow trailing whitespace)
  out = out.replace(/\s*```\s*$/i, '');
  return out;
}

function PureArtifactPreview({ artifact, className }: ArtifactPreviewProps) {
  const { setArtifact } = useArtifact();

  const handleOpenArtifact = () => {
    setArtifact((prev) => ({
      ...prev,
      isVisible: true,
    }));
  };

  const getArtifactIcon = () => {
    switch (artifact.kind) {
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'image':
        return <Eye className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getContentPreview = () => {
    if (artifact.kind === 'image') {
      return (
        <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Educational Image</p>
          </div>
        </div>
      );
    }

    // For text content, show a formatted preview using MarkdownRenderer
    const cleanContent = unwrapMarkdownCodeFences(artifact.content);
    const preview = cleanContent.slice(0, 300); // Slightly longer preview
    const hasMore = cleanContent.length > 300;

    return (
      <div className="text-sm leading-relaxed">
        <div className="prose prose-sm max-w-none dark:prose-invert [&>*]:mb-2 [&>*:last-child]:mb-0">
          <MarkdownRenderer content={preview} />
        </div>
        {hasMore && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <span className="text-primary font-medium text-xs">... (click to view more)</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'border border-border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
      onClick={handleOpenArtifact}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getArtifactIcon()}
          <h4 className="font-medium text-sm">{artifact.title}</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenArtifact();
          }}
        >
          <Eye className="w-4 h-4 mr-1" />
          Open
        </Button>
      </div>

      {/* Content Preview */}
      <div className="space-y-2">
        {getContentPreview()}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span className="capitalize">{artifact.kind} Document</span>
          <span>Click to open in editor</span>
        </div>
      </div>
    </div>
  );
}

export const ArtifactPreview = memo(PureArtifactPreview, (prevProps, nextProps) => {
  return (
    prevProps.artifact.title === nextProps.artifact.title &&
    prevProps.artifact.content === nextProps.artifact.content &&
    prevProps.artifact.kind === nextProps.artifact.kind &&
    prevProps.artifact.status === nextProps.artifact.status
  );
});
