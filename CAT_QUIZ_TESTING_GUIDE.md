# CAT Quiz Performance Fixes - Testing Guide

## 🧪 Testing Overview

This guide provides comprehensive testing procedures to validate that the CAT quiz performance fixes are working correctly and that no existing functionality has been broken.

## 🚀 Pre-Testing Setup

### 1. Apply the Fixes
```bash
# Apply database optimizations
node scripts/apply-cat-performance-fixes.js

# Restart the application
npm run dev
```

### 2. Verify Database Changes
```bash
# Check if indexes were created
psql -d your_database -c "
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_activity%'
ORDER BY tablename, indexname;
"

# Check advanced sessions table
psql -d your_database -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advanced_assessment_sessions';
"
```

## 🎯 Performance Testing

### Test 1: Database Query Performance

**Objective**: Verify that slow tRPC procedures are now fast

**Steps**:
1. Open browser developer tools (Network tab)
2. Navigate to a CAT quiz activity: `/student/class/[id]/subjects/[subjectId]/activities/[activityId]`
3. Monitor the tRPC calls in the network tab
4. Record execution times for:
   - `activityV2.getById`
   - `activityV2.getStudentPerformance`
   - `activityV2.getClassComparison`
   - `activityV2.getAttempts`

**Expected Results**:
- `getById`: <500ms (was 10,955ms)
- `getStudentPerformance`: <300ms (was 2,262ms)
- `getClassComparison`: <200ms (was 1,575ms)
- `getAttempts`: <200ms (was 2,127ms)

**Pass Criteria**: All procedures complete in under 1 second

### Test 2: Page Loading Performance

**Objective**: Verify CAT quiz pages load quickly without infinite loading

**Steps**:
1. Clear browser cache
2. Navigate to a CAT quiz activity
3. Measure time from navigation to quiz interface appearing
4. Repeat 5 times and calculate average

**Expected Results**:
- Initial page load: <3 seconds
- Quiz interface ready: <5 seconds
- No infinite loading states

**Pass Criteria**: Consistent loading under 5 seconds

## 🔄 CAT Session Management Testing

### Test 3: CAT Session Persistence

**Objective**: Verify CAT sessions survive server restarts

**Steps**:
1. Start a CAT quiz and answer 2-3 questions
2. Note the session ID from browser console logs
3. Restart the development server
4. Continue the quiz from where you left off
5. Check that session data is preserved

**Expected Results**:
- Session continues after server restart
- Question progress is maintained
- No loss of adaptive state

**Pass Criteria**: Session persists through restart

### Test 4: CAT Session Cleanup

**Objective**: Verify expired sessions are cleaned up

**Steps**:
1. Create a test CAT session
2. Manually update the session's `lastAccessedAt` to 25 hours ago:
   ```sql
   UPDATE advanced_assessment_sessions 
   SET "lastAccessedAt" = NOW() - INTERVAL '25 hours'
   WHERE id = 'your_session_id';
   ```
3. Run cleanup function:
   ```sql
   SELECT cleanup_expired_advanced_sessions();
   ```
4. Verify the session was deleted

**Expected Results**:
- Expired sessions are removed
- Active sessions remain untouched

**Pass Criteria**: Only expired sessions are cleaned up

## 🎮 Frontend Error Handling Testing

### Test 5: CAT Initialization Error Handling

**Objective**: Verify graceful fallback when CAT initialization fails

**Steps**:
1. Temporarily break CAT settings in an activity (set invalid JSON)
2. Try to start the CAT quiz
3. Observe error handling and fallback behavior
4. Restore valid CAT settings

**Expected Results**:
- Clear error message displayed
- Automatic fallback to standard quiz mode
- No infinite loading or crashes

**Pass Criteria**: Graceful error handling with user feedback

### Test 6: Network Error Recovery

**Objective**: Verify retry mechanisms work correctly

**Steps**:
1. Start loading a CAT quiz
2. Disconnect network during loading
3. Reconnect network
4. Click retry button
5. Verify quiz loads successfully

**Expected Results**:
- Clear error message when network fails
- Retry button appears and works
- Successful recovery after network restoration

**Pass Criteria**: Successful recovery from network errors

