# Question Bank Analytics Integration Specification

## 🎯 Overview

This document details the comprehensive integration between Activities V2 and Question Bank analytics, ensuring that every question usage is tracked, analyzed, and contributes to the overall educational intelligence of the system.

## 📊 Analytics Architecture

### Core Components
```
src/features/activities-v2/analytics/
├── question-usage/          # Question usage tracking
├── performance/            # Performance analytics
├── difficulty-calibration/ # Dynamic difficulty adjustment
├── bloom-effectiveness/    # Bloom's taxonomy analysis
└── recommendation/         # Question recommendation engine
```

## 🔍 Question Usage Tracking

### Usage Analytics Service

```typescript
// src/features/activities-v2/analytics/question-usage/question-usage-analytics.service.ts
export class QuestionUsageAnalyticsService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  async trackQuestionUsage(usage: QuestionUsageEvent): Promise<void> {
    // Record detailed usage analytics
    await this.prisma.questionUsageAnalytics.create({
      data: {
        questionId: usage.questionId,
        activityId: usage.activityId,
        studentId: usage.studentId,
        classId: usage.classId,
        subjectId: usage.subjectId,
        
        // Response data
        isCorrect: usage.isCorrect,
        responseTime: usage.responseTime,
        attemptNumber: usage.attemptNumber,
        
        // Context data
        assessmentMode: usage.assessmentMode,
        questionOrder: usage.questionOrder,
        totalQuestions: usage.totalQuestions,
        
        // Performance indicators
        difficultyPerceived: usage.difficultyPerceived,
        confidenceLevel: usage.confidenceLevel,
        
        // Timestamps
        startedAt: usage.startedAt,
        completedAt: usage.completedAt,
        
        // Metadata
        metadata: {
          deviceType: usage.deviceType,
          browserInfo: usage.browserInfo,
          sessionDuration: usage.sessionDuration,
          previousQuestions: usage.previousQuestions
        }
      }
    });

    // Update question performance metrics
    await this.updateQuestionMetrics(usage.questionId, usage);
    
    // Update Bloom's taxonomy effectiveness
    await this.updateBloomsEffectiveness(usage.questionId, usage);
    
    // Trigger difficulty recalibration if needed
    await this.checkDifficultyRecalibration(usage.questionId);
  }

  async getQuestionPerformanceAnalytics(
    questionId: string,
    timeRange?: DateRange
  ): Promise<QuestionPerformanceAnalytics> {
    const whereClause = {
      questionId,
      ...(timeRange && {
        completedAt: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      })
    };

    const [
      totalUsage,
      correctResponses,
      averageTime,
      difficultyDistribution,
      bloomsPerformance,
      classPerformance
    ] = await Promise.all([
      this.prisma.questionUsageAnalytics.count({ where: whereClause }),
      this.prisma.questionUsageAnalytics.count({ 
        where: { ...whereClause, isCorrect: true } 
      }),
      this.prisma.questionUsageAnalytics.aggregate({
        where: whereClause,
        _avg: { responseTime: true }
      }),
      this.getDifficultyDistribution(questionId, timeRange),
      this.getBloomsPerformance(questionId, timeRange),
      this.getClassPerformance(questionId, timeRange)
    ]);

    return {
      questionId,
      totalUsage,
      correctRate: totalUsage > 0 ? correctResponses / totalUsage : 0,
      averageResponseTime: averageTime._avg.responseTime || 0,
      difficultyIndex: this.calculateDifficultyIndex(correctResponses, totalUsage),
      discriminationIndex: await this.calculateDiscriminationIndex(questionId, timeRange),
      reliabilityCoefficient: await this.calculateReliabilityCoefficient(questionId, timeRange),
      difficultyDistribution,
      bloomsPerformance,
      classPerformance,
      trends: await this.calculatePerformanceTrends(questionId, timeRange),
      recommendations: await this.generateQuestionRecommendations(questionId)
    };
  }

  private async updateQuestionMetrics(
    questionId: string,
    usage: QuestionUsageEvent
  ): Promise<void> {
    // Update or create question metrics record
    await this.prisma.questionMetrics.upsert({
      where: { questionId },
      update: {
        totalUsage: { increment: 1 },
        correctResponses: usage.isCorrect ? { increment: 1 } : undefined,
        totalResponseTime: { increment: usage.responseTime },
        lastUsedAt: new Date(),
        
        // Update running averages
        averageResponseTime: await this.calculateRunningAverage(
          questionId, 
          'responseTime', 
          usage.responseTime
        ),
        
        // Update difficulty metrics
        perceivedDifficultySum: { increment: usage.difficultyPerceived || 0 },
        
        // Update metadata
        metadata: {
          lastActivity: usage.activityId,
          lastClass: usage.classId,
          recentPerformance: await this.getRecentPerformance(questionId, 10)
        }
      },
      create: {
        questionId,
        totalUsage: 1,
        correctResponses: usage.isCorrect ? 1 : 0,
        totalResponseTime: usage.responseTime,
        averageResponseTime: usage.responseTime,
        perceivedDifficultySum: usage.difficultyPerceived || 0,
        firstUsedAt: new Date(),
        lastUsedAt: new Date(),
        metadata: {
          lastActivity: usage.activityId,
          lastClass: usage.classId,
          recentPerformance: [usage.isCorrect]
        }
      }
    });
  }

  private async updateBloomsEffectiveness(
    questionId: string,
    usage: QuestionUsageEvent
  ): Promise<void> {
    const question = await this.questionBankService.getQuestion(questionId);
    if (!question.bloomsLevel) return;

    await this.prisma.bloomsEffectivenessMetrics.upsert({
      where: {
        questionId_bloomsLevel: {
          questionId,
          bloomsLevel: question.bloomsLevel
        }
      },
      update: {
        totalAttempts: { increment: 1 },
        correctAttempts: usage.isCorrect ? { increment: 1 } : undefined,
        totalResponseTime: { increment: usage.responseTime },
        lastAttemptAt: new Date()
      },
      create: {
        questionId,
        bloomsLevel: question.bloomsLevel,
        totalAttempts: 1,
        correctAttempts: usage.isCorrect ? 1 : 0,
        totalResponseTime: usage.responseTime,
        firstAttemptAt: new Date(),
        lastAttemptAt: new Date()
      }
    });
  }
}
```

