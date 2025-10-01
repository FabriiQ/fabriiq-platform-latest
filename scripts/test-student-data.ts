import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to test student data and see what's in the database
 */
async function main() {
  console.log('🔍 Testing student data...');

  try {
    const studentId = 'cmeuysuiv01yp13ishghtf531';
    
    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, userType: true }
    });
    
    console.log('Student:', student);
    
    // Check topic masteries
    const masteries = await prisma.topicMastery.findMany({
      where: { studentId },
      include: {
        topic: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true } }
      }
    });
    
    console.log(`Found ${masteries.length} topic masteries:`);
    masteries.slice(0, 5).forEach(m => {
      console.log(`  - ${m.topic.title}: ${Math.round(m.overallMastery * 100)}% overall`);
      console.log(`    Remember: ${Math.round(m.rememberLevel * 100)}%, Understand: ${Math.round(m.understandLevel * 100)}%`);
    });
    
    // Check activity grades
    const grades = await prisma.activityGrade.findMany({
      where: { studentId },
      include: {
        activity: { select: { title: true, type: true } }
      },
      take: 5
    });
    
    console.log(`Found ${grades.length} activity grades:`);
    grades.forEach(g => {
      console.log(`  - ${g.activity.title}: ${g.score}/${g.maxScore} (${Math.round((g.score/g.maxScore)*100)}%)`);
    });
    
    // Check learning time records
    const timeRecords = await prisma.learningTimeRecord.findMany({
      where: { studentId },
      take: 5
    });
    
    console.log(`Found ${timeRecords.length} learning time records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
