'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Globe,
  Clock,
  Edit,
  Settings,
  MapPin,
  Calendar,
  GraduationCap,
  Users
} from 'lucide-react';
import { UserType } from '@prisma/client';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  username: string;
  userType: UserType;
  phoneNumber?: string | null;
  dateOfBirth?: Date | null;
  profileData?: Record<string, any> | null;
  profileImageUrl?: string | null;
  bio?: string;
  language?: string;
  timezone?: string;
  showEmail?: boolean;
  showBio?: boolean;
  // Role-specific fields
  specialization?: string;
  qualifications?: string;
  enrollmentNumber?: string;
  currentGrade?: string;
  interests?: string;
  department?: string;
  position?: string;
}

interface UnifiedProfileDisplayProps {
  user: ProfileData;
  userType: UserType;
  className?: string;
  showActions?: boolean;
}

// Map user types to display names
const userTypeDisplayNames: Record<string, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  COORDINATOR: 'Coordinator',
  CAMPUS_ADMIN: 'Campus Administrator',
  SYSTEM_ADMIN: 'System Administrator',
  SYSTEM_MANAGER: 'System Manager',
  CAMPUS_COORDINATOR: 'Campus Coordinator',
  CAMPUS_TEACHER: 'Teacher',
  CAMPUS_STUDENT: 'Student',
  CAMPUS_PARENT: 'Parent',
  CAMPUS_PRINCIPAL: 'Principal',
};

// Map user types to colors
const userTypeColors: Record<string, string> = {
  STUDENT: 'bg-blue-100 text-blue-800',
  TEACHER: 'bg-green-100 text-green-800',
  COORDINATOR: 'bg-purple-100 text-purple-800',
  CAMPUS_ADMIN: 'bg-orange-100 text-orange-800',
  SYSTEM_ADMIN: 'bg-red-100 text-red-800',
  SYSTEM_MANAGER: 'bg-red-100 text-red-800',
  CAMPUS_COORDINATOR: 'bg-purple-100 text-purple-800',
  CAMPUS_TEACHER: 'bg-green-100 text-green-800',
  CAMPUS_STUDENT: 'bg-blue-100 text-blue-800',
  CAMPUS_PARENT: 'bg-pink-100 text-pink-800',
  CAMPUS_PRINCIPAL: 'bg-indigo-100 text-indigo-800',
};

export function UnifiedProfileDisplay({
  user,
  userType,
  className,
  showActions = true
}: UnifiedProfileDisplayProps) {
  const router = useRouter();

  const getSettingsUrl = () => {
    switch (userType) {
      case UserType.CAMPUS_TEACHER:
        return '/teacher/settings';
      case UserType.CAMPUS_STUDENT:
        return '/student/settings';
      case UserType.CAMPUS_PARENT:
        return '/parent/settings';
      case UserType.SYSTEM_ADMIN:
        return '/admin/system/settings';
      case UserType.CAMPUS_ADMIN:
        return '/admin/campus/settings';
      case UserType.CAMPUS_COORDINATOR:
        return '/admin/coordinator/settings';
      case UserType.CAMPUS_PRINCIPAL:
        return '/admin/principal/settings';
      default:
        return '/settings';
    }
  };

  const getUserInitials = () => {
    const name = user.name || user.username || 'User';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString();
  };

  const getRoleSpecificFields = () => {
    switch (userType) {
      case 'CAMPUS_TEACHER':
      case 'TEACHER':
        return (
          <>
            {user.specialization && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Specialization: {user.specialization}</span>
              </div>
            )}
            {user.qualifications && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>Qualifications: {user.qualifications}</span>
              </div>
            )}
          </>
        );
      case 'CAMPUS_STUDENT':
      case 'STUDENT':
        return (
          <>
            {user.enrollmentNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Enrollment: {user.enrollmentNumber}</span>
              </div>
            )}
            {user.currentGrade && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>Grade: {user.currentGrade}</span>
              </div>
            )}
            {user.interests && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Interests: {user.interests}</span>
              </div>
            )}
          </>
        );
      case 'SYSTEM_ADMIN':
      case 'CAMPUS_ADMIN':
      case 'CAMPUS_COORDINATOR':
      case 'CAMPUS_PRINCIPAL':
        return (
          <>
            {user.department && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Department: {user.department}</span>
              </div>
            )}
            {user.position && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Position: {user.position}</span>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={user.profileImageUrl || undefined}
                alt={user.name || 'Profile'}
              />
              <AvatarFallback className="text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <CardTitle className="text-2xl">{user.name || user.username}</CardTitle>
                <CardDescription className="text-base">@{user.username}</CardDescription>
              </div>
              <Badge 
                variant="secondary" 
                className={cn("text-xs", userTypeColors[userType] || 'bg-gray-100 text-gray-800')}
              >
                {userTypeDisplayNames[userType] || userType}
              </Badge>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(getSettingsUrl())}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(getSettingsUrl())}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Bio */}
        {user.bio && user.showBio !== false && (
          <div>
            <h3 className="font-medium mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {user.bio}
            </p>
          </div>
        )}

        <Separator />

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="font-medium">Contact Information</h3>
          <div className="space-y-2">
            {user.showEmail !== false && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
            )}
            {user.phoneNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📞 {user.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Role-specific Information */}
        <div className="space-y-3">
          <h3 className="font-medium">Professional Information</h3>
          <div className="space-y-2">
            {getRoleSpecificFields()}
          </div>
        </div>

        <Separator />

        {/* Preferences */}
        <div className="space-y-3">
          <h3 className="font-medium">Preferences</h3>
          <div className="space-y-2">
            {user.language && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>Language: {user.language.toUpperCase()}</span>
              </div>
            )}
            {user.timezone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Timezone: {user.timezone}</span>
              </div>
            )}
            {user.dateOfBirth && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Date of Birth: {formatDate(user.dateOfBirth)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
