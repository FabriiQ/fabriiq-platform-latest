#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { QuestionType, DifficultyLevel } from '@prisma/client';

// Define the interface for CSV row data
interface CSVRowData {
  [key: string]: string;
}

// Define the interface for validation errors
interface ValidationError {
  row: number;
  errors: string[];
}

/**
 * Validate a CSV file for question bank import using Node.js compatible parser
 * @param filePath Path to the CSV file
 */
async function validateCSV(filePath: string) {
  console.log(`🔍 Validating CSV file: ${filePath}`);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');

    // Parse CSV using papaparse directly (Node.js compatible)
    const parseResult = parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all values as strings to match the actual parser
    });

    const errors: ValidationError[] = [];
    let totalRows = parseResult.data.length;
    let successfulRows = 0;

    // Validate each row using the same logic as the actual parser
    parseResult.data.forEach((row: any, index: number) => {
      try {
        validateRowLikeActualParser(row, index + 1);
        successfulRows++;
      } catch (error) {
        errors.push({
          row: index + 1,
          errors: [(error as Error).message]
        });
      }
    });

    // Print results
    console.log(`\n📊 Validation Results:`);
    console.log(`Total rows: ${totalRows}`);
    console.log(`Valid rows: ${successfulRows}`);
    console.log(`Error rows: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Validation Failed`);
      console.log(`Found ${errors.length} errors in the file.`);

      // Show first 10 errors for debugging
      console.log(`\n🔍 First 10 errors:`);
      errors.slice(0, 10).forEach(error => {
        console.log(`Row ${error.row}: ${error.errors.join(', ')}`);
      });

      // Group errors by type
      const errorTypes: { [key: string]: number } = {};
      errors.forEach(error => {
        error.errors.forEach(err => {
          const errorType = err.split(':')[1]?.trim() || err;
          errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
      });

      console.log(`\n📈 Error Summary:`);
      Object.entries(errorTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count} occurrences`);
        });
    } else {
      console.log(`\n✅ Validation Passed`);
      console.log(`All ${totalRows} rows are valid!`);
    }

  } catch (error) {
    console.error(`❌ Error reading or parsing CSV file:`, error);
  }
}

/**
 * Validate a single row using the same logic as the actual CSV parser
 */
function validateRowLikeActualParser(row: any, rowIndex: number) {
  // Validate required fields
  const requiredFields = ['title', 'questionType', 'difficulty', 'subjectId'];
  const missingFields = requiredFields.filter(field => !row[field]);

  if (missingFields.length > 0) {
    throw new Error(`Row ${rowIndex}: Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate question type
  const questionType = row.questionType as QuestionType;
  if (!Object.values(QuestionType).includes(questionType)) {
    throw new Error(`Row ${rowIndex}: Invalid question type: ${questionType}`);
  }

  // Validate difficulty
  const difficulty = row.difficulty as DifficultyLevel;
  if (!Object.values(DifficultyLevel).includes(difficulty)) {
    throw new Error(`Row ${rowIndex}: Invalid difficulty: ${difficulty}`);
  }

  // Validate question type specific fields
  validateQuestionTypeSpecificFields(row, questionType, rowIndex);
}

/**
 * Validate fields specific to each question type
 */
function validateQuestionTypeSpecificFields(row: any, questionType: QuestionType, rowIndex: number) {
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      validateMultipleChoiceFields(row, rowIndex);
      break;
    case QuestionType.TRUE_FALSE:
      validateTrueFalseFields(row, rowIndex);
      break;
    case QuestionType.SHORT_ANSWER:
      validateShortAnswerFields(row, rowIndex);
      break;
    case QuestionType.ESSAY:
      validateEssayFields(row, rowIndex);
      break;
    default:
      throw new Error(`Row ${rowIndex}: Question type ${questionType} is not supported for CSV import`);
  }
}

function validateMultipleChoiceFields(row: any, rowIndex: number) {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for multiple choice question`);
  }

  // Check if using new column-based format
  const hasColumnFormat = row.option1 !== undefined;

  if (hasColumnFormat) {
    const options = [];
    for (let i = 1; i <= 4; i++) {
      const optionText = row[`option${i}`];
      if (optionText) {
        const isCorrect = row[`option${i}Correct`] === 'true';
        options.push({ text: optionText, isCorrect });
      }
    }

    if (options.length === 0) {
      throw new Error(`Row ${rowIndex}: At least one option must be provided`);
    }

    const hasCorrectOption = options.some(option => option.isCorrect);
    if (!hasCorrectOption) {
      throw new Error(`Row ${rowIndex}: At least one option must be marked as correct`);
    }
  } else {
    // Legacy JSON format
    if (!row.options) {
      throw new Error(`Row ${rowIndex}: Missing required field 'options' for multiple choice question`);
    }

    try {
      const options = JSON.parse(row.options);
      if (!Array.isArray(options) || options.length === 0) {
        throw new Error(`Row ${rowIndex}: Options must be a non-empty array`);
      }
    } catch (error) {
      throw new Error(`Row ${rowIndex}: Invalid JSON format for options`);
    }
  }
}

function validateTrueFalseFields(row: any, rowIndex: number) {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for true/false question`);
  }

  if (row.correctAnswer === undefined || row.correctAnswer === '') {
    throw new Error(`Row ${rowIndex}: Missing required field 'correctAnswer' for true/false question`);
  }
}

function validateShortAnswerFields(row: any, rowIndex: number) {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for short answer question`);
  }

  if (row.keywords) {
    try {
      const keywords = JSON.parse(row.keywords);
      if (!Array.isArray(keywords)) {
        throw new Error(`Row ${rowIndex}: 'keywords' must be an array for short answer question`);
      }
    } catch (error) {
      throw new Error(`Row ${rowIndex}: Invalid JSON format for keywords`);
    }
  }
}

function validateEssayFields(row: any, rowIndex: number) {
  if (!row.text) {
    throw new Error(`Row ${rowIndex}: Missing required field 'text' for essay question`);
  }

  if (row.rubric) {
    try {
      const rubric = JSON.parse(row.rubric);
      if (!Array.isArray(rubric)) {
        throw new Error(`Row ${rowIndex}: 'rubric' must be an array for essay question`);
      }
    } catch (error) {
      throw new Error(`Row ${rowIndex}: Invalid JSON format for rubric`);
    }
  }
}

// Run validation
const csvPath = process.argv[2] || 'data/question-bank-1000-questions.csv';
validateCSV(csvPath);
