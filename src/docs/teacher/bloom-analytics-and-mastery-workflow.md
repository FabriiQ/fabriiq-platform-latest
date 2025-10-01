## Bloom Analytics and Topic Mastery: End‑to‑End Workflow

This document explains how Bloom’s analytics and Topic Mastery are calculated in the system, from assessment/activity creation through grading and analytics generation. It also highlights current gaps and recommended improvements.

---

### 1) High‑level Flow

1. Activity/Assessment authoring
   - Teacher creates an activity or assessment and associates it to a Topic and Subject.
   - (Optional/configured) A Bloom’s level distribution is defined for the assessment (e.g., % Remember, % Understand, …).
2. Student attempts and grading
   - Student submissions are graded. For mastery, the system expects per‑Bloom level scoring for a student’s attempt (AssessmentResultData.bloomsLevelScores).
3. Mastery updates
   - MasteryCalculatorService updates Topic Mastery per student/topic using decay + weighted update, then recomputes overall mastery.
4. Analytics aggregation
   - Class- and Topic-level Bloom analytics are computed from Topic Mastery records.
   - Assessment analytics (per Bloom level, comparisons) are generated for dashboards/reports.

---

### 2) Core Data Structures

- TopicMastery (DB model) per student/topic stores:
  - Bloom level mastery: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE (0–100)
  - overallMastery (0–100)
  - lastAssessmentDate, createdAt, updatedAt
- AssessmentResultData (input to mastery updates) contains:
  - topicId, subjectId, studentId, completedAt
  - bloomsLevelScores: for each Bloom level, a pair of { score, maxScore }

References:
- src/features/bloom/services/mastery/mastery-calculator.service.ts
- src/features/bloom/utils/mastery-helpers.ts
- src/features/bloom/constants/mastery-thresholds.ts

---

### 3) Topic Mastery Calculation

Mastery is derived from assessment results and updated over time with decay.

A) Initialize from an assessment result (first attempt)
- initializeMasteryFromResult(result)
  - For each Bloom level with maxScore > 0: percentage = (score / maxScore) * 100
  - overallMastery = weighted average of Bloom levels (see weights below)

B) Apply time-based decay (for existing mastery)
- applyMasteryDecay(mastery, DEFAULT_MASTERY_DECAY_CONFIG)
  - Default config:
    - enabled: true
    - decayRate: 0.5% per day
    - gracePeriod: 14 days (no decay before this)
    - minimumLevel: 50% floor
  - Each Bloom level decays by decayDays * decayRate, bounded by minimums.

C) Update levels with the new result
- updateMasteryLevels(currentMastery, newResult)
  - For each reported Bloom level: new = 0.7 * newPercentage + 0.3 * currentLevel
  - Update timestamps and recompute overallMastery

D) Overall Mastery formula (weighted average)
- BLOOMS_LEVEL_MASTERY_WEIGHTS (defaults):
  - REMEMBER: 0.10, UNDERSTAND: 0.15, APPLY: 0.20, ANALYZE: 0.20, EVALUATE: 0.15, CREATE: 0.20
- overallMastery = sum(levelValue * weight) / sum(weights), rounded to 1 decimal

E) Mastery Level thresholds (display/aggregation)
- DEFAULT_MASTERY_THRESHOLDS (percent):
  - NOVICE: 0, DEVELOPING: 60, PROFICIENT: 75, ADVANCED: 85, EXPERT: 95

Key code:
- MasteryCalculatorService.updateTopicMastery(...)
- mastery-helpers.{applyMasteryDecay, updateMasteryLevels, calculateOverallMastery, getMasteryLevel}

---

### 4) Bloom’s Analytics (Class/Topic/Student)

Computed primarily from Topic Mastery data.

Service: BloomsAnalyticsService.getClassPerformance(classId, startDate?, endDate?)
- Loads students in class and their Topic Mastery (optionally date‑filtered).
- Student performance:
  - Averages Bloom level values and overallMastery across topics for each student.
- Topic performance:
  - For each topic, aggregates studentCount, averageMastery, masteryByLevel per Bloom level, and counts of mastered/partially/not mastered.
  - Mastery band counts (in this service) use: mastered >= 80, partial >= 50, else not mastered.
- Class distribution:
  - Aggregates Bloom level averages and class averageMastery from studentPerformance.
- Cognitive gaps and interventions:
  - identifyCognitiveGaps: for topics where a level’s avg < 60%, flags gap, lists affected students.
  - generateInterventionSuggestions: activity/resource suggestions keyed to the gap’s Bloom level.
- Result is cached for 5 minutes for performance.

