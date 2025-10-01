const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    // Test basic connection
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test a simple query
    console.log('Testing simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Simple query successful:', result);

    // Test if we can access the subjects table
    console.log('Testing subjects table access...');
    const subjectCount = await prisma.subject.count();
    console.log('✅ Subjects table accessible, count:', subjectCount);

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes("Can't reach database server")) {
      console.error('\n🔍 Troubleshooting suggestions:');
      console.error('1. Check if your internet connection is working');
      console.error('2. Verify the DATABASE_URL is correct');
      console.error('3. Check if Supabase service is running');
      console.error('4. Verify your Supabase project is not paused');
      console.error('5. Check if your IP is whitelisted in Supabase');
    }
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

// Load environment variables
require('dotenv').config();

testDatabaseConnection().catch(console.error);
