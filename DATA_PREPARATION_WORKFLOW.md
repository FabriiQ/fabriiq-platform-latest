# Data Preparation Workflow

## 🎯 Overview

This comprehensive data preparation workflow ensures your FabriiQ Question Bank system has properly structured, validated data before generating large-scale test datasets. The workflow addresses critical data integrity issues and establishes proper relationships between subjects, topics, learning outcomes, and Bloom's taxonomy levels.

## 🚨 Problem Statement

Before implementing this workflow, the system had several critical issues:

1. **Missing Learning Outcomes**: Subjects and topics lacked proper learning outcomes aligned with Bloom's taxonomy
2. **Incorrect Subject Associations**: Questions from multiple subjects were incorrectly associated with the English subject
3. **Broken Question Bank Structure**: Questions weren't properly distributed across subject-specific question banks
4. **Incomplete Metadata**: Questions lacked complete metadata including learning outcomes and Bloom's levels
5. **Data Integrity Issues**: Relationships between entities were inconsistent or missing

## 🛠️ Solution Architecture

The workflow consists of 4 interconnected scripts that systematically address each issue:

### 📋 Script Overview

| Script | Purpose | Critical | Description |
|--------|---------|----------|-------------|
| `00-master-data-preparation-workflow.ts` | **Orchestrator** | ✅ | Master script that runs all steps in sequence |
| `01-setup-learning-outcomes-blooms.ts` | **Learning Outcomes** | ✅ | Creates learning outcomes for all subjects/topics |
| `02-enhanced-question-generation.ts` | **Enhanced Generation** | ⚠️ | Generates questions using learning outcomes |
| `03-fix-question-subject-associations.ts` | **Association Fix** | ✅ | Fixes incorrect question-subject associations |
| `04-data-validation-integrity.ts` | **Validation** | ✅ | Comprehensive data integrity validation |

## 🚀 Quick Start

### Prerequisites

1. **Database Setup**: Ensure your database is running and accessible
2. **Initial Seed Data**: Run the database seed to create basic subjects and topics
3. **Dependencies**: Install all required npm packages

```bash
# Ensure database is seeded
npx prisma db seed

# Install dependencies (if not already done)
npm install
```

### Run Complete Workflow

Execute the master workflow script to run all preparation steps:

```bash
# Run the complete data preparation workflow
npx tsx scripts/00-master-data-preparation-workflow.ts
```

This single command will:
- ✅ Set up learning outcomes and Bloom's taxonomy associations
- ✅ Fix question-subject associations
- ✅ Validate data integrity
- ✅ Provide comprehensive reporting

## 📊 Individual Script Usage

### 1. Learning Outcomes & Bloom's Taxonomy Setup

Creates realistic learning outcomes for each subject-topic combination, properly aligned with Bloom's taxonomy levels.

```bash
npx tsx scripts/01-setup-learning-outcomes-blooms.ts
```

