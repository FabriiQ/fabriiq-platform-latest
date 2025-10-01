/**
 * CSV Parser for Question Bank
 *
 * This utility provides functions for parsing CSV files into question objects
 * that can be imported into the question bank.
 */

import { parse } from 'papaparse';
import {
  CreateQuestionInput,
  QuestionType,
  DifficultyLevel,
  MultipleChoiceContent,
  TrueFalseContent,
  MultipleResponseContent,
  FillInTheBlanksContent,
  MatchingContent,
  DragAndDropContent,
  NumericContent,
  ShortAnswerContent,
  EssayContent
} from '../models/types';

// Define the expected CSV column headers for different question types
const COMMON_HEADERS = [
  'title',
  'questionType',
  'difficulty',
  'subjectId',
  'subjectName', // Optional: Subject name for reference
  'courseId',
  'courseName', // Optional: Course name for reference
  'topicId',
  'topicName', // Optional: Topic name for reference
  'bloomsLevel', // Bloom's Taxonomy Level
  'gradeLevel',
  'year',
  'sourceReference'
];

const QUESTION_TYPE_HEADERS: Record<QuestionType, string[]> = {
  [QuestionType.MULTIPLE_CHOICE]: ['text', 'option1', 'option1Correct', 'option1Feedback', 'option2', 'option2Correct', 'option2Feedback', 'option3', 'option3Correct', 'option3Feedback', 'option4', 'option4Correct', 'option4Feedback', 'explanation', 'hint'],
  [QuestionType.TRUE_FALSE]: ['text', 'correctAnswer', 'explanation', 'hint'],
  [QuestionType.MULTIPLE_RESPONSE]: ['text', 'option1', 'option1Correct', 'option1Feedback', 'option2', 'option2Correct', 'option2Feedback', 'option3', 'option3Correct', 'option3Feedback', 'option4', 'option4Correct', 'option4Feedback', 'explanation', 'hint'],
  [QuestionType.FILL_IN_THE_BLANKS]: ['text', 'blanks', 'explanation', 'hint'],
  [QuestionType.MATCHING]: ['text', 'pairs', 'explanation', 'hint'],
  [QuestionType.DRAG_AND_DROP]: ['text', 'items', 'zones', 'explanation', 'hint'],
  [QuestionType.DRAG_THE_WORDS]: ['text', 'explanation', 'hint'],
  [QuestionType.NUMERIC]: ['text', 'correctAnswer', 'tolerance', 'explanation', 'hint'],
  [QuestionType.SEQUENCE]: ['text', 'items', 'explanation', 'hint'],
  [QuestionType.FLASH_CARDS]: ['cards'],
  [QuestionType.READING]: ['passage', 'questions'],
  [QuestionType.VIDEO]: ['videoUrl', 'questions'],
  [QuestionType.SHORT_ANSWER]: ['text', 'sampleAnswer', 'keywords', 'explanation', 'hint'],
  [QuestionType.ESSAY]: ['text', 'rubric', 'wordLimit', 'explanation', 'hint'],
  [QuestionType.HOTSPOT]: ['text', 'image', 'hotspots', 'explanation', 'hint'],
  [QuestionType.LIKERT_SCALE]: ['text', 'statements', 'scale', 'explanation', 'hint']
};

// Define the interface for CSV row data
interface CSVRowData {
  [key: string]: string;
}

// Define the interface for validation errors
interface ValidationError {
  row: number;
  errors: string[];
  field?: string; // The specific field that caused the error
  value?: string; // The invalid value
  suggestion?: string; // Suggestion for fixing the error
}

// Define the interface for parse result
interface ParseResult {
  questions: CreateQuestionInput[];
  errors: ValidationError[];
  totalRows: number;
  successfulRows: number;
}

/**
 * Parse a CSV file into question objects
 * @param file The CSV file to parse
 * @param questionBankId The ID of the question bank to import into
 * @param selectedSubjectId The ID of the selected subject (optional, used as fallback)
 * @returns A promise that resolves to the parse result
 */
