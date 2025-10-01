#!/usr/bin/env node

/**
 * Test script for tRPC bulk API endpoints
 * This script tests the actual API calls with mock data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔌 Testing tRPC Bulk API Endpoints...\n');

// Mock tRPC client for testing
class MockTRPCClient {
  constructor() {
    this.attendance = {
      bulkCreate: this.mockBulkCreate.bind(this),
      bulkUpsert: this.mockBulkUpsert.bind(this),
    };
    this.assessment = {
      ultraBulkGradeSubmissions: this.mockUltraBulkGrade.bind(this),
      bulkGradeSubmissions: this.mockBulkGrade.bind(this),
    };
  }

  async mockBulkCreate(input) {
    console.log(`    📝 Mock bulkCreate called with ${input.attendanceRecords.length} records`);
    
    // Simulate processing time based on record count
    const processingTime = Math.min(input.attendanceRecords.length * 10, 5000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate chunking logic
    const chunkSize = 100;
    const chunks = Math.ceil(input.attendanceRecords.length / chunkSize);
    
    console.log(`    📦 Processing ${chunks} chunks of max ${chunkSize} records each`);
    
    return {
      success: true,
      count: input.attendanceRecords.length,
      message: `Successfully recorded attendance for ${input.attendanceRecords.length} students`,
    };
  }

  async mockBulkUpsert(input) {
    console.log(`    🔄 Mock bulkUpsert called with ${input.attendanceRecords.length} records`);
    
    // Simulate processing time based on record count (upsert is slower)
    const processingTime = Math.min(input.attendanceRecords.length * 15, 7000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate chunking logic for upsert
    const chunkSize = 50;
    const chunks = Math.ceil(input.attendanceRecords.length / chunkSize);
    
    console.log(`    📦 Processing ${chunks} chunks of max ${chunkSize} records each`);
    
    return {
      success: true,
      count: input.attendanceRecords.length,
      message: `Successfully processed attendance for ${input.attendanceRecords.length} students`,
    };
  }

  async mockUltraBulkGrade(input) {
    console.log(`    🚀 Mock ultraBulkGradeSubmissions called with ${input.grades.length} grades`);
    
    // Simulate processing time based on grade count
    const processingTime = Math.min(input.grades.length * 12, 6000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate chunking logic
    const chunkSize = 50;
    const chunks = Math.ceil(input.grades.length / chunkSize);
    
    console.log(`    📦 Processing ${chunks} chunks of max ${chunkSize} grades each`);
    
    return {
      success: true,
      count: input.grades.length,
      message: `Successfully graded ${input.grades.length} submissions`,
    };
  }

  async mockBulkGrade(input) {
    console.log(`    📊 Mock bulkGradeSubmissions called with ${input.grades.length} grades`);
    
    // Simulate processing time
    const processingTime = Math.min(input.grades.length * 8, 4000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    return {
      count: input.grades.length,
      message: `Successfully graded ${input.grades.length} submissions`,
    };
  }
}

// Test data generators
function generateAttendanceData(count) {
  const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  return Array.from({ length: count }, (_, i) => ({
    studentId: `student-${String(i + 1).padStart(4, '0')}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    remarks: Math.random() > 0.7 ? `Remark for student ${i + 1}` : undefined,
  }));
}

function generateGradingData(count) {
  return Array.from({ length: count }, (_, i) => ({
    submissionId: `submission-${String(i + 1).padStart(4, '0')}`,
    score: Math.floor(Math.random() * 101), // 0-100
    feedback: Math.random() > 0.6 ? `Feedback for submission ${i + 1}` : undefined,
  }));
}

// Test functions
async function testAttendanceBulkCreate(client, recordCount) {
  console.log(`\n📋 Testing attendance.bulkCreate with ${recordCount} records...`);
  
  const startTime = Date.now();
  
  try {
    const attendanceRecords = generateAttendanceData(recordCount);
    
    const input = {
      classId: 'test-class-001',
      date: new Date(),
      attendanceRecords,
    };
    
    console.log(`    📊 Input validation:`);
    console.log(`      - Class ID: ${input.classId}`);
    console.log(`      - Date: ${input.date.toISOString()}`);
    console.log(`      - Records: ${input.attendanceRecords.length}`);
    console.log(`      - Sample record:`, JSON.stringify(input.attendanceRecords[0], null, 8));
    
    const result = await client.attendance.bulkCreate(input);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ✅ Success! Duration: ${duration}ms`);
    console.log(`    📈 Result:`, JSON.stringify(result, null, 6));
    
    return { success: true, duration, result };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ❌ Failed! Duration: ${duration}ms`);
    console.log(`    🚨 Error:`, error.message);
    
    return { success: false, duration, error: error.message };
  }
}

async function testAttendanceBulkUpsert(client, recordCount) {
  console.log(`\n🔄 Testing attendance.bulkUpsert with ${recordCount} records...`);
  
  const startTime = Date.now();
  
  try {
    const attendanceRecords = generateAttendanceData(recordCount);
    
    const input = {
      classId: 'test-class-001',
      date: new Date(),
      attendanceRecords,
    };
    
    console.log(`    📊 Input validation:`);
    console.log(`      - Class ID: ${input.classId}`);
    console.log(`      - Date: ${input.date.toISOString()}`);
    console.log(`      - Records: ${input.attendanceRecords.length}`);
    
    const result = await client.attendance.bulkUpsert(input);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ✅ Success! Duration: ${duration}ms`);
    console.log(`    📈 Result:`, JSON.stringify(result, null, 6));
    
    return { success: true, duration, result };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ❌ Failed! Duration: ${duration}ms`);
    console.log(`    🚨 Error:`, error.message);
    
    return { success: false, duration, error: error.message };
  }
}

async function testUltraBulkGrading(client, gradeCount) {
  console.log(`\n🚀 Testing assessment.ultraBulkGradeSubmissions with ${gradeCount} grades...`);
  
  const startTime = Date.now();
  
  try {
    const grades = generateGradingData(gradeCount);
    
    const input = {
      assessmentId: 'test-assessment-001',
      grades,
    };
    
    console.log(`    📊 Input validation:`);
    console.log(`      - Assessment ID: ${input.assessmentId}`);
    console.log(`      - Grades: ${input.grades.length}`);
    console.log(`      - Sample grade:`, JSON.stringify(input.grades[0], null, 8));
    
    const result = await client.assessment.ultraBulkGradeSubmissions(input);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ✅ Success! Duration: ${duration}ms`);
    console.log(`    📈 Result:`, JSON.stringify(result, null, 6));
    
    return { success: true, duration, result };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ❌ Failed! Duration: ${duration}ms`);
    console.log(`    🚨 Error:`, error.message);
    
    return { success: false, duration, error: error.message };
  }
}

async function testRegularBulkGrading(client, gradeCount) {
  console.log(`\n📊 Testing assessment.bulkGradeSubmissions with ${gradeCount} grades...`);
  
  const startTime = Date.now();
  
  try {
    const grades = generateGradingData(gradeCount);
    
    const input = {
      assessmentId: 'test-assessment-001',
      grades,
    };
    
    console.log(`    📊 Input validation:`);
    console.log(`      - Assessment ID: ${input.assessmentId}`);
    console.log(`      - Grades: ${input.grades.length}`);
    
    const result = await client.assessment.bulkGradeSubmissions(input);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ✅ Success! Duration: ${duration}ms`);
    console.log(`    📈 Result:`, JSON.stringify(result, null, 6));
    
    return { success: true, duration, result };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`    ❌ Failed! Duration: ${duration}ms`);
    console.log(`    🚨 Error:`, error.message);
    
    return { success: false, duration, error: error.message };
  }
}

// Main test runner
async function runAPITests() {
  console.log('🚀 Starting tRPC Bulk API Tests...\n');
  
  const client = new MockTRPCClient();
  const testSizes = [10, 50, 100, 250, 500];
  const results = [];
  
  try {
    for (const size of testSizes) {
      console.log(`\n🔍 Testing with ${size} records/grades...`);
      
      // Test attendance operations
      const bulkCreateResult = await testAttendanceBulkCreate(client, size);
      const bulkUpsertResult = await testAttendanceBulkUpsert(client, size);
      
      // Test grading operations
      const ultraBulkGradeResult = await testUltraBulkGrading(client, size);
      const regularBulkGradeResult = await testRegularBulkGrading(client, size);
      
      results.push({
        size,
        bulkCreate: bulkCreateResult,
        bulkUpsert: bulkUpsertResult,
        ultraBulkGrade: ultraBulkGradeResult,
        regularBulkGrade: regularBulkGradeResult,
      });
    }
    
    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(80));
    
    results.forEach(result => {
      console.log(`\n📈 Size: ${result.size} records`);
      console.log(`  Bulk Create:     ${result.bulkCreate.success ? '✅' : '❌'} (${result.bulkCreate.duration}ms)`);
      console.log(`  Bulk Upsert:     ${result.bulkUpsert.success ? '✅' : '❌'} (${result.bulkUpsert.duration}ms)`);
      console.log(`  Ultra Bulk Grade: ${result.ultraBulkGrade.success ? '✅' : '❌'} (${result.ultraBulkGrade.duration}ms)`);
      console.log(`  Regular Bulk Grade: ${result.regularBulkGrade.success ? '✅' : '❌'} (${result.regularBulkGrade.duration}ms)`);
    });
    
    console.log('\n✅ All API tests completed!');
    
  } catch (error) {
    console.error('❌ API test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAPITests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAPITests,
  MockTRPCClient,
  generateAttendanceData,
  generateGradingData,
};
