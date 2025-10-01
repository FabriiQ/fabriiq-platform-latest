'use client';

import React from 'react';
import { TeacherLayout } from './TeacherLayout';
import { usePathname } from 'next/navigation';
import { api } from '@/trpc/react';

interface TeacherLayoutClientProps {
  children: React.ReactNode;
  teacherId: string;
  userName: string;
  userEmail?: string;
  userImage?: string;
}

/**
 * Client component wrapper for TeacherLayout
 * 
 * This component handles client-side logic like extracting the current class ID
 * from the URL and determining the page title based on the current path.
 */
export function TeacherLayoutClient({
  children,
  teacherId,
  userName,
  userEmail,
  userImage,
}: TeacherLayoutClientProps) {
  const pathname = usePathname();

  // Extract class ID from pathname
  const classIdMatch = pathname.match(/\/teacher\/classes\/([^\/]+)/);
  const classId = classIdMatch ? classIdMatch[1] : null;

  // Fetch class data if we're on a class-specific page
  const { data: classData } = api.class.getById.useQuery(
    { classId: classId! },
    {
      enabled: !!classId,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 1,
    }
  );

  // Determine page title based on pathname
  const getPageTitle = () => {
    if (pathname === '/teacher/dashboard') return 'Dashboard';
    if (pathname === '/teacher/classes') return 'My Classes';
    if (pathname === '/teacher/schedule') return 'Schedule';
    if (pathname === '/teacher/assessments') return 'Assessments';
    if (pathname === '/teacher/content-studio') return 'AI Content Studio';
    if (pathname === '/teacher/resources') return 'Resources';
    if (pathname === '/teacher/communications') return 'Communications';
    if (pathname === '/teacher/reports') return 'Reports';
    if (pathname === '/teacher/settings') return 'Settings';
    if (pathname === '/teacher/profile') return 'Profile';

    // For class-specific pages, include class name
    if (pathname.includes('/teacher/classes/') && classData) {
      const className = classData.name || 'Class';
      if (pathname.includes('/attendance')) return `${className} - Attendance`;
      if (pathname.includes('/students')) return `${className} - Students`;
      if (pathname.includes('/activities')) return `${className} - Activities`;
      if (pathname.includes('/assessments')) return `${className} - Assessments`;
      if (pathname.includes('/reports')) return `${className} - Reports`;
      if (pathname.includes('/leaderboard')) return `${className} - Leaderboard`;
      return `${className} - Overview`;
    }

    // Fallback for class pages without data
    if (pathname.includes('/teacher/classes/')) {
      if (pathname.includes('/attendance')) return 'Class Attendance';
      if (pathname.includes('/students')) return 'Class Students';
      if (pathname.includes('/activities')) return 'Class Activities';
      if (pathname.includes('/assessments')) return 'Class Assessments';
      if (pathname.includes('/reports')) return 'Class Reports';
      if (pathname.includes('/leaderboard')) return 'Class Leaderboard';
      return 'Class Overview';
    }

    return 'Teacher Portal';
  };
  
  return (
    <TeacherLayout
      teacherId={teacherId}
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      title={getPageTitle()}
    >
      {children}
    </TeacherLayout>
  );
}
