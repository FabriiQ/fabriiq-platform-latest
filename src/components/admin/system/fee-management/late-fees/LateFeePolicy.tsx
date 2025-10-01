"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, Settings, DollarSign, Calendar, Percent, Clock, CheckCircle } from "@/components/ui/icons/lucide-icons";
import { HelpCircle, AlertCircle, Info } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LateFeeCalculationType, CompoundingInterval } from "@prisma/client";

interface LateFeePolicy {
  id: string;
  name: string;
  description: string | null;
  calculationType: LateFeeCalculationType;
  amount: number;
  maxAmount?: number | null;
  minAmount: number;
  gracePeriodDays: number;
  applyAfterDays: number;
  compoundingEnabled: boolean;
  compoundingInterval?: CompoundingInterval | null;
  maxCompoundingPeriods?: number | null;
  tieredRules?: any; // Use any to handle JsonValue from Prisma
  applyOnWeekends: boolean;
  applyOnHolidays: boolean;
  autoApply: boolean;
  applicableToFeeTypes: string[];
  applicableToPrograms: string[];
  applicableToClasses: string[];
  isActive: boolean;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  institutionId?: string | null;
  campusId?: string | null;
  _count: {
    applications: number;
  };
}

interface LateFeeProps {
  institutionId?: string | null;
  campusId?: string | null;
}

// Helper function to safely parse tiered rules from JSON
const parseTieredRules = (tieredRules: any): Array<{ daysFrom: number; daysTo: number; amount: number }> => {
  if (!tieredRules) return [];
  if (Array.isArray(tieredRules)) return tieredRules;
  if (typeof tieredRules === 'string') {
    try {
      return JSON.parse(tieredRules);
    } catch {
      return [];
    }
  }
  return [];
};

