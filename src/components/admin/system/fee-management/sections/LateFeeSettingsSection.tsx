"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Clock,
  Settings,
  AlertTriangle,
  Info,
  Play,
  Calculator as CalculatorIcon,
  DollarSign as DollarSignIcon
} from "lucide-react";
import { UnifiedFeeConfig, LateFeeCalculationType, CompoundingInterval } from "@/types/fee-management-unified";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface LateFeeSettingsSectionProps {
  config: UnifiedFeeConfig['lateFees'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['lateFees']>) => void;
  onReset: () => void;
  institutionId?: string;
  campusId?: string;
}

export function LateFeeSettingsSection({
  config,
  onUpdate,
  onReset,
  institutionId,
  campusId
}: LateFeeSettingsSectionProps) {
  const [previewAmount, setPreviewAmount] = useState(1000);
  const [previewDays, setPreviewDays] = useState(30);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  // Form state for policy editor
  const [policyForm, setPolicyForm] = useState({
    name: '',
    calculationType: 'PERCENTAGE' as 'FIXED' | 'PERCENTAGE' | 'TIERED' | 'COMPOUND',
    description: '',
    configuration: {}
  });

  // Late fee calculation preview
  const { data: calculationPreview, refetch: refetchPreview } = api.unifiedFeeManagement.calculateLateFee.useQuery({
    principalAmount: previewAmount,
    daysOverdue: previewDays,
    institutionId,
    campusId,
  });

  // Late fee policies management
  const { data: lateFeePolicy, refetch: refetchPolicies } = api.unifiedFeeManagement.getLateFeePolicy.useQuery({
    institutionId,
    campusId,
  });

  const createPolicyMutation = api.unifiedFeeManagement.createLateFeePolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy created successfully");
      refetchPolicies();
      setShowPolicyEditor(false);
      setEditingPolicy(null);
    },
    onError: (error) => {
      toast.error(`Failed to create policy: ${error.message}`);
    },
  });

  const updatePolicyMutation = api.unifiedFeeManagement.updateLateFeePolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy updated successfully");
      refetchPolicies();
      setShowPolicyEditor(false);
      setEditingPolicy(null);
    },
    onError: (error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });

  const deletePolicyMutation = api.unifiedFeeManagement.deleteLateFeePolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy deleted successfully");
      refetchPolicies();
    },
    onError: (error) => {
      toast.error(`Failed to delete policy: ${error.message}`);
    },
  });

  // Initialize form when editing policy changes
  useEffect(() => {
    if (editingPolicy) {
      setPolicyForm({
        name: editingPolicy.name || '',
        calculationType: editingPolicy.calculationType || 'PERCENTAGE',
        description: editingPolicy.description || '',
        configuration: editingPolicy.configuration || {}
      });
    } else {
      setPolicyForm({
        name: '',
        calculationType: 'PERCENTAGE',
        description: '',
        configuration: {}
      });
    }
  }, [editingPolicy]);

  const handleGracePeriodUpdate = (field: string, value: any) => {
    onUpdate({
      gracePeriod: {
        ...config.gracePeriod,
        [field]: value,
      }
    });
  };

  const handleCalculationUpdate = (field: string, value: any) => {
    onUpdate({
      calculation: {
        ...config.calculation,
        [field]: value,
      }
    });
  };

  const handleCompoundingUpdate = (field: string, value: any) => {
    onUpdate({
      calculation: {
        ...config.calculation,
        compounding: {
          ...config.calculation.compounding,
          [field]: value,
        }
      }
    });
  };

  const handleAutomationUpdate = (field: string, value: any) => {
    onUpdate({
      automation: {
        ...config.automation,
        [field]: value,
      }
    });
  };

  const handleWaiverUpdate = (field: string, value: any) => {
    onUpdate({
      waivers: {
        ...config.waivers,
        [field]: value,
      }
    });
  };

  const handleTieredRuleUpdate = (index: number, field: string, value: any) => {
    const updatedRules = [...(config.calculation.tieredRules || [])];
    updatedRules[index] = {
      ...updatedRules[index],
      [field]: value,
    };
    
    handleCalculationUpdate('tieredRules', updatedRules);
  };

  const addTieredRule = () => {
    const newRule = {
      daysFrom: 0,
      daysTo: 0,
      amount: 0,
      isPercentage: false,
    };
    
    const updatedRules = [...(config.calculation.tieredRules || []), newRule];
    handleCalculationUpdate('tieredRules', updatedRules);
  };

  const removeTieredRule = (index: number) => {
    const updatedRules = (config.calculation.tieredRules || []).filter((_, i) => i !== index);
    handleCalculationUpdate('tieredRules', updatedRules);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Late Fee Settings</h2>
          <p className="text-muted-foreground">Configure late fee calculations, automation, and waivers</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* Enable/Disable Late Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSignIcon className="h-5 w-5" />
            Late Fee Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Late Fees</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off late fee calculations for overdue payments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => onUpdate({ enabled: checked })}
              />
              <Badge variant={config.enabled ? "default" : "secondary"}>
                {config.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Grace Period Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Grace Period Configuration
              </CardTitle>
              <CardDescription>
                Set the grace period before late fees are applied
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min="0"
                    max="90"
                    value={config.gracePeriod.days}
                    onChange={(e) => handleGracePeriodUpdate('days', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Days after due date before late fees apply
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Apply on Weekends</Label>
                    <p className="text-sm text-muted-foreground">
                      Count weekends in grace period
                    </p>
                  </div>
                  <Switch
                    checked={config.gracePeriod.applyOnWeekends}
                    onCheckedChange={(checked) => handleGracePeriodUpdate('applyOnWeekends', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Apply on Holidays</Label>
                    <p className="text-sm text-muted-foreground">
                      Count holidays in grace period
                    </p>
                  </div>
                  <Switch
                    checked={config.gracePeriod.applyOnHolidays}
                    onCheckedChange={(checked) => handleGracePeriodUpdate('applyOnHolidays', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5" />
                Calculation Rules
              </CardTitle>
              <CardDescription>
                Configure how late fees are calculated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Calculation Type</Label>
                  <Select 
                    value={config.calculation.type} 
                    onValueChange={(value) => handleCalculationUpdate('type', value as LateFeeCalculationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LateFeeCalculationType.FIXED}>Fixed Amount</SelectItem>
                      <SelectItem value={LateFeeCalculationType.PERCENTAGE}>Percentage of Principal</SelectItem>
                      <SelectItem value={LateFeeCalculationType.DAILY_PERCENTAGE}>Daily Percentage</SelectItem>
                      <SelectItem value={LateFeeCalculationType.TIERED}>Tiered Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fixed Amount */}
                {config.calculation.type === LateFeeCalculationType.FIXED && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedAmount">Fixed Late Fee Amount</Label>
                    <Input
                      id="fixedAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.calculation.fixedAmount || 0}
                      onChange={(e) => handleCalculationUpdate('fixedAmount', parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {/* Percentage */}
                {config.calculation.type === LateFeeCalculationType.PERCENTAGE && (
                  <div className="space-y-2">
                    <Label htmlFor="percentageRate">Percentage Rate (%)</Label>
                    <Input
                      id="percentageRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={config.calculation.percentageRate || 0}
                      onChange={(e) => handleCalculationUpdate('percentageRate', parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {/* Daily Percentage */}
                {config.calculation.type === LateFeeCalculationType.DAILY_PERCENTAGE && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dailyPercentageRate">Daily Percentage Rate (%)</Label>
                      <Input
                        id="dailyPercentageRate"
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={config.calculation.dailyPercentageRate || 0}
                        onChange={(e) => handleCalculationUpdate('dailyPercentageRate', parseFloat(e.target.value))}
                      />
                    </div>

                    {/* Compounding Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Compounding</Label>
                          <p className="text-sm text-muted-foreground">
                            Apply late fees on accumulated amount
                          </p>
                        </div>
                        <Switch
                          checked={config.calculation.compounding.enabled}
                          onCheckedChange={(checked) => handleCompoundingUpdate('enabled', checked)}
                        />
                      </div>

                      {config.calculation.compounding.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Compounding Interval</Label>
                            <Select 
                              value={config.calculation.compounding.interval} 
                              onValueChange={(value) => handleCompoundingUpdate('interval', value as CompoundingInterval)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={CompoundingInterval.DAILY}>Daily</SelectItem>
                                <SelectItem value={CompoundingInterval.WEEKLY}>Weekly</SelectItem>
                                <SelectItem value={CompoundingInterval.MONTHLY}>Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="maxPeriods">Max Compounding Periods</Label>
                            <Input
                              id="maxPeriods"
                              type="number"
                              min="1"
                              value={config.calculation.compounding.maxPeriods || ''}
                              onChange={(e) => handleCompoundingUpdate('maxPeriods', e.target.value ? parseInt(e.target.value) : undefined)}
                              placeholder="No limit"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tiered Rules */}
                {config.calculation.type === LateFeeCalculationType.TIERED && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Tiered Rules</Label>
                      <Button size="sm" onClick={addTieredRule}>
                        Add Rule
                      </Button>
                    </div>

                    {(config.calculation.tieredRules || []).map((rule, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Rule {index + 1}</h4>
                          <Button size="sm" variant="outline" onClick={() => removeTieredRule(index)}>
                            Remove
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Days From</Label>
                            <Input
                              type="number"
                              min="0"
                              value={rule.daysFrom}
                              onChange={(e) => handleTieredRuleUpdate(index, 'daysFrom', parseInt(e.target.value))}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Days To</Label>
                            <Input
                              type="number"
                              min="0"
                              value={rule.daysTo}
                              onChange={(e) => handleTieredRuleUpdate(index, 'daysTo', parseInt(e.target.value))}
                              placeholder="∞"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={rule.amount}
                              onChange={(e) => handleTieredRuleUpdate(index, 'amount', parseFloat(e.target.value))}
                            />
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={rule.isPercentage}
                                onCheckedChange={(checked) => handleTieredRuleUpdate(index, 'isPercentage', checked)}
                              />
                              <Label>Percentage</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minAmount">Minimum Late Fee</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.calculation.minAmount}
                      onChange={(e) => handleCalculationUpdate('minAmount', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxAmount">Maximum Late Fee</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.calculation.maxAmount || ''}
                      onChange={(e) => handleCalculationUpdate('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculation Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5" />
                Calculation Preview
              </CardTitle>
              <CardDescription>
                Test your late fee calculation with different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="previewAmount">Principal Amount</Label>
                  <Input
                    id="previewAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="previewDays">Days Overdue</Label>
                  <Input
                    id="previewDays"
                    type="number"
                    min="0"
                    value={previewDays}
                    onChange={(e) => setPreviewDays(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => refetchPreview()}>
                  <Play className="h-4 w-4 mr-2" />
                  Calculate Preview
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewAmount(5000);
                    setPreviewDays(15);
                    refetchPreview();
                  }}
                >
                  <CalculatorIcon className="h-4 w-4 mr-2" />
                  Test Scenario
                </Button>
              </div>

              {calculationPreview?.calculation && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Late Fee Amount</Label>
                      <p className="text-2xl font-bold">
                        ${calculationPreview.calculation.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label>Effective Rate</Label>
                      <p className="text-xl font-semibold">
                        {calculationPreview.calculation.effectiveRate.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <Label>Total Days</Label>
                      <p className="text-xl font-semibold">
                        {calculationPreview.calculation.totalDays} days
                      </p>
                    </div>
                  </div>

                  {calculationPreview.calculation.breakdown.length > 0 && (
                    <div className="mt-4">
                      <Label>Calculation Breakdown</Label>
                      <div className="mt-2 space-y-2">
                        {calculationPreview.calculation.breakdown.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span>{item.description}</span>
                            <span className="font-medium">${item.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automatic late fee processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Apply Late Fees</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply late fees to overdue payments
                  </p>
                </div>
                <Switch
                  checked={config.automation.autoApply}
                  onCheckedChange={(checked) => handleAutomationUpdate('autoApply', checked)}
                />
              </div>

              {config.automation.autoApply && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Processing Schedule</Label>
                    <Select
                      value={config.automation.processingSchedule}
                      onValueChange={(value) => handleAutomationUpdate('processingSchedule', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processingTime">Processing Time</Label>
                    <Input
                      id="processingTime"
                      type="time"
                      value={config.automation.processingTime}
                      onChange={(e) => handleAutomationUpdate('processingTime', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dry Run First</Label>
                  <p className="text-sm text-muted-foreground">
                    Run calculations without applying fees first
                  </p>
                </div>
                <Switch
                  checked={config.automation.dryRunFirst}
                  onCheckedChange={(checked) => handleAutomationUpdate('dryRunFirst', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Waiver Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Waiver Settings
              </CardTitle>
              <CardDescription>
                Configure late fee waiver policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Waiver Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow students to request late fee waivers
                  </p>
                </div>
                <Switch
                  checked={config.waivers.allowRequests}
                  onCheckedChange={(checked) => handleWaiverUpdate('allowRequests', checked)}
                />
              </div>

              {config.waivers.allowRequests && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Waiver requests need admin approval
                      </p>
                    </div>
                    <Switch
                      checked={config.waivers.requireApproval}
                      onCheckedChange={(checked) => handleWaiverUpdate('requireApproval', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxWaiverPercentage">Maximum Waiver Percentage</Label>
                    <Input
                      id="maxWaiverPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={config.waivers.maxWaiverPercentage}
                      onChange={(e) => handleWaiverUpdate('maxWaiverPercentage', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum percentage of late fee that can be waived
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Late Fee Policy Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Late Fee Policy Management
          </CardTitle>
          <CardDescription>
            Create, edit, and configure late fee policies for different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Current Policy</h4>
              <p className="text-sm text-muted-foreground">
                {lateFeePolicy ? `Policy: ${lateFeePolicy.name}` : 'No policy configured'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPolicy(lateFeePolicy);
                  setShowPolicyEditor(true);
                }}
                disabled={!lateFeePolicy}
              >
                Edit Policy
              </Button>
              <Button
                onClick={() => {
                  setEditingPolicy(null);
                  setShowPolicyEditor(true);
                }}
              >
                Create New Policy
              </Button>
            </div>
          </div>

          {lateFeePolicy && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Policy Name</Label>
                  <p className="text-sm">{lateFeePolicy.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Calculation Type</Label>
                  <p className="text-sm">{lateFeePolicy.calculationType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={lateFeePolicy.isActive ? "default" : "secondary"}>
                    {lateFeePolicy.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {lateFeePolicy.description && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{lateFeePolicy.description}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPolicy(lateFeePolicy);
                    setShowPolicyEditor(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this policy?')) {
                      deletePolicyMutation.mutate({ id: lateFeePolicy.id });
                    }
                  }}
                  disabled={deletePolicyMutation.isLoading}
                >
                  {deletePolicyMutation.isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}

          {showPolicyEditor && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPolicyEditor(false);
                    setEditingPolicy(null);
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Policy Name</Label>
                  <Input
                    placeholder="Enter policy name"
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calculation Type</Label>
                  <Select
                    value={policyForm.calculationType}
                    onValueChange={(value) => setPolicyForm(prev => ({ ...prev, calculationType: value as 'FIXED' | 'PERCENTAGE' | 'TIERED' | 'COMPOUND' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="TIERED">Tiered Rates</SelectItem>
                      <SelectItem value="COMPOUND">Compound Interest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Policy description (optional)"
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // Validate required fields
                    if (!policyForm.name.trim()) {
                      toast.error("Policy name is required");
                      return;
                    }

                    // Handle policy save
                    if (editingPolicy) {
                      updatePolicyMutation.mutate({
                        id: editingPolicy.id,
                        name: policyForm.name,
                        calculationType: policyForm.calculationType,
                        description: policyForm.description,
                        configuration: policyForm.configuration,
                      });
                    } else {
                      createPolicyMutation.mutate({
                        name: policyForm.name,
                        calculationType: policyForm.calculationType,
                        description: policyForm.description,
                        configuration: policyForm.configuration,
                        institutionId,
                        campusId,
                        isActive: true,
                      });
                    }
                  }}
                  disabled={createPolicyMutation.isLoading || updatePolicyMutation.isLoading}
                >
                  {createPolicyMutation.isLoading || updatePolicyMutation.isLoading
                    ? 'Saving...'
                    : editingPolicy
                    ? 'Update Policy'
                    : 'Create Policy'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
