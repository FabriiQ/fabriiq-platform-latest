"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Cog, Shield, Zap, AlertTriangle, Info } from "lucide-react";
import { UnifiedFeeConfig } from "@/types/fee-management-unified";

interface SystemSettingsSectionProps {
  config: UnifiedFeeConfig['system'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['system']>) => void;
  onReset: () => void;
}

export function SystemSettingsSection({ config, onUpdate, onReset }: SystemSettingsSectionProps) {
  const handleValidationUpdate = (field: string, value: any) => {
    onUpdate({
      validation: {
        ...config.validation,
        [field]: value,
      }
    });
  };

  const handleIntegrationUpdate = (field: string, value: any) => {
    onUpdate({
      integration: {
        ...config.integration,
        [field]: value,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">System Settings</h2>
          <p className="text-muted-foreground">Advanced system configuration and integration settings</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Configuration Version</Label>
              <p className="text-lg font-semibold">{config.version}</p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="text-sm">
                {new Date(config.lastUpdated).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Updated By</Label>
              <p className="text-sm">{config.updatedBy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Validation & Security
          </CardTitle>
          <CardDescription>
            Configure data validation and security rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Strict Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable strict validation for all fee operations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={config.validation.strictMode}
                onCheckedChange={(checked) => handleValidationUpdate('strictMode', checked)}
              />
              <Badge variant={config.validation.strictMode ? "default" : "secondary"}>
                {config.validation.strictMode ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Negative Fees</Label>
              <p className="text-sm text-muted-foreground">
                Allow negative fee amounts (credits)
              </p>
            </div>
            <Switch
              checked={config.validation.allowNegativeFees}
              onCheckedChange={(checked) => handleValidationUpdate('allowNegativeFees', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval for Large Fees</Label>
              <p className="text-sm text-muted-foreground">
                Large fee amounts need admin approval
              </p>
            </div>
            <Switch
              checked={config.validation.requireApprovalForLargeFees}
              onCheckedChange={(checked) => handleValidationUpdate('requireApprovalForLargeFees', checked)}
            />
          </div>

          {config.validation.requireApprovalForLargeFees && (
            <div className="space-y-2">
              <Label htmlFor="largeFeesThreshold">Large Fees Threshold</Label>
              <Input
                id="largeFeesThreshold"
                type="number"
                min="0"
                step="0.01"
                value={config.validation.largeFeesThreshold}
                onChange={(e) => handleValidationUpdate('largeFeesThreshold', parseFloat(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Fee amounts above this value require approval
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Integration & API
          </CardTitle>
          <CardDescription>
            Configure external integrations and API access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Webhooks</Label>
              <p className="text-sm text-muted-foreground">
                Send webhook notifications for fee events
              </p>
            </div>
            <Switch
              checked={config.integration.enableWebhooks}
              onCheckedChange={(checked) => handleIntegrationUpdate('enableWebhooks', checked)}
            />
          </div>

          {config.integration.enableWebhooks && (
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                value={config.integration.webhookUrl || ''}
                onChange={(e) => handleIntegrationUpdate('webhookUrl', e.target.value)}
                placeholder="https://your-app.com/webhooks/fees"
              />
              <p className="text-sm text-muted-foreground">
                URL to receive webhook notifications
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable API Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow external API access to fee data
              </p>
            </div>
            <Switch
              checked={config.integration.enableAPIAccess}
              onCheckedChange={(checked) => handleIntegrationUpdate('enableAPIAccess', checked)}
            />
          </div>

          {config.integration.enableAPIAccess && (
            <div className="space-y-2">
              <Label htmlFor="apiRateLimit">API Rate Limit (requests/minute)</Label>
              <Input
                id="apiRateLimit"
                type="number"
                min="10"
                max="1000"
                value={config.integration.apiRateLimit}
                onChange={(e) => handleIntegrationUpdate('apiRateLimit', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Maximum API requests per minute per client
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <Label className="text-green-800">Configuration Status</Label>
              </div>
              <p className="text-sm text-green-700">Active and Valid</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                <Label className="text-blue-800">Integration Status</Label>
              </div>
              <p className="text-sm text-blue-700">
                {config.integration.enableWebhooks || config.integration.enableAPIAccess 
                  ? 'Integrations Enabled' 
                  : 'No Active Integrations'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Configuration
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Validate Settings
            </Button>
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Test Integrations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warnings and Alerts */}
      {(!config.validation.strictMode || config.validation.allowNegativeFees) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> Some validation settings may affect system security. 
            {!config.validation.strictMode && " Strict mode is disabled."}
            {config.validation.allowNegativeFees && " Negative fees are allowed."}
            {" "}Review these settings carefully.
          </AlertDescription>
        </Alert>
      )}

      {(config.integration.enableWebhooks || config.integration.enableAPIAccess) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Integration Active:</strong> External integrations are enabled. 
            Ensure proper security measures are in place for webhook URLs and API access.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
