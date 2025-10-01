# Question Bank Timeout Fix

## Problem
The `questionBank.getQuestionBanks` query was timing out after ~137 seconds due to expensive nested joins in the Prisma query. The original query was performing:

```typescript
include: {
  questions: {
    take: 1,
    include: {
      course: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } }
    }
  }
}
```

This caused PostgreSQL to perform expensive joins across multiple tables even though only 1 question per question bank was needed.

## Solution
1. **Separated the queries**: Instead of using nested includes, we now:
   - First fetch question banks with basic info and question counts
   - Then fetch sample questions in a separate optimized query
   - Combine the results in application code

2. **Added performance monitoring**: 
   - Added execution time tracking
   - Added warnings for slow queries (>15 seconds)
   - Added error handling for sample questions

3. **Added database index**:
   - Added composite index: `(questionBankId, status, createdAt)`
   - This optimizes the sample question lookup query

## Performance Improvement
- **Before**: ~137 seconds (timeout)
- **After**: Expected <2 seconds

## Files Changed
- `src/features/question-bank/services/question-bank.service.ts`
- `prisma/schema.prisma` (added index)
- `prisma/migrations/add_question_performance_index/migration.sql`

## Migration Required
Run the following to apply the database index:
```bash
npx prisma db push
```

Or apply the migration manually:
```sql
CREATE INDEX IF NOT EXISTS "questions_questionBankId_status_createdAt_idx" 
ON "questions"("questionBankId", "status", "createdAt");
```
