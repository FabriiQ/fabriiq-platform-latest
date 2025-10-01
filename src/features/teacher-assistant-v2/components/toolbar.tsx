'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { StopIcon } from './icons';
import { artifactDefinitions } from './artifact';
import type { ArtifactKind } from '../lib/types';
import type { ArtifactToolbarItem } from './create-artifact';
import type { UIMessage } from 'ai';

type ToolProps = {
  description: string;
  icon: ReactNode;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  sendMessage: (message: string) => void;
  onClick: ({
    sendMessage,
  }: {
    sendMessage: (message: string) => void;
  }) => void;
};

function Tool({
  description,
  icon,
  selectedTool,
  setSelectedTool,
  isToolbarVisible,
  setIsToolbarVisible,
  isAnimating,
  sendMessage,
  onClick,
}: ToolProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="p-3 cursor-pointer hover:bg-muted rounded-full"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            onClick({ sendMessage });
            if (setIsToolbarVisible) {
              setIsToolbarVisible(false);
            }
          }}
        >
          {icon}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="left">{description}</TooltipContent>
    </Tooltip>
  );
}

function Tools({
  sendMessage,
  isAnimating,
  isToolbarVisible,
  selectedTool,
  setIsToolbarVisible,
  setSelectedTool,
  tools,
}: {
  sendMessage: (message: string) => void;
  isAnimating: boolean;
  isToolbarVisible?: boolean;
  selectedTool: string | null;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  tools: ArtifactToolbarItem[];
}) {
  return (
    <>
      {tools.map((tool) => (
        <Tool
          key={tool.description}
          description={tool.description}
          icon={tool.icon}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          isToolbarVisible={isToolbarVisible}
          setIsToolbarVisible={setIsToolbarVisible}
          isAnimating={isAnimating}
          sendMessage={sendMessage}
          onClick={tool.onClick}
        />
      ))}
    </>
  );
}

export const Toolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  sendMessage,
  status,
  stop,
  setMessages,
  artifactKind,
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  sendMessage: (message: string) => void;
  status: 'idle' | 'loading' | 'error';
  stop: () => void;
  setMessages: Dispatch<SetStateAction<UIMessage[]>>;
  artifactKind: ArtifactKind;
}) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startCloseTimer = () => {
    timeoutRef.current = setTimeout(() => {
      setIsToolbarVisible(false);
    }, 2000);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      setIsToolbarVisible(false);
    }
  }, [status, setIsToolbarVisible]);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifactKind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const toolsByArtifactKind = artifactDefinition.toolbar;

  if (toolsByArtifactKind.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="cursor-pointer absolute right-6 bottom-6 p-1.5 border rounded-full shadow-lg bg-background flex flex-col justify-end"
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={
          isToolbarVisible
            ? {
                opacity: 1,
                y: 0,
                height: toolsByArtifactKind.length * 50,
                transition: { delay: 0 },
                scale: 1,
              }
            : { opacity: 1, y: 0, height: 54, transition: { delay: 0 } }
        }
        exit={{ opacity: 0, y: -20, transition: { duration: 0.1 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onHoverStart={() => {
          if (status === 'loading') return;

          cancelCloseTimer();
          setIsToolbarVisible(true);
        }}
        onHoverEnd={() => {
          if (status === 'loading') return;

          startCloseTimer();
        }}
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
        ref={toolbarRef}
      >
        {status === 'loading' ? (
          <motion.div
            key="stop-icon"
            initial={{ scale: 1 }}
            animate={{ scale: 1.4 }}
            exit={{ scale: 1 }}
            className="p-3"
            onClick={() => {
              stop();
              setMessages((messages) => messages);
            }}
          >
            <StopIcon />
          </motion.div>
        ) : (
          <Tools
            key="tools"
            sendMessage={sendMessage}
            isAnimating={isAnimating}
            isToolbarVisible={isToolbarVisible}
            selectedTool={selectedTool}
            setIsToolbarVisible={setIsToolbarVisible}
            setSelectedTool={setSelectedTool}
            tools={toolsByArtifactKind}
          />
        )}
      </motion.div>
    </TooltipProvider>
  );
};
