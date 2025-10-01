const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedStudentsAndFees() {
  try {
    console.log('👨‍🎓 Starting students and fee management seeding...');
    
    // Get existing data
    const institution = await prisma.institution.findFirst({ where: { code: 'OXFORD-ACADEMY' } });
    const campus = await prisma.campus.findFirst({ where: { code: 'OXFORD-MAIN' } });
    const academicCycle = await prisma.academicCycle.findFirst({ where: { code: 'AY2024-25' } });
    const program = await prisma.program.findFirst({ where: { code: 'PRIMARY-ENG' } });
    const classRoom = await prisma.class.findFirst({ where: { code: 'GRADE5-A' } });
    const admin = await prisma.user.findFirst({ where: { email: 'admin@oxfordacademy.edu' } });

    if (!institution || !campus || !academicCycle || !program || !classRoom || !admin) {
      throw new Error('Required base data not found. Please run comprehensive-seed.js first.');
    }

    const hashedPassword = await bcrypt.hash('Password123!', 12);

    // 1. Create Students
    console.log('👨‍🎓 Creating students...');
    const studentData = [
      { name: 'Alice Johnson', username: 'alice.johnson', email: 'alice.johnson@student.oxfordacademy.edu' },
      { name: 'Bob Smith', username: 'bob.smith', email: 'bob.smith@student.oxfordacademy.edu' },
      { name: 'Charlie Brown', username: 'charlie.brown', email: 'charlie.brown@student.oxfordacademy.edu' },
      { name: 'Diana Prince', username: 'diana.prince', email: 'diana.prince@student.oxfordacademy.edu' },
      { name: 'Edward Wilson', username: 'edward.wilson', email: 'edward.wilson@student.oxfordacademy.edu' },
      { name: 'Fiona Davis', username: 'fiona.davis', email: 'fiona.davis@student.oxfordacademy.edu' },
      { name: 'George Miller', username: 'george.miller', email: 'george.miller@student.oxfordacademy.edu' },
      { name: 'Hannah Taylor', username: 'hannah.taylor', email: 'hannah.taylor@student.oxfordacademy.edu' },
      { name: 'Ian Anderson', username: 'ian.anderson', email: 'ian.anderson@student.oxfordacademy.edu' },
      { name: 'Julia Martinez', username: 'julia.martinez', email: 'julia.martinez@student.oxfordacademy.edu' }
    ];

    const students = [];
    for (let i = 0; i < studentData.length; i++) {
      const studentInfo = studentData[i];
      const student = await prisma.user.upsert({
        where: { email: studentInfo.email },
        update: { password: hashedPassword },
        create: {
          name: studentInfo.name,
          email: studentInfo.email,
          username: studentInfo.username,
          password: hashedPassword,
          userType: 'STUDENT',
          accessScope: 'SINGLE_CAMPUS',
          status: 'ACTIVE',
          institutionId: institution.id,
          primaryCampusId: campus.id
        }
      });
      students.push(student);
    }
    console.log(`✅ Created ${students.length} students`);

    // 2. Create Student Enrollments
    console.log('📝 Creating student enrollments...');
    const enrollments = [];
    for (const student of students) {
      const enrollment = await prisma.studentEnrollment.upsert({
        where: {
          studentId_classId_academicCycleId: {
            studentId: student.id,
            classId: classRoom.id,
            academicCycleId: academicCycle.id
          }
        },
        update: {},
        create: {
          studentId: student.id,
          classId: classRoom.id,
          academicCycleId: academicCycle.id,
          enrollmentDate: new Date('2024-09-01'),
          status: 'ACTIVE',
          enrollmentNumber: `ENR-2024-${String(enrollments.length + 1).padStart(4, '0')}`
        }
      });
      enrollments.push(enrollment);
    }
    console.log(`✅ Created ${enrollments.length} student enrollments`);

    // 3. Create Fee Structure (simplified for existing schema)
    console.log('💰 Creating fee structure...');
    const programCampusRecord = await prisma.programCampus.findFirst({
      where: { programId: program.id, campusId: campus.id }
    });

    const feeStructure = await prisma.feeStructure.upsert({
      where: {
        programCampusId_academicCycleId: {
          programCampusId: programCampusRecord.id,
          academicCycleId: academicCycle.id
        }
      },
      update: {},
      create: {
        name: 'Oxford Academy Primary Fee Structure 2024-25',
        description: 'Annual fee structure for primary students',
        academicCycleId: academicCycle.id,
        programCampusId: programCampusRecord.id,
        status: 'ACTIVE',
        createdById: admin.id,
        isActive: true,
        totalAmount: 6400 // Sum of all fees
      }
    });
    console.log('✅ Fee structure created');

    // 4. Create Enrollment Fees for each student
    console.log('💳 Creating enrollment fees...');
    const enrollmentFees = [];
    for (const enrollment of enrollments) {
      const enrollmentFee = await prisma.enrollmentFee.create({
        data: {
          enrollmentId: enrollment.id,
          feeStructureId: feeStructure.id,
          baseAmount: 6400,
          discountedAmount: 6400,
          finalAmount: 6400,
          dueDate: new Date('2024-10-15'),
          status: 'PENDING',
          createdById: admin.id
        }
      });
      enrollmentFees.push(enrollmentFee);
    }
    console.log(`✅ Created ${enrollmentFees.length} enrollment fees`);

    return {
      students,
      enrollments,
      feeStructure,
      enrollmentFees
    };

  } catch (error) {
    console.error('❌ Error seeding students and fees:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { seedStudentsAndFees };

if (require.main === module) {
  seedStudentsAndFees()
    .then(() => {
      console.log('🎉 Students and fee management seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Students and fees seeding failed:', error);
      process.exit(1);
    });
}
