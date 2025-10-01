'use client';

import { toast } from 'sonner';
import { Editor, TextEditor } from '../../components/text-editor';
import { DocumentSkeleton } from '../../components/document-skeleton';
import { DiffView } from '../../components/diffview';
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
  WorksheetIcon,
  TeacherIcon,
} from '../../components/icons';
import { Artifact } from '../../components/create-artifact';
import type { UIArtifact } from '../../lib/types';

interface TextArtifactProps {
  content: string;
  isEditable: boolean;
  onContentChange: (content: string) => void;
  artifact: UIArtifact;
  mode?: 'read' | 'edit' | 'diff';
  isLoading?: boolean;
}

export function TextArtifactComponent({
  content,
  isEditable,
  onContentChange,
  artifact,
  mode = 'read',
  isLoading = false,
}: TextArtifactProps) {
  if (isLoading) {
    return <DocumentSkeleton artifactKind="text" />;
  }

  if (mode === 'diff') {
    // TODO: Implement diff view for version comparison
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Diff view coming soon...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <TextEditor
          content={content}
          isEditable={isEditable}
          onContentChange={onContentChange}
          placeholder="Start creating your educational content..."
          className="min-h-full"
        />
      </div>
    </div>
  );
}

interface TextArtifactMetadata {
  suggestions: Array<any>;
}

export const textArtifact = new Artifact<'text', TextArtifactMetadata>({
  kind: 'text',
  description: 'Useful for educational text content, like worksheets and lesson plans.',
  initialize: async ({ documentId, setMetadata }) => {
    // Initialize with empty suggestions for now
    setMetadata({
      suggestions: [],
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'data-textDelta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView oldContent={oldContent} newContent={newContent} />;
    }

    return (
      <div className="h-full flex flex-col">
        <Editor
          content={content}
          onSaveContent={onSaveContent}
          status={status as any}
          isCurrentVersion={isCurrentVersion}
          currentVersionIndex={currentVersionIndex}
          suggestions={metadata?.suggestions || []}
        />
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        return currentVersionIndex === 0;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        return isCurrentVersion;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Educational content copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: 'Add final polish',
      onClick: ({ sendMessage }) => {
        sendMessage('Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly for educational use.');
      },
    },
    {
      icon: <MessageIcon />,
      description: 'Educational suggestions',
      onClick: ({ sendMessage }) => {
        sendMessage('Please provide suggestions to improve this educational content, including differentiation strategies, assessment ideas, and extension activities.');
      },
    },
  ],
});
