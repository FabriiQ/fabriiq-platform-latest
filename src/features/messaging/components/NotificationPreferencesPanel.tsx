/**
 * Smart Notification Preferences Panel
 * Manages notification preferences with priority routing and time windows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Clock,
  Mail,
  MessageSquare,
  AlertTriangle,
  GraduationCap,
  Users,
  Settings,
  Activity // Using Activity instead of Smartphone
} from 'lucide-react';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';

export interface NotificationPreferences {
  id?: string;
  userId: string;
  
  // Message Type Preferences
  emergency: {
    enabled: boolean;
    methods: ('in-app' | 'email' | 'sms')[];
    timeRestriction: 'always' | 'school-hours' | 'custom';
    customHours?: { start: string; end: string };
  };
  
  academic: {
    enabled: boolean;
    methods: ('in-app' | 'email' | 'digest')[];
    timeRestriction: 'school-hours' | 'custom';
    customHours?: { start: string; end: string };
    digestFrequency: 'immediate' | 'hourly' | 'daily';
  };
  
  administrative: {
    enabled: boolean;
    methods: ('in-app' | 'email' | 'digest')[];
    timeRestriction: 'always' | 'school-hours' | 'custom';
    digestFrequency: 'immediate' | 'daily' | 'weekly';
  };
  
  social: {
    enabled: boolean;
    methods: ('in-app' | 'email')[];
    timeRestriction: 'focus-mode-off' | 'school-hours' | 'custom';
    focusModeEnabled: boolean;
  };
  
  // Global Settings
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    allowEmergency: boolean;
  };
  
  // Device Settings
  pushNotifications: boolean;
  emailDigest: boolean;
  smsEnabled: boolean;
  soundEnabled: boolean;
}

interface NotificationPreferencesPanelProps {
  onClose?: () => void;
}

export function NotificationPreferencesPanel({ onClose }: NotificationPreferencesPanelProps) {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user's notification preferences (TODO: Implement API endpoints)
  const userPreferences = null; // Temporarily disabled
  const refetch = () => {}; // Placeholder

  // Update preferences mutation (TODO: Implement API endpoints)
  const updatePreferencesMutation = {
    mutateAsync: async (prefs: any) => {
      console.log('Would save preferences:', prefs);
      setHasChanges(false);
    },
    isLoading: false
  };

  // Initialize preferences
  useEffect(() => {
    if (userPreferences) {
      setPreferences(userPreferences);
    } else if (session?.user?.id) {
      // Set default preferences
      setPreferences({
        userId: session.user.id,
        emergency: {
          enabled: true,
          methods: ['in-app', 'email', 'sms'],
          timeRestriction: 'always'
        },
        academic: {
          enabled: true,
          methods: ['in-app', 'email'],
          timeRestriction: 'school-hours',
          digestFrequency: 'immediate'
        },
        administrative: {
          enabled: true,
          methods: ['in-app', 'digest'],
          timeRestriction: 'school-hours',
          digestFrequency: 'daily'
        },
        social: {
          enabled: true,
          methods: ['in-app'],
          timeRestriction: 'focus-mode-off',
          focusModeEnabled: false
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00',
          allowEmergency: true
        },
        pushNotifications: true,
        emailDigest: true,
        smsEnabled: false,
        soundEnabled: true
      });
    }
  }, [userPreferences, session?.user?.id]);

  const handlePreferenceChange = (path: string, value: any) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPreferences = { ...preferences };
    let current: any = newPreferences;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleMethodToggle = (category: string, method: string) => {
    if (!preferences) return;

    const currentMethods = (preferences as any)[category].methods as string[];
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter((m: string) => m !== method)
      : [...currentMethods, method];

    handlePreferenceChange(`${category}.methods`, newMethods);
  };

  const handleSave = async () => {
    if (!preferences) return;

    await updatePreferencesMutation.mutateAsync(preferences);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'in-app': return <Bell className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Activity className="h-4 w-4" />;
      case 'digest': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'academic': return <GraduationCap className="h-4 w-4 text-blue-500" />;
      case 'administrative': return <Settings className="h-4 w-4 text-purple-500" />;
      case 'social': return <Users className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            Unsaved Changes
          </Badge>
        )}
      </div>

      {/* Message Type Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Message Types</h3>
        
        {/* Emergency Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getCategoryIcon('emergency')}
              Emergency Notifications
              <Badge className="bg-red-100 text-red-800">Always Priority</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable emergency notifications</span>
              <Switch
                checked={preferences.emergency.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('emergency.enabled', checked)}
              />
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Delivery Methods</div>
              <div className="flex gap-2">
                {['in-app', 'email', 'sms'].map((method) => (
                  <Button
                    key={method}
                    variant={(preferences.emergency.methods as string[]).includes(method) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMethodToggle('emergency', method)}
                    className="flex items-center gap-1"
                  >
                    {getMethodIcon(method)}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getCategoryIcon('academic')}
              Academic Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable academic notifications</span>
              <Switch
                checked={preferences.academic.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('academic.enabled', checked)}
              />
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Delivery Methods</div>
              <div className="flex gap-2">
                {['in-app', 'email', 'digest'].map((method) => (
                  <Button
                    key={method}
                    variant={(preferences.academic.methods as string[]).includes(method) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMethodToggle('academic', method)}
                    className="flex items-center gap-1"
                  >
                    {getMethodIcon(method)}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Time Restriction</div>
              <Select
                value={preferences.academic.timeRestriction}
                onValueChange={(value) => handlePreferenceChange('academic.timeRestriction', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school-hours">School Hours Only</SelectItem>
                  <SelectItem value="custom">Custom Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Digest Frequency</div>
              <Select
                value={preferences.academic.digestFrequency}
                onValueChange={(value) => handlePreferenceChange('academic.digestFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Administrative Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getCategoryIcon('administrative')}
              Administrative Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable administrative notifications</span>
              <Switch
                checked={preferences.administrative.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('administrative.enabled', checked)}
              />
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Delivery Methods</div>
              <div className="flex gap-2">
                {['in-app', 'email', 'digest'].map((method) => (
                  <Button
                    key={method}
                    variant={(preferences.administrative.methods as string[]).includes(method) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMethodToggle('administrative', method)}
                    className="flex items-center gap-1"
                  >
                    {getMethodIcon(method)}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Digest Frequency</div>
              <Select
                value={preferences.administrative.digestFrequency}
                onValueChange={(value) => handlePreferenceChange('administrative.digestFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Social Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getCategoryIcon('social')}
              Social Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable social notifications</span>
              <Switch
                checked={preferences.social.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('social.enabled', checked)}
              />
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Delivery Methods</div>
              <div className="flex gap-2">
                {['in-app', 'email'].map((method) => (
                  <Button
                    key={method}
                    variant={(preferences.social.methods as string[]).includes(method) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMethodToggle('social', method)}
                    className="flex items-center gap-1"
                  >
                    {getMethodIcon(method)}
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Focus Mode</span>
              <Switch
                checked={preferences.social.focusModeEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('social.focusModeEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Global Settings</h3>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Enable quiet hours</span>
              <Switch
                checked={preferences.quietHours.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('quietHours.enabled', checked)}
              />
            </div>
            
            {preferences.quietHours.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Time</label>
                    <Select
                      value={preferences.quietHours.start}
                      onValueChange={(value) => handlePreferenceChange('quietHours.start', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Time</label>
                    <Select
                      value={preferences.quietHours.end}
                      onValueChange={(value) => handlePreferenceChange('quietHours.end', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Allow emergency notifications</span>
                  <Switch
                    checked={preferences.quietHours.allowEmergency}
                    onCheckedChange={(checked) => handlePreferenceChange('quietHours.allowEmergency', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Device Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm">Push Notifications</span>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email Digest</span>
              </div>
              <Switch
                checked={preferences.emailDigest}
                onCheckedChange={(checked) => handlePreferenceChange('emailDigest', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm">SMS Notifications</span>
              </div>
              <Switch
                checked={preferences.smsEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('smsEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preferences.soundEnabled ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 opacity-50" />}
                <span className="text-sm">Sound Notifications</span>
              </div>
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updatePreferencesMutation.isLoading}
        >
          {updatePreferencesMutation.isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
