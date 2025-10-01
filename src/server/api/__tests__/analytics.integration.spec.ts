import { jest } from '@jest/globals';
import { GradebookBloomIntegrationService } from '../../api/services/gradebook-bloom-integration.service';
import { EventDrivenAnalyticsService } from '../../api/services/event-driven-analytics';
import { RealTimeBloomsAnalyticsService } from '../../api/services/realtime-blooms-analytics.service';

// Minimal Prisma mock
const prisma: any = {
  activity: { findUnique: jest.fn() },
  activityGrade: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  gradeBook: { findFirst: jest.fn() },
  studentGrade: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  topicMastery: { upsert: jest.fn() },
  studentProfile: { findUnique: jest.fn() },
};

describe('Analytics integration (unit)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('recomputes topic mastery from activity grades', async () => {
    const svc = new GradebookBloomIntegrationService({ prisma });

    prisma.activityGrade.findMany.mockResolvedValue([
      { score: 80, attachments: { gradingDetails: { bloomsLevelScores: { REMEMBER: 50, UNDERSTAND: 30 } } }, activity: { maxScore: 100, subjectId: 'sub1', topicId: 'top1' } },
      { score: 70, attachments: {}, activity: { maxScore: 100, subjectId: 'sub1', topicId: 'top1', bloomsLevel: 'APPLY' } },
    ]);

    prisma.topicMastery.upsert.mockResolvedValue({ id: 'tm1' });

    const res = await svc.updateTopicMasteryForStudentTopic('stu1', 'class1', 'top1');

    expect(prisma.activityGrade.findMany).toHaveBeenCalled();
    expect(prisma.topicMastery.upsert).toHaveBeenCalled();
    expect(res).toEqual({ id: 'tm1' });
  });

  it('maps student dashboard updates to user.id when available', async () => {
    const evt = new EventDrivenAnalyticsService(prisma as any);

    prisma.studentProfile.findUnique.mockResolvedValue({ id: 'stu1', userId: 'user-123' });

    // Spy on internal emit to capture payload
    const spy = jest.spyOn(evt as any, 'emit');

    await (evt as any).triggerDashboardUpdates({
      studentId: 'stu1',
      classId: 'class1',
      subjectId: 'sub1',
      activityId: 'act1',
      score: 80,
      percentage: 80,
      gradedAt: new Date(),
    });

    const payload = spy.mock.calls.find(([event]) => event === 'DASHBOARD_UPDATE_REQUIRED')?.[1];

    expect(payload?.userId).toBe('user-123');
  });

  it('refreshes real-time bloom metrics after grade', async () => {
    const rt = new RealTimeBloomsAnalyticsService(prisma as any);
    (rt as any).updateRealTimeMetrics = jest.fn().mockResolvedValue(undefined);
    (rt as any).getStudentRealTimeMetrics = jest.fn().mockResolvedValue({ studentId: 'stu1', currentLevel: 'REMEMBER', recentActivities: [{ timestamp: new Date() }] });
    (rt as any).broadcastToConnections = jest.fn();

    await rt.refreshAfterGrade('stu1', 'class1');

    expect((rt as any).updateRealTimeMetrics).toHaveBeenCalledWith('stu1');
    expect((rt as any).getStudentRealTimeMetrics).toHaveBeenCalledWith('stu1');
    expect((rt as any).broadcastToConnections).toHaveBeenCalled();
  });
});

