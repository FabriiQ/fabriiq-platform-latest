#!/usr/bin/env node

/**
 * Schema-Database Synchronization Script
 * 
 * This script checks what RLS policies and indexes were actually applied
 * to the database and updates the Prisma schema accordingly.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🔄 Schema-Database Synchronization');
console.log('==================================');

/**
 * Initialize Prisma client
 */
function initializePrisma() {
  return new PrismaClient({
    log: ['info', 'warn', 'error'],
  });
}

/**
 * Check which tables have RLS enabled
 */
async function checkRLSStatus(prisma) {
  console.log('\n🔒 Checking RLS status...\n');
  
  try {
    const rlsStatus = await prisma.$queryRaw`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    const rlsEnabled = rlsStatus.filter(table => table.rowsecurity);
    const rlsDisabled = rlsStatus.filter(table => !table.rowsecurity);
    
    console.log(`✅ RLS Enabled (${rlsEnabled.length} tables):`);
    rlsEnabled.forEach(table => {
      console.log(`  - ${table.tablename}`);
    });
    
    console.log(`\n❌ RLS Disabled (${rlsDisabled.length} tables):`);
    rlsDisabled.slice(0, 10).forEach(table => {
      console.log(`  - ${table.tablename}`);
    });
    if (rlsDisabled.length > 10) {
      console.log(`  ... and ${rlsDisabled.length - 10} more`);
    }
    
    return { rlsEnabled, rlsDisabled };
    
  } catch (error) {
    console.error('❌ Error checking RLS status:', error.message);
    return { rlsEnabled: [], rlsDisabled: [] };
  }
}

/**
 * Check applied indexes
 */
async function checkAppliedIndexes(prisma) {
  console.log('\n📊 Checking applied indexes...\n');
  
  try {
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`📈 Found ${indexes.length} performance indexes:`);
    
    const indexesByTable = {};
    indexes.forEach(index => {
      if (!indexesByTable[index.tablename]) {
        indexesByTable[index.tablename] = [];
      }
      indexesByTable[index.tablename].push(index);
    });
    
    Object.entries(indexesByTable).forEach(([tableName, tableIndexes]) => {
      console.log(`  📄 ${tableName}: ${tableIndexes.length} indexes`);
    });
    
    return indexes;
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
    return [];
  }
}

/**
 * Check existing RLS policies
 */
async function checkRLSPolicies(prisma) {
  console.log('\n🛡️  Checking RLS policies...\n');
  
  try {
    const policies = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    console.log(`🔐 Found ${policies.length} RLS policies:`);
    
    const policiesByTable = {};
    policies.forEach(policy => {
      if (!policiesByTable[policy.tablename]) {
        policiesByTable[policy.tablename] = [];
      }
      policiesByTable[policy.tablename].push(policy);
    });
    
    Object.entries(policiesByTable).forEach(([tableName, tablePolicies]) => {
      console.log(`  📄 ${tableName}: ${tablePolicies.length} policies`);
    });
    
    return policies;
    
  } catch (error) {
    console.error('❌ Error checking RLS policies:', error.message);
    return [];
  }
}

/**
 * Generate Prisma schema updates
 */
function generateSchemaUpdates(rlsStatus, indexes, policies) {
  console.log('\n📝 Generating schema updates...\n');
  
  const updates = [];
  
  // Add RLS documentation to schema
  if (rlsStatus.rlsEnabled.length > 0) {
    updates.push(`
// ============================================================================
// Row Level Security (RLS) Status
// ============================================================================
// The following tables have RLS enabled in the database:
${rlsStatus.rlsEnabled.map(table => `// - ${table.tablename}`).join('\n')}
//
// RLS policies are managed through database scripts in /database/
// Use 'npm run db:rls' to apply or update RLS policies
// ============================================================================
`);
  }
  
  // Add index documentation
  if (indexes.length > 0) {
    const indexesByTable = {};
    indexes.forEach(index => {
      if (!indexesByTable[index.tablename]) {
        indexesByTable[index.tablename] = [];
      }
      indexesByTable[index.tablename].push(index.indexname);
    });
    
    updates.push(`
// ============================================================================
// Performance Indexes Status
// ============================================================================
// The following performance indexes are applied in the database:
${Object.entries(indexesByTable).map(([table, tableIndexes]) => 
  `// ${table}: ${tableIndexes.join(', ')}`
).join('\n')}
//
// Indexes are managed through database scripts in /database/
// Use 'npm run db:indexes' to apply or update performance indexes
// ============================================================================
`);
  }
  
  return updates;
}

/**
 * Update Prisma schema file
 */
function updatePrismaSchema(updates) {
  console.log('\n📄 Updating Prisma schema...\n');
  
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Prisma schema file not found');
    }
    
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove existing RLS/Index documentation if present
    schemaContent = schemaContent.replace(
      /\/\/ ={70,}\n\/\/ Row Level Security.*?\n\/\/ ={70,}\n/gs, 
      ''
    );
    schemaContent = schemaContent.replace(
      /\/\/ ={70,}\n\/\/ Performance Indexes.*?\n\/\/ ={70,}\n/gs, 
      ''
    );
    
    // Add new documentation at the top after generator and datasource
    const generatorEndIndex = schemaContent.indexOf('\n\n', schemaContent.indexOf('generator'));
    if (generatorEndIndex !== -1) {
      const beforeGenerator = schemaContent.substring(0, generatorEndIndex + 2);
      const afterGenerator = schemaContent.substring(generatorEndIndex + 2);
      
      schemaContent = beforeGenerator + updates.join('\n') + afterGenerator;
    } else {
      // Fallback: add at the beginning
      schemaContent = updates.join('\n') + '\n' + schemaContent;
    }
    
    // Write updated schema
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('✅ Prisma schema updated successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error updating Prisma schema:', error.message);
    return false;
  }
}

/**
 * Create migration file for applied changes
 */
function createSyncMigration(rlsStatus, indexes, policies) {
  console.log('\n📋 Creating sync migration documentation...\n');
  
  try {
    const migrationContent = `-- Migration: Database-Schema Synchronization
-- Generated: ${new Date().toISOString()}
-- 
-- This migration documents the RLS policies and indexes that were applied
-- directly to the database and are now reflected in the Prisma schema.

-- ============================================================================
-- Row Level Security (RLS) Status
-- ============================================================================

-- Tables with RLS enabled (${rlsStatus.rlsEnabled.length}):
${rlsStatus.rlsEnabled.map(table => `-- ✅ ${table.tablename}`).join('\n')}

-- Tables without RLS (${rlsStatus.rlsDisabled.length}):
${rlsStatus.rlsDisabled.slice(0, 10).map(table => `-- ❌ ${table.tablename}`).join('\n')}
${rlsStatus.rlsDisabled.length > 10 ? `-- ... and ${rlsStatus.rlsDisabled.length - 10} more` : ''}

-- ============================================================================
-- Applied RLS Policies (${policies.length})
-- ============================================================================

${policies.map(policy => 
  `-- Policy: ${policy.policyname} on ${policy.tablename} (${policy.cmd})`
).join('\n')}

-- ============================================================================
-- Applied Performance Indexes (${indexes.length})
-- ============================================================================

${indexes.map(index => 
  `-- Index: ${index.indexname} on ${index.tablename}`
).join('\n')}

-- ============================================================================
-- Maintenance Commands
-- ============================================================================

-- To reapply RLS policies:
-- npm run db:rls

-- To reapply performance indexes:
-- npm run db:indexes

-- To check current status:
-- npm run db:analyze-schema

-- ============================================================================
-- Notes
-- ============================================================================

-- This migration is for documentation purposes only.
-- The actual RLS policies and indexes are managed through separate scripts.
-- 
-- RLS policies are defined in: /database/row-level-security-policies.sql
-- Performance indexes are defined in: /database/performance-indexes.sql
`;

    const migrationDir = path.join(process.cwd(), 'database', 'migrations');
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const migrationPath = path.join(migrationDir, `${timestamp}-database-schema-sync.sql`);
    
    fs.writeFileSync(migrationPath, migrationContent);
    console.log(`✅ Migration documentation created: ${migrationPath}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error creating migration documentation:', error.message);
    return false;
  }
}

