'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Heart, MessageCircle, Calendar } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface ParentProfileMenuProps {
  userName: string;
  userEmail?: string;
  userImage?: string;
  isOffline?: boolean;
}

/**
 * ParentProfileMenu component for parent profile and settings
 *
 * Features:
 * - User avatar with fallback to initials
 * - Dropdown menu with parent-specific options
 * - Profile and settings navigation
 * - Sign out functionality
 */
export function ParentProfileMenu({ 
  userName, 
  userEmail, 
  userImage, 
  isOffline = false 
}: ParentProfileMenuProps) {
  const router = useRouter();

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              {userImage && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{userName}</p>
                {isOffline && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Offline
                  </span>
                )}
              </div>
              {userEmail && (
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
              )}
              <p className="text-xs leading-none text-muted-foreground">
                Parent
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/parent/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/parent/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/parent/children')}>
              <Heart className="mr-2 h-4 w-4" />
              <span>My Children</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/parent/messages')}>
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Messages</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/parent/meetings')}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Meetings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
