'use client';

/**
 * Student Performance Statistics Component for Activities V2
 * 
 * Displays comprehensive performance statistics when students have exhausted all attempts
 * Shows scores, time spent, areas of strength/weakness, and comparison to class average
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Users, 
  Award,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star
} from 'lucide-react';

interface AttemptData {
  attemptNumber: number;
  score: number;
  timeSpent: number; // in minutes
  submittedAt: Date;
  feedback?: string;
}

interface PerformanceArea {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  isStrength: boolean;
}

interface ClassComparison {
  classAverage: number;
  studentRank: number;
  totalStudents: number;
  percentile: number;
}

interface StudentPerformanceStatsProps {
  activityTitle: string;
  activityType: 'quiz' | 'reading' | 'video';
  attempts: AttemptData[];
  maxAttempts: number;
  performanceAreas: PerformanceArea[];
  classComparison: ClassComparison;
  totalTimeSpent: number; // in minutes
  bestScore: number;
  averageScore: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  achievements?: string[];
  recommendations?: string[];
  className?: string;
}

export const StudentPerformanceStats: React.FC<StudentPerformanceStatsProps> = ({
  activityTitle,
  activityType,
  attempts,
  maxAttempts,
  performanceAreas,
  classComparison,
  totalTimeSpent,
  bestScore,
  averageScore,
  improvementTrend,
  achievements = [],
  recommendations = [],
  className = ''
}) => {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = () => {
    switch (improvementTrend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTrendText = () => {
    switch (improvementTrend) {
      case 'improving':
        return 'Improving Performance';
      case 'declining':
        return 'Declining Performance';
      default:
        return 'Stable Performance';
    }
  };

  const strengths = performanceAreas.filter(area => area.isStrength);
  const weaknesses = performanceAreas.filter(area => !area.isStrength);

  return (
    <div className={`student-performance-stats space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Activity Complete</h2>
        <p className="text-gray-600 mb-4">{activityTitle}</p>
        <Badge variant="outline" className="mb-4">
          All {maxAttempts} attempts used
        </Badge>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Score</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(bestScore)}`}>
                  {bestScore}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(averageScore)}`}>
                  {averageScore}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="text-2xl font-bold">{formatTime(totalTimeSpent)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Class Rank</p>
                <p className="text-2xl font-bold">#{classComparison.studentRank}</p>
                <p className="text-xs text-gray-500">of {classComparison.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTrendIcon()}
            {getTrendText()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attempts.map((attempt, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Attempt {attempt.attemptNumber}</Badge>
                  <div>
                    <p className="font-medium">Score: {attempt.score}%</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(attempt.timeSpent)} • {attempt.submittedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={getPerformanceBadgeColor(attempt.score)}>
                  {attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Good' : 'Needs Work'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Class Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Your Best Score</span>
              <span className="font-semibold">{bestScore}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Class Average</span>
              <span className="font-semibold">{classComparison.classAverage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Your Percentile</span>
              <Badge className={classComparison.percentile >= 75 ? 'bg-green-100 text-green-800' : 
                               classComparison.percentile >= 50 ? 'bg-yellow-100 text-yellow-800' : 
                               'bg-red-100 text-red-800'}>
                {classComparison.percentile}th percentile
              </Badge>
            </div>
            <Progress 
              value={classComparison.percentile} 
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-2">
              {bestScore > classComparison.classAverage 
                ? `You scored ${bestScore - classComparison.classAverage}% above the class average!`
                : bestScore < classComparison.classAverage
                ? `You scored ${classComparison.classAverage - bestScore}% below the class average.`
                : 'You scored exactly at the class average.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Areas of Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <div className="space-y-3">
                {strengths.map((area, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{area.topic}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={area.percentage} className="w-16" />
                      <span className="text-sm font-medium text-green-600">
                        {area.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Focus on improving your performance to identify strengths.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weaknesses.length > 0 ? (
              <div className="space-y-3">
                {weaknesses.map((area, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{area.topic}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={area.percentage} className="w-16" />
                      <span className="text-sm font-medium text-orange-600">
                        {area.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Great job! No significant areas for improvement identified.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Achievements Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement, index) => (
                <Badge key={index} className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1" />
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Recommendations for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer Message */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-blue-800">
            You have completed all available attempts for this activity. 
            Review your performance above and discuss with your teacher if you need additional support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
