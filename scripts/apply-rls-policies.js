#!/usr/bin/env node

/**
 * Row Level Security (RLS) Policies Application Script
 * 
 * This script safely applies RLS policies to the FabriiQ database.
 * It addresses the critical security vulnerability of 97+ tables without RLS.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🔒 FabriiQ Row Level Security (RLS) Implementation');
console.log('==================================================');

/**
 * Initialize Prisma client with proper configuration
 */
function initializePrisma() {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}

/**
 * Check current RLS status of all tables
 */
async function checkCurrentRLSStatus(prisma) {
  console.log('\n🔍 Checking current RLS status...\n');
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        rowsecurity,
        CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as status
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    console.log('📊 Current RLS Status:');
    tables.forEach(table => {
      console.log(`  ${table.status} ${table.tablename}`);
    });
    
    const rlsEnabled = tables.filter(t => t.rowsecurity).length;
    const rlsDisabled = tables.filter(t => !t.rowsecurity).length;
    
    console.log(`\n📈 Summary:`);
    console.log(`  ✅ RLS Enabled: ${rlsEnabled} tables`);
    console.log(`  ❌ RLS Disabled: ${rlsDisabled} tables`);
    console.log(`  📊 Total: ${tables.length} tables`);
    
    return { tables, rlsEnabled, rlsDisabled };
    
  } catch (error) {
    console.error('❌ Error checking RLS status:', error.message);
    throw error;
  }
}

/**
 * Check existing policies
 */
async function checkExistingPolicies(prisma) {
  console.log('\n🔍 Checking existing policies...\n');
  
  try {
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    console.log(`📋 Found ${policies.length} existing policies:`);
    
    const policiesByTable = {};
    policies.forEach(policy => {
      if (!policiesByTable[policy.tablename]) {
        policiesByTable[policy.tablename] = [];
      }
      policiesByTable[policy.tablename].push(policy);
    });
    
    Object.entries(policiesByTable).forEach(([tableName, tablePolicies]) => {
      console.log(`  📄 ${tableName}: ${tablePolicies.length} policies`);
      tablePolicies.forEach(policy => {
        console.log(`    - ${policy.policyname} (${policy.cmd})`);
      });
    });
    
    return policies;
    
  } catch (error) {
    console.error('❌ Error checking policies:', error.message);
    throw error;
  }
}

/**
 * Apply RLS policies from SQL file
 */
