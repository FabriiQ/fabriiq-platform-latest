#!/usr/bin/env node

/**
 * Database Schema Analysis Script
 * 
 * This script analyzes the current database schema to identify inconsistencies,
 * missing constraints, and normalization issues WITHOUT making any changes.
 * 
 * SAFETY: This script is READ-ONLY and will not modify the database.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

console.log('🔍 FabriiQ Database Schema Analysis');
console.log('===================================');
console.log('⚠️  READ-ONLY ANALYSIS - No changes will be made');

/**
 * Initialize Prisma client in read-only mode
 */
function initializePrisma() {
  return new PrismaClient({
    log: ['info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}

/**
 * Analyze data type inconsistencies
 */
async function analyzeDataTypeInconsistencies(prisma) {
  console.log('\n📊 Analyzing data type inconsistencies...\n');
  
  try {
    // Check for inconsistent ID types
    const idColumns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name LIKE '%Id'
        OR column_name = 'id'
      ORDER BY data_type, table_name;
    `;
    
    console.log('🔑 ID Column Types Analysis:');
    const idTypeGroups = {};
    idColumns.forEach(col => {
      const key = `${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`;
      if (!idTypeGroups[key]) {
        idTypeGroups[key] = [];
      }
      idTypeGroups[key].push(`${col.table_name}.${col.column_name}`);
    });
    
    Object.entries(idTypeGroups).forEach(([type, columns]) => {
      console.log(`  ${type}: ${columns.length} columns`);
      if (columns.length <= 5) {
        columns.forEach(col => console.log(`    - ${col}`));
      } else {
        columns.slice(0, 3).forEach(col => console.log(`    - ${col}`));
        console.log(`    ... and ${columns.length - 3} more`);
      }
    });
    
    // Check for inconsistent timestamp columns
    const timestampColumns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (column_name LIKE '%At' OR column_name LIKE '%Date' OR column_name LIKE '%Time')
      ORDER BY data_type, table_name;
    `;
    
    console.log('\n📅 Timestamp Column Types:');
    const timestampTypeGroups = {};
    timestampColumns.forEach(col => {
      if (!timestampTypeGroups[col.data_type]) {
        timestampTypeGroups[col.data_type] = [];
      }
      timestampTypeGroups[col.data_type].push(`${col.table_name}.${col.column_name}`);
    });
    
    Object.entries(timestampTypeGroups).forEach(([type, columns]) => {
      console.log(`  ${type}: ${columns.length} columns`);
    });
    
    return { idColumns, timestampColumns };
    
  } catch (error) {
    console.error('❌ Error analyzing data types:', error.message);
    return { idColumns: [], timestampColumns: [] };
  }
}

/**
 * Analyze missing foreign key constraints
 */
async function analyzeMissingForeignKeys(prisma) {
  console.log('\n🔗 Analyzing foreign key constraints...\n');
  
  try {
    // Get all existing foreign keys
    const existingFKs = await prisma.$queryRaw`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    
    console.log(`🔗 Found ${existingFKs.length} existing foreign key constraints:`);
    existingFKs.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // Find potential missing foreign keys (columns ending with Id)
    const potentialFKs = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name LIKE '%Id'
        AND column_name != 'id'
      ORDER BY table_name, column_name;
    `;
    
    console.log(`\n🔍 Found ${potentialFKs.length} potential foreign key columns:`);
    
    // Check which ones are missing FK constraints
    const existingFKSet = new Set(existingFKs.map(fk => `${fk.table_name}.${fk.column_name}`));
    const missingFKs = potentialFKs.filter(col => 
      !existingFKSet.has(`${col.table_name}.${col.column_name}`)
    );
    
    console.log(`\n⚠️  Potentially missing foreign keys (${missingFKs.length}):`);
    missingFKs.forEach(col => {
      console.log(`  ${col.table_name}.${col.column_name}`);
    });
    
    return { existingFKs, missingFKs };
    
  } catch (error) {
    console.error('❌ Error analyzing foreign keys:', error.message);
    return { existingFKs: [], missingFKs: [] };
  }
}

/**
 * Analyze table normalization issues
 */
async function analyzeNormalizationIssues(prisma) {
  console.log('\n📐 Analyzing normalization issues...\n');
  
  try {
    // Check for tables with JSON columns (potential denormalization)
    const jsonColumns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type IN ('json', 'jsonb')
      ORDER BY table_name, column_name;
    `;
    
    console.log(`📋 JSON columns found (${jsonColumns.length}):`);
    jsonColumns.forEach(col => {
      console.log(`  ${col.table_name}.${col.column_name} (${col.data_type})`);
    });
    
    // Check for tables with array columns
    const arrayColumns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND data_type LIKE '%[]'
      ORDER BY table_name, column_name;
    `;
    
    console.log(`\n📋 Array columns found (${arrayColumns.length}):`);
    arrayColumns.forEach(col => {
      console.log(`  ${col.table_name}.${col.column_name} (${col.data_type})`);
    });
    
    // Check for very wide tables (potential normalization issues)
    const tableColumnCounts = await prisma.$queryRaw`
      SELECT 
        table_name,
        COUNT(*) as column_count
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      GROUP BY table_name
      HAVING COUNT(*) > 20
      ORDER BY column_count DESC;
    `;
    
    console.log(`\n📊 Tables with many columns (potential normalization issues):`);
    tableColumnCounts.forEach(table => {
      console.log(`  ${table.table_name}: ${table.column_count} columns`);
    });
    
    return { jsonColumns, arrayColumns, tableColumnCounts };
    
  } catch (error) {
    console.error('❌ Error analyzing normalization:', error.message);
    return { jsonColumns: [], arrayColumns: [], tableColumnCounts: [] };
  }
}

/**
 * Analyze index coverage
 */
async function analyzeIndexCoverage(prisma) {
  console.log('\n📈 Analyzing index coverage...\n');
  
  try {
    // Get all indexes
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    console.log(`📊 Total indexes: ${indexes.length}`);
    
    // Group by table
    const indexesByTable = {};
    indexes.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx);
    });
    
    // Find tables with no indexes (except primary key)
    const tablesWithFewIndexes = Object.entries(indexesByTable)
      .filter(([table, tableIndexes]) => tableIndexes.length <= 1)
      .map(([table]) => table);
    
    console.log(`\n⚠️  Tables with minimal indexing (${tablesWithFewIndexes.length}):`);
    tablesWithFewIndexes.forEach(table => {
      console.log(`  ${table}`);
    });
    
    return { indexes, indexesByTable };
    
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error.message);
    return { indexes: [], indexesByTable: {} };
  }
}

/**
 * Generate schema analysis report
 */
function generateSchemaAnalysisReport(analysisResults) {
  const report = `# Database Schema Analysis Report

## Summary
- **Analysis Date**: ${new Date().toISOString()}
- **Total Tables**: ${analysisResults.totalTables || 'Unknown'}
- **Analysis Type**: READ-ONLY (No changes made)

## Data Type Inconsistencies

### ID Column Types
${Object.entries(analysisResults.dataTypes?.idTypeGroups || {}).map(([type, columns]) => 
  `- **${type}**: ${columns.length} columns`
).join('\n')}

### Timestamp Column Types
${Object.entries(analysisResults.dataTypes?.timestampTypeGroups || {}).map(([type, columns]) => 
  `- **${type}**: ${columns.length} columns`
).join('\n')}

## Foreign Key Analysis

### Existing Foreign Keys
- **Total**: ${analysisResults.foreignKeys?.existingFKs?.length || 0} constraints

### Potentially Missing Foreign Keys
- **Count**: ${analysisResults.foreignKeys?.missingFKs?.length || 0}
${(analysisResults.foreignKeys?.missingFKs || []).slice(0, 10).map(fk => 
  `- ${fk.table_name}.${fk.column_name}`
).join('\n')}

## Normalization Analysis

### JSON/JSONB Columns
- **Count**: ${analysisResults.normalization?.jsonColumns?.length || 0}
${(analysisResults.normalization?.jsonColumns || []).map(col => 
  `- ${col.table_name}.${col.column_name} (${col.data_type})`
).join('\n')}

### Array Columns
- **Count**: ${analysisResults.normalization?.arrayColumns?.length || 0}

### Wide Tables (>20 columns)
${(analysisResults.normalization?.tableColumnCounts || []).map(table => 
  `- ${table.table_name}: ${table.column_count} columns`
).join('\n')}

## Index Coverage

### Tables with Minimal Indexing
${(analysisResults.indexes?.tablesWithFewIndexes || []).map(table => 
  `- ${table}`
).join('\n')}

## Recommendations

### High Priority
1. **Add missing foreign key constraints** for data integrity
2. **Standardize ID column types** (recommend TEXT for consistency)
3. **Add indexes** to tables with minimal indexing

### Medium Priority
1. **Standardize timestamp column types** (recommend timestamptz)
2. **Review JSON columns** for potential normalization
3. **Consider partitioning** for very wide tables

### Low Priority
1. **Review array columns** for normalization opportunities
2. **Optimize index usage** based on query patterns

## Next Steps

⚠️  **IMPORTANT**: Any schema changes must be done carefully:
1. Create migration scripts for each change
2. Test thoroughly in development environment
3. Plan for zero-downtime deployment
4. Update all related application code
5. Consider backward compatibility

---
*Generated by FabriiQ Schema Analysis Script*
*This was a READ-ONLY analysis - no database changes were made*
`;
  
  fs.writeFileSync('database/schema-analysis-report.md', report);
  console.log('\n📄 Created schema analysis report: database/schema-analysis-report.md');
}

/**
 * Main analysis function
 */
async function analyzeSchema() {
  const prisma = initializePrisma();
  
  try {
    console.log('🚀 Starting schema analysis...\n');
    
    // Get total table count
    const tables = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE';
    `;
    const totalTables = Number(tables[0]?.count || 0);
    console.log(`📊 Analyzing ${totalTables} tables...\n`);
    
    // Run all analyses
    const dataTypes = await analyzeDataTypeInconsistencies(prisma);
    const foreignKeys = await analyzeMissingForeignKeys(prisma);
    const normalization = await analyzeNormalizationIssues(prisma);
    const indexes = await analyzeIndexCoverage(prisma);
    
    // Generate report
    const analysisResults = {
      totalTables,
      dataTypes,
      foreignKeys,
      normalization,
      indexes
    };
    
    generateSchemaAnalysisReport(analysisResults);
    
    console.log('\n🎉 SCHEMA ANALYSIS COMPLETED!');
    console.log('=============================');
    console.log(`📊 Tables analyzed: ${totalTables}`);
    console.log(`🔗 Existing foreign keys: ${foreignKeys.existingFKs.length}`);
    console.log(`⚠️  Potential missing FKs: ${foreignKeys.missingFKs.length}`);
    console.log(`📋 JSON columns: ${normalization.jsonColumns.length}`);
    console.log(`📈 Total indexes: ${indexes.indexes.length}`);
    
    console.log('\n✅ Analysis complete - no database changes made');
    console.log('📄 Detailed report saved to: database/schema-analysis-report.md');
    
    console.log('\n⚠️  NEXT STEPS FOR SCHEMA STANDARDIZATION:');
    console.log('1. Review the analysis report carefully');
    console.log('2. Plan migration scripts for critical issues');
    console.log('3. Test changes in development environment');
    console.log('4. Update application code as needed');
    console.log('5. Deploy with proper rollback plan');
    
  } catch (error) {
    console.error('\n💥 Schema analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run analysis if this script is executed directly
if (require.main === module) {
  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  analyzeSchema();
}

module.exports = { analyzeSchema };
