const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testAuth() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing authentication...');
    
    // Test user lookup
    const user = await prisma.user.findFirst({
      where: {
        username: 'sys_admin',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        password: true,
        userType: true,
        status: true
      }
    });
    
    if (!user) {
      console.log('❌ User sys_admin not found');
      return;
    }
    
    console.log('✅ User found:', {
      username: user.username,
      userType: user.userType,
      status: user.status,
      hasPassword: !!user.password
    });
    
    // Test password verification
    if (user.password) {
      const isValid = await bcrypt.compare('Password123!', user.password);
      console.log('✅ Password verification:', isValid ? 'VALID' : 'INVALID');
    } else {
      console.log('❌ No password set for user');
    }
    
    // Test other demo users
    const demoUsers = ['michael_smith', 'teacher', 'student', 'admin'];
    
    for (const username of demoUsers) {
      const testUser = await prisma.user.findFirst({
        where: { username, status: 'ACTIVE' },
        select: { username: true, userType: true, status: true }
      });
      
      if (testUser) {
        console.log(`✅ ${username}: ${testUser.userType} - ${testUser.status}`);
      } else {
        console.log(`❌ ${username}: NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
