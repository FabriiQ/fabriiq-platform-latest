const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema and relationships...');
    
    // Check TopicMastery table structure
    const topicMasterySchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'topic_masteries' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 TopicMastery table structure:');
    console.log(topicMasterySchema);
    
    // Check foreign key constraints
    const foreignKeys = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'topic_masteries';
    `;
    
    console.log('\n🔗 Foreign key constraints for topic_masteries:');
    console.log(foreignKeys);
    
    // Check if users table has the expected structure
    const usersSchema = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `;
    
    console.log('\n👥 Users table structure:');
    console.log(usersSchema);
    
    // Check sample user IDs
    const sampleUsers = await prisma.user.findMany({
      where: {
        userType: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        userType: true
      },
      take: 5
    });
    
    console.log('\n👤 Sample student users:');
    console.log(sampleUsers);
    
    // Check subject topics
    const sampleTopics = await prisma.subjectTopic.findMany({
      select: {
        id: true,
        title: true,
        subjectId: true
      },
      take: 5
    });
    
    console.log('\n📚 Sample subject topics:');
    console.log(sampleTopics);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
