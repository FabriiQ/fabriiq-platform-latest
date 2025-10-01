const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkAndCreateUsers() {
  const prisma = new PrismaClient();
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { username: true, email: true, userType: true, status: true, institutionId: true, primaryCampusId: true }
    });
    
    console.log('All users in database:');
    users.forEach(user => {
      console.log('- Username:', user.username, '| Type:', user.userType, '| Status:', user.status);
    });
    
    // Get institution and campus info
    const institutions = await prisma.institution.findMany();
    const campuses = await prisma.campus.findMany();
    
    console.log('\nInstitutions:', institutions.map(i => ({ name: i.name, code: i.code })));
    console.log('Campuses:', campuses.map(c => ({ name: c.name, code: c.code })));
    
    // Create missing demo users
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    const institution = institutions[0];
    const campus = campuses[0];
    
    if (!institution || !campus) {
      console.log('No institution or campus found');
      return;
    }
    
    const requiredUsers = [
      { username: 'sys_admin', name: 'System Administrator', userType: 'SYSTEM_ADMIN', email: 'sys_admin@demo.edu' },
      { username: 'michael_smith', name: 'Michael Smith', userType: 'CAMPUS_ADMIN', email: 'michael.smith@demo.edu' },
      { username: 'teacher', name: 'Demo Teacher', userType: 'TEACHER', email: 'teacher@demo.edu' },
      { username: 'student', name: 'Demo Student', userType: 'STUDENT', email: 'student@demo.edu' }
    ];
    
    for (const userData of requiredUsers) {
      const existingUser = users.find(u => u.username === userData.username);
      
      if (!existingUser) {
        console.log('Creating user:', userData.username);
        await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            userType: userData.userType,
            accessScope: userData.userType === 'SYSTEM_ADMIN' ? 'SYSTEM' : 'SINGLE_CAMPUS',
            status: 'ACTIVE',
            institutionId: institution.id,
            primaryCampusId: campus.id
          }
        });
        console.log('✅ Created:', userData.username);
      } else {
        console.log('User exists:', userData.username, '- updating password');
        await prisma.user.update({
          where: { username: userData.username },
          data: { 
            password: hashedPassword,
            status: 'ACTIVE'
          }
        });
        console.log('✅ Updated:', userData.username);
      }
    }
    
    console.log('\n🎯 LOGIN CREDENTIALS:');
    console.log('All users have password: Password123!');
    console.log('- sys_admin (System Admin)');
    console.log('- michael_smith (Campus Admin)');
    console.log('- teacher (Teacher)');
    console.log('- student (Student)');
    console.log('- admin (existing user)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUsers();
