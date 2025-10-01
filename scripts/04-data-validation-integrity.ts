/**
 * Data Validation & Integrity Check Script
 * 
 * This script:
 * 1. Validates all relationships are properly established
 * 2. Verifies each question has complete metadata
 * 3. Confirms question banks are correctly associated with subjects
 * 4. Checks data integrity across the entire system
 */

import { PrismaClient } from '@prisma/client';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';

const prisma = new PrismaClient();

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  count?: number;
  details?: string[];
}

interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
}

/**
 * Validate subject data integrity
 */
async function validateSubjects(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Test 1: Check for active subjects
  const activeSubjects = await prisma.subject.count({ where: { status: 'ACTIVE' } });
  results.push({
    category: 'Subjects',
    test: 'Active subjects exist',
    status: activeSubjects > 0 ? 'PASS' : 'FAIL',
    message: `Found ${activeSubjects} active subjects`,
    count: activeSubjects
  });
  
  // Test 2: Check for subjects without topics
  const subjectsWithoutTopics = await prisma.subject.findMany({
    where: {
      status: 'ACTIVE',
      topics: { none: {} }
    },
    select: { name: true, code: true }
  });
  
  results.push({
    category: 'Subjects',
    test: 'Subjects have topics',
    status: subjectsWithoutTopics.length === 0 ? 'PASS' : 'WARNING',
    message: `${subjectsWithoutTopics.length} subjects without topics`,
    count: subjectsWithoutTopics.length,
    details: subjectsWithoutTopics.map(s => `${s.name} (${s.code})`)
  });
  
  // Test 3: Check for subjects without learning outcomes
  const subjectsWithoutOutcomes = await prisma.subject.findMany({
    where: {
      status: 'ACTIVE',
      learningOutcomes: { none: {} }
    },
    select: { name: true, code: true }
  });
  
  results.push({
    category: 'Subjects',
    test: 'Subjects have learning outcomes',
    status: subjectsWithoutOutcomes.length === 0 ? 'PASS' : 'FAIL',
    message: `${subjectsWithoutOutcomes.length} subjects without learning outcomes`,
    count: subjectsWithoutOutcomes.length,
    details: subjectsWithoutOutcomes.map(s => `${s.name} (${s.code})`)
  });
  
  // Test 4: Check for subjects without questions
  const subjectsWithoutQuestions = await prisma.subject.findMany({
    where: {
      status: 'ACTIVE',
      questions: { none: {} }
    },
    select: { name: true, code: true }
  });

  results.push({
    category: 'Subjects',
    test: 'Subjects have questions',
    status: subjectsWithoutQuestions.length === 0 ? 'PASS' : 'WARNING',
    message: `${subjectsWithoutQuestions.length} subjects without questions`,
    count: subjectsWithoutQuestions.length,
    details: subjectsWithoutQuestions.map(s => `${s.name} (${s.code})`)
  });
  
  return results;
}

/**
 * Validate topic data integrity
 */
async function validateTopics(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Test 1: Check for active topics
  const activeTopics = await prisma.subjectTopic.count({ where: { status: 'ACTIVE' } });
  results.push({
    category: 'Topics',
    test: 'Active topics exist',
    status: activeTopics > 0 ? 'PASS' : 'WARNING',
    message: `Found ${activeTopics} active topics`,
    count: activeTopics
  });
  
  // Test 2: Check for topics with missing subject IDs
  const topicsWithoutSubjects = await prisma.subjectTopic.count({
    where: {
      status: 'ACTIVE',
      OR: [
        { subjectId: null },
        { subjectId: '' }
      ]
    }
  });

  results.push({
    category: 'Topics',
    test: 'Topics have valid subject references',
    status: topicsWithoutSubjects === 0 ? 'PASS' : 'FAIL',
    message: `${topicsWithoutSubjects} topics without valid subject references`,
    count: topicsWithoutSubjects
  });
  
  // Test 3: Check for topics without keywords
  const topicsWithoutKeywords = await prisma.subjectTopic.count({
    where: {
      status: 'ACTIVE',
      OR: [
        { keywords: { equals: [] } },
        { keywords: null }
      ]
    }
  });
  
  results.push({
    category: 'Topics',
    test: 'Topics have keywords',
    status: topicsWithoutKeywords === 0 ? 'PASS' : 'WARNING',
    message: `${topicsWithoutKeywords} topics without keywords`,
    count: topicsWithoutKeywords
  });
  
  return results;
}

