/**
 * Quick Status Check
 * 
 * Provides a quick overview of question generation progress
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickStatus(): Promise<void> {
  console.log('📊 QUICK STATUS CHECK');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toLocaleString()}\n`);
  
  try {
    // Get total questions
    const totalQuestions = await prisma.question.count();
    console.log(`📝 Total Questions: ${totalQuestions.toLocaleString()}`);
    console.log(`🎯 Progress to 1M: ${((totalQuestions / 1000000) * 100).toFixed(2)}%\n`);
    
    // Get questions by subject
    const subjectCounts = await prisma.question.groupBy({
      by: ['subjectId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    // Get subject names
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true }
    });
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
    
    console.log('📚 Questions by Subject:');
    console.log('-'.repeat(30));
    
    subjectCounts.forEach(item => {
      const subjectName = subjectMap.get(item.subjectId) || 'Unknown';
      const count = item._count.id;
      const percentage = ((count / totalQuestions) * 100).toFixed(1);
      const status = count >= 50000 ? '✅' : count >= 10000 ? '🟡' : '🔴';
      
      console.log(`${status} ${subjectName.substring(0, 35).padEnd(35)} ${count.toLocaleString().padStart(8)} (${percentage}%)`);
    });
    
    // Summary
    const completedSubjects = subjectCounts.filter(s => s._count.id >= 50000).length;
    const inProgressSubjects = subjectCounts.filter(s => s._count.id >= 10000 && s._count.id < 50000).length;
    const pendingSubjects = subjectCounts.filter(s => s._count.id < 10000).length;
    
    console.log('\n📊 Summary:');
    console.log(`✅ Completed (50k+): ${completedSubjects}`);
    console.log(`🟡 In Progress (10k-50k): ${inProgressSubjects}`);
    console.log(`🔴 Pending (<10k): ${pendingSubjects}`);
    
    // Recent activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentQuestions = await prisma.question.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    });
    
    console.log(`\n🔥 Recent Activity (1h): ${recentQuestions.toLocaleString()} questions`);
    
    if (recentQuestions > 0) {
      console.log('✅ Generation is ACTIVE');
    } else {
      console.log('⏸️  Generation appears PAUSED');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  quickStatus();
}

export { quickStatus };
