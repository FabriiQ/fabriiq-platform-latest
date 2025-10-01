'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function PolicyAcceptance() {
  const [open, setOpen] = useState(false);
  const { data } = api.policyAcceptance.getLatest.useQuery();
  const accept = api.policyAcceptance.accept.useMutation({ onSuccess: () => setOpen(false) });

  useEffect(() => {
    if (!data) return;
    setOpen(!data.accepted);
  }, [data]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy Policy Update</DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-2">
          <p>
            Our Privacy Policy has been updated. Please review and accept the latest version to continue using the platform.
          </p>
          <a className="text-primary underline" href="/privacy" target="_blank" rel="noreferrer">View Policy</a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Later</Button>
          <Button onClick={() => accept.mutate({ policyVersion: 'v1.0' })}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


