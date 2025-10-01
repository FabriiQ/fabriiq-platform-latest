'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/data-display/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/trpc/react';
import {
  Plus,
  Settings,
  FileText,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Bell,
  Save,
} from 'lucide-react';
import { Currency, CURRENCY_REGIONS, formatCurrency, getAllRegions } from '@/data/currencies';
import { toast } from 'sonner';
import { LateFeePolicy } from '@/components/admin/system/fee-management/late-fees/LateFeePolicy';
import { LateFeeSettings } from '@/components/admin/system/fee-management/settings/LateFeeSettings';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';

export default function FeeSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('currency');
  const [showCustomCurrencyDialog, setShowCustomCurrencyDialog] = useState(false);
  const [customCurrency, setCustomCurrency] = useState<Partial<Currency>>({});

  // Fetch settings data
  const { data: feeSettings, isLoading: loadingSettings, refetch: refetchSettings } = api.settings.getFeeSettings.useQuery();
  const { data: allCurrencies, isLoading: loadingCurrencies } = api.settings.getAllCurrencies.useQuery();
  const { data: currencyData } = api.settings.getCurrenciesByRegion.useQuery({});
  const { data: session } = useSession();

  // Fetch late fee policies
  const { data: policiesData } = api.lateFee.getPolicies.useQuery({
    institutionId: user?.institutionId,
    campusId: session?.user?.primaryCampusId || undefined,
  });



  // Local state for form data
  const [currencySettings, setCurrencySettings] = useState<Currency | null>(null);
  const [dueDateSettings, setDueDateSettings] = useState<any>(null);
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);

  // Update local state when data loads
  useEffect(() => {
    if (feeSettings) {
      setCurrencySettings(feeSettings.currency);
      setDueDateSettings(feeSettings.dueDateSettings);
      setReceiptSettings(feeSettings.receiptSettings);
      setNotificationSettings(feeSettings.notificationSettings);
    }
  }, [feeSettings]);

  // Mutations
  const updateCurrencyMutation = api.settings.updateCurrency.useMutation({
    onSuccess: () => {
      toast.success('Currency settings updated successfully');
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update currency settings: ${error.message}`);
    }
  });

  const updateDueDateMutation = api.settings.updateDueDateSettings.useMutation({
    onSuccess: () => {
      toast.success('Due date settings updated successfully');
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update due date settings: ${error.message}`);
    }
  });

  const updateReceiptMutation = api.settings.updateReceiptSettings.useMutation({
    onSuccess: () => {
      toast.success('Receipt settings updated successfully');
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update receipt settings: ${error.message}`);
    }
  });

  const updateNotificationMutation = api.settings.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success('Notification settings updated successfully');
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to update notification settings: ${error.message}`);
    }
  });

  const createCustomCurrencyMutation = api.settings.createCustomCurrency.useMutation({
    onSuccess: () => {
      toast.success('Custom currency created successfully');
      setShowCustomCurrencyDialog(false);
      setCustomCurrency({});
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Failed to create custom currency: ${error.message}`);
    }
  });

  // Handler functions
  const handleSaveCurrency = () => {
    if (!currencySettings) return;
    updateCurrencyMutation.mutate({ currency: currencySettings });
  };

  const handleSaveDueDate = () => {
    if (!dueDateSettings) return;
    updateDueDateMutation.mutate({ settings: dueDateSettings });
  };

  const handleSaveReceipt = () => {
    if (!receiptSettings) return;
    updateReceiptMutation.mutate({ settings: receiptSettings });
  };

  const handleSaveNotification = () => {
    if (!notificationSettings) return;
    updateNotificationMutation.mutate({ settings: notificationSettings });
  };

  const handleCreateCustomCurrency = () => {
    if (!customCurrency.code || !customCurrency.name || !customCurrency.symbol || !customCurrency.country || !customCurrency.region) {
      toast.error('Please fill in all required fields');
      return;
    }
    createCustomCurrencyMutation.mutate({ currency: customCurrency as Currency });
  };

  if (loadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Fee Management Settings"
          description="Configure currency, due dates, receipts, and notifications"
        />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Fee Management Settings"
        description="Configure currency, due dates, receipts, and notifications for fee management"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="currency" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Currency
          </TabsTrigger>
          <TabsTrigger value="late-fees" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Late Fees & Due Dates
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Currency Settings Tab */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Currency Settings
              </CardTitle>
              <CardDescription>
                Configure the default currency for fee management and add custom currencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="currency-select">Default Currency</Label>
                  <Select
                    value={currencySettings?.code || ''}
                    onValueChange={(value) => {
                      const currency = allCurrencies?.find(c => c.code === value);
                      if (currency) setCurrencySettings(currency);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllRegions().map(region => (
                        <div key={region}>
                          <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                            {region}
                          </div>
                          {allCurrencies?.filter(c => c.region === region).map(currency => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{currency.symbol}</span>
                                <span>{currency.name} ({currency.code})</span>
                                <span className="text-muted-foreground">- {currency.country}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Current Currency Preview</Label>
                    <Button
                      onClick={() => {
                        if (currencySettings) {
                          updateCurrencyMutation.mutate({ currency: currencySettings });
                        }
                      }}
                      disabled={updateCurrencyMutation.isLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCurrencyMutation.isLoading ? 'Saving...' : 'Save Currency'}
                    </Button>
                  </div>
                  {currencySettings && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-mono">{currencySettings.symbol}</span>
                          <div>
                            <div className="font-medium">{currencySettings.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {currencySettings.code} - {currencySettings.country}
                            </div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Sample Amounts:</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(50000, currencySettings)} (Tuition Fee)
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(5000, currencySettings)} (Lab Fee)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Custom Currencies</h4>
                  <p className="text-sm text-muted-foreground">
                    Add custom currencies not available in the standard list
                  </p>
                </div>
                <Dialog open={showCustomCurrencyDialog} onOpenChange={setShowCustomCurrencyDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Custom Currency
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Currency</DialogTitle>
                      <DialogDescription>
                        Create a custom currency for your institution
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currency-code">Currency Code *</Label>
                          <Input
                            id="currency-code"
                            placeholder="e.g., PKR"
                            maxLength={3}
                            value={customCurrency.code || ''}
                            onChange={(e) => setCustomCurrency(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency-symbol">Symbol *</Label>
                          <Input
                            id="currency-symbol"
                            placeholder="e.g., ₨"
                            value={customCurrency.symbol || ''}
                            onChange={(e) => setCustomCurrency(prev => ({ ...prev, symbol: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency-name">Currency Name *</Label>
                        <Input
                          id="currency-name"
                          placeholder="e.g., Pakistani Rupee"
                          value={customCurrency.name || ''}
                          onChange={(e) => setCustomCurrency(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currency-country">Country *</Label>
                          <Input
                            id="currency-country"
                            placeholder="e.g., Pakistan"
                            value={customCurrency.country || ''}
                            onChange={(e) => setCustomCurrency(prev => ({ ...prev, country: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency-region">Region *</Label>
                          <Select
                            value={customCurrency.region || ''}
                            onValueChange={(value) => setCustomCurrency(prev => ({ ...prev, region: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAllRegions().map(region => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCustomCurrencyDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCustomCurrency} disabled={createCustomCurrencyMutation.isLoading}>
                        {createCustomCurrencyMutation.isLoading ? 'Creating...' : 'Create Currency'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCurrency} disabled={updateCurrencyMutation.isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateCurrencyMutation.isLoading ? 'Saving...' : 'Save Currency Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Late Fee Management & Due Dates Tab */}
        <TabsContent value="late-fees" className="space-y-6">
          {/* Consolidated Late Fee Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Late Fee Management
              </CardTitle>
              <CardDescription>
                Configure due dates, late fee policies, and automated rules for overdue payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Basic Due Date Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Due Date Configuration</h3>
                  </div>

                  {dueDateSettings && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="space-y-2">
                        <Label htmlFor="default-due-days">Default Due Days</Label>
                        <Input
                          id="default-due-days"
                          type="number"
                          min="1"
                          max="365"
                          value={dueDateSettings.defaultDueDays}
                          onChange={(e) => setDueDateSettings(prev => ({ ...prev, defaultDueDays: parseInt(e.target.value) }))}
                          className="border-blue-300 dark:border-blue-700"
                        />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Days from fee assignment to due date
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="grace-period">Grace Period (Days)</Label>
                        <Input
                          id="grace-period"
                          type="number"
                          min="0"
                          max="30"
                          value={dueDateSettings.gracePeriodDays}
                          onChange={(e) => setDueDateSettings(prev => ({ ...prev, gracePeriodDays: parseInt(e.target.value) }))}
                          className="border-blue-300 dark:border-blue-700"
                        />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Additional days before late fees apply
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Enable Late Fees</Label>
                          <Switch
                            checked={dueDateSettings.lateFeesEnabled}
                            onCheckedChange={(checked) => setDueDateSettings(prev => ({ ...prev, lateFeesEnabled: checked }))}
                          />
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Automatically apply late fees for overdue payments
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveDueDate} disabled={updateDueDateMutation.isLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateDueDateMutation.isLoading ? 'Saving...' : 'Save Due Date Settings'}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Late Fee Policies */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Late Fee Policies</h3>
                    <Badge className="ml-2 border border-gray-200 text-gray-800">
                      {policiesData?.policies?.length || 0} Policies Available
                    </Badge>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Policy Assignment:</strong> Late fee policies must be manually assigned to specific fee types, programs, or classes.
                        Multiple policies can be created, but only assigned policies will be applied to calculate overdue amounts.
                      </div>
                    </div>
                  </div>

                  <LateFeePolicy
                    institutionId={user?.institutionId || undefined}
                    campusId={user?.primaryCampusId || undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipt Settings Tab */}
        <TabsContent value="receipts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Receipt Settings
              </CardTitle>
              <CardDescription>
                Configure receipt generation, templates, and formatting options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {receiptSettings && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Receipts</Label>
                          <p className="text-sm text-muted-foreground">
                            Generate receipts for fee payments
                          </p>
                        </div>
                        <Switch
                          checked={receiptSettings.enabled}
                          onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, enabled: checked }))}
                        />
                      </div>

                      {receiptSettings.enabled && (
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto Generate</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically generate receipts on payment
                            </p>
                          </div>
                          <Switch
                            checked={receiptSettings.autoGenerate}
                            onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, autoGenerate: checked }))}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="receipt-template">Receipt Template</Label>
                        <Select
                          value={receiptSettings.template}
                          onValueChange={(value) => setReceiptSettings(prev => ({ ...prev, template: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Template</SelectItem>
                            <SelectItem value="minimal">Minimal Template</SelectItem>
                            <SelectItem value="detailed">Detailed Template</SelectItem>
                            <SelectItem value="custom">Custom Template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {receiptSettings.enabled && (
                    <div className="space-y-4">
                      <Separator />
                      <h4 className="font-medium">Receipt Features</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Include QR Code</Label>
                            <p className="text-sm text-muted-foreground">
                              Add QR code for verification
                            </p>
                          </div>
                          <Switch
                            checked={receiptSettings.includeQRCode}
                            onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, includeQRCode: checked }))}
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
                            checked={receiptSettings.includeBarcode}
                            onCheckedChange={(checked) => setReceiptSettings(prev => ({ ...prev, includeBarcode: checked }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="footer-text">Footer Text</Label>
                        <Textarea
                          id="footer-text"
                          placeholder="Thank you for your payment"
                          value={receiptSettings.footerText}
                          onChange={(e) => setReceiptSettings(prev => ({ ...prev, footerText: e.target.value }))}
                          rows={3}
                        />
                        <p className="text-sm text-muted-foreground">
                          Custom message to display at the bottom of receipts
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveReceipt} disabled={updateReceiptMutation.isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateReceiptMutation.isLoading ? 'Saving...' : 'Save Receipt Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure automated notifications for fee reminders, payments, and overdue notices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationSettings && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send automated notifications for fee-related events
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.enabled}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                  </div>

                  {notificationSettings.enabled && (
                    <div className="space-y-6">
                      <Separator />

                      {/* Due Date Reminders */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Due Date Reminders</Label>
                            <p className="text-sm text-muted-foreground">
                              Send reminders before fee due dates
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.dueDateReminders.enabled}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              dueDateReminders: { ...prev.dueDateReminders, enabled: checked }
                            }))}
                          />
                        </div>

                        {notificationSettings.dueDateReminders.enabled && (
                          <div className="pl-4 border-l-2 border-muted space-y-2">
                            <Label>Reminder Days</Label>
                            <div className="flex flex-wrap gap-2">
                              {[1, 3, 7, 14, 30].map(days => (
                                <Button
                                  key={days}
                                  variant={notificationSettings.dueDateReminders.daysBefore.includes(days) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    const currentDays = notificationSettings.dueDateReminders.daysBefore;
                                    const newDays = currentDays.includes(days)
                                      ? currentDays.filter(d => d !== days)
                                      : [...currentDays, days].sort((a, b) => b - a);
                                    setNotificationSettings(prev => ({
                                      ...prev,
                                      dueDateReminders: { ...prev.dueDateReminders, daysBefore: newDays }
                                    }));
                                  }}
                                >
                                  {days} day{days > 1 ? 's' : ''}
                                </Button>
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Selected: {notificationSettings.dueDateReminders.daysBefore.join(', ')} days before due date
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Payment Confirmations */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Payment Confirmations</Label>
                            <p className="text-sm text-muted-foreground">
                              Send confirmations when payments are received
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.paymentConfirmations.enabled}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              paymentConfirmations: { ...prev.paymentConfirmations, enabled: checked }
                            }))}
                          />
                        </div>

                        {notificationSettings.paymentConfirmations.enabled && (
                          <div className="pl-4 border-l-2 border-muted space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>Send Email</Label>
                              <Switch
                                checked={notificationSettings.paymentConfirmations.sendEmail}
                                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                  ...prev,
                                  paymentConfirmations: { ...prev.paymentConfirmations, sendEmail: checked }
                                }))}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Send SMS</Label>
                              <Switch
                                checked={notificationSettings.paymentConfirmations.sendSMS}
                                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                                  ...prev,
                                  paymentConfirmations: { ...prev.paymentConfirmations, sendSMS: checked }
                                }))}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Overdue Notifications */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Overdue Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                              Send notifications for overdue payments
                            </p>
                          </div>
                          <Switch
                            checked={notificationSettings.overdueNotifications.enabled}
                            onCheckedChange={(checked) => setNotificationSettings(prev => ({
                              ...prev,
                              overdueNotifications: { ...prev.overdueNotifications, enabled: checked }
                            }))}
                          />
                        </div>

                        {notificationSettings.overdueNotifications.enabled && (
                          <div className="pl-4 border-l-2 border-muted space-y-4">
                            <div className="space-y-2">
                              <Label>Notification Frequency</Label>
                              <Select
                                value={notificationSettings.overdueNotifications.frequency}
                                onValueChange={(value) => setNotificationSettings(prev => ({
                                  ...prev,
                                  overdueNotifications: { ...prev.overdueNotifications, frequency: value as any }
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DAILY">Daily</SelectItem>
                                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Escalation Days</Label>
                              <div className="flex flex-wrap gap-2">
                                {[7, 14, 30, 60, 90].map(days => (
                                  <Button
                                    key={days}
                                    variant={notificationSettings.overdueNotifications.escalationDays.includes(days) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      const currentDays = notificationSettings.overdueNotifications.escalationDays;
                                      const newDays = currentDays.includes(days)
                                        ? currentDays.filter(d => d !== days)
                                        : [...currentDays, days].sort((a, b) => a - b);
                                      setNotificationSettings(prev => ({
                                        ...prev,
                                        overdueNotifications: { ...prev.overdueNotifications, escalationDays: newDays }
                                      }));
                                    }}
                                  >
                                    {days} days
                                  </Button>
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Send escalated notifications after: {notificationSettings.overdueNotifications.escalationDays.join(', ')} days overdue
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveNotification} disabled={updateNotificationMutation.isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateNotificationMutation.isLoading ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
