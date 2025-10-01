/**
 * Generate Questions in Series
 * 
 * Simplified approach that generates questions for each subject in series
 * without spawning separate processes, with better connection management
 */

import { PrismaClient } from '@prisma/client';
import { 
  generateQuestionsForSubject,
  fetchAllSubjectsData,
  type SubjectData 
} from './generate-million-questions-seed';

// Create a new Prisma client with better connection settings
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

interface SubjectProgress {
  subject: SubjectData;
  currentCount: number;
  targetCount: number;
  needsGeneration: boolean;
}

/**
 * Get subjects with their current question counts
 */
async function getSubjectProgress(): Promise<SubjectProgress[]> {
  console.log('📊 Analyzing subject progress...');
  
  const subjects = await fetchAllSubjectsData();
  const progress: SubjectProgress[] = [];
  
  for (const subject of subjects) {
    const currentCount = await prisma.question.count({
      where: { subjectId: subject.id }
    });
    
    const targetCount = 1000;
    const needsGeneration = currentCount < targetCount;
    
    progress.push({
      subject,
      currentCount,
      targetCount,
      needsGeneration
    });
  }
  
  return progress;
}

/**
 * Seed questions with retry logic and better connection management
 */
async function seedQuestionsWithRetry(questions: any[], batchSize: number = 500): Promise<void> {
  console.log(`💾 Seeding ${questions.length} questions in batches of ${batchSize}...`);
  
  const batches = Math.ceil(questions.length / batchSize);
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = questions.slice(i, i + batchSize);
    
    let retries = 0;
    const maxRetries = 3;
    let success = false;
    
    while (!success && retries < maxRetries) {
      try {
        await prisma.question.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`   ✅ Seeded batch ${batchNumber}/${batches} (${batch.length} questions)`);
        success = true;
        
      } catch (error: any) {
        retries++;
        console.log(`   ⚠️  Batch ${batchNumber} failed (attempt ${retries}/${maxRetries}): ${error.message}`);
        
        if (retries < maxRetries) {
          // Disconnect and wait before retry
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 2000 * retries)); // Exponential backoff
          console.log(`   🔄 Retrying batch ${batchNumber}...`);
        } else {
          console.error(`   ❌ Failed to seed batch ${batchNumber} after ${maxRetries} attempts`);
          throw error;
        }
      }
    }
    
    // Small delay between batches to prevent connection issues
    if (i + batchSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
}

/**
 * Generate questions for a single subject with chunking
 */
