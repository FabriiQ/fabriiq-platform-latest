/**
 * Master Data Preparation Workflow
 * 
 * This script orchestrates the complete data preparation process:
 * 1. Sets up learning outcomes and Bloom's taxonomy associations
 * 2. Fixes question-subject associations
 * 3. Validates data integrity
 * 4. Generates enhanced question datasets
 * 
 * Run this script to prepare a complete, properly structured dataset
 * before generating large-scale test files.
 */

import { PrismaClient } from '@prisma/client';
import { setupLearningOutcomesAndBlooms } from './01-setup-learning-outcomes-blooms';
import { fixQuestionSubjectAssociations } from './03-fix-question-subject-associations';
import { validateDataIntegrity, ValidationSummary } from './04-data-validation-integrity';

interface WorkflowStep {
  name: string;
  description: string;
  execute: () => Promise<any>;
  required: boolean;
  skipOnError: boolean;
}

interface WorkflowResult {
  step: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  duration: number;
  error?: string;
  result?: any;
}

interface WorkflowSummary {
  totalSteps: number;
  successful: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  results: WorkflowResult[];
  finalValidation?: ValidationSummary;
}

/**
 * Define the workflow steps
 */
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    name: 'Learning Outcomes Setup',
    description: 'Create learning outcomes and Bloom\'s taxonomy associations',
    execute: setupLearningOutcomesAndBlooms,
    required: true,
    skipOnError: false
  },
  {
    name: 'Question-Subject Association Fix',
    description: 'Fix incorrect question-subject associations and ensure proper question bank structure',
    execute: fixQuestionSubjectAssociations,
    required: true,
    skipOnError: false
  },
  {
    name: 'Data Validation & Integrity Check',
    description: 'Validate all relationships and data integrity',
    execute: validateDataIntegrity,
    required: true,
    skipOnError: true // Continue even if validation finds issues
  }
];

/**
 * Execute a single workflow step
 */
async function executeStep(step: WorkflowStep): Promise<WorkflowResult> {
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 EXECUTING: ${step.name}`);
  console.log(`📝 ${step.description}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const result = await step.execute();
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ COMPLETED: ${step.name} (${(duration / 1000).toFixed(2)}s)`);
    
    return {
      step: step.name,
      status: 'SUCCESS',
      duration,
      result
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`\n❌ FAILED: ${step.name} (${(duration / 1000).toFixed(2)}s)`);
    console.error(`   Error: ${errorMessage}`);
    
    if (!step.skipOnError) {
      throw error;
    }
    
    return {
      step: step.name,
      status: 'FAILED',
      duration,
      error: errorMessage
    };
  }
}

/**
 * Display workflow progress
 */
function displayProgress(currentStep: number, totalSteps: number, stepName: string): void {
  const progress = Math.round((currentStep / totalSteps) * 100);
  const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  
  console.log(`\n📊 WORKFLOW PROGRESS: [${progressBar}] ${progress}% (${currentStep}/${totalSteps})`);
  console.log(`🔄 Current Step: ${stepName}`);
}

/**
 * Display workflow summary
 */
function displayWorkflowSummary(summary: WorkflowSummary): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📋 DATA PREPARATION WORKFLOW SUMMARY');
  console.log(`${'='.repeat(80)}`);
  
  // Overall statistics
  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`   Total Steps: ${summary.totalSteps}`);
  console.log(`   ✅ Successful: ${summary.successful}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log(`   ⏭️  Skipped: ${summary.skipped}`);
  console.log(`   ⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)} seconds`);
  
  const successRate = ((summary.successful / summary.totalSteps) * 100).toFixed(1);
  console.log(`   📈 Success Rate: ${successRate}%`);
  
  // Step-by-step results
  console.log(`\n📝 STEP RESULTS:`);
  for (const result of summary.results) {
    const statusIcon = result.status === 'SUCCESS' ? '✅' : result.status === 'FAILED' ? '❌' : '⏭️';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`   ${statusIcon} ${result.step} (${duration}s)`);
    
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  }
  
  // Final validation summary
  if (summary.finalValidation) {
    console.log(`\n🔍 FINAL VALIDATION RESULTS:`);
    console.log(`   Total Tests: ${summary.finalValidation.totalTests}`);
    console.log(`   ✅ Passed: ${summary.finalValidation.passed}`);
    console.log(`   ❌ Failed: ${summary.finalValidation.failed}`);
    console.log(`   ⚠️  Warnings: ${summary.finalValidation.warnings}`);
    
    const validationSuccessRate = ((summary.finalValidation.passed / summary.finalValidation.totalTests) * 100).toFixed(1);
    console.log(`   📈 Validation Success Rate: ${validationSuccessRate}%`);
  }
  
  // Overall status
  console.log(`\n${'='.repeat(80)}`);
  if (summary.failed === 0) {
    if (summary.finalValidation && summary.finalValidation.failed === 0) {
      console.log('🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
      console.log('✅ All data preparation steps completed and validation passed.');
      console.log('🚀 Ready to generate large-scale test datasets!');
    } else {
      console.log('⚠️  WORKFLOW COMPLETED WITH VALIDATION ISSUES');
      console.log('✅ All preparation steps completed, but validation found issues.');
      console.log('🔧 Please review and fix validation issues before proceeding.');
    }
  } else {
    console.log('❌ WORKFLOW COMPLETED WITH ERRORS');
    console.log('⚠️  Some critical steps failed. Please review and fix errors.');
    console.log('🛠️  Data may not be ready for large-scale generation.');
  }
  console.log(`${'='.repeat(80)}`);
}

