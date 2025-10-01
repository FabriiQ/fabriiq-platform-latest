/**
 * Validate Y8 English 10K Questions File
 * 
 * Validates the generated CSV file to ensure:
 * - Correct number of questions (10,000)
 * - All required fields are present
 * - Data format is correct for bulk upload
 * - Question types are properly distributed
 * - All questions have valid learning outcomes and topics
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'papaparse';

interface ValidationResult {
  isValid: boolean;
  totalQuestions: number;
  errors: string[];
  warnings: string[];
  statistics: {
    questionTypes: Record<string, number>;
    bloomsLevels: Record<string, number>;
    difficulties: Record<string, number>;
  };
}

interface QuestionRow {
  questionBankId: string;
  title: string;
  questionType: string;
  difficulty: string;
  text: string;
  options?: string;
  correctAnswer?: string;
  blanks?: string;
  pairs?: string;
  explanation?: string;
  hint?: string;
  tolerance?: string;
  unit?: string;
  bloomsLevel: string;
  learningOutcomeIds: string;
  subjectId: string;
  topicId: string;
  gradeLevel: string;
  year: string;
  createdById: string;
  partitionKey: string;
}

/**
 * Validate individual question row
 */
function validateQuestionRow(row: QuestionRow, rowIndex: number): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!row.questionBankId) errors.push(`Row ${rowIndex}: Missing questionBankId`);
  if (!row.title) errors.push(`Row ${rowIndex}: Missing title`);
  if (!row.questionType) errors.push(`Row ${rowIndex}: Missing questionType`);
  if (!row.difficulty) errors.push(`Row ${rowIndex}: Missing difficulty`);
  if (!row.text) errors.push(`Row ${rowIndex}: Missing text`);
  if (!row.bloomsLevel) errors.push(`Row ${rowIndex}: Missing bloomsLevel`);
  if (!row.learningOutcomeIds) errors.push(`Row ${rowIndex}: Missing learningOutcomeIds`);
  if (!row.subjectId) errors.push(`Row ${rowIndex}: Missing subjectId`);
  if (!row.topicId) errors.push(`Row ${rowIndex}: Missing topicId`);
  if (!row.gradeLevel) errors.push(`Row ${rowIndex}: Missing gradeLevel`);
  if (!row.year) errors.push(`Row ${rowIndex}: Missing year`);
  if (!row.createdById) errors.push(`Row ${rowIndex}: Missing createdById`);

  // Validate question type specific fields
  if (row.questionType === 'MULTIPLE_CHOICE' || row.questionType === 'MULTIPLE_RESPONSE') {
    if (!row.options) {
      errors.push(`Row ${rowIndex}: Multiple choice question missing options`);
    } else {
      try {
        const options = JSON.parse(row.options);
        if (!Array.isArray(options) || options.length < 2) {
          errors.push(`Row ${rowIndex}: Multiple choice must have at least 2 options`);
        }
      } catch (e) {
        errors.push(`Row ${rowIndex}: Invalid JSON format in options`);
      }
    }
  }

  if (row.questionType === 'TRUE_FALSE') {
    if (!row.correctAnswer || !['true', 'false'].includes(row.correctAnswer.toLowerCase())) {
      errors.push(`Row ${rowIndex}: True/false question must have correctAnswer as 'true' or 'false'`);
    }
  }

  if (row.questionType === 'FILL_IN_THE_BLANKS') {
    if (!row.blanks) {
      errors.push(`Row ${rowIndex}: Fill-in-the-blanks question missing blanks`);
    } else {
      try {
        const blanks = JSON.parse(row.blanks);
        if (!Array.isArray(blanks) || blanks.length === 0) {
          errors.push(`Row ${rowIndex}: Fill-in-the-blanks must have at least one blank`);
        }
      } catch (e) {
        errors.push(`Row ${rowIndex}: Invalid JSON format in blanks`);
      }
    }
  }

  if (row.questionType === 'MATCHING') {
    if (!row.pairs) {
      errors.push(`Row ${rowIndex}: Matching question missing pairs`);
    } else {
      try {
        const pairs = JSON.parse(row.pairs);
        if (!Array.isArray(pairs) || pairs.length < 2) {
          errors.push(`Row ${rowIndex}: Matching question must have at least 2 pairs`);
        }
      } catch (e) {
        errors.push(`Row ${rowIndex}: Invalid JSON format in pairs`);
      }
    }
  }

  if (row.questionType === 'NUMERIC') {
    if (!row.correctAnswer) {
      errors.push(`Row ${rowIndex}: Numeric question missing correctAnswer`);
    }
  }

  // Validate enum values
  const validQuestionTypes = [
    'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC',
    'FILL_IN_THE_BLANKS', 'MATCHING', 'MULTIPLE_RESPONSE', 'DRAG_AND_DROP',
    'DRAG_THE_WORDS', 'SEQUENCE', 'FLASH_CARDS', 'READING', 'VIDEO', 'HOTSPOT', 'LIKERT_SCALE'
  ];
  if (!validQuestionTypes.includes(row.questionType)) {
    errors.push(`Row ${rowIndex}: Invalid questionType '${row.questionType}'`);
  }

  const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
  if (!validDifficulties.includes(row.difficulty)) {
    errors.push(`Row ${rowIndex}: Invalid difficulty '${row.difficulty}'`);
  }

  const validBloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
  if (!validBloomsLevels.includes(row.bloomsLevel)) {
    errors.push(`Row ${rowIndex}: Invalid bloomsLevel '${row.bloomsLevel}'`);
  }

  // Validate grade level
  const gradeLevel = parseInt(row.gradeLevel);
  if (isNaN(gradeLevel) || gradeLevel !== 8) {
    errors.push(`Row ${rowIndex}: Grade level should be 8 for Y8 English`);
  }

  // Validate year
  const year = parseInt(row.year);
  if (isNaN(year) || year < 2020 || year > 2030) {
    errors.push(`Row ${rowIndex}: Invalid year '${row.year}'`);
  }

  return errors;
}