export function LateFeePolicy({ institutionId, campusId }: LateFeeProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<LateFeePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch policies and currency settings
  const { data: policiesData, refetch } = api.lateFee.getPolicies.useQuery({
    institutionId: institutionId || undefined,
    campusId: campusId || undefined,
  });

  const { data: feeSettings } = api.settings.getFeeSettings.useQuery();
  const currencySymbol = feeSettings?.currency?.symbol || '$';

  const createPolicyMutation = api.lateFee.createPolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create policy: ${error.message}`);
    },
  });

  const updatePolicyMutation = api.lateFee.updatePolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPolicy(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update policy: ${error.message}`);
    },
  });

  const deactivatePolicyMutation = api.lateFee.deactivatePolicy.useMutation({
    onSuccess: () => {
      toast.success("Late fee policy deactivated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to deactivate policy: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    calculationType: LateFeeCalculationType.FIXED as LateFeeCalculationType,
    amount: 0,
    maxAmount: undefined as number | undefined,
    minAmount: 0,
    gracePeriodDays: 7,
    applyAfterDays: 1,
    compoundingEnabled: false,
    compoundingInterval: CompoundingInterval.DAILY as CompoundingInterval | undefined,
    maxCompoundingPeriods: undefined as number | undefined,
    tieredRules: [] as Array<{ daysFrom: number; daysTo: number; amount: number }>,
    applyOnWeekends: true,
    applyOnHolidays: true,
    autoApply: true,
    applicableToFeeTypes: [] as string[],
    applicableToPrograms: [] as string[],
    applicableToClasses: [] as string[],
    effectiveFrom: undefined as Date | undefined,
    effectiveTo: undefined as Date | undefined,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      calculationType: LateFeeCalculationType.FIXED,
      amount: 0,
      maxAmount: undefined,
      minAmount: 0,
      gracePeriodDays: 7,
      applyAfterDays: 1,
      compoundingEnabled: false,
      compoundingInterval: CompoundingInterval.DAILY,
      maxCompoundingPeriods: undefined,
      tieredRules: [],
      applyOnWeekends: true,
      applyOnHolidays: true,
      autoApply: true,
      applicableToFeeTypes: [],
      applicableToPrograms: [],
      applicableToClasses: [],
      effectiveFrom: undefined,
      effectiveTo: undefined,
    });
  };

  const handleCreatePolicy = async () => {
    setIsLoading(true);
    try {
      await createPolicyMutation.mutateAsync({
        ...formData,
        institutionId: institutionId || undefined,
        campusId: campusId || undefined,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to create policy:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPolicy = (policy: LateFeePolicy) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || "",
      calculationType: policy.calculationType,
      amount: policy.amount,
      maxAmount: policy.maxAmount || undefined,
      minAmount: policy.minAmount,
      gracePeriodDays: policy.gracePeriodDays,
      applyAfterDays: policy.applyAfterDays,
      compoundingEnabled: policy.compoundingEnabled,
      compoundingInterval: policy.compoundingInterval ?? undefined,
      maxCompoundingPeriods: policy.maxCompoundingPeriods ?? undefined,
      tieredRules: parseTieredRules(policy.tieredRules),
      applyOnWeekends: policy.applyOnWeekends,
      applyOnHolidays: policy.applyOnHolidays,
      autoApply: policy.autoApply,
      applicableToFeeTypes: policy.applicableToFeeTypes,
      applicableToPrograms: policy.applicableToPrograms,
      applicableToClasses: policy.applicableToClasses,
      effectiveFrom: policy.effectiveFrom || undefined,
      effectiveTo: policy.effectiveTo || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePolicy = async () => {
    if (!selectedPolicy) return;

    setIsLoading(true);
    try {
      await updatePolicyMutation.mutateAsync({
        id: selectedPolicy.id,
        ...formData,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to update policy:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivatePolicy = async (policyId: string) => {
    if (confirm("Are you sure you want to deactivate this late fee policy?")) {
      await deactivatePolicyMutation.mutateAsync({ id: policyId });
    }
  };

  const getCalculationTypeDisplay = (type: LateFeeCalculationType) => {
    switch (type) {
      case LateFeeCalculationType.FIXED:
        return "Fixed Amount";
      case LateFeeCalculationType.PERCENTAGE:
        return "Percentage";
      case LateFeeCalculationType.DAILY_FIXED:
        return "Daily Fixed";
      case LateFeeCalculationType.DAILY_PERCENTAGE:
        return "Daily Percentage";
      case LateFeeCalculationType.TIERED_FIXED:
        return "Tiered Fixed";
      case LateFeeCalculationType.TIERED_PERCENTAGE:
        return "Tiered Percentage";
      default:
        return type;
    }
  };

  const getAmountDisplay = (policy: LateFeePolicy) => {
    switch (policy.calculationType) {
      case LateFeeCalculationType.PERCENTAGE:
      case LateFeeCalculationType.DAILY_PERCENTAGE:
      case LateFeeCalculationType.TIERED_PERCENTAGE:
        return `${policy.amount}%`;
      default:
        return `${currencySymbol}${policy.amount.toFixed(2)}`;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              Late Fee Policies
            </h2>
            <p className="text-muted-foreground mt-1">
              Create and manage advanced late fee policies for different scenarios and fee types
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {policiesData?.policies?.length || 0} Policies
            </Badge>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Policy
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Late Fee Policy</DialogTitle>
              <DialogDescription>
                Define a new late fee calculation policy with specific rules and conditions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Standard Late Fee"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculationType">Calculation Type</Label>
                  <Select
                    value={formData.calculationType}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      calculationType: value as LateFeeCalculationType
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LateFeeCalculationType.FIXED}>Fixed Amount</SelectItem>
                      <SelectItem value={LateFeeCalculationType.PERCENTAGE}>Percentage</SelectItem>
                      <SelectItem value={LateFeeCalculationType.DAILY_FIXED}>Daily Fixed</SelectItem>
                      <SelectItem value={LateFeeCalculationType.DAILY_PERCENTAGE}>Daily Percentage</SelectItem>
                      <SelectItem value={LateFeeCalculationType.TIERED_FIXED}>Tiered Fixed</SelectItem>
                      <SelectItem value={LateFeeCalculationType.TIERED_PERCENTAGE}>Tiered Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when and how this policy applies..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {formData.calculationType.includes('PERCENTAGE') ? 'Percentage (%)' : `Amount (${currencySymbol})`}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step={formData.calculationType.includes('PERCENTAGE') ? "0.1" : "0.01"}
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min="0"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodDays: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Max Amount ({currencySymbol})</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maxAmount || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Policy Assignment</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    This policy will only apply to fees when manually assigned to specific fee types, programs, or classes.
                    Multiple policies can exist, but assignment determines which one calculates overdue amounts.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Apply</Label>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Automatically apply this policy when assigned fees become overdue
                        </p>
                      </div>
                      <Switch
                        checked={formData.autoApply}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoApply: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Apply on Weekends</Label>
                      <p className="text-sm text-muted-foreground">
                        Include weekends in late fee calculations
                      </p>
                    </div>
                    <Switch
                      checked={formData.applyOnWeekends}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applyOnWeekends: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Apply on Holidays</Label>
                      <p className="text-sm text-muted-foreground">
                        Include holidays in late fee calculations
                      </p>
                    </div>
                    <Switch
                      checked={formData.applyOnHolidays}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applyOnHolidays: checked }))}
                    />
                  </div>
                </div>
              </div>

              {formData.calculationType.includes('DAILY') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Compounding</Label>
                      <p className="text-sm text-muted-foreground">
                        Apply compounding to daily calculations
                      </p>
                    </div>
                    <Switch
                      checked={formData.compoundingEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, compoundingEnabled: checked }))}
                    />
                  </div>

                  {formData.compoundingEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="compoundingInterval">Compounding Interval</Label>
                        <Select
                          value={formData.compoundingInterval}
                          onValueChange={(value) => setFormData(prev => ({
                            ...prev,
                            compoundingInterval: value as CompoundingInterval
                          }))}
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
                        <Label htmlFor="maxCompoundingPeriods">Max Compounding Periods</Label>
                        <Input
                          id="maxCompoundingPeriods"
                          type="number"
                          min="1"
                          value={formData.maxCompoundingPeriods || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            maxCompoundingPeriods: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePolicy} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Policy"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
        </div>

        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Active Policies</CardTitle>
                  <CardDescription className="mt-1">
                    Manage and monitor your late fee calculation policies
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-3 py-1">
                  {policiesData?.policies?.filter(p => p.isActive).length || 0} Active
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  {policiesData?.policies?.filter(p => !p.isActive).length || 0} Inactive
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {policiesData?.policies && policiesData.policies.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Policy Name
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Type
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Amount
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Grace Period
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Applications</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policiesData?.policies?.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{policy.name}</div>
                            {policy.description && (
                              <div className="text-sm text-muted-foreground">
                                {policy.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getCalculationTypeDisplay(policy.calculationType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getAmountDisplay(policy)}</TableCell>
                        <TableCell>{policy.gracePeriodDays} days</TableCell>
                        <TableCell>{policy._count?.applications || 0}</TableCell>
                        <TableCell>
                          <Badge variant={policy.isActive ? "default" : "secondary"}>
                            {policy.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPolicy(policy)}
                              title="Edit Policy"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement policy assignment dialog
                                toast.info("Policy assignment feature coming soon");
                              }}
                              title="Assign to Fee Types/Programs/Classes"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivatePolicy(policy.id)}
                              disabled={!policy.isActive}
                              title="Deactivate Policy"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Policies Created</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Create your first late fee policy to start managing overdue payments automatically.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Policy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Edit Dialog - Similar structure to Create Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Late Fee Policy</DialogTitle>
            <DialogDescription>
              Update the late fee calculation policy settings.
            </DialogDescription>
          </DialogHeader>

          {/* Edit form fields (mirrors Create dialog) */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Policy Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Late Fee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-calculationType">Calculation Type</Label>
                <Select
                  value={formData.calculationType}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    calculationType: value as LateFeeCalculationType
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LateFeeCalculationType.FIXED}>Fixed Amount</SelectItem>
                    <SelectItem value={LateFeeCalculationType.PERCENTAGE}>Percentage</SelectItem>
                    <SelectItem value={LateFeeCalculationType.DAILY_FIXED}>Daily Fixed</SelectItem>
                    <SelectItem value={LateFeeCalculationType.DAILY_PERCENTAGE}>Daily Percentage</SelectItem>
                    <SelectItem value={LateFeeCalculationType.TIERED_FIXED}>Tiered Fixed</SelectItem>
                    <SelectItem value={LateFeeCalculationType.TIERED_PERCENTAGE}>Tiered Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when and how this policy applies..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">
                  {formData.calculationType.includes('PERCENTAGE') ? 'Percentage (%)' : `Amount (${currencySymbol})`}
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  min="0"
                  step={formData.calculationType.includes('PERCENTAGE') ? "0.1" : "0.01"}
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gracePeriodDays">Grace Period (Days)</Label>
                <Input
                  id="edit-gracePeriodDays"
                  type="number"
                  min="0"
                  value={formData.gracePeriodDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodDays: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxAmount">Max Amount ({currencySymbol})</Label>
                <Input
                  id="edit-maxAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxAmount || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Apply</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply this policy when fees become overdue
                  </p>
                </div>
                <Switch
                  checked={formData.autoApply}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoApply: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apply on Weekends</Label>
                  <p className="text-sm text-muted-foreground">
                    Include weekends in late fee calculations
                  </p>
                </div>
                <Switch
                  checked={formData.applyOnWeekends}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applyOnWeekends: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Apply on Holidays</Label>
                  <p className="text-sm text-muted-foreground">
                    Include holidays in late fee calculations
                  </p>
                </div>
                <Switch
                  checked={formData.applyOnHolidays}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applyOnHolidays: checked }))}
                />
              </div>
            </div>

            {formData.calculationType.includes('DAILY') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Compounding</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply compounding to daily calculations
                    </p>
                  </div>
                  <Switch
                    checked={formData.compoundingEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, compoundingEnabled: checked }))}
                  />
                </div>

                {formData.compoundingEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-compoundingInterval">Compounding Interval</Label>
                      <Select
                        value={formData.compoundingInterval}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          compoundingInterval: value as CompoundingInterval
                        }))}
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
                      <Label htmlFor="edit-maxCompoundingPeriods">Max Compounding Periods</Label>
                      <Input
                        id="edit-maxCompoundingPeriods"
                        type="number"
                        min="1"
                        value={formData.maxCompoundingPeriods || ""}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          maxCompoundingPeriods: e.target.value ? parseInt(e.target.value) : undefined
                        }))}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePolicy} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
