/**
 * Generate Questions for Life & Learning Skills (Y8)
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
  id: 'cmesxd5p4001ltxcfc5oelryf',
  name: 'Life & Learning Skills (Y8)',
  code: 'MYP-Y8-LL',
  topics: [
  {
    "id": "cmev1pwj300276vwi3yccwax0",
    "title": "Introduction",
    "code": "INTRODUCTION",
    "learningOutcomes": [
      {
        "id": "cmf9rafyc00c1qjr8k0hzj2k8",
        "statement": "Students will identify understand personal development and life management concepts related to Introduction.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9raggx00c3qjr86qc22hw8",
        "statement": "Students will explain apply problem-solving and decision-making skills related to Introduction.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9ragou00c5qjr8rtgyhtgv",
        "statement": "Students will complete analyze social and emotional situations related to Introduction.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9rah8e00c7qjr8us3geikg",
        "statement": "Students will contrast evaluate personal choices and their consequences related to Introduction.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9rahqn00c9qjr8714crdo0",
        "statement": "Students will recommend create plans for personal and academic goals related to Introduction.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9raia800cbqjr8jpm65xbo",
        "statement": "Students will compose demonstrate effective interpersonal communication related to Introduction.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pwm100296vwid2qp6d1k",
    "title": "Practice",
    "code": "PRACTICE",
    "learningOutcomes": [
      {
        "id": "cmf9rairy00cdqjr83d9945e1",
        "statement": "Students will select understand personal development and life management concepts related to Practice.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9raj1b00cfqjr8rny57892",
        "statement": "Students will illustrate apply problem-solving and decision-making skills related to Practice.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9rajri00chqjr81b4zn08t",
        "statement": "Students will implement analyze social and emotional situations related to Practice.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9rajzb00cjqjr83u4srb7s",
        "statement": "Students will compare evaluate personal choices and their consequences related to Practice.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9rak6w00clqjr8dvcur3w0",
        "statement": "Students will assess create plans for personal and academic goals related to Practice.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9rakoc00cnqjr8jg1pgz7x",
        "statement": "Students will design demonstrate effective interpersonal communication related to Practice.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pwp0002b6vwiya1ecyns",
    "title": "Assessment",
    "code": "ASSESSMENT",
    "learningOutcomes": [
      {
        "id": "cmf9rakw400cpqjr8n8n5ksnr",
        "statement": "Students will identify understand personal development and life management concepts related to Assessment.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9ral3y00crqjr84brfu8c2",
        "statement": "Students will demonstrate apply problem-solving and decision-making skills related to Assessment.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9ralld00ctqjr8ohjf9fq3",
        "statement": "Students will use analyze social and emotional situations related to Assessment.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9ram3300cvqjr84234ql2r",
        "statement": "Students will analyze evaluate personal choices and their consequences related to Assessment.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9ramdu00cxqjr8ei4qiv0t",
        "statement": "Students will evaluate create plans for personal and academic goals related to Assessment.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9ramn900czqjr8f2gt1cal",
        "statement": "Students will design demonstrate effective interpersonal communication related to Assessment.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y8_LL(): Promise<void> {
  console.log('🎯 Starting generation for Life & Learning Skills (Y8)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5p4001ltxcfc5oelryf' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Life & Learning Skills (Y8)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Life & Learning Skills (Y8):', error);
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
  generateForMYP_Y8_LL()
    .then(() => {
      console.log('\n🏁 Life & Learning Skills (Y8) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Life & Learning Skills (Y8) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y8_LL };
