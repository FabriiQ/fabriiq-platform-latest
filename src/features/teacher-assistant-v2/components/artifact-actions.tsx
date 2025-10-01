'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { artifactDefinitions } from './artifact';
import type { UIArtifact } from '../lib/types';
import { type Dispatch, memo, type SetStateAction, useState } from 'react';
import type { ArtifactActionContext } from './create-artifact';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { DownloadMenu } from './download-menu';

interface ArtifactActionsProps {
  artifact: UIArtifact;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: any;
  setMetadata: Dispatch<SetStateAction<any>>;
}

function PureArtifactActions({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };

  return (
    <div className="flex flex-row gap-2">
      {/* Download Menu */}
      <DownloadMenu
        content={artifact.content}
        title={artifact.title}
        className="h-8"
      />

      {/* Existing Actions */}
      {artifactDefinition.actions.map((action: any) => (
        <Tooltip key={action.description}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground',
                'border-border/50 hover:border-border',
                'transition-all duration-200',
                {
                  'opacity-50 cursor-not-allowed': isLoading || artifact.status === 'streaming' || (action.isDisabled && action.isDisabled(actionContext))
                }
              )}
              onClick={async () => {
                setIsLoading(true);

                try {
                  await Promise.resolve(action.onClick(actionContext));
                } catch (error) {
                  toast.error('Failed to execute action');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={
                isLoading || artifact.status === 'streaming'
                  ? true
                  : action.isDisabled
                    ? action.isDisabled(actionContext)
                    : false
              }
            >
              <span className="flex items-center justify-center">
                {action.icon}
              </span>
              {action.label && <span className="ml-1 text-xs">{action.label}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {action.description}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) return false;
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
      return false;
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
    if (prevProps.artifact.content !== nextProps.artifact.content) return false;

    return true;
  },
);
