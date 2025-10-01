import { memo } from 'react';
import { CrossIcon } from './icons';
import { Button } from '@/components/ui/button';
import { useArtifact } from '../contexts/artifact-context';

function PureArtifactCloseButton() {
  const { resetArtifact } = useArtifact();

  return (
    <Button
      data-testid="artifact-close-button"
      variant="outline"
      className="h-fit p-2 dark:hover:bg-zinc-700"
      onClick={() => {
        resetArtifact();
      }}
    >
      <CrossIcon size={18} />
    </Button>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
