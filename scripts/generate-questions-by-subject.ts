/**
 * Generate Questions by Subject
 * 
 * Creates individual scripts for each subject and runs them in series
 * with connection management and skip logic for subjects with 50k+ questions
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const prisma = new PrismaClient();

interface SubjectInfo {
  id: string;
  name: string;
  code: string;
  currentQuestionCount: number;
  topics: Array<{
    id: string;
    title: string;
    code: string;
    learningOutcomes: Array<{
      id: string;
      statement: string;
      bloomsLevel: string;
    }>;
  }>;
}

/**
 * Get all subjects with their current question counts
 */
async function getSubjectsWithQuestionCounts(): Promise<SubjectInfo[]> {
  console.log('📊 Fetching subjects with question counts...');
  
  const subjects = await prisma.subject.findMany({
    include: {
      topics: {
        include: {
          learningOutcomes: true
        }
      }
    }
  });

  const subjectsWithCounts: SubjectInfo[] = [];

  for (const subject of subjects) {
    // Count existing questions for this subject
    const questionCount = await prisma.question.count({
      where: { subjectId: subject.id }
    });

    // Filter topics that have learning outcomes
    const validTopics = subject.topics.filter(topic => topic.learningOutcomes.length > 0);

    if (validTopics.length > 0) {
      subjectsWithCounts.push({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        currentQuestionCount: questionCount,
        topics: validTopics.map(topic => ({
          id: topic.id,
          title: topic.title,
          code: topic.code,
          learningOutcomes: topic.learningOutcomes.map(outcome => ({
            id: outcome.id,
            statement: outcome.statement,
            bloomsLevel: outcome.bloomsLevel || 'REMEMBER'
          }))
        }))
      });
    }
  }

  return subjectsWithCounts;
}

/**
 * Create individual subject generation script
 */
async function createSubjectScript(subject: SubjectInfo, targetQuestions: number): Promise<string> {
  const scriptDir = path.join(process.cwd(), 'scripts', 'subject-generators');
  if (!fs.existsSync(scriptDir)) {
    fs.mkdirSync(scriptDir, { recursive: true });
  }

  const safeSubjectName = subject.code.replace(/[^a-zA-Z0-9]/g, '_');
  const scriptPath = path.join(scriptDir, `generate-${safeSubjectName}.ts`);

  const scriptContent = `/**
 * Generate Questions for ${subject.name}
 * Auto-generated script for subject-specific question generation
 */

import { PrismaClient } from '@prisma/client';
import { 
  generateQuestionsForSubject,
  seedQuestionsBatch,
  type SubjectData 
} from '../generate-million-questions-seed';

const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const SUBJECT_DATA: SubjectData = {
  id: '${subject.id}',
  name: '${subject.name}',
  code: '${subject.code}',
  topics: ${JSON.stringify(subject.topics, null, 2)}
};

const TARGET_QUESTIONS = ${targetQuestions};
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateFor${safeSubjectName}(): Promise<void> {
  console.log('🎯 Starting generation for ${subject.name}');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: '${subject.id}' }
    });
    
    console.log(\`📊 Current questions: \${currentCount.toLocaleString()}\`);
    console.log(\`🎯 Target questions: \${TARGET_QUESTIONS.toLocaleString()}\`);
    
    if (currentCount >= TARGET_QUESTIONS) {
      console.log('✅ Subject already has sufficient questions. Skipping.');
      return;
    }
    
    const questionsToGenerate = TARGET_QUESTIONS - currentCount;
    console.log(\`📝 Questions to generate: \${questionsToGenerate.toLocaleString()}\`);
    
    // Get system user and question bank
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ 
      where: { status: 'ACTIVE' } 
    });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    // Generate and seed in chunks to avoid connection timeouts
    let totalGenerated = 0;
    const chunks = Math.ceil(questionsToGenerate / QUESTIONS_PER_BATCH_GENERATION);
    
    for (let chunk = 0; chunk < chunks; chunk++) {
      const questionsInChunk = Math.min(
        QUESTIONS_PER_BATCH_GENERATION, 
        questionsToGenerate - totalGenerated
      );
      
      console.log(\`\\n🔄 Processing chunk \${chunk + 1}/\${chunks} (\${questionsInChunk} questions)\`);
      
      // Generate questions for this chunk
      const questions = await generateQuestionsForSubject(
        SUBJECT_DATA,
        questionsInChunk,
        questionBank.id,
        systemUser.id,
        QUESTIONS_PER_BATCH_GENERATION // Use full chunk as batch size for generation
      );
      
      console.log(\`✅ Generated \${questions.length} questions\`);
      
      // Seed in smaller batches with connection management
      await seedQuestionsWithRetry(questions, BATCH_SIZE);
      
      totalGenerated += questions.length;
      console.log(\`📊 Progress: \${totalGenerated}/\${questionsToGenerate} (\${((totalGenerated/questionsToGenerate)*100).toFixed(1)}%)\`);
      
      // Small delay between chunks to prevent connection issues
      if (chunk < chunks - 1) {
        console.log('⏳ Waiting 2 seconds before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(\`\\n🎉 Successfully generated \${totalGenerated} questions for ${subject.name}\`);
    
  } catch (error) {
    console.error('❌ Error generating questions for ${subject.name}:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seed questions with retry logic and connection management
 */
async function seedQuestionsWithRetry(questions: any[], batchSize: number, maxRetries: number = 3): Promise<void> {
  console.log(\`💾 Seeding \${questions.length} questions in batches of \${batchSize}...\`);
  
  const batches = Math.ceil(questions.length / batchSize);
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = questions.slice(i, i + batchSize);
    
    let retries = 0;
    let success = false;
    
    while (!success && retries < maxRetries) {
      try {
        await prisma.question.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(\`   ✅ Seeded batch \${batchNumber}/\${batches} (\${batch.length} questions)\`);
        success = true;
        
      } catch (error: any) {
        retries++;
        console.log(\`   ⚠️  Batch \${batchNumber} failed (attempt \${retries}/\${maxRetries}): \${error.message}\`);
        
        if (retries < maxRetries) {
          // Reconnect and retry
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
          console.log(\`   🔄 Retrying batch \${batchNumber}...\`);
        } else {
          console.error(\`   ❌ Failed to seed batch \${batchNumber} after \${maxRetries} attempts\`);
          throw error;
        }
      }
    }
    
    // Small delay between batches
    if (i + batchSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Run the script
if (require.main === module) {
  generateFor${safeSubjectName}()
    .then(() => {
      console.log('\\n🏁 ${subject.name} generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n💥 ${subject.name} generation failed:', error);
      process.exit(1);
    });
}

export { generateFor${safeSubjectName} };
`;

  await fs.promises.writeFile(scriptPath, scriptContent);
  return scriptPath;
}

