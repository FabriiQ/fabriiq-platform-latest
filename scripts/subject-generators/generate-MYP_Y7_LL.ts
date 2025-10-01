/**
 * Generate Questions for Life & Learning Skills (Y7)
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
  id: 'cmesxd57p001btxcfroqm8lsp',
  name: 'Life & Learning Skills (Y7)',
  code: 'MYP-Y7-LL',
  topics: [
  {
    "id": "cmev1pti0000j6vwi9obdyuhp",
    "title": "Introduction",
    "code": "INTRODUCTION",
    "learningOutcomes": [
      {
        "id": "cmf9r9wa00093qjr8qpj4tw5y",
        "statement": "Students will compare apply problem-solving and decision-making skills related to Introduction.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9wr80095qjr8rm5v2k5h",
        "statement": "Students will demonstrate analyze social and emotional situations related to Introduction.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9wz30097qjr8zoi9mp2i",
        "statement": "Students will categorize evaluate personal choices and their consequences related to Introduction.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9xds0099qjr8xx4qpyrt",
        "statement": "Students will support create plans for personal and academic goals related to Introduction.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9y43009bqjr8ku47soc9",
        "statement": "Students will produce demonstrate effective interpersonal communication related to Introduction.",
        "bloomsLevel": "CREATE"
      },
      {
        "id": "cmf9r9w290091qjr8a2jyckvk",
        "statement": "Students will name understand personal development and life management concepts related to Introduction.",
        "bloomsLevel": "REMEMBER"
      }
    ]
  },
  {
    "id": "cmev1ptq9000l6vwilmroihgu",
    "title": "Practice",
    "code": "PRACTICE",
    "learningOutcomes": [
      {
        "id": "cmf9r9ybx009dqjr8sfacsm8l",
        "statement": "Students will describe understand personal development and life management concepts related to Practice.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9yju009fqjr8x877c4wt",
        "statement": "Students will explain apply problem-solving and decision-making skills related to Practice.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9z3l009hqjr8a2rfnhko",
        "statement": "Students will complete analyze social and emotional situations related to Practice.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9zr8009jqjr82yhzzydq",
        "statement": "Students will examine evaluate personal choices and their consequences related to Practice.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9zyr009lqjr8bhzf7sch",
        "statement": "Students will defend create plans for personal and academic goals related to Practice.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9ra06h009nqjr8x6ordmu0",
        "statement": "Students will synthesize demonstrate effective interpersonal communication related to Practice.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1ptub000n6vwi6rkhnol2",
    "title": "Assessment",
    "code": "ASSESSMENT",
    "learningOutcomes": [
      {
        "id": "cmf9ra0e7009pqjr86ms4gbih",
        "statement": "Students will list understand personal development and life management concepts related to Assessment.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9ra0ly009rqjr8d1pjhobr",
        "statement": "Students will demonstrate apply problem-solving and decision-making skills related to Assessment.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9ra0tk009tqjr8nm8qkvoe",
        "statement": "Students will calculate analyze social and emotional situations related to Assessment.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9ra1bq009vqjr8j9pqs6vd",
        "statement": "Students will differentiate evaluate personal choices and their consequences related to Assessment.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9ra1ji009xqjr8q2k3r4fq",
        "statement": "Students will recommend create plans for personal and academic goals related to Assessment.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9ra1qz009zqjr8zy7qrsg5",
        "statement": "Students will compose demonstrate effective interpersonal communication related to Assessment.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y7_LL(): Promise<void> {
  console.log('🎯 Starting generation for Life & Learning Skills (Y7)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd57p001btxcfroqm8lsp' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Life & Learning Skills (Y7)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Life & Learning Skills (Y7):', error);
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
  generateForMYP_Y7_LL()
    .then(() => {
      console.log('\n🏁 Life & Learning Skills (Y7) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Life & Learning Skills (Y7) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y7_LL };
