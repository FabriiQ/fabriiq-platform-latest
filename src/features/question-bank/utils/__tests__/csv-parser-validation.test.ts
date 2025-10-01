/**
 * Test file for enhanced CSV parser validation
 */

import { parseCSV } from '../csv-parser';
import { QuestionType, DifficultyLevel } from '../../models/types';

// Mock file creation helper
function createMockFile(content: string, filename = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

describe('Enhanced CSV Parser Validation', () => {
  const questionBankId = 'test-bank-id';

  describe('Detailed Error Reporting', () => {
    it('should provide detailed error information for missing required fields', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text
,MULTIPLE_CHOICE,EASY,subject-1,What is 2+2?
Test Question,,MEDIUM,subject-1,What is 3+3?
Test Question 2,MULTIPLE_CHOICE,,subject-1,What is 4+4?
Test Question 3,MULTIPLE_CHOICE,HARD,,What is 5+5?`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(4);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].errors[0]).toContain('Missing required fields: title');
      
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].errors[0]).toContain('Missing required fields: questionType');
      
      expect(result.errors[2].row).toBe(3);
      expect(result.errors[2].errors[0]).toContain('Missing required fields: difficulty');
      
      expect(result.errors[3].row).toBe(4);
      expect(result.errors[3].errors[0]).toContain('Missing required fields: subjectId');
    });

    it('should provide detailed error information for invalid field values', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text
Test Question,INVALID_TYPE,EASY,subject-1,What is 2+2?
Test Question 2,MULTIPLE_CHOICE,INVALID_DIFFICULTY,subject-1,What is 3+3?
Test Question 3,MULTIPLE_CHOICE,EASY,subject-1,What is 4+4?`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].errors[0]).toContain('Invalid questionType: INVALID_TYPE');
      
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].errors[0]).toContain('Invalid difficulty: INVALID_DIFFICULTY');
    });

    it('should validate numeric fields properly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,gradeLevel,year,text
Test Question,MULTIPLE_CHOICE,EASY,subject-1,invalid,2023,What is 2+2?
Test Question 2,MULTIPLE_CHOICE,EASY,subject-1,5,invalid_year,What is 3+3?
Test Question 3,MULTIPLE_CHOICE,EASY,subject-1,15,1800,What is 4+4?`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].errors[0]).toContain('Invalid gradeLevel: invalid');
      expect(result.errors[1].errors[0]).toContain('Invalid year: invalid_year');
      expect(result.errors[2].errors[0]).toContain('Invalid gradeLevel: 15');
    });

    it('should validate multiple choice options properly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,option1,option1Correct,option2,option2Correct
Test Question,MULTIPLE_CHOICE,EASY,subject-1,What is 2+2?,Paris,false,London,false
Test Question 2,MULTIPLE_CHOICE,EASY,subject-1,What is 3+3?,,true,London,false
Test Question 3,MULTIPLE_CHOICE,EASY,subject-1,What is 4+4?,Paris,true,,false`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].errors[0]).toContain('At least one option must be marked as correct');
      expect(result.errors[1].errors[0]).toContain('All options must have text content');
      expect(result.errors[2].errors[0]).toContain('Multiple choice questions must have at least 2 options');
    });

    it('should validate true/false questions properly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer
Test Question,TRUE_FALSE,EASY,subject-1,Paris is the capital of France,maybe
Test Question 2,TRUE_FALSE,EASY,subject-1,London is the capital of France,
Test Question 3,TRUE_FALSE,EASY,subject-1,,true`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].errors[0]).toContain('Invalid correctAnswer: maybe');
      expect(result.errors[1].errors[0]).toContain('Missing required field \'correctAnswer\'');
      expect(result.errors[2].errors[0]).toContain('Missing required field \'text\'');
    });

    it('should validate numeric questions properly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer,tolerance
Test Question,NUMERIC,EASY,subject-1,What is 2+2?,not_a_number,1
Test Question 2,NUMERIC,EASY,subject-1,What is 3+3?,6,not_a_number
Test Question 3,NUMERIC,EASY,subject-1,What is 4+4?,,1
Test Question 4,NUMERIC,EASY,subject-1,,8,1`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(4);
      expect(result.errors[0].errors[0]).toContain('Invalid correctAnswer: not_a_number');
      expect(result.errors[1].errors[0]).toContain('Invalid tolerance: not_a_number');
      expect(result.errors[2].errors[0]).toContain('Missing required field \'correctAnswer\'');
      expect(result.errors[3].errors[0]).toContain('Missing required field \'text\'');
    });
  });

  describe('Success Cases', () => {
    it('should successfully parse valid multiple choice questions', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,option1,option1Correct,option1Feedback,option2,option2Correct,option2Feedback
Test Question,MULTIPLE_CHOICE,EASY,subject-1,What is 2+2?,4,true,Correct!,5,false,Try again`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(1);
      expect(result.successfulRows).toBe(1);
      expect(result.totalRows).toBe(1);
    });

    it('should successfully parse valid true/false questions', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer,explanation
Test Question,TRUE_FALSE,EASY,subject-1,Paris is the capital of France,true,Paris is indeed the capital`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(1);
      expect(result.successfulRows).toBe(1);
    });

    it('should successfully parse valid numeric questions', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer,tolerance
Test Question,NUMERIC,EASY,subject-1,What is 2+2?,4,0.1`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(1);
      expect(result.successfulRows).toBe(1);
    });
  });
});
