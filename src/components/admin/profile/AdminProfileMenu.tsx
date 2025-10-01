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
import { LogOut, Settings, User, Shield, Users, Server } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { UserType } from '@prisma/client';

interface AdminProfileMenuProps {
  userName: string;
  userEmail?: string;
  userImage?: string;
  userType: UserType;
  isOffline?: boolean;
}

/**
 * AdminProfileMenu component for admin profile and settings
 *
 * Features:
 * - User avatar with fallback to initials
 * - Dropdown menu with admin-specific options
 * - Role-based navigation links
 * - Sign out functionality
 */
export function AdminProfileMenu({ 
  userName, 
  userEmail, 
  userImage, 
  userType,
  isOffline = false 
}: AdminProfileMenuProps) {
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

  // Get role-specific navigation paths
  const getProfilePath = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return '/admin/system/profile';
      case UserType.CAMPUS_ADMIN:
        return '/admin/campus/profile';
      case UserType.CAMPUS_PRINCIPAL:
        return '/admin/principal/profile';
      case UserType.CAMPUS_COORDINATOR:
        return '/admin/coordinator/profile';
      default:
        return '/profile';
    }
  };

  const getSettingsPath = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return '/admin/system/profile/settings';
      case UserType.CAMPUS_ADMIN:
        return '/admin/campus/settings';
      case UserType.CAMPUS_PRINCIPAL:
        return '/admin/principal/settings';
      case UserType.CAMPUS_COORDINATOR:
        return '/admin/coordinator/settings';
      default:
        return '/settings';
    }
  };

  const getDashboardPath = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return '/admin/system';
      case UserType.CAMPUS_ADMIN:
        return '/admin/campus';
      case UserType.CAMPUS_PRINCIPAL:
        return '/admin/principal';
      case UserType.CAMPUS_COORDINATOR:
        return '/admin/coordinator';
      default:
        return '/dashboard';
    }
  };

  const getManagementPath = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return '/admin/system/users';
      case UserType.CAMPUS_ADMIN:
        return '/admin/campus/teachers';
      case UserType.CAMPUS_PRINCIPAL:
        return '/admin/principal/teacher-leaderboard';
      case UserType.CAMPUS_COORDINATOR:
        return '/admin/coordinator/teachers';
      default:
        return '/users';
    }
  };

  const getRoleLabel = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return 'System Admin';
      case UserType.CAMPUS_ADMIN:
        return 'Campus Admin';
      case UserType.CAMPUS_PRINCIPAL:
        return 'Principal';
      case UserType.CAMPUS_COORDINATOR:
        return 'Coordinator';
      default:
        return 'Administrator';
    }
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
                {getRoleLabel()}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(getProfilePath())}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(getSettingsPath())}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(getDashboardPath())}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(getManagementPath())}>
              <Users className="mr-2 h-4 w-4" />
              <span>Manage Users</span>
            </DropdownMenuItem>
            {userType === UserType.SYSTEM_ADMIN && (
              <DropdownMenuItem onClick={() => router.push('/admin/system/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </DropdownMenuItem>
            )}
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
