'use client';

import React from 'react';
import { ThreadedMessagingInterface } from './ThreadedMessagingInterface';
import { InboxManager } from './InboxManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/lib/hooks/use-responsive';

interface MessagingIntegrationProps {
  className?: string;
  defaultView?: 'conversations' | 'inbox';
  classId?: string;
  userId?: string;
  role?: 'student' | 'teacher' | 'admin';
}

/**
 * Integration component that provides both new threaded messaging
 * and backward compatibility with existing inbox system
 */
export const MessagingIntegration: React.FC<MessagingIntegrationProps> = ({
  className,
  defaultView = 'conversations',
  classId,
  userId,
  role = 'student'
}) => {
  const { isMobile } = useResponsive();

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className={cn("pb-3", isMobile && "pb-2 px-3")}>
        <CardTitle className={cn("flex items-center gap-2", isMobile && "text-lg")}>
          <MessageSquare className={cn("h-5 w-5", isMobile && "h-4 w-4")} />
          Messages
        </CardTitle>
      </CardHeader>

      <CardContent className={cn("flex-1 p-0", isMobile && "px-2")}>
        <Tabs defaultValue="conversations" className="h-full flex flex-col">
          <TabsList className={cn("grid w-full grid-cols-2 mx-4 mb-4", isMobile && "mx-2 mb-2")}>
            <TabsTrigger value="conversations" className={cn("flex items-center gap-2", isMobile && "gap-1 text-sm")}>
              <MessageSquare className={cn("h-4 w-4", isMobile && "h-3 w-3")} />
              <span className={isMobile ? "hidden" : "inline"}>Conversations</span>
              <span className={isMobile ? "inline" : "hidden"}>💬</span>
            </TabsTrigger>
            <TabsTrigger value="help" className={cn("flex items-center gap-2", isMobile && "gap-1 text-sm")}>
              <HelpCircle className={cn("h-4 w-4", isMobile && "h-3 w-3")} />
              <span className={isMobile ? "hidden" : "inline"}>Help</span>
              <span className={isMobile ? "inline" : "hidden"}>❓</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="flex-1 m-0">
            <ThreadedMessagingInterface
              className="h-full"
              classId={classId}
            />
          </TabsContent>

          <TabsContent value="help" className="flex-1 m-0">
            <div className="p-6 text-center">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
              <p className="text-muted-foreground mb-4">
                Contact your teachers or administrators for assistance with your studies.
              </p>
              <Button onClick={() => {
                // Switch to conversations tab and start new conversation
                document.querySelector('[value="conversations"]')?.click();
              }}>
                Start New Conversation
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * Simplified messaging interface for specific use cases
 */
interface SimpleMessagingProps {
  conversationId?: string;
  classId?: string;
  className?: string;
}

export const SimpleMessaging: React.FC<SimpleMessagingProps> = ({
  conversationId,
  classId,
  className
}) => {
  return (
    <ThreadedMessagingInterface
      className={className}
      defaultConversationId={conversationId}
      classId={classId}
    />
  );
};

/**
 * Class-specific messaging component
 */
interface ClassMessagingProps {
  classId: string;
  className?: string;
}

export const ClassMessaging: React.FC<ClassMessagingProps> = ({
  classId,
  className
}) => {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Class Messages
          </CardTitle>
          <Badge variant="outline">Class Discussion</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ThreadedMessagingInterface
          className="h-full"
          classId={classId}
        />
      </CardContent>
    </Card>
  );
};

/**
 * Mobile-optimized messaging component
 */
interface MobileMessagingProps {
  className?: string;
  classId?: string;
}

export const MobileMessaging: React.FC<MobileMessagingProps> = ({
  className,
  classId
}) => {
  return (
    <div className={cn("h-screen flex flex-col", className)}>
      <ThreadedMessagingInterface
        className="flex-1"
        classId={classId}
      />
    </div>
  );
};

/**
 * Backward compatibility wrapper for existing messaging components
 */
interface LegacyMessagingWrapperProps {
  children?: React.ReactNode;
  enableNewInterface?: boolean;
  className?: string;
}

export const LegacyMessagingWrapper: React.FC<LegacyMessagingWrapperProps> = ({
  children,
  enableNewInterface = true,
  className
}) => {
  if (enableNewInterface) {
    return (
      <MessagingIntegration
        className={className}
        defaultView="conversations"
      />
    );
  }

  // Fallback to legacy interface
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Export all components for easy integration
export { ThreadedMessagingInterface } from './ThreadedMessagingInterface';
export { ConversationList } from './ConversationList';
export { ThreadedMessageView } from './ThreadedMessageView';
export { SubjectLineManager } from './SubjectLineManager';
export { ThreadedMessageComposer } from './ThreadedMessageComposer';

// Re-export existing components for backward compatibility
export { InboxManager } from './InboxManager';
export { MessageComposer } from './MessageComposer';
export { MessageInterface } from './MessageInterface';
