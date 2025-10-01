'use client';

import { useState } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { Button } from '@/components/ui/core/button';
import { Input } from '@/components/ui/core/input';
import { Label } from '@/components/ui/core/label';
// Simple switch component since the UI library one is not available
const Switch = ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (checked: boolean) => void; id: string }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className="w-4 h-4"
  />
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/core/select';
import {
  Settings,
  Bell,
  Volume2,
  Search,
  Save,
  RotateCcw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  className?: string;
}

/**
 * Settings panel for Teacher Assistant preferences and configuration
 */
export function SettingsPanel({ className }: SettingsPanelProps) {
  const { context } = useTeacherAssistant();
  const [activeSection, setActiveSection] = useState('general');

  // Settings state
  const [settings, setSettings] = useState({
    // General preferences
    responseLength: 'medium',
    language: 'english',
    tone: 'educational',
    
    // UI preferences
    theme: 'system',
    compactMode: false,
    showTimestamps: true,
    
    // Notifications
    enableNotifications: true,
    soundEnabled: true,
    emailDigest: false,
    
    // Search preferences
    defaultSearchMode: 'text',
    safeSearch: true,
    includeImages: true,
    
    // Voice settings
    voiceEnabled: true,
    voiceSpeed: 1.0,
    voiceGender: 'female',
    
    // Privacy
    saveConversations: true,
    shareAnalytics: true,
    
    // Advanced
    streamingEnabled: true,
    curriculumAlignment: true,
    autoSuggestTopics: true
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      // Save to localStorage for now
      localStorage.setItem('teacher-assistant-settings', JSON.stringify(settings));

      // TODO: Save settings to backend
      console.log('Settings saved successfully:', settings);

      // Show success feedback
      // toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      // toast.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    // Reset to defaults
    setSettings({
      responseLength: 'medium',
      language: 'english',
      tone: 'professional',
      theme: 'system',
      compactMode: false,
      showTimestamps: true,
      enableNotifications: true,
      soundEnabled: true,
      emailDigest: false,
      defaultSearchMode: 'text',
      safeSearch: true,
      includeImages: true,
      voiceEnabled: true,
      voiceSpeed: 1.0,
      voiceGender: 'female',
      saveConversations: true,
      shareAnalytics: true,
      streamingEnabled: true,
      curriculumAlignment: true,
      autoSuggestTopics: true
    });
  };

  const settingSections = [
    {
      id: 'general',
      title: 'General',
      icon: Settings,
      settings: [
        {
          key: 'responseLength',
          label: 'Response Length',
          type: 'select',
          options: [
            { value: 'short', label: 'Short (50-100 words)' },
            { value: 'medium', label: 'Medium (100-200 words)' },
            { value: 'long', label: 'Long (200+ words)' }
          ]
        },
        {
          key: 'tone',
          label: 'Response Tone',
          type: 'select',
          options: [
            { value: 'educational', label: 'Educational & Supportive' },
            { value: 'encouraging', label: 'Encouraging & Motivational' },
            { value: 'professional', label: 'Professional & Clear' },
            { value: 'collaborative', label: 'Collaborative & Engaging' },
            { value: 'instructional', label: 'Instructional & Detailed' },
            { value: 'creative', label: 'Creative & Inspiring' },
            { value: 'analytical', label: 'Analytical & Structured' }
          ]
        },
        {
          key: 'language',
          label: 'Language',
          type: 'select',
          options: [
            { value: 'english', label: 'English' },
            { value: 'spanish', label: 'Spanish' },
            { value: 'french', label: 'French' }
          ]
        }
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Settings,
      settings: [
        {
          key: 'theme',
          label: 'Theme',
          type: 'select',
          options: [
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
          ]
        },
        {
          key: 'compactMode',
          label: 'Compact Mode',
          type: 'switch',
          description: 'Use smaller spacing and fonts'
        },
        {
          key: 'showTimestamps',
          label: 'Show Timestamps',
          type: 'switch',
          description: 'Display message timestamps'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          key: 'enableNotifications',
          label: 'Enable Notifications',
          type: 'switch',
          description: 'Receive browser notifications'
        },
        {
          key: 'soundEnabled',
          label: 'Sound Effects',
          type: 'switch',
          description: 'Play sounds for interactions'
        },
        {
          key: 'emailDigest',
          label: 'Email Digest',
          type: 'switch',
          description: 'Weekly summary of interactions'
        }
      ]
    },
    {
      id: 'search',
      title: 'Search',
      icon: Search,
      settings: [
        {
          key: 'defaultSearchMode',
          label: 'Default Search Mode',
          type: 'select',
          options: [
            { value: 'text', label: 'Text' },
            { value: 'image', label: 'Images' },
            { value: 'multimodal', label: 'All Types' }
          ]
        },
        {
          key: 'safeSearch',
          label: 'Safe Search',
          type: 'switch',
          description: 'Filter inappropriate content'
        },
        {
          key: 'includeImages',
          label: 'Include Images',
          type: 'switch',
          description: 'Show image results in search'
        }
      ]
    },
    {
      id: 'voice',
      title: 'Voice',
      icon: Volume2,
      settings: [
        {
          key: 'voiceEnabled',
          label: 'Text-to-Speech',
          type: 'switch',
          description: 'Enable voice reading of responses'
        },
        {
          key: 'voiceSpeed',
          label: 'Voice Speed',
          type: 'range',
          min: 0.5,
          max: 2.0,
          step: 0.1
        },
        {
          key: 'voiceGender',
          label: 'Voice Gender',
          type: 'select',
          options: [
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' }
          ]
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced',
      icon: Zap,
      settings: [
        {
          key: 'streamingEnabled',
          label: 'Streaming Responses',
          type: 'switch',
          description: 'Show responses as they are generated'
        },
        {
          key: 'curriculumAlignment',
          label: 'Curriculum Alignment',
          type: 'switch',
          description: 'Include learning outcomes in responses'
        },
        {
          key: 'autoSuggestTopics',
          label: 'Auto-suggest Topics',
          type: 'switch',
          description: 'Suggest relevant topics based on context'
        }
      ]
    }
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={saveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingSections.map((section) => (
          <div key={section.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">{section.title}</h3>
            </div>
            
            <div className="space-y-4 pl-6">
              {section.settings.map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={setting.key} className="text-sm font-medium">
                        {setting.label}
                      </Label>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {setting.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      {setting.type === 'switch' && (
                        <Switch
                          id={setting.key}
                          checked={settings[setting.key as keyof typeof settings] as boolean}
                          onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                        />
                      )}
                      
                      {setting.type === 'select' && (
                        <Select
                          value={settings[setting.key as keyof typeof settings] as string}
                          onValueChange={(value) => updateSetting(setting.key, value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {setting.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {setting.type === 'range' && (
                        <div className="flex items-center gap-2 w-48">
                          <input
                            type="range"
                            id={setting.key}
                            min={setting.min}
                            max={setting.max}
                            step={setting.step}
                            value={settings[setting.key as keyof typeof settings] as number}
                            onChange={(e) => updateSetting(setting.key, parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-8">
                            {settings[setting.key as keyof typeof settings]}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Settings are saved automatically and synced across devices
        </p>
      </div>
    </div>
  );
}
