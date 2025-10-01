"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Bell, Mail, MessageSquare, Smartphone, AlertTriangle } from "lucide-react";
import { UnifiedFeeConfig, NotificationFrequency } from "@/types/fee-management-unified";

interface NotificationSettingsSectionProps {
  config: UnifiedFeeConfig['notifications'];
  onUpdate: (updates: Partial<UnifiedFeeConfig['notifications']>) => void;
  onReset: () => void;
}

export function NotificationSettingsSection({ config, onUpdate, onReset }: NotificationSettingsSectionProps) {
  const handleDueDateRemindersUpdate = (field: string, value: any) => {
    onUpdate({
      dueDateReminders: {
        ...config.dueDateReminders,
        [field]: value,
      }
    });
  };

  const handleChannelUpdate = (section: string, channel: string, value: boolean) => {
    onUpdate({
      [section]: {
        ...config[section as keyof typeof config],
        channels: {
          ...(config[section as keyof typeof config] as any).channels,
          [channel]: value,
        }
      }
    });
  };

  const handlePaymentConfirmationsUpdate = (field: string, value: any) => {
    onUpdate({
      paymentConfirmations: {
        ...config.paymentConfirmations,
        [field]: value,
      }
    });
  };

  const handleOverdueNotificationsUpdate = (field: string, value: any) => {
    onUpdate({
      overdueNotifications: {
        ...config.overdueNotifications,
        [field]: value,
      }
    });
  };

  const handleLateFeeNotificationsUpdate = (field: string, value: any) => {
    onUpdate({
      lateFeeNotifications: {
        ...config.lateFeeNotifications,
        [field]: value,
      }
    });
  };

  const updateDaysBefore = (newDays: string) => {
    const days = newDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
    handleDueDateRemindersUpdate('daysBefore', days);
  };

  const updateEscalationDays = (newDays: string) => {
    const days = newDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
    handleOverdueNotificationsUpdate('escalationDays', days);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Notification Settings</h2>
          <p className="text-muted-foreground">Configure email, SMS, and push notifications</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Section
        </Button>
      </div>

      {/* Global Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all notifications
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => onUpdate({ enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Due Date Reminders */}
          <Card>
            <CardHeader>
              <CardTitle>Due Date Reminders</CardTitle>
              <CardDescription>
                Notify students before payment due dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Due Date Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders before due dates
                  </p>
                </div>
                <Switch
                  checked={config.dueDateReminders.enabled}
                  onCheckedChange={(checked) => handleDueDateRemindersUpdate('enabled', checked)}
                />
              </div>

              {config.dueDateReminders.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="daysBefore">Days Before Due Date</Label>
                    <Input
                      id="daysBefore"
                      value={config.dueDateReminders.daysBefore.join(', ')}
                      onChange={(e) => updateDaysBefore(e.target.value)}
                      placeholder="7, 3, 1"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated list of days before due date to send reminders
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {config.dueDateReminders.daysBefore.map(day => (
                        <Badge key={day} variant="outline">{day} days</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Notification Channels</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <Label>Email</Label>
                        </div>
                        <Switch
                          checked={config.dueDateReminders.channels.email}
                          onCheckedChange={(checked) => handleChannelUpdate('dueDateReminders', 'email', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <Label>SMS</Label>
                        </div>
                        <Switch
                          checked={config.dueDateReminders.channels.sms}
                          onCheckedChange={(checked) => handleChannelUpdate('dueDateReminders', 'sms', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <Label>Push Notifications</Label>
                        </div>
                        <Switch
                          checked={config.dueDateReminders.channels.push}
                          onCheckedChange={(checked) => handleChannelUpdate('dueDateReminders', 'push', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <Label>In-App</Label>
                        </div>
                        <Switch
                          checked={config.dueDateReminders.channels.inApp}
                          onCheckedChange={(checked) => handleChannelUpdate('dueDateReminders', 'inApp', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Confirmations */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Confirmations</CardTitle>
              <CardDescription>
                Notify students when payments are received
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Payment Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Send confirmations for successful payments
                  </p>
                </div>
                <Switch
                  checked={config.paymentConfirmations.enabled}
                  onCheckedChange={(checked) => handlePaymentConfirmationsUpdate('enabled', checked)}
                />
              </div>

              {config.paymentConfirmations.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Include Receipt</Label>
                      <p className="text-sm text-muted-foreground">
                        Attach receipt to confirmation
                      </p>
                    </div>
                    <Switch
                      checked={config.paymentConfirmations.includeReceipt}
                      onCheckedChange={(checked) => handlePaymentConfirmationsUpdate('includeReceipt', checked)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Notification Channels</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <Label>Email</Label>
                        </div>
                        <Switch
                          checked={config.paymentConfirmations.channels.email}
                          onCheckedChange={(checked) => handleChannelUpdate('paymentConfirmations', 'email', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <Label>SMS</Label>
                        </div>
                        <Switch
                          checked={config.paymentConfirmations.channels.sms}
                          onCheckedChange={(checked) => handleChannelUpdate('paymentConfirmations', 'sms', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <Label>Push Notifications</Label>
                        </div>
                        <Switch
                          checked={config.paymentConfirmations.channels.push}
                          onCheckedChange={(checked) => handleChannelUpdate('paymentConfirmations', 'push', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <Label>In-App</Label>
                        </div>
                        <Switch
                          checked={config.paymentConfirmations.channels.inApp}
                          onCheckedChange={(checked) => handleChannelUpdate('paymentConfirmations', 'inApp', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Overdue Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Overdue Notifications
              </CardTitle>
              <CardDescription>
                Notify students about overdue payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Overdue Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications for overdue payments
                  </p>
                </div>
                <Switch
                  checked={config.overdueNotifications.enabled}
                  onCheckedChange={(checked) => handleOverdueNotificationsUpdate('enabled', checked)}
                />
              </div>

              {config.overdueNotifications.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Notification Frequency</Label>
                    <Select 
                      value={config.overdueNotifications.frequency} 
                      onValueChange={(value) => handleOverdueNotificationsUpdate('frequency', value as NotificationFrequency)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NotificationFrequency.DAILY}>Daily</SelectItem>
                        <SelectItem value={NotificationFrequency.WEEKLY}>Weekly</SelectItem>
                        <SelectItem value={NotificationFrequency.MONTHLY}>Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="escalationDays">Escalation Days</Label>
                    <Input
                      id="escalationDays"
                      value={config.overdueNotifications.escalationDays.join(', ')}
                      onChange={(e) => updateEscalationDays(e.target.value)}
                      placeholder="7, 14, 30"
                    />
                    <p className="text-sm text-muted-foreground">
                      Days after due date to escalate notifications
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {config.overdueNotifications.escalationDays.map(day => (
                        <Badge key={day} variant="outline">{day} days</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Late Fee Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Late Fee Notifications</CardTitle>
              <CardDescription>
                Notify students about late fee applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Late Fee Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications about late fees
                  </p>
                </div>
                <Switch
                  checked={config.lateFeeNotifications.enabled}
                  onCheckedChange={(checked) => handleLateFeeNotificationsUpdate('enabled', checked)}
                />
              </div>

              {config.lateFeeNotifications.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notify Before Application</Label>
                      <p className="text-sm text-muted-foreground">
                        Warn before applying late fees
                      </p>
                    </div>
                    <Switch
                      checked={config.lateFeeNotifications.notifyBeforeApplication}
                      onCheckedChange={(checked) => handleLateFeeNotificationsUpdate('notifyBeforeApplication', checked)}
                    />
                  </div>

                  {config.lateFeeNotifications.notifyBeforeApplication && (
                    <div className="space-y-2">
                      <Label htmlFor="daysBefore">Days Before Application</Label>
                      <Input
                        id="daysBefore"
                        type="number"
                        min="0"
                        max="30"
                        value={config.lateFeeNotifications.daysBefore}
                        onChange={(e) => handleLateFeeNotificationsUpdate('daysBefore', parseInt(e.target.value))}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notify After Application</Label>
                      <p className="text-sm text-muted-foreground">
                        Confirm when late fees are applied
                      </p>
                    </div>
                    <Switch
                      checked={config.lateFeeNotifications.notifyAfterApplication}
                      onCheckedChange={(checked) => handleLateFeeNotificationsUpdate('notifyAfterApplication', checked)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
