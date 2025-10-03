/**
 * Root Router
 * Combines all API routers
 */

import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { institutionRouter } from "./routers/institution";
import { campusRouter } from "./routers/campus";
import { programRouter } from "./routers/program";
import { courseRouter } from "./routers/course";
import { subjectRouter } from "./routers/subject";
import { classRouter } from "./routers/class";
import { academicCycleRouter } from "./routers/academicCycle";
import { assessmentRouter } from "./routers/assessment";
import { essayAssessmentRouter } from "./routers/essay-assessment";
import { submissionRouter } from "./routers/submission";
import { feedbackRouter } from "./routers/feedback";
import { analyticsRouter } from "./routers/analytics";
import { activityRouter } from "./routers/activity";
import { activityV2Router } from "./routers/activity-v2";
import { fileStorageRouter } from "./routers/file-storage";
import { permissionRouter } from "./routers/permission";
import { curriculumRouter } from "./routers/curriculum";
import { termRouter } from "./routers/term";
import { scheduleRouter } from "./routers/schedule";
import { schedulePatternRouter } from "./routers/schedule-pattern";
import { attendanceRouter } from "./routers/attendance";
import { gradeRouter } from "./routers/grade";
import { assignmentRouter } from "./routers/assignment";
import { resourceRouter } from "./routers/resource";
import { notificationRouter } from "./routers/notification";
import { docsRouter } from "./routers/docs";
import { documentRouter } from "./routers/document";
import { enrollmentRouter } from "./routers/enrollment";
import { communicationRouter } from "./routers/communication";
import { exampleRouter } from "./routers/example.router";
import { gradingRouter } from "./routers/grading";
import { policyRouter } from "./routers/policy";
import { ferpaRouter } from "./routers/ferpa";
import { subjectTopicRouter } from "./routers/subjectTopic";
import { activityGradeRouter } from "./routers/activityGrade";
import { facilityRouter } from "./routers/facility";
import { studentRouter } from "./routers/student";
import { teacherRouter } from "./routers/teacher";
import { coordinatorRouter } from "./routers/coordinator";
import { programAnalyticsRouter } from "./routers/program-analytics";
import { teacherAssignmentRouter } from "./routers/teacher-assignment";
import { studentPerformanceRouter } from "./routers/student-performance";
import { teacherRoleRouter } from "./routers/teacher-role";
import { leaderboardRouter } from "./routers/leaderboard";
import { unifiedLeaderboardRouter } from "./routers/unified-leaderboard";
import { systemAnalyticsRouter } from "./routers/system-analytics";
import { campusAnalyticsRouter } from "./routers/campus-analytics";
import { campusAttendanceAnalyticsRouter } from "./routers/campus-attendance-analytics";
import { gradebookRouter } from "./routers/gradebook";
import { classAnalyticsRouter } from "./routers/class-analytics";
import { courseAnalyticsRouter } from "./routers/course-analytics";
import { worksheetRouter } from "./routers/worksheet";
import { aiContentStudioRouter } from "./routers/ai-content-studio";
import { activityTeacherRouter } from "./routers/activity-teacher";
import { classTeacherRouter } from "./routers/class-teacher";
import { lessonPlanRouter } from "./routers/lesson-plan";
import { canvasRouter } from "./routers/canvas";
import { consentRouter } from "./routers/consent";
import { rightsRouter } from "./routers/rights";
import { policyAcceptanceRouter } from "./routers/policy-acceptance";
import { incidentResponseRouter } from "./routers/incident-response";
import { policyVersioningRouter } from "./routers/policy-versioning";

// Fee Management Routers
import { feeStructureRouter } from "./routers/fee-structure";
import { discountTypeRouter } from "./routers/discount-type";
import { enrollmentFeeRouter } from "./routers/enrollment-fee";
import { challanRouter } from "./routers/challan";
import { invoiceRouter } from "./routers/invoice";
import { programCampusRouter } from "./routers/program-campus";
import { financialReportsRouter } from "./routers/financial-reports";
import { settingsRouter } from "./routers/settings";
import { lateFeeRouter } from "./routers/late-fee";
import { unifiedFeeManagementRouter } from "./routers/unified-fee-management";

