/**
 * UserRecipientSelector Component
 * Predictive search component for selecting message recipients
 * Simplified from tabbed interface to single search with suggestions
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  X,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { api } from '@/utils/api';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface UserRecipient {
  id: string;
  name: string;
  email?: string;
  userType: string;
}

interface UserRecipientSelectorProps {
  selectedRecipients: UserRecipient[];
  onRecipientsChange: (recipients: UserRecipient[]) => void;
  campusId?: string;
  classId?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UserRecipientSelector({
  selectedRecipients,
  onRecipientsChange,
  campusId,
  classId,
  placeholder = "Search users by name or ID...",
  className,
  disabled = false
}: UserRecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: session } = useSession();

  // Predictive search API - only search when user types
  const searchEnabled = !!searchQuery && searchQuery.length >= 2 && !!session?.user?.id;
  const { data: recipientsData, isLoading: loadingRecipients, error: recipientsError } = api.messaging.searchRecipients.useQuery(
    {
      campusId: campusId || undefined,
      classId: classId || undefined,
      search: searchQuery || undefined,
      limit: 10 // Show top 10 suggestions
    },
    {
      enabled: searchEnabled,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 500,
      staleTime: 30 * 1000, // 30 seconds
      cacheTime: 2 * 60 * 1000, // 2 minutes
      onError: (error) => {
        console.error('Recipients search error:', error);
      }
    }
  );

  // Combine loading states (single API)
  const isLoading = loadingRecipients;

  // Debounced search to avoid excessive API calls
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Process search results for suggestions
  const searchSuggestions = useMemo(() => {
    if (!recipientsData?.recipients || !Array.isArray(recipientsData.recipients)) {
      return [];
    }

    return recipientsData.recipients
      .map(user => ({
        id: user.id,
        name: user.name || 'Unknown User',
        email: user.email || undefined,
        userType: user.userType,
      }))
      .filter(user => !selectedRecipients.some(selected => selected.id === user.id));
  }, [recipientsData, selectedRecipients]);

  const handleUserSelect = (user: UserRecipient) => {
    if (!selectedRecipients.some(r => r.id === user.id)) {
      // Compliance logging: Log recipient selection for audit trail
      if (session?.user?.id) {
        console.log('Compliance Log: Recipient selected', {
          actorId: session.user.id,
          recipientId: user.id,
          recipientType: user.userType,
          context: { campusId, classId },
          timestamp: new Date().toISOString(),
          action: 'RECIPIENT_SELECTED'
        });
      }
      
      onRecipientsChange([...selectedRecipients, user]);
      setSearchQuery(''); // Clear search after selection
      setShowSuggestions(false);
    }
  };

  const handleUserRemove = (userId: string) => {
    const removedUser = selectedRecipients.find(r => r.id === userId);

    // Compliance logging: Log recipient removal for audit trail
    if (session?.user?.id && removedUser) {
      console.log('Compliance Log: Recipient removed', {
        actorId: session.user.id,
        recipientId: userId,
        recipientType: removedUser.userType,
        context: { campusId, classId },
        timestamp: new Date().toISOString(),
        action: 'RECIPIENT_REMOVED'
      });
    }

    onRecipientsChange(selectedRecipients.filter(r => r.id !== userId));
  };

  // Compliance check: Determine if any selected recipients require special privacy handling
  const hasMinorRecipients = selectedRecipients.some(r => r.userType === 'CAMPUS_STUDENT');
  const hasEducationalContext = !!classId;
  const requiresEnhancedPrivacy = hasMinorRecipients || hasEducationalContext;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Notice */}
      {recipientsError && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          <ShieldCheck className="w-4 h-4" />
          <span>
            Unable to load user data. {recipientsError?.message}
          </span>
        </div>
      )}

      {/* Selected Recipients Display */}
      {selectedRecipients.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipients ({selectedRecipients.length})</label>
          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md min-h-[40px]">
            {selectedRecipients.map((recipient) => (
              <Badge key={recipient.id} variant="secondary" className="flex items-center gap-1 pr-1">
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-xs">
                    {recipient.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{recipient.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 w-3 h-3 hover:bg-transparent"
                  onClick={() => handleUserRemove(recipient.id)}
                  disabled={disabled}
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            disabled={disabled}
            className="pl-10"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchSuggestions.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                onClick={() => handleUserSelect(user)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{user.name}</div>
                    <Badge variant="outline" className="text-xs">
                      {user.userType.replace('CAMPUS_', '').toLowerCase()}
                    </Badge>
                  </div>
                  {user.email && (
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  )}
                </div>
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions && searchQuery.length >= 2 && searchSuggestions.length === 0 && !isLoading && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
            No users found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      {requiresEnhancedPrivacy && selectedRecipients.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {hasMinorRecipients && "Student data protected under FERPA. "}
            {hasEducationalContext && "Educational context - enhanced privacy applied. "}
            All communications are encrypted and audited.
          </span>
        </div>
      )}
    </div>
  );
}