export async function parseCSV(file: File, questionBankId: string, selectedSubjectId?: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const questions: CreateQuestionInput[] = [];
    const errors: ValidationError[] = [];
    let totalRows = 0;

    parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all values as strings to avoid type conversion issues
      complete: (results: any) => {
        totalRows = results.data.length;

        results.data.forEach((row: any, index: number) => {
          try {
            const question = convertRowToQuestion(row, questionBankId, index + 1, selectedSubjectId);
            if (question) {
              questions.push(question);
            }
          } catch (error) {
            const errorMessage = (error as Error).message;
            const validationError: ValidationError = {
              row: index + 1,
              errors: [errorMessage]
            };

            // Extract field and value information from error message if possible
            const fieldMatch = errorMessage.match(/Missing required field[s]?: '?([^']+)'?/);
            const invalidMatch = errorMessage.match(/Invalid ([^:]+): (.+)/);

            if (fieldMatch) {
              validationError.field = fieldMatch[1];
              validationError.suggestion = `Please provide a valid value for the '${fieldMatch[1]}' field.`;
            } else if (invalidMatch) {
              validationError.field = invalidMatch[1];
              validationError.value = invalidMatch[2];
              validationError.suggestion = getFieldSuggestion(invalidMatch[1], invalidMatch[2]);
            }

            errors.push(validationError);
          }
        });

        resolve({
          questions,
          errors,
          totalRows,
          successfulRows: questions.length
        });
      },
      error: (error: any) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      }
    });
  });
}

/**
 * Get field-specific suggestions for fixing validation errors
 * @param field The field that has an error
 * @param value The invalid value
 * @returns A suggestion for fixing the error
 */
function getFieldSuggestion(field: string, value: string): string {
  switch (field.toLowerCase()) {
    case 'questiontype':
      const validTypes = Object.values(QuestionType).join(', ');
      return `Valid question types are: ${validTypes}`;
    case 'difficulty':
      const validDifficulties = Object.values(DifficultyLevel).join(', ');
      return `Valid difficulty levels are: ${validDifficulties}`;
    case 'gradelevel':
      return 'Grade level must be a number (e.g., 1, 2, 3, etc.)';
    case 'year':
      return 'Year must be a 4-digit number (e.g., 2023, 2024)';
    case 'correctanswer':
      return 'For true/false questions, use "true" or "false". For numeric questions, use a number.';
    case 'tolerance':
      return 'Tolerance must be a number (e.g., 0.1, 1, 5)';
    case 'options':
      return 'Options must be valid JSON format: [{"text": "Option 1", "isCorrect": true}, {"text": "Option 2", "isCorrect": false}]';
    case 'blanks':
      return 'Blanks must be valid JSON format: [{"id": "blank-1", "correctAnswers": ["answer1", "answer2"]}]';
    case 'pairs':
      return 'Pairs must be valid JSON format: [{"id": "pair-1", "left": "Left item", "right": "Right item"}]';
    case 'items':
      return 'Items must be valid JSON format: [{"id": "item-1", "text": "Item 1", "correctZoneId": "zone-1"}]';
    case 'zones':
      return 'Zones must be valid JSON format: [{"id": "zone-1", "text": "Zone 1"}]';
    case 'keywords':
      return 'Keywords must be valid JSON format: ["keyword1", "keyword2", "keyword3"]';
    case 'rubric':
      return 'Rubric must be valid JSON format: [{"id": "criterion-1", "name": "Criterion", "description": "Description", "points": 10}]';
    default:
      return `Please check the format and value for the '${field}' field.`;
  }
}

/**
 * Convert a CSV row to a question object
 * @param row The CSV row data
 * @param questionBankId The ID of the question bank
 * @param rowIndex The index of the row (for error reporting)
 * @param selectedSubjectId The ID of the selected subject (optional, used as fallback)
 * @returns The question object or null if validation fails
 */
