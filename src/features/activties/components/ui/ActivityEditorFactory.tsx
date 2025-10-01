'use client';

import React from 'react';
import { BaseActivity } from '../../models/base';
import { BaseActivityEditor, BaseActivityEditorConfig } from './BaseActivityEditor';

/**
 * Activity Editor Factory
 * 
 * This factory creates standardized activity editors with minimal boilerplate.
 * It provides a consistent interface while allowing customization for specific activity types.
 */

export interface ActivityEditorFactoryProps<T extends BaseActivity> {
  activityType: string;
  defaultActivity: T;
  config?: BaseActivityEditorConfig;
  renderContent: (activity: T, onChange: (activity: T) => void) => React.ReactNode;
  renderSettings?: (activity: T, onChange: (activity: T) => void) => React.ReactNode;
  renderPreview?: (activity: T) => React.ReactNode;
  validationRules?: Record<string, (activity: T) => string | null>;
}

/**
 * Creates a standardized activity editor component
 */
export function createActivityEditor<T extends BaseActivity>({
  activityType,
  defaultActivity,
  config = {},
  renderContent,
  renderSettings,
  renderPreview,
  validationRules = {},
}: ActivityEditorFactoryProps<T>) {
  
  // Default validation rules
  const defaultValidationRules = {
    title: (activity: T) => {
      if (!activity.title?.trim()) {
        return 'Title is required';
      }
      if (activity.title.length > 100) {
        return 'Title must be less than 100 characters';
      }
      return null;
    },
    description: (activity: T) => {
      if (activity.description && activity.description.length > 500) {
        return 'Description must be less than 500 characters';
      }
      return null;
    },
    ...validationRules,
  };

  // Merge config with defaults
  const editorConfig: BaseActivityEditorConfig = {
    showInstructions: true,
    showSettings: true,
    showPreview: true,
    showAIGenerator: true,
    validationRules: defaultValidationRules,
    ...config,
  };

  // Return the editor component
  return React.forwardRef<any, {
    activity?: T;
    onChange?: (activity: T) => void;
    onSave?: (activity: T) => void;
    className?: string;
    standalone?: boolean;
  }>((props, ref) => {
    const {
      activity = defaultActivity,
      onChange = () => {},
      onSave,
      className,
      standalone = false,
    } = props;

    return (
      <BaseActivityEditor
        ref={ref}
        activity={activity}
        onChange={onChange}
        onSave={onSave}
        className={className}
        standalone={standalone}
        config={editorConfig}
        renderContent={renderContent}
        renderSettings={renderSettings}
        renderPreview={renderPreview}
      />
    );
  });
}

/**
 * Common validation rules that can be reused across activity types
 */
export const commonValidationRules = {
  requiredTitle: (activity: BaseActivity) => {
    if (!activity.title?.trim()) {
      return 'Title is required';
    }
    return null;
  },
  
  titleLength: (activity: BaseActivity) => {
    if (activity.title && activity.title.length > 100) {
      return 'Title must be less than 100 characters';
    }
    return null;
  },
  
  descriptionLength: (activity: BaseActivity) => {
    if (activity.description && activity.description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return null;
  },
  
  requiredInstructions: (activity: BaseActivity) => {
    if (!activity.instructions?.trim()) {
      return 'Instructions are required for students';
    }
    return null;
  },
  
  instructionsLength: (activity: BaseActivity) => {
    if (activity.instructions && activity.instructions.length > 1000) {
      return 'Instructions must be less than 1000 characters';
    }
    return null;
  },
};

/**
 * Common settings components that can be reused
 */
export const commonSettingsComponents = {
  /**
   * Basic activity settings (gradable, time limit, etc.)
   */
  basicSettings: <T extends BaseActivity>(activity: T, onChange: (activity: T) => void) => {
    const handleSettingChange = (key: keyof T, value: any) => {
      onChange({ ...activity, [key]: value });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Gradable Activity</label>
          <input
            type="checkbox"
            checked={activity.isGradable || false}
            onChange={(e) => handleSettingChange('isGradable' as keyof T, e.target.checked)}
            className="rounded"
          />
        </div>
        
        {activity.metadata && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Time (minutes)</label>
              <input
                type="number"
                value={activity.metadata.estimatedTime || ''}
                onChange={(e) => {
                  const metadata = { ...activity.metadata, estimatedTime: parseInt(e.target.value) || undefined };
                  handleSettingChange('metadata' as keyof T, metadata);
                }}
                className="w-full px-3 py-2 border rounded-md"
                min="1"
                max="300"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty Level</label>
              <select
                value={activity.metadata.difficulty || ''}
                onChange={(e) => {
                  const metadata = { ...activity.metadata, difficulty: e.target.value as 'easy' | 'medium' | 'hard' };
                  handleSettingChange('metadata' as keyof T, metadata);
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select difficulty...</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </>
        )}
      </div>
    );
  },
};

/**
 * Utility to create a simple activity editor with minimal configuration
 */
export function createSimpleActivityEditor<T extends BaseActivity>(
  activityType: string,
  defaultActivity: T,
  renderContent: (activity: T, onChange: (activity: T) => void) => React.ReactNode
) {
  return createActivityEditor({
    activityType,
    defaultActivity,
    renderContent,
    renderSettings: commonSettingsComponents.basicSettings,
    config: {
      showPreview: false, // Disable preview for simple editors
    },
  });
}

/**
 * Utility to create a full-featured activity editor
 */
export function createFullActivityEditor<T extends BaseActivity>(
  activityType: string,
  defaultActivity: T,
  renderContent: (activity: T, onChange: (activity: T) => void) => React.ReactNode,
  renderPreview: (activity: T) => React.ReactNode,
  customValidationRules: Record<string, (activity: T) => string | null> = {}
) {
  return createActivityEditor({
    activityType,
    defaultActivity,
    renderContent,
    renderSettings: commonSettingsComponents.basicSettings,
    renderPreview,
    validationRules: {
      ...commonValidationRules,
      ...customValidationRules,
    },
  });
}

/**
 * Migration helper for existing editors
 * This helps gradually migrate existing editors to use the new base component
 */
export function migrateExistingEditor<T extends BaseActivity>(
  ExistingEditorComponent: React.ComponentType<any>,
  activityType: string,
  defaultActivity: T
) {
  return React.forwardRef<any, {
    activity?: T;
    onChange?: (activity: T) => void;
    onSave?: (activity: T) => void;
    className?: string;
    standalone?: boolean;
  }>((props, ref) => {
    // For now, just render the existing component
    // This can be gradually replaced with the new base component
    return <ExistingEditorComponent ref={ref} {...props} />;
  });
}
