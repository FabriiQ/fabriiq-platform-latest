/**
 * Contextual Recipient Suggestions Hook
 * Rule-based recipient filtering by role and current context
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';

export interface RecipientSuggestion {
  id: string;
  name: string;
  userType: string;
  email?: string;
  avatar?: string;
  context: {
    relationship: 'classmate' | 'teacher' | 'parent' | 'admin' | 'coordinator';
    classId?: string;
    className?: string;
    relevanceScore: number;
  };
}

export interface ContextualRecipientsOptions {
  classId?: string;
  activityId?: string;
  messageType?: 'DIRECT' | 'GROUP' | 'BROADCAST' | 'ANNOUNCEMENT';
  includeRoles?: string[];
  excludeRoles?: string[];
  maxSuggestions?: number;
}

export function useContextualRecipients(options: ContextualRecipientsOptions = {}) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientSuggestion[]>([]);

  // Get current user's campus ID for context
  const currentUserCampusId = session?.user?.primaryCampusId;

  // Get contextual recipients using the messaging API
  const { data: contextualRecipients, isLoading } = api.messaging.searchRecipients.useQuery(
    {
      campusId: currentUserCampusId || undefined,
      classId: options.classId,
      limit: options.maxSuggestions || 20,
    },
    {
      enabled: !!session?.user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get class-specific users if classId is provided
  const { data: classUsers } = api.messaging.searchRecipients.useQuery(
    {
      classId: options.classId,
      limit: 50,
    },
    {
      enabled: !!options.classId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Generate contextual suggestions based on current context
  const suggestions = useMemo(() => {
    if (!session?.user) return [];

    const allSuggestions: RecipientSuggestion[] = [];

    // Process contextual recipients from API
    if (contextualRecipients?.recipients) {
      const contextualSuggestions = contextualRecipients.recipients.map(user => ({
        id: user.id,
        name: user.name || 'Unknown User',
        userType: user.userType,
        email: user.email || undefined,
        context: {
          relationship: getUserRelationship(user.userType, session?.user?.userType),
          classId: options.classId,
          relevanceScore: calculateRelevanceScore(user.userType, options),
        },
      }));
      allSuggestions.push(...contextualSuggestions);
    }

    // Process class-specific users
    if (classUsers?.recipients) {
      const classSuggestions = classUsers.recipients
        .filter(user => !allSuggestions.some(s => s.id === user.id)) // Avoid duplicates
        .map(user => ({
          id: user.id,
          name: user.name || 'Unknown User',
          userType: user.userType,
          email: user.email || undefined,
          context: {
            relationship: getUserRelationship(user.userType, session?.user?.userType),
            classId: options.classId,
            relevanceScore: calculateRelevanceScore(user.userType, options) + 0.1, // Boost class members
          },
        }));
      allSuggestions.push(...classSuggestions);
    }

    // Add mock data if no real data is available
    if (allSuggestions.length === 0 && !isLoading) {
      const mockUsers = [
        {
          id: 'mock-teacher-1',
          name: 'Dr. Sarah Johnson',
          userType: 'CAMPUS_TEACHER',
          email: 'sarah.johnson@school.edu',
          context: {
            relationship: 'teacher' as const,
            classId: options.classId,
            relevanceScore: 0.9,
          },
        },
        {
          id: 'mock-student-1',
          name: 'Alex Thompson',
          userType: 'CAMPUS_STUDENT',
          email: 'alex.thompson@student.edu',
          context: {
            relationship: 'classmate' as const,
            classId: options.classId,
            relevanceScore: 0.8,
          },
        },
        {
          id: 'mock-parent-1',
          name: 'Mrs. Thompson',
          userType: 'PARENT',
          email: 'parent.thompson@email.com',
          context: {
            relationship: 'parent' as const,
            relevanceScore: 0.7,
          },
        },
      ];
      allSuggestions.push(...mockUsers);
    }

    // Filter out current user
    const currentUserId = session.user.id;
    let filteredSuggestions = allSuggestions.filter(s => s.id !== currentUserId);

    // Apply role filters
    if (options.includeRoles && options.includeRoles.length > 0) {
      filteredSuggestions = filteredSuggestions.filter(s =>
        options.includeRoles!.includes(s.userType)
      );
    }

    if (options.excludeRoles && options.excludeRoles.length > 0) {
      filteredSuggestions = filteredSuggestions.filter(s =>
        !options.excludeRoles!.includes(s.userType)
      );
    }

    // Apply search filter
    if (searchTerm) {
      filteredSuggestions = filteredSuggestions.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort by relevance score (highest first)
    filteredSuggestions.sort((a, b) => b.context.relevanceScore - a.context.relevanceScore);

    // Limit results
    const maxResults = options.maxSuggestions || 10;
    return filteredSuggestions.slice(0, maxResults);
  }, [
    session?.user,
    contextualRecipients,
    classUsers,
    options.classId,
    options.messageType,
    options.includeRoles,
    options.excludeRoles,
    options.maxSuggestions,
    searchTerm,
    isLoading
  ]);

  // Helper functions
  const addRecipient = (recipient: RecipientSuggestion) => {
    if (!selectedRecipients.some(r => r.id === recipient.id)) {
      setSelectedRecipients(prev => [...prev, recipient]);
    }
  };

  const removeRecipient = (recipientId: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== recipientId));
  };

  const clearRecipients = () => {
    setSelectedRecipients([]);
  };

  const getRecipientsForRole = (_role: string): RecipientSuggestion[] => {
    // TODO: Implement when API endpoints are ready
    return [];
  };

  const getRecipientsForClass = (_classId: string): RecipientSuggestion[] => {
    // TODO: Implement when API endpoints are ready
    return [];
  };

  return {
    suggestions,
    selectedRecipients,
    searchTerm,
    setSearchTerm,
    addRecipient,
    removeRecipient,
    clearRecipients,
    getRecipientsForRole,
    getRecipientsForClass,
    isLoading, // Real loading state from API calls
  };
}

// Helper function to determine relationship between users
function getUserRelationship(userType: string, currentUserType?: string): 'classmate' | 'teacher' | 'parent' | 'admin' | 'coordinator' {
  if (userType === 'CAMPUS_TEACHER' || userType === 'TEACHER') return 'teacher';
  if (userType === 'CAMPUS_STUDENT' || userType === 'STUDENT') return 'classmate';
  if (userType === 'PARENT') return 'parent';
  if (userType === 'COORDINATOR' || userType === 'SYSTEM_ADMIN') return 'admin';
  return 'coordinator';
}

// Helper function to calculate relevance score
function calculateRelevanceScore(userType: string, options: ContextualRecipientsOptions): number {
  let score = 0.5; // Base score

  // Higher score for teachers if current user is student
  if (userType === 'CAMPUS_TEACHER' || userType === 'TEACHER') score += 0.3;

  // Higher score for students if current user is teacher
  if (userType === 'CAMPUS_STUDENT' || userType === 'STUDENT') score += 0.2;

  // Higher score for class context
  if (options.classId) score += 0.2;

  // Adjust based on message type
  if (options.messageType === 'BROADCAST' && userType === 'COORDINATOR') score += 0.3;
  if (options.messageType === 'DIRECT' && (userType === 'CAMPUS_TEACHER' || userType === 'TEACHER')) score += 0.2;

  return Math.min(score, 1.0);
}
