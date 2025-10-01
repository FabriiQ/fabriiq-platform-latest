const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    // Create or find institution
    let institution = await prisma.institution.findFirst({
      where: { code: 'TEST' }
    });
    
    if (!institution) {
      institution = await prisma.institution.create({
        data: {
          name: 'Test Institution',
          code: 'TEST',
          status: 'ACTIVE'
        }
      });
      console.log('Created test institution');
    }
    
    // Create test admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        password: hashedPassword,
        status: 'ACTIVE'
      },
      create: {
        name: 'Test Admin',
        email: 'admin@test.com',
        username: 'admin',
        password: hashedPassword,
        userType: 'SYSTEM_ADMIN',
        accessScope: 'SYSTEM',
        status: 'ACTIVE',
        institutionId: institution.id
      }
    });
    
    console.log('Created/updated test admin user:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      userType: adminUser.userType
    });
    
    // Create test teacher user
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@test.com' },
      update: {
        password: hashedPassword,
        status: 'ACTIVE'
      },
      create: {
        name: 'Test Teacher',
        email: 'teacher@test.com',
        username: 'teacher',
        password: hashedPassword,
        userType: 'TEACHER',
        accessScope: 'SINGLE_CAMPUS',
        status: 'ACTIVE',
        institutionId: institution.id
      }
    });
    
    console.log('Created/updated test teacher user:', {
      id: teacherUser.id,
      username: teacherUser.username,
      email: teacherUser.email,
      userType: teacherUser.userType
    });
    
    console.log('\nTest users created successfully!');
    console.log('You can now login with:');
    console.log('- Username: admin, Password: Password123!');
    console.log('- Username: teacher, Password: Password123!');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
