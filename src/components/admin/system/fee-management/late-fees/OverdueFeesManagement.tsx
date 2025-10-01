"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, DollarSign, Calendar, User, Plus, Eye, Clock } from "@/components/ui/icons/lucide-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading";
import { formatCurrency } from "@/lib/utils";

interface OverdueFeesManagementProps {
  campusId?: string;
}

export function OverdueFeesManagement({ campusId }: OverdueFeesManagementProps) {
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [lateFeeAmount, setLateFeeAmount] = useState<number>(50);
  const [lateFeeReason, setLateFeeReason] = useState<string>("");

  // Fetch overdue fees
  const { data: overdueFeesData, refetch, isLoading } = api.lateFee.getOverdueFees.useQuery({
    campusId,
    limit: 50,
    offset: 0,
  });

  // Fetch late fee settings
  const { data: settingsData } = api.lateFee.getSettings.useQuery({
    campusId,
  });

  const applyLateFeeMutation = api.lateFee.applyLateFee.useMutation({
    onSuccess: () => {
      toast.success("Late fee applied successfully");
      refetch();
      setIsApplyDialogOpen(false);
      setSelectedFees([]);
    },
    onError: (error) => {
      toast.error(`Failed to apply late fee: ${error.message}`);
    },
  });

  const handleSelectFee = (feeId: string) => {
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedFees.length === overdueFeesData?.fees.length) {
      setSelectedFees([]);
    } else {
      setSelectedFees(overdueFeesData?.fees.map(fee => fee.id) || []);
    }
  };

  const handleApplyLateFee = async (feeId: string) => {
    const fee = overdueFeesData?.fees.find(f => f.id === feeId);
    if (!fee) return;

    const amount = lateFeeAmount || settingsData?.settings.lateFeeAmount || 50;
    const reason = lateFeeReason || `Late fee applied for ${fee.daysOverdue} days overdue`;

    await applyLateFeeMutation.mutateAsync({
      enrollmentFeeId: feeId,
      amount,
      reason,
      daysOverdue: fee.daysOverdue,
      dueDate: fee.dueDate,
    });
  };

  const handleBulkApplyLateFees = async () => {
    for (const feeId of selectedFees) {
      await handleApplyLateFee(feeId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overdue Fees Management</h2>
          <p className="text-muted-foreground">
            Manage and apply late fees to overdue student payments
          </p>
        </div>
        {selectedFees.length > 0 && (
          <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply Late Fee ({selectedFees.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply Late Fee</DialogTitle>
                <DialogDescription>
                  Apply late fee to {selectedFees.length} selected overdue payment(s)
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lateFeeAmount">Late Fee Amount ($)</Label>
                  <Input
                    id="lateFeeAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
                    placeholder={`Default: $${settingsData?.settings.lateFeeAmount || 50}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lateFeeReason">Reason (Optional)</Label>
                  <Input
                    id="lateFeeReason"
                    value={lateFeeReason}
                    onChange={(e) => setLateFeeReason(e.target.value)}
                    placeholder="Late fee applied for overdue payment"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkApplyLateFees} disabled={applyLateFeeMutation.isLoading}>
                  {applyLateFeeMutation.isLoading ? "Applying..." : "Apply Late Fee"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {overdueFeesData?.fees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Overdue Fees</h3>
            <p className="text-muted-foreground text-center">
              All student fees are up to date. Great job!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Overdue Fees ({overdueFeesData?.fees.length || 0})
            </CardTitle>
            <CardDescription>
              Students with overdue fee payments that may require late fee application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedFees.length === overdueFeesData?.fees.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                  <Label>Select All</Label>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Overdue: {formatCurrency(
                    overdueFeesData?.fees.reduce((sum, fee) => sum + fee.finalAmount, 0) || 0
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class/Campus</TableHead>
                    <TableHead>Fee Structure</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Late Fees</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueFeesData?.fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedFees.includes(fee.id)}
                          onChange={() => handleSelectFee(fee.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{fee.studentName}</div>
                          <div className="text-sm text-muted-foreground">{fee.studentEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{fee.className}</div>
                          <div className="text-sm text-muted-foreground">{fee.campusName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{fee.feeStructureName}</TableCell>
                      <TableCell>{formatCurrency(fee.finalAmount)}</TableCell>
                      <TableCell>
                        {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={fee.daysOverdue > 30 ? "destructive" : "secondary"}>
                          {fee.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fee.hasLateFees ? (
                          <Badge variant="outline">
                            {formatCurrency(fee.lateFeeAmount)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFees([fee.id]);
                              setIsApplyDialogOpen(true);
                            }}
                            disabled={fee.hasLateFees}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {settingsData?.settings && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Current Settings: {settingsData.settings.gracePeriodDays} day grace period, 
            {settingsData.settings.lateFeeType === 'FIXED' 
              ? ` $${settingsData.settings.lateFeeAmount} fixed late fee`
              : ` ${settingsData.settings.lateFeeAmount}% percentage late fee`
            }
            {settingsData.settings.autoApply && " (Auto-apply enabled)"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
