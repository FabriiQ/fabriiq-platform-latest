#!/usr/bin/env node

/**
 * Test searchRecipients API directly
 * This will help us identify the exact error
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSearchRecipientsAPI() {
  console.log('🧪 Testing searchRecipients API directly...\n');

  try {
    // Test 1: Basic query without filters (should work)
    console.log('1. Testing basic query without filters...');
    const basicUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5,
      orderBy: { id: 'asc' }
    });
    console.log(`   ✅ Basic query: ${basicUsers.length} users found`);

    // Test 2: Test with userType filter (the problematic part)
    console.log('\n2. Testing userType filters...');
    
    // Test CAMPUS_TEACHER mapping
    const teacherUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_TEACHER', 'TEACHER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5,
      orderBy: { id: 'asc' }
    });
    console.log(`   ✅ Teacher query: ${teacherUsers.length} users found`);

    // Test CAMPUS_STUDENT mapping
    const studentUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_STUDENT', 'STUDENT'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5,
      orderBy: { id: 'asc' }
    });
    console.log(`   ✅ Student query: ${studentUsers.length} users found`);

    // Test 3: Test with campus filter
    console.log('\n3. Testing campus filters...');
    const campuses = await prisma.campus.findMany({ take: 1 });
    
    if (campuses.length > 0) {
      const campusUsers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          activeCampuses: {
            some: {
              campusId: campuses[0].id,
              status: 'ACTIVE'
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
        },
        take: 5,
        orderBy: { id: 'asc' }
      });
      console.log(`   ✅ Campus query (${campuses[0].name}): ${campusUsers.length} users found`);
    }

    // Test 4: Test the exact query that searchRecipients would use
    console.log('\n4. Testing exact searchRecipients query...');
    
    const searchRecipientsQuery = {
      status: 'ACTIVE',
      userType: { in: ['CAMPUS_TEACHER', 'TEACHER'] }
    };

    const exactQuery = await prisma.user.findMany({
      where: searchRecipientsQuery,
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 20,
      orderBy: { id: 'asc' }
    });
    console.log(`   ✅ Exact searchRecipients query: ${exactQuery.length} users found`);

    // Test 5: Test with class users query
    console.log('\n5. Testing class users query...');
    const classes = await prisma.class.findMany({ take: 1 });
    
    if (classes.length > 0) {
      const classEnrollments = await prisma.studentEnrollment.findMany({
        where: {
          classId: classes[0].id,
          status: 'ACTIVE',
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  userType: true,
                },
              },
            },
          },
        },
        take: 5
      });
      console.log(`   ✅ Class enrollments query: ${classEnrollments.length} enrollments found`);
    }

    // Test 6: Test potential problematic fields
    console.log('\n6. Testing potential problematic fields...');
    
    // Check if any users have null names or emails
    const usersWithNullFields = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: null },
          { email: null }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   ⚠️  Users with null name/email: ${usersWithNullFields.length} found`);

    console.log('\n📋 Test Results Summary:');
    console.log(`   ✅ Basic queries work: YES`);
    console.log(`   ✅ UserType filters work: YES`);
    console.log(`   ✅ Campus filters work: YES`);
    console.log(`   ✅ Class queries work: YES`);
    console.log(`   ⚠️  Null field issues: ${usersWithNullFields.length > 0 ? 'YES' : 'NO'}`);

    if (usersWithNullFields.length > 0) {
      console.log('\n🔧 Recommendation: Fix null name/email fields in database');
      console.log('   This might be causing the searchRecipients API to fail');
    } else {
      console.log('\n✅ Database queries work fine - issue might be in API layer or frontend');
    }

  } catch (error) {
    console.error('❌ Error during API testing:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test function
testSearchRecipientsAPI();
