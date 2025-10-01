/**
 * CAT Termination Logic Tests
 * Tests to verify CAT doesn't terminate prematurely after wrong answers
 */

import { CATIRTService } from '../cat-irt.service';
import { QuestionBankService } from '../question-bank.service';
import { CATSettings, DifficultyLevel } from '../../types';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  question: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  activity: {
    findUnique: jest.fn(),
  },
  activityGrade: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock QuestionBankService
const mockQuestionBankService = {
  getQuestion: jest.fn(),
} as unknown as QuestionBankService;

describe('CAT Termination Logic', () => {
  let catService: CATIRTService;
  let defaultSettings: CATSettings;

  beforeEach(() => {
    catService = new CATIRTService(mockPrisma, mockQuestionBankService);
    
    defaultSettings = {
      enabled: true,
      algorithm: 'irt_2pl',
      startingDifficulty: 0,
      terminationCriteria: {
        minQuestions: 5,
        maxQuestions: 20,
        standardErrorThreshold: 0.3
      },
      itemSelectionMethod: 'maximum_information',
      questionTypes: ['MULTIPLE_CHOICE'],
      difficultyRange: { min: -3, max: 3 }
    };

    // Mock activity lookup
    (mockPrisma.activity.findUnique as jest.Mock).mockResolvedValue({
      subjectId: 'test-subject'
    });

    // Mock no historical performance
    (mockPrisma.activityGrade.findMany as jest.Mock).mockResolvedValue([]);

    // Mock question metadata
    (mockPrisma.question.findUnique as jest.Mock).mockResolvedValue({
      metadata: null,
      difficulty: DifficultyLevel.MEDIUM
    });

    (mockPrisma.question.update as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not terminate after first wrong answer', async () => {
    // Initialize CAT session
    const session = await catService.initializeCATSession(
      'test-activity',
      'test-student',
      defaultSettings
    );

    expect(session.currentAbility.standardError).toBe(1.0); // Initial high uncertainty

    // Process first wrong answer
    const updatedAbility = await catService.updateAbilityEstimate(
      session,
      'question-1',
      false, // Wrong answer
      5000,
      defaultSettings
    );

    // Check termination after first question
    const shouldTerminate = catService.shouldTerminate(session, defaultSettings);

    expect(shouldTerminate).toBe(false);
    expect(session.responses.length).toBe(1);
    expect(session.questionsAsked.length).toBe(1);
    
    console.log('After first wrong answer:');
    console.log('- Standard Error:', updatedAbility.standardError);
    console.log('- Should Terminate:', shouldTerminate);
    console.log('- Questions Answered:', session.responses.length);
  });

  test('should require minimum questions regardless of standard error', async () => {
    const session = await catService.initializeCATSession(
      'test-activity',
      'test-student',
      defaultSettings
    );

    // Process multiple questions to potentially reach low standard error
    for (let i = 1; i <= 3; i++) {
      await catService.updateAbilityEstimate(
        session,
        `question-${i}`,
        i % 2 === 0, // Alternate correct/incorrect
        5000,
        defaultSettings
      );

      const shouldTerminate = catService.shouldTerminate(session, defaultSettings);
      
      if (i < defaultSettings.terminationCriteria.minQuestions) {
        expect(shouldTerminate).toBe(false);
        console.log(`After question ${i}: Should not terminate (${session.responses.length}/${defaultSettings.terminationCriteria.minQuestions} min questions)`);
      }
    }
  });

  test('should handle consecutive wrong answers without early termination', async () => {
    const session = await catService.initializeCATSession(
      'test-activity',
      'test-student',
      defaultSettings
    );

    // Process 4 consecutive wrong answers
    for (let i = 1; i <= 4; i++) {
      await catService.updateAbilityEstimate(
        session,
        `question-${i}`,
        false, // All wrong
        5000,
        defaultSettings
      );

      const shouldTerminate = catService.shouldTerminate(session, defaultSettings);
      
      // Should not terminate before minimum questions
      expect(shouldTerminate).toBe(false);
      console.log(`After ${i} wrong answers: Standard Error = ${session.currentAbility.standardError}, Terminate = ${shouldTerminate}`);
    }

    expect(session.responses.length).toBe(4);
    expect(session.responses.every(r => !r.isCorrect)).toBe(true);
  });

  test('should respect minimum questions even with very low standard error', async () => {
    // Use more aggressive settings that might cause early termination
    const aggressiveSettings: CATSettings = {
      ...defaultSettings,
      terminationCriteria: {
        minQuestions: 5,
        maxQuestions: 20,
        standardErrorThreshold: 0.1 // Very low threshold
      }
    };

    const session = await catService.initializeCATSession(
      'test-activity',
      'test-student',
      aggressiveSettings
    );

    // Process questions until minimum is reached
    for (let i = 1; i <= aggressiveSettings.terminationCriteria.minQuestions; i++) {
      await catService.updateAbilityEstimate(
        session,
        `question-${i}`,
        i === 1, // First correct, rest wrong
        5000,
        aggressiveSettings
      );

      const shouldTerminate = catService.shouldTerminate(session, aggressiveSettings);
      
      if (i < aggressiveSettings.terminationCriteria.minQuestions) {
        expect(shouldTerminate).toBe(false);
      }
    }

    console.log(`Final state after ${session.responses.length} questions:`);
    console.log('- Standard Error:', session.currentAbility.standardError);
    console.log('- Ability Estimate:', session.currentAbility.theta);
  });

  test('should terminate only when appropriate conditions are met', async () => {
    const session = await catService.initializeCATSession(
      'test-activity',
      'test-student',
      defaultSettings
    );

    // Process minimum questions
    for (let i = 1; i <= defaultSettings.terminationCriteria.minQuestions; i++) {
      await catService.updateAbilityEstimate(
        session,
        `question-${i}`,
        Math.random() > 0.5, // Random answers
        5000,
        defaultSettings
      );
    }

    // Now check if termination logic works correctly
    const shouldTerminate = catService.shouldTerminate(session, defaultSettings);
    
    console.log('After minimum questions:');
    console.log('- Questions Answered:', session.responses.length);
    console.log('- Standard Error:', session.currentAbility.standardError);
    console.log('- Threshold:', defaultSettings.terminationCriteria.standardErrorThreshold);
    console.log('- Should Terminate:', shouldTerminate);

    // Should only terminate if standard error is below threshold
    if (session.currentAbility.standardError <= defaultSettings.terminationCriteria.standardErrorThreshold) {
      expect(shouldTerminate).toBe(true);
    } else {
      expect(shouldTerminate).toBe(false);
    }
  });
});
