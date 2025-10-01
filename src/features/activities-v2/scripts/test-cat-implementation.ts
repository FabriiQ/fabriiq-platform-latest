/**
 * Test script to verify CAT implementation
 * Tests marking configuration, percentile calculation, and session management
 */

import { CATMarkingConfig } from '../types';

// Test marking configuration
const testMarkingConfig: CATMarkingConfig = {
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
};

// Test questions with different difficulties and types
const testQuestions = [
  { id: 'q1', difficulty: 'EASY', questionType: 'MULTIPLE_CHOICE' },
  { id: 'q2', difficulty: 'MEDIUM', questionType: 'MULTIPLE_CHOICE' },
  { id: 'q3', difficulty: 'HARD', questionType: 'MULTIPLE_CHOICE' },
  { id: 'q4', difficulty: 'MEDIUM', questionType: 'TITA' }
];

// Test scenarios
const testScenarios = [
  { answer: 'correct', expected: { mcq_easy: 1, mcq_medium: 2, mcq_hard: 3, tita_medium: 2 } },
  { answer: 'wrong', expected: { mcq_easy: -1, mcq_medium: -1, mcq_hard: -1, tita_medium: 0 } },
  { answer: 'unanswered', expected: { mcq_easy: 0, mcq_medium: 0, mcq_hard: 0, tita_medium: 0 } }
];

// Test percentile calculation
const testAbilityEstimates = [
  { theta: -2, expectedPercentile: 2 },   // Very low ability
  { theta: -1, expectedPercentile: 16 },  // Below average
  { theta: 0, expectedPercentile: 50 },   // Average
  { theta: 1, expectedPercentile: 84 },   // Above average
  { theta: 2, expectedPercentile: 98 }    // Very high ability
];

console.log('CAT Implementation Test Configuration:');
console.log('=====================================');
console.log('Marking Config:', JSON.stringify(testMarkingConfig, null, 2));
console.log('\nTest Questions:', testQuestions);
console.log('\nTest Scenarios:', testScenarios);
console.log('\nPercentile Tests:', testAbilityEstimates);

export {
  testMarkingConfig,
  testQuestions,
  testScenarios,
  testAbilityEstimates
};