// Reward System Routers
import { achievementRouter } from "./routers/achievement";
import { pointsRouter } from "./routers/points";
import { levelRouter } from "./routers/level";
import { learningGoalRouter } from "./routers/learning-goal";
import { journeyEventRouter } from "./routers/journey-event";
import { personalBestRouter } from "./routers/personal-best";
import { commitmentContractRouter } from "./routers/commitment-contract";
import { activityJourneyRouter } from "./routers/activity-journey";
import { activitiesRouter } from "./routers/activities";
import { rewardsRouter } from "./routers/rewards";
import { rewardConfigRouter } from "./routers/reward-config";

// Background Jobs Router
import { backgroundJobsRouter } from "./routers/background-jobs";

// Question Bank Router
import { questionBankRouter, questionUsageRouter } from "@/features/question-bank/api";

// Learning Time Router
import { learningTimeRouter } from "./routers/learning-time";
import { learningTimeRecordRouter } from "./routers/learningTimeRecord";
import { teacherAnalyticsRouter } from "./routers/teacher-analytics";
import { teacherLeaderboardRouter } from "./routers/teacher-leaderboard";
import { classTransferRouter } from "./routers/class-transfer";
import { teacherPointsRouter } from "./routers/teacher-points";
import { coordinatorAnalyticsRouter } from "./routers/coordinator-analytics";
import { classPerformanceRouter } from "./routers/class-performance";
import { studentAssistantRouter } from "./routers/student-assistant";
import { teacherAssistantRouter } from "./routers/teacher-assistant";
import { teacherAssistantV2Router } from "../../features/teacher-assistant-v2/server/router";
import { agentsv2Router } from "./routers/agentsv2";
import { teacherAttendanceRouter } from "./routers/teacher-attendance";
import { learningOutcomeRouter } from "./routers/learning-outcome";
import { learningPatternsRouter } from "./routers/learning-patterns";

// Bloom's Taxonomy Routers
import { bloomRouter, masteryRouter, rubricRouter } from "@/features/bloom/api";
import { bloomsAnalyticsRouter } from "@/features/bloom/api/blooms-analytics.router";
import { bloomGradingRouter } from "./routers/bloom-grading";
import { gradebookBloomIntegrationRouter } from "./routers/gradebook-bloom-integration";
import { systemConfigRouter } from "./routers/system-config";

// Social Wall Router
import { socialWallRouter } from "./routers/social-wall";

// Messaging Router (High-Performance Communication Hub)
import { messagingRouter } from "./routers/messaging";

// AI Question Generator Router
import { aiQuestionGeneratorRouter } from "./routers/ai-question-generator";

// Circle Router (Student Social Learning)
import { circleRouter } from "./routers/circle";

// Personal Calendar Router
import { personalCalendarRouter } from "./routers/personal-calendar";

// Unified Calendar Router
import { unifiedCalendarRouter } from "./routers/unified-calendar";

// Working Days Router
import { workingDaysRouter } from "./routers/working-days";

// Holiday Management Router
import { holidayManagementRouter } from "./routers/holiday-management";

// Holiday Router
import { holidayRouter } from "./routers/holiday";

// Academic Calendar Router
import { academicCalendarRouter } from "./routers/academic-calendar";

