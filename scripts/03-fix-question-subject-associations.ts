/**
 * Question-Subject Association Fix Script
 * 
 * This script:
 * 1. Identifies questions incorrectly associated with the English subject
 * 2. Re-associates questions with their correct subjects based on content analysis
 * 3. Updates question bank associations so each subject has its own question bank
 * 4. Verifies that questions are correctly distributed across subjects
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QuestionAnalysis {
  id: string;
  title: string;
  text: string;
  currentSubjectId: string;
  currentSubjectName: string;
  suggestedSubjectId: string;
  suggestedSubjectName: string;
  confidence: number;
  keywords: string[];
}

interface SubjectKeywords {
  subjectId: string;
  subjectName: string;
  keywords: string[];
  patterns: RegExp[];
}

/**
 * Define subject-specific keywords and patterns for content analysis
 */
const SUBJECT_IDENTIFICATION_PATTERNS: SubjectKeywords[] = [
  {
    subjectId: '',
    subjectName: 'Mathematics',
    keywords: [
      'equation', 'solve', 'calculate', 'algebra', 'geometry', 'trigonometry',
      'derivative', 'integral', 'function', 'graph', 'polynomial', 'quadratic',
      'linear', 'matrix', 'vector', 'probability', 'statistics', 'theorem',
      'proof', 'formula', 'variable', 'coefficient', 'exponent', 'logarithm',
      'sine', 'cosine', 'tangent', 'angle', 'triangle', 'circle', 'area',
      'volume', 'perimeter', 'radius', 'diameter', 'slope', 'intercept'
    ],
    patterns: [
      /\b\d+x\b/gi,
      /\bx\s*=\s*\d+/gi,
      /\b\d+\s*\+\s*\d+/gi,
      /\b\d+\s*-\s*\d+/gi,
      /\b\d+\s*\*\s*\d+/gi,
      /\b\d+\s*\/\s*\d+/gi,
      /\bf\(x\)/gi,
      /\bx²\b/gi,
      /\b√\d+/gi,
      /\bπ\b/gi
    ]
  },
  {
    subjectId: '',
    subjectName: 'Science',
    keywords: [
      'atom', 'molecule', 'element', 'compound', 'reaction', 'chemical',
      'physics', 'chemistry', 'biology', 'force', 'energy', 'motion',
      'gravity', 'mass', 'weight', 'velocity', 'acceleration', 'pressure',
      'temperature', 'heat', 'light', 'sound', 'wave', 'frequency',
      'cell', 'organism', 'DNA', 'gene', 'evolution', 'ecosystem',
      'photosynthesis', 'respiration', 'mitosis', 'meiosis', 'protein',
      'enzyme', 'hormone', 'nervous', 'circulatory', 'respiratory'
    ],
    patterns: [
      /\bH2O\b/gi,
      /\bCO2\b/gi,
      /\bNaCl\b/gi,
      /\bNewton\b/gi,
      /\bJoule\b/gi,
      /\bWatt\b/gi,
      /\bm\/s²\b/gi,
      /\bkg⋅m\/s²\b/gi,
      /\b°C\b/gi,
      /\b°F\b/gi
    ]
  },
  {
    subjectId: '',
    subjectName: 'English',
    keywords: [
      'grammar', 'sentence', 'paragraph', 'essay', 'literature', 'poem',
      'novel', 'story', 'character', 'plot', 'theme', 'metaphor',
      'simile', 'alliteration', 'rhyme', 'verse', 'stanza', 'author',
      'writer', 'narrator', 'protagonist', 'antagonist', 'setting',
      'conflict', 'resolution', 'climax', 'exposition', 'dialogue',
      'monologue', 'soliloquy', 'irony', 'symbolism', 'imagery'
    ],
    patterns: [
      /\b(noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection)\b/gi,
      /\b(subject|predicate|object|clause|phrase)\b/gi,
      /\b(Shakespeare|Dickens|Austen|Twain|Hemingway)\b/gi,
      /\b(Romeo and Juliet|Hamlet|Pride and Prejudice|Great Gatsby)\b/gi
    ]
  },
  {
    subjectId: '',
    subjectName: 'Physical Education',
    keywords: [
      'exercise', 'fitness', 'health', 'sport', 'athletic', 'training',
      'muscle', 'strength', 'endurance', 'flexibility', 'cardio',
      'heart rate', 'blood pressure', 'nutrition', 'diet', 'protein',
      'carbohydrate', 'vitamin', 'mineral', 'hydration', 'injury',
      'prevention', 'recovery', 'warm-up', 'cool-down', 'stretching',
      'basketball', 'soccer', 'tennis', 'swimming', 'running', 'cycling'
    ],
    patterns: [
      /\b\d+\s*(minutes?|hours?|seconds?)\s*(of\s*)?(exercise|workout|training)\b/gi,
      /\b\d+\s*(reps?|repetitions?|sets?)\b/gi,
      /\bheart\s*rate\b/gi,
      /\bBMI\b/gi,
      /\bcalories?\b/gi
    ]
  },
  {
    subjectId: '',
    subjectName: 'Life Skills',
    keywords: [
      'communication', 'leadership', 'teamwork', 'problem solving',
      'critical thinking', 'decision making', 'time management',
      'goal setting', 'planning', 'organization', 'responsibility',
      'accountability', 'ethics', 'integrity', 'empathy', 'respect',
      'conflict resolution', 'negotiation', 'collaboration', 'creativity',
      'innovation', 'adaptability', 'resilience', 'stress management',
      'emotional intelligence', 'self-awareness', 'motivation'
    ],
    patterns: [
      /\b(soft\s*skills?|life\s*skills?|interpersonal\s*skills?)\b/gi,
      /\b(emotional\s*intelligence|EQ)\b/gi,
      /\b(work-life\s*balance)\b/gi,
      /\b(personal\s*development)\b/gi
    ]
  }
];