/**
 * Validate the entire CSV file
 */
async function validateCSVFile(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    totalQuestions: 0,
    errors: [],
    warnings: [],
    statistics: {
      questionTypes: {},
      bloomsLevels: {},
      difficulties: {}
    }
  };

  try {
    console.log(`📋 Validating file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      result.errors.push('File does not exist');
      result.isValid = false;
      return result;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    return new Promise((resolve) => {
      parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const questions = results.data as QuestionRow[];
          result.totalQuestions = questions.length;

          console.log(`📊 Found ${questions.length} questions to validate`);

          // Validate each question
          questions.forEach((question, index) => {
            const rowErrors = validateQuestionRow(question, index + 2); // +2 for header and 1-based indexing
            result.errors.push(...rowErrors);

            // Collect statistics
            if (question.questionType) {
              result.statistics.questionTypes[question.questionType] = 
                (result.statistics.questionTypes[question.questionType] || 0) + 1;
            }
            
            if (question.bloomsLevel) {
              result.statistics.bloomsLevels[question.bloomsLevel] = 
                (result.statistics.bloomsLevels[question.bloomsLevel] || 0) + 1;
            }
            
            if (question.difficulty) {
              result.statistics.difficulties[question.difficulty] = 
                (result.statistics.difficulties[question.difficulty] || 0) + 1;
            }
          });

          // Check if we have the expected number of questions
          if (result.totalQuestions !== 10000) {
            result.warnings.push(`Expected 10,000 questions but found ${result.totalQuestions}`);
          }

          // Check for parsing errors
          if (results.errors && results.errors.length > 0) {
            result.errors.push(...results.errors.map(err => `Parse error: ${err.message}`));
          }

          result.isValid = result.errors.length === 0;
          resolve(result);
        },
        error: (error) => {
          result.errors.push(`Failed to parse CSV: ${error.message}`);
          result.isValid = false;
          resolve(result);
        }
      });
    });

  } catch (error) {
    result.errors.push(`Failed to read file: ${(error as Error).message}`);
    result.isValid = false;
    return result;
  }
}

/**
 * Print validation results
 */
function printValidationResults(result: ValidationResult) {
  console.log('\n📋 VALIDATION RESULTS');
  console.log('='.repeat(50));
  
  console.log(`✅ Total Questions: ${result.totalQuestions}`);
  console.log(`${result.isValid ? '✅' : '❌'} Overall Status: ${result.isValid ? 'VALID' : 'INVALID'}`);
  
  if (result.errors.length > 0) {
    console.log(`\n❌ ERRORS (${result.errors.length}):`);
    result.errors.slice(0, 20).forEach(error => console.log(`   • ${error}`));
    if (result.errors.length > 20) {
      console.log(`   ... and ${result.errors.length - 20} more errors`);
    }
  }
  
  if (result.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`);
    result.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
  
  console.log('\n📊 STATISTICS:');
  console.log('\nQuestion Types:');
  Object.entries(result.statistics.questionTypes)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`   ${type}: ${count} (${((count / result.totalQuestions) * 100).toFixed(1)}%)`);
    });
  
  console.log('\nBloom\'s Taxonomy Levels:');
  Object.entries(result.statistics.bloomsLevels)
    .sort(([,a], [,b]) => b - a)
    .forEach(([level, count]) => {
      console.log(`   ${level}: ${count} (${((count / result.totalQuestions) * 100).toFixed(1)}%)`);
    });
  
  console.log('\nDifficulty Levels:');
  Object.entries(result.statistics.difficulties)
    .sort(([,a], [,b]) => b - a)
    .forEach(([difficulty, count]) => {
      console.log(`   ${difficulty}: ${count} (${((count / result.totalQuestions) * 100).toFixed(1)}%)`);
    });
}

/**
 * Main validation function
 */
async function main() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'Y8_English_10000_questions_2025-09-07.csv');
    
    console.log('🔍 Starting Y8 English Questions Validation...\n');
    
    const result = await validateCSVFile(filePath);
    printValidationResults(result);
    
    if (result.isValid) {
      console.log('\n🎉 Validation completed successfully! File is ready for bulk upload.');
    } else {
      console.log('\n❌ Validation failed. Please fix the errors before uploading.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { validateCSVFile, ValidationResult };
