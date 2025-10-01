import { PrismaClient } from '@prisma/client';
import { seedTopicMasteryForSpecificStudent } from '../src/server/db/seed-data/topic-mastery';

const prisma = new PrismaClient();

/**
 * Script to seed realistic topic mastery data for a specific student
 */
async function main() {
  console.log('🌱 Starting student mastery seeding...');

  try {
    // Seed for the specific student from the URL
    await seedTopicMasteryForSpecificStudent(prisma, 'cmeuysuiv01yp13ishghtf531');
    
    console.log('✅ Student mastery seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
