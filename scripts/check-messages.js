const { PrismaClient } = require('@prisma/client');

async function checkMessages() {
  const prisma = new PrismaClient();
  
  try {
    const systemMessages = await prisma.socialPost.findMany({
      where: { messageType: 'SYSTEM' },
      include: {
        author: { select: { name: true, userType: true } },
        class: { select: { name: true, code: true } }
      }
    });
    
    console.log('System messages found:', systemMessages.length);
    systemMessages.forEach(msg => {
      console.log('- ', msg.content.substring(0, 50) + '...');
    });
    
    const moderationQueue = await prisma.moderationQueue.findMany();
    console.log('Moderation queue entries:', moderationQueue.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
