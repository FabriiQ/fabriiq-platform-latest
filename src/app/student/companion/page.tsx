'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useStudentAssistant } from '@/features/student-assistant/hooks/use-student-assistant';
import { MessageList } from '@/features/student-assistant/components/MessageList';
import { MessageInput } from '@/features/student-assistant/components/MessageInput';
import { TypingIndicator } from '@/features/student-assistant/components/TypingIndicator';
import { ConversationHistory } from '@/features/student-assistant/components/ConversationHistory';
// import { ProactiveSuggestionList } from '@/features/student-assistant/components/ProactiveSuggestionList';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Settings, ChevronLeft, Globe, BookOpen, Target, ChevronDown, History } from 'lucide-react';
import { useResponsive } from '@/lib/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { StudentAssistantContext } from '@/features/student-assistant/types';
import { api } from '@/trpc/react';

export default function StudentCompanionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(true);
  const [selectedMode, setSelectedMode] = useState('general');
  const [selectedContext, setSelectedContext] = useState({
    classId: '',
    subjectId: '',
    topicId: ''
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  const {
    messages,
    isTyping,
    sendMessage,
    isOpen,
    setIsOpen,
    loadConversation,
    clearMessages,
    saveCurrentConversation,
  } = useStudentAssistant();

  // Mock proactive suggestions for now (can be implemented later)
  const proactiveSuggestions: any[] = [];
  const handleSuggestionClick = (suggestion: any) => {
    // Handle suggestion click - can be implemented later
    console.log('Suggestion clicked:', suggestion);
  };

  // Fetch real data from API
  const { data: studentClasses, isLoading: isLoadingClasses } = api.student.getStudentClasses.useQuery(
    { studentId: session?.user?.id || '' },
    {
      enabled: !!session?.user?.id,
      refetchOnWindowFocus: false,
    }
  );

  // Get the selected class to fetch its subjects
  const selectedClass = studentClasses?.find(cls => cls.id === selectedContext.classId);
  const courseId = selectedClass?.courseCampus?.course?.id;

  // Fetch subjects for the selected class
  const { data: classSubjects, isLoading: isLoadingSubjects } = api.subject.getSubjectsByCourse.useQuery(
    { courseId: courseId || '' },
    {
      enabled: !!courseId,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch topics for the selected subject
  const { data: subjectTopics, isLoading: isLoadingTopics } = api.subjectTopic.list.useQuery(
    {
      subjectId: selectedContext.subjectId || '',
      status: 'ACTIVE',
      pageSize: 50
    },
    {
      enabled: !!selectedContext.subjectId,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch learning outcomes for the selected topic
  const { data: topicLearningOutcomes, isLoading: isLoadingLearningOutcomes } = api.learningOutcome.getByTopic.useQuery(
    { topicId: selectedContext.topicId || '' },
    {
      enabled: !!selectedContext.topicId,
      refetchOnWindowFocus: false,
    }
  );

  const getAvailableSubjects = () => {
    return classSubjects || [];
  };

  const getAvailableTopics = () => {
    return subjectTopics?.data || [];
  };

  // Student AI Companion Modes based on educational research
  const companionModes = [
    {
      id: 'general',
      name: 'General Chat',
      description: 'Open conversation for any questions or topics',
      icon: '💬',
      color: 'bg-gray-100 text-gray-800'
    },
    {
      id: 'homework',
      name: 'Homework Help',
      description: 'Get guided assistance with homework problems',
      icon: '📝',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'concept',
      name: 'Concept Explanation',
      description: 'Understand difficult concepts with clear explanations',
      icon: '💡',
      color: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'study',
      name: 'Study Guide',
      description: 'Create study plans and review materials',
      icon: '📚',
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'practice',
      name: 'Practice Quiz',
      description: 'Test your knowledge with practice questions',
      icon: '🎯',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'exam',
      name: 'Exam Prep',
      description: 'Prepare for upcoming tests and exams',
      icon: '🎓',
      color: 'bg-red-100 text-red-800'
    },
    {
      id: 'research',
      name: 'Research Helper',
      description: 'Find and organize information for projects',
      icon: '🔍',
      color: 'bg-indigo-100 text-indigo-800'
    }
  ];

  const getCurrentMode = () => {
    return companionModes.find(mode => mode.id === selectedMode) || companionModes[0];
  };

  const getContextualPlaceholder = () => {
    const mode = getCurrentMode();
    const hasContext = selectedContext.classId || selectedContext.subjectId || selectedContext.topicId;

    const basePlaceholders = {
      general: "Ask me anything about your studies...",
      homework: "Describe your homework problem and I'll guide you through it...",
      concept: "What concept would you like me to explain?",
      study: "What topic would you like to create a study guide for?",
      practice: "What subject would you like to practice with quiz questions?",
      exam: "What exam are you preparing for? I'll help you study...",
      research: "What topic are you researching? I'll help you find information..."
    };

    let placeholder = basePlaceholders[selectedMode] || basePlaceholders.general;

    if (hasContext) {
      const contextParts: string[] = [];
      if (selectedContext.topicId) {
        const topic = getAvailableTopics().find((t: any) => t.id === selectedContext.topicId);
        if (topic?.title) contextParts.push(topic.title);
      } else if (selectedContext.subjectId) {
        const subject = getAvailableSubjects().find((s: any) => s.id === selectedContext.subjectId);
        if (subject?.name) contextParts.push(subject.name);
      } else if (selectedContext.classId) {
        const cls = studentClasses?.find(c => c.id === selectedContext.classId);
        if (cls?.name) contextParts.push(cls.name);
      }

      if (contextParts.length > 0) {
        placeholder = `Ask about ${contextParts.join(' - ')} or anything else...`;
      }
    }

    return placeholder;
  };

  // Auto-save conversation when messages change
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      // Debounce the save to avoid too frequent saves
      const timeoutId = setTimeout(() => {
        saveCurrentConversation(currentConversationId);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, currentConversationId, saveCurrentConversation]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      redirect('/auth/signin');
    }
  }, [session, status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // Build enhanced student context with selected context and mode
  const buildEnhancedContext = () => {
    const currentClass = selectedContext.classId
      ? studentClasses?.find(c => c.id === selectedContext.classId)
      : undefined;

    const currentSubject = selectedContext.subjectId
      ? getAvailableSubjects().find((s: any) => s.id === selectedContext.subjectId)
      : undefined;

    const currentTopic = selectedContext.topicId
      ? getAvailableTopics().find((t: any) => t.id === selectedContext.topicId)
      : undefined;

    // Build educational metadata for internal use (not exposed to student)
    const educationalMetadata = currentTopic ? {
      topic: {
        id: currentTopic.id,
        title: currentTopic.title,
        code: currentTopic.code,
        description: currentTopic.description,
        keywords: currentTopic.keywords || [],
        competencyLevel: currentTopic.competencyLevel,
        estimatedMinutes: currentTopic.estimatedMinutes,
        bloomsDistribution: currentTopic.bloomsDistribution,
      },
      learningOutcomes: topicLearningOutcomes || [],
      bloomsLevels: topicLearningOutcomes?.map(lo => lo.bloomsLevel).filter((level, index, arr) => arr.indexOf(level) === index) || [],
    } : undefined;

    return {
      student: {
        id: session.user.id,
        name: session.user.name || 'Student',
        gradeLevel: undefined, // TODO: Get from user profile
      },
      currentClass: currentClass ? {
        id: currentClass.id,
        name: currentClass.name,
        subject: currentSubject ? {
          id: currentSubject.id,
          name: currentSubject.name,
          code: currentSubject.code
        } : undefined
      } : undefined,
      currentActivity: currentTopic ? {
        id: currentTopic.id,
        title: currentTopic.title,
        type: 'topic'
      } : undefined,
      // Internal educational metadata (not exposed to student UI)
      _internal: {
        educationalMetadata,
        hasDetailedContext: !!educationalMetadata,
      },
      currentPage: {
        path: '/student/companion',
        title: 'Student Companion',
      },
      // Additional context for AI
      learningMode: selectedMode,
      modeDescription: getCurrentMode().description,
      searchEnabled: isSearchEnabled,
      contextSummary: buildContextSummary()
    };
  };

  const buildContextSummary = () => {
    const parts: string[] = [];
    if (selectedContext.classId) {
      const cls = studentClasses?.find(c => c.id === selectedContext.classId);
      if (cls?.name) parts.push(`Class: ${cls.name}`);
    }
    if (selectedContext.subjectId) {
      const subject = getAvailableSubjects().find((s: any) => s.id === selectedContext.subjectId);
      if (subject?.name) parts.push(`Subject: ${subject.name}`);
    }
    if (selectedContext.topicId) {
      const topic = getAvailableTopics().find((t: any) => t.id === selectedContext.topicId);
      if (topic?.title) {
        parts.push(`Topic: ${topic.title}`);

        // Add educational metadata for AI context (not shown to student)
        if (topicLearningOutcomes && topicLearningOutcomes.length > 0) {
          const bloomsLevels = topicLearningOutcomes.map(lo => lo.bloomsLevel).filter((level, index, arr) => arr.indexOf(level) === index);
          parts.push(`Learning Outcomes: ${topicLearningOutcomes.length} outcomes`);
          parts.push(`Bloom's Levels: ${bloomsLevels.join(', ')}`);
        }

        if (topic.keywords && topic.keywords.length > 0) {
          parts.push(`Keywords: ${topic.keywords.slice(0, 5).join(', ')}`);
        }

        if (topic.competencyLevel) {
          parts.push(`Competency: ${topic.competencyLevel}`);
        }
      }
    }
    parts.push(`Mode: ${getCurrentMode().name}`);
    if (isSearchEnabled) {
      parts.push('Internet search enabled');
    }
    return parts.join(' | ');
  };

  const handleBackClick = () => {
    router.back();
  };

  const handleConversationSelect = async (conversationId: string) => {
    // Save current conversation if there are messages
    if (currentConversationId && messages.length > 0) {
      saveCurrentConversation(currentConversationId);
    }

    setCurrentConversationId(conversationId);
    await loadConversation(conversationId);
  };

  const handleNewConversation = () => {
    // Save current conversation if there are messages
    if (currentConversationId && messages.length > 0) {
      saveCurrentConversation(currentConversationId);
    }

    setCurrentConversationId(undefined);
    clearMessages();
  };

  return (
    <div className="h-screen bg-background flex">
      {/* History Panel */}
      {showHistoryPanel && (
        <ConversationHistory
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          collapsed={false}
          onToggleCollapse={() => setShowHistoryPanel(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header - Fixed height, no scroll */}
        <div className={cn(
          "border-b bg-background flex-shrink-0 z-10",
          isMobile ? "p-3" : "p-4"
        )}>
          {/* Top row - Title and action buttons */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={handleBackClick}
                className="flex items-center gap-2"
              >
                <ChevronLeft className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                {!isMobile && "Back"}
              </Button>
              <h1 className={cn(
                "font-semibold",
                isMobile ? "text-lg" : "text-xl"
              )}>Learning Companion</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className={cn(
                  "flex items-center gap-2",
                  showHistoryPanel && "bg-muted"
                )}
              >
                <History className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                {!isMobile && "History"}
              </Button>

              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={() => setIsSearchMode(!isSearchMode)}
                className={cn(
                  "flex items-center gap-2",
                  isSearchMode && "bg-muted"
                )}
              >
                <Search className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                {!isMobile && "Search"}
              </Button>

              <Button
                variant="ghost"
                size={isMobile ? "sm" : "default"}
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className={cn(
                  "flex items-center gap-2",
                  showSettingsPanel && "bg-muted"
                )}
              >
                <Settings className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
                {!isMobile && "Settings"}
              </Button>
            </div>
          </div>

          {/* Context Selector Row - Compact */}
          <div className="flex flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
              <Select
                value={selectedContext.classId}
                onValueChange={(value) => setSelectedContext(prev => ({
                  ...prev,
                  classId: value,
                  subjectId: '',
                  topicId: ''
                }))}
              >
                <SelectTrigger className={cn("text-xs", isMobile ? "w-[120px]" : "w-[140px]")}>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  {(studentClasses || []).map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedContext.classId && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={selectedContext.subjectId}
                  onValueChange={(value) => setSelectedContext(prev => ({
                    ...prev,
                    subjectId: value,
                    topicId: ''
                  }))}
                >
                  <SelectTrigger className={cn("text-xs", isMobile ? "w-[100px]" : "w-[120px]")}>
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSubjects().map((subject: any) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedContext.subjectId && (
              <div className="flex items-center gap-1">
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                <Select
                  value={selectedContext.topicId}
                  onValueChange={(value) => setSelectedContext(prev => ({
                    ...prev,
                    topicId: value
                  }))}
                >
                  <SelectTrigger className={cn("text-xs", isMobile ? "w-[90px]" : "w-[110px]")}>
                    <SelectValue placeholder="Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTopics().map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSearchEnabled && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Globe className="h-2 w-2" />
                Search
              </Badge>
            )}
          </div>

          {/* Mode Selector Row - Compact */}
          <div className="flex flex-wrap gap-1">
            {companionModes.map((mode) => (
              <Button
                key={mode.id}
                variant={selectedMode === mode.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  "h-7 px-2 text-xs",
                  selectedMode === mode.id && "shadow-sm"
                )}
              >
                <span className="mr-1">{mode.icon}</span>
                {!isMobile && <span>{mode.name}</span>}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {isSearchMode ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold mb-4">Search Previous Conversations</h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Search your learning conversations..."
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="text-sm text-muted-foreground">
                    Search through your previous conversations with the learning companion to find specific topics, explanations, or guidance.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : showSettingsPanel ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold mb-4">Companion Settings</h2>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Internet Search</h3>
                      <Switch
                        checked={isSearchEnabled}
                        onCheckedChange={setIsSearchEnabled}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable the companion to search the internet for additional information and resources.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Learning Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize how your learning companion interacts with you and provides guidance.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Notification Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage when and how you receive proactive learning suggestions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Context Display - Fixed height */}
            {(selectedContext.classId || selectedMode !== 'general') && (
              <div className="border-b p-2 bg-muted/30 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Context:</span>
                  {selectedContext.classId && (
                    <Badge variant="secondary" className="text-xs h-5">
                      📚 {studentClasses?.find(c => c.id === selectedContext.classId)?.name}
                    </Badge>
                  )}
                  {selectedContext.subjectId && (
                    <Badge variant="secondary" className="text-xs h-5">
                      🎯 {getAvailableSubjects().find((s: any) => s.id === selectedContext.subjectId)?.name}
                    </Badge>
                  )}
                  {selectedContext.topicId && (
                    <Badge variant="secondary" className="text-xs h-5">
                      📝 {getAvailableTopics().find((t: any) => t.id === selectedContext.topicId)?.title}
                    </Badge>
                  )}
                  {selectedMode !== 'general' && (
                    <Badge variant="outline" className="text-xs h-5">
                      {getCurrentMode().icon} {getCurrentMode().name}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Messages - Scrollable area */}
            <div className="flex-1 min-h-0 relative">
              <MessageList
                messages={messages}
                className="absolute inset-0"
              />

              {/* Typing Indicator */}
              {isTyping && (
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-background/95 backdrop-blur-sm">
                  <TypingIndicator />
                </div>
              )}
            </div>

            {/* Message Input - Fixed at bottom */}
            <div className="border-t p-3 flex-shrink-0">
              <div className="space-y-2">
                {/* Mode-specific guidance */}
                {selectedMode !== 'general' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <strong>{getCurrentMode().name} Mode:</strong> {getCurrentMode().description}
                  </div>
                )}

                <MessageInput
                  placeholder={getContextualPlaceholder()}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