### Real-time Analytics Dashboard

```typescript
// src/features/activities-v2/analytics/components/QuestionAnalyticsDashboard.tsx
export const QuestionAnalyticsDashboard: React.FC<QuestionAnalyticsDashboardProps> = ({
  questionId,
  timeRange = 'last_30_days'
}) => {
  const { data: analytics, isLoading } = api.questionAnalytics.getPerformance.useQuery({
    questionId,
    timeRange
  });

  const { data: usageHistory } = api.questionAnalytics.getUsageHistory.useQuery({
    questionId,
    timeRange
  });

  if (isLoading) return <AnalyticsLoadingSkeleton />;

  return (
    <div className="question-analytics-dashboard">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <AnalyticsCard
          title="Total Usage"
          value={analytics.totalUsage}
          trend={analytics.trends.usageTrend}
          icon={<Activity className="h-4 w-4" />}
        />
        <AnalyticsCard
          title="Correct Rate"
          value={`${(analytics.correctRate * 100).toFixed(1)}%`}
          trend={analytics.trends.correctRateTrend}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <AnalyticsCard
          title="Avg Response Time"
          value={`${analytics.averageResponseTime.toFixed(1)}s`}
          trend={analytics.trends.responseTimeTrend}
          icon={<Clock className="h-4 w-4" />}
        />
        <AnalyticsCard
          title="Difficulty Index"
          value={analytics.difficultyIndex.toFixed(2)}
          trend={analytics.trends.difficultyTrend}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceTimeChart data={usageHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponseTimeHistogram data={analytics.responseTimeDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassPerformanceTable data={analytics.classPerformance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bloom's Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <BloomsEffectivenessChart data={analytics.bloomsPerformance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionRecommendationsList recommendations={analytics.recommendations} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

## 🎯 Dynamic Difficulty Calibration

### Difficulty Calibration Service

```typescript
// src/features/activities-v2/analytics/difficulty-calibration/difficulty-calibration.service.ts
export class DifficultyCalibrationService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  async calibrateQuestionDifficulty(questionId: string): Promise<DifficultyCalibration> {
    const analytics = await this.getQuestionAnalytics(questionId);
    
    if (analytics.totalUsage < 10) {
      // Not enough data for reliable calibration
      return {
        questionId,
        currentDifficulty: analytics.currentDifficulty,
        calibratedDifficulty: analytics.currentDifficulty,
        confidence: 'low',
        sampleSize: analytics.totalUsage,
        recommendation: 'collect_more_data'
      };
    }

    // Calculate new difficulty based on performance metrics
    const calibratedDifficulty = this.calculateCalibratedDifficulty(analytics);
    
    // Determine confidence level
    const confidence = this.calculateConfidenceLevel(analytics);
    
    // Generate recommendation
    const recommendation = this.generateDifficultyRecommendation(
      analytics.currentDifficulty,
      calibratedDifficulty,
      confidence
    );

    // Update question difficulty if confidence is high
    if (confidence === 'high' && Math.abs(calibratedDifficulty - analytics.currentDifficulty) > 0.2) {
      await this.updateQuestionDifficulty(questionId, calibratedDifficulty);
    }

