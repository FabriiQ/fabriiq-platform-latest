#!/usr/bin/env node

/**
 * Test Advanced Assessment Sessions functionality
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdvancedSessions() {
  console.log('🧪 Testing Advanced Assessment Sessions functionality...\n');

  try {
    // Test 1: Create a test session
    console.log('1. Creating test session...');
    const testSession = await prisma.advancedAssessmentSession.create({
      data: {
        id: 'test-session-' + Date.now(),
        activityId: 'cmfd03vnf0003vof5jdwlwzk3', // Real activity ID
        studentId: 'cmesy1b6r05xid9o9cuxvfpdq', // Real student ID
        assessmentMode: 'CAT',
        sessionData: {
          currentQuestionIndex: 0,
          responses: [],
          adaptiveState: {
            theta: 0,
            standardError: 1
          }
        },
        startedAt: new Date(),
        lastAccessedAt: new Date()
      }
    });
    console.log('✅ Test session created:', testSession.id);

    // Test 2: Retrieve the session
    console.log('\n2. Retrieving test session...');
    const retrievedSession = await prisma.advancedAssessmentSession.findUnique({
      where: { id: testSession.id }
    });
    console.log('✅ Session retrieved successfully');

    // Test 3: Update the session
    console.log('\n3. Updating test session...');
    const updatedSession = await prisma.advancedAssessmentSession.update({
      where: { id: testSession.id },
      data: {
        sessionData: {
          currentQuestionIndex: 1,
          responses: [{ questionId: 'q1', answer: 'A', correct: true }],
          adaptiveState: {
            theta: 0.5,
            standardError: 0.8
          }
        },
        lastAccessedAt: new Date()
      }
    });
    console.log('✅ Session updated successfully');

    // Test 4: Query sessions by student
    console.log('\n4. Querying sessions by student...');
    const studentSessions = await prisma.advancedAssessmentSession.findMany({
      where: {
        studentId: 'cmesy1b6r05xid9o9cuxvfpdq', // Real student ID
        isActive: true
      }
    });
    console.log(`✅ Found ${studentSessions.length} active sessions for student`);

    // Test 5: Clean up test session
    console.log('\n5. Cleaning up test session...');
    await prisma.advancedAssessmentSession.delete({
      where: { id: testSession.id }
    });
    console.log('✅ Test session cleaned up');

    console.log('\n🎉 All Advanced Assessment Sessions tests passed!');
    console.log('\n📋 Functionality verified:');
    console.log('   • Session creation ✅');
    console.log('   • Session retrieval ✅');
    console.log('   • Session updates ✅');
    console.log('   • Session queries ✅');
    console.log('   • Session deletion ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testAdvancedSessions().catch(console.error);
}

module.exports = { testAdvancedSessions };
