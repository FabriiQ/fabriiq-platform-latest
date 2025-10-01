"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  Settings,
  FileText,
  Bell,
  BarChart,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  DollarSign as DollarSignIcon,
  Cog as CogIcon
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { UnifiedFeeConfig, FeeConfigSection } from "@/types/fee-management-unified";

// Import section components
import { GeneralSettingsSection } from "./sections/GeneralSettingsSection";
import { LateFeeSettingsSection } from "./sections/LateFeeSettingsSection";
import { ReceiptSettingsSection } from "./sections/ReceiptSettingsSection";
import { NotificationSettingsSection } from "./sections/NotificationSettingsSection";
import { ReportingSettingsSection } from "./sections/ReportingSettingsSection";
import { SystemSettingsSection } from "./sections/SystemSettingsSection";

interface UnifiedFeeManagementProps {
  institutionId?: string;
  campusId?: string;
}

export function UnifiedFeeManagement({ institutionId, campusId }: UnifiedFeeManagementProps) {
  const [activeSection, setActiveSection] = useState<FeeConfigSection>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localConfig, setLocalConfig] = useState<UnifiedFeeConfig | null>(null);

  // API queries and mutations
  const { 
    data: configData, 
    isLoading: isLoadingConfig, 
    refetch: refetchConfig 
  } = api.unifiedFeeManagement.getConfiguration.useQuery({
    institutionId,
    campusId,
  });

  const { 
    data: schemaData 
  } = api.unifiedFeeManagement.getConfigurationSchema.useQuery();

  const updateConfigMutation = api.unifiedFeeManagement.updateConfiguration.useMutation({
    onSuccess: () => {
      toast.success("Configuration updated successfully");
      setHasUnsavedChanges(false);
      refetchConfig();
    },
    onError: (error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });

  // Note: validateConfiguration is a query, not a mutation

  const resetConfigMutation = api.unifiedFeeManagement.resetToDefaults.useMutation({
    onSuccess: () => {
      toast.success("Configuration reset to defaults");
      setHasUnsavedChanges(false);
      refetchConfig();
    },
    onError: (error) => {
      toast.error(`Failed to reset configuration: ${error.message}`);
    },
  });

  // Initialize local config when data loads
  React.useEffect(() => {
    if (configData?.configuration && !localConfig) {
      setLocalConfig(configData.configuration);
    }
  }, [configData, localConfig]);

  // Handle section updates
  const handleSectionUpdate = (section: FeeConfigSection, updates: any) => {
    if (!localConfig) return;

    const updatedConfig = {
      ...localConfig,
      [section]: {
        ...localConfig[section],
        ...updates,
      },
    };

    setLocalConfig(updatedConfig);
    setHasUnsavedChanges(true);
  };

  // Save configuration
  const handleSave = async () => {
    if (!localConfig) return;

    try {
      await updateConfigMutation.mutateAsync({
        updates: localConfig,
        institutionId,
        campusId,
      });
    } catch (error) {
      console.error("Failed to save configuration:", error);
    }
  };

  // Reset to defaults
  const handleReset = async (sections?: FeeConfigSection[]) => {
    try {
      await resetConfigMutation.mutateAsync({
        sections,
        institutionId,
        campusId,
        confirm: true,
      });
    } catch (error) {
      console.error("Failed to reset configuration:", error);
    }
  };

  // Validate configuration
  const handleValidate = async () => {
    if (!localConfig) return;

    try {
      // Since validateConfiguration is a query, we'll use a simple validation
      toast.success("Configuration validation is not yet implemented");
    } catch (error) {
      console.error("Failed to validate configuration:", error);
    }
  };

  if (isLoadingConfig || !localConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  const sections = schemaData?.sections || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Fee Management Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Unified settings for all fee management operations
          </p>
        </div>
        
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          <Button
            variant="outline"
            onClick={handleValidate}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate
          </Button>

          <Button
            variant="outline"
            onClick={() => handleReset()}
            disabled={resetConfigMutation.isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset All
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || updateConfigMutation.isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Configuration Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm">Configuration Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Version: {localConfig.system.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Last Updated: {new Date(localConfig.system.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Updated By: {localConfig.system.updatedBy}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Configuration Tabs */}
      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as FeeConfigSection)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="lateFees" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            Late Fees
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="reporting" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Reporting
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <CogIcon className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettingsSection
            config={localConfig.general}
            onUpdate={(updates) => handleSectionUpdate('general', updates)}
            onReset={() => handleReset(['general'])}
          />
        </TabsContent>

        <TabsContent value="lateFees" className="mt-6">
          <LateFeeSettingsSection
            config={localConfig.lateFees}
            onUpdate={(updates) => handleSectionUpdate('lateFees', updates)}
            onReset={() => handleReset(['lateFees'])}
            institutionId={institutionId}
            campusId={campusId}
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-6">
          <ReceiptSettingsSection
            config={localConfig.receipts}
            onUpdate={(updates) => handleSectionUpdate('receipts', updates)}
            onReset={() => handleReset(['receipts'])}
          />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettingsSection
            config={localConfig.notifications}
            onUpdate={(updates) => handleSectionUpdate('notifications', updates)}
            onReset={() => handleReset(['notifications'])}
          />
        </TabsContent>

        <TabsContent value="reporting" className="mt-6">
          <ReportingSettingsSection
            config={localConfig.reporting}
            onUpdate={(updates) => handleSectionUpdate('reporting', updates)}
            onReset={() => handleReset(['reporting'])}
          />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemSettingsSection
            config={localConfig.system}
            onUpdate={(updates) => handleSectionUpdate('system', updates)}
            onReset={() => handleReset(['system'])}
          />
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save your configuration before leaving this page.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
