"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Play, Eye, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function RecurringFeesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Trigger recurring fee generation
  const generateRecurringFeesMutation = api.enrollmentFee.generateRecurringFees.useMutation({
    onSuccess: (result) => {
      setLastResult(result);
      setIsProcessing(false);
      toast.success(`Recurring fees processed: ${result.created} fees created`);
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error(`Failed to process recurring fees: ${error.message}`);
    },
  });

  const handleDryRun = () => {
    setIsProcessing(true);
    generateRecurringFeesMutation.mutate({ dryRun: true });
  };

  const handleActualRun = () => {
    setIsProcessing(true);
    generateRecurringFeesMutation.mutate({ dryRun: false });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Fee Management</h1>
          <p className="text-muted-foreground">
            Manage and process recurring fees for active enrollments
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  With recurring fee structures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Generation</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Fees ready to be generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Processing</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Automated cron job
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How Recurring Fees Work</CardTitle>
              <CardDescription>
                Understanding the new component-level recurring fee system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Fee Component Types:</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50">One-time</Badge>
                    <span className="text-sm">Admission, Security, Books, Registration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-blue-50">Recurring</Badge>
                    <span className="text-sm">Tuition, Lab Fee, Library Fee, Transport</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Processing Logic:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Initial enrollment creates separate fees for one-time and recurring components</li>
                  <li>• Recurring components generate new fees based on their individual intervals</li>
                  <li>• System automatically processes recurring fees daily at 5 AM</li>
                  <li>• Each component can have different recurring intervals (Monthly, Quarterly, etc.)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Processing</CardTitle>
              <CardDescription>
                Manually trigger recurring fee generation for testing or immediate processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Always run a dry run first to see what fees would be generated before actual processing.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-4">
                <Button
                  onClick={handleDryRun}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <LoadingSpinner className="h-4 w-4" size="sm" variant="minimal" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span>Dry Run</span>
                </Button>

                <Button
                  onClick={handleActualRun}
                  disabled={isProcessing || !lastResult}
                  className="flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <LoadingSpinner className="h-4 w-4" size="sm" variant="minimal" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>Process Fees</span>
                </Button>
              </div>

              {isProcessing && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <LoadingSpinner className="h-4 w-4" size="sm" variant="minimal" />
                  <span>Processing recurring fees...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {lastResult ? (
            <Card>
              <CardHeader>
                <CardTitle>Last Processing Results</CardTitle>
                <CardDescription>
                  {lastResult.dryRun ? "Dry Run Results" : "Actual Processing Results"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{lastResult.processed}</div>
                    <div className="text-sm text-muted-foreground">Enrollments Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{lastResult.created}</div>
                    <div className="text-sm text-muted-foreground">Fees Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{lastResult.errors.length}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {lastResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Errors:</h4>
                    <div className="space-y-1">
                      {lastResult.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Badge variant={lastResult.dryRun ? "secondary" : "default"}>
                    {lastResult.dryRun ? "Dry Run" : "Actual Processing"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Completed at {new Date().toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No processing results yet. Run a dry run to see results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
