# Messaging System Implementation Guide

## Overview

The WhatsApp-like threaded messaging system has been successfully implemented and integrated with the existing FabriiQ platform. This guide provides instructions for using and maintaining the new system.

## Quick Start

### Using the New Messaging Interface

1. **Access the Messaging System**
   ```tsx
   import { MessagingIntegration } from '@/features/messaging/components/MessagingIntegration';
   
   // Full messaging interface with tabs
   <MessagingIntegration 
     role="student" // or "teacher" or "admin"
     classId="optional-class-id"
     defaultView="conversations" // or "inbox"
   />
   ```

2. **Simple Threaded Messaging**
   ```tsx
   import { SimpleMessaging } from '@/features/messaging/components/MessagingIntegration';
   
   // Just the threaded interface
   <SimpleMessaging 
     classId="class-123"
     conversationId="optional-conversation-id"
   />
   ```

3. **Class-Specific Messaging**
   ```tsx
   import { ClassMessaging } from '@/features/messaging/components/MessagingIntegration';
   
   // Class discussion interface
   <ClassMessaging classId="class-123" />
   ```

## Key Features

### 1. Conversation Management
- **Subject Lines**: Required for all new conversations
- **Smart Suggestions**: Auto-suggest subjects based on class, course, and usage history
- **Search & Filter**: Find conversations by subject or content
- **Organization**: Pin important conversations, archive old ones

### 2. Threaded Messaging
- **Reply Threading**: Visual thread hierarchy with indentation
- **Message Reactions**: Emoji reactions with user tracking
- **Read Receipts**: Individual message read status
- **Real-time Updates**: Live message delivery and typing indicators

### 3. Enhanced Composer
- **File Attachments**: Support for images, documents, and media
- **Mentions**: @mention participants in conversations
- **Emoji Support**: Integrated emoji picker
- **Reply Context**: Visual reply indicators

## Database Schema

### New Models
```prisma
model Conversation {
  id              String    @id @default(cuid())
  subject         String    // Required subject line
  type            ConversationType
  priority        ConversationPriority @default(NORMAL)
  isPinned        Boolean   @default(false)
  isArchived      Boolean   @default(false)
  // ... other fields
}

model Message {
  id              String    @id @default(cuid())
  parentMessageId String?   // For threading
  threadDepth     Int       @default(0)
  replyCount      Int       @default(0)
  // ... other fields
}

model MessageReaction {
  id        String @id @default(cuid())
  messageId String
  userId    String
  emoji     String
  // ... other fields
}
```

## API Endpoints

### Core Operations
- `createConversation` - Start new conversation with subject
- `getConversations` - List conversations with filtering
- `getThreadedMessages` - Fetch messages with threading
- `sendMessage` - Send message with optional threading
- `updateConversationSubject` - Edit conversation subject
- `addReaction` - Add/remove message reactions
- `markAsRead` - Update read status

### Usage Examples
```typescript
// Create new conversation
const conversation = await api.messaging.createConversation.mutate({
  subject: "Math Assignment Help",
  participants: ["user1", "user2"],
  type: "group",
  classId: "class-123"
});

// Send threaded message
const message = await api.messaging.sendMessage.mutate({
  conversationId: "conv-123",
  content: "Here's my answer...",
  parentMessageId: "msg-456", // Reply to specific message
});
```

## Migration Guide

### From Legacy Messaging
1. **Gradual Migration**: Both systems run side-by-side
2. **User Choice**: Users can switch between "Conversations" and "Inbox" tabs
3. **Data Compatibility**: Existing messages remain accessible
4. **Feature Parity**: All legacy features available in new system

### Integration Steps
1. Replace existing messaging components with `MessagingIntegration`
2. Update imports to use new component paths
3. Configure role-based access and permissions
4. Test backward compatibility with existing data

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Ensure all new types are imported correctly
   - Check API schema compatibility
   - Verify component prop types

2. **Database Migration**
   - Run migration: `npx prisma migrate dev`
   - Verify new tables and relationships
   - Check indexes for performance

3. **Real-time Features**
   - Ensure WebSocket configuration is correct
   - Check network connectivity for live updates
   - Verify authentication for socket connections

### Performance Optimization

1. **Message Loading**
   - Implement pagination for large conversations
   - Use React Query for efficient caching
   - Optimize database queries with proper indexes

2. **Real-time Updates**
   - Throttle typing indicators
   - Batch message updates
   - Use efficient WebSocket event handling

## Security Considerations

### Data Protection
- All messages encrypted in transit and at rest
- FERPA compliance maintained
- Audit logging for all messaging activities
- Role-based access control

### Privacy Features
- Read receipts can be disabled per user
- Message deletion with audit trail
- Conversation archiving vs. deletion
- Compliance with educational privacy laws

## Future Enhancements

### Planned Features
- Voice messages and video calls
- Advanced file sharing with preview
- Message scheduling and reminders
- Integration with calendar and assignments
- Advanced search with filters and tags
- Message translation for multilingual support

### Extensibility
- Plugin architecture for custom features
- Webhook support for external integrations
- API for third-party applications
- Custom emoji and reaction sets

## Support

For technical support or questions about the messaging system:
1. Check this documentation first
2. Review the component source code
3. Test with the provided examples
4. Contact the development team for assistance

## Changelog

### Version 2.0.0 (Current)
- ✅ WhatsApp-like threaded messaging
- ✅ Subject line system with smart suggestions
- ✅ Enhanced message composer with reactions
- ✅ Real-time updates and typing indicators
- ✅ Mobile-responsive design
- ✅ Backward compatibility with existing system

### Previous Versions
- Version 1.x: Legacy inbox-based messaging system (still available)