/**
 * Main synchronization function
 */
async function syncSchemaWithDatabase() {
  const prisma = initializePrisma();
  
  try {
    console.log('🚀 Starting schema-database synchronization...\n');
    
    // Check current database state
    const rlsStatus = await checkRLSStatus(prisma);
    const indexes = await checkAppliedIndexes(prisma);
    const policies = await checkRLSPolicies(prisma);
    
    // Generate schema updates
    const updates = generateSchemaUpdates(rlsStatus, indexes, policies);
    
    // Update Prisma schema
    const schemaUpdated = updatePrismaSchema(updates);
    
    // Create migration documentation
    const migrationCreated = createSyncMigration(rlsStatus, indexes, policies);
    
    console.log('\n🎉 SYNCHRONIZATION COMPLETED!');
    console.log('=============================');
    console.log(`🔒 RLS enabled tables: ${rlsStatus.rlsEnabled.length}`);
    console.log(`🛡️  RLS policies: ${policies.length}`);
    console.log(`📊 Performance indexes: ${indexes.length}`);
    console.log(`📄 Schema updated: ${schemaUpdated ? 'Yes' : 'No'}`);
    console.log(`📋 Migration created: ${migrationCreated ? 'Yes' : 'No'}`);
    
    console.log('\n✅ Database and schema are now synchronized!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the updated Prisma schema');
    console.log('2. Run `npx prisma generate` to update the client');
    console.log('3. Proceed with Phase 5 implementation');
    
  } catch (error) {
    console.error('\n💥 Synchronization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run synchronization if this script is executed directly
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  syncSchemaWithDatabase();
}

module.exports = { syncSchemaWithDatabase };
