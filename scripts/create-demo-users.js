const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createDemoUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking existing users...');
    const existingUsers = await prisma.user.findMany({
      select: { username: true, email: true, userType: true, status: true }
    });
    
    console.log('Existing users:', existingUsers);
    
    if (existingUsers.length === 0) {
      console.log('No users found. Creating demo users...');
      
      // Create institution first
      const institution = await prisma.institution.upsert({
        where: { code: 'DEMO-INST' },
        update: {},
        create: {
          name: 'Demo Institution',
          code: 'DEMO-INST',
          status: 'ACTIVE'
        }
      });
      
      // Create campus
      const campus = await prisma.campus.upsert({
        where: { code: 'DEMO-CAMPUS' },
        update: {},
        create: {
          name: 'Demo Campus',
          code: 'DEMO-CAMPUS',
          institutionId: institution.id,
          status: 'ACTIVE'
        }
      });
      
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      
      const demoUsers = [
        {
          name: 'System Administrator',
          email: 'admin@demo.edu',
          username: 'sys_admin',
          userType: 'SYSTEM_ADMIN',
          accessScope: 'SYSTEM'
        },
        {
          name: 'Michael Smith',
          email: 'michael.smith@demo.edu',
          username: 'michael_smith',
          userType: 'CAMPUS_ADMIN',
          accessScope: 'SINGLE_CAMPUS'
        },
        {
          name: 'Demo Teacher',
          email: 'teacher@demo.edu',
          username: 'teacher',
          userType: 'TEACHER',
          accessScope: 'SINGLE_CAMPUS'
        },
        {
          name: 'Demo Student',
          email: 'student@demo.edu',
          username: 'student',
          userType: 'STUDENT',
          accessScope: 'SINGLE_CAMPUS'
        }
      ];
      
      for (const userData of demoUsers) {
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            status: 'ACTIVE',
            institutionId: institution.id,
            primaryCampusId: campus.id
          }
        });
        console.log('Created user:', user.username);
      }
      
      console.log('Demo users created successfully!');
    } else {
      console.log('Users already exist. Updating passwords...');
      
      const hashedPassword = await bcrypt.hash('Password123!', 12);
      
      for (const user of existingUsers) {
        await prisma.user.update({
          where: { username: user.username },
          data: { 
            password: hashedPassword,
            status: 'ACTIVE'
          }
        });
        console.log('Updated password for:', user.username);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers();
