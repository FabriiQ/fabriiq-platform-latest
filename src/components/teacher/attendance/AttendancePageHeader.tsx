'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface AttendancePageHeaderProps {
  title: string;
  description: string;
  classId: string;
}

export function AttendancePageHeader({ title, description, classId }: AttendancePageHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the current page
      router.refresh();
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <PageHeader
        title={title}
        description={description}
      />
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="ml-4"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
}