**What it does:**
- Fetches all active subjects and topics from database
- Generates 6 learning outcomes per subject-topic (one for each Bloom's level)
- Uses educationally-appropriate action verbs for each cognitive level
- Creates proper foreign key relationships

**Output Example:**
```
📊 Found 5 subjects with 25 subject-topic combinations
🎯 Creating learning outcomes...
✅ Total learning outcomes created: 150
```

### 2. Enhanced Question Generation

Generates questions that are properly aligned with learning outcomes and Bloom's taxonomy.

```bash
npx tsx scripts/02-enhanced-question-generation.ts
```

**Features:**
- Uses learning outcomes to generate contextually appropriate questions
- Selects question types based on Bloom's cognitive level
- Creates complete metadata including all required relationships
- Generates realistic, educationally-sound content

### 3. Question-Subject Association Fix

Identifies and fixes questions that are incorrectly associated with subjects.

```bash
npx tsx scripts/03-fix-question-subject-associations.ts
```

**What it fixes:**
- Analyzes question content using keyword matching and patterns
- Re-associates questions with correct subjects based on content analysis
- Ensures each subject has its own question bank
- Updates question bank associations

**Analysis Example:**
```
📋 Currently in "English" (45 questions):
  → Should be in "Mathematics": 15 questions
  → Should be in "Science": 20 questions
  → Should be in "Physical Education": 10 questions
```

### 4. Data Validation & Integrity Check

Performs comprehensive validation of all data relationships and integrity.

```bash
npx tsx scripts/04-data-validation-integrity.ts
```

**Validation Categories:**
- **Subjects**: Active subjects, topics, learning outcomes, question banks
- **Topics**: Valid subject references, keywords
- **Learning Outcomes**: Complete statements, Bloom's distribution
- **Questions**: Complete metadata, valid associations
- **Question Banks**: Subject associations, valid references
- **Relationships**: Cross-entity consistency checks

## 📈 Expected Results

### Before Workflow
```
❌ Learning Outcomes: 0
❌ Proper Subject Distribution: 15% (most questions in English)
❌ Question Bank Structure: Inconsistent
❌ Data Integrity: Multiple issues
```

### After Workflow
```
✅ Learning Outcomes: 150+ (6 per subject-topic combination)
✅ Proper Subject Distribution: 100% (questions correctly distributed)
✅ Question Bank Structure: Each subject has its own question bank
✅ Data Integrity: All validations pass
```

## 🔍 Validation Report Example

```
📋 DATA VALIDATION & INTEGRITY REPORT
================================================================================

📊 SUMMARY:
   Total Tests: 18
   ✅ Passed: 16
   ❌ Failed: 0
   ⚠️  Warnings: 2
   Success Rate: 88.9%

📂 SUBJECTS:
   Tests: 4 | Passed: 4 | Failed: 0 | Warnings: 0
   ✅ Active subjects exist: Found 5 active subjects
   ✅ Subjects have topics: 0 subjects without topics
   ✅ Subjects have learning outcomes: 0 subjects without learning outcomes
   ✅ Subjects have question banks: 0 subjects without question banks

📂 QUESTIONS:
   Tests: 5 | Passed: 5 | Failed: 0 | Warnings: 0
   ✅ Questions exist: Found 1000 questions
   ✅ Questions have subject associations: 0 questions without subject associations
   ✅ Questions have question bank associations: 0 questions without question bank associations
   ✅ Questions have valid subject references: 0 questions with invalid subject references
   ✅ Questions have complete content: 0 questions with incomplete content

🎉 ALL VALIDATIONS PASSED! Data integrity is excellent.
```

## 🛡️ Error Handling

The workflow includes comprehensive error handling:

### Automatic Recovery
- **Duplicate Prevention**: Skips creation if learning outcomes already exist
- **Graceful Degradation**: Continues workflow even if non-critical steps fail
- **Detailed Logging**: Provides specific error messages and suggestions

### Manual Intervention Points
- **Prerequisites Check**: Validates database connectivity and seed data
- **Validation Failures**: Reports specific issues that need manual attention
- **Association Conflicts**: Provides detailed analysis for review

## 📊 Performance Metrics

### Typical Execution Times
- **Learning Outcomes Setup**: 10-30 seconds
- **Association Fix**: 30-60 seconds (depends on question count)
- **Data Validation**: 15-45 seconds
- **Total Workflow**: 1-3 minutes

### Memory Usage
- **Optimized Processing**: Batch operations to minimize memory usage
- **Progress Tracking**: Real-time progress indicators
- **Resource Management**: Proper database connection handling

## 🔧 Troubleshooting

### Common Issues

#### 1. "No subjects found in database"
```bash
# Solution: Run database seed
npx prisma db seed
```

#### 2. "Learning outcomes already exist"
```bash
# This is normal - the script prevents duplicates
# If you need to recreate them, delete existing outcomes first
```

#### 3. "Database connection failed"
```bash
# Check your database configuration
# Ensure DATABASE_URL is set correctly
# Verify database is running
```

#### 4. "Validation failures found"
```bash
# Review the validation report
# Fix specific issues mentioned
# Re-run the workflow
```

## 🎯 Next Steps

After successful workflow completion:

1. **Generate Test Data**: Use the subject-wise dataset generation scripts
2. **Test Bulk Upload**: Verify bulk upload functionality with generated data
3. **Performance Testing**: Run performance tests with large datasets
4. **Production Deployment**: Deploy with confidence in data integrity

## 📚 Related Documentation

- [Bulk Upload Enhancement Summary](./BULK_UPLOAD_ENHANCEMENT_SUMMARY.md)
- [Question Bank CSV Format](./data/README.md)
- [Database Schema Documentation](./prisma/schema.prisma)

## 🤝 Support

If you encounter issues:

1. **Check Prerequisites**: Ensure database is seeded and accessible
2. **Review Logs**: Check console output for specific error messages
3. **Run Validation**: Use the validation script to identify specific issues
4. **Manual Fixes**: Address validation failures before proceeding

The workflow is designed to be robust and provide clear guidance for resolving any issues that arise.
