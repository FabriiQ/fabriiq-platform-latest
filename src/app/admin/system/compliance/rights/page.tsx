'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserType } from '@prisma/client';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SystemComplianceRightsPage() {
  const { data: session } = useSession();
  const userType = session?.user?.userType as UserType | undefined;
  const [targetUserId, setTargetUserId] = useState('');
  const exportMutation = api.rights.exportUserData.useMutation();

  if (userType !== 'SYSTEM_ADMIN') return null;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">User Rights (MVP)</h1>
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Export user data (JSON):</div>
        <div className="flex items-center gap-2">
          <Input placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
          <Button
            onClick={async () => {
              if (!targetUserId) return;
              const res = await exportMutation.mutateAsync({ userId: targetUserId });
              if (res?.data) {
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `user-export-${targetUserId}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}