    return {
      questionId,
      currentDifficulty: analytics.currentDifficulty,
      calibratedDifficulty,
      confidence,
      sampleSize: analytics.totalUsage,
      recommendation,
      metrics: {
        correctRate: analytics.correctRate,
        discriminationIndex: analytics.discriminationIndex,
        averageResponseTime: analytics.averageResponseTime,
        difficultyIndex: analytics.difficultyIndex
      }
    };
  }

  private calculateCalibratedDifficulty(analytics: QuestionPerformanceAnalytics): number {
    // Use multiple factors to determine difficulty
    const correctRateFactor = 1 - analytics.correctRate; // Higher correct rate = lower difficulty
    const responseTimeFactor = Math.min(analytics.averageResponseTime / 60, 1); // Normalize to 0-1
    const discriminationFactor = analytics.discriminationIndex; // Higher discrimination = more reliable
    
    // Weighted combination
    const weights = {
      correctRate: 0.6,
      responseTime: 0.3,
      discrimination: 0.1
    };
    
    const calibratedDifficulty = 
      (correctRateFactor * weights.correctRate) +
      (responseTimeFactor * weights.responseTime) +
      (discriminationFactor * weights.discrimination);
    
    // Normalize to 0-1 scale
    return Math.max(0, Math.min(1, calibratedDifficulty));
  }

  private calculateConfidenceLevel(analytics: QuestionPerformanceAnalytics): 'low' | 'medium' | 'high' {
    const sampleSize = analytics.totalUsage;
    const discrimination = analytics.discriminationIndex;
    
    if (sampleSize >= 100 && discrimination >= 0.3) return 'high';
    if (sampleSize >= 50 && discrimination >= 0.2) return 'medium';
    return 'low';
  }

  async batchCalibrateQuestions(questionIds: string[]): Promise<DifficultyCalibration[]> {
    const calibrations = await Promise.all(
      questionIds.map(id => this.calibrateQuestionDifficulty(id))
    );

    // Generate batch report
    await this.generateCalibrationReport(calibrations);

    return calibrations;
  }
}
```

## 🎓 Bloom's Taxonomy Effectiveness Analysis

### Bloom's Analytics Service

```typescript
// src/features/activities-v2/analytics/bloom-effectiveness/blooms-analytics.service.ts
export class BloomsAnalyticsService {
  async analyzeBloomsEffectiveness(
    questionId: string,
    timeRange?: DateRange
  ): Promise<BloomsEffectivenessAnalysis> {
    const question = await this.questionBankService.getQuestion(questionId);
    if (!question.bloomsLevel) {
      throw new Error('Question does not have Bloom\'s taxonomy level assigned');
    }

    const analytics = await this.getBloomsAnalytics(questionId, timeRange);
    
    return {
      questionId,
      bloomsLevel: question.bloomsLevel,
      effectiveness: this.calculateEffectiveness(analytics),
      alignment: await this.assessBloomsAlignment(question, analytics),
      recommendations: this.generateBloomsRecommendations(question, analytics),
      comparativeAnalysis: await this.getComparativeAnalysis(question.bloomsLevel, analytics)
    };
  }

  private calculateEffectiveness(analytics: BloomsAnalyticsData): BloomsEffectiveness {
    const correctRate = analytics.correctAttempts / analytics.totalAttempts;
    const averageTime = analytics.totalResponseTime / analytics.totalAttempts;
    
    // Effectiveness based on expected performance for Bloom's level
    const expectedCorrectRate = this.getExpectedCorrectRate(analytics.bloomsLevel);
    const expectedResponseTime = this.getExpectedResponseTime(analytics.bloomsLevel);
    
    const correctRateEffectiveness = correctRate / expectedCorrectRate;
    const timeEffectiveness = expectedResponseTime / averageTime;
    
    // Combined effectiveness score
    const overallEffectiveness = (correctRateEffectiveness + timeEffectiveness) / 2;
    
    return {
      score: Math.max(0, Math.min(1, overallEffectiveness)),
      correctRateAlignment: correctRateEffectiveness,
      timeAlignment: timeEffectiveness,
      interpretation: this.interpretEffectiveness(overallEffectiveness)
    };
  }

  private async assessBloomsAlignment(
    question: Question,
    analytics: BloomsAnalyticsData
  ): Promise<BloomsAlignment> {
    // Analyze if question performance matches expected Bloom's level behavior
    const performancePattern = this.analyzePerformancePattern(analytics);
    const expectedPattern = this.getExpectedPattern(question.bloomsLevel);
    
    const alignment = this.calculatePatternAlignment(performancePattern, expectedPattern);
    
    return {
      score: alignment,
      currentLevel: question.bloomsLevel,
      suggestedLevel: this.suggestBloomsLevel(performancePattern),
      confidence: this.calculateAlignmentConfidence(analytics.totalAttempts),
      reasoning: this.generateAlignmentReasoning(performancePattern, expectedPattern)
    };
  }

