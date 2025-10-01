const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function simpleSeed() {
  try {
    console.log('🌱 Starting simple database seeding...');
    
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    // 1. Create Institution
    console.log('📚 Creating institution...');
    const institution = await prisma.institution.upsert({
      where: { code: 'OXFORD-ACADEMY' },
      update: {},
      create: {
        name: 'Oxford Academy International',
        code: 'OXFORD-ACADEMY',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Institution created:', institution.name);

    // 2. Create Campus
    console.log('🏫 Creating campus...');
    const campus = await prisma.campus.upsert({
      where: { code: 'OXFORD-MAIN' },
      update: {},
      create: {
        name: 'Oxford Academy Main Campus',
        code: 'OXFORD-MAIN',
        institutionId: institution.id,
        status: 'ACTIVE',
        address: {
          street: '123 Education Street',
          city: 'Learning City',
          state: 'Education State',
          zipCode: '12345',
          country: 'Education Country'
        },
        contact: {
          phone: '+1-555-0124',
          email: 'main@oxfordacademy.edu',
          website: 'https://oxfordacademy.edu'
        }
      }
    });
    console.log('✅ Campus created:', campus.name);

    // 3. Create Users
    console.log('👥 Creating users...');
    
    const users = [
      {
        name: 'System Administrator',
        email: 'admin@oxfordacademy.edu',
        username: 'admin',
        userType: 'SYSTEM_ADMIN',
        accessScope: 'SYSTEM'
      },
      {
        name: 'Sarah Johnson',
        email: 'teacher@oxfordacademy.edu',
        username: 'teacher',
        userType: 'TEACHER',
        accessScope: 'SINGLE_CAMPUS'
      },
      {
        name: 'Campus Administrator',
        email: 'campus.admin@oxfordacademy.edu',
        username: 'campus_admin',
        userType: 'CAMPUS_ADMIN',
        accessScope: 'SINGLE_CAMPUS'
      },
      {
        name: 'Parent User',
        email: 'parent@oxfordacademy.edu',
        username: 'parent',
        userType: 'CAMPUS_PARENT',
        accessScope: 'SINGLE_CAMPUS'
      },
      {
        name: 'Coordinator',
        email: 'coordinator@oxfordacademy.edu',
        username: 'coordinator',
        userType: 'COORDINATOR',
        accessScope: 'MULTI_CAMPUS'
      },
      {
        name: 'Alice Johnson',
        email: 'alice.johnson@student.oxfordacademy.edu',
        username: 'alice.johnson',
        userType: 'CAMPUS_STUDENT',
        accessScope: 'SINGLE_CAMPUS'
      },
      {
        name: 'Bob Smith',
        email: 'bob.smith@student.oxfordacademy.edu',
        username: 'bob.smith',
        userType: 'CAMPUS_STUDENT',
        accessScope: 'SINGLE_CAMPUS'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: { password: hashedPassword },
        create: {
          ...userData,
          password: hashedPassword,
          status: 'ACTIVE',
          institutionId: institution.id,
          primaryCampusId: campus.id
        }
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.name} (${user.username})`);
    }

    console.log('=' .repeat(60));
    console.log('🎉 SIMPLE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`🏢 Institution: ${institution.name}`);
    console.log(`🏫 Campus: ${campus.name}`);
    console.log(`👥 Users: ${createdUsers.length} users created`);
    console.log('=' .repeat(60));
    
    console.log('🎯 LOGIN CREDENTIALS (all use password: Password123!):');
    console.log('=' .repeat(60));
    createdUsers.forEach(user => {
      console.log(`👤 ${user.userType}: username="${user.username}"`);
    });
    console.log('=' .repeat(60));

    return {
      institution,
      campus,
      users: createdUsers
    };

  } catch (error) {
    console.error('❌ Error in simple seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  simpleSeed()
    .then(() => {
      console.log('🚀 Simple seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Simple seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { simpleSeed };
