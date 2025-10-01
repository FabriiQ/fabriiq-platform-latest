/**
 * CAT Configuration Defaults and Utilities
 * Provides sensible defaults and helper functions for CAT setup
 */

import { CATSettings, CATMarkingConfig } from '../types';

/**
 * Default CAT settings for new activities
 */
export const DEFAULT_CAT_SETTINGS: CATSettings = {
  enabled: true,
  algorithm: 'irt_2pl',
  startingDifficulty: 0, // Start at average difficulty
  terminationCriteria: {
    minQuestions: 5,
    maxQuestions: 20,
    standardErrorThreshold: 0.3
  },
  itemSelectionMethod: 'maximum_information',
  questionTypes: ['MULTIPLE_CHOICE'], // MCQ-only by default
  difficultyRange: {
    min: -3,
    max: 3
  },
  markingConfig: {
    positiveMarking: {
      easy: 1,
      medium: 2,
      hard: 3
    },
    negativeMarking: {
      enabled: true,
      mcqPenalty: -1,
      titaPenalty: 0,
      unansweredPenalty: 0
    },
    scoringMethod: 'percentile',
    percentileConfig: {
      populationMean: 0,
      populationStd: 1,
      minPercentile: 1,
      maxPercentile: 99
    }
  }
};

/**
 * Preset configurations for different exam types
 */
export const CAT_PRESETS = {
  competitive_exam: {
    ...DEFAULT_CAT_SETTINGS,
    terminationCriteria: {
      minQuestions: 10,
      maxQuestions: 30,
      standardErrorThreshold: 0.25
    },
    markingConfig: {
      ...DEFAULT_CAT_SETTINGS.markingConfig!,
      negativeMarking: {
        enabled: true,
        mcqPenalty: -1,
        titaPenalty: 0,
        unansweredPenalty: 0
      }
    }
  },
  
  practice_test: {
    ...DEFAULT_CAT_SETTINGS,
    terminationCriteria: {
      minQuestions: 5,
      maxQuestions: 15,
      standardErrorThreshold: 0.4
    },
    markingConfig: {
      ...DEFAULT_CAT_SETTINGS.markingConfig!,
      negativeMarking: {
        enabled: false,
        mcqPenalty: 0,
        titaPenalty: 0,
        unansweredPenalty: 0
      }
    }
  },
  
  diagnostic_assessment: {
    ...DEFAULT_CAT_SETTINGS,
    terminationCriteria: {
      minQuestions: 8,
      maxQuestions: 25,
      standardErrorThreshold: 0.3
    },
    markingConfig: {
      ...DEFAULT_CAT_SETTINGS.markingConfig!,
      scoringMethod: 'percentile' as const,
      negativeMarking: {
        enabled: true,
        mcqPenalty: -0.5, // Reduced penalty for diagnostic
        titaPenalty: 0,
        unansweredPenalty: 0
      }
    }
  }
};

/**
 * Validation rules for CAT configuration
 */
export const CAT_VALIDATION_RULES = {
  startingDifficulty: { min: -3, max: 3 },
  minQuestions: { min: 3, max: 50 },
  maxQuestions: { min: 5, max: 100 },
  standardErrorThreshold: { min: 0.1, max: 1.0 },
  positiveMarking: { min: 0.5, max: 10 },
  negativeMarking: { min: -5, max: 0 }
};

/**
 * Helper function to validate CAT settings
 */
export function validateCATSettings(settings: Partial<CATSettings>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (settings.startingDifficulty !== undefined) {
    const { min, max } = CAT_VALIDATION_RULES.startingDifficulty;
    if (settings.startingDifficulty < min || settings.startingDifficulty > max) {
      errors.push(`Starting difficulty must be between ${min} and ${max}`);
    }
  }
  
  if (settings.terminationCriteria) {
    const { minQuestions, maxQuestions, standardErrorThreshold } = settings.terminationCriteria;
    
    if (minQuestions !== undefined) {
      const { min, max } = CAT_VALIDATION_RULES.minQuestions;
      if (minQuestions < min || minQuestions > max) {
        errors.push(`Minimum questions must be between ${min} and ${max}`);
      }
    }
    
    if (maxQuestions !== undefined) {
      const { min, max } = CAT_VALIDATION_RULES.maxQuestions;
      if (maxQuestions < min || maxQuestions > max) {
        errors.push(`Maximum questions must be between ${min} and ${max}`);
      }
    }
    
    if (minQuestions !== undefined && maxQuestions !== undefined && minQuestions >= maxQuestions) {
      errors.push('Minimum questions must be less than maximum questions');
    }
    
    if (standardErrorThreshold !== undefined) {
      const { min, max } = CAT_VALIDATION_RULES.standardErrorThreshold;
      if (standardErrorThreshold < min || standardErrorThreshold > max) {
        errors.push(`Standard error threshold must be between ${min} and ${max}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to merge user settings with defaults
 */
export function mergeCATSettings(userSettings: Partial<CATSettings>): CATSettings {
  return {
    ...DEFAULT_CAT_SETTINGS,
    ...userSettings,
    terminationCriteria: {
      ...DEFAULT_CAT_SETTINGS.terminationCriteria,
      ...userSettings.terminationCriteria
    },
    markingConfig: {
      ...DEFAULT_CAT_SETTINGS.markingConfig!,
      ...userSettings.markingConfig,
      positiveMarking: {
        ...DEFAULT_CAT_SETTINGS.markingConfig!.positiveMarking,
        ...userSettings.markingConfig?.positiveMarking
      },
      negativeMarking: {
        ...DEFAULT_CAT_SETTINGS.markingConfig!.negativeMarking,
        ...userSettings.markingConfig?.negativeMarking
      },
      percentileConfig: {
        ...DEFAULT_CAT_SETTINGS.markingConfig!.percentileConfig!,
        ...userSettings.markingConfig?.percentileConfig
      }
    }
  };
}

/**
 * Helper to get human-readable descriptions for CAT settings
 */
export const CAT_SETTING_DESCRIPTIONS = {
  algorithm: {
    'irt_2pl': 'Two-Parameter Logistic Model (recommended for most cases)',
    'irt_3pl': 'Three-Parameter Logistic Model (accounts for guessing)',
    'rasch': 'Rasch Model (simpler, assumes equal discrimination)'
  },
  itemSelectionMethod: {
    'maximum_information': 'Selects questions that provide maximum information about student ability',
    'bayesian': 'Uses Bayesian approach for question selection',
    'weighted': 'Weighted selection considering multiple factors'
  },
  scoringMethod: {
    'raw': 'Raw score based on correct/incorrect answers',
    'percentile': 'Percentile rank compared to population (recommended)',
    'scaled': 'Scaled score on a fixed range'
  }
};
