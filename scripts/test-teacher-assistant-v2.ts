#!/usr/bin/env tsx

/**
 * Test script for Teacher Assistant V2
 * Tests the tRPC router functionality
 */

import { PrismaClient } from '@prisma/client';
import { createTRPCMsw } from 'msw-trpc';
import { teacherAssistantV2Router } from '../src/features/teacher-assistant-v2/server/router';
import { createTRPCContext } from '../src/server/api/trpc';

// Mock session for testing
const mockTeacherSession = {
  user: {
    id: 'test-teacher-id',
    name: 'Test Teacher',
    email: 'teacher@test.com',
    userType: 'CAMPUS_TEACHER' as const,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const mockContext = {
  session: mockTeacherSession,
  prisma: new PrismaClient(),
  req: {} as any,
  res: {} as any,
};

async function testTeacherAssistantV2() {
  console.log('🧪 Testing Teacher Assistant V2 Router...\n');

  try {
    // Test 1: Generate Response
    console.log('📝 Test 1: Generate Response');
    console.log('Input: "Create a math worksheet for grade 5"');
    
    const caller = teacherAssistantV2Router.createCaller(mockContext);
    
    const response = await caller.generateResponse({
      message: 'Create a math worksheet for grade 5 students about fractions',
      teacherContext: {
        teacher: {
          id: 'test-teacher-id',
          name: 'Test Teacher',
          subjects: ['Mathematics', 'Science'],
        },
        currentClass: {
          id: 'test-class-id',
          name: 'Grade 5A',
          subject: {
            id: 'math-subject-id',
            name: 'Mathematics',
          },
        },
        currentPage: 'Teacher Assistant V2',
      },
    });

    console.log('✅ Response generated successfully!');
    console.log('Content preview:', response.content.substring(0, 200) + '...');
    console.log('Usage:', response.usage);
    console.log('Finish reason:', response.finishReason);
    console.log('');

    // Test 2: Save Document
    console.log('📄 Test 2: Save Document');
    
    const document = await caller.saveDocument({
      title: 'Grade 5 Fractions Worksheet',
      content: response.content,
      kind: 'text',
    });

    console.log('✅ Document saved successfully!');
    console.log('Document ID:', document.id);
    console.log('Title:', document.title);
    console.log('Kind:', document.kind);
    console.log('');

    // Test 3: Get Document
    console.log('📖 Test 3: Get Document');
    
    const retrievedDoc = await caller.getDocument({
      id: document.id,
    });

    console.log('✅ Document retrieved successfully!');
    console.log('Retrieved ID:', retrievedDoc.id);
    console.log('Retrieved Title:', retrievedDoc.title);
    console.log('Content length:', retrievedDoc.content.length);
    console.log('');

    // Test 4: Get Chat History
    console.log('💬 Test 4: Get Chat History');
    
    const chatHistory = await caller.getChatHistory({
      limit: 10,
    });

    console.log('✅ Chat history retrieved successfully!');
    console.log('Messages count:', chatHistory.messages.length);
    console.log('Next cursor:', chatHistory.nextCursor);
    console.log('');

    console.log('🎉 All tests passed! Teacher Assistant V2 is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Test authentication failure
async function testAuthenticationFailure() {
  console.log('🔒 Testing Authentication Failure...\n');

  const mockUnauthenticatedContext = {
    session: null,
    prisma: new PrismaClient(),
    req: {} as any,
    res: {} as any,
  };

  try {
    const caller = teacherAssistantV2Router.createCaller(mockUnauthenticatedContext);
    
    await caller.generateResponse({
      message: 'Test message',
      teacherContext: {
        teacher: {
          id: 'test-teacher-id',
          name: 'Test Teacher',
          subjects: [],
        },
      },
    });

    console.log('❌ Authentication test failed - should have thrown an error');
    process.exit(1);

  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') {
      console.log('✅ Authentication test passed - correctly rejected unauthenticated request');
    } else {
      console.log('❌ Authentication test failed - wrong error type:', error);
      process.exit(1);
    }
  }
}

// Test non-teacher user
async function testNonTeacherUser() {
  console.log('👤 Testing Non-Teacher User...\n');

  const mockStudentSession = {
    user: {
      id: 'test-student-id',
      name: 'Test Student',
      email: 'student@test.com',
      userType: 'CAMPUS_STUDENT' as const,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockStudentContext = {
    session: mockStudentSession,
    prisma: new PrismaClient(),
    req: {} as any,
    res: {} as any,
  };

  try {
    const caller = teacherAssistantV2Router.createCaller(mockStudentContext);
    
    await caller.generateResponse({
      message: 'Test message',
      teacherContext: {
        teacher: {
          id: 'test-teacher-id',
          name: 'Test Teacher',
          subjects: [],
        },
      },
    });

    console.log('❌ Authorization test failed - should have thrown an error');
    process.exit(1);

  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') {
      console.log('✅ Authorization test passed - correctly rejected non-teacher user');
    } else {
      console.log('❌ Authorization test failed - wrong error type:', error);
      process.exit(1);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Teacher Assistant V2 Tests\n');
  console.log('=' .repeat(50));
  
  await testTeacherAssistantV2();
  await testAuthenticationFailure();
  await testNonTeacherUser();
  
  console.log('=' .repeat(50));
  console.log('🎉 All tests completed successfully!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testTeacherAssistantV2, testAuthenticationFailure, testNonTeacherUser };
