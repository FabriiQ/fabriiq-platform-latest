# Analytics smoke test (manual)

Use this to quickly verify end-to-end wiring.

## Setup
- Ensure you have at least one class, subject, topic, and activity with topicId and bloomsLevel set, plus a student profile.

## Manual grading
1. Submit an attempt for the activity as the student (or ensure a gradeable state).
2. In Teacher portal, open grade view and set a grade with attachments.gradingDetails.bloomsLevelScores.
3. Verify DB:
   - activityGrade updated with score/status/gradedAt
   - studentGrade.activityGrades reflects bloomsLevelScores
   - topicMastery row exists for (studentId, topicId) and values updated
4. Check dashboards (class portal / teacher portal): Topic Master and Bloom distributions updated.

## Student submission (direct)
1. Submit answers from Student portal that result in a graded state.
2. Verify same DB updates as above, and real-time dashboard events firing.

## Student submission (batch)
1. Use a path that enqueues submissions; wait for worker to process.
2. Verify DB updates and dashboard refresh as above once item is graded.

## Real-time Bloom refresh
- After grading or submission, ensure real-time refresh does not error in logs and that live views receive updated metrics.

