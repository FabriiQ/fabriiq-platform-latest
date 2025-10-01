'use client';

import { useState } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { Button } from '@/components/ui/core/button';
import { Badge } from '@/components/ui/core/badge';
import { 
  Target, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LearningOutcome, SubjectTopic, AssessmentCriteria } from '../types';

interface CurriculumAlignmentPanelProps {
  className?: string;
}

/**
 * Panel showing curriculum alignment information including learning outcomes,
 * topics, and assessment criteria for the current class/subject
 */
export function CurriculumAlignmentPanel({ className }: CurriculumAlignmentPanelProps) {
  const { context } = useTeacherAssistant();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['outcomes']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const learningOutcomes = context.currentClass?.subject?.learningOutcomes || [];
  const topics = context.currentClass?.subject?.topics || [];
  const assessmentCriteria = context.assessmentCriteria || [];
  const gradeLevel = context.currentClass?.gradeLevel;
  const subjectName = context.currentClass?.subject?.name;

  if (!subjectName) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">Select a class to view curriculum alignment</p>
        <p className="text-xs mt-1 opacity-75">
          Choose a class from your dashboard to see learning outcomes, topics, and assessment criteria
        </p>
      </div>
    );
  }

  const getBloomsColor = (level: string) => {
    const colors: Record<string, string> = {
      'REMEMBER': 'bg-blue-100 text-blue-800 border-blue-200',
      'UNDERSTAND': 'bg-green-100 text-green-800 border-green-200',
      'APPLY': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'ANALYZE': 'bg-orange-100 text-orange-800 border-orange-200',
      'EVALUATE': 'bg-red-100 text-red-800 border-red-200',
      'CREATE': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[level.toUpperCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Target className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Curriculum Alignment</h3>
          <p className="text-sm text-muted-foreground">
            {subjectName} {gradeLevel && `• Grade ${gradeLevel}`}
          </p>
        </div>
      </div>

      {/* Learning Outcomes */}
      {learningOutcomes.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('outcomes')}
            className="w-full justify-between p-2 h-auto"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">Learning Outcomes</span>
              <Badge variant="secondary" className="text-xs">
                {learningOutcomes.length}
              </Badge>
            </div>
            {expandedSections.has('outcomes') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>

          {expandedSections.has('outcomes') && (
            <div className="space-y-3 pl-2">
              {learningOutcomes.map((outcome, index) => (
                <div key={outcome.id} className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed">
                        {outcome.statement}
                      </p>
                      {outcome.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {outcome.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getBloomsColor(outcome.bloomsLevel))}
                    >
                      {outcome.bloomsLevel}
                    </Badge>
                    {outcome.actionVerbs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {outcome.actionVerbs.slice(0, 3).map((verb, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {verb}
                          </span>
                        ))}
                        {outcome.actionVerbs.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{outcome.actionVerbs.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('topics')}
            className="w-full justify-between p-2 h-auto"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">Topics</span>
              <Badge variant="secondary" className="text-xs">
                {topics.length}
              </Badge>
            </div>
            {expandedSections.has('topics') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>

          {expandedSections.has('topics') && (
            <div className="space-y-2 pl-2">
              {topics.slice(0, 5).map((topic) => (
                <div key={topic.id} className="p-3 bg-muted/20 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{topic.title}</h4>
                      {topic.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {topic.description}
                        </p>
                      )}
                      {topic.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords.slice(0, 4).map((keyword, i) => (
                            <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                              {keyword}
                            </span>
                          ))}
                          {topic.keywords.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{topic.keywords.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {topics.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{topics.length - 5} more topics available
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assessment Criteria */}
      {assessmentCriteria.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('criteria')}
            className="w-full justify-between p-2 h-auto"
          >
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="font-medium">Assessment Criteria</span>
              <Badge variant="secondary" className="text-xs">
                {assessmentCriteria.length}
              </Badge>
            </div>
            {expandedSections.has('criteria') ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
            }
          </Button>

          {expandedSections.has('criteria') && (
            <div className="space-y-2 pl-2">
              {assessmentCriteria.slice(0, 4).map((criteria) => (
                <div key={criteria.id} className="p-3 bg-muted/20 rounded-lg border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{criteria.name}</h4>
                      {criteria.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {criteria.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{criteria.maxScore} pts</div>
                      <div className="text-xs text-muted-foreground">
                        Weight: {criteria.weight}
                      </div>
                    </div>
                  </div>
                  {criteria.bloomsLevel && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs mt-2", getBloomsColor(criteria.bloomsLevel))}
                    >
                      {criteria.bloomsLevel}
                    </Badge>
                  )}
                </div>
              ))}
              {assessmentCriteria.length > 4 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{assessmentCriteria.length - 4} more criteria available
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {learningOutcomes.length === 0 && topics.length === 0 && assessmentCriteria.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No curriculum data available</p>
          <p className="text-xs mt-1">
            Learning outcomes and topics will appear here when available
          </p>
        </div>
      )}
    </div>
  );
}