/**
 * Check prerequisites
 */
async function checkPrerequisites(): Promise<boolean> {
  console.log('🔍 Checking prerequisites...');

  try {
    // Create Prisma client
    const prisma = new PrismaClient();

    await prisma.$connect();

    // Check if basic data exists
    const subjectCount = await prisma.subject.count();
    const topicCount = await prisma.topic.count();

    console.log(`📊 Database Status:`);
    console.log(`   Subjects: ${subjectCount}`);
    console.log(`   Topics: ${topicCount}`);

    await prisma.$disconnect();

    if (subjectCount === 0) {
      console.log('❌ No subjects found in database.');
      console.log('🔧 Please run the database seed script first:');
      console.log('   npx prisma db seed');
      return false;
    }

    console.log('✅ Prerequisites check passed!\n');
    return true;

  } catch (error) {
    console.error('❌ Prerequisites check failed:', error);
    console.log('🔧 Please ensure:');
    console.log('   1. Database is running and accessible');
    console.log('   2. Prisma schema is up to date');
    console.log('   3. Database has been seeded with initial data');
    return false;
  }
}

/**
 * Main workflow execution
 */
async function executeDataPreparationWorkflow(): Promise<WorkflowSummary> {
  const startTime = Date.now();
  const results: WorkflowResult[] = [];
  
  console.log('🚀 STARTING DATA PREPARATION WORKFLOW');
  console.log('=' .repeat(80));
  console.log('This workflow will prepare your database for large-scale question generation.');
  console.log('It will set up learning outcomes, fix associations, and validate data integrity.');
  console.log('=' .repeat(80));
  
  // Check prerequisites
  const prerequisitesPassed = await checkPrerequisites();
  if (!prerequisitesPassed) {
    throw new Error('Prerequisites check failed. Please fix the issues and try again.');
  }
  
  // Execute each step
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    const step = WORKFLOW_STEPS[i];
    
    displayProgress(i + 1, WORKFLOW_STEPS.length, step.name);
    
    try {
      const result = await executeStep(step);
      results.push(result);
      
      // If this is a required step and it failed, stop the workflow
      if (result.status === 'FAILED' && step.required && !step.skipOnError) {
        console.log(`\n❌ Critical step failed: ${step.name}`);
        console.log('🛑 Stopping workflow execution.');
        break;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        step: step.name,
        status: 'FAILED',
        duration: 0,
        error: errorMessage
      });
      
      if (step.required && !step.skipOnError) {
        console.log(`\n❌ Critical step failed: ${step.name}`);
        console.log('🛑 Stopping workflow execution.');
        break;
      }
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Create summary
  const summary: WorkflowSummary = {
    totalSteps: WORKFLOW_STEPS.length,
    successful: results.filter(r => r.status === 'SUCCESS').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    totalDuration,
    results,
    finalValidation: results.find(r => r.step === 'Data Validation & Integrity Check')?.result as ValidationSummary
  };
  
  displayWorkflowSummary(summary);
  
  return summary;
}

// Run the workflow
if (require.main === module) {
  executeDataPreparationWorkflow()
    .then((summary) => {
      const exitCode = summary.failed > 0 || (summary.finalValidation && summary.finalValidation.failed > 0) ? 1 : 0;
      console.log(`\n🏁 Workflow completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('\n💥 Workflow execution failed:', error);
      process.exit(1);
    });
}

export { executeDataPreparationWorkflow, WorkflowSummary };