/**
 * Validate learning outcomes data integrity
 */
async function validateLearningOutcomes(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Test 1: Check for learning outcomes
  const totalOutcomes = await prisma.learningOutcome.count();
  results.push({
    category: 'Learning Outcomes',
    test: 'Learning outcomes exist',
    status: totalOutcomes > 0 ? 'PASS' : 'FAIL',
    message: `Found ${totalOutcomes} learning outcomes`,
    count: totalOutcomes
  });
  
  // Test 2: Check Bloom's taxonomy distribution
  const bloomsDistribution = await prisma.learningOutcome.groupBy({
    by: ['bloomsLevel'],
    _count: { id: true }
  });
  
  const expectedBloomsLevels = Object.values(BloomsTaxonomyLevel);
  const missingLevels = expectedBloomsLevels.filter(level => 
    !bloomsDistribution.some(d => d.bloomsLevel === level)
  );
  
  results.push({
    category: 'Learning Outcomes',
    test: 'All Bloom\'s taxonomy levels represented',
    status: missingLevels.length === 0 ? 'PASS' : 'WARNING',
    message: `${missingLevels.length} Bloom's levels missing`,
    details: missingLevels
  });
  
  // Test 3: Check for outcomes with invalid subject references
  const outcomesWithInvalidSubjects = await prisma.learningOutcome.findMany({
    where: {
      subject: null
    },
    select: { id: true, statement: true, subjectId: true }
  });
  
  results.push({
    category: 'Learning Outcomes',
    test: 'Learning outcomes have valid subject references',
    status: outcomesWithInvalidSubjects.length === 0 ? 'PASS' : 'FAIL',
    message: `${outcomesWithInvalidSubjects.length} outcomes with invalid subject references`,
    count: outcomesWithInvalidSubjects.length,
    details: outcomesWithInvalidSubjects.map(o => `${o.statement.substring(0, 50)}... - Subject ID: ${o.subjectId}`)
  });
  
  // Test 4: Check for empty learning outcome statements
  const emptyOutcomes = await prisma.learningOutcome.count({
    where: {
      OR: [
        { statement: '' },
        { statement: null }
      ]
    }
  });
  
  results.push({
    category: 'Learning Outcomes',
    test: 'Learning outcomes have statements',
    status: emptyOutcomes === 0 ? 'PASS' : 'FAIL',
    message: `${emptyOutcomes} learning outcomes with empty statements`,
    count: emptyOutcomes
  });
  
  return results;
}

/**
 * Validate question data integrity
 */
async function validateQuestions(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Test 1: Check for questions
  const totalQuestions = await prisma.question.count();
  results.push({
    category: 'Questions',
    test: 'Questions exist',
    status: totalQuestions > 0 ? 'PASS' : 'WARNING',
    message: `Found ${totalQuestions} questions`,
    count: totalQuestions
  });
  
  if (totalQuestions === 0) {
    return results;
  }
  
  // Test 2: Check for questions without subjects
  const questionsWithoutSubjects = await prisma.question.count({
    where: {
      OR: [
        { subjectId: null },
        { subjectId: '' }
      ]
    }
  });
  
  results.push({
    category: 'Questions',
    test: 'Questions have subject associations',
    status: questionsWithoutSubjects === 0 ? 'PASS' : 'FAIL',
    message: `${questionsWithoutSubjects} questions without subject associations`,
    count: questionsWithoutSubjects
  });
  
  // Test 3: Check for questions without question banks
  const questionsWithoutQuestionBanks = await prisma.question.count({
    where: {
      OR: [
        { questionBankId: null },
        { questionBankId: '' }
      ]
    }
  });
  
  results.push({
    category: 'Questions',
    test: 'Questions have question bank associations',
    status: questionsWithoutQuestionBanks === 0 ? 'PASS' : 'WARNING',
    message: `${questionsWithoutQuestionBanks} questions without question bank associations`,
    count: questionsWithoutQuestionBanks
  });
  
  // Test 4: Check for questions with invalid subject references
  const questionsWithInvalidSubjects = await prisma.question.findMany({
    where: {
      subject: null,
      subjectId: { not: null }
    },
    select: { id: true, title: true, subjectId: true }
  });
  
  results.push({
    category: 'Questions',
    test: 'Questions have valid subject references',
    status: questionsWithInvalidSubjects.length === 0 ? 'PASS' : 'FAIL',
    message: `${questionsWithInvalidSubjects.length} questions with invalid subject references`,
    count: questionsWithInvalidSubjects.length,
    details: questionsWithInvalidSubjects.slice(0, 5).map(q => `${q.title} - Subject ID: ${q.subjectId}`)
  });
  
  // Test 5: Check for questions without titles or text
  const incompleteQuestions = await prisma.question.count({
    where: {
      OR: [
        { title: null },
        { title: '' },
        { text: null },
        { text: '' }
      ]
    }
  });
  
  results.push({
    category: 'Questions',
    test: 'Questions have complete content',
    status: incompleteQuestions === 0 ? 'PASS' : 'FAIL',
    message: `${incompleteQuestions} questions with incomplete content`,
    count: incompleteQuestions
  });
  
  return results;
}

