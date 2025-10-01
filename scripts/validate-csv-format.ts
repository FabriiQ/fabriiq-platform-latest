/**
 * Validate CSV Format for Bulk Upload
 * 
 * This script validates that our generated CSV files match the expected format
 * for the bulk upload validation system.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  success: boolean;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Validate a single CSV file
 */
async function validateCSVFile(filePath: string): Promise<ValidationResult> {
  const fileName = path.basename(filePath);
  console.log(`\n📋 Validating ${fileName}...`);
  
  const result: ValidationResult = {
    fileName,
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    errors: [],
    success: false
  };
  
  try {
    // Read and parse CSV manually
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    // Parse header
    const header = lines[0].split(',').map(col => col.replace(/"/g, '').trim());

    // Parse data rows
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === header.length) {
        const record: any = {};
        header.forEach((col, index) => {
          record[col] = values[index] || '';
        });
        records.push(record);
      }
    }
    
    result.totalRows = records.length;
    console.log(`   📊 Total rows: ${result.totalRows}`);
    
    // Validate each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 because CSV has header and is 1-indexed
      const rowErrors = validateRow(row, rowNumber);
      
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.errorRows++;
      } else {
        result.validRows++;
      }
      
      // Progress indicator for large files
      if (i > 0 && i % 10000 === 0) {
        console.log(`   📊 Validated ${i} rows...`);
      }
    }
    
    result.success = result.errors.length === 0;
    
    console.log(`   ✅ Valid rows: ${result.validRows}`);
    console.log(`   ❌ Error rows: ${result.errorRows}`);
    
    if (result.errors.length > 0) {
      console.log(`   🔍 First 5 errors:`);
      result.errors.slice(0, 5).forEach(error => {
        console.log(`      Row ${error.row}: ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error(`   💥 Failed to validate ${fileName}:`, error);
    result.errors.push({
      row: 0,
      field: 'file',
      message: `Failed to parse CSV: ${error}`
    });
  }
  
  return result;
}

/**
 * Validate a single row
 */
function validateRow(row: any, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Required fields
  const requiredFields = ['title', 'questionType', 'difficulty', 'text', 'subjectId'];
  
  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      errors.push({
        row: rowNumber,
        field,
        message: `Missing required field '${field}'`,
        value: row[field]
      });
    }
  }
  
  // Question type specific validation
  if (row.questionType) {
    switch (row.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'MULTIPLE_RESPONSE':
        if (!row.options || row.options.trim() === '') {
          errors.push({
            row: rowNumber,
            field: 'options',
            message: `Missing required field 'options' for ${row.questionType} question`,
            value: row.options
          });
        } else {
          try {
            const options = JSON.parse(row.options);
            if (!Array.isArray(options) || options.length < 2) {
              errors.push({
                row: rowNumber,
                field: 'options',
                message: `${row.questionType} questions must have at least 2 options`,
                value: row.options
              });
            } else {
              // Check if options have required fields
              options.forEach((option, index) => {
                if (!option.text || option.text.trim() === '') {
                  errors.push({
                    row: rowNumber,
                    field: 'options',
                    message: `Option ${index + 1} is missing 'text'`,
                    value: JSON.stringify(option)
                  });
                }
                if (typeof option.isCorrect !== 'boolean') {
                  errors.push({
                    row: rowNumber,
                    field: 'options',
                    message: `Option ${index + 1} is missing 'isCorrect' or it's not a boolean`,
                    value: JSON.stringify(option)
                  });
                }
              });
              
              // Check if at least one option is correct
              const correctOptions = options.filter(opt => opt.isCorrect === true);
              if (correctOptions.length === 0) {
                errors.push({
                  row: rowNumber,
                  field: 'options',
                  message: `At least one option must be marked as correct`,
                  value: row.options
                });
              }
            }
          } catch (e) {
            errors.push({
              row: rowNumber,
              field: 'options',
              message: `Invalid JSON format for options: ${e}`,
              value: row.options
            });
          }
        }
        break;
        
      case 'TRUE_FALSE':
        if (!row.correctAnswer || (row.correctAnswer.toLowerCase() !== 'true' && row.correctAnswer.toLowerCase() !== 'false')) {
          errors.push({
            row: rowNumber,
            field: 'correctAnswer',
            message: `Missing required field 'correctAnswer' for true/false question. Must be 'true' or 'false'`,
            value: row.correctAnswer
          });
        }
        break;
        
      case 'FILL_IN_THE_BLANKS':
        if (!row.blanks || row.blanks.trim() === '') {
          errors.push({
            row: rowNumber,
            field: 'blanks',
            message: `Missing required field 'blanks' for fill in the blanks question`,
            value: row.blanks
          });
        } else {
          try {
            const blanks = JSON.parse(row.blanks);
            if (!Array.isArray(blanks) || blanks.length === 0) {
              errors.push({
                row: rowNumber,
                field: 'blanks',
                message: `Blanks must be a non-empty array`,
                value: row.blanks
              });
            }
          } catch (e) {
            errors.push({
              row: rowNumber,
              field: 'blanks',
              message: `Invalid JSON format for blanks: ${e}`,
              value: row.blanks
            });
          }
        }
        break;
        
      case 'MATCHING':
        if (!row.pairs || row.pairs.trim() === '') {
          errors.push({
            row: rowNumber,
            field: 'pairs',
            message: `Missing required field 'pairs' for matching question`,
            value: row.pairs
          });
        }
        break;
        
      case 'NUMERIC':
        if (!row.correctAnswer || isNaN(Number(row.correctAnswer))) {
          errors.push({
            row: rowNumber,
            field: 'correctAnswer',
            message: `Missing or invalid 'correctAnswer' for numeric question. Must be a number`,
            value: row.correctAnswer
          });
        }
        break;
    }
  }
  
  return errors;
}