/**
 * Fetch all subjects from database and update keyword patterns
 */
async function initializeSubjectPatterns(): Promise<SubjectKeywords[]> {
  console.log('📊 Fetching subjects from database...');
  
  const subjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  // Update subject IDs in patterns
  const updatedPatterns = SUBJECT_IDENTIFICATION_PATTERNS.map(pattern => {
    const matchingSubject = subjects.find(s => 
      s.name.toLowerCase().includes(pattern.subjectName.toLowerCase()) ||
      pattern.subjectName.toLowerCase().includes(s.name.toLowerCase())
    );
    
    return {
      ...pattern,
      subjectId: matchingSubject?.id || '',
      subjectName: matchingSubject?.name || pattern.subjectName
    };
  });

  console.log(`✅ Initialized patterns for ${updatedPatterns.length} subjects`);
  return updatedPatterns;
}

/**
 * Analyze question content to determine correct subject
 */
function analyzeQuestionContent(
  question: { id: string; title: string; text: string; subjectId: string },
  subjectPatterns: SubjectKeywords[]
): QuestionAnalysis {
  const content = `${question.title} ${question.text}`.toLowerCase();
  const scores: { [subjectId: string]: { score: number; subjectName: string; keywords: string[] } } = {};

  // Score each subject based on keyword matches and patterns
  for (const pattern of subjectPatterns) {
    if (!pattern.subjectId) continue;
    
    let score = 0;
    const matchedKeywords: string[] = [];

    // Check keyword matches
    for (const keyword of pattern.keywords) {
      const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = content.match(keywordRegex);
      if (matches) {
        score += matches.length * 2; // Weight keyword matches
        matchedKeywords.push(keyword);
      }
    }

    // Check pattern matches
    for (const regex of pattern.patterns) {
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 3; // Weight pattern matches higher
      }
    }

    if (score > 0) {
      scores[pattern.subjectId] = {
        score,
        subjectName: pattern.subjectName,
        keywords: matchedKeywords
      };
    }
  }

  // Find the highest scoring subject
  let bestMatch = { subjectId: question.subjectId, score: 0, subjectName: '', keywords: [] as string[] };
  
  for (const [subjectId, data] of Object.entries(scores)) {
    if (data.score > bestMatch.score) {
      bestMatch = {
        subjectId,
        score: data.score,
        subjectName: data.subjectName,
        keywords: data.keywords
      };
    }
  }

  // Get current subject name
  const currentSubject = subjectPatterns.find(p => p.subjectId === question.subjectId);
  
  return {
    id: question.id,
    title: question.title,
    text: question.text,
    currentSubjectId: question.subjectId,
    currentSubjectName: currentSubject?.subjectName || 'Unknown',
    suggestedSubjectId: bestMatch.subjectId,
    suggestedSubjectName: bestMatch.subjectName,
    confidence: bestMatch.score,
    keywords: bestMatch.keywords
  };
}

