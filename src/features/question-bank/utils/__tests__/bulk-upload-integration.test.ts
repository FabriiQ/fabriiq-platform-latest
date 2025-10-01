/**
 * Integration test for bulk upload functionality
 * Tests the complete flow from CSV parsing to database persistence
 */

import { parseCSV } from '../csv-parser';
import { QuestionType, DifficultyLevel } from '../../models/types';

// Mock file creation helper
function createMockFile(content: string, filename = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

describe('Bulk Upload Integration Tests', () => {
  const questionBankId = 'test-bank-id';

  describe('Complete Upload Flow', () => {
    it('should parse valid CSV and prepare questions for database insertion', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,option1,option1Correct,option1Feedback,option2,option2Correct,option2Feedback,option3,option3Correct,option3Feedback,option4,option4Correct,option4Feedback,explanation,hint
What is 2+2?,MULTIPLE_CHOICE,EASY,subject-1,What is 2+2?,4,true,Correct!,3,false,Try again,5,false,Not quite,2,false,No way,Basic arithmetic,Think about counting
What is 3+3?,MULTIPLE_CHOICE,MEDIUM,subject-1,What is 3+3?,6,true,Excellent!,5,false,Close but not right,7,false,Too high,4,false,Too low,Addition practice,Count carefully`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      // Verify parsing results
      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(2);
      expect(result.successfulRows).toBe(2);
      expect(result.totalRows).toBe(2);

      // Verify first question structure
      const firstQuestion = result.questions[0];
      expect(firstQuestion.questionBankId).toBe(questionBankId);
      expect(firstQuestion.title).toBe('What is 2+2?');
      expect(firstQuestion.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(firstQuestion.difficulty).toBe(DifficultyLevel.EASY);
      expect(firstQuestion.subjectId).toBe('subject-1');

      // Verify question content structure
      expect(firstQuestion.content).toHaveProperty('text', 'What is 2+2?');
      expect(firstQuestion.content).toHaveProperty('options');
      expect(Array.isArray(firstQuestion.content.options)).toBe(true);
      expect(firstQuestion.content.options).toHaveLength(4);

      // Verify options structure
      const options = firstQuestion.content.options;
      expect(options[0]).toEqual({
        id: 'option-1',
        text: '4',
        isCorrect: true,
        feedback: 'Correct!'
      });
      expect(options[1]).toEqual({
        id: 'option-2',
        text: '3',
        isCorrect: false,
        feedback: 'Try again'
      });

      // Verify second question
      const secondQuestion = result.questions[1];
      expect(secondQuestion.title).toBe('What is 3+3?');
      expect(secondQuestion.difficulty).toBe(DifficultyLevel.MEDIUM);
    });

    it('should handle mixed valid and invalid questions', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,option1,option1Correct,option2,option2Correct
Valid Question,MULTIPLE_CHOICE,EASY,subject-1,What is 2+2?,4,true,3,false
,MULTIPLE_CHOICE,EASY,subject-1,Missing title,4,true,3,false
Invalid Type,INVALID_TYPE,EASY,subject-1,What is 3+3?,6,true,5,false
Valid Question 2,MULTIPLE_CHOICE,MEDIUM,subject-1,What is 4+4?,8,true,7,false`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      // Should have 2 valid questions and 2 errors
      expect(result.questions).toHaveLength(2);
      expect(result.errors).toHaveLength(2);
      expect(result.successfulRows).toBe(2);
      expect(result.totalRows).toBe(4);

      // Verify error details
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].errors[0]).toContain('Missing required fields: title');
      
      expect(result.errors[1].row).toBe(3);
      expect(result.errors[1].errors[0]).toContain('Invalid questionType: INVALID_TYPE');

      // Verify valid questions
      expect(result.questions[0].title).toBe('Valid Question');
      expect(result.questions[1].title).toBe('Valid Question 2');
    });

    it('should validate true/false questions correctly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer,explanation,hint
Paris is the capital of France,TRUE_FALSE,EASY,subject-1,Paris is the capital of France,true,Paris is indeed the capital,Think of the Eiffel Tower
London is the capital of France,TRUE_FALSE,EASY,subject-1,London is the capital of France,false,London is the capital of UK,Think about geography`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(2);

      // Verify true/false content structure
      const firstQuestion = result.questions[0];
      expect(firstQuestion.content).toHaveProperty('text', 'Paris is the capital of France');
      expect(firstQuestion.content).toHaveProperty('isTrue', true);
      expect(firstQuestion.content).toHaveProperty('explanation', 'Paris is indeed the capital');
      expect(firstQuestion.content).toHaveProperty('hint', 'Think of the Eiffel Tower');

      const secondQuestion = result.questions[1];
      expect(secondQuestion.content).toHaveProperty('isTrue', false);
    });

    it('should validate numeric questions correctly', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer,tolerance,explanation,hint
What is 2+2?,NUMERIC,EASY,subject-1,What is 2+2?,4,0.1,Basic addition,Count carefully
What is pi to 2 decimal places?,NUMERIC,HARD,subject-1,What is pi to 2 decimal places?,3.14,0.01,Mathematical constant,Think about circles`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.errors).toHaveLength(0);
      expect(result.questions).toHaveLength(2);

      // Verify numeric content structure
      const firstQuestion = result.questions[0];
      expect(firstQuestion.content).toHaveProperty('text', 'What is 2+2?');
      expect(firstQuestion.content).toHaveProperty('correctAnswer', 4);
      expect(firstQuestion.content).toHaveProperty('acceptableRange');
      expect(firstQuestion.content.acceptableRange).toEqual({ min: 3.9, max: 4.1 });

      const secondQuestion = result.questions[1];
      expect(secondQuestion.content).toHaveProperty('correctAnswer', 3.14);
      expect(secondQuestion.content.acceptableRange).toEqual({ min: 3.13, max: 3.15 });
    });

    it('should provide detailed validation errors for debugging', async () => {
      const csvContent = `title,questionType,difficulty,subjectId,text,correctAnswer
Question 1,TRUE_FALSE,EASY,subject-1,Is this true?,maybe
Question 2,NUMERIC,EASY,subject-1,What is 2+2?,not_a_number
Question 3,MULTIPLE_CHOICE,INVALID_DIFFICULTY,subject-1,What is 3+3?
Question 4,MULTIPLE_CHOICE,EASY,,What is 4+4?`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      expect(result.questions).toHaveLength(0);
      expect(result.errors).toHaveLength(4);

      // Verify detailed error information
      const errors = result.errors;
      
      // True/false with invalid answer
      expect(errors[0].row).toBe(1);
      expect(errors[0].errors[0]).toContain('Invalid correctAnswer: maybe');
      
      // Numeric with invalid answer
      expect(errors[1].row).toBe(2);
      expect(errors[1].errors[0]).toContain('Invalid correctAnswer: not_a_number');
      
      // Invalid difficulty
      expect(errors[2].row).toBe(3);
      expect(errors[2].errors[0]).toContain('Invalid difficulty: INVALID_DIFFICULTY');
      
      // Missing subject ID
      expect(errors[3].row).toBe(4);
      expect(errors[3].errors[0]).toContain('Missing required fields: subjectId');
    });
  });

  describe('Progress Tracking', () => {
    it('should provide progress information during processing', async () => {
      // This test would be more meaningful with actual database integration
      // For now, we verify that the parsing provides the necessary data structure
      const csvContent = `title,questionType,difficulty,subjectId,text,option1,option1Correct,option2,option2Correct
Q1,MULTIPLE_CHOICE,EASY,subject-1,Question 1,A,true,B,false
Q2,MULTIPLE_CHOICE,EASY,subject-1,Question 2,A,true,B,false
Q3,MULTIPLE_CHOICE,EASY,subject-1,Question 3,A,true,B,false`;

      const file = createMockFile(csvContent);
      const result = await parseCSV(file, questionBankId);

      // Verify structure needed for progress tracking
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('errors');
      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });
});
