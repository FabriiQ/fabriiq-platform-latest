"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading";

export default function TestSimpleFeeStructurePage() {
  const [formData, setFormData] = useState({
    name: "Test Fee Structure",
    description: "Test fee structure with recurring components",
    programCampusId: "",
    isRecurring: true,
    recurringInterval: "MONTHLY",
    components: [
      {
        name: "Admission Fee",
        type: "ADMISSION",
        amount: 10000,
        description: "One-time admission fee",
        isRecurring: false,
        recurringInterval: undefined,
      },
      {
        name: "Tuition Fee",
        type: "TUITION",
        amount: 8000,
        description: "Monthly tuition fee",
        isRecurring: true,
        recurringInterval: "MONTHLY",
      },
    ],
  });

  // Get program campuses for selection
  const { data: programCampuses, isLoading: programCampusesLoading } = api.programCampus.getAll.useQuery();

  // Create fee structure mutation
  const createFeeStructureMutation = api.feeStructure.create.useMutation({
    onSuccess: (result) => {
      toast.success(`Fee structure created successfully! ID: ${result.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create fee structure: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formData.programCampusId) {
      toast.error("Please select a program campus");
      return;
    }

    createFeeStructureMutation.mutate({
      name: formData.name,
      description: formData.description,
      programCampusId: formData.programCampusId,
      isRecurring: formData.isRecurring,
      recurringInterval: formData.recurringInterval,
      feeComponents: formData.components,
    });
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const newComponents = [...formData.components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setFormData({ ...formData, components: newComponents });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simple Fee Structure Test</h1>
          <p className="text-muted-foreground">
            Create a test fee structure with recurring components
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Test Fee Structure</CardTitle>
            <CardDescription>Fill in the basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programCampus">Program Campus</Label>
              {programCampusesLoading ? (
                <LoadingSpinner />
              ) : (
                <Select
                  value={formData.programCampusId}
                  onValueChange={(value) => setFormData({ ...formData, programCampusId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {programCampuses?.map((pc) => (
                      <SelectItem key={pc.id} value={pc.id}>
                        {pc.program?.name} - {pc.campus?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
              />
              <Label htmlFor="isRecurring">Auto-generate recurring fees</Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurringInterval">Default Billing Cycle</Label>
                <Select
                  value={formData.recurringInterval}
                  onValueChange={(value) => setFormData({ ...formData, recurringInterval: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="SEMESTER">Semester</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={createFeeStructureMutation.isPending}
              className="w-full"
            >
              {createFeeStructureMutation.isPending ? "Creating..." : "Create Fee Structure"}
            </Button>
          </CardContent>
        </Card>

        {/* Components */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Components</CardTitle>
            <CardDescription>Configure individual components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.components.map((component, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{component.name}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant={component.isRecurring ? "default" : "secondary"}>
                      {component.isRecurring ? component.recurringInterval : "One-time"}
                    </Badge>
                    <Badge variant="outline">{component.type}</Badge>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      value={component.amount}
                      onChange={(e) => updateComponent(index, "amount", Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={component.isRecurring}
                      onCheckedChange={(checked) => updateComponent(index, "isRecurring", checked)}
                    />
                    <Label className="text-xs">Recurring</Label>
                  </div>
                </div>

                {component.isRecurring && (
                  <div>
                    <Label className="text-xs">Interval</Label>
                    <Select
                      value={component.recurringInterval || "MONTHLY"}
                      onValueChange={(value) => updateComponent(index, "recurringInterval", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="SEMESTER">Semester</SelectItem>
                        <SelectItem value="ANNUAL">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t">
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <span className="font-medium">One-time Total: </span>
                  <span className="text-green-600">
                    ${formData.components.filter(c => !c.isRecurring).reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Recurring Total: </span>
                  <span className="text-blue-600">
                    ${formData.components.filter(c => c.isRecurring).reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
