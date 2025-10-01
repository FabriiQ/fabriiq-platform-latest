'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Send,
  Paperclip as PaperclipIcon,
  Smile as SmileIcon,
  X,
  MessageSquare,
  Users,
  Settings,
  Search,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { toast } from 'sonner';

// Import our new components
import { ConversationList } from './ConversationList';
import { ThreadedMessageView } from './ThreadedMessageView';
import { NewConversationSubject } from './SubjectLineManager';
import { EnhancedMessageComposer } from './ThreadedMessageComposer';

interface ThreadedMessagingInterfaceProps {
  className?: string;
  defaultConversationId?: string;
  classId?: string; // For class-specific messaging
}

export const ThreadedMessagingInterface: React.FC<ThreadedMessagingInterfaceProps> = ({
  className,
  defaultConversationId,
  classId
}) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(defaultConversationId);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && selectedConversationId) {
        setShowConversationList(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedConversationId]);

  // Create conversation mutation
  const createConversationMutation = api.messaging.createConversation.useMutation({
    onSuccess: (result) => {
      setSelectedConversationId(result.conversation.id);
      setShowNewConversation(false);
      toast.success('Conversation created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create conversation: ' + error.message);
    }
  });

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
  };

  const handleCreateConversation = async (subject: string, participants: string[], type: 'direct' | 'group' | 'class' = 'direct') => {
    try {
      const result = await createConversationMutation.mutateAsync({
        subject,
        participants,
        type,
        classId: classId,
        priority: 'normal'
      });

      // Close the dialog and select the new conversation
      setShowNewConversation(false);
      if (result?.conversation?.id) {
        setSelectedConversationId(result.conversation.id);
      }

      toast.success('Conversation created successfully!');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation. Please try again.');
    }
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    if (isMobile) {
      setSelectedConversationId(undefined);
    }
  };

  return (
    <div className={cn("h-full flex", className)}>
      {/* Conversation List - Left Sidebar */}
      <div className={cn(
        "flex-shrink-0 border-r",
        isMobile ? (showConversationList ? "w-full" : "hidden") : "w-80"
      )}>
        <ConversationList
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          className="h-full"
        />
      </div>

      {/* Main Message Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        isMobile && showConversationList ? "hidden" : "flex"
      )}>
        {selectedConversationId ? (
          <>
            {/* Mobile Back Button */}
            {isMobile && (
              <div className="p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToList}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Back to Conversations
                </Button>
              </div>
            )}

            {/* Message Thread View */}
            <div className="flex-1">
              <ThreadedMessageView
                conversationId={selectedConversationId}
                className="h-full"
              />
            </div>

            {/* Message Composer */}
            <EnhancedMessageComposer
              conversationId={selectedConversationId}
              onMessageSent={() => {
                // Refresh messages - handled by React Query
              }}
              placeholder="Type your message..."
            />
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
            <div className="text-center max-w-md p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to Messages
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Select a conversation from the sidebar to start messaging, or create a new conversation to connect with your colleagues.
              </p>
              <Button
                onClick={handleNewConversation}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Users className="h-4 w-4" />
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4"
              onClick={() => setShowNewConversation(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <NewConversationDialog
            onCreateConversation={handleCreateConversation}
            onCancel={() => setShowNewConversation(false)}
            classId={classId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// New Conversation Dialog Component
interface NewConversationDialogProps {
  onCreateConversation: (subject: string, participants: string[], type?: 'direct' | 'group' | 'class') => void;
  onCancel: () => void;
  classId?: string;
}

const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  onCreateConversation,
  onCancel,
  classId
}) => {
  const [step, setStep] = useState<'subject' | 'participants'>('subject');
  const [subject, setSubject] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'class'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch available users for messaging
  const { data: availableUsers, isLoading } = api.messaging.getAvailableUsers.useQuery({
    classId: classId,
    search: searchQuery
  });

  const handleSubjectSet = (newSubject: string) => {
    setSubject(newSubject);
    setStep('participants');
  };

  const handleCreateConversation = async () => {
    if (!subject.trim() || selectedParticipants.length === 0) {
      toast.error('Please provide a subject and select participants');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateConversation(subject, selectedParticipants, conversationType);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (step === 'subject') {
    return (
      <NewConversationSubject
        onSubjectSet={handleSubjectSet}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Subject: {subject}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep('subject')}
        >
          Change Subject
        </Button>
      </div>

      <div>
        <h4 className="font-medium mb-2">Select Participants</h4>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Participants */}
        {selectedParticipants.length > 0 && (
          <div className="mb-3">
            <div className="text-sm text-muted-foreground mb-2">Selected ({selectedParticipants.length}):</div>
            <div className="flex flex-wrap gap-1">
              {selectedParticipants.map((participantId) => {
                const user = availableUsers?.find((u: any) => u.id === participantId);
                return user ? (
                  <Badge key={participantId} variant="secondary" className="text-xs">
                    {user.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => toggleParticipant(participantId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Available Users List */}
        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading participants...
            </div>
          ) : availableUsers && availableUsers.length > 0 ? (
            availableUsers.map((user: any) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                  selectedParticipants.includes(user.id) && "bg-blue-50 border border-blue-200"
                )}
                onClick={() => toggleParticipant(user.id)}
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  {user.role && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  )}
                </div>
                {selectedParticipants.includes(user.id) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {searchQuery ? 'No participants found matching your search.' : 'No participants available.'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button onClick={onCancel} variant="outline">
          Cancel
        </Button>
        <Button
          onClick={handleCreateConversation}
          disabled={selectedParticipants.length === 0 || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Conversation'
          )}
        </Button>
      </div>
    </div>
  );
};