/**
 * Run subject scripts in series
 */
async function runSubjectScriptsInSeries(subjects: SubjectInfo[], targetQuestionsPerSubject: number): Promise<void> {
  console.log('🚀 Running subject generation scripts in series...');
  console.log('='.repeat(60));
  
  const results: Array<{
    subject: string;
    status: 'success' | 'failed' | 'skipped';
    questionsGenerated?: number;
    error?: string;
  }> = [];
  
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    console.log(`\\n📚 Processing subject ${i + 1}/${subjects.length}: ${subject.name}`);
    console.log(`   Current questions: ${subject.currentQuestionCount.toLocaleString()}`);
    
    // Skip if already has enough questions
    if (subject.currentQuestionCount >= targetQuestionsPerSubject) {
      console.log('✅ Subject already has sufficient questions. Skipping.');
      results.push({
        subject: subject.name,
        status: 'skipped'
      });
      continue;
    }
    
    try {
      // Create script for this subject
      const scriptPath = await createSubjectScript(subject, targetQuestionsPerSubject);
      console.log(`📝 Created script: ${path.basename(scriptPath)}`);

      // Run the script
      console.log('🔄 Executing subject generation script...');

      const result = await new Promise<{success: boolean, error?: string}>((resolve) => {
        const child = spawn('npx', ['tsx', scriptPath], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        child.on('exit', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `Process exited with code ${code}` });
          }
        });

        child.on('error', (error) => {
          resolve({ success: false, error: error.message });
        });
      });
      
      if (result.success) {
        // Get updated question count
        const newCount = await prisma.question.count({
          where: { subjectId: subject.id }
        });
        const questionsGenerated = newCount - subject.currentQuestionCount;
        
        console.log(`✅ ${subject.name} completed successfully!`);
        console.log(`   Questions generated: ${questionsGenerated.toLocaleString()}`);
        console.log(`   Total questions: ${newCount.toLocaleString()}`);
        
        results.push({
          subject: subject.name,
          status: 'success',
          questionsGenerated
        });
      } else {
        console.error(`❌ ${subject.name} failed: ${result.error}`);
        results.push({
          subject: subject.name,
          status: 'failed',
          error: result.error
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Error processing ${subject.name}:`, error);
      results.push({
        subject: subject.name,
        status: 'failed',
        error: error.message
      });
    }
    
    // Small delay between subjects
    if (i < subjects.length - 1) {
      console.log('⏳ Waiting 3 seconds before next subject...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Display final results
  console.log('\\n📊 FINAL RESULTS');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏭️  Skipped: ${skipped.length}`);

  if (successful.length > 0) {
    const totalGenerated = successful.reduce((sum, r) => sum + (r.questionsGenerated || 0), 0);
    console.log(`📝 Total questions generated: ${totalGenerated.toLocaleString()}`);
  }

  if (failed.length > 0) {
    console.log('\\n❌ Failed subjects:');
    failed.forEach(r => {
      console.log(`   • ${r.subject}: ${r.error}`);
    });
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🎯 Subject-by-Subject Question Generation');
  console.log('='.repeat(60));
  
  try {
    // Get subjects with current question counts
    const subjects = await getSubjectsWithQuestionCounts();
    console.log(`📚 Found ${subjects.length} subjects with valid topics and learning outcomes`);

    // Display current status
    console.log('\\n📊 Current Status:');
    subjects.forEach(subject => {
      const status = subject.currentQuestionCount >= 50000 ? '✅ Complete' : '📝 Needs questions';
      console.log(`   ${subject.name}: ${subject.currentQuestionCount.toLocaleString()} questions ${status}`);
    });

    // Filter subjects that need questions
    const subjectsNeedingQuestions = subjects.filter(s => s.currentQuestionCount < 50000);
    console.log(`\\n🎯 Subjects needing questions: ${subjectsNeedingQuestions.length}`);
    
    if (subjectsNeedingQuestions.length === 0) {
      console.log('🎉 All subjects already have sufficient questions!');
      return;
    }
    
    // Run generation for subjects that need questions
    await runSubjectScriptsInSeries(subjectsNeedingQuestions, 50000);
    
    console.log('\\n🎉 Subject-by-subject generation completed!');
    
  } catch (error) {
    console.error('❌ Subject generation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { getSubjectsWithQuestionCounts, createSubjectScript, runSubjectScriptsInSeries };
