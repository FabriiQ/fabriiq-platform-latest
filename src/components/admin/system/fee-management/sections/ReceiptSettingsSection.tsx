"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, FileText, Download, Mail, Printer } from "lucide-react";
import { UnifiedFeeConfig, ReceiptTemplate } from "@/types/fee-management-unified";

interface ReceiptSettingsSectionProps {
  config: UnifiedFeeConfig['receipts'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['receipts']>) => void;
  onReset: () => void;
}

export function ReceiptSettingsSection({ config, onUpdate, onReset }: ReceiptSettingsSectionProps) {
  const handleFeaturesUpdate = (field: string, value: boolean) => {
    onUpdate({
      features: {
        ...config.features,
        [field]: value,
      }
    });
  };

  const handleContentUpdate = (field: string, value: any) => {
    onUpdate({
      content: {
        ...config.content,
        [field]: value,
      }
    });
  };

  const handleDeliveryUpdate = (field: string, value: boolean) => {
    onUpdate({
      delivery: {
        ...config.delivery,
        [field]: value,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Receipt Settings</h2>
          <p className="text-muted-foreground">Configure receipt generation and delivery options</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* General Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Receipts</Label>
              <p className="text-sm text-muted-foreground">
                Generate receipts for payments
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => onUpdate({ enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Generate</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate receipts on payment
                  </p>
                </div>
                <Switch
                  checked={config.autoGenerate}
                  onCheckedChange={(checked) => onUpdate({ autoGenerate: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Receipt Template</Label>
                <Select 
                  value={config.template} 
                  onValueChange={(value) => onUpdate({ template: value as ReceiptTemplate })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ReceiptTemplate.DEFAULT}>Default Template</SelectItem>
                    <SelectItem value={ReceiptTemplate.MINIMAL}>Minimal Template</SelectItem>
                    <SelectItem value={ReceiptTemplate.DETAILED}>Detailed Template</SelectItem>
                    <SelectItem value={ReceiptTemplate.CUSTOM}>Custom Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.template === ReceiptTemplate.CUSTOM && (
                <div className="space-y-2">
                  <Label htmlFor="customTemplate">Custom Template</Label>
                  <Textarea
                    id="customTemplate"
                    value={config.customTemplate || ''}
                    onChange={(e) => onUpdate({ customTemplate: e.target.value })}
                    placeholder="Enter custom template HTML/text..."
                    rows={4}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Receipt Features */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Features</CardTitle>
              <CardDescription>
                Configure what elements to include in receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include QR Code</Label>
                    <p className="text-sm text-muted-foreground">
                      Add QR code for verification
                    </p>
                  </div>
                  <Switch
                    checked={config.features.includeQRCode}
                    onCheckedChange={(checked) => handleFeaturesUpdate('includeQRCode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Barcode</Label>
                    <p className="text-sm text-muted-foreground">
                      Add barcode for scanning
                    </p>
                  </div>
                  <Switch
                    checked={config.features.includeBarcode}
                    onCheckedChange={(checked) => handleFeaturesUpdate('includeBarcode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Show institution logo
                    </p>
                  </div>
                  <Switch
                    checked={config.features.includeLogo}
                    onCheckedChange={(checked) => handleFeaturesUpdate('includeLogo', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Signature</Label>
                    <p className="text-sm text-muted-foreground">
                      Add signature line
                    </p>
                  </div>
                  <Switch
                    checked={config.features.includeSignature}
                    onCheckedChange={(checked) => handleFeaturesUpdate('includeSignature', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Content */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Content</CardTitle>
              <CardDescription>
                Customize the text content of receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headerText">Header Text</Label>
                <Input
                  id="headerText"
                  value={config.content.headerText || ''}
                  onChange={(e) => handleContentUpdate('headerText', e.target.value)}
                  placeholder="Receipt header text..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Footer Text</Label>
                <Input
                  id="footerText"
                  value={config.content.footerText}
                  onChange={(e) => handleContentUpdate('footerText', e.target.value)}
                  placeholder="Thank you for your payment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
                <Textarea
                  id="termsAndConditions"
                  value={config.content.termsAndConditions || ''}
                  onChange={(e) => handleContentUpdate('termsAndConditions', e.target.value)}
                  placeholder="Terms and conditions text..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Contact Info</Label>
                  <p className="text-sm text-muted-foreground">
                    Show institution contact information
                  </p>
                </div>
                <Switch
                  checked={config.content.contactInfo}
                  onCheckedChange={(checked) => handleContentUpdate('contactInfo', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Options</CardTitle>
              <CardDescription>
                Configure how receipts are delivered to students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <div>
                      <Label>Auto Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Email receipts automatically
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.delivery.autoEmail}
                    onCheckedChange={(checked) => handleDeliveryUpdate('autoEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send receipt links via SMS
                    </p>
                  </div>
                  <Switch
                    checked={config.delivery.autoSMS}
                    onCheckedChange={(checked) => handleDeliveryUpdate('autoSMS', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <div>
                      <Label>Allow Download</Label>
                      <p className="text-sm text-muted-foreground">
                        Students can download receipts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.delivery.allowDownload}
                    onCheckedChange={(checked) => handleDeliveryUpdate('allowDownload', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    <div>
                      <Label>Allow Print</Label>
                      <p className="text-sm text-muted-foreground">
                        Students can print receipts
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.delivery.allowPrint}
                    onCheckedChange={(checked) => handleDeliveryUpdate('allowPrint', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