References:
- src/features/bloom/services/analytics/blooms-analytics.service.ts

---

### 5) Assessment Analytics

Service: AssessmentAnalyticsService
- getAssessmentPerformance(assessmentId)
  - Uses assessment.bloomsDistribution (if present) to simulate question‑level performance; returns per‑level averages and distribution.
  - Average score and student counts are currently placeholder/mock unless submissions are integrated in the call.
- compareAssessments(assessmentIds)
  - Fetches assessments, collects submission scores, computes overall score comparison.
  - Bloom’s level distributions taken from stored bloomsDistribution (or equal split fallback).
  - Produces cognitiveDistributions and cognitivePerformance arrays (currently mirroring distributions as placeholders).

References:
- src/features/bloom/services/analytics/assessment-analytics.service.ts

Note: Assessment analytics relies on properly populated assessment.bloomsDistribution and (ideally) question/attempt level data for real per‑level performance.

---

### 6) Workflow: From Creation to Analytics

1. Create Activity/Assessment
   - Link to Topic (topicId) and Subject (subjectId).
   - If available, set bloomsDistribution at authoring time to define intended cognitive focus.
2. Deliver & Grade
   - Students attempt the assessment/activity.
   - Grading pipeline should produce AssessmentResultData:
     - Per Bloom level, provide score and maxScore (derived from mapped questions/tasks).
3. Update Mastery
   - MasteryCalculatorService.updateTopicMastery(studentId, assessmentResult)
     - Applies decay, merges new result (70/30 weighting), upserts TopicMastery.
4. Generate Analytics
   - Class/Topic analytics from TopicMastery via BloomsAnalyticsService.
   - Assessment comparisons and per‑level analytics via AssessmentAnalyticsService.
5. Surface in UI
   - Dashboards use aggregated outputs (class distribution, topic performance, gaps, leaderboards).

---

### 7) Current Gaps & Recommendations

G1) Question‑level to Bloom‑level mapping pipeline
- Gap: AssessmentAnalyticsService uses placeholders/mocks for question performance; real question bank → Bloom level → grading mapping is not wired end‑to‑end here.
- Recommendation:
  - Ensure each question/task carries a Bloom level tag and point value.
  - On submission, aggregate scores per Bloom level to populate AssessmentResultData.bloomsLevelScores.

G2) Reliance on assessment.bloomsDistribution
- Gap: Distribution is used for analytics when question data isn’t available; this is intent, not observed performance.
- Recommendation: Favor observed performance from graded attempts; use bloomsDistribution only as authoring metadata.

G3) Decay and weighting calibration
- Gap: Defaults (0.5%/day decay, 14‑day grace, 70/30 new:old weighting, 50% minimum) may need pedagogical calibration.
- Recommendation: Make these configurable per program/grade level; run A/B or backtests to validate learning signal.

G4) Inconsistent mastery bands between services
- Observation: BloomsAnalyticsService uses mastered >= 80/partial >= 50; mastery-helpers expose separate thresholds for NOVICE→EXPERT.
- Recommendation: Centralize and reuse thresholds to avoid divergence; document bands clearly.

G5) Subject/Topic names in analytics helpers
- Gap: mastery-helpers compute with placeholders for subject/topic names.
- Recommendation: Join real names where available (or pass them in) to avoid placeholder labels in UI/exports.

G6) Activity (non‑assessment) contributions
- Gap: The document assumes assessments; if activities also produce Bloom‑level evidence, ensure they emit AssessmentResultData‑compatible records.
- Recommendation: Normalize activity event schema to the same per‑Bloom scoring structure.

G7) Caching/invalidations
- Observation: Class performance cached for 5 minutes.
- Recommendation: Invalidate cache on new mastery updates for the relevant class/topic to reduce staleness after grading.

---

### 8) Key Files
- Mastery update pipeline:
  - src/features/bloom/services/mastery/mastery-calculator.service.ts
  - src/features/bloom/utils/mastery-helpers.ts
  - src/features/bloom/constants/mastery-thresholds.ts
- Class/Topic Bloom analytics:
  - src/features/bloom/services/analytics/blooms-analytics.service.ts
- Assessment analytics:
  - src/features/bloom/services/analytics/assessment-analytics.service.ts
- Types:
  - src/features/bloom/types

---

### 9) TL;DR
- We compute Topic Mastery per student/topic from graded attempts using per‑Bloom scores, apply decay, then aggregate to Class/Topic analytics. Assessment analytics currently leans on authored distributions unless question‑level data is wired. Align the scoring pipeline to emit per‑Bloom evidence, calibrate decay/weights, and centralize thresholds to strengthen analytics validity.