## 📊 Functional Testing

### Test 7: Standard Quiz Functionality

**Objective**: Ensure non-CAT quizzes still work correctly

**Steps**:
1. Create/access a standard (non-CAT) quiz
2. Complete the entire quiz workflow:
   - Start quiz
   - Answer all questions
   - Submit quiz
   - View results
3. Verify all features work as before

**Expected Results**:
- Standard quizzes work unchanged
- All existing features functional
- Performance improved

**Pass Criteria**: No regression in standard quiz functionality

### Test 8: CAT Quiz Full Workflow

**Objective**: Verify complete CAT quiz functionality

**Steps**:
1. Start a CAT quiz
2. Answer questions and observe adaptive behavior
3. Complete the quiz
4. View performance analytics
5. Check class comparison data

**Expected Results**:
- Adaptive question selection works
- Performance data is accurate
- Analytics display correctly

**Pass Criteria**: Complete CAT workflow functions correctly

## 🔍 Load Testing

### Test 9: Concurrent User Load

**Objective**: Verify performance under load

**Steps**:
1. Simulate 10-20 concurrent users accessing CAT quizzes
2. Monitor database performance
3. Check for memory leaks in session storage
4. Verify all users can complete quizzes

**Tools**: Use browser automation or load testing tools

**Expected Results**:
- Consistent performance under load
- No memory leaks
- All sessions handled correctly

**Pass Criteria**: Stable performance with multiple concurrent users

## 📝 Regression Testing

### Test 10: Existing Feature Verification

**Objective**: Ensure no existing functionality is broken

**Test Areas**:
- [ ] Student dashboard loading
- [ ] Teacher activity creation
- [ ] Grade book functionality
- [ ] Activity submission workflow
- [ ] Performance analytics
- [ ] User authentication
- [ ] Class management

**Steps**: Test each area with normal workflows

**Pass Criteria**: All existing features work as before

## 🐛 Error Scenarios Testing

### Test 11: Edge Cases

**Scenarios to Test**:
1. **Invalid Activity ID**: Access `/student/class/x/subjects/y/activities/invalid-id`
2. **Missing Student Profile**: User without student profile accessing quiz
3. **Corrupted Session Data**: Manually corrupt session JSON in database
4. **Database Connection Loss**: Simulate database disconnection
5. **Memory Pressure**: Fill session store to capacity

**Expected Behavior**: Graceful error handling in all cases

## 📊 Performance Benchmarks

### Before vs After Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| getById execution | 10,955ms | <500ms | 95%+ |
| getStudentPerformance | 2,262ms | <300ms | 87%+ |
| getClassComparison | 1,575ms | <200ms | 87%+ |
| getAttempts | 2,127ms | <200ms | 91%+ |
| Page load time | 15-30s | <5s | 83%+ |
| Session reliability | 0% | 99%+ | ∞ |

## ✅ Test Completion Checklist

- [ ] All database indexes created successfully
- [ ] Advanced sessions table exists and functional
- [ ] tRPC procedures execute in <1 second
- [ ] CAT quiz pages load in <5 seconds
- [ ] CAT sessions persist through server restarts
- [ ] Error handling works gracefully
- [ ] Standard quizzes unchanged
- [ ] Complete CAT workflow functional
- [ ] Performance stable under load
- [ ] No regressions in existing features
- [ ] All edge cases handled properly

## 🚨 Rollback Plan

If any critical issues are found:

1. **Database Rollback**:
   ```sql
   -- Remove new indexes if causing issues
   DROP INDEX IF EXISTS idx_activities_id_with_relations;
   -- (repeat for other indexes)
   ```

2. **Code Rollback**: Revert the modified files to previous versions

3. **Session Cleanup**: Clear any problematic session data

## 📞 Support

If you encounter issues during testing:
1. Check the console logs for specific error messages
2. Verify database connections and permissions
3. Ensure all dependencies are properly installed
4. Review the implementation summary for troubleshooting tips

## 🎉 Success Criteria

The fixes are considered successful when:
- All performance benchmarks are met
- No regressions in existing functionality
- CAT quizzes load consistently under 5 seconds
- Error handling provides clear user feedback
- Session persistence works reliably
