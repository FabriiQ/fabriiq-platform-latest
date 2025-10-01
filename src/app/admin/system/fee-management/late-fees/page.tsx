'use client';

import { useMemo, useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, Calculator as CalculatorIcon, Play, AlertTriangle } from 'lucide-react';

export default function LateFeesAdminPage() {
  const [campusId, setCampusId] = useState<string | undefined>(undefined);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dryRun, setDryRun] = useState(true);

  const { data: campuses } = api.campus.getAll.useQuery();

  const { data: overdue, isLoading, refetch } = api.lateFee.getOverdueFeesEnhanced.useQuery({
    campusId: campusId || undefined,
    asOfDate: asOfDate ? new Date(asOfDate) : undefined,
    excludeProcessed: true,
    limit: 50,
  });

  const utils = api.useUtils();

  const { mutateAsync: processAutomatic, isLoading: isProcessing } = api.lateFee.processAutomatic.useMutation({
    onSuccess: async () => {
      await utils.lateFee.getOverdueFeesEnhanced.invalidate();
    }
  });

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [policyId, setPolicyId] = useState<string | undefined>(undefined);
  const { data: policies } = api.lateFee.getPolicies.useQuery({ campusId: campusId || undefined });

  const { data: preview, isLoading: isPreviewLoading, refetch: refetchPreview } = api.lateFee.previewCalculation.useQuery(
    previewingId && policyId ? { enrollmentFeeId: previewingId, policyId, asOfDate: asOfDate ? new Date(asOfDate) : undefined } : (undefined as any),
    { enabled: !!previewingId && !!policyId }
  );

  const onRunAutomatic = async () => {
    await processAutomatic({ campusId, asOfDate: asOfDate ? new Date(asOfDate) : undefined, dryRun });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Late Fees Management</CardTitle>
          <CardDescription>Preview and process automatic late fees. Use Dry Run to simulate without applying.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={campusId || 'all'} onValueChange={(v) => setCampusId(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Campuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {campuses?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">As of</label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-[160px]" />
            </div>

            <Button variant={dryRun ? 'secondary' : 'default'} onClick={() => setDryRun(!dryRun)}>
              {dryRun ? 'Dry Run: ON' : 'Dry Run: OFF'}
            </Button>

            <Button onClick={onRunAutomatic} disabled={isProcessing} className="flex items-center gap-2">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Automatic
            </Button>

            <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Fees</CardTitle>
          <CardDescription>Fees past due date without processed late fees</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading overdue fees...
            </div>
          ) : overdue && overdue.fees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fee Structure</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.fees.map((f) => (
                    <TableRow key={f.enrollmentFeeId}>
                      <TableCell>{f.studentName}</TableCell>
                      <TableCell>{f.className}</TableCell>
                      <TableCell>{f.feeStructureName}</TableCell>
                      <TableCell>{new Date(f.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={f.daysOverdue > 30 ? 'destructive' : 'secondary'}>{f.daysOverdue} days</Badge>
                      </TableCell>
                      <TableCell>${f.outstandingAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={policyId} onValueChange={setPolicyId}>
                            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select policy" /></SelectTrigger>
                            <SelectContent>
                              {policies?.policies?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => { setPreviewingId(f.enrollmentFeeId); refetchPreview(); }} className="flex items-center gap-2">
                            <CalculatorIcon className="h-4 w-4" />
                            Preview
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              No overdue fees found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Result</CardTitle>
            <CardDescription>Calculation details as of {new Date(asOfDate).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-medium">${preview.result.amount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Days Overdue</div>
                <div className="font-medium">{preview.result.details.daysOverdue}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Grace Applied</div>
                <div className="font-medium">{preview.result.details.gracePeriodApplied ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Type</div>
                <div className="font-medium">{preview.result.details.calculationType}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