function convertRowToQuestion(row: CSVRowData, questionBankId: string, rowIndex: number, selectedSubjectId?: string): CreateQuestionInput | null {
  // Validate required fields (subjectId is optional if selectedSubjectId is provided)
  const requiredFields = ['title', 'questionType', 'difficulty'];
  if (!selectedSubjectId) {
    requiredFields.push('subjectId');
  }
  const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate question type
  const questionType = row.questionType.trim() as QuestionType;
  if (!Object.values(QuestionType).includes(questionType)) {
    throw new Error(`Invalid questionType: ${questionType}`);
  }

  // Validate difficulty
  const difficulty = row.difficulty.trim() as DifficultyLevel;
  if (!Object.values(DifficultyLevel).includes(difficulty)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }

  // Validate optional numeric fields
  if (row.gradeLevel && row.gradeLevel.trim()) {
    const gradeLevel = Number(row.gradeLevel);
    if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
      throw new Error(`Invalid gradeLevel: ${row.gradeLevel}`);
    }
  }

  if (row.year && row.year.trim()) {
    const year = Number(row.year);
    if (isNaN(year) || year < 1900 || year > 2100) {
      throw new Error(`Invalid year: ${row.year}`);
    }
  }

  // Use selectedSubjectId as fallback if subjectId is missing or empty
  let finalSubjectId = row.subjectId;
  if (!finalSubjectId || finalSubjectId.trim() === '') {
    if (selectedSubjectId) {
      finalSubjectId = selectedSubjectId;
      console.warn(`Using selected subject ${selectedSubjectId} for question with missing/invalid subjectId at row ${rowIndex + 1}`);
    } else {
      throw new Error(`Missing required field: subjectId`);
    }
  }

  // Create the base question object
  const question: CreateQuestionInput = {
    questionBankId,
    title: row.title,
    questionType,
    difficulty,
    subjectId: finalSubjectId,
    content: createQuestionContent(row, questionType, rowIndex),
    metadata: {}
  };

  // Add optional fields if present
  if (row.courseId) question.courseId = row.courseId;
  if (row.topicId) question.topicId = row.topicId;
  if (row.gradeLevel) question.gradeLevel = Number(row.gradeLevel);
  if (row.year) question.year = Number(row.year);
  if (row.sourceReference) question.sourceReference = row.sourceReference;

  // Add Bloom's taxonomy level if present
  if (row.bloomsLevel) {
    // Import BloomsTaxonomyLevel from Prisma
    const { BloomsTaxonomyLevel } = require('@prisma/client');
    if (Object.values(BloomsTaxonomyLevel).includes(row.bloomsLevel)) {
      question.bloomsLevel = row.bloomsLevel as any;
    }
  }

  return question;
}

/**
 * Create the question content based on the question type
 * @param row The CSV row data
 * @param questionType The type of question
 * @param rowIndex The index of the row (for error reporting)
 * @returns The question content object
 */
function createQuestionContent(row: CSVRowData, questionType: QuestionType, rowIndex: number): any {
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return createMultipleChoiceContent(row, rowIndex);
    case QuestionType.TRUE_FALSE:
      return createTrueFalseContent(row, rowIndex);
    case QuestionType.MULTIPLE_RESPONSE:
      return createMultipleResponseContent(row, rowIndex);
    case QuestionType.FILL_IN_THE_BLANKS:
      return createFillInTheBlanksContent(row, rowIndex);
    case QuestionType.MATCHING:
      return createMatchingContent(row, rowIndex);
    case QuestionType.DRAG_AND_DROP:
      return createDragAndDropContent(row, rowIndex);
    case QuestionType.NUMERIC:
      return createNumericContent(row, rowIndex);
    case QuestionType.SHORT_ANSWER:
      return createShortAnswerContent(row, rowIndex);
    case QuestionType.ESSAY:
      return createEssayContent(row, rowIndex);
    default:
      throw new Error(`Row ${rowIndex}: Question type ${questionType} is not supported for CSV import`);
  }
}