async function applyRLSPolicies(prisma) {
  console.log('\n🔒 Applying RLS policies...\n');
  
  try {
    // Read the RLS policies SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'row-level-security-policies.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`RLS policies file not found: ${sqlFilePath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT'));
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip comments and SELECT statements
        if (statement.startsWith('--') || statement.toUpperCase().startsWith('SELECT')) {
          continue;
        }
        
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
        
        await prisma.$executeRawUnsafe(statement + ';');
        successCount++;
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Statement ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        
        // Continue with other statements unless it's a critical error
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  Skipping statement due to missing table/column`);
        } else {
          console.log(`⚠️  Continuing with remaining statements...`);
        }
      }
    }
    
    console.log(`\n📊 RLS Application Summary:`);
    console.log(`  ✅ Successful: ${successCount} statements`);
    console.log(`  ❌ Errors: ${errorCount} statements`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    return { successCount, errorCount, errors };
    
  } catch (error) {
    console.error('❌ Error applying RLS policies:', error.message);
    throw error;
  }
}

/**
 * Verify RLS implementation
 */
async function verifyRLSImplementation(prisma) {
  console.log('\n✅ Verifying RLS implementation...\n');
  
  try {
    // Check final RLS status
    const finalStatus = await checkCurrentRLSStatus(prisma);
    
    // Check critical tables specifically
    const criticalTables = [
      'users', 'student_profiles', 'teacher_profiles', 'classes',
      'activities', 'assessments', 'activity_grades', 'student_enrollments',
      'notifications', 'social_posts', 'attendance'
    ];
    
    console.log('\n🎯 Critical Tables RLS Status:');
    
    let criticalTablesSecured = 0;
    
    for (const tableName of criticalTables) {
      const table = finalStatus.tables.find(t => t.tablename === tableName);
      if (table) {
        const status = table.rowsecurity ? '✅' : '❌';
        console.log(`  ${status} ${tableName}`);
        if (table.rowsecurity) criticalTablesSecured++;
      } else {
        console.log(`  ⚠️  ${tableName} (table not found)`);
      }
    }
    
    console.log(`\n📈 Critical Tables Security:`);
    console.log(`  🔒 Secured: ${criticalTablesSecured}/${criticalTables.length} tables`);
    console.log(`  📊 Coverage: ${Math.round((criticalTablesSecured / criticalTables.length) * 100)}%`);
    
    return {
      totalTablesSecured: finalStatus.rlsEnabled,
      criticalTablesSecured,
      totalCriticalTables: criticalTables.length
    };
    
  } catch (error) {
    console.error('❌ Error verifying RLS implementation:', error.message);
    throw error;
  }
}

/**
 * Create RLS status report
 */
function createRLSReport(initialStatus, finalStatus, applicationResult, verificationResult) {
  const report = `# Row Level Security (RLS) Implementation Report

## Summary
- **Date**: ${new Date().toISOString()}
- **Initial RLS Enabled**: ${initialStatus.rlsEnabled} tables
- **Final RLS Enabled**: ${finalStatus.rlsEnabled} tables
- **Improvement**: +${finalStatus.rlsEnabled - initialStatus.rlsEnabled} tables secured

## Application Results
- **Successful Statements**: ${applicationResult.successCount}
- **Failed Statements**: ${applicationResult.errorCount}
- **Success Rate**: ${Math.round((applicationResult.successCount / (applicationResult.successCount + applicationResult.errorCount)) * 100)}%

## Critical Tables Security
- **Secured**: ${verificationResult.criticalTablesSecured}/${verificationResult.totalCriticalTables}
- **Coverage**: ${Math.round((verificationResult.criticalTablesSecured / verificationResult.totalCriticalTables) * 100)}%

## Security Status
${finalStatus.rlsEnabled >= 30 ? '✅ **SECURE**: Majority of tables now have RLS enabled' : '⚠️ **NEEDS ATTENTION**: More tables need RLS policies'}

## Next Steps
1. Test application functionality with RLS enabled
2. Monitor for any access issues in logs
3. Add missing policies for any remaining critical tables
4. Regular security audits to ensure policies remain effective

---
*Generated by FabriiQ RLS Implementation Script*
`;
  
  fs.writeFileSync('database/rls-implementation-report.md', report);
  console.log('\n📄 Created RLS implementation report: database/rls-implementation-report.md');
}

/**
 * Main RLS implementation function
 */
async function implementRLS() {
  const prisma = initializePrisma();
  
  try {
    console.log('🚀 Starting RLS implementation...\n');
    
    // Check initial status
    const initialStatus = await checkCurrentRLSStatus(prisma);
    
    // Check existing policies
    await checkExistingPolicies(prisma);
    
    // Apply RLS policies
    const applicationResult = await applyRLSPolicies(prisma);
    
    // Verify implementation
    const verificationResult = await verifyRLSImplementation(prisma);
    
    // Check final status
    const finalStatus = await checkCurrentRLSStatus(prisma);
    
    // Create report
    createRLSReport(initialStatus, finalStatus, applicationResult, verificationResult);
    
    console.log('\n🎉 RLS IMPLEMENTATION COMPLETED!');
    console.log('================================');
    console.log(`📊 Tables secured: ${finalStatus.rlsEnabled} (was ${initialStatus.rlsEnabled})`);
    console.log(`🔒 Critical tables: ${verificationResult.criticalTablesSecured}/${verificationResult.totalCriticalTables} secured`);
    console.log(`📈 Security improvement: +${finalStatus.rlsEnabled - initialStatus.rlsEnabled} tables`);
    
    if (finalStatus.rlsEnabled >= 30) {
      console.log('\n✅ SUCCESS: Database is now significantly more secure!');
    } else {
      console.log('\n⚠️  PARTIAL: Some tables still need RLS policies.');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Test application functionality');
    console.log('2. Monitor logs for access issues');
    console.log('3. Add any missing policies as needed');
    
  } catch (error) {
    console.error('\n💥 RLS implementation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run RLS implementation if this script is executed directly
if (require.main === module) {
  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  implementRLS();
}

module.exports = { implementRLS, checkCurrentRLSStatus };
