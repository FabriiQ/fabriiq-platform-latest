'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TeacherDashboardContent } from "@/components/dashboard/TeacherDashboardContent";
import { QuickTeacherLoading } from '@/components/teacher/loading/TeacherLoadingState';

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession();
  const [isHydrated, setIsHydrated] = useState(false);

  // Get teacher ID from session
  const teacherId = session?.user?.id;

  // Handle hydration to prevent SSR/client mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Debug logging
  console.log('Dashboard - Session status:', status);
  console.log('Dashboard - Session data:', session);
  console.log('Dashboard - Teacher ID:', teacherId);

  // Show loading during hydration or while session is loading
  // Server-side layout already enforces auth, so we just wait for client hydration
  if (!isHydrated || status === 'loading' || (status !== 'authenticated' || !session?.user?.id)) {
    return <QuickTeacherLoading configKey="dashboard" />;
  }

  return (
    <div className="container mx-auto py-6">
      <TeacherDashboardContent
        teacherId={teacherId!}
        campusId={session?.user?.primaryCampusId || ''}
        campusName={'Campus'} // Will be fetched by the component if needed
      />
    </div>
  );
}