/**
 * Create multiple choice content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The multiple choice content object
 */
function createMultipleChoiceContent(row: CSVRowData, rowIndex: number): MultipleChoiceContent {
  if (!row.text || row.text.trim() === '') {
    throw new Error(`Missing required field 'text' for multiple choice question`);
  }

  // Check if using new column-based format or old JSON format
  const hasColumnFormat = row.option1 !== undefined;

  if (hasColumnFormat) {
    // New column-based format
    const options: any[] = [];

    // Process up to 4 options
    for (let i = 1; i <= 4; i++) {
      const optionText = row[`option${i}`];
      if (optionText) {
        const isCorrect = row[`option${i}Correct`] === 'true' || row[`option${i}Correct`] === '1';
        const feedback = row[`option${i}Feedback`] || undefined;

        options.push({
          id: `option-${i}`,
          text: optionText,
          isCorrect,
          feedback
        });
      }
    }

    if (options.length === 0) {
      throw new Error(`At least one option must be provided (option1, option2, etc.)`);
    }

    if (options.length < 2) {
      throw new Error(`Multiple choice questions must have at least 2 options`);
    }

    // Check if at least one option is correct
    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      throw new Error(`At least one option must be marked as correct (set option1Correct, option2Correct, etc. to 'true')`);
    }

    // Check for empty option text
    const emptyOptions = options.filter(option => !option.text || option.text.trim() === '');
    if (emptyOptions.length > 0) {
      throw new Error(`All options must have text content`);
    }

    return {
      text: row.text,
      options,
      explanation: row.explanation || undefined,
      hint: row.hint || undefined
    };
  } else {
    // Legacy JSON format support
    if (!row.options) {
      throw new Error(`Missing required field 'options' for multiple choice question`);
    }

    try {
      // Parse options from JSON string
      // Format: [{"text": "Option 1", "isCorrect": true}, {"text": "Option 2", "isCorrect": false}]
      const options = JSON.parse(row.options);

      if (!Array.isArray(options) || options.length === 0) {
        throw new Error(`Options must be a non-empty array`);
      }

      if (options.length < 2) {
        throw new Error(`Multiple choice questions must have at least 2 options`);
      }

      // Validate options
      options.forEach((option, index) => {
        if (!option.text || option.text.trim() === '') {
          throw new Error(`Option ${index + 1} is missing 'text'`);
        }

        if (typeof option.isCorrect !== 'boolean') {
          throw new Error(`Option ${index + 1} is missing 'isCorrect' or it's not a boolean`);
        }
      });

      // Check if at least one option is correct
      const hasCorrectOption = options.some(option => option.isCorrect);
      if (!hasCorrectOption) {
        throw new Error(`At least one option must be marked as correct`);
      }

      return {
        text: row.text,
        options: options.map((option, index) => ({
          id: `option-${index + 1}`,
          text: option.text,
          isCorrect: option.isCorrect,
          feedback: option.feedback || undefined
        })),
        explanation: row.explanation || undefined,
        hint: row.hint || undefined
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format for options: ${error.message}. Expected format: [{"text": "Option 1", "isCorrect": true}, {"text": "Option 2", "isCorrect": false}]`);
      }
      throw error;
    }
  }
}

/**
 * Create true/false content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The true/false content object
 */
function createTrueFalseContent(row: CSVRowData, rowIndex: number): TrueFalseContent {
  if (!row.text || row.text.trim() === '') {
    throw new Error(`Missing required field 'text' for true/false question`);
  }

  if (row.correctAnswer === undefined || row.correctAnswer.trim() === '') {
    throw new Error(`Missing required field 'correctAnswer' for true/false question`);
  }

  const correctAnswerStr = row.correctAnswer.toLowerCase().trim();
  if (correctAnswerStr !== 'true' && correctAnswerStr !== 'false') {
    throw new Error(`Invalid correctAnswer: ${row.correctAnswer}. Must be 'true' or 'false'`);
  }

  const correctAnswer = correctAnswerStr === 'true';

  return {
    text: row.text,
    isTrue: correctAnswer,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

/**
 * Create multiple response content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The multiple response content object
 */
function createMultipleResponseContent(row: CSVRowData, rowIndex: number): MultipleResponseContent {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for multiple response question`);
  }

  // Check if using new column-based format or old JSON format
  const hasColumnFormat = row.option1 !== undefined;

  if (hasColumnFormat) {
    // New column-based format
    const options: any[] = [];

    // Process up to 4 options
    for (let i = 1; i <= 4; i++) {
      const optionText = row[`option${i}`];
      if (optionText) {
        const isCorrect = row[`option${i}Correct`] === 'true' || row[`option${i}Correct`] === '1';
        const feedback = row[`option${i}Feedback`] || undefined;

        options.push({
          id: `option-${i}`,
          text: optionText,
          isCorrect,
          feedback
        });
      }
    }

    if (options.length === 0) {
      throw new Error(`Row ${rowIndex}: At least one option must be provided`);
    }

    // Check if at least one option is correct
    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      throw new Error(`Row ${rowIndex}: At least one option must be marked as correct`);
    }

    return {
      text: row.text,
      options,
      explanation: row.explanation || undefined,
      hint: row.hint || undefined,
      partialCredit: row.partialCredit === 'true' || Boolean(row.partialCredit)
    };
  } else {
    // Legacy JSON format support
    if (!row.options) {
      throw new Error(`Row ${rowIndex}: Missing required field 'options' for multiple response question`);
    }

  try {
    // Parse options from JSON string
    // Format: [{"text": "Option 1", "isCorrect": true}, {"text": "Option 2", "isCorrect": false}]
    const options = JSON.parse(row.options);

    if (!Array.isArray(options) || options.length === 0) {
      throw new Error(`Row ${rowIndex}: Options must be a non-empty array`);
    }

    // Validate options
    options.forEach((option, index) => {
      if (!option.text) {
        throw new Error(`Row ${rowIndex}: Option ${index + 1} is missing 'text'`);
      }

      if (typeof option.isCorrect !== 'boolean') {
        throw new Error(`Row ${rowIndex}: Option ${index + 1} is missing 'isCorrect' or it's not a boolean`);
      }
    });

    // Check if at least one option is correct
    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      throw new Error(`Row ${rowIndex}: At least one option must be marked as correct`);
    }

    return {
      text: row.text,
      options: options.map((option, index) => ({
        id: `option-${index + 1}`,
        text: option.text,
        isCorrect: option.isCorrect,
        feedback: option.feedback || undefined
      })),
      explanation: row.explanation || undefined,
      hint: row.hint || undefined,
      partialCredit: row.partialCredit === 'true' || Boolean(row.partialCredit)
    };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Row ${rowIndex}: Invalid JSON format for options: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Create fill in the blanks content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The fill in the blanks content object
 */
function createFillInTheBlanksContent(row: CSVRowData, rowIndex: number): FillInTheBlanksContent {
  if (!row.text || row.text.trim() === '') {
    throw new Error(`Missing required field 'text' for fill in the blanks question`);
  }

  if (!row.blanks || row.blanks.trim() === '') {
    throw new Error(`Missing required field 'blanks' for fill in the blanks question`);
  }

  try {
    // Parse blanks from JSON string
    // Format: [{"id": "blank-1", "correctAnswers": ["answer1", "answer2"], "feedback": "Good job!"}]
    const blanks = JSON.parse(row.blanks);

    if (!Array.isArray(blanks) || blanks.length === 0) {
      throw new Error(`Blanks must be a non-empty array`);
    }

    // Validate blanks
    blanks.forEach((blank, index) => {
      if (!blank.id) {
        throw new Error(`Blank ${index + 1} is missing 'id'`);
      }

      if (!Array.isArray(blank.correctAnswers) || blank.correctAnswers.length === 0) {
        throw new Error(`Blank ${index + 1} must have at least one correct answer`);
      }
    });

    return {
      text: row.text,
      blanks: blanks.map(blank => ({
        id: blank.id,
        correctAnswers: blank.correctAnswers,
        feedback: blank.feedback || undefined
      })),
      explanation: row.explanation || undefined,
      hint: row.hint || undefined,
      caseSensitive: row.caseSensitive === 'true' || Boolean(row.caseSensitive)
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format for blanks: ${error.message}. Expected format: [{"id": "blank-1", "correctAnswers": ["answer1", "answer2"]}]`);
    }
    throw error;
  }
}

/**
 * Create matching content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The matching content object
 */
function createMatchingContent(row: CSVRowData, rowIndex: number): MatchingContent {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for matching question`);
  }

  if (!row.pairs) {
    throw new Error(`Row ${rowIndex}: Missing required field 'pairs' for matching question`);
  }

  try {
    // Parse pairs from JSON string
    // Format: [{"id": "pair-1", "left": "Left item", "right": "Right item"}]
    const pairs = JSON.parse(row.pairs);

    if (!Array.isArray(pairs) || pairs.length === 0) {
      throw new Error(`Row ${rowIndex}: Pairs must be a non-empty array`);
    }

    // Validate pairs
    pairs.forEach((pair, index) => {
      if (!pair.id) {
        throw new Error(`Row ${rowIndex}: Pair ${index + 1} is missing 'id'`);
      }

      if (!pair.left) {
        throw new Error(`Row ${rowIndex}: Pair ${index + 1} is missing 'left'`);
      }

      if (!pair.right) {
        throw new Error(`Row ${rowIndex}: Pair ${index + 1} is missing 'right'`);
      }
    });

    return {
      text: row.text,
      pairs: pairs.map(pair => ({
        id: pair.id,
        left: pair.left,
        right: pair.right
      })),
      explanation: row.explanation || undefined,
      hint: row.hint || undefined
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Row ${rowIndex}: Invalid JSON format for pairs: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create drag and drop content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The drag and drop content object
 */
function createDragAndDropContent(row: CSVRowData, rowIndex: number): DragAndDropContent {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for drag and drop question`);
  }

  if (!row.items) {
    throw new Error(`Row ${rowIndex}: Missing required field 'items' for drag and drop question`);
  }

  if (!row.zones) {
    throw new Error(`Row ${rowIndex}: Missing required field 'zones' for drag and drop question`);
  }

  try {
    // Parse items from JSON string
    // Format: [{"id": "item-1", "text": "Item 1", "correctZoneId": "zone-1", "feedback": "Good job!"}]
    const items = JSON.parse(row.items);

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error(`Row ${rowIndex}: Items must be a non-empty array`);
    }

    // Parse zones from JSON string
    // Format: [{"id": "zone-1", "text": "Zone 1"}]
    const zones = JSON.parse(row.zones);

    if (!Array.isArray(zones) || zones.length === 0) {
      throw new Error(`Row ${rowIndex}: Zones must be a non-empty array`);
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.id) {
        throw new Error(`Row ${rowIndex}: Item ${index + 1} is missing 'id'`);
      }

      if (!item.text) {
        throw new Error(`Row ${rowIndex}: Item ${index + 1} is missing 'text'`);
      }

      if (!item.correctZoneId) {
        throw new Error(`Row ${rowIndex}: Item ${index + 1} is missing 'correctZoneId'`);
      }

      // Check if the correctZoneId exists in zones
      const zoneExists = zones.some(zone => zone.id === item.correctZoneId);
      if (!zoneExists) {
        throw new Error(`Row ${rowIndex}: Item ${index + 1} has a correctZoneId that doesn't exist in zones`);
      }
    });

    // Validate zones
    zones.forEach((zone, index) => {
      if (!zone.id) {
        throw new Error(`Row ${rowIndex}: Zone ${index + 1} is missing 'id'`);
      }

      if (!zone.text) {
        throw new Error(`Row ${rowIndex}: Zone ${index + 1} is missing 'text'`);
      }
    });

    return {
      text: row.text,
      items: items.map(item => ({
        id: item.id,
        text: item.text,
        correctZoneId: item.correctZoneId,
        feedback: item.feedback || undefined
      })),
      zones: zones.map(zone => ({
        id: zone.id,
        text: zone.text,
        x: zone.x || 0,
        y: zone.y || 0,
        width: zone.width || 100,
        height: zone.height || 100
      })),
      explanation: row.explanation || undefined,
      hint: row.hint || undefined
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Row ${rowIndex}: Invalid JSON format for items or zones: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create numeric content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The numeric content object
 */
function createNumericContent(row: CSVRowData, rowIndex: number): NumericContent {
  if (!row.text || row.text.trim() === '') {
    throw new Error(`Missing required field 'text' for numeric question`);
  }

  if (row.correctAnswer === undefined || row.correctAnswer.trim() === '') {
    throw new Error(`Missing required field 'correctAnswer' for numeric question`);
  }

  const correctAnswer = Number(row.correctAnswer);
  if (isNaN(correctAnswer)) {
    throw new Error(`Invalid correctAnswer: ${row.correctAnswer}. Must be a number`);
  }

  let tolerance = 0;
  if (row.tolerance && row.tolerance.trim() !== '') {
    tolerance = Number(row.tolerance);
    if (isNaN(tolerance) || tolerance < 0) {
      throw new Error(`Invalid tolerance: ${row.tolerance}. Must be a non-negative number`);
    }
  }

  return {
    text: row.text,
    correctAnswer,
    acceptableRange: tolerance ? { min: correctAnswer - tolerance, max: correctAnswer + tolerance } : undefined,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined,
    unit: row.unit || undefined
  };
}

/**
 * Create short answer content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The short answer content object
 */
function createShortAnswerContent(row: CSVRowData, rowIndex: number): ShortAnswerContent {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for short answer question`);
  }

  let keywords: string[] = [];
  if (row.keywords) {
    try {
      keywords = JSON.parse(row.keywords);
      if (!Array.isArray(keywords)) {
        throw new Error(`Row ${rowIndex}: 'keywords' must be an array for short answer question`);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Row ${rowIndex}: Invalid JSON format for keywords: ${error.message}`);
      }
      throw error;
    }
  }

  return {
    text: row.text,
    correctAnswers: keywords,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined,
    // maxLength is not in the type, but we'll keep it as a comment for reference
    // maxLength: row.maxLength ? Number(row.maxLength) : undefined
  };
}