/**
 * Validate question bank data integrity
 */
async function validateQuestionBanks(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  // Test 1: Check for question banks
  const totalQuestionBanks = await prisma.questionBank.count({ where: { status: 'ACTIVE' } });
  results.push({
    category: 'Question Banks',
    test: 'Question banks exist',
    status: totalQuestionBanks > 0 ? 'PASS' : 'WARNING',
    message: `Found ${totalQuestionBanks} active question banks`,
    count: totalQuestionBanks
  });
  
  if (totalQuestionBanks === 0) {
    return results;
  }
  
  // Test 2: Check for question banks without questions
  const questionBanksWithoutQuestions = await prisma.questionBank.count({
    where: {
      status: 'ACTIVE',
      questions: { none: {} }
    }
  });

  results.push({
    category: 'Question Banks',
    test: 'Question banks have questions',
    status: questionBanksWithoutQuestions === 0 ? 'PASS' : 'WARNING',
    message: `${questionBanksWithoutQuestions} question banks without questions`,
    count: questionBanksWithoutQuestions
  });

  // Test 3: Check for question banks with questions from multiple subjects
  const questionBanksWithMixedSubjects = await prisma.questionBank.findMany({
    where: {
      status: 'ACTIVE',
      questions: { some: {} }
    },
    include: {
      questions: {
        select: { subjectId: true },
        distinct: ['subjectId']
      }
    }
  });

  const mixedSubjectBanks = questionBanksWithMixedSubjects.filter(qb =>
    new Set(qb.questions.map(q => q.subjectId)).size > 1
  );

  results.push({
    category: 'Question Banks',
    test: 'Question banks have consistent subject associations',
    status: mixedSubjectBanks.length === 0 ? 'PASS' : 'WARNING',
    message: `${mixedSubjectBanks.length} question banks with questions from multiple subjects`,
    count: mixedSubjectBanks.length,
    details: mixedSubjectBanks.map(qb => `${qb.name} - Mixed subjects`)
  });
  
  return results;
}

/**
 * Validate cross-entity relationships
 */
