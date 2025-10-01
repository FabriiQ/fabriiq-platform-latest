#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkQuestionStructure() {
  try {
    const question = await prisma.question.findFirst({
      select: {
        id: true,
        questionType: true,
        difficulty: true,
        metadata: true,
        content: true
      }
    });
    
    console.log('Sample question structure:');
    console.log(JSON.stringify(question, null, 2));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

checkQuestionStructure();
