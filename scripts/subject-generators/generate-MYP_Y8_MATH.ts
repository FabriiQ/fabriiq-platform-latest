/**
 * Generate Questions for Mathematics & Logical Thinking (Y8)
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
  id: 'cmesxd5e5001ftxcf33u6861b',
  name: 'Mathematics & Logical Thinking (Y8)',
  code: 'MYP-Y8-MATH',
  topics: [
  {
    "id": "cmev1pupa00176vwikamk3kj4",
    "title": "Number Operations",
    "code": "NUMBER_OPERATIONS",
    "learningOutcomes": [
      {
        "id": "cmf4t39np0003d4bgnga8uij8",
        "statement": "Given a complex numerical expression, the student will be able to analyze the expression to distinguish between relevant and irrelevant information for solving the problem in at least 3 out of 4 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c04001fd4bgf9t3jnar",
        "statement": "Given examples of different number properties (commutative, associative, distributive), the student will be able to classify each example correctly in 4 out of 5 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t39jo0001d4bgjep150e9",
        "statement": "Given a mixed set of addition, subtraction, multiplication, and division problems, the student will be able to identify the correct operation to perform first in at least 8 out of 10 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t39o10005d4bgof2nlwkp",
        "statement": "Given a word problem involving multiple operations, the student will be able to explain in their own words the steps required to solve it, demonstrating understanding of the order of operations.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t39of0007d4bg7uv9cfhv",
        "statement": "Given a real-world scenario involving multiple number operations, the student will be able to assess the validity of different solution strategies and justify their choice of the most efficient method.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3atw0009d4bglmrgzidc",
        "statement": "Given a proposed solution to a multi-step number operation problem, the student will be able to validate the solution by checking each step and identifying any errors with 90% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3avf000bd4bgk7aythjs",
        "statement": "Given a word problem that requires multiple number operations, the student will be able to translate the problem into a mathematical expression with 80% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3axq000dd4bg0t0i75rq",
        "statement": "Given a set of numbers, the student will be able to recall the order of operations (PEMDAS/BODMAS) with 100% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3ayl000fd4bgm91cwzp6",
        "statement": "Given examples of different number properties (commutative, associative, distributive), the student will be able to classify each example correctly in 4 out of 5 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3ayn000hd4bgqdukgeh9",
        "statement": "Given a set of different mathematical expressions, the student will be able to categorize them based on the number operations involved with 80% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c63001nd4bgnv9hxap5",
        "statement": "Given a real-world scenario involving multiple number operations, the student will be able to assess the validity of different solution strategies and justify their choice of the most efficient method.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c6x001rd4bgcq50nx6b",
        "statement": "Given a word problem that requires multiple number operations, the student will be able to translate the problem into a mathematical expression with 80% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3bzz001ad4bgczaa8syt",
        "statement": "Given a mixed set of addition, subtraction, multiplication, and division problems, the student will be able to identify the correct operation to perform first in at least 8 out of 10 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c06001hd4bgb3mbskxi",
        "statement": "Given a complex numerical expression, the student will be able to analyze the expression to distinguish between relevant and irrelevant information for solving the problem in at least 3 out of 4 cases.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c04001ed4bgtexim3ie",
        "statement": "Given a word problem involving multiple operations, the student will be able to explain in their own words the steps required to solve it, demonstrating understanding of the order of operations.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3bzz001bd4bgch0mp7k7",
        "statement": "Given a set of numbers, the student will be able to recall the order of operations (PEMDAS/BODMAS) with 100% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c11001jd4bgggkyvbnn",
        "statement": "Given a set of different mathematical expressions, the student will be able to categorize them based on the number operations involved with 80% accuracy.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf4t3c3y001ld4bgfa2c7tti",
        "statement": "Given a proposed solution to a multi-step number operation problem, the student will be able to validate the solution by checking each step and identifying any errors with 90% accuracy.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y8_MATH(): Promise<void> {
  console.log('🎯 Starting generation for Mathematics & Logical Thinking (Y8)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5e5001ftxcf33u6861b' }
    });
    
    console.log(`📊 Current questions: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target questions: ${TARGET_QUESTIONS.toLocaleString()}`);
    
    if (currentCount >= TARGET_QUESTIONS) {
      console.log('✅ Subject already has sufficient questions. Skipping.');
      return;
    }
    
    const questionsToGenerate = TARGET_QUESTIONS - currentCount;
    console.log(`📝 Questions to generate: ${questionsToGenerate.toLocaleString()}`);
    
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
      
      console.log(`\n🔄 Processing chunk ${chunk + 1}/${chunks} (${questionsInChunk} questions)`);
      
      // Generate questions for this chunk
      const questions = await generateQuestionsForSubject(
        SUBJECT_DATA,
        questionsInChunk,
        questionBank.id,
        systemUser.id,
        QUESTIONS_PER_BATCH_GENERATION // Use full chunk as batch size for generation
      );
      
      console.log(`✅ Generated ${questions.length} questions`);
      
      // Seed in smaller batches with connection management
      await seedQuestionsWithRetry(questions, BATCH_SIZE);
      
      totalGenerated += questions.length;
      console.log(`📊 Progress: ${totalGenerated}/${questionsToGenerate} (${((totalGenerated/questionsToGenerate)*100).toFixed(1)}%)`);
      
      // Small delay between chunks to prevent connection issues
      if (chunk < chunks - 1) {
        console.log('⏳ Waiting 2 seconds before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Mathematics & Logical Thinking (Y8)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Mathematics & Logical Thinking (Y8):', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seed questions with retry logic and connection management
 */
async function seedQuestionsWithRetry(questions: any[], batchSize: number, maxRetries: number = 3): Promise<void> {
  console.log(`💾 Seeding ${questions.length} questions in batches of ${batchSize}...`);
  
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
        
        console.log(`   ✅ Seeded batch ${batchNumber}/${batches} (${batch.length} questions)`);
        success = true;
        
      } catch (error: any) {
        retries++;
        console.log(`   ⚠️  Batch ${batchNumber} failed (attempt ${retries}/${maxRetries}): ${error.message}`);
        
        if (retries < maxRetries) {
          // Reconnect and retry
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
          console.log(`   🔄 Retrying batch ${batchNumber}...`);
        } else {
          console.error(`   ❌ Failed to seed batch ${batchNumber} after ${maxRetries} attempts`);
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
  generateForMYP_Y8_MATH()
    .then(() => {
      console.log('\n🏁 Mathematics & Logical Thinking (Y8) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Mathematics & Logical Thinking (Y8) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y8_MATH };