/**
 * Create essay content from CSV row
 * @param row The CSV row data
 * @param rowIndex The index of the row (for error reporting)
 * @returns The essay content object
 */
function createEssayContent(row: CSVRowData, rowIndex: number): EssayContent {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for essay question`);
  }

  let rubric: any[] = [];
  if (row.rubric) {
    try {
      rubric = JSON.parse(row.rubric);
      if (!Array.isArray(rubric)) {
        throw new Error(`Row ${rowIndex}: 'rubric' must be an array for essay question`);
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Row ${rowIndex}: Invalid JSON format for rubric: ${error.message}`);
      }
      throw error;
    }
  }

  return {
    text: row.text,
    rubric: rubric.length > 0 ? {
      criteria: rubric.map(r => ({
        id: r.id || `criterion-${Math.random().toString(36).substring(2, 9)}`,
        name: r.name || 'Criterion',
        description: r.description || '',
        points: r.points || 0,
        levels: r.levels || []
      })),
      totalPoints: rubric.reduce((sum, r) => sum + (r.points || 0), 0)
    } : undefined,
    wordCountMax: row.wordLimit ? Number(row.wordLimit) : undefined,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

/**
 * Generate a CSV template for a specific question type
 * @param questionType The type of question
 * @returns The CSV template as a string
 */
export function generateCSVTemplate(questionType: QuestionType): string {
  const headers = [...COMMON_HEADERS, ...QUESTION_TYPE_HEADERS[questionType]];
  return headers.join(',') + '\n';
}

/**
 * Generate a sample CSV row for a specific question type
 * @param questionType The type of question
 * @returns The sample CSV row as an object
 */
export function generateSampleCSVRow(questionType: QuestionType): Record<string, string> {
  const row: Record<string, string> = {
    title: `Sample ${questionType} Question`,
    questionType,
    difficulty: DifficultyLevel.MEDIUM,
    subjectId: 'subject-123',
    subjectName: 'Mathematics', // Optional reference
    courseId: 'course-456',
    courseName: 'Algebra I', // Optional reference
    topicId: 'topic-789',
    topicName: 'Linear Equations', // Optional reference
    bloomsLevel: 'UNDERSTANDING', // Bloom's Taxonomy Level
    gradeLevel: '5',
    year: '2023',
    sourceReference: 'Sample Source'
  };

  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      row.text = 'What is the capital of France?';
      row.option1 = 'Paris';
      row.option1Correct = 'true';
      row.option1Feedback = 'Correct! Paris is the capital of France.';
      row.option2 = 'London';
      row.option2Correct = 'false';
      row.option2Feedback = 'Incorrect. London is the capital of the United Kingdom.';
      row.option3 = 'Berlin';
      row.option3Correct = 'false';
      row.option3Feedback = 'Incorrect. Berlin is the capital of Germany.';
      row.option4 = 'Madrid';
      row.option4Correct = 'false';
      row.option4Feedback = 'Incorrect. Madrid is the capital of Spain.';
      row.explanation = 'Paris is the capital of France.';
      row.hint = 'Think of the Eiffel Tower.';
      break;

    case QuestionType.TRUE_FALSE:
      row.text = 'Paris is the capital of France.';
      row.correctAnswer = 'true';
      row.explanation = 'Paris is indeed the capital of France.';
      row.hint = 'Think of the Eiffel Tower.';
      break;

    case QuestionType.MULTIPLE_RESPONSE:
      row.text = 'Which of the following are planets in our solar system?';
      row.option1 = 'Earth';
      row.option1Correct = 'true';
      row.option1Feedback = 'Correct! Earth is a planet.';
      row.option2 = 'Mars';
      row.option2Correct = 'true';
      row.option2Feedback = 'Correct! Mars is a planet.';
      row.option3 = 'Sun';
      row.option3Correct = 'false';
      row.option3Feedback = 'Incorrect. The Sun is a star, not a planet.';
      row.option4 = 'Moon';
      row.option4Correct = 'false';
      row.option4Feedback = 'Incorrect. The Moon is a satellite, not a planet.';
      row.explanation = 'Earth and Mars are planets in our solar system.';
      row.hint = 'The Sun is a star, and the Moon is a satellite.';
      break;

    // Add more cases for other question types

    default:
      break;
  }

  return row;
}

/**
 * Generate a sample CSV file for a specific question type
 * @param questionType The type of question
 * @returns The sample CSV file as a string
 */
export function generateSampleCSV(questionType: QuestionType): string {
  const headers = [...COMMON_HEADERS, ...QUESTION_TYPE_HEADERS[questionType]];
  const row = generateSampleCSVRow(questionType);

  const headerLine = headers.join(',');
  const rowLine = headers.map(header => {
    const value = row[header];
    if (typeof value === 'string' && value.includes(',')) {
      return `"${value}"`;
    }
    return value || '';
  }).join(',');

  return headerLine + '\n' + rowLine + '\n';
}
