#!/usr/bin/env tsx

/**
 * Script to populate sample question usage statistics for testing analytics
 * This script creates realistic usage data for existing questions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateQuestionUsageStats() {
  console.log('🚀 Starting to populate question usage statistics...');

  try {
    // Get all active questions
    const questions = await prisma.question.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        difficulty: true,
        questionType: true,
      },
      take: 50, // Limit to first 50 questions for demo
    });

    console.log(`📊 Found ${questions.length} questions to populate stats for`);

    const statsToCreate = [];

    for (const question of questions) {
      // Generate realistic usage stats based on question difficulty
      const baseUsage = getBaseUsageByDifficulty(question.difficulty);
      const usageCount = Math.floor(Math.random() * baseUsage.max) + baseUsage.min;
      
      // Generate correct/incorrect counts based on difficulty
      const successRate = getSuccessRateByDifficulty(question.difficulty);
      const correctCount = Math.floor(usageCount * successRate);
      const incorrectCount = usageCount - correctCount;
      const partialCount = Math.floor(usageCount * 0.1); // 10% partial credit
      
      // Generate other metrics
      const averageTime = getAverageTimeByType(question.questionType);
      const difficultyRating = getDifficultyRating(question.difficulty);
      
      // Random last used date within last 30 days
      const lastUsedAt = new Date();
      lastUsedAt.setDate(lastUsedAt.getDate() - Math.floor(Math.random() * 30));

      statsToCreate.push({
        questionId: question.id,
        usageCount,
        correctCount,
        incorrectCount,
        partialCount,
        averageTime,
        difficultyRating,
        lastUsedAt,
      });
    }

    // Batch create usage stats
    console.log('💾 Creating usage statistics...');
    
    for (const stats of statsToCreate) {
      await prisma.questionUsageStats.upsert({
        where: { questionId: stats.questionId },
        update: stats,
        create: stats,
      });
    }

    console.log(`✅ Successfully populated usage stats for ${statsToCreate.length} questions`);
    
    // Display summary
    const totalStats = await prisma.questionUsageStats.count();
    console.log(`📈 Total question usage stats in database: ${totalStats}`);

  } catch (error) {
    console.error('❌ Error populating question usage stats:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getBaseUsageByDifficulty(difficulty: string) {
  switch (difficulty) {
    case 'EASY':
      return { min: 50, max: 200 };
    case 'MEDIUM':
      return { min: 30, max: 150 };
    case 'HARD':
      return { min: 10, max: 80 };
    default:
      return { min: 20, max: 100 };
  }
}

function getSuccessRateByDifficulty(difficulty: string): number {
  switch (difficulty) {
    case 'EASY':
      return 0.75 + Math.random() * 0.2; // 75-95%
    case 'MEDIUM':
      return 0.55 + Math.random() * 0.25; // 55-80%
    case 'HARD':
      return 0.35 + Math.random() * 0.25; // 35-60%
    default:
      return 0.6 + Math.random() * 0.2; // 60-80%
  }
}

function getAverageTimeByType(questionType: string): number {
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      return 30 + Math.random() * 60; // 30-90 seconds
    case 'MULTIPLE_RESPONSE':
    case 'FILL_IN_THE_BLANKS':
      return 45 + Math.random() * 75; // 45-120 seconds
    case 'SHORT_ANSWER':
      return 90 + Math.random() * 120; // 90-210 seconds
    case 'ESSAY':
      return 300 + Math.random() * 600; // 5-15 minutes
    case 'MATCHING':
    case 'SEQUENCE':
      return 60 + Math.random() * 90; // 60-150 seconds
    default:
      return 60 + Math.random() * 60; // 60-120 seconds
  }
}

function getDifficultyRating(difficulty: string): number {
  switch (difficulty) {
    case 'EASY':
      return 1 + Math.random() * 1.5; // 1.0-2.5
    case 'MEDIUM':
      return 2.5 + Math.random() * 1.5; // 2.5-4.0
    case 'HARD':
      return 4 + Math.random() * 1; // 4.0-5.0
    default:
      return 2 + Math.random() * 2; // 2.0-4.0
  }
}

// Run the script
if (require.main === module) {
  populateQuestionUsageStats()
    .then(() => {
      console.log('🎉 Question usage stats population completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to populate question usage stats:', error);
      process.exit(1);
    });
}

export { populateQuestionUsageStats };
