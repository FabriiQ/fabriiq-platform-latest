"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, BarChart, Download, Database, Clock } from "lucide-react";
import { UnifiedFeeConfig } from "@/types/fee-management-unified";

interface ReportingSettingsSectionProps {
  config: UnifiedFeeConfig['reporting'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['reporting']>) => void;
  onReset: () => void;
}

export function ReportingSettingsSection({ config, onUpdate, onReset }: ReportingSettingsSectionProps) {
  const handleDashboardsUpdate = (field: string, value: any) => {
    onUpdate({
      dashboards: {
        ...config.dashboards,
        [field]: value,
      }
    });
  };

  const handleExportsUpdate = (field: string, value: any) => {
    onUpdate({
      exports: {
        ...config.exports,
        [field]: value,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Reporting Settings</h2>
          <p className="text-muted-foreground">Configure analytics, dashboards, and data exports</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* General Reporting Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Reporting</Label>
              <p className="text-sm text-muted-foreground">
                Enable analytics and reporting features
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => onUpdate({ enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retentionPeriod">Data Retention (Months)</Label>
                  <Input
                    id="retentionPeriod"
                    type="number"
                    min="12"
                    max="120"
                    value={config.retentionPeriodMonths}
                    onChange={(e) => onUpdate({ retentionPeriodMonths: parseInt(e.target.value) })}
                  />
                  <p className="text-sm text-muted-foreground">
                    How long to keep reporting data
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Archive Old Records</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically archive old data
                    </p>
                  </div>
                  <Switch
                    checked={config.archiveOldRecords}
                    onCheckedChange={(checked) => onUpdate({ archiveOldRecords: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Dashboard Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dashboard Configuration
              </CardTitle>
              <CardDescription>
                Configure real-time dashboards and data refresh settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Real-Time Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Show live data in dashboards
                  </p>
                </div>
                <Switch
                  checked={config.dashboards.enableRealTimeData}
                  onCheckedChange={(checked) => handleDashboardsUpdate('enableRealTimeData', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Refresh Interval (Minutes)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    min="5"
                    max="60"
                    value={config.dashboards.refreshIntervalMinutes}
                    onChange={(e) => handleDashboardsUpdate('refreshIntervalMinutes', parseInt(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">
                    How often to refresh dashboard data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Date Range</Label>
                  <Select 
                    value={config.dashboards.defaultDateRange} 
                    onValueChange={(value) => handleDashboardsUpdate('defaultDateRange', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="1y">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Default time range for dashboard views
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Configuration
              </CardTitle>
              <CardDescription>
                Configure data export formats and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Allowed Export Formats</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>CSV Export</Label>
                      <p className="text-sm text-muted-foreground">
                        Comma-separated values
                      </p>
                    </div>
                    <Switch
                      checked={config.exports.allowCSV}
                      onCheckedChange={(checked) => handleExportsUpdate('allowCSV', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>PDF Export</Label>
                      <p className="text-sm text-muted-foreground">
                        Portable document format
                      </p>
                    </div>
                    <Switch
                      checked={config.exports.allowPDF}
                      onCheckedChange={(checked) => handleExportsUpdate('allowPDF', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Excel Export</Label>
                      <p className="text-sm text-muted-foreground">
                        Microsoft Excel format
                      </p>
                    </div>
                    <Switch
                      checked={config.exports.allowExcel}
                      onCheckedChange={(checked) => handleExportsUpdate('allowExcel', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRecords">Maximum Records Per Export</Label>
                <Input
                  id="maxRecords"
                  type="number"
                  min="100"
                  max="50000"
                  value={config.exports.maxRecordsPerExport}
                  onChange={(e) => handleExportsUpdate('maxRecordsPerExport', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Limit the number of records that can be exported at once
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Advanced data management and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current Data Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label>Retention Period</Label>
                    <p className="font-medium">{config.retentionPeriodMonths} months</p>
                  </div>
                  <div>
                    <Label>Archive Status</Label>
                    <p className="font-medium">
                      {config.archiveOldRecords ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <Label>Real-time Updates</Label>
                    <p className="font-medium">
                      {config.dashboards.enableRealTimeData ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-2" />
                  Archive Old Data
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rebuild Indexes
                </Button>
                <Button variant="outline" size="sm">
                  <BarChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
