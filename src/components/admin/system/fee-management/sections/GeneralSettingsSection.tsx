"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Globe, Calendar, CreditCard } from "lucide-react";
import { UnifiedFeeConfig } from "@/types/fee-management-unified";
import { CURRENCIES, CURRENCY_REGIONS } from "@/data/currencies";

interface GeneralSettingsSectionProps {
  config: UnifiedFeeConfig['general'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['general']>) => void;
  onReset: () => void;
}

export function GeneralSettingsSection({ config, onUpdate, onReset }: GeneralSettingsSectionProps) {
  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    if (currency) {
      onUpdate({
        currency: {
          code: currency.code,
          symbol: currency.symbol,
          name: currency.name,
          region: currency.region,
        }
      });
    }
  };

  const handleDueDateUpdate = (field: string, value: any) => {
    onUpdate({
      dueDates: {
        ...config.dueDates,
        [field]: value,
      }
    });
  };

  const handlePaymentMethodUpdate = (field: string, value: boolean) => {
    onUpdate({
      paymentMethods: {
        ...config.paymentMethods,
        [field]: value,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">General Settings</h2>
          <p className="text-muted-foreground">Configure currency, due dates, and payment methods</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Currency Configuration
          </CardTitle>
          <CardDescription>
            Set the default currency for all fee calculations and displays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={config.currency.code} onValueChange={handleCurrencyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_REGIONS).map(([region, currencies]) => (
                    <div key={region}>
                      <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                        {region}
                      </div>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{currency.symbol}</span>
                            <span>{currency.name}</span>
                            <span className="text-muted-foreground">({currency.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Current Selection</Label>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono">{config.currency.symbol}</span>
                  <div>
                    <div className="font-medium">{config.currency.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {config.currency.code} • {config.currency.region}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Due Date Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Configuration
          </CardTitle>
          <CardDescription>
            Configure default due date calculations and holiday handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDaysFromEnrollment">Days from Enrollment</Label>
              <Input
                id="defaultDaysFromEnrollment"
                type="number"
                min="1"
                max="365"
                value={config.dueDates.defaultDaysFromEnrollment}
                onChange={(e) => handleDueDateUpdate('defaultDaysFromEnrollment', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Default days to add to enrollment date for fee due date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDaysFromTermStart">Days from Term Start</Label>
              <Input
                id="defaultDaysFromTermStart"
                type="number"
                min="1"
                max="365"
                value={config.dueDates.defaultDaysFromTermStart}
                onChange={(e) => handleDueDateUpdate('defaultDaysFromTermStart', parseInt(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Default days to add to term start date for fee due date
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Holiday and Weekend Handling</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Respect Holidays</Label>
                  <p className="text-sm text-muted-foreground">
                    Consider holidays when calculating due dates
                  </p>
                </div>
                <Switch
                  checked={config.dueDates.respectHolidays}
                  onCheckedChange={(checked) => handleDueDateUpdate('respectHolidays', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Extend on Weekends</Label>
                  <p className="text-sm text-muted-foreground">
                    Move due dates that fall on weekends
                  </p>
                </div>
                <Switch
                  checked={config.dueDates.extendOnWeekends}
                  onCheckedChange={(checked) => handleDueDateUpdate('extendOnWeekends', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Extend on Holidays</Label>
                  <p className="text-sm text-muted-foreground">
                    Move due dates that fall on holidays
                  </p>
                </div>
                <Switch
                  checked={config.dueDates.extendOnHolidays}
                  onCheckedChange={(checked) => handleDueDateUpdate('extendOnHolidays', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Configure which payment methods are available to students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Accepted Payment Methods</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cash Payments</Label>
                    <p className="text-sm text-muted-foreground">Allow cash payments at office</p>
                  </div>
                  <Switch
                    checked={config.paymentMethods.allowCash}
                    onCheckedChange={(checked) => handlePaymentMethodUpdate('allowCash', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Card Payments</Label>
                    <p className="text-sm text-muted-foreground">Credit/debit card payments</p>
                  </div>
                  <Switch
                    checked={config.paymentMethods.allowCard}
                    onCheckedChange={(checked) => handlePaymentMethodUpdate('allowCard', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bank Transfer</Label>
                    <p className="text-sm text-muted-foreground">Direct bank transfers</p>
                  </div>
                  <Switch
                    checked={config.paymentMethods.allowBankTransfer}
                    onCheckedChange={(checked) => handlePaymentMethodUpdate('allowBankTransfer', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Online Payments</Label>
                    <p className="text-sm text-muted-foreground">Online payment gateways</p>
                  </div>
                  <Switch
                    checked={config.paymentMethods.allowOnlinePayment}
                    onCheckedChange={(checked) => handlePaymentMethodUpdate('allowOnlinePayment', checked)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Installment Options</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Installments</Label>
                    <p className="text-sm text-muted-foreground">Enable payment in installments</p>
                  </div>
                  <Switch
                    checked={config.paymentMethods.allowInstallments}
                    onCheckedChange={(checked) => handlePaymentMethodUpdate('allowInstallments', checked)}
                  />
                </div>

                {config.paymentMethods.allowInstallments && (
                  <div className="space-y-2">
                    <Label htmlFor="maxInstallments">Maximum Installments</Label>
                    <Input
                      id="maxInstallments"
                      type="number"
                      min="2"
                      max="12"
                      value={config.paymentMethods.maxInstallments || 2}
                      onChange={(e) => handlePaymentMethodUpdate('maxInstallments', parseInt(e.target.value))}
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum number of installments allowed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
