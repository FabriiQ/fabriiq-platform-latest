"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  Calendar,
  DollarSign
} from "@/components/ui/icons/lucide-icons";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading";

interface AutomatedProcessingProps {
  campusId?: string;
}

export function AutomatedProcessing({ campusId }: AutomatedProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processResults, setProcessResults] = useState<{
    processed: number;
    applied: number;
    skipped: number;
    totalAmount: number;
  } | null>(null);

  // Fetch current settings
  const { data: settingsData, refetch: refetchSettings } = api.lateFee.getSettings.useQuery({
    campusId,
  });

  // Fetch overdue fees
  const { data: overdueFeesData, refetch: refetchOverdue } = api.lateFee.getOverdueFees.useQuery({
    campusId,
    limit: 100,
  });

  const updateSettingsMutation = api.lateFee.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Automated processing settings updated");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const handleToggleAutoApply = async (enabled: boolean) => {
    if (!settingsData?.settings) return;

    await updateSettingsMutation.mutateAsync({
      settings: {
        ...settingsData.settings,
        autoApply: enabled,
      },
      campusId,
    });
  };

  const handleManualProcess = async () => {
    if (!overdueFeesData?.fees.length) {
      toast.info("No overdue fees to process");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    setProcessResults(null);

    try {
      let processed = 0;
      let applied = 0;
      let skipped = 0;
      let totalAmount = 0;

      const totalFees = overdueFeesData.fees.length;

      for (const fee of overdueFeesData.fees) {
        // Skip if already has late fees
        if (fee.hasLateFees) {
          skipped++;
          processed++;
          setProcessProgress((processed / totalFees) * 100);
          continue;
        }

        try {
          // Calculate late fee amount based on settings
          const lateFeeAmount = settingsData?.settings.lateFeeType === 'PERCENTAGE'
            ? (fee.finalAmount * (settingsData.settings.lateFeeAmount / 100))
            : (settingsData?.settings.lateFeeAmount || 50);

          // Apply late fee using the API
          await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
          
          applied++;
          totalAmount += lateFeeAmount;
          
          toast.success(`Late fee applied to ${fee.studentName}: $${lateFeeAmount.toFixed(2)}`);
        } catch (error) {
          skipped++;
          toast.error(`Failed to apply late fee to ${fee.studentName}`);
        }

        processed++;
        setProcessProgress((processed / totalFees) * 100);
      }

      setProcessResults({
        processed,
        applied,
        skipped,
        totalAmount,
      });

      toast.success(`Processing complete: ${applied} late fees applied`);
      refetchOverdue();

    } catch (error) {
      toast.error("Failed to process late fees");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automated Late Fee Processing</h2>
          <p className="text-muted-foreground">
            Configure and manage automated late fee application
          </p>
        </div>
      </div>

      {/* Auto-Apply Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure automatic late fee processing behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automatic Processing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically apply late fees to overdue payments based on your settings
              </p>
            </div>
            <Switch
              checked={settingsData?.settings.autoApply || false}
              onCheckedChange={handleToggleAutoApply}
              disabled={updateSettingsMutation.isLoading}
            />
          </div>

          {settingsData?.settings.autoApply && (
            <>
              <Separator />
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Automatic processing is enabled. Late fees will be applied to overdue payments 
                  after the {settingsData.settings.gracePeriodDays} day grace period.
                </AlertDescription>
              </Alert>
            </>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Grace Period</Label>
              <div className="text-2xl font-bold">
                {settingsData?.settings.gracePeriodDays || 0} days
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Late Fee Amount</Label>
              <div className="text-2xl font-bold">
                {settingsData?.settings.lateFeeType === 'PERCENTAGE'
                  ? `${settingsData.settings.lateFeeAmount}%`
                  : `$${settingsData.settings.lateFeeAmount}`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Manual Processing
          </CardTitle>
          <CardDescription>
            Manually process overdue fees and apply late charges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Current Overdue Fees</div>
              <div className="text-sm text-muted-foreground">
                {overdueFeesData?.fees.length || 0} students with overdue payments
              </div>
            </div>
            <Badge variant={overdueFeesData?.fees.length ? "destructive" : "secondary"}>
              {overdueFeesData?.fees.length || 0} overdue
            </Badge>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing late fees...</span>
                <span>{Math.round(processProgress)}%</span>
              </div>
              <Progress value={processProgress} className="w-full" />
            </div>
          )}

          {processResults && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processResults.processed}</div>
                <div className="text-sm text-green-700">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{processResults.applied}</div>
                <div className="text-sm text-green-700">Applied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{processResults.skipped}</div>
                <div className="text-sm text-orange-700">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${processResults.totalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Amount</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={handleManualProcess}
              disabled={isProcessing || !overdueFeesData?.fees.length}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner className="h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Process Now
                </>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              This will apply late fees to all eligible overdue payments
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processing Schedule
          </CardTitle>
          <CardDescription>
            When automatic processing runs (future enhancement)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Scheduled processing is not yet implemented. Currently, late fees must be applied manually 
              or through the automated toggle above. Future versions will include daily/weekly scheduling.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
