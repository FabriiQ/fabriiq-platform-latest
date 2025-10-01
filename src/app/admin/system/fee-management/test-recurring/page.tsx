"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FeeStructureForm } from "@/components/shared/entities/fee/fee-structure-form";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function TestRecurringFeePage() {
  const [testResult, setTestResult] = useState<any>(null);

  // Mock data for testing
  const mockProgramCampuses = [
    { id: "1", name: "Grade 10 - Main Campus" },
    { id: "2", name: "Grade 11 - North Campus" },
  ];

  const mockAcademicCycles = [
    { id: "1", name: "Academic Year 2024-25" },
    { id: "2", name: "Academic Year 2025-26" },
  ];

  const mockTerms = [
    { id: "1", name: "Fall Term 2024" },
    { id: "2", name: "Spring Term 2025" },
  ];

  // Create fee structure mutation
  const createFeeStructureMutation = api.feeStructure.create.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      toast.success("Fee structure created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create fee structure: ${error.message}`);
    },
  });

  const handleSubmit = (values: any) => {
    console.log("Form values:", values);
    
    // Show what would be submitted
    setTestResult({
      submitted: true,
      values,
      analysis: analyzeComponents(values.components || []),
    });

    // Uncomment to actually create the fee structure
    // createFeeStructureMutation.mutate(values);
  };

  const analyzeComponents = (components: any[]) => {
    const oneTimeComponents = components.filter(c => !c.isRecurring);
    const recurringComponents = components.filter(c => c.isRecurring);
    
    return {
      total: components.length,
      oneTime: {
        count: oneTimeComponents.length,
        amount: oneTimeComponents.reduce((sum, c) => sum + c.amount, 0),
        components: oneTimeComponents,
      },
      recurring: {
        count: recurringComponents.length,
        amount: recurringComponents.reduce((sum, c) => sum + c.amount, 0),
        components: recurringComponents,
      },
    };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Recurring Fee Components</h1>
          <p className="text-muted-foreground">
            Test the new component-level recurring fee functionality
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Create Test Fee Structure</CardTitle>
            <CardDescription>
              Create a fee structure with mixed one-time and recurring components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeeStructureForm
              programCampuses={mockProgramCampuses}
              academicCycles={mockAcademicCycles}
              terms={mockTerms}
              onSubmit={handleSubmit}
              isLoading={createFeeStructureMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expected Behavior</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>One-time components</strong> (Admission, Security, Books) should be charged only once during enrollment.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recurring components</strong> (Tuition, Lab Fee) should generate new fees based on their intervals.
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Mixed billing:</strong> First invoice includes both types, then only recurring fees are generated.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Analysis of the submitted fee structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResult.analysis && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {testResult.analysis.oneTime.count}
                        </div>
                        <div className="text-sm text-muted-foreground">One-time Components</div>
                        <div className="text-lg font-semibold">
                          ${testResult.analysis.oneTime.amount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {testResult.analysis.recurring.count}
                        </div>
                        <div className="text-sm text-muted-foreground">Recurring Components</div>
                        <div className="text-lg font-semibold">
                          ${testResult.analysis.recurring.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Component Breakdown:</h4>
                      
                      {testResult.analysis.oneTime.components.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700">One-time Components:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {testResult.analysis.oneTime.components.map((comp: any, index: number) => (
                              <Badge key={index} variant="outline" className="bg-green-50">
                                {comp.name} (${comp.amount})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {testResult.analysis.recurring.components.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-blue-700">Recurring Components:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {testResult.analysis.recurring.components.map((comp: any, index: number) => (
                              <Badge key={index} variant="outline" className="bg-blue-50">
                                {comp.name} (${comp.amount}) - {comp.recurringInterval}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Initial Enrollment:</strong> Student would be charged ${testResult.analysis.oneTime.amount.toFixed(2)} for one-time fees and ${testResult.analysis.recurring.amount.toFixed(2)} for the first recurring period.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-4">
                  <strong>Note:</strong> This is a test mode. To actually create the fee structure, uncomment the mutation call in the code.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sample Fee Structure</CardTitle>
          <CardDescription>
            Try creating a fee structure with these components to test the functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Suggested One-time Components:</h4>
              <ul className="text-sm space-y-1">
                <li>• Admission Fee: $10,000 (ADMISSION)</li>
                <li>• Security Deposit: $5,000 (REGISTRATION)</li>
                <li>• Books & Materials: $3,000 (MISCELLANEOUS)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Suggested Recurring Components:</h4>
              <ul className="text-sm space-y-1">
                <li>• Tuition Fee: $8,000 (TUITION) - Monthly</li>
                <li>• Lab Fee: $1,000 (LABORATORY) - Monthly</li>
                <li>• Transport Fee: $500 (TRANSPORT) - Monthly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
