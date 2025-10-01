'use client';

import { useState } from 'react';
import { useTeacherAssistant } from '@/features/teacher-assistant/hooks/use-teacher-assistant';
import { MessageList } from '@/features/teacher-assistant/components/MessageList';
import { MessageInput } from '@/features/teacher-assistant/components/MessageInput';
import { TypingIndicator } from '@/features/teacher-assistant/components/TypingIndicator';
import { SettingsPanel } from '@/features/teacher-assistant/components/SettingsPanel';
import { TeacherAssistantCanvasMode } from '@/features/teacher-assistant/components/TeacherAssistantCanvasMode';
import { WorksheetModeSelector } from '@/features/teacher-assistant/components/WorksheetModeSelector';
import { Button } from '@/components/ui/core/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Search,
  Settings,
  FileText,
  ExternalLink,
  Zap,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Teacher Assistant Page - Claude-like interface
 * 
 * Features:
 * - Full-page conversation interface with markdown support
 * - Tabbed navigation for different modes
 * - Canvas mode for document creation
 * - Curriculum alignment integration
 * - Settings panel
 */
export default function TeacherAssistantPage() {
  const { 
    messages, 
    isTyping, 
    isSearchMode,
    setIsSearchMode,
    isCanvasMode,
    setIsCanvasMode
  } = useTeacherAssistant();
  
  const [activeTab, setActiveTab] = useState('chat');
  const [showCanvas, setShowCanvas] = useState(false);
  const [showWorksheetSelector, setShowWorksheetSelector] = useState(false);
  const [worksheetSelection, setWorksheetSelection] = useState<any>(null);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Teacher Assistant</h1>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI-Powered</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCanvas(true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Canvas Mode
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conversation
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isSearchMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsSearchMode(!isSearchMode)}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      {isSearchMode ? "Exit Search" : "Search Mode"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWorksheetSelector(true)}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Worksheet Mode
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 flex flex-col min-h-0">
                  <MessageList className="flex-1 overflow-y-auto px-6" />
                  {isTyping && <TypingIndicator className="px-6 pb-2" />}
                  <div className="border-t p-6">
                    <MessageInput />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Assistant Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <SettingsPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Canvas Mode */}
      <TeacherAssistantCanvasMode
        isOpen={showCanvas}
        onClose={() => setShowCanvas(false)}
      />

      {/* Worksheet Mode Selector */}
      <WorksheetModeSelector
        isOpen={showWorksheetSelector}
        onClose={() => setShowWorksheetSelector(false)}
        onConfirm={(selection) => {
          setWorksheetSelection(selection);
          setShowCanvas(true); // Auto-open canvas mode
          setShowWorksheetSelector(false);
        }}
      />
    </div>
  );
}
