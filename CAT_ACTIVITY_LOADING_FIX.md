# CAT Activity Loading Issue - Investigation and Fix

## Problem Description
CAT (Computer Adaptive Testing) activities in the student portal were experiencing infinite loading with no errors, while regular quizzes and CBT activities worked fine.

## Root Cause Analysis

### Primary Issue: Database Foreign Key Constraint
The main issue was a foreign key constraint violation: `advanced_assessment_sessions_studentId_fkey`. The `studentId` being passed was actually a `userId` instead of the `studentProfile.id` that the database expects.

### Secondary Issue: CAT Termination After First Question
The CAT session was terminating immediately after the first question due to overly aggressive termination criteria.

### Tertiary Issue: Missing CAT Configuration
Some activities had `assessmentMode: 'cat'` but lacked proper CAT settings configuration.

### Quaternary Issue: Flawed Loading Logic
The `QuizViewer.tsx` component's loading condition was also problematic:

```typescript
// PROBLEMATIC CODE:
if (isLoading || !questions.length) {
  return <LoadingSpinner />;
}
```

**Problem**: For CAT activities, the `questions` array starts empty and only gets populated after:
1. CAT session is successfully created
2. First question is fetched from the CAT service

This created an infinite loading loop because `!questions.length` was always `true` until the first question loaded.

### Additional Issues Identified

1. **Insufficient CAT Settings Detection**: The component only checked `content.settings.catSettings?.enabled` but CAT activities might have settings in different locations.

2. **No Timeout Protection**: CAT initialization and question loading had no timeout mechanisms, leading to infinite loading if the backend was slow or failed silently.

3. **Poor Error Handling**: Limited debugging information made it difficult to identify where the CAT loading process was failing.

## Implemented Fixes

### 1. Database: Student ID Resolution
Fixed the foreign key constraint issue by properly resolving student profile IDs:

```typescript
// In advanced-features-integration.service.ts
// Resolve student profile ID (studentId might be userId)
const studentProfile = await this.prisma.studentProfile.findFirst({
  where: {
    OR: [
      { id: studentId },
      { userId: studentId }
    ]
  }
});

if (!studentProfile) {
  throw new Error(`Student profile not found for ID: ${studentId}`);
}

resolvedStudentId = studentProfile.id;
```

### 2. CAT Termination: Enhanced Logic
Added comprehensive debugging and fixed termination criteria:

```typescript
// In cat-irt.service.ts
shouldTerminate(session: CATSession, settings: CATSettings): boolean {
  // Must ask minimum questions first
  if (questionsAnswered < minQuestions) {
    console.log(`Not terminating: Haven't reached minimum questions`);
    return false;
  }

  // More conservative standard error threshold (0.2 instead of 0.3)
  // Enhanced logging for debugging
}
```

### 3. Backend: Default CAT Settings
Fixed the backend service to automatically provide default CAT settings when an activity is set to CAT mode but lacks configuration:

```typescript
// In advanced-features-integration.service.ts
const normalizedSettings: CATSettings = effectiveCatSettings
  ? { /* use configured settings */ }
  : {
      // Use default CAT settings when none are configured
      enabled: true,
      algorithm: 'irt_2pl',
      startingDifficulty: 0,
      terminationCriteria: {
        minQuestions: 5,
        maxQuestions: 20,
        standardErrorThreshold: 0.3,
      },
      itemSelectionMethod: 'maximum_information',
      questionTypes: ['MULTIPLE_CHOICE'],
      difficultyRange: { min: -3, max: 3 }
    };
```

### 2. Frontend: Improved Loading Logic
```typescript
const shouldShowLoading = () => {
  // Always show loading if initial loading is true
  if (isLoading) return true;
  
  // For CAT mode, show loading if:
  // - CAT session is not created yet, OR
  // - CAT session exists but no questions loaded yet, OR
  // - Next question query is loading
  if (isCAT) {
    if (!catSession?.id) return true;
    if (catSession?.id && !questions.length && nextAdvancedQuestionQuery.isLoading) return true;
    if (catSession?.id && !questions.length && !nextAdvancedQuestionQuery.data && !nextAdvancedQuestionQuery.error) return true;
    return false;
  }
  
  // For standard mode, show loading if no questions loaded
  return !questions.length;
};
```

### 3. Enhanced CAT Settings Detection
```typescript
// Now simply checks for assessment mode (backend handles missing settings)
const catSettingsEnabled = (content as any).assessmentMode === 'cat';
```

### 4. Timeout Protection
- **CAT Initialization Timeout**: 15 seconds
- **Question Loading Timeout**: 10 seconds
- Both timeouts automatically fall back to standard quiz mode

### 4. Comprehensive Debugging
Added detailed console logging for:
- CAT mode detection
- Session initialization
- Question loading process
- Error conditions

### 5. Better Error Messages
- Specific error messages for different failure scenarios
- User-friendly fallback notifications
- Automatic fallback to standard mode

## Testing Instructions

1. **Open Browser Console**: Press F12 and go to Console tab
2. **Start a CAT Activity**: Navigate to a CAT activity in student portal
3. **Monitor Console Output**: Look for debug messages starting with:
   - "CAT mode detection:"
   - "Attempting to initialize CAT session..."
   - "CAT session created successfully:"
   - "Processing CAT question data:"

### Expected Console Output (Success)
```
CAT mode detection: { settingsCatEnabled: true, ... }
Attempting to initialize CAT session...
Starting CAT session for activity: [activityId] student: [studentId]
CAT session created successfully: { id: "cat_...", ... }
Processing CAT question data: { question: { ... } }
First CAT question loaded successfully: { questionId: "...", ... }
```

### Expected Console Output (Fallback)
```
CAT mode detection: { settingsCatEnabled: true, ... }
Failed to start CAT session: [error details]
Falling back to standard quiz mode due to CAT initialization failure
```

## Fallback Behavior
If CAT loading fails at any point, the system will:
1. Display an appropriate error message to the user
2. Automatically switch to standard quiz mode
3. Load questions normally from the activity's question list
4. Continue functioning as a regular quiz

## Files Modified
- `src/features/activities-v2/components/quiz/QuizViewer.tsx` - Fixed loading logic and CAT detection
- `src/features/activities-v2/services/advanced-features-integration.service.ts` - Added student ID resolution and default CAT settings
- `src/features/activities-v2/services/cat-irt.service.ts` - Enhanced termination logic with debugging

## Scripts Created
- `fix-cat-activity-config.js` - Adds proper CAT settings to activities missing them
- `test-cat-activity.js` - Tests CAT activity configuration

## Next Steps
1. **Run the configuration fix** (optional):
   ```bash
   node fix-cat-activity-config.js
   ```

2. **Test the CAT activity** - it should now:
   - Load properly without infinite loading
   - Continue through multiple questions (minimum 5)
   - Not terminate after just one question
   - Save sessions to database without foreign key errors

3. **Monitor console logs** for:
   - `[CAT] Resolved student profile ID: ...`
   - `[CAT] Checking termination criteria: ...`
   - `[CAT] Not terminating: Haven't reached minimum questions`

4. **If issues persist**, check the console logs to identify the specific failure point