async function validateRelationships(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test 1: Check question distribution across subjects
  const subjectQuestionCounts = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    include: {
      _count: {
        select: { questions: true }
      }
    },
    select: {
      name: true,
      code: true,
      _count: true
    }
  });

  const subjectsWithoutQuestions = subjectQuestionCounts.filter(s => s._count.questions === 0);

  results.push({
    category: 'Relationships',
    test: 'Question distribution across subjects',
    status: subjectsWithoutQuestions.length === 0 ? 'PASS' : 'WARNING',
    message: `${subjectsWithoutQuestions.length} subjects without questions`,
    count: subjectsWithoutQuestions.length,
    details: subjectsWithoutQuestions.map(s => `${s.name} (${s.code}): 0 questions`)
  });

  // Test 2: Check topic-subject consistency
  const topicSubjectMismatches = await prisma.question.findMany({
    where: {
      AND: [
        { topicId: { not: null } },
        { topicId: { not: '' } }
      ]
    },
    include: {
      topic: {
        select: {
          subjectId: true,
          title: true
        }
      }
    }
  });

  const inconsistentTopicSubjects = topicSubjectMismatches.filter(q =>
    q.topic && q.topic.subjectId !== q.subjectId
  );

  results.push({
    category: 'Relationships',
    test: 'Topic-subject consistency',
    status: inconsistentTopicSubjects.length === 0 ? 'PASS' : 'FAIL',
    message: `${inconsistentTopicSubjects.length} questions with inconsistent topic-subject relationships`,
    count: inconsistentTopicSubjects.length,
    details: inconsistentTopicSubjects.slice(0, 5).map(q =>
      `Question: ${q.title} - Topic: ${q.topic?.title} (Subject mismatch)`
    )
  });

  return results;
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport(): Promise<ValidationSummary> {
  console.log('🔍 Running comprehensive data validation...\n');

  const allResults: ValidationResult[] = [];

  // Run all validation tests
  console.log('📊 Validating subjects...');
  allResults.push(...await validateSubjects());

  console.log('📝 Validating topics...');
  allResults.push(...await validateTopics());

  console.log('🎯 Validating learning outcomes...');
  allResults.push(...await validateLearningOutcomes());

  console.log('❓ Validating questions...');
  allResults.push(...await validateQuestions());

  console.log('📚 Validating question banks...');
  allResults.push(...await validateQuestionBanks());

  console.log('🔗 Validating relationships...');
  allResults.push(...await validateRelationships());

  // Calculate summary
  const summary: ValidationSummary = {
    totalTests: allResults.length,
    passed: allResults.filter(r => r.status === 'PASS').length,
    failed: allResults.filter(r => r.status === 'FAIL').length,
    warnings: allResults.filter(r => r.status === 'WARNING').length,
    results: allResults
  };

  return summary;
}

/**
 * Display validation report
 */
function displayValidationReport(summary: ValidationSummary): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 DATA VALIDATION & INTEGRITY REPORT');
  console.log('='.repeat(80));

  // Summary
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Tests: ${summary.totalTests}`);
  console.log(`   ✅ Passed: ${summary.passed}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);

  const successRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
  console.log(`   Success Rate: ${successRate}%`);

  // Group results by category
  const categories = [...new Set(summary.results.map(r => r.category))];

  for (const category of categories) {
    const categoryResults = summary.results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length;
    const categoryFailed = categoryResults.filter(r => r.status === 'FAIL').length;
    const categoryWarnings = categoryResults.filter(r => r.status === 'WARNING').length;

    console.log(`\n📂 ${category.toUpperCase()}:`);
    console.log(`   Tests: ${categoryResults.length} | Passed: ${categoryPassed} | Failed: ${categoryFailed} | Warnings: ${categoryWarnings}`);

    for (const result of categoryResults) {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`   ${statusIcon} ${result.test}: ${result.message}`);

      if (result.details && result.details.length > 0) {
        const maxDetails = 3;
        const detailsToShow = result.details.slice(0, maxDetails);
        for (const detail of detailsToShow) {
          console.log(`      • ${detail}`);
        }
        if (result.details.length > maxDetails) {
          console.log(`      ... and ${result.details.length - maxDetails} more`);
        }
      }
    }
  }

  // Overall status
  console.log('\n' + '='.repeat(80));
  if (summary.failed === 0) {
    if (summary.warnings === 0) {
      console.log('🎉 ALL VALIDATIONS PASSED! Data integrity is excellent.');
    } else {
      console.log('✅ All critical validations passed. Some warnings need attention.');
    }
  } else {
    console.log('❌ CRITICAL ISSUES FOUND! Please address failed validations before proceeding.');
  }
  console.log('='.repeat(80));
}

/**
 * Main execution function
 */
async function validateDataIntegrity(): Promise<ValidationSummary> {
  try {
    console.log('🚀 Starting Data Validation & Integrity Check...\n');

    const summary = await generateValidationReport();
    displayValidationReport(summary);

    return summary;

  } catch (error) {
    console.error('❌ Error during data validation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  validateDataIntegrity()
    .then((summary) => {
      console.log('\n🏁 Validation completed!');
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    });
}

export { validateDataIntegrity, ValidationSummary };
