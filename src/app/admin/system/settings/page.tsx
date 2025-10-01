'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Button } from '@/components/ui/button';
import { Award, Globe } from 'lucide-react';
import Link from 'next/link';
import { BrandingSettings } from '@/components/admin/branding-settings';

/**
 * System Settings Page
 *
 * This page provides access to various system-wide settings and configurations.
 * It uses a tabbed interface to organize different setting categories.
 */
export default function SystemSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure system-wide settings and preferences"
      />

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-4">
          <BrandingSettings />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic system settings and defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Name</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    defaultValue="FabriQ LXP"
                    placeholder="Enter system name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Description</label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    rows={3}
                    defaultValue="Learning Experience Platform for Educational Institutions"
                    placeholder="Enter system description"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Language</label>
                  <select className="w-full p-2 border rounded-md">
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                <Button className="w-full">Save General Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reward System Settings</CardTitle>
              <CardDescription>
                Configure points, achievements, and leaderboard settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border border-muted hover:border-primary transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">Reward Points Configuration</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure point values for activities, achievements, and teacher rewards
                      </p>
                      <Button asChild size="sm">
                        <Link href="/admin/system/settings/reward-points">
                          Configure Points
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 border border-muted hover:border-primary transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">Achievement Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure achievement thresholds and requirements
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <Link href="/admin/system/settings/achievements">
                          Configure Achievements
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system-wide notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Send notifications via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">SMS Notifications</h4>
                    <p className="text-sm text-muted-foreground">Send notifications via SMS</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">Send browser push notifications</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Fee Due Reminders</h4>
                    <p className="text-sm text-muted-foreground">Automatic fee payment reminders</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Attendance Alerts</h4>
                    <p className="text-sm text-muted-foreground">Low attendance notifications</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <Button className="w-full">Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Security settings will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Localization Settings</CardTitle>
              <CardDescription>
                Configure language, date formats, and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Localization settings will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced system settings and optimizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Advanced settings will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
