'use client';

import { useState, useEffect, useRef } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { SearchInterface } from './SearchInterface';
import { TeacherAssistantCanvasMode } from './TeacherAssistantCanvasMode';
import { CurriculumAlignmentPanel } from './CurriculumAlignmentPanel';
import { SettingsPanel } from './SettingsPanel';
import { Button } from '@/components/ui/core/button';
import { X, Search, Settings, Target } from 'lucide-react';
import { useResponsive } from '@/lib/hooks/use-responsive';
import { cn } from '@/lib/utils';

interface TeacherAssistantDialogProps {
  className?: string;
}

/**
 * Dialog component for the teacher assistant
 * 
 * Mobile-first design with responsive layout
 * - Full-height sidebar on desktop
 * - Bottom sheet on mobile
 */
export function TeacherAssistantDialog({ className }: TeacherAssistantDialogProps) {
  const {
    isOpen,
    setIsOpen,
    isTyping,
    isSearchMode,
    setIsSearchMode,
    isCanvasMode,
    setIsCanvasMode,
    context
  } = useTeacherAssistant();
  
  const { isMobile } = useResponsive();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showCurriculumPanel, setShowCurriculumPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // Handle click outside to close on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen, isMobile]);
  
  // Prevent body scroll when dialog is open on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);
  
  if (!isOpen) return null;
  
  return (
    <div
      className={cn(
        "fixed z-50 bg-background shadow-xl transition-all duration-300",
        isMobile
          ? "inset-x-0 bottom-0 rounded-t-xl max-h-[90vh]"
          : "right-6 bottom-6 rounded-xl w-full max-w-[420px] max-h-[80vh]",
        className
      )}
      ref={dialogRef}
    >
      {/* Dialog Header */}
      <div className="flex items-center justify-between border-b p-4 bg-muted/30">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">
            {isSearchMode ? 'Search Resources' : 'Teacher Assistant'}
          </h2>
          {context.currentClass && (
            <p className="text-xs text-muted-foreground">
              {context.currentClass.name} • {context.currentClass.subject?.name}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchMode(!isSearchMode)}
            aria-label={isSearchMode ? "Chat mode" : "Search mode"}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCurriculumPanel(!showCurriculumPanel)}
            aria-label="Curriculum alignment"
            className={cn(showCurriculumPanel && "bg-primary/10 text-primary")}
          >
            <Target className="h-5 w-5" />
          </Button>
          {/* Canvas disabled for now per request */}
          {/*
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCanvasMode(true)}
            aria-label="Canvas mode"
          >
            <FileText className="h-5 w-5" />
          </Button>
          */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            aria-label="Settings"
            className={cn(showSettingsPanel && "bg-primary/10 text-primary")}
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Dialog Content */}
      <div className="flex flex-col h-[calc(90vh-8rem)] md:h-[calc(80vh-8rem)]">
        {isSearchMode ? (
          <SearchInterface />
        ) : showCurriculumPanel ? (
          <div className="flex-1 overflow-y-auto">
            <CurriculumAlignmentPanel className="p-4" />
          </div>
        ) : showSettingsPanel ? (
          <div className="flex-1 overflow-y-auto">
            <SettingsPanel className="p-4" />
          </div>
        ) : (
          <>
            <MessageList className="flex-1" />
            {isTyping && <TypingIndicator className="px-4 pb-2" />}
            <MessageInput className="border-t p-4" />
          </>
        )}
      </div>

      {/* Canvas Mode */}
      <TeacherAssistantCanvasMode
        isOpen={isCanvasMode}
        onClose={() => setIsCanvasMode(false)}
      />
    </div>
  );
}
