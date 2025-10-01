'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Chat } from '@/features/teacher-assistant-v2/components/chat';
import { OfflineDetector } from '@/features/teacher-assistant-v2/components/enhanced-error-handling';
import { generateUUID } from '@/features/teacher-assistant-v2/lib/utils';
import type { TeacherContext } from '@/features/teacher-assistant-v2/lib/types';

export default function TeacherAssistantV2Page() {
  const { data: session, status } = useSession();
  const [chatId] = useState(() => generateUUID());

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

  // Build teacher context
  const teacherContext: TeacherContext = {
    teacher: {
      id: session.user.id,
      name: session.user.name || 'Teacher',
      subjects: [], // TODO: Get from user profile
    },
    currentClass: undefined, // TODO: Get from current context
    currentPage: 'Teacher Assistant V2',
  };

  return (
    <div className="h-[calc(100vh-56px)] bg-background overflow-hidden">
      <OfflineDetector />
      {/* Chat interface - full height container */}
      <Chat
        id={chatId}
        teacherContext={teacherContext}
        className="h-full"
      />
    </div>
  );
}
