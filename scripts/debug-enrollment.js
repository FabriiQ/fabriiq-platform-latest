const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugEnrollment() {
  try {
    console.log('Debugging enrollment...');
    
    // Get all enrollments to see what's available
    const enrollments = await prisma.studentEnrollment.findMany({
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true
              }
            }
          }
        }
      },
      take: 10
    });
    
    console.log(`Found ${enrollments.length} enrollments:`);
    enrollments.forEach((enrollment, index) => {
      console.log(`\n${index + 1}. Enrollment ID: ${enrollment.id}`);
      console.log(`   Student: ${enrollment.student.user.name}`);
      console.log(`   Class: ${enrollment.class.name}`);
      console.log(`   Class ID: ${enrollment.class.id}`);
      console.log(`   Program Campus ID: ${enrollment.class.programCampusId}`);
      if (enrollment.class.programCampus) {
        console.log(`   Program Campus: ${enrollment.class.programCampus.program.name} at ${enrollment.class.programCampus.campus.name}`);
      } else {
        console.log(`   Program Campus: null`);
      }
    });
    
    // Check the specific enrollment
    const targetEnrollment = await prisma.studentEnrollment.findUnique({
      where: { id: 'cmedy2g9v0007fmjzlz1pu8jg' },
      include: {
        student: {
          include: {
            user: true
          }
        },
        class: {
          include: {
            programCampus: {
              include: {
                program: true,
                campus: true
              }
            }
          }
        }
      }
    });
    
    if (targetEnrollment) {
      console.log('\n🎯 Target enrollment details:');
      console.log('   ID:', targetEnrollment.id);
      console.log('   Student:', targetEnrollment.student.user.name);
      console.log('   Class:', targetEnrollment.class.name);
      console.log('   Class ID:', targetEnrollment.class.id);
      console.log('   Program Campus ID:', targetEnrollment.class.programCampusId);
      
      if (targetEnrollment.class.programCampus) {
        console.log('   Program Campus:', targetEnrollment.class.programCampus.program.name, 'at', targetEnrollment.class.programCampus.campus.name);
      } else {
        console.log('   Program Campus: null (this is the issue!)');
        
        // Check if the class exists and has programCampusId
        const classData = await prisma.class.findUnique({
          where: { id: targetEnrollment.class.id }
        });
        console.log('   Raw class data:', classData);
      }
    } else {
      console.log('\n❌ Target enrollment not found');
    }
    
  } catch (error) {
    console.error('❌ Error debugging enrollment:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEnrollment();
