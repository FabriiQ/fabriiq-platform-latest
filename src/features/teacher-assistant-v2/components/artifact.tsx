'use client';

import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { api } from '@/trpc/react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';


import { fetcher } from '../lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Toolbar } from './toolbar';
import { VersionFooter } from './version-footer';
import { ArtifactActions } from './artifact-actions';
import { ArtifactCloseButton } from './artifact-close-button';
import { ArtifactMessages } from './artifact-messages';
import { useArtifact } from '../contexts/artifact-context';
import { textArtifact } from '../artifacts/text/client';
import { imageArtifact } from '../artifacts/image/client';
import equal from 'fast-deep-equal';
import type { UIMessage } from 'ai';
import type { Attachment, ChatMessage, Document, UIArtifact } from '../lib/types';

export const artifactDefinitions = [
  textArtifact,
  imageArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];

interface ArtifactProps {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: 'idle' | 'loading' | 'error';
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  sendMessage: (message: string) => void;
  isReadonly?: boolean;
}

function PureArtifact({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  isReadonly = false,
}: ArtifactProps) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

  // Use tRPC to fetch document data - only when artifact is visible and we don't have content
  const {
    data: documents,
    isLoading: isDocumentsFetching,
    refetch: refetchDocuments,
  } = api.teacherAssistantV2.getDocument.useQuery(
    { id: artifact.documentId || '' },
    {
      enabled: !!(
        artifact.documentId &&
        artifact.documentId !== 'init' &&
        artifact.isVisible &&
        artifact.status !== 'streaming' &&
        (!artifact.content || artifact.content.trim().length === 0)
      ),
      retry: 1,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        // Update artifact with fetched document data if we don't have content
        if (data && (!artifact.content || artifact.content.trim().length === 0)) {
          const documentData = Array.isArray(data) ? data[0] : data;
          if (documentData) {
            setArtifact(prev => ({
              ...prev,
              content: documentData.content || prev.content,
              title: documentData.title || prev.title,
              status: 'idle',
            }));
          }
        }
      },
    }
  );

  // Normalize to array because some routers may return a single object
  const documentsArray = useMemo(() => {
    if (!documents) return undefined;
    return Array.isArray(documents) ? documents : [documents];
  }, [documents]);


  // tRPC mutation for saving documents
  const saveDocumentMutation = api.teacherAssistantV2.saveDocument.useMutation();


  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCurrentVersion = currentVersionIndex === 0;
  const document = documentsArray?.[0];

  const debouncedUpdateContent = useDebounceCallback(async (value: string) => {
    if (!artifact.documentId || artifact.documentId === 'init') return;

    try {
      await saveDocumentMutation.mutateAsync({
        id: artifact.documentId,
        content: value,
        title: artifact.title,
        kind: artifact.kind,
      });
      setIsContentDirty(false);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }, 500);

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (debounce) {
        setIsContentDirty(true);
        debouncedUpdateContent(updatedContent);
      } else {
        // Immediate save
        if (!artifact.documentId || artifact.documentId === 'init') return;

        saveDocumentMutation.mutate({
          id: artifact.documentId,
          content: updatedContent,
          title: artifact.title,
          kind: artifact.kind,
        });
        setIsContentDirty(false);
      }
    },
    [artifact.documentId, artifact.title, artifact.kind, debouncedUpdateContent, saveDocumentMutation],
  );

  const getDocumentContentById = useCallback(
    (index: number) => {
      if (!documentsArray || index >= documentsArray.length) return '';
      return documentsArray[index].content;
    },
    [documentsArray],
  );

  const handleVersionChange = useCallback(
    (type: 'next' | 'prev' | 'toggle' | 'latest') => {
      if (!documentsArray) return;

      switch (type) {
        case 'next':
          if (currentVersionIndex > 0) {
            setCurrentVersionIndex(currentVersionIndex - 1);
          }
          break;
        case 'prev':
          if (currentVersionIndex < documentsArray.length - 1) {
            setCurrentVersionIndex(currentVersionIndex + 1);
          }
          break;
        case 'toggle':
          setMode(mode === 'edit' ? 'diff' : 'edit');
          break;
        case 'latest':
          setCurrentVersionIndex(0);
          break;
      }
    },
    [currentVersionIndex, documentsArray, mode],
  );

  // Initialize artifact metadata
  useEffect(() => {
    const artifactDefinition = artifactDefinitions.find(
      (definition) => definition.kind === artifact.kind,
    );

    if (artifactDefinition && artifact.documentId && artifact.documentId !== 'init') {
      if (artifactDefinition.initialize) {
        artifactDefinition.initialize({
          documentId: artifact.documentId,
          setMetadata,
        });
      }
    }
  }, [artifact.documentId, artifact.kind, setMetadata]);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    return null;
  }

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          data-testid="artifact"
          className="md:hidden fixed inset-0 z-50 flex bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Left conversation panel - improved responsive width */}
          <motion.div
            className="hidden sm:flex sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[400px] bg-muted dark:bg-background flex-col border-r border-border flex-shrink-0"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
          >
            {/* Version overlay */}
            {!isCurrentVersion && (
              <div className="absolute inset-0 bg-black/20 z-10" />
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-hidden">
              <ArtifactMessages
                chatId={chatId}
                status={status}
                messages={messages}
                setMessages={setMessages}
                isReadonly={isReadonly}
                artifactStatus={artifact.status}
              />
            </div>

            {/* Input area */}
            <div className="border-t border-border p-4">
              <MultimodalInput
                chatId={chatId}
                input={input}
                setInput={setInput}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                sendMessage={sendMessage}
                className="bg-background dark:bg-muted"
              />
            </div>
          </motion.div>

          {/* Right document panel - full width on mobile */}
          <motion.div
            className="flex flex-1 flex-col bg-background overflow-hidden"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
          >
            {/* Document header - improved responsive layout */}
            <div className="flex-shrink-0 p-3 md:p-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  {/* Mobile menu button - only show on mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:hidden p-1.5 flex-shrink-0"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    <Menu className="w-4 h-4" />
                  </Button>

                  <ArtifactCloseButton />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm md:text-base lg:text-lg truncate leading-tight">{artifact.title}</h2>
                    {isContentDirty ? (
                      <p className="text-xs text-muted-foreground mt-0.5">Saving changes...</p>
                    ) : document ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Updated {document?.createdAt ? formatDistanceToNow(new Date(document.createdAt), { addSuffix: true }) : ''}
                      </p>
                    ) : (
                      <div className="w-20 md:w-24 h-2 mt-1 bg-muted-foreground/20 rounded animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <ArtifactActions
                    artifact={artifact}
                    currentVersionIndex={currentVersionIndex}
                    handleVersionChange={handleVersionChange}
                    isCurrentVersion={isCurrentVersion}
                    mode={mode}
                    metadata={metadata}
                    setMetadata={setMetadata}
                  />
                </div>
              </div>
            </div>

            {/* Document content */}
            <div className="flex-1 overflow-hidden relative">
              <div className="h-full overflow-y-auto">
                <artifactDefinition.content
                  title={artifact.title}
                  content={
                    isCurrentVersion
                      ? artifact.content
                      : getDocumentContentById(currentVersionIndex)
                  }
                  mode={mode}
                  status={artifact.status}
                  currentVersionIndex={currentVersionIndex}
                  suggestions={[]}
                  onSaveContent={saveContent}
                  isInline={false}
                  isCurrentVersion={isCurrentVersion}
                  getDocumentContentById={getDocumentContentById}
                  isLoading={isDocumentsFetching && !artifact.content}
                  metadata={metadata}
                  setMetadata={setMetadata}
                />
              </div>

              {/* Toolbar */}
              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    isToolbarVisible={isToolbarVisible}
                    setIsToolbarVisible={setIsToolbarVisible}
                    sendMessage={sendMessage}
                    status={status}
                    stop={stop}
                    setMessages={setMessages}
                    artifactKind={artifact.kind}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documentsArray}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Mobile conversation overlay - full screen on small screens */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                className="fixed inset-0 z-50 sm:hidden bg-background flex flex-col"
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
                  <h3 className="font-semibold text-lg">Conversation</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Messages area - scrollable */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <ArtifactMessages
                    chatId={chatId}
                    status={status}
                    messages={messages}
                    setMessages={setMessages}
                    isReadonly={isReadonly}
                    artifactStatus={artifact.status}
                  />
                </div>

                {/* Input area - fixed at bottom */}
                <div className="border-t border-border p-3 bg-background/95 backdrop-blur-sm">
                  <MultimodalInput
                    chatId={chatId}
                    input={input}
                    setInput={setInput}
                    status={status}
                    stop={stop}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    messages={messages}
                    sendMessage={sendMessage}
                    className="bg-background dark:bg-muted"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.input !== nextProps.input) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;

  return true;
});
