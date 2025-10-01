/**
 * Message User Mention Input Component
 * Provides @ mention functionality for messaging system
 * Based on social wall architecture patterns
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Users, GraduationCap, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

interface MessageUserMentionInputProps {
  classId?: string;
  campusId?: string;
  selectedUsers: string[];
  onUsersChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

interface MessageUser {
  id: string;
  name: string;
  userType: string;
  email?: string | null;
}

export function MessageUserMentionInput({
  classId,
  campusId,
  selectedUsers,
  onUsersChange,
  placeholder = "Type @ to mention users...",
  className
}: MessageUserMentionInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'students'>('all');

  // Fetch class users (following social wall pattern)
  const { data: classUsers, isLoading: loadingClassUsers } = api.messaging.getClassUsers.useQuery(
    { classId: classId! },
    {
      enabled: !!classId && open,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 1 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
    }
  );

  // Fetch campus users for broader context
  const { data: campusUsersData, isLoading: loadingCampusUsers } = api.messaging.searchRecipients.useQuery(
    {
      campusId,
      search: searchQuery || undefined,
      userType: activeTab === 'teachers' ? 'CAMPUS_TEACHER' :
                activeTab === 'students' ? 'CAMPUS_STUDENT' : undefined,
      limit: 20
    },
    {
      enabled: !!campusId && !classId && open, // Only use when no class context and open
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 1 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
    }
  );

  // Combine users from different sources
  const allUsers: MessageUser[] = [
    ...(classUsers || []),
    ...(campusUsersData?.recipients?.map(user => ({
      id: user.id,
      name: user.name || 'Unknown User',
      userType: user.userType === 'CAMPUS_TEACHER' ? 'TEACHER' : 
                 user.userType === 'CAMPUS_STUDENT' ? 'STUDENT' : user.userType,
      email: user.email
    })) || [])
  ];

  // Remove duplicates
  const uniqueUsers = allUsers.filter((user, index, self) => 
    index === self.findIndex(u => u.id === user.id)
  );

  const selectedUserObjects = uniqueUsers.filter(user => selectedUsers.includes(user.id));

  // Filter users by type and search query (following social wall pattern)
  const getFilteredUsers = () => {
    let filteredByType = uniqueUsers;

    if (activeTab === 'teachers') {
      filteredByType = uniqueUsers.filter(user => user.userType === 'TEACHER' || user.userType === 'COORDINATOR');
    } else if (activeTab === 'students') {
      filteredByType = uniqueUsers.filter(user => user.userType === 'STUDENT');
    }

    if (searchQuery.trim()) {
      return filteredByType.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filteredByType;
  };

  const filteredUsers = getFilteredUsers();
  const isLoading = loadingClassUsers || loadingCampusUsers;

  const handleUserSelect = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      onUsersChange([...selectedUsers, userId]);
    }
    setSearchQuery('');
    setOpen(false);
  };

  const handleUserRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter(id => id !== userId));
  };

  const handleTagEveryone = () => {
    const filteredUserIds = getFilteredUsers().map(user => user.id);
    const newSelections = [...new Set([...selectedUsers, ...filteredUserIds])];
    onUsersChange(newSelections);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected Users */}
      {selectedUserObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUserObjects.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-xs">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{user.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 w-3 h-3 hover:bg-transparent"
                onClick={() => handleUserRemove(user.id)}
              >
                <X className="w-2 h-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Mention Input */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-left font-normal"
          >
            <User className="w-4 h-4 mr-2" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <div className="p-3">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  All
                </TabsTrigger>
                <TabsTrigger value="teachers" className="text-xs">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Teachers
                </TabsTrigger>
                <TabsTrigger value="students" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Students
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-3">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-3"
                />

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading users...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No users found.
                    </div>
                  ) : (
                    <>
                      {/* Tag Everyone Option */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                          Quick Actions
                        </div>
                        <div
                          className="flex items-center p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                          onClick={handleTagEveryone}
                        >
                          <Users className="w-4 h-4 mr-2" />
                          <span className="text-sm">Tag All {activeTab === 'all' ? 'Users' : activeTab} ({filteredUsers.length})</span>
                        </div>
                      </div>

                      {/* Individual Users */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                          {activeTab === 'all' ? 'Users' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </div>
                        {filteredUsers
                          .filter(user => !selectedUsers.includes(user.id))
                          .slice(0, 10) // Limit to 10 for performance
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleUserSelect(user.id)}
                            >
                              <Avatar className="w-6 h-6 mr-2">
                                <AvatarFallback className="text-xs">
                                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {user.userType}
                                  {user.email && ` • ${user.email}`}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