async function generateForSubject(progress: SubjectProgress): Promise<void> {
  const { subject, currentCount, targetCount } = progress;
  const questionsToGenerate = targetCount - currentCount;
  
  console.log(`\n🎯 Generating for ${subject.name}`);
  console.log('='.repeat(60));
  console.log(`📊 Current: ${currentCount.toLocaleString()}`);
  console.log(`🎯 Target: ${targetCount.toLocaleString()}`);
  console.log(`📝 To Generate: ${questionsToGenerate.toLocaleString()}`);
  
  // Get system user and question bank
  const systemUser = await prisma.user.findFirst();
  const questionBank = await prisma.questionBank.findFirst({ 
    where: { status: 'ACTIVE' } 
  });
  
  if (!systemUser || !questionBank) {
    throw new Error('Missing system user or question bank');
  }
  
  // Generate in chunks to avoid memory issues and connection timeouts
  const chunkSize = 5000; // Generate 5k questions at a time
  const chunks = Math.ceil(questionsToGenerate / chunkSize);
  let totalGenerated = 0;
  
  for (let chunk = 0; chunk < chunks; chunk++) {
    const questionsInChunk = Math.min(chunkSize, questionsToGenerate - totalGenerated);
    
    console.log(`\n🔄 Chunk ${chunk + 1}/${chunks}: Generating ${questionsInChunk} questions...`);
    
    try {
      // Generate questions for this chunk
      const questions = await generateQuestionsForSubject(
        subject,
        questionsInChunk,
        questionBank.id,
        systemUser.id,
        chunkSize
      );
      
      console.log(`✅ Generated ${questions.length} questions`);
      
      // Seed with retry logic
      await seedQuestionsWithRetry(questions, 500);
      
      totalGenerated += questions.length;
      console.log(`📊 Progress: ${totalGenerated}/${questionsToGenerate} (${((totalGenerated/questionsToGenerate)*100).toFixed(1)}%)`);
      
      // Verify the questions were actually saved
      const verifyCount = await prisma.question.count({
        where: { subjectId: subject.id }
      });
      console.log(`✅ Verified total in DB: ${verifyCount.toLocaleString()}`);
      
      // Break if we've reached the target
      if (verifyCount >= targetCount) {
        console.log('🎉 Target reached! Stopping generation for this subject.');
        break;
      }
      
      // Small delay between chunks
      if (chunk < chunks - 1) {
        console.log('⏳ Waiting 3 seconds before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Error in chunk ${chunk + 1}:`, error);
      
      // Try to continue with next chunk unless it's a critical error
      if (error instanceof Error && error.message.includes('connection')) {
        console.log('🔄 Connection error detected, waiting longer before retry...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        throw error; // Re-throw non-connection errors
      }
    }
  }
  
  console.log(`\n🎉 Completed ${subject.name}: Generated ${totalGenerated} questions`);
}

/**
 * Main function to run generation in series
 */
async function main(): Promise<void> {
  console.log('🎯 Series Question Generation');
  console.log('='.repeat(60));
  console.log('Generating questions for each subject in series with better connection management\n');
  
  try {
    // Get current progress for all subjects
    const allProgress = await getSubjectProgress();
    
    // Display current status
    console.log('📊 Current Status:');
    allProgress.forEach(p => {
      const status = p.needsGeneration ? '📝 Needs questions' : '✅ Complete';
      console.log(`   ${p.subject.name}: ${p.currentCount.toLocaleString()}/${p.targetCount.toLocaleString()} ${status}`);
    });
    
    // Filter subjects that need generation
    const subjectsToProcess = allProgress.filter(p => p.needsGeneration);
    console.log(`\n🎯 Subjects to process: ${subjectsToProcess.length}`);
    
    if (subjectsToProcess.length === 0) {
      console.log('🎉 All subjects already have sufficient questions!');
      return;
    }
    
    // Process each subject in series
    const results: Array<{subject: string, success: boolean, error?: string}> = [];
    
    for (let i = 0; i < subjectsToProcess.length; i++) {
      const progress = subjectsToProcess[i];
      
      try {
        await generateForSubject(progress);
        results.push({ subject: progress.subject.name, success: true });
        
      } catch (error: any) {
        console.error(`❌ Failed to generate for ${progress.subject.name}:`, error);
        results.push({ 
          subject: progress.subject.name, 
          success: false, 
          error: error.message 
        });
      }
      
      // Delay between subjects to prevent connection issues
      if (i < subjectsToProcess.length - 1) {
        console.log('\n⏳ Waiting 5 seconds before next subject...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Display final results
    console.log('\n📊 FINAL RESULTS');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Successfully processed:');
      successful.forEach(r => console.log(`   • ${r.subject}`));
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed subjects:');
      failed.forEach(r => console.log(`   • ${r.subject}: ${r.error}`));
    }
    
    // Final verification
    console.log('\n📊 Final verification...');
    const finalProgress = await getSubjectProgress();
    const totalQuestions = finalProgress.reduce((sum, p) => sum + p.currentCount, 0);
    console.log(`📝 Total questions in database: ${totalQuestions.toLocaleString()}`);
    
    const completed = finalProgress.filter(p => !p.needsGeneration).length;
    console.log(`✅ Subjects with 1k+ questions: ${completed}/${finalProgress.length}`);
    
    console.log('\n🎉 Series generation completed!');
    
  } catch (error) {
    console.error('❌ Series generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { generateForSubject, getSubjectProgress };
