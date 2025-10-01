'use client';

import React from 'react';
import { api } from '@/utils/api';

export default function FERPARecent() {
  const { data, isLoading } = api.messaging.getFerpaDisclosures.useQuery({ limit: 20 });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No disclosures.</div>;

  return (
    <div className="text-sm space-y-2 max-h-64 overflow-auto">
      {(data as any[]).map((d, idx) => (
        <div key={idx} className="flex items-center justify-between border-b pb-1">
          <div>
            <div className="font-medium">{d.student?.name || d.studentId}</div>
            <div className="text-muted-foreground">{d.disclosurePurpose}</div>
          </div>
          <div className="text-muted-foreground">{new Date(d.disclosureDate).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}


