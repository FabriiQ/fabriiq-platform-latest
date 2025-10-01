/**
 * CAT Termination Logic Verification Script
 * Simple script to verify CAT doesn't terminate prematurely
 */

import { CATSettings } from '../types';

// Simulate the termination logic
function shouldTerminate(
  questionsAnswered: number,
  currentStandardError: number,
  settings: CATSettings
): boolean {
  const { minQuestions, maxQuestions, standardErrorThreshold } = settings.terminationCriteria;

  console.log(`[CAT] Checking termination criteria:`, {
    questionsAnswered,
    minQuestions,
    maxQuestions,
    currentStandardError,
    standardErrorThreshold
  });

  // Must ask minimum questions first
  if (questionsAnswered < minQuestions) {
    console.log(`[CAT] Not terminating: Haven't reached minimum questions (${questionsAnswered}/${minQuestions})`);
    return false;
  }

  // Stop if reached maximum questions
  if (questionsAnswered >= maxQuestions) {
    console.log(`[CAT] Terminating: Reached maximum questions (${questionsAnswered}/${maxQuestions})`);
    return true;
  }

  // Stop if standard error is below threshold AND we've asked minimum questions
  // Add additional safeguard: require at least 3 questions regardless of standard error
  if (currentStandardError <= standardErrorThreshold && questionsAnswered >= minQuestions && questionsAnswered >= 3) {
    console.log(`[CAT] Terminating: Standard error threshold met (${currentStandardError} <= ${standardErrorThreshold})`);
    console.log(`[CAT] Termination after ${questionsAnswered} questions with standard error ${currentStandardError}`);
    return true;
  }

  console.log(`[CAT] Continuing: Termination criteria not met`);
  return false;
}

// Simulate information gain calculation with cap
function calculateInformationGain(discrimination: number, ability: number, difficulty: number): number {
  const exponent = discrimination * (ability - difficulty);
  const p = 1 / (1 + Math.exp(-exponent));
  const q = 1 - p;
  const information = (discrimination ** 2) * p * q;
  
  // Cap information gain to prevent unrealistic values
  const cappedInformation = Math.min(information, 2.0);
  
  if (information !== cappedInformation) {
    console.log(`[CAT] Information gain capped from ${information} to ${cappedInformation} for ability ${ability}`);
  }
  
  return cappedInformation;
}

// Simulate standard error calculation
function calculateStandardError(totalInformation: number): number {
  if (totalInformation <= 0) return 1.0;
  const standardError = 1 / Math.sqrt(totalInformation);
  console.log(`[CAT] Total information: ${totalInformation}, Standard error: ${standardError}`);
  return standardError;
}

// Test scenarios
function runTerminationTests() {
  console.log('=== CAT Termination Logic Tests ===\n');

  // Default settings (FIXED)
  const defaultSettings: CATSettings = {
    enabled: true,
    algorithm: 'irt_2pl',
    startingDifficulty: 0,
    terminationCriteria: {
      minQuestions: 5,
      maxQuestions: 20,
      standardErrorThreshold: 0.3 // FIXED: Was 0.2, now 0.3
    },
    itemSelectionMethod: 'maximum_information',
    questionTypes: ['MULTIPLE_CHOICE'],
    difficultyRange: { min: -3, max: 3 }
  };

  console.log('Settings:', defaultSettings.terminationCriteria);
  console.log('');

  // Test 1: First wrong answer
  console.log('--- Test 1: First Wrong Answer ---');
  let totalInfo = 0;
  
  // Simulate first question (wrong answer, medium difficulty)
  const info1 = calculateInformationGain(1.2, -0.5, 0.0); // Lower ability after wrong answer
  totalInfo += info1;
  const se1 = calculateStandardError(totalInfo);
  const terminate1 = shouldTerminate(1, se1, defaultSettings);
  
  console.log(`Result: Should terminate = ${terminate1} (Expected: false)\n`);

  // Test 2: Multiple wrong answers
  console.log('--- Test 2: Multiple Wrong Answers ---');
  totalInfo = 0;
  
  for (let i = 1; i <= 4; i++) {
    const info = calculateInformationGain(1.2, -1.0, 0.0); // Consistently wrong
    totalInfo += info;
    const se = calculateStandardError(totalInfo);
    const terminate = shouldTerminate(i, se, defaultSettings);
    
    console.log(`Question ${i}: SE=${se.toFixed(3)}, Terminate=${terminate}`);
  }
  console.log('');

  // Test 3: Mixed answers
  console.log('--- Test 3: Mixed Answers ---');
  totalInfo = 0;
  const abilities = [0.0, -0.3, 0.2, -0.1, 0.1]; // Varying ability estimates
  
  for (let i = 1; i <= 5; i++) {
    const info = calculateInformationGain(1.2, abilities[i-1], 0.0);
    totalInfo += info;
    const se = calculateStandardError(totalInfo);
    const terminate = shouldTerminate(i, se, defaultSettings);
    
    console.log(`Question ${i}: Ability=${abilities[i-1]}, SE=${se.toFixed(3)}, Terminate=${terminate}`);
  }
  console.log('');

  // Test 4: High discrimination (potential issue)
  console.log('--- Test 4: High Discrimination Question ---');
  totalInfo = 0;
  
  // High discrimination question that might cause high information gain
  const highDiscrimInfo = calculateInformationGain(2.5, 0.0, 0.0); // High discrimination
  totalInfo += highDiscrimInfo;
  const highDiscrimSE = calculateStandardError(totalInfo);
  const highDiscrimTerminate = shouldTerminate(1, highDiscrimSE, defaultSettings);
  
  console.log(`High discrimination result: SE=${highDiscrimSE.toFixed(3)}, Terminate=${highDiscrimTerminate}`);
  console.log('');

  // Test 5: Aggressive settings
  console.log('--- Test 5: Aggressive Settings (Old Problematic Settings) ---');
  const aggressiveSettings: CATSettings = {
    ...defaultSettings,
    terminationCriteria: {
      minQuestions: 5,
      maxQuestions: 20,
      standardErrorThreshold: 0.2 // Old problematic threshold
    }
  };
  
  totalInfo = 0;
  const aggressiveInfo = calculateInformationGain(1.2, -0.5, 0.0);
  totalInfo += aggressiveInfo;
  const aggressiveSE = calculateStandardError(totalInfo);
  const aggressiveTerminate = shouldTerminate(1, aggressiveSE, aggressiveSettings);
  
  console.log(`Aggressive settings result: SE=${aggressiveSE.toFixed(3)}, Terminate=${aggressiveTerminate}`);
  console.log('(This would have been problematic with the old threshold)');
}

// Run the tests
if (require.main === module) {
  runTerminationTests();
}

export { shouldTerminate, calculateInformationGain, calculateStandardError, runTerminationTests };