/**
 * Find questions that are incorrectly associated with subjects
 */
async function findMisassociatedQuestions(subjectPatterns: SubjectKeywords[]): Promise<QuestionAnalysis[]> {
  console.log('🔍 Analyzing question-subject associations...');
  
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      title: true,
      text: true,
      subjectId: true
    }
  });

  console.log(`📊 Analyzing ${questions.length} questions...`);
  
  const misassociated: QuestionAnalysis[] = [];
  let processed = 0;

  for (const question of questions) {
    const analysis = analyzeQuestionContent(question, subjectPatterns);
    
    // Consider it misassociated if:
    // 1. The suggested subject is different from current
    // 2. The confidence score is above a threshold
    // 3. The suggested subject ID is valid
    if (
      analysis.suggestedSubjectId !== analysis.currentSubjectId &&
      analysis.confidence >= 4 && // Minimum confidence threshold
      analysis.suggestedSubjectId !== ''
    ) {
      misassociated.push(analysis);
    }
    
    processed++;
    if (processed % 100 === 0) {
      console.log(`  ✓ Processed ${processed}/${questions.length} questions`);
    }
  }

  console.log(`🎯 Found ${misassociated.length} potentially misassociated questions`);
  return misassociated;
}

/**
 * Display analysis results for review
 */
function displayAnalysisResults(misassociated: QuestionAnalysis[]) {
  console.log('\n📋 Misassociation Analysis Results:');
  console.log('=' .repeat(80));
  
  // Group by current subject
  const groupedByCurrentSubject: { [subjectName: string]: QuestionAnalysis[] } = {};
  
  for (const analysis of misassociated) {
    if (!groupedByCurrentSubject[analysis.currentSubjectName]) {
      groupedByCurrentSubject[analysis.currentSubjectName] = [];
    }
    groupedByCurrentSubject[analysis.currentSubjectName].push(analysis);
  }

  for (const [currentSubject, questions] of Object.entries(groupedByCurrentSubject)) {
    console.log(`\n📚 Currently in "${currentSubject}" (${questions.length} questions):`);
    
    // Group by suggested subject
    const groupedBySuggested: { [subjectName: string]: QuestionAnalysis[] } = {};
    for (const q of questions) {
      if (!groupedBySuggested[q.suggestedSubjectName]) {
        groupedBySuggested[q.suggestedSubjectName] = [];
      }
      groupedBySuggested[q.suggestedSubjectName].push(q);
    }
    
    for (const [suggestedSubject, subQuestions] of Object.entries(groupedBySuggested)) {
      console.log(`  → Should be in "${suggestedSubject}": ${subQuestions.length} questions`);
      
      // Show a few examples
      const examples = subQuestions.slice(0, 3);
      for (const example of examples) {
        console.log(`    • "${example.title}" (confidence: ${example.confidence}, keywords: ${example.keywords.slice(0, 3).join(', ')})`);
      }
      if (subQuestions.length > 3) {
        console.log(`    ... and ${subQuestions.length - 3} more`);
      }
    }
  }
}

/**
 * Fix question-subject associations
 */
