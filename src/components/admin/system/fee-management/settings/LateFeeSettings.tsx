"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, DollarSign, Cog, Save, Clock, Settings } from "@/components/ui/icons/lucide-icons";
import { HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading";

interface LateFeeSettingsProps {
  institutionId?: string;
  campusId?: string;
}

interface LateFeeSettingsState {
  enableLateFees: boolean;
  gracePeriodDays: number;
  lateFeeAmount: number;
  lateFeeType: 'FIXED' | 'PERCENTAGE';
  maxLateFeeAmount?: number;
  autoApply: boolean;
  notificationEnabled: boolean;
}

export function LateFeeSettings({ institutionId, campusId }: LateFeeSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current settings and currency
  const { data: settingsData, refetch, isLoading: isLoadingSettings } = api.lateFee.getSettings.useQuery({
    institutionId,
    campusId,
  });

  const { data: feeSettings } = api.settings.getFeeSettings.useQuery();
  const currencySymbol = feeSettings?.currency?.symbol || '$';

  const updateSettingsMutation = api.lateFee.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Late fee settings updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const [settings, setSettings] = useState<LateFeeSettingsState>({
    enableLateFees: true,
    gracePeriodDays: 7,
    lateFeeAmount: 50,
    lateFeeType: 'FIXED',
    maxLateFeeAmount: 500,
    autoApply: false,
    notificationEnabled: true,
  });

  // Update state when data is loaded
  React.useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSettingsMutation.mutateAsync({
        settings,
        institutionId,
        campusId,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 text-orange-600" />
              Late Fee Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure automatic late fees for overdue payments and manage policies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.enableLateFees ? "default" : "secondary"} className="px-3 py-1">
              {settings.enableLateFees ? "Active" : "Inactive"}
            </Badge>
            <Button onClick={handleSaveSettings} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Changes to late fee settings will affect all future fee calculations.
            Existing late fees will not be recalculated automatically.
          </AlertDescription>
        </Alert>

        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Late Fee Configuration</CardTitle>
                  <CardDescription className="mt-1">
                    Global settings for late fee calculation and application
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Enable Late Fees</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        When enabled, late fees will be automatically calculated and applied to overdue payments
                        based on the policies you configure below.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Allow automatic late fee calculation for overdue payments
                </p>
              </div>
              <Switch
                checked={settings.enableLateFees}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  enableLateFees: checked
                }))}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

          {settings.enableLateFees && (
            <React.Fragment>
              <Separator />
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <Label htmlFor="gracePeriodDays" className="font-medium">Grace Period (Days)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Number of days after the due date before late fees start being applied.
                            For example, with a 7-day grace period, late fees will only apply after 7 days past due.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="gracePeriodDays"
                      type="number"
                      min="0"
                      max="365"
                      value={settings.gracePeriodDays}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        gracePeriodDays: parseInt(e.target.value) || 0
                      }))}
                      className="border-blue-300 dark:border-blue-700"
                    />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Students have {settings.gracePeriodDays} days after due date before late fees apply
                    </p>
                  </div>

                  <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <Label htmlFor="lateFeeType" className="font-medium">Late Fee Type</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            <strong>Fixed:</strong> A flat amount (e.g., $50)<br/>
                            <strong>Percentage:</strong> A percentage of the overdue amount (e.g., 5% of $1000 = $50)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={settings.lateFeeType}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        lateFeeType: value as 'FIXED' | 'PERCENTAGE'
                      }))}
                    >
                      <SelectTrigger className="border-green-300 dark:border-green-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fixed Amount
                          </div>
                        </SelectItem>
                        <SelectItem value="PERCENTAGE">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">%</span>
                            Percentage
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {settings.lateFeeType === 'FIXED' ? 'Charge a fixed amount' : 'Charge a percentage of overdue amount'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <Label htmlFor="lateFeeAmount" className="font-medium">
                        {settings.lateFeeType === 'PERCENTAGE' ? 'Late Fee Percentage (%)' : `Late Fee Amount (${currencySymbol})`}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            {settings.lateFeeType === 'PERCENTAGE'
                              ? 'Enter the percentage to charge (e.g., 5 for 5%). This will be calculated as a percentage of the overdue amount.'
                              : `Enter the fixed amount to charge for late fees (e.g., 50 for ${currencySymbol}50).`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="lateFeeAmount"
                      type="number"
                      min="0"
                      step={settings.lateFeeType === 'PERCENTAGE' ? "0.1" : "0.01"}
                      value={settings.lateFeeAmount}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        lateFeeAmount: parseFloat(e.target.value) || 0
                      }))}
                      className="border-purple-300 dark:border-purple-700"
                      placeholder={settings.lateFeeType === 'PERCENTAGE' ? 'e.g., 5' : 'e.g., 50'}
                    />
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {settings.lateFeeType === 'PERCENTAGE'
                        ? `${settings.lateFeeAmount}% of overdue amount`
                        : `${currencySymbol}${settings.lateFeeAmount} flat fee`
                      }
                    </p>
                  </div>

                  <div className="space-y-3 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <Label htmlFor="maxLateFeeAmount" className="font-medium">Maximum Late Fee Amount ({currencySymbol})</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Optional maximum limit for late fees. Leave empty for no limit.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="maxLateFeeAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.maxLateFeeAmount || ""}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxLateFeeAmount: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                      className="border-indigo-300 dark:border-indigo-700"
                      placeholder="Optional maximum limit"
                    />
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      {settings.maxLateFeeAmount
                        ? `Maximum late fee capped at ${currencySymbol}${settings.maxLateFeeAmount}`
                        : 'No maximum limit set'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Apply Late Fees</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply late fees when payments become overdue
                  </p>
                </div>
                <Switch
                  checked={settings.autoApply}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    autoApply: checked
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications when late fees are applied
                  </p>
                </div>
                <Switch
                  checked={settings.notificationEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    notificationEnabled: checked
                  }))}
                />
              </div>
            </React.Fragment>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