// Static Data Router (for performance optimization)
import { staticDataRouter } from "./routers/static-data";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  staticData: staticDataRouter,
  institution: institutionRouter,
  campus: campusRouter,
  program: programRouter,
  course: courseRouter,
  subject: subjectRouter,
  class: classRouter,
  academicCycle: academicCycleRouter,
  assessment: assessmentRouter,
  essayAssessment: essayAssessmentRouter,
  submission: submissionRouter,
  feedback: feedbackRouter,
  analytics: analyticsRouter,
  activity: activityRouter,
  activityV2: activityV2Router,
  fileStorage: fileStorageRouter,
  permission: permissionRouter,
  curriculum: curriculumRouter,
  term: termRouter,
  schedule: scheduleRouter,
  attendance: attendanceRouter,
  grade: gradeRouter,
  assignment: assignmentRouter,
  resource: resourceRouter,
  notification: notificationRouter,
  enrollment: enrollmentRouter,
  document: documentRouter,
  communication: communicationRouter,
  docs: docsRouter,
  example: exampleRouter,
  grading: gradingRouter,
  policy: policyRouter,
  ferpa: ferpaRouter,
  subjectTopic: subjectTopicRouter,
  topic: subjectTopicRouter, // Alias for backward compatibility
  activityGrade: activityGradeRouter,
  facility: facilityRouter,
  student: studentRouter,
  teacher: teacherRouter,
  coordinator: coordinatorRouter,
  programAnalytics: programAnalyticsRouter,
  teacherAssignment: teacherAssignmentRouter,
  studentPerformance: studentPerformanceRouter,
  teacherRole: teacherRoleRouter,
  leaderboard: leaderboardRouter,
  unifiedLeaderboard: unifiedLeaderboardRouter,
  systemAnalytics: systemAnalyticsRouter,
  campusAnalytics: campusAnalyticsRouter,
  campusAttendanceAnalytics: campusAttendanceAnalyticsRouter,
  gradebook: gradebookRouter,
  schedulePattern: schedulePatternRouter,
  classAnalytics: classAnalyticsRouter,
  courseAnalytics: courseAnalyticsRouter,
  worksheet: worksheetRouter,
  aiContentStudio: aiContentStudioRouter,
  activityTeacher: activityTeacherRouter,
  classTeacher: classTeacherRouter,
  lessonPlan: lessonPlanRouter,
  canvas: canvasRouter,

  // Fee Management Routers
  feeStructure: feeStructureRouter,
  discountType: discountTypeRouter,
  enrollmentFee: enrollmentFeeRouter,
  challan: challanRouter,
  invoice: invoiceRouter,
  programCampus: programCampusRouter,
  financialReports: financialReportsRouter,
  settings: settingsRouter,
  lateFee: lateFeeRouter,
  unifiedFeeManagement: unifiedFeeManagementRouter,

  // Reward System Routers
  achievement: achievementRouter,
  points: pointsRouter,
  level: levelRouter,
  learningGoal: learningGoalRouter,
  journeyEvent: journeyEventRouter,
  personalBest: personalBestRouter,
  commitmentContract: commitmentContractRouter,
  activityJourney: activityJourneyRouter,
  rewards: rewardsRouter,
  rewardConfig: rewardConfigRouter,

  // Background Jobs Router
  backgroundJobs: backgroundJobsRouter,

  // Question Bank Router
  questionBank: questionBankRouter,
  questionUsage: questionUsageRouter,

  // Learning Time Router
  learningTime: learningTimeRouter,
  learningTimeRecord: learningTimeRecordRouter,

  // Teacher Management Routers
  teacherAnalytics: teacherAnalyticsRouter,
  teacherLeaderboard: teacherLeaderboardRouter,
  teacherPoints: teacherPointsRouter,
  classTransfer: classTransferRouter,

  // Coordinator Management Routers
  coordinatorAnalytics: coordinatorAnalyticsRouter,

  // Class Performance Router
  classPerformance: classPerformanceRouter,

  // Activities Router
  activities: activitiesRouter,

  // Student Assistant Router
  studentAssistant: studentAssistantRouter,

  // Teacher Assistant Router
  teacherAssistant: teacherAssistantRouter,

  // Teacher Assistant V2 Router
  teacherAssistantV2: teacherAssistantV2Router,

  // Agents V2 Router
  agentsv2: agentsv2Router,

  // Teacher Attendance Router
  teacherAttendance: teacherAttendanceRouter,

  // Learning Outcome Router
  learningOutcome: learningOutcomeRouter,

  // Bloom's Taxonomy Routers
  bloom: bloomRouter,
  mastery: masteryRouter,
  rubric: rubricRouter,
  bloomsAnalytics: bloomsAnalyticsRouter,
  bloomGrading: bloomGradingRouter,
  gradebookBloomIntegration: gradebookBloomIntegrationRouter,

  // System Configuration Router
  systemConfig: systemConfigRouter,

  // Social Wall Router
  socialWall: socialWallRouter,

  // Messaging Router (High-Performance Communication Hub)
  messaging: messagingRouter,

  // Learning Patterns Router
  learningPatterns: learningPatternsRouter,

  // AI Question Generator Router
  aiQuestionGenerator: aiQuestionGeneratorRouter,

  // Circle Router (Student Social Learning)
  circle: circleRouter,
  consent: consentRouter,
  rights: rightsRouter,
  policyAcceptance: policyAcceptanceRouter,
  incidentResponse: incidentResponseRouter,
  policyVersioning: policyVersioningRouter,

  // Personal Calendar Router
  personalCalendar: personalCalendarRouter,

  // Unified Calendar Router
  unifiedCalendar: unifiedCalendarRouter,

  // Working Days Router
  workingDays: workingDaysRouter,

  // Holiday Management Router
  holidayManagement: holidayManagementRouter,

  // Holiday Router
  holiday: holidayRouter,

  // Academic Calendar Event Router (mapped to academicCalendar)
  academicCalendarEvent: academicCalendarRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

