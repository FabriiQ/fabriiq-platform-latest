'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConsentModal({ open, onClose }: ConsentModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id as string | undefined;

  const [acceptedEssential, setAcceptedEssential] = useState(true);
  const [acceptedAnalytics, setAcceptedAnalytics] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [loading, setLoading] = useState(false);

  const utils = api.useUtils();

  const captureMutation = api.consent.capture.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      onClose();
    }
  });

  const handleAccept = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const categories = ['essential'];
      if (acceptedAnalytics) categories.push('analytics');
      if (acceptedMarketing) categories.push('marketing');
      await captureMutation.mutateAsync({
        userId,
        dataCategories: categories,
        purpose: 'platform_usage',
        legalBasis: 'CONSENT',
        jurisdiction: 'GLOBAL'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy & Consent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            We process your data to provide educational services. Please review and set your preferences.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <Checkbox checked={acceptedEssential} disabled />
              <span>Essential processing (required)</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={acceptedAnalytics} onCheckedChange={(v) => setAcceptedAnalytics(Boolean(v))} />
              <span>Analytics (optional)</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={acceptedMarketing} onCheckedChange={(v) => setAcceptedMarketing(Boolean(v))} />
              <span>Marketing communications (optional)</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Later</Button>
          <Button onClick={handleAccept} disabled={loading || !userId}>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



