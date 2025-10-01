# Database Cleanup Scripts

This directory contains scripts to help manage your database size and stay within Supabase free tier limits.

## 🎯 Purpose

These scripts help you:
- Analyze your current database size and usage
- Identify subjects with excessive questions (>10,000)
- Safely remove excess questions while preserving important data
- Stay within Supabase free tier limits (500MB)

## 📋 Available Scripts

### 1. Database Size Analysis
```bash
npm run db:analyze-size
```

**What it does:**
- Shows overall database statistics
- Lists subjects with the most questions
- Identifies subjects exceeding 10,000 questions
- Estimates database size usage
- Provides cleanup recommendations

**When to use:** Run this first to understand your current database state.

### 2. Question Cleanup (Dry Run)
```bash
npm run cleanup:questions:dry-run
```

**What it does:**
- Analyzes which questions would be deleted
- Shows detailed statistics per subject
- **Does NOT actually delete anything**
- Safe to run anytime for analysis

**When to use:** Before running the actual cleanup to see what would happen.

### 3. Question Cleanup (Live)
```bash
npm run cleanup:questions
```

**What it does:**
- **Actually deletes excess questions**
- Creates backup before deletion
- Removes questions in batches for safety
- Preserves important questions (see preservation rules below)

**When to use:** After reviewing dry-run results and confirming you want to proceed.

## 🛡️ Safety Features

### What Questions Are Preserved
The cleanup script **NEVER** deletes:
1. **Questions with usage statistics** - Questions that have been used in assessments
2. **Recent questions** - Questions created in the last 30 days (configurable)
3. **Questions in active assessments** - Questions currently being used

### What Questions Are Deleted
The cleanup script removes (oldest first):
1. Questions without usage statistics
2. Questions older than the preservation period
3. Questions not in active assessments
4. Only removes excess beyond the limit (default: 10,000 per subject)

### Backup System
- Automatic backup creation before deletion
- Backups stored in `backups/question-cleanup/`
- Timestamped backup files for easy identification

## ⚙️ Configuration Options

### Basic Usage
```bash
# Analyze current state
npm run db:analyze-size

# Test cleanup (safe)
npm run cleanup:questions:dry-run

# Perform cleanup
npm run cleanup:questions
```

### Advanced Options
```bash
# Custom question limit per subject
node scripts/cleanup-excess-questions.js --max-questions 5000

# Preserve more recent questions
node scripts/cleanup-excess-questions.js --preserve-days 60

# Skip backup creation
node scripts/cleanup-excess-questions.js --no-backup

# Custom batch size for deletion
node scripts/cleanup-excess-questions.js --batch-size 500

# Combine options
node scripts/cleanup-excess-questions.js --max-questions 8000 --preserve-days 45 --dry-run
```

## 📊 Example Workflow

### Step 1: Analyze Current State
```bash
npm run db:analyze-size
```
Expected output:
```
📊 Database Size Analysis
==================================================
📊 Overall Database Statistics:
Total Questions: 125,000
Total Subjects: 45
...

📚 Top Subjects by Question Count:
⚠️ 1. Mathematics (MATH101)
   Total Questions: 25,000
   Recent (30 days): 500
   With Usage Stats: 2,000
   ⚠️ EXCEEDS LIMIT by 15,000 questions

✅ 2. English (ENG101)
   Total Questions: 8,500
   ...
```

### Step 2: Test Cleanup
```bash
npm run cleanup:questions:dry-run
```
Expected output:
```
🧹 Starting Question Cleanup Process
Mode: DRY RUN
...

📋 Analysis Results:
1. Mathematics (MATH101)
   Total Questions: 25,000
   To Delete: 12,500
   To Preserve: 12,500

📊 Summary: 3 subjects need cleanup
🗑️ Total questions to delete: 18,750
```

### Step 3: Perform Cleanup
```bash
npm run cleanup:questions
```
Expected output:
```
🧹 Starting Question Cleanup Process
Mode: LIVE CLEANUP
...
💾 Creating backup...
✅ Backup created: backups/question-cleanup/questions-backup-2024-01-15.json

🧹 Starting cleanup process...
📚 Processing Mathematics (MATH101)...
   Deleted 1000/12500 questions...
   Deleted 2000/12500 questions...
   ...
   ✅ Completed: 12500 questions deleted
```

## 🚨 Important Warnings

### Before Running Cleanup
1. **Always run the analysis first** to understand your data
2. **Always run dry-run first** to see what would be deleted
3. **Verify your backups** are working properly
4. **Consider the impact** on your users and assessments

### During Cleanup
- The process may take several minutes for large datasets
- Don't interrupt the process once started
- Monitor the output for any errors

### After Cleanup
- Verify your application still works correctly
- Check that important questions are still available
- Monitor database size to ensure limits are met

## 🔧 Troubleshooting

### Common Issues

**Error: "Cannot connect to database"**
- Check your DATABASE_URL environment variable
- Ensure your database is accessible
- Verify your credentials

**Error: "Permission denied"**
- Ensure your database user has DELETE permissions
- Check your Supabase service role key

**Cleanup seems slow**
- This is normal for large datasets
- The script processes in batches for safety
- You can adjust batch size with `--batch-size` option

### Getting Help
If you encounter issues:
1. Check the error messages carefully
2. Try running with `--dry-run` first
3. Verify your database connection
4. Check the backup files were created

## 📈 Monitoring

### Regular Maintenance
Run these commands regularly:
```bash
# Weekly analysis
npm run db:analyze-size

# Monthly cleanup (if needed)
npm run cleanup:questions:dry-run
# Review results, then:
npm run cleanup:questions
```

### Setting Up Alerts
Consider setting up monitoring to alert you when:
- Database size approaches 80% of limit
- Any subject exceeds 15,000 questions
- Question creation rate is unusually high

## 🔄 Recovery

### If Something Goes Wrong
1. **Stop the cleanup process** if still running
2. **Check the backup files** in `backups/question-cleanup/`
3. **Restore from backup** if necessary (manual process)
4. **Contact support** if you need help with recovery

### Backup File Format
Backup files contain metadata about the cleanup operation:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "note": "Backup created before question cleanup",
  "cleanupDate": "2024-01-15T10:30:00.000Z"
}
```

## 📞 Support

For additional help:
- Check the script output for detailed error messages
- Review this documentation
- Test with `--dry-run` before making changes
- Keep backups of important data
