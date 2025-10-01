'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Badge } from '@/components/ui/atoms/badge';
import { Progress } from '@/components/ui/core/progress';
import { Button } from '@/components/ui/atoms/button';
import Link from 'next/link';
import {
  Eye,
  BookOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Users,
  User
} from 'lucide-react';
import { Volume2, MousePointer } from '@/components/ui/icons-fix';

interface StudentLearningProfileProps {
  studentId: string;
  studentName: string;
  classId?: string;
  profile: {
    learningStyle: {
      primary: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
      secondary?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
      confidence: number;
    };
    cognitivePreferences: {
      processingSpeed: 'fast' | 'moderate' | 'deliberate';
      complexityPreference: 'simple' | 'moderate' | 'complex';
      feedbackSensitivity: 'high' | 'moderate' | 'low';
      collaborationPreference: 'individual' | 'small_group' | 'large_group';
    };
    performancePatterns: {
      consistencyScore: number;
      improvementTrend: 'accelerating' | 'steady' | 'plateauing' | 'declining';
      peakPerformanceTime: 'morning' | 'afternoon' | 'evening' | 'variable';
      difficultyAdaptation: 'quick' | 'moderate' | 'slow';
    };
    engagementPatterns: {
      attentionSpan: 'short' | 'medium' | 'long';
      motivationTriggers: string[];
      procrastinationTendency: 'low' | 'moderate' | 'high';
      helpSeekingBehavior: 'proactive' | 'reactive' | 'reluctant';
    };
    riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      interventions: string[];
    }>;
    strengths: string[];
    adaptiveRecommendations: string[];
  };
}

const learningStyleIcons = {
  visual: Eye,
  auditory: Volume2,
  kinesthetic: MousePointer,
  reading_writing: BookOpen
};

const trendIcons = {
  accelerating: TrendingUp,
  steady: ArrowRight,
  plateauing: ArrowRight,
  declining: TrendingDown
};

const collaborationIcons = {
  individual: User,
  small_group: Users,
  large_group: Users
};

export function StudentLearningProfile({ studentId, studentName, classId, profile }: StudentLearningProfileProps) {
  // Safety check for profile data
  if (!profile || !profile.learningStyle || !profile.performancePatterns) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Learning profile data is not available yet. Please check back after the student completes more activities.
          </p>
        </CardContent>
      </Card>
    );
  }

  const LearningStyleIcon = learningStyleIcons[profile.learningStyle.primary] || Eye;
  const TrendIcon = trendIcons[profile.performancePatterns.improvementTrend] || TrendingUp;
  const CollaborationIcon = collaborationIcons[profile.cognitivePreferences.collaborationPreference] || User;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'accelerating': return 'text-green-600';
      case 'steady': return 'text-blue-600';
      case 'plateauing': return 'text-yellow-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{studentName}</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <LearningStyleIcon className="h-3 w-3" />
            {profile.learningStyle.primary}
          </Badge>
        </CardTitle>
        <CardDescription>
          Learning profile with {Math.round(profile.learningStyle.confidence * 100)}% confidence
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Performance Overview */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${getTrendColor(profile.performancePatterns.improvementTrend)}`} />
            Performance Patterns
          </h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Consistency Score</span>
              <span className="font-medium">{Math.round(profile.performancePatterns.consistencyScore)}%</span>
            </div>
            <Progress value={profile.performancePatterns.consistencyScore} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Peak Time:</span>
              <div className="font-medium capitalize">{profile.performancePatterns.peakPerformanceTime}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Adaptation:</span>
              <div className="font-medium capitalize">{profile.performancePatterns.difficultyAdaptation}</div>
            </div>
          </div>
        </div>

        {/* Cognitive Preferences */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CollaborationIcon className="h-4 w-4" />
            Cognitive Preferences
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Processing:</span>
              <div className="font-medium capitalize">{profile.cognitivePreferences.processingSpeed}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Complexity:</span>
              <div className="font-medium capitalize">{profile.cognitivePreferences.complexityPreference}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Feedback:</span>
              <div className="font-medium capitalize">{profile.cognitivePreferences.feedbackSensitivity}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Collaboration:</span>
              <div className="font-medium capitalize">{profile.cognitivePreferences.collaborationPreference.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        {/* Engagement Patterns */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Engagement Patterns
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Attention Span:</span>
              <div className="font-medium capitalize">{profile.engagementPatterns.attentionSpan}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Help Seeking:</span>
              <div className="font-medium capitalize">{profile.engagementPatterns.helpSeekingBehavior}</div>
            </div>
          </div>
          
          {profile.engagementPatterns?.motivationTriggers?.length > 0 && (
            <div>
              <span className="text-muted-foreground text-sm">Motivation Triggers:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {profile.engagementPatterns.motivationTriggers.slice(0, 3).map((trigger, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {trigger}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Factors */}
        {profile.riskFactors?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Risk Factors
            </h4>
            
            <div className="space-y-2">
              {profile.riskFactors.slice(0, 2).map((risk, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{risk.factor}</span>
                  <Badge variant={getSeverityColor(risk.severity) as any} className="text-xs">
                    {risk.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {profile.strengths?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Strengths
            </h4>
            
            <div className="flex flex-wrap gap-1">
              {profile.strengths.slice(0, 3).map((strength, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Recommendations */}
        {Array.isArray(profile.adaptiveRecommendations) && profile.adaptiveRecommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Top Recommendations</h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              {profile.adaptiveRecommendations.slice(0, 2).map((rec, index) => {
                if (typeof rec === 'string') {
                  return (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  );
                }
                if (rec && typeof rec === 'object') {
                  const r: any = rec as any;
                  return (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">{r.recommendation || 'Recommendation'}</span>
                          {r.type && (
                            <Badge variant="outline" className="uppercase tracking-wide text-[10px]">
                              {String(r.type)}
                            </Badge>
                          )}
                          {r.priority && (
                            <Badge variant="secondary" className="text-[10px]">
                              Priority: {String(r.priority)}
                            </Badge>
                          )}
                        </div>
                        {r.rationale && (
                          <div className="text-muted-foreground mt-1">
                            {String(r.rationale)}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        )}

        {/* View Full Profile Button */}
        {classId && (
          <div className="pt-4 border-t">
            <Link href={`/teacher/classes/${classId}/students/${studentId}/learning-profile`}>
              <Button variant="outline" size="sm" className="w-full">
                View Full Learning Profile
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
