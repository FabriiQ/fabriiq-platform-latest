'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ResourceFolderView } from '@/components/student/resources/ResourceFolderView';
import { ResourceCreateDialog } from '@/components/resources/ResourceCreateDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { api } from '@/trpc/react';

export default function StudentResourcesPage() {
  const { data: session } = useSession();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get subjects for the resource creation dialog
  const { data: subjectsData } = api.subject.getAll.useQuery(
    {},
    { enabled: !!session?.user?.id }
  );
  
  if (!session?.user?.id) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view your resources</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Resources</h1>
            <p className="text-muted-foreground">
              Access course materials and your personal resources organized by subject
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        </div>
      </div>

      <ResourceFolderView studentId={session.user.id} />

      {/* Resource Creation Dialog */}
      <ResourceCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          // The ResourceFolderView should automatically refetch
        }}
        subjects={subjectsData?.subjects || []}
        defaultSubjectId={undefined}
      />
    </div>
  );
}