  async generateBloomsReport(
    subjectId: string,
    timeRange?: DateRange
  ): Promise<BloomsSubjectReport> {
    const questions = await this.questionBankService.getQuestionsBySubject(subjectId);
    const bloomsQuestions = questions.filter(q => q.bloomsLevel);
    
    const analyses = await Promise.all(
      bloomsQuestions.map(q => this.analyzeBloomsEffectiveness(q.id, timeRange))
    );

    // Group by Bloom's level
    const levelAnalyses = this.groupByBloomsLevel(analyses);
    
    return {
      subjectId,
      timeRange,
      totalQuestions: bloomsQuestions.length,
      levelDistribution: this.calculateLevelDistribution(bloomsQuestions),
      levelEffectiveness: this.calculateLevelEffectiveness(levelAnalyses),
      recommendations: this.generateSubjectRecommendations(levelAnalyses),
      trends: await this.calculateBloomsTrends(subjectId, timeRange)
    };
  }
}
```

## 🤖 Question Recommendation Engine

### Recommendation Service

```typescript
// src/features/activities-v2/analytics/recommendation/question-recommendation.service.ts
export class QuestionRecommendationService {
  async generateRecommendations(
    context: RecommendationContext
  ): Promise<QuestionRecommendations> {
    const recommendations: QuestionRecommendation[] = [];

    // Performance-based recommendations
    const performanceRecs = await this.generatePerformanceRecommendations(context);
    recommendations.push(...performanceRecs);

    // Bloom's taxonomy recommendations
    const bloomsRecs = await this.generateBloomsRecommendations(context);
    recommendations.push(...bloomsRecs);

    // Difficulty progression recommendations
    const difficultyRecs = await this.generateDifficultyRecommendations(context);
    recommendations.push(...difficultyRecs);

    // Usage pattern recommendations
    const usageRecs = await this.generateUsageRecommendations(context);
    recommendations.push(...usageRecs);

    // Sort by priority and confidence
    const sortedRecommendations = recommendations.sort((a, b) => 
      (b.priority * b.confidence) - (a.priority * a.confidence)
    );

    return {
      context,
      recommendations: sortedRecommendations.slice(0, 10), // Top 10 recommendations
      metadata: {
        generatedAt: new Date(),
        totalRecommendations: recommendations.length,
        averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
      }
    };
  }

  private async generatePerformanceRecommendations(
    context: RecommendationContext
  ): Promise<QuestionRecommendation[]> {
    const recommendations: QuestionRecommendation[] = [];
    
    // Find questions with poor performance
    const poorPerformingQuestions = await this.findPoorPerformingQuestions(context);
    
    for (const question of poorPerformingQuestions) {
      recommendations.push({
        type: 'performance_improvement',
        questionId: question.id,
        title: 'Improve Question Performance',
        description: `This question has a low correct rate (${(question.correctRate * 100).toFixed(1)}%). Consider reviewing the question content or difficulty.`,
        action: 'review_question',
        priority: 0.8,
        confidence: 0.9,
        data: {
          currentCorrectRate: question.correctRate,
          expectedCorrectRate: 0.7,
          sampleSize: question.totalUsage
        }
      });
    }

    return recommendations;
  }

  private async generateBloomsRecommendations(
    context: RecommendationContext
  ): Promise<QuestionRecommendation[]> {
    const recommendations: QuestionRecommendation[] = [];
    
    // Analyze Bloom's distribution
    const bloomsDistribution = await this.analyzeBloomsDistribution(context);
    
    // Recommend questions for underrepresented levels
    for (const [level, percentage] of Object.entries(bloomsDistribution)) {
      if (percentage < 0.1) { // Less than 10%
        const suggestedQuestions = await this.findQuestionsByBloomsLevel(level, context);
        
        recommendations.push({
          type: 'blooms_balance',
          questionId: null,
          title: `Add ${level} Questions`,
          description: `Your activity has only ${(percentage * 100).toFixed(1)}% ${level} questions. Consider adding more to improve Bloom's taxonomy balance.`,
          action: 'add_questions',
          priority: 0.7,
          confidence: 0.8,
          data: {
            bloomsLevel: level,
            currentPercentage: percentage,
            suggestedQuestions: suggestedQuestions.slice(0, 5)
          }
        });
      }
    }

    return recommendations;
  }
}
```

This comprehensive Question Bank analytics integration ensures that every question usage contributes to the educational intelligence of the system, enabling data-driven improvements to question quality, difficulty calibration, and learning effectiveness.
