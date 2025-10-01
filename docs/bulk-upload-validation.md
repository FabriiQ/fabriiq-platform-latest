# Enhanced Bulk Upload Validation

## Overview

The bulk upload feature now provides detailed validation feedback to help users identify and fix issues in their CSV files before uploading questions to the question bank.

## Enhanced Validation Features

### 1. Detailed Error Reporting

Instead of just showing error counts, the system now provides:

- **Row Number**: Exact row where the error occurred
- **Field Name**: The specific field that caused the error
- **Invalid Value**: The actual value that was invalid
- **Error Message**: Clear description of what went wrong
- **Suggestion**: Actionable advice on how to fix the issue

### 2. Validation Statistics

The validation summary now shows:
- Total rows processed
- Number of valid rows
- Number of rows with errors
- Most common error patterns

### 3. Export Validation Errors

Users can now export validation errors as a CSV file containing:
- Row numbers with errors
- Field names
- Invalid values
- Error descriptions
- Fix suggestions

This allows users to:
- Work offline to fix issues
- Share error reports with team members
- Track progress while fixing multiple issues

## Common Validation Errors and Fixes

### Required Field Errors

**Error**: `Missing required fields: title, questionType, difficulty, subjectId`

**Fix**: Ensure all required columns have values:
- `title`: Question title/name
- `questionType`: Valid question type (MULTIPLE_CHOICE, TRUE_FALSE, etc.)
- `difficulty`: Valid difficulty level (EASY, MEDIUM, HARD)
- `subjectId`: Valid subject identifier

### Invalid Question Type

**Error**: `Invalid questionType: INVALID_TYPE`

**Valid Types**:
- MULTIPLE_CHOICE
- TRUE_FALSE
- MULTIPLE_RESPONSE
- FILL_IN_THE_BLANKS
- MATCHING
- DRAG_AND_DROP
- NUMERIC
- SHORT_ANSWER
- ESSAY

### Invalid Difficulty Level

**Error**: `Invalid difficulty: INVALID_DIFFICULTY`

**Valid Levels**:
- EASY
- MEDIUM
- HARD

### Multiple Choice Validation

**Common Errors**:
- `At least one option must be marked as correct`
- `Multiple choice questions must have at least 2 options`
- `All options must have text content`

**Fix**: Ensure:
- At least 2 options are provided (option1, option2, etc.)
- Each option has text content
- At least one option has `optionXCorrect` set to `true`

### True/False Validation

**Error**: `Invalid correctAnswer: maybe. Must be 'true' or 'false'`

**Fix**: Use only `true` or `false` (case-insensitive) for the `correctAnswer` field

### Numeric Validation

**Common Errors**:
- `Invalid correctAnswer: not_a_number. Must be a number`
- `Invalid tolerance: not_a_number. Must be a non-negative number`

**Fix**: Ensure:
- `correctAnswer` is a valid number
- `tolerance` (if provided) is a non-negative number

### Grade Level and Year Validation

**Errors**:
- `Invalid gradeLevel: 15` (must be 1-12)
- `Invalid year: 1800` (must be 1900-2100)

**Fix**: Use valid ranges:
- Grade Level: 1-12
- Year: 1900-2100

## JSON Format Validation

For complex fields that require JSON format (like options, blanks, pairs), the system now provides:

- Clear error messages about JSON syntax issues
- Expected format examples
- Specific field validation within JSON structures

### Example JSON Formats

**Multiple Choice Options (Legacy)**:
```json
[
  {"text": "Option 1", "isCorrect": true, "feedback": "Correct!"},
  {"text": "Option 2", "isCorrect": false, "feedback": "Try again"}
]
```

**Fill-in-the-Blanks**:
```json
[
  {"id": "blank-1", "correctAnswers": ["answer1", "answer2"], "feedback": "Good job!"}
]
```

**Matching Pairs**:
```json
[
  {"id": "pair-1", "left": "Left item", "right": "Right item"}
]
```

## Using the Enhanced Validation

1. **Upload your CSV file** using the bulk upload form
2. **Click "Validate Only"** to check for errors without uploading
3. **Review the validation results**:
   - Check the summary statistics
   - Review common error patterns
   - Examine detailed error table
4. **Export errors** if needed for offline fixing
5. **Fix the issues** in your CSV file
6. **Re-validate** until all errors are resolved
7. **Upload** the corrected file

## Best Practices

1. **Start with templates**: Use the provided CSV templates for each question type
2. **Validate early**: Run validation before preparing large batches
3. **Fix systematically**: Address common errors first, then specific issues
4. **Use the export feature**: Export errors for complex files with many issues
5. **Test with small batches**: Validate a few rows first before processing large files

## Technical Implementation

The enhanced validation system:
- Provides structured error objects with detailed information
- Categorizes errors by type and field
- Offers contextual suggestions based on error patterns
- Maintains backward compatibility with existing CSV formats
- Supports both column-based and JSON-based option formats
