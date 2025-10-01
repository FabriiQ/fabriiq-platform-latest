'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { UserType } from '@prisma/client';

// Lazy load to avoid heavy initial bundle
const ComplianceDashboard = dynamic(
  () => import('@/features/compliance/components/ComplianceDashboard').then(m => ({ default: m.ComplianceDashboard })),
  { ssr: false }
);

export default function SystemCompliancePage() {
  const { data: session } = useSession();
  const userType = session?.user?.userType as UserType | undefined;

  if (userType !== 'SYSTEM_ADMIN') {
    return null;
  }

  return (
    <div className="p-4">
      <ComplianceDashboard scope="system-wide" />
    </div>
  );
}