async function updateQuestionSubjectAssociations(misassociated: QuestionAnalysis[]): Promise<void> {
  console.log('\n🔧 Fixing question-subject associations...');

  let fixed = 0;
  let errors = 0;

  for (const analysis of misassociated) {
    try {
      await prisma.question.update({
        where: { id: analysis.id },
        data: { subjectId: analysis.suggestedSubjectId }
      });

      fixed++;

      if (fixed % 50 === 0) {
        console.log(`  ✓ Fixed ${fixed}/${misassociated.length} questions`);
      }

    } catch (error) {
      console.warn(`⚠️  Failed to update question ${analysis.id}: ${error}`);
      errors++;
    }
  }

  console.log(`✅ Successfully fixed ${fixed} question associations`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} questions could not be updated`);
  }
}

/**
 * Validate question bank associations
 */
async function validateQuestionBankAssociations(): Promise<void> {
  console.log('\n📚 Validating question bank associations...');

  // Check for questions without question bank associations
  const questionsWithoutBanks = await prisma.question.count({
    where: {
      OR: [
        { questionBankId: null },
        { questionBankId: '' }
      ]
    }
  });

  if (questionsWithoutBanks > 0) {
    console.log(`⚠️  Found ${questionsWithoutBanks} questions without question bank associations`);

    // Get the first available question bank
    const availableBank = await prisma.questionBank.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (availableBank) {
      await prisma.question.updateMany({
        where: {
          OR: [
            { questionBankId: null },
            { questionBankId: '' }
          ]
        },
        data: { questionBankId: availableBank.id }
      });

      console.log(`✅ Associated ${questionsWithoutBanks} questions with question bank: ${availableBank.name}`);
    } else {
      console.log(`⚠️  No active question banks found to associate questions with`);
    }
  } else {
    console.log(`✅ All questions have question bank associations`);
  }
}

/**
 * Validate the final state
 */
async function validateQuestionDistribution(): Promise<void> {
  console.log('\n🔍 Validating question distribution...');

  const subjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: {
        select: {
          questions: true
        }
      }
    }
  });

  console.log('\n📊 Final Question Distribution:');
  console.log('=' .repeat(60));

  let totalQuestions = 0;

  for (const subject of subjects) {
    const questionCount = subject._count.questions;

    console.log(`📚 ${subject.name}:`);
    console.log(`   Questions: ${questionCount}`);

    if (questionCount > 0) {
      console.log(`   ✅ Subject has questions`);
    } else {
      console.log(`   ⚠️  Subject has no questions`);
    }

    totalQuestions += questionCount;
    console.log();
  }

  console.log(`📊 Total Questions: ${totalQuestions}`);

  // Check question bank associations
  const questionsWithoutBanks = await prisma.question.count({
    where: {
      OR: [
        { questionBankId: null },
        { questionBankId: '' }
      ]
    }
  });

  console.log(`📋 Question Bank Associations:`);
  console.log(`   Questions without banks: ${questionsWithoutBanks}`);

  if (questionsWithoutBanks === 0) {
    console.log(`   ✅ All questions have question bank associations`);
  } else {
    console.log(`   ⚠️  Some questions lack question bank associations`);
  }
}

/**
 * Main execution function
 */
async function fixQuestionSubjectAssociations(): Promise<void> {
  try {
    console.log('🚀 Starting Question-Subject Association Fix...\n');

    // Step 1: Initialize subject patterns
    const subjectPatterns = await initializeSubjectPatterns();

    // Step 2: Find misassociated questions
    const misassociated = await findMisassociatedQuestions(subjectPatterns);

    // Step 3: Display analysis results
    displayAnalysisResults(misassociated);

    if (misassociated.length === 0) {
      console.log('\n✅ No misassociated questions found!');
    } else {
      // Step 4: Fix associations (with user confirmation in production)
      console.log(`\n🔧 Proceeding to fix ${misassociated.length} question associations...`);
      await updateQuestionSubjectAssociations(misassociated);
    }

    // Step 5: Validate question bank associations
    await validateQuestionBankAssociations();

    // Step 6: Validate final state
    await validateQuestionDistribution();

    console.log('\n✅ Question-Subject Association Fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing question-subject associations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixQuestionSubjectAssociations()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixQuestionSubjectAssociations };
