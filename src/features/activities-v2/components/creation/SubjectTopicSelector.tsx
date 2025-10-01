'use client';

/**
 * Enhanced Subject and Topic Selector for Activities V2
 * 
 * Provides a consistent subject/topic selection experience
 * similar to the assessment creation system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { Search, BookOpen, FolderOpen, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Topic {
  id: string;
  title: string;
  code: string;
  description?: string;
  keywords?: string[];
}

interface SubjectTopicSelectorProps {
  selectedSubjectId?: string;
  selectedTopicId?: string;
  onSubjectChange: (subjectId: string) => void;
  onTopicChange: (topicId: string | undefined) => void;
  className?: string;
  showTopicSelection?: boolean;
  allowSkipTopic?: boolean;
  classId?: string; // Optional classId to filter subjects by class
}

export function SubjectTopicSelector({
  selectedSubjectId,
  selectedTopicId,
  onSubjectChange,
  onTopicChange,
  className,
  showTopicSelection = true,
  allowSkipTopic = true,
  classId
}: SubjectTopicSelectorProps) {
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [topicSearchQuery, setTopicSearchQuery] = useState('');

  // Fetch subjects - use class-specific subjects if classId is provided, otherwise use teacher's subjects
  const { data: classSubjects, isLoading: isLoadingClassSubjects } = api.class.getSubjects.useQuery(
    { classId: classId! },
    { enabled: !!classId }
  );
  const { data: teacherSubjects, isLoading: isLoadingTeacherSubjects } = api.teacherRole.getTeacherSubjects.useQuery(
    undefined,
    { enabled: !classId }
  );

  const subjects = classId ? classSubjects : teacherSubjects;
  const isLoadingSubjects = classId ? isLoadingClassSubjects : isLoadingTeacherSubjects;

  // Fetch topics for selected subject
  const { data: topics, isLoading: isLoadingTopics } = api.subject.getTopics.useQuery(
    { subjectId: selectedSubjectId || '' },
    { enabled: !!selectedSubjectId }
  );

  // Filter subjects based on search
  const filteredSubjects = subjects?.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
    subject.code.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  ) || [];

  // Filter topics based on search
  const filteredTopics = topics?.filter(topic =>
    topic.title.toLowerCase().includes(topicSearchQuery.toLowerCase()) ||
    topic.code.toLowerCase().includes(topicSearchQuery.toLowerCase()) ||
    topic.keywords?.some(keyword => 
      keyword.toLowerCase().includes(topicSearchQuery.toLowerCase())
    )
  ) || [];

  // Get selected subject and topic details
  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);
  const selectedTopic = topics?.find(t => t.id === selectedTopicId);

  // Handle subject selection
  const handleSubjectSelect = (subjectId: string) => {
    onSubjectChange(subjectId);
    // Clear topic selection when subject changes
    if (selectedTopicId) {
      onTopicChange(undefined);
    }
  };

  // Handle topic selection
  const handleTopicSelect = (topicId: string) => {
    onTopicChange(topicId);
  };

  // Handle skip topic
  const handleSkipTopic = () => {
    onTopicChange(undefined);
  };

  // Clear topic selection
  const handleClearTopic = () => {
    onTopicChange(undefined);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Subject Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={subjectSearchQuery}
              onChange={(e) => setSubjectSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected Subject Display */}
          {selectedSubject && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{selectedSubject.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedSubject.code}</p>
                </div>
                <Badge variant="default">Selected</Badge>
              </div>
            </div>
          )}

          {/* Subject List */}
          <ScrollArea className="h-[200px] border rounded-md">
            <div className="p-2 space-y-1">
              {isLoadingSubjects ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading subjects...
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No subjects found
                </div>
              ) : (
                filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={cn(
                      "p-3 rounded-md cursor-pointer transition-colors hover:bg-muted",
                      selectedSubjectId === subject.id && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => handleSubjectSelect(subject.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{subject.name}</h4>
                        <p className="text-sm text-muted-foreground">{subject.code}</p>
                      </div>
                      {selectedSubjectId === subject.id && (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Topic Selection */}
      {showTopicSelection && selectedSubjectId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Topic Selection
              <span className="text-sm font-normal text-muted-foreground">
                (Optional)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={topicSearchQuery}
                onChange={(e) => setTopicSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected Topic Display */}
            {selectedTopic && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedTopic.title}</h4>
                    <p className="text-sm text-muted-foreground">{selectedTopic.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Selected</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTopic}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Skip Topic Option */}
            {allowSkipTopic && !selectedTopicId && (
              <div className="flex items-center justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipTopic}
                  className="text-muted-foreground"
                >
                  Skip Topic Selection
                </Button>
              </div>
            )}

            <Separator />

            {/* Topic List */}
            <ScrollArea className="h-[250px] border rounded-md">
              <div className="p-2 space-y-1">
                {isLoadingTopics ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading topics...
                  </div>
                ) : filteredTopics.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No topics found for this subject
                  </div>
                ) : (
                  filteredTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className={cn(
                        "p-3 rounded-md cursor-pointer transition-colors hover:bg-muted",
                        selectedTopicId === topic.id && "bg-primary/10 border border-primary/20"
                      )}
                      onClick={() => handleTopicSelect(topic.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{topic.title}</h4>
                          <p className="text-sm text-muted-foreground">{topic.code}</p>
                          {topic.keywords && topic.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {topic.keywords.slice(0, 3).map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {topic.keywords.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{topic.keywords.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedTopicId === topic.id && (
                          <ChevronRight className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
