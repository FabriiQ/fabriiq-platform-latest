'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/core/button';
import { PageLayout } from '@/components/layout/page-layout';
import { ChevronLeft as ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// Use dynamic import for the UnifiedActivityCreator from features/activities
const DynamicUnifiedActivityCreator = dynamic(
  () => import('@/features/activties/components/UnifiedActivityCreator').then(mod => ({ default: mod.UnifiedActivityCreator })),
  {
    loading: () => <div className="animate-pulse p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">Loading activity creator...</div>,
    ssr: false
  }
);

export default function NewActivityPage() {
  const params = useParams();
  const classId = params?.id as string;

  const handleSuccess = () => {
    // Redirect back to activities list after successful creation
    window.location.href = `/admin/campus/classes/${classId}/activities`;
  };

  const handleCancel = () => {
    // Redirect back to activities list on cancel
    window.location.href = `/admin/campus/classes/${classId}/activities`;
  };

  return (
    <PageLayout title="Create New Activity">
      <div className="flex items-center mb-6">
        <Link href={`/admin/campus/classes/${classId}/activities`} className="mr-4">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Activities
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Activity</h1>
      </div>

      <DynamicUnifiedActivityCreator
        activityTypeId="multiple-choice" // Default activity type, can be changed by user
        classId={classId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PageLayout>
  );
}