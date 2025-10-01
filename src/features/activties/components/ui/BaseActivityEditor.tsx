'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseActivity } from '../../models/base';
import { ActivityButton } from './ActivityButton';
import { RichTextEditor } from './RichTextEditor';
import { MediaUploader } from './MediaUploader';
import { ThemeWrapper } from './ThemeWrapper';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/lib/hooks/use-responsive';
import { AIActivityGeneratorButton } from '@/features/ai-question-generator/components/AIActivityGeneratorButton';
import { BloomsTaxonomyLevel } from '@/features/bloom/types/bloom-taxonomy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, Plus, Trash2, Settings, Eye, Edit } from 'lucide-react';

export interface BaseActivityEditorProps<T extends BaseActivity> {
  activity: T;
  onChange: (activity: T) => void;
  onSave?: (activity: T) => void;
  className?: string;
  standalone?: boolean;
}

export interface ActivityEditorSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  required?: boolean;
}

export interface BaseActivityEditorConfig {
  showInstructions?: boolean;
  showSettings?: boolean;
  showPreview?: boolean;
  showAIGenerator?: boolean;
  customSections?: ActivityEditorSection[];
  validationRules?: Record<string, (activity: any) => string | null>;
}

/**
 * Base Activity Editor Component
 * 
 * This component provides a unified structure for all activity editors with:
 * - Common UI patterns (title, description, instructions)
 * - Tabbed interface (Edit, Settings, Preview)
 * - AI integration
 * - Validation
 * - Responsive design
 * - Animation support
 */
export const BaseActivityEditor = React.forwardRef(function BaseActivityEditor<T extends BaseActivity>({
  activity,
  onChange,
  onSave,
  className,
  standalone = false,
  config = {},
  children,
  renderContent,
  renderSettings,
  renderPreview,
}: BaseActivityEditorProps<T> & {
  config?: BaseActivityEditorConfig;
  children?: React.ReactNode;
  renderContent?: (activity: T, onChange: (activity: T) => void) => React.ReactNode;
  renderSettings?: (activity: T, onChange: (activity: T) => void) => React.ReactNode;
  renderPreview?: (activity: T) => React.ReactNode;
}, ref: React.ForwardedRef<HTMLDivElement>) {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('edit');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const {
    showInstructions = true,
    showSettings = true,
    showPreview = true,
    showAIGenerator = true,
    customSections = [],
    validationRules = {},
  } = config;

  // Update activity with validation
  const updateActivity = useCallback((updates: Partial<T>) => {
    const updatedActivity = { ...activity, ...updates };
    
    // Run validation
    const newErrors: Record<string, string> = {};
    Object.entries(validationRules).forEach(([field, validator]) => {
      const error = validator(updatedActivity);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    onChange(updatedActivity);
  }, [activity, onChange, validationRules]);

  // Handle basic field changes
  const handleFieldChange = useCallback((field: keyof T, value: any) => {
    updateActivity({ [field]: value } as Partial<T>);
  }, [updateActivity]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave && Object.keys(errors).length === 0) {
      onSave(activity);
    }
  }, [onSave, activity, errors]);

  // Validate on mount and activity changes
  useEffect(() => {
    if (Object.keys(validationRules).length > 0) {
      setIsValidating(true);
      const timer = setTimeout(() => {
        const newErrors: Record<string, string> = {};
        Object.entries(validationRules).forEach(([field, validator]) => {
          const error = validator(activity);
          if (error) {
            newErrors[field] = error;
          }
        });
        setErrors(newErrors);
        setIsValidating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [activity, validationRules]);

  // Render basic activity fields
  const renderBasicFields = () => (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="activity-title" className="text-sm font-medium">
          Activity Title *
        </Label>
        <Input
          id="activity-title"
          value={activity.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="Enter activity title..."
          className={cn(errors.title && "border-red-500")}
        />
        {errors.title && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.title}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="activity-description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="activity-description"
          value={activity.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder="Enter activity description..."
          rows={3}
          className={cn(errors.description && "border-red-500")}
        />
        {errors.description && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Instructions for Students
          </Label>
          <RichTextEditor
            content={activity.instructions || ''}
            onChange={(content) => handleFieldChange('instructions', content)}
            placeholder="Enter instructions for students..."
            minHeight="120px"
            simple={true}
            className={cn(errors.instructions && "border-red-500")}
          />
          {errors.instructions && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.instructions}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Render custom sections
  const renderCustomSections = () => (
    <div className="space-y-6">
      {customSections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {section.icon}
              {section.title}
              {section.required && <span className="text-red-500">*</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {section.content}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Main content area
  const mainContent = (
    <div className="space-y-6">
      {renderBasicFields()}
      {renderCustomSections()}
      {renderContent && renderContent(activity, updateActivity)}
      {children}
    </div>
  );

  // Settings content
  const settingsContent = renderSettings ? renderSettings(activity, updateActivity) : (
    <div className="space-y-4">
      <p className="text-muted-foreground">No settings available for this activity type.</p>
    </div>
  );

  // Preview content
  const previewContent = renderPreview ? renderPreview(activity) : (
    <div className="space-y-4">
      <p className="text-muted-foreground">Preview not available for this activity type.</p>
    </div>
  );

  return (
    <ThemeWrapper className={cn("w-full", className)}>
      <div ref={ref} className="space-y-6">
        {/* Header with AI Generator */}
        {showAIGenerator && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Activity Editor</h2>
              {isValidating && (
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              )}
            </div>
            <AIActivityGeneratorButton
              activityType={activity.activityType}
              onContentGenerated={(generatedContent: any) => {
                // Handle AI generated content
                updateActivity(generatedContent);
              }}
            />
          </div>
        )}

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </TabsTrigger>
            {showSettings && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
            {showPreview && (
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="edit" className="mt-6">
            {mainContent}
          </TabsContent>

          {showSettings && (
            <TabsContent value="settings" className="mt-6">
              {settingsContent}
            </TabsContent>
          )}

          {showPreview && (
            <TabsContent value="preview" className="mt-6">
              {previewContent}
            </TabsContent>
          )}
        </Tabs>

        {/* Save Button */}
        {standalone && onSave && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={Object.keys(errors).length > 0}
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Save Activity
            </Button>
          </div>
        )}
      </div>
    </ThemeWrapper>
  );
});

/**
 * Hook for common activity editor logic
 */
export function useActivityEditor<T extends BaseActivity>(
  initialActivity: T,
  onChange?: (activity: T) => void
) {
  const [activity, setActivity] = useState<T>(initialActivity);
  const [isDirty, setIsDirty] = useState(false);

  const updateActivity = useCallback((updates: Partial<T>) => {
    const updatedActivity = { ...activity, ...updates };
    setActivity(updatedActivity);
    setIsDirty(true);
    onChange?.(updatedActivity);
  }, [activity, onChange]);

  const resetActivity = useCallback(() => {
    setActivity(initialActivity);
    setIsDirty(false);
  }, [initialActivity]);

  return {
    activity,
    updateActivity,
    resetActivity,
    isDirty,
  };
}
