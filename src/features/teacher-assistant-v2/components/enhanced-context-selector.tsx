'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '@/utils/api';

// Import the enhanced assessment creator components
import { SubjectSelector } from '@/features/assessments/components/creation/dialog-steps/SubjectSelector';
import { TopicSelector } from '@/features/assessments/components/creation/dialog-steps/TopicSelector';
import { LearningOutcomeSelector } from '@/features/assessments/components/creation/dialog-steps/LearningOutcomeSelector';


interface EnhancedContextSelectorProps {
  onContextChange: (context: ContextData) => void;
  className?: string;
}

export interface ContextData {
  subjectId?: string;
  subjectName?: string;
  topicIds: string[];
  topicNames: string[];
  learningOutcomes: string[];
  assessmentCriteria: string[];
  gradeLevel?: string;
}

export function EnhancedContextSelector({ onContextChange, className }: EnhancedContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  
  // Context state
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [selectedLearningOutcomes, setSelectedLearningOutcomes] = useState<string[]>([]);
  const [selectedAssessmentCriteria, setSelectedAssessmentCriteria] = useState<string[]>([]);


  // Fetch data
  const { data: subjects } = api.subject.getAllSubjects.useQuery();
  const { data: topics } = api.subject.getTopics.useQuery(
    { subjectId },
    { enabled: !!subjectId }
  );

  // Note: selectedSubject and selectedTopics are now computed inside useEffect to avoid circular dependencies

  // Update context when selections change
  useEffect(() => {
    const selectedSubject = subjects?.find(s => s.id === subjectId);
    const selectedTopics = topics?.filter(t => topicIds.includes(t.id)) || [];

    const contextData: ContextData = {
      subjectId: subjectId || undefined,
      subjectName: selectedSubject?.name || undefined,
      topicIds,
      topicNames: selectedTopics.map(t => t.title),
      learningOutcomes: selectedLearningOutcomes,
      assessmentCriteria: selectedAssessmentCriteria,
    };

    const hasAnyContext = !!(subjectId || topicIds.length > 0 || selectedLearningOutcomes.length > 0 || selectedAssessmentCriteria.length > 0);
    setHasContext(hasAnyContext);

    onContextChange(contextData);
  }, [subjectId, topicIds, selectedLearningOutcomes, selectedAssessmentCriteria, subjects, topics, onContextChange]);

  const clearContext = () => {
    setSubjectId('');
    setTopicIds([]);
    setSelectedLearningOutcomes([]);
    setSelectedAssessmentCriteria([]);
  };

  const getContextSummary = () => {
    const parts: string[] = [];
    const selectedSubject = subjects?.find(s => s.id === subjectId);
    const selectedTopics = topics?.filter(t => topicIds.includes(t.id)) || [];

    if (selectedSubject) parts.push(selectedSubject.name);
    if (selectedTopics.length > 0) {
      if (selectedTopics.length === 1) {
        parts.push(selectedTopics[0].title);
      } else {
        parts.push(`${selectedTopics.length} topics`);
      }
    }
    if (selectedLearningOutcomes.length > 0) {
      parts.push(`${selectedLearningOutcomes.length} outcomes`);
    }
    if (selectedAssessmentCriteria.length > 0) {
      parts.push(`${selectedAssessmentCriteria.length} criteria`);
    }
    return parts.join(' • ');
  };

  const handleDone = () => {
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Context Status Indicator */}
      {hasContext && (
        <Badge variant="secondary" className="text-xs">
          Context Selected
        </Badge>
      )}

      {/* Context Selector Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant={hasContext ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {hasContext ? "Edit Context" : "Set Context"}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Educational Context
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 py-4 px-1">
            {/* Current Context Summary */}
            {hasContext && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Current Context</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getContextSummary()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearContext}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Subject Selection */}
            {!subjectId ? (
              <div>
                <h4 className="font-medium mb-3">Subject</h4>
                <SubjectSelector
                  subjects={subjects || []}
                  selectedSubjectId={subjectId}
                  onSelect={setSubjectId}
                  isLoading={!subjects}
                />
              </div>
            ) : (
              <div>
                <h4 className="font-medium mb-3">Subject</h4>
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium text-sm">
                      {subjects?.find(s => s.id === subjectId)?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubjectId('');
                      setTopicIds([]);
                      setSelectedLearningOutcomes([]);
                      setSelectedAssessmentCriteria([]);
                    }}
                    className="text-xs h-6 px-2"
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            {/* Topic Selection */}
            {subjectId && topicIds.length === 0 && (
              <div>
                <h4 className="font-medium mb-3">Topics</h4>
                <TopicSelector
                  subjectId={subjectId}
                  selectedTopicId=""
                  selectedTopicIds={topicIds}
                  onSelect={() => {}} // Not used in multiple mode
                  onSelectMultiple={setTopicIds}
                  allowMultiple={true}
                  isLoading={!!subjectId && !topics}
                  maxHeight="300px"
                />
              </div>
            )}

            {/* Selected Topics Display */}
            {topicIds.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Topics</h4>
                <div className="space-y-2">
                  {topics?.filter(t => topicIds.includes(t.id)).map(topic => (
                    <div key={topic.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="font-medium text-sm">{topic.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTopicIds(prev => prev.filter(id => id !== topic.id))}
                        className="text-xs h-6 px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTopicIds([]);
                      setSelectedLearningOutcomes([]);
                      setSelectedAssessmentCriteria([]);
                    }}
                    className="text-xs"
                  >
                    Add More Topics
                  </Button>
                </div>
              </div>
            )}

            {/* Learning Outcomes Selection */}
            {topicIds.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Learning Outcomes</h4>
                <LearningOutcomeSelector
                  subjectId={subjectId}
                  topicId=""
                  topicIds={topicIds}
                  selectedOutcomes={selectedLearningOutcomes}
                  onSelect={setSelectedLearningOutcomes}
                  isLoading={false}
                />
              </div>
            )}



            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearContext}
                disabled={!hasContext}
              >
                Clear All
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDone}
              >
                Done
              </Button>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
