'use client';

import type { UIMessage } from 'ai';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { EnhancedContextSelector, type ContextData } from './enhanced-context-selector';
import { CompactModeSelector, type TeacherMode } from './compact-mode-selector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, History } from 'lucide-react';
import type { Attachment } from '../lib/types';
import { cn } from '../lib/utils';



interface MultimodalInputProps {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: 'idle' | 'loading' | 'error';
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  sendMessage: (message: string, searchEnabled?: boolean, context?: ContextData) => void;
  selectedMode?: TeacherMode | null;
  onModeChange?: (mode: TeacherMode | null) => void;
  className?: string;
  onToggleHistory?: () => void;
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  sendMessage,
  selectedMode,
  onModeChange,
  className,
  onToggleHistory,
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { width } = useWindowSize();

  // Search and context state
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [context, setContext] = useState<ContextData>({
    topicIds: [],
    topicNames: [],
    learningOutcomes: [],
    assessmentCriteria: [],
  });

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'teacher-assistant-input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      if (domValue !== input) {
        textareaRef.current.value = input;
        adjustHeight();
      }
    }
  }, [input]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const { url, pathname, contentType } = data;

          return {
            url,
            name: pathname,
            contentType: contentType,
          };
        } else {
          const { error } = await response.json();
          toast.error(error);
        }
      } catch (error) {
        toast.error('Failed to upload file, please try again!');
      }
    },
    [],
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...files.map((file) => ({
          url: '',
          name: file.name,
          contentType: file.type,
          size: file.size,
        })),
      ]);

      await Promise.all(
        files.map(async (file) => {
          const uploadedAttachment = await fileUpload(file);
          if (uploadedAttachment) {
            setAttachments((currentAttachments) =>
              currentAttachments.map((attachment) =>
                attachment.name === file.name ? uploadedAttachment : attachment,
              ),
            );
          }
        }),
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [fileUpload, setAttachments],
  );

  const submitForm = useCallback(() => {
    if (input.trim() === '' && attachments.length === 0) return;

    sendMessage(input, searchEnabled, context);
    setInput('');
    resetHeight();
    setAttachments([]);

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [input, attachments, sendMessage, setInput, setAttachments, width, searchEnabled, context]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitForm();
    }
  };

  // Dynamic placeholder text based on context
  const getPlaceholderText = () => {
    if (isLoading) return "AI is thinking...";
    if (searchEnabled) return "Ask me anything - I'll search for current information...";
    if (context?.subjectId) return `Ask about your selected subject...`;
    return "Ask your teacher assistant anything...";
  };

  const isLoading = status === 'loading';

  return (
    <div className={cn('relative w-full', className)}>
      {/* Enhanced attachments preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-t bg-muted/10">
          <div className="flex items-center gap-2 mb-2">
            <PaperclipIcon size={14} />
            <span className="text-xs font-medium text-muted-foreground">
              {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* File type icon */}
                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {attachment.name.split('.').pop()?.toUpperCase().slice(0, 2) || 'F'}
                    </span>
                  </div>
                  <span className="text-sm truncate max-w-32 font-medium">
                    {attachment.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 transition-colors duration-200"
                  title="Remove attachment"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced control buttons with better UX */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-t bg-muted/20">
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleHistory}
              className="flex items-center gap-2 text-xs"
              title="Toggle conversation history"
            >
              <History size={14} />
              <span className="hidden sm:inline">History</span>
            </Button>
          )}
          <Button
            variant={searchEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSearchEnabled(!searchEnabled)}
            className="gap-2 transition-all duration-200"
          >
            {searchEnabled ? (
              <>
                <Search className="h-4 w-4 text-green-600" />
                <span className="hidden sm:inline">Search Enabled</span>
                <span className="sm:hidden">Search On</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-gray-500" />
                <span className="hidden sm:inline">Search Disabled</span>
                <span className="sm:hidden">Search Off</span>
              </>
            )}
          </Button>

          <EnhancedContextSelector
            onContextChange={setContext}
          />

          {onModeChange && (
            <CompactModeSelector
              selectedMode={selectedMode || null}
              onModeChange={onModeChange}
            />
          )}
        </div>

        <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md">
          {searchEnabled ? (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI will search for current information
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              Using existing knowledge only
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-3 p-4 border-t bg-background">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder={getPlaceholderText()}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] max-h-[200px] resize-none pr-16 border-2 focus:border-primary/50 transition-colors duration-200"
            disabled={isLoading}
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="hover:bg-primary/10 transition-colors duration-200"
              title="Attach files (images, PDFs, documents)"
            >
              <PaperclipIcon size={16} />
            </Button>
          </div>

          {/* Character count for long inputs */}
          {input.length > 500 && (
            <div className="absolute right-2 top-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              {input.length}/2000
            </div>
          )}
        </div>

        <Button
          onClick={isLoading ? stop : submitForm}
          disabled={!isLoading && input.trim() === '' && attachments.length === 0}
          size="sm"
          className={cn(
            "shrink-0 h-12 w-12 transition-all duration-200",
            isLoading
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-primary hover:bg-primary/90",
            input.trim() !== '' || attachments.length > 0
              ? "scale-105 shadow-lg"
              : "scale-100"
          )}
          title={isLoading ? "Stop generation" : "Send message (Ctrl+Enter)"}
        >
          {isLoading ? <StopIcon size={18} /> : <ArrowUpIcon size={18} />}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.attachments.length !== nextProps.attachments.length) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;

  return true;
});
