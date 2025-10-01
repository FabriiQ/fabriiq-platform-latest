-- Migration: Add Threaded Messaging Support
-- This migration enhances the messaging system with WhatsApp-like threading capabilities

-- Add new enums for enhanced messaging
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "NotificationLevel" AS ENUM ('NONE', 'MENTIONS', 'ALL');
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM');

-- Enhance Conversation table
ALTER TABLE "conversations" ADD COLUMN "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "conversations" ADD COLUMN "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "conversations" ADD COLUMN "classId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "courseId" TEXT;
ALTER TABLE "conversations" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "conversations" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN "lastMessageAt" TIMESTAMP(3);

-- Enhance ConversationParticipant table
ALTER TABLE "conversation_participants" ADD COLUMN "canEditSubject" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversation_participants" ADD COLUMN "notificationLevel" "NotificationLevel" NOT NULL DEFAULT 'ALL';
ALTER TABLE "conversation_participants" ADD COLUMN "lastReadAt" TIMESTAMP(3);
ALTER TABLE "conversation_participants" ADD COLUMN "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- Enhance Message table for threading
ALTER TABLE "messages" ALTER COLUMN "content" TYPE TEXT;
ALTER TABLE "messages" ADD COLUMN "messageType" "MessageContentType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "messages" ADD COLUMN "parentMessageId" TEXT;
ALTER TABLE "messages" ADD COLUMN "threadDepth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "messages" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "messages" ADD COLUMN "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "messages" ADD COLUMN "metadata" JSONB;
ALTER TABLE "messages" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "messages" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "messages" ALTER COLUMN "attachments" TYPE JSONB USING attachments::jsonb;

-- Create MessageReaction table
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- Create MessageReadStatus table
CREATE TABLE "message_read_status" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_read_status_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");
CREATE UNIQUE INDEX "message_read_status_messageId_userId_key" ON "message_read_status"("messageId", "userId");

-- Create indexes for performance
CREATE INDEX "conversations_classId_lastMessageAt_idx" ON "conversations"("classId", "lastMessageAt");
CREATE INDEX "conversations_isPinned_lastMessageAt_idx" ON "conversations"("isPinned", "lastMessageAt");
CREATE INDEX "conversations_isArchived_lastMessageAt_idx" ON "conversations"("isArchived", "lastMessageAt");
CREATE INDEX "conversations_subject_idx" ON "conversations"("subject");

CREATE INDEX "conversation_participants_userId_unreadCount_idx" ON "conversation_participants"("userId", "unreadCount");

CREATE INDEX "messages_conversationId_sentAt_idx" ON "messages"("conversationId", "sentAt");
CREATE INDEX "messages_parentMessageId_idx" ON "messages"("parentMessageId");
CREATE INDEX "messages_conversationId_threadDepth_sentAt_idx" ON "messages"("conversationId", "threadDepth", "sentAt");

CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");
CREATE INDEX "message_read_status_messageId_idx" ON "message_read_status"("messageId");
CREATE INDEX "message_read_status_userId_readAt_idx" ON "message_read_status"("userId", "readAt");

-- Update existing data to have default subjects
UPDATE "conversations" SET "subject" = 'General Discussion' WHERE "subject" = '';

-- Create function to update unread counts
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update unread count for all participants except the sender
    UPDATE "conversation_participants" 
    SET "unreadCount" = "unreadCount" + 1
    WHERE "conversationId" = NEW."conversationId" 
    AND "userId" != NEW."senderId"
    AND "status" = 'ACTIVE';
    
    -- Update conversation's lastMessageAt
    UPDATE "conversations"
    SET "lastMessageAt" = NEW."sentAt"
    WHERE "id" = NEW."conversationId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unread count updates
CREATE TRIGGER update_unread_counts_trigger
    AFTER INSERT ON "messages"
    FOR EACH ROW
    EXECUTE FUNCTION update_unread_counts();

-- Create function to reset unread count when user reads messages
CREATE OR REPLACE FUNCTION reset_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "conversation_participants"
    SET "unreadCount" = 0,
        "lastReadAt" = NEW."readAt",
        "lastReadMessageId" = NEW."messageId"
    WHERE "conversationId" = (
        SELECT "conversationId" FROM "messages" WHERE "id" = NEW."messageId"
    ) AND "userId" = NEW."userId";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for read status updates
CREATE TRIGGER reset_unread_count_trigger
    AFTER INSERT ON "message_read_status"
    FOR EACH ROW
    EXECUTE FUNCTION reset_unread_count();