/**
 * Validate all CSV files in the subject-question-files directory
 */
async function validateAllCSVFiles() {
  console.log('🚀 Starting CSV Format Validation...\n');
  
  const csvDir = path.join(process.cwd(), 'data', 'subject-question-files');
  
  if (!fs.existsSync(csvDir)) {
    console.error('❌ CSV directory not found:', csvDir);
    return;
  }
  
  const csvFiles = fs.readdirSync(csvDir).filter(file => file.endsWith('.csv'));
  
  if (csvFiles.length === 0) {
    console.error('❌ No CSV files found in:', csvDir);
    return;
  }
  
  console.log(`📁 Found ${csvFiles.length} CSV files to validate`);
  
  const results: ValidationResult[] = [];
  
  for (const csvFile of csvFiles) {
    const filePath = path.join(csvDir, csvFile);
    const result = await validateCSVFile(filePath);
    results.push(result);
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=' .repeat(60));
  
  let totalFiles = results.length;
  let successfulFiles = results.filter(r => r.success).length;
  let totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
  let totalValidRows = results.reduce((sum, r) => sum + r.validRows, 0);
  let totalErrorRows = results.reduce((sum, r) => sum + r.errorRows, 0);
  
  console.log(`📁 Files processed: ${totalFiles}`);
  console.log(`✅ Successful files: ${successfulFiles}`);
  console.log(`❌ Failed files: ${totalFiles - successfulFiles}`);
  console.log(`📊 Total rows: ${totalRows}`);
  console.log(`✅ Valid rows: ${totalValidRows}`);
  console.log(`❌ Error rows: ${totalErrorRows}`);
  console.log(`📈 Success rate: ${((totalValidRows / totalRows) * 100).toFixed(2)}%`);
  
  if (totalErrorRows > 0) {
    console.log('\n🔍 MOST COMMON ISSUES:');
    const errorMessages = results.flatMap(r => r.errors.map(e => e.message));
    const errorCounts = errorMessages.reduce((acc, msg) => {
      acc[msg] = (acc[msg] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([message, count]) => {
        console.log(`• ${message} (${count} occurrences)`);
      });
  }
  
  if (successfulFiles === totalFiles) {
    console.log('\n🎉 All CSV files are valid and ready for bulk upload!');
  } else {
    console.log('\n⚠️  Some files have validation errors. Please fix them before uploading.');
  }
}

// Run the validation
if (require.main === module) {
  validateAllCSVFiles()
    .then(() => {
      console.log('\n🏁 Validation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    });
}

export { validateAllCSVFiles, validateCSVFile };
