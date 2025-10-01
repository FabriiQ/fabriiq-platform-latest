"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw,
  Calculator,
  Settings,
  Database
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function UnifiedFeeManagementTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testAmount, setTestAmount] = useState(1000);
  const [testDays, setTestDays] = useState(30);

  // API calls for testing
  const { data: configData, refetch: refetchConfig } = api.unifiedFeeManagement.getConfiguration.useQuery();
  const { data: schemaData } = api.unifiedFeeManagement.getConfigurationSchema.useQuery();
  
  const calculateLateFee = api.unifiedFeeManagement.calculateLateFee.useMutation();
  const validateConfig = api.unifiedFeeManagement.validateConfiguration.useMutation();
  const migrateMutation = api.unifiedFeeManagement.migrateExistingSettings.useMutation();

  const runTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    const results: any[] = [];

    try {
      // Test 1: Configuration Loading
      results.push({
        name: "Configuration Loading",
        status: "running",
        description: "Testing if unified configuration loads correctly"
      });
      setTestResults([...results]);

      try {
        await refetchConfig();
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: configData ? "success" : "error",
          message: configData ? "Configuration loaded successfully" : "Failed to load configuration"
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "error",
          message: `Configuration loading failed: ${error}`
        };
      }
      setTestResults([...results]);

      // Test 2: Schema Validation
      results.push({
        name: "Schema Validation",
        status: "running",
        description: "Testing configuration schema validation"
      });
      setTestResults([...results]);

      try {
        const validation = await validateConfig.mutateAsync(configData?.configuration || {});
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: validation.validation.isValid ? "success" : "warning",
          message: validation.validation.isValid 
            ? "Configuration is valid" 
            : `Validation issues: ${validation.validation.errors.length} errors, ${validation.validation.warnings.length} warnings`
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "error",
          message: `Schema validation failed: ${error}`
        };
      }
      setTestResults([...results]);

      // Test 3: Late Fee Calculation
      results.push({
        name: "Late Fee Calculation",
        status: "running",
        description: `Testing late fee calculation for $${testAmount} after ${testDays} days`
      });
      setTestResults([...results]);

      try {
        const calculation = await calculateLateFee.mutateAsync({
          principalAmount: testAmount,
          daysOverdue: testDays,
        });
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "success",
          message: `Late fee calculated: $${calculation.calculation.amount.toFixed(2)} (${calculation.calculation.effectiveRate.toFixed(2)}% effective rate)`
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "error",
          message: `Late fee calculation failed: ${error}`
        };
      }
      setTestResults([...results]);

      // Test 4: Migration Dry Run
      results.push({
        name: "Migration Test",
        status: "running",
        description: "Testing migration of existing settings (dry run)"
      });
      setTestResults([...results]);

      try {
        const migration = await migrateMutation.mutateAsync({
          dryRun: true,
        });
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: migration.success ? "success" : "warning",
          message: migration.success 
            ? "Migration test completed successfully" 
            : `Migration test completed with issues: ${migration.errors?.join(', ')}`
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "error",
          message: `Migration test failed: ${error}`
        };
      }
      setTestResults([...results]);

      // Test 5: API Response Times
      results.push({
        name: "Performance Test",
        status: "running",
        description: "Testing API response times"
      });
      setTestResults([...results]);

      try {
        const startTime = Date.now();
        await refetchConfig();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: responseTime < 1000 ? "success" : responseTime < 3000 ? "warning" : "error",
          message: `Configuration loaded in ${responseTime}ms ${responseTime < 1000 ? "(Good)" : responseTime < 3000 ? "(Acceptable)" : "(Slow)"}`
        };
      } catch (error) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          status: "error",
          message: `Performance test failed: ${error}`
        };
      }
      setTestResults([...results]);

      // Summary
      const successCount = results.filter(r => r.status === "success").length;
      const warningCount = results.filter(r => r.status === "warning").length;
      const errorCount = results.filter(r => r.status === "error").length;

      if (errorCount === 0) {
        toast.success(`All tests completed! ${successCount} passed, ${warningCount} warnings`);
      } else {
        toast.error(`Tests completed with ${errorCount} errors, ${warningCount} warnings, ${successCount} passed`);
      }

    } catch (error) {
      toast.error(`Test suite failed: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <LoadingSpinner className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Unified Fee Management Test Suite</h1>
          <p className="text-muted-foreground mt-2">
            Validate the consolidated fee management system functionality
          </p>
        </div>
        
        <Button onClick={runTests} disabled={isRunningTests}>
          {isRunningTests ? (
            <LoadingSpinner className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Tests
        </Button>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testAmount">Test Principal Amount ($)</Label>
              <Input
                id="testAmount"
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(parseFloat(e.target.value))}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testDays">Test Days Overdue</Label>
              <Input
                id="testDays"
                type="number"
                value={testDays}
                onChange={(e) => setTestDays(parseInt(e.target.value))}
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {configData ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Loaded</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Not Loaded</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calculator className="h-4 w-4" />
              Late Fee Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {configData?.configuration?.lateFees?.enabled ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Enabled</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Disabled</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              Schema Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">
                {configData?.configuration?.system?.version || "Unknown"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results from the unified fee management system tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{result.name}</h4>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.description}
                    </p>
                    {result.message && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        {result.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => window.open('/admin/system/fee-management/unified', '_blank')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Open Unified Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={() => refetchConfig()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Configuration
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('/admin/system/fee-management', '_blank')}
            >
              <Database className="h-4 w-4 mr-2" />
              Legacy Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
