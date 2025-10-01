/**
 * Generate Questions for Integrated Science & Inquiry (Y7)
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
  id: 'cmesxd5150017txcf7u9efawl',
  name: 'Integrated Science & Inquiry (Y7)',
  code: 'MYP-Y7-SCI',
  topics: [
  {
    "id": "cmeuyq73d00cj13isf61fm4zp",
    "title": "Integrated Science & Inquiry Topic 2.1",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH2-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r8mwh0031qjr8w0nuf9p2",
        "statement": "Students will match understand scientific concepts and principles related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r8n410033qjr8pumeg4jw",
        "statement": "Students will interpret apply scientific methods and processes related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r8ndf0035qjr85dle90se",
        "statement": "Students will solve analyze scientific data and evidence related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r8nv60037qjr86gd5qduc",
        "statement": "Students will differentiate evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r8oh70039qjr8xap7eps1",
        "statement": "Students will judge design and conduct scientific investigations related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r8ozp003bqjr8lof08bhb",
        "statement": "Students will develop communicate scientific findings effectively related to Integrated Science & Inquiry Topic 2.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq6m900cb13isvgpbe9v9",
    "title": "Integrated Science & Inquiry: Unit 1",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH1",
    "learningOutcomes": [
      {
        "id": "cmf9r8p8g003dqjr8o2ud4ng5",
        "statement": "Students will recognize understand scientific concepts and principles related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r8qeb003fqjr8vyioq0sb",
        "statement": "Students will demonstrate apply scientific methods and processes related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r8qmg003hqjr864fvfhdl",
        "statement": "Students will implement analyze scientific data and evidence related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r8quf003jqjr8m5sx8vn5",
        "statement": "Students will distinguish evaluate scientific claims and theories related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r8r2f003lqjr8lklqbq6q",
        "statement": "Students will prioritize design and conduct scientific investigations related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r8rae003nqjr8txpwf1q6",
        "statement": "Students will create communicate scientific findings effectively related to Integrated Science & Inquiry: Unit 1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq6q800cd13ishgm8bk9t",
    "title": "Integrated Science & Inquiry Topic 1.1",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH1-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r8sl5003pqjr8fkpk0tqx",
        "statement": "Students will name understand scientific concepts and principles related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r8stc003rqjr8jw6z4v0m",
        "statement": "Students will paraphrase apply scientific methods and processes related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r8t23003tqjr8ngr616x8",
        "statement": "Students will solve analyze scientific data and evidence related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r8tjh003vqjr8q2vwbuge",
        "statement": "Students will differentiate evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r8w1h003xqjr8e9wnnaej",
        "statement": "Students will support design and conduct scientific investigations related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r8wsu003zqjr827kjm23q",
        "statement": "Students will synthesize communicate scientific findings effectively related to Integrated Science & Inquiry Topic 1.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq6uh00cf13isiyo3k49m",
    "title": "Integrated Science & Inquiry Topic 1.2",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH1-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r8xf50041qjr84cn60g8c",
        "statement": "Students will select understand scientific concepts and principles related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r8xx30043qjr8g273ii9o",
        "statement": "Students will classify apply scientific methods and processes related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r8yf70045qjr82sxqg9gk",
        "statement": "Students will implement analyze scientific data and evidence related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r8ywm0047qjr8v097sali",
        "statement": "Students will contrast evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r8z420049qjr8qjch90v0",
        "statement": "Students will recommend design and conduct scientific investigations related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r8zc1004bqjr8s540m330",
        "statement": "Students will construct communicate scientific findings effectively related to Integrated Science & Inquiry Topic 1.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq6yg00ch13isceq4huju",
    "title": "Integrated Science & Inquiry: Unit 2",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH2",
    "learningOutcomes": [
      {
        "id": "cmf9r8zu4004dqjr80ow8o31i",
        "statement": "Students will list understand scientific concepts and principles related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r906k004fqjr8vzevs0i9",
        "statement": "Students will demonstrate apply scientific methods and processes related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r90o6004hqjr8spgaxvlp",
        "statement": "Students will use analyze scientific data and evidence related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9171004jqjr8buvctjhg",
        "statement": "Students will examine evaluate scientific claims and theories related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r91ev004lqjr8r1r51q2z",
        "statement": "Students will support design and conduct scientific investigations related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r91mh004nqjr8lz6uwoa1",
        "statement": "Students will synthesize communicate scientific findings effectively related to Integrated Science & Inquiry: Unit 2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq77800cl13isy2l43c91",
    "title": "Integrated Science & Inquiry Topic 2.2",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH2-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r91uc004pqjr85kv62025",
        "statement": "Students will recall understand scientific concepts and principles related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r922h004rqjr815icfbf6",
        "statement": "Students will paraphrase apply scientific methods and processes related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r92k5004tqjr8lwhdr9lr",
        "statement": "Students will show analyze scientific data and evidence related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r92s0004vqjr85hnnmuc9",
        "statement": "Students will deconstruct evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r92zq004xqjr8s5kvyc3g",
        "statement": "Students will critique design and conduct scientific investigations related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r937i004zqjr8rj2x6b5n",
        "statement": "Students will synthesize communicate scientific findings effectively related to Integrated Science & Inquiry Topic 2.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7cf00cn13isdvz7mf2p",
    "title": "Integrated Science & Inquiry: Unit 3",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH3",
    "learningOutcomes": [
      {
        "id": "cmf9r93fk0051qjr87u6r429w",
        "statement": "Students will identify understand scientific concepts and principles related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r94jn0053qjr8cdhzgemh",
        "statement": "Students will paraphrase apply scientific methods and processes related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r94rj0055qjr8joio0bev",
        "statement": "Students will operate analyze scientific data and evidence related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r95j90057qjr8p4iy3o7p",
        "statement": "Students will analyze evaluate scientific claims and theories related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r95r00059qjr8hz17spth",
        "statement": "Students will recommend design and conduct scientific investigations related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9601005bqjr8r1enf5k5",
        "statement": "Students will construct communicate scientific findings effectively related to Integrated Science & Inquiry: Unit 3.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7fg00cp13ishgj4uo27",
    "title": "Integrated Science & Inquiry Topic 3.1",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH3-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r967n005dqjr83be79dso",
        "statement": "Students will list understand scientific concepts and principles related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r96fe005fqjr8gagv2rkk",
        "statement": "Students will interpret apply scientific methods and processes related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r96n4005hqjr8nn77oquo",
        "statement": "Students will calculate analyze scientific data and evidence related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r96wx005jqjr8iv24wnz7",
        "statement": "Students will compare evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r97f9005lqjr8if5emd02",
        "statement": "Students will validate design and conduct scientific investigations related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r97xw005nqjr8p2xhl6f3",
        "statement": "Students will produce communicate scientific findings effectively related to Integrated Science & Inquiry Topic 3.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7ij00cr13is4r2oh6hy",
    "title": "Integrated Science & Inquiry Topic 3.2",
    "code": "cmesxd5150017txcf7u9efawl-GEN-CH3-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r985q005pqjr8t24u7wau",
        "statement": "Students will describe understand scientific concepts and principles related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r98np005rqjr87aft8vif",
        "statement": "Students will summarize apply scientific methods and processes related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r995j005tqjr8ieaubswq",
        "statement": "Students will operate analyze scientific data and evidence related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r99dg005vqjr87kxy7opg",
        "statement": "Students will organize evaluate scientific claims and theories related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r99l0005xqjr8nftmzjmh",
        "statement": "Students will defend design and conduct scientific investigations related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9a2b005zqjr8a880tjcx",
        "statement": "Students will generate communicate scientific findings effectively related to Integrated Science & Inquiry Topic 3.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y7_SCI(): Promise<void> {
  console.log('🎯 Starting generation for Integrated Science & Inquiry (Y7)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5150017txcf7u9efawl' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Integrated Science & Inquiry (Y7)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Integrated Science & Inquiry (Y7):', error);
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
  generateForMYP_Y7_SCI()
    .then(() => {
      console.log('\n🏁 Integrated Science & Inquiry (Y7) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Integrated Science & Inquiry (Y7) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y7_SCI };
