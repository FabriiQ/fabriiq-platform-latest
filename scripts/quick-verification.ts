import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickVerification() {
  try {
    console.log('🔍 Quick Database Verification');
    console.log('================================');

    // Get total question count
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions in database: ${totalQuestions}`);

    // Get questions by subject
    const questionsBySubject = await prisma.question.groupBy({
      by: ['subjectId'],
      _count: {
        id: true
      }
    });

    console.log('\n📚 Questions by Subject:');
    for (const group of questionsBySubject) {
      const subject = await prisma.subject.findUnique({
        where: { id: group.subjectId },
        select: { name: true, code: true }
      });
      console.log(`   ${subject?.name} (${subject?.code}): ${group._count.id} questions`);
    }

    // Get recent questions (last 10)
    const recentQuestions = await prisma.question.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        subject: {
          select: {
            name: true,
            code: true
          }
        },
        createdAt: true
      }
    });

    console.log('\n🕒 Most Recent Questions:');
    recentQuestions.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.title} (${q.subject.name}) - ${q.createdAt.toISOString()}`);
    });

    // Get questions created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.question.count({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    console.log(`\n⏰ Questions created in the last hour: ${recentCount}`);

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickVerification();
