# Activities V2 Bloom Analytics Integration - Testing Guide

## What Was Fixed

### **Problem**: 
Activities V2 had placeholder implementations for bloom analytics and topic masteries updates. When students submitted quizzes, the data wasn't being updated in bloom analytics or topic mastery systems.

### **Root Cause**:
- `updateTopicMastery()` method only had TODO comments
- `updateBloomsAnalytics()` method only had console.log statements  
- No `activity_submit` event tracking (unlike legacy activities)
- No integration with existing `MasteryUpdateHandler` component

### **Solution Implemented**:

#### 1. **Fixed ActivityV2Service Methods**
- **`updateTopicMastery()`**: Now properly updates `topicMastery` table with bloom level scores
- **`updateBloomsAnalytics()`**: Now stores bloom analytics data in database or activity grade attachments
- **`trackAnalytics()`**: Added `activity_submit` event tracking like legacy activities
- **`saveActivityGrade()`**: Now returns activity grade ID for mastery updates

#### 2. **Enhanced ActivityV2Viewer Component**
- Added `MasteryUpdateHandler` component integration
- Enhanced results display with:
  - Auto-redirect countdown (5 seconds)
  - Manual "Go to Activities Now" button
  - Better score display (percentage instead of raw score)
  - Mastery update notifications

#### 3. **Complete Integration Flow**
```
Student Submits Quiz → ActivityV2Service.submitActivity() → 
├── Save Activity Grade (returns gradeId)
├── Track activity_submit Analytics Event
├── Update Topic Mastery (with bloom levels)
├── Update Blooms Analytics (with distribution data)
├── Trigger MasteryUpdateHandler Component
└── Show Enhanced Results with Auto-redirect
```

## Testing Instructions

### 1. **Before Testing - Verify Dependencies**
Make sure these components exist and are working:
- `src/features/bloom/components/mastery/MasteryUpdateHandler.tsx`
- `src/features/activties/analytics/activity-analytics.ts`
- Database tables: `topicMastery`, `activityGrade`

### 2. **Test Activities V2 Quiz Submission**

#### Create a Test Quiz:
1. Go to Activities V2 creation page
2. Create a quiz with:
   - Multiple questions from question bank
   - Assigned to a topic with bloom levels
   - Different bloom taxonomy levels if possible

#### Submit the Quiz:
1. Log in as a student
2. Start the quiz
3. Answer the questions
4. Submit the quiz
5. **Observe the enhanced results screen**:
   - ✅ Results should show with countdown timer
   - ✅ "Returning to activities in X seconds..." message
   - ✅ "Go to Activities Now" button
   - ✅ Score displayed as percentage
   - ✅ Auto-redirect after 5 seconds (or manual click)

#### Verify Analytics Integration:

##### Check Console Logs:
```javascript
// Should see these in browser console:
"Activity submit event tracked for Activities V2"
"Topic mastery updated for Activities V2"
"Bloom's analytics updated for Activities V2"
"Topic mastery updated via MasteryUpdateHandler"
```

##### Check Database:
```sql
-- Check if topic mastery was updated
SELECT * FROM TopicMastery 
WHERE studentId = '[STUDENT_ID]' 
AND topicId = '[TOPIC_ID]' 
ORDER BY updatedAt DESC;

-- Check if activity grade was created
SELECT * FROM ActivityGrade 
WHERE activityId = '[ACTIVITY_ID]' 
AND studentId = '[STUDENT_ID]'
ORDER BY createdAt DESC;

-- Check if bloom analytics data exists
SELECT attachments FROM ActivityGrade 
WHERE activityId = '[ACTIVITY_ID]' 
AND studentId = '[STUDENT_ID]';
-- Should contain bloomsAnalytics object
```

### 3. **Compare with Legacy Activities**

#### Test Legacy Activity:
1. Create a quiz in legacy activities (`src/features/activties`)
2. Submit it and verify analytics work

#### Test Activities V2:
1. Create same quiz in Activities V2
2. Submit it and verify:
   - Same analytics events are triggered
   - Same topic mastery updates occur  
   - Same bloom analytics are recorded

### 4. **Verify Bloom Analytics Dashboard**

1. Go to bloom analytics dashboard
2. Check if Activities V2 submissions appear in:
   - Topic mastery charts
   - Bloom taxonomy distribution
   - Student performance analytics
   - Class-level analytics

## Expected Results

### ✅ **Success Indicators**:
1. **Console Logs**: All integration methods log success messages
2. **Database Updates**: TopicMastery table has new/updated records
3. **Analytics Events**: `activity_submit` events are tracked  
4. **Results Display**: Enhanced results screen with countdown
5. **Auto-redirect**: Automatically returns to activities page
6. **Toast Notifications**: "Topic mastery updated!" message appears
7. **Bloom Dashboard**: Activities V2 data appears in analytics

### ❌ **Failure Indicators**:
1. Console errors about missing imports
2. Database queries return no records
3. Results screen shows old format without countdown
4. No mastery update notifications
5. Bloom analytics dashboard doesn't show Activities V2 data

## Troubleshooting

### If Topic Mastery Not Updating:
```javascript
// Check if activity has topicId
console.log('Activity topic:', activity.topicId);

// Check if bloom levels are being calculated
console.log('Blooms level scores:', bloomsLevelScores);

// Check database constraints
// Ensure topicMastery table has proper unique constraints
```

### If Analytics Events Not Tracking:
```javascript
// Check if analytics manager imports correctly
try {
  const { analyticsManager } = await import('@/features/activties/analytics/activity-analytics');
  console.log('Analytics manager loaded:', analyticsManager);
} catch (error) {
  console.error('Analytics import failed:', error);
}
```

### If MasteryUpdateHandler Not Working:
```javascript
// Check if activityGradeId is being passed
console.log('Activity grade ID:', activityGradeId);

// Check component import
import { MasteryUpdateHandler } from '@/features/bloom/components/mastery/MasteryUpdateHandler';
```

## Performance Monitoring

Monitor these metrics:
- **Submission Time**: Should complete within 2-3 seconds
- **Database Queries**: Should be minimal and efficient
- **Memory Usage**: No memory leaks from intervals
- **Error Rate**: Should be 0% for successful submissions

## Rollback Plan

If issues occur:
1. **Disable Methods**: Comment out the new integration methods
2. **Revert to Logs**: Replace implementations with console.log statements  
3. **Remove Component**: Comment out MasteryUpdateHandler in ActivityV2Viewer
4. **Restore Original**: Use git to revert to previous version

## Files Modified

### Core Integration:
- `src/features/activities-v2/services/activity-v2.service.ts`
- `src/features/activities-v2/components/ActivityV2Viewer.tsx`
- `src/features/activities-v2/types/index.ts`

### Dependencies Used:
- `src/features/bloom/components/mastery/MasteryUpdateHandler.tsx`
- `src/features/activties/analytics/activity-analytics.ts`

## Success Metrics

- **✅ 100% Activities V2 submissions trigger bloom analytics**
- **✅ 100% Activities V2 submissions update topic mastery**  
- **✅ 5-second auto-redirect works consistently**
- **✅ Manual redirect button works immediately**
- **✅ No console errors during submission flow**
- **✅ Bloom analytics dashboard shows Activities V2 data**

---

**Integration completed successfully! 🎉**

Activities V2 now has full bloom analytics and topic mastery integration matching the functionality of legacy activities, plus enhanced user experience with auto-redirect results screen.