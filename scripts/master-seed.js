const { PrismaClient } = require('@prisma/client');
const { comprehensiveSeed } = require('./comprehensive-seed');
const { seedStudentsAndFees } = require('./seed-students-and-fees');

const prisma = new PrismaClient();

async function masterSeed() {
  try {
    console.log('🚀 Starting master database seeding process...');
    console.log('=' .repeat(60));
    
    // Clear existing data (optional - be careful in production)
    console.log('🧹 Cleaning existing data...');
    
    // Delete in reverse dependency order (only delete what exists)
    try {
      await prisma.enrollmentFee.deleteMany();
    } catch (e) { console.log('EnrollmentFee table not found, skipping...'); }

    try {
      await prisma.feeStructure.deleteMany();
    } catch (e) { console.log('FeeStructure table not found, skipping...'); }

    try {
      await prisma.studentEnrollment.deleteMany();
    } catch (e) { console.log('StudentEnrollment table not found, skipping...'); }

    try {
      await prisma.subjectTopic.deleteMany();
    } catch (e) { console.log('SubjectTopic table not found, skipping...'); }

    try {
      await prisma.class.deleteMany();
    } catch (e) { console.log('Class table not found, skipping...'); }

    try {
      await prisma.subject.deleteMany();
    } catch (e) { console.log('Subject table not found, skipping...'); }

    try {
      await prisma.course.deleteMany();
    } catch (e) { console.log('Course table not found, skipping...'); }

    try {
      await prisma.programCampus.deleteMany();
    } catch (e) { console.log('ProgramCampus table not found, skipping...'); }

    try {
      await prisma.program.deleteMany();
    } catch (e) { console.log('Program table not found, skipping...'); }

    try {
      await prisma.academicCycle.deleteMany();
    } catch (e) { console.log('AcademicCycle table not found, skipping...'); }

    try {
      await prisma.campus.deleteMany();
    } catch (e) { console.log('Campus table not found, skipping...'); }

    try {
      await prisma.user.deleteMany();
    } catch (e) { console.log('User table not found, skipping...'); }

    try {
      await prisma.institution.deleteMany();
    } catch (e) { console.log('Institution table not found, skipping...'); }
    
    console.log('✅ Existing data cleaned');
    console.log('=' .repeat(60));

    // Step 1: Run comprehensive seeding
    console.log('📚 Phase 1: Creating institution, campus, programs, and curriculum...');
    const baseData = await comprehensiveSeed();
    console.log('✅ Phase 1 completed');
    console.log('=' .repeat(60));

    // Step 2: Run students and fees seeding
    console.log('👨‍🎓 Phase 2: Creating students, enrollments, and fee management...');
    const studentData = await seedStudentsAndFees();
    console.log('✅ Phase 2 completed');
    console.log('=' .repeat(60));

    // Step 3: Create additional demo users for login page
    console.log('👥 Phase 3: Creating additional demo users...');
    const hashedPassword = await require('bcryptjs').hash('Password123!', 12);
    
    const demoUsers = [
      {
        name: 'Campus Administrator',
        email: 'campus.admin@oxfordacademy.edu',
        username: 'campus_admin',
        userType: 'CAMPUS_ADMIN'
      },
      {
        name: 'Parent User',
        email: 'parent@oxfordacademy.edu',
        username: 'parent',
        userType: 'PARENT'
      },
      {
        name: 'Coordinator',
        email: 'coordinator@oxfordacademy.edu',
        username: 'coordinator',
        userType: 'COORDINATOR'
      }
    ];

    for (const userData of demoUsers) {
      await prisma.user.upsert({
        where: { email: userData.email },
        update: { password: hashedPassword },
        create: {
          ...userData,
          password: hashedPassword,
          accessScope: userData.userType === 'COORDINATOR' ? 'MULTI_CAMPUS' : 'SINGLE_CAMPUS',
          status: 'ACTIVE',
          institutionId: baseData.institution.id,
          primaryCampusId: baseData.campus.id
        }
      });
    }
    console.log('✅ Phase 3 completed - Demo users created');
    console.log('=' .repeat(60));

    // Summary
    console.log('📊 SEEDING SUMMARY:');
    console.log('=' .repeat(60));
    console.log(`🏢 Institution: ${baseData.institution.name}`);
    console.log(`🏫 Campus: ${baseData.campus.name}`);
    console.log(`📚 Program: ${baseData.program.name}`);
    console.log(`📖 Course: ${baseData.course.name}`);
    console.log(`📝 Subject: ${baseData.subject.name}`);
    console.log(`📋 Topics: ${baseData.topics.length} Oxford English topics`);
    console.log(`👨‍🎓 Students: ${studentData.students.length} students`);
    console.log(`📝 Enrollments: ${studentData.enrollments.length} enrollments`);
    console.log(`💰 Fee Structure: ${studentData.feeStructure.name}`);
    console.log(`💳 Enrollment Fees: ${studentData.enrollmentFees.length} fees created`);
    console.log('=' .repeat(60));
    
    console.log('🎯 LOGIN CREDENTIALS:');
    console.log('=' .repeat(60));
    console.log('👤 System Admin: username="admin", password="Password123!"');
    console.log('👩‍🏫 Teacher: username="teacher", password="Password123!"');
    console.log('👨‍💼 Campus Admin: username="campus_admin", password="Password123!"');
    console.log('👨‍👩‍👧‍👦 Parent: username="parent", password="Password123!"');
    console.log('🎯 Coordinator: username="coordinator", password="Password123!"');
    console.log('👨‍🎓 Students: username="alice.johnson", "bob.smith", etc., password="Password123!"');
    console.log('=' .repeat(60));

    return {
      ...baseData,
      ...studentData,
      demoUsers
    };

  } catch (error) {
    console.error('💥 Master seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  masterSeed()
    .then(() => {
      console.log('🎉 MASTER SEEDING COMPLETED SUCCESSFULLY!');
      console.log('🚀 Your Oxford Academy database is ready to use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Master seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { masterSeed };
