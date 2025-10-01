'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { QuestionType, DifficultyLevel, BloomsTaxonomyLevel } from '@prisma/client';
import { SystemStatus } from '@/server/api/constants';
import { Loader2, Plus, X } from 'lucide-react';
import { TopicSelector } from '../../../assessments/components/creation/dialog-steps/TopicSelector';
import { CreateQuestionInput, Question, QuestionContent, generateId, createDefaultMultipleChoiceQuestion, createDefaultTrueFalseQuestion } from '../../models/types';
import { BloomsTaxonomySelector } from '../bloom/BloomsTaxonomySelector';

// Import specific editors
import { MultipleChoiceEditor } from './MultipleChoiceEditor';
import { TrueFalseEditor } from './TrueFalseEditor';
import { MultipleResponseEditor } from './MultipleResponseEditor';
import { FillInTheBlanksEditor } from './FillInTheBlanksEditor';
import { MatchingEditor } from './MatchingEditor';
import { DragAndDropEditor } from './DragAndDropEditor';
import { DragTheWordsEditor } from './DragTheWordsEditor';
import { NumericEditor } from './NumericEditor';
import { SequenceEditor } from './SequenceEditor';
import { FlashCardsEditor } from './FlashCardsEditor';
import { ReadingEditor } from './ReadingEditor';
import { VideoEditor } from './VideoEditor';
import { ShortAnswerEditor } from './ShortAnswerEditor';
import { EssayEditor } from './EssayEditor';

interface QuestionEditorProps {
  initialQuestion?: Partial<Question>;
  questionBankId: string;
  onSave?: (question: Question) => void;
  onCancel?: () => void;
}

// Helper function to flatten hierarchical topics
const flattenTopics = (topics: any[]): any[] => {
  const flattened: any[] = [];

  const flatten = (topicList: any[]) => {
    topicList.forEach(topic => {
      flattened.push(topic);
      if (topic.children && topic.children.length > 0) {
        flatten(topic.children);
      }
    });
  };

  flatten(topics);
  return flattened;
};

// Helper function to create default content based on question type
const createDefaultContent = (questionType: QuestionType): QuestionContent => {
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return createDefaultMultipleChoiceQuestion();
    case QuestionType.TRUE_FALSE:
      return createDefaultTrueFalseQuestion();
    case QuestionType.MULTIPLE_RESPONSE:
      return {
        text: 'New question',
        options: [
          { id: generateId(), text: 'Option 1', isCorrect: true, feedback: 'Correct!' },
          { id: generateId(), text: 'Option 2', isCorrect: true, feedback: 'Correct!' },
          { id: generateId(), text: 'Option 3', isCorrect: false, feedback: 'Incorrect.' },
          { id: generateId(), text: 'Option 4', isCorrect: false, feedback: 'Incorrect.' }
        ],
        explanation: 'Explanation for the correct answers.',
        hint: 'Think about the question carefully and select all that apply.'
      };
    case QuestionType.FILL_IN_THE_BLANKS:
      const blank1Id = generateId();
      const blank2Id = generateId();
      return {
        text: `The capital of France is {{${blank1Id}}} and the capital of Italy is {{${blank2Id}}}.`,
        blanks: [
          {
            id: blank1Id,
            correctAnswers: ['Paris'],
            feedback: 'Paris is the capital of France.'
          },
          {
            id: blank2Id,
            correctAnswers: ['Rome'],
            feedback: 'Rome is the capital of Italy.'
          }
        ],
        partialCredit: true
      };
    case QuestionType.SHORT_ANSWER:
      return {
        text: 'New question',
        correctAnswers: ['Answer 1', 'Answer 2'],
        explanation: 'Explanation for the correct answer.',
        hint: 'Think about the question carefully.'
      };
    case QuestionType.ESSAY:
      return {
        text: 'New essay question',
        rubric: {
          criteria: [
            {
              id: generateId(),
              name: 'Content',
              description: 'Quality and accuracy of content',
              points: 4, // Maximum points for this criterion
              levels: [
                { id: generateId(), name: 'Excellent', points: 4, description: 'Comprehensive and accurate' },
                { id: generateId(), name: 'Good', points: 3, description: 'Good understanding' },
                { id: generateId(), name: 'Fair', points: 2, description: 'Basic understanding' },
                { id: generateId(), name: 'Poor', points: 1, description: 'Limited understanding' }
              ]
            }
          ],
          totalPoints: 4 // Total points for the rubric
        },
        explanation: 'Explanation for the essay question.',
        hint: 'Think about the question carefully.'
      };
    default:
      return {
        text: 'New question',
        explanation: 'Explanation for the answer.',
        hint: 'Think about the question carefully.'
      } as QuestionContent;
  }
};

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  initialQuestion,
  questionBankId,
  onSave,
  onCancel,
}) => {
  const questionType = initialQuestion?.questionType || QuestionType.MULTIPLE_CHOICE;
  const [question, setQuestion] = useState<Partial<CreateQuestionInput>>({
    questionBankId,
    title: initialQuestion?.title || 'New Question',
    questionType: questionType,
    difficulty: initialQuestion?.difficulty || DifficultyLevel.MEDIUM,
    content: initialQuestion?.content || createDefaultContent(questionType),
    subjectId: initialQuestion?.subjectId || '',
    courseId: initialQuestion?.courseId || undefined,
    topicId: initialQuestion?.topicId || undefined,
    gradeLevel: initialQuestion?.gradeLevel || undefined,
    year: initialQuestion?.year || undefined,
    // ✅ NEW: Bloom's Taxonomy fields
    bloomsLevel: initialQuestion?.bloomsLevel || undefined,
    learningOutcomeIds: initialQuestion?.learningOutcomeIds || [],
    actionVerbs: (initialQuestion?.metadata as any)?.actionVerbs || [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const { toast } = useToast();

  // Update question when initialQuestion changes (for edit mode)
  useEffect(() => {
    if (initialQuestion) {
      console.log('QuestionEditor: Loading initial question data:', {
        id: initialQuestion.id,
        title: initialQuestion.title,
        courseId: initialQuestion.courseId,
        subjectId: initialQuestion.subjectId,
        topicId: initialQuestion.topicId,
        questionType: initialQuestion.questionType
      });

      const questionType = initialQuestion.questionType || QuestionType.MULTIPLE_CHOICE;
      setQuestion({
        questionBankId,
        title: initialQuestion.title || 'New Question',
        questionType: questionType,
        difficulty: initialQuestion.difficulty || DifficultyLevel.MEDIUM,
        content: initialQuestion.content || createDefaultContent(questionType),
        subjectId: initialQuestion.subjectId || '',
        courseId: initialQuestion.courseId || undefined,
        topicId: initialQuestion.topicId || undefined,
        gradeLevel: initialQuestion.gradeLevel || undefined,
        year: initialQuestion.year || undefined,
        bloomsLevel: initialQuestion.bloomsLevel || undefined,
        learningOutcomeIds: initialQuestion.learningOutcomeIds || [],
        actionVerbs: (initialQuestion.metadata as any)?.actionVerbs || [],
      });

      // Set selected topic IDs if available
      if (initialQuestion.topicId) {
        setSelectedTopicIds([initialQuestion.topicId]);
      }
    }
  }, [initialQuestion, questionBankId]);

  // Fetch courses for dropdown
  const { data: courses, isLoading: isLoadingCourses } = api.course.list.useQuery({});

  // Fetch subjects based on selected course
  const { data: subjects, isLoading: isLoadingSubjects } = api.course.listSubjects.useQuery(
    { courseId: question.courseId || '' },
    { enabled: !!question.courseId }
  );

  // For edit mode, also fetch all subjects to ensure we can display the current subject
  // even if the course relationship is not properly set
  const { data: allSubjectsData } = api.subject.list.useQuery(
    { status: SystemStatus.ACTIVE },
    { enabled: !!initialQuestion?.id && !!initialQuestion?.subjectId }
  );

  // Fetch topics based on selected subject (for the dialog)
  const { data: topics, isLoading: isLoadingTopics } = api.subjectTopic.getHierarchy.useQuery(
    { subjectId: question.subjectId || '' },
    { enabled: !!question.subjectId && topicDialogOpen }
  );

  // Create question mutation
  const createQuestion = api.questionBank.createQuestion.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Question created',
        description: 'The question has been created successfully.',
      });
      if (onSave) onSave({
        ...data,
        content: data.content as unknown as QuestionContent
      } as Question);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question',
        variant: 'error',
      });
      setIsLoading(false);
    },
  });

  // Update question mutation
  const updateQuestion = api.questionBank.updateQuestion.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Question updated',
        description: 'The question has been updated successfully.',
      });
      if (onSave) onSave({
        ...data,
        content: data.content as unknown as QuestionContent
      } as Question);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update question',
        variant: 'error',
      });
      setIsLoading(false);
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!question.courseId) {
      toast({
        title: 'Validation Error',
        description: 'Course is required',
        variant: 'error',
      });
      setIsLoading(false);
      return;
    }

    if (!question.subjectId) {
      toast({
        title: 'Validation Error',
        description: 'Subject is required',
        variant: 'error',
      });
      setIsLoading(false);
      return;
    }

    // Properly type-cast content from JsonValue to QuestionContent
    const typedQuestion = {
      ...question,
      content: question.content as unknown as QuestionContent,
      // Include selected topics (use first one as primary topicId for backward compatibility)
      topicId: selectedTopicIds.length > 0 ? selectedTopicIds[0] : undefined,
      // Store all selected topic IDs in metadata or a separate field if needed
      selectedTopicIds: selectedTopicIds
    };

    if (initialQuestion?.id) {
      updateQuestion.mutate({
        id: initialQuestion.id,
        data: typedQuestion as CreateQuestionInput,
      });
    } else {
      createQuestion.mutate(typedQuestion as CreateQuestionInput);
    }
  };

  // Handle content changes from specific editors
  const handleContentChange = (content: QuestionContent) => {
    setQuestion((prev) => ({
      ...prev,
      content,
    }));
  };

  // Handle question type changes
  const handleQuestionTypeChange = (newType: QuestionType) => {
    setQuestion((prev) => ({
      ...prev,
      questionType: newType,
      content: createDefaultContent(newType),
    }));
  };

  // Render the appropriate editor based on question type
  const renderEditor = () => {
    switch (question.questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.TRUE_FALSE:
        return (
          <TrueFalseEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.MULTIPLE_RESPONSE:
        return (
          <MultipleResponseEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.FILL_IN_THE_BLANKS:
        return (
          <FillInTheBlanksEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.MATCHING:
        return (
          <MatchingEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.DRAG_AND_DROP:
        return (
          <DragAndDropEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.DRAG_THE_WORDS:
        return (
          <DragTheWordsEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.NUMERIC:
        return (
          <NumericEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.SEQUENCE:
        return (
          <SequenceEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.FLASH_CARDS:
        return (
          <FlashCardsEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.READING:
        return (
          <ReadingEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.VIDEO:
        return (
          <VideoEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.SHORT_ANSWER:
        return (
          <ShortAnswerEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      case QuestionType.ESSAY:
        return (
          <EssayEditor
            content={question.content as any}
            onChange={handleContentChange}
          />
        );
      default:
        return <div>Editor not implemented for this question type</div>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialQuestion?.id ? 'Edit Question' : 'Create Question'}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="content">Question Content</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={question.title}
                    onChange={(e) => setQuestion({ ...question, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select
                    value={question.questionType}
                    onValueChange={(value) => handleQuestionTypeChange(value as QuestionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(QuestionType).map((type) => (
                        <SelectItem key={type.toString()} value={type.toString()}>
                          {type.toString().replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={question.difficulty}
                    onValueChange={(value) => setQuestion({ ...question, difficulty: value as DifficultyLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(DifficultyLevel).map((level) => (
                        <SelectItem key={level.toString()} value={level.toString()}>
                          {level.toString().replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    value={question.courseId || ''}
                    onValueChange={(value) => setQuestion({
                      ...question,
                      courseId: value,
                      subjectId: '',
                      topicId: undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCourses ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        courses?.courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={question.subjectId || ''}
                    onValueChange={(value) => setQuestion({
                      ...question,
                      subjectId: value,
                      topicId: undefined
                    })}
                    disabled={!question.courseId || isLoadingSubjects}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !question.courseId
                          ? "Select a course first"
                          : isLoadingSubjects
                            ? "Loading subjects..."
                            : "Select subject"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show course-specific subjects if available */}
                      {subjects?.subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}

                      {/* For edit mode, also show the current subject if it's not in the course-specific list */}
                      {initialQuestion?.id && initialQuestion?.subjectId && allSubjectsData?.items &&
                       !subjects?.subjects?.find(s => s.id === initialQuestion.subjectId) && (
                        (() => {
                          const currentSubject = allSubjectsData.items.find(s => s.id === initialQuestion.subjectId);
                          return currentSubject ? (
                            <SelectItem key={initialQuestion.subjectId} value={initialQuestion.subjectId}>
                              {currentSubject.name} ({currentSubject.code}) - Current
                            </SelectItem>
                          ) : null;
                        })()
                      )}
                    </SelectContent>
                  </Select>
                  {isLoadingSubjects && (
                    <p className="text-sm text-muted-foreground mt-1">Loading subjects...</p>
                  )}
                  {!isLoadingSubjects && question.courseId && subjects?.subjects?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">No subjects available for this course</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="topics">Topics (Optional)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!question.subjectId}
                            className="w-full justify-start"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {selectedTopicIds.length === 0
                              ? "Add Topics"
                              : `${selectedTopicIds.length} topic(s) selected`
                            }
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>Select Topics</DialogTitle>
                            <DialogDescription>
                              Choose topics for this question. You can select multiple topics.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-hidden">
                            {question.subjectId && (
                              <TopicSelector
                                subjectId={question.subjectId}
                                selectedTopicId=""
                                selectedTopicIds={selectedTopicIds}
                                onSelect={() => {}} // Not used in multiple mode
                                onSelectMultiple={setSelectedTopicIds}
                                allowMultiple={true}
                                isLoading={isLoadingTopics}
                                maxHeight="calc(85vh - 200px)" // Dynamic height based on dialog
                              />
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-4 flex-shrink-0 border-t">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setTopicDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setTopicDialogOpen(false)}
                            >
                              Done
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {selectedTopicIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTopicIds.map((topicId) => {
                          const flatTopics = topics ? flattenTopics(topics) : [];
                          const topic = flatTopics.find(t => t.id === topicId);
                          return (
                            <Badge key={topicId} variant="secondary" className="flex items-center gap-1">
                              {topic?.title || topicId}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => setSelectedTopicIds(prev => prev.filter(id => id !== topicId))}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {!question.subjectId && (
                      <p className="text-sm text-muted-foreground">Select a subject first to choose topics</p>
                    )}
                  </div>
                </div>



                <div>
                  <Label htmlFor="gradeLevel">Grade Level (Optional)</Label>
                  <Input
                    id="gradeLevel"
                    type="number"
                    min={1}
                    max={12}
                    value={question.gradeLevel || ''}
                    onChange={(e) => setQuestion({ ...question, gradeLevel: parseInt(e.target.value) || undefined })}
                  />
                </div>

                <div>
                  <Label htmlFor="year">Year (Optional)</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear() + 5}
                    value={question.year || ''}
                    onChange={(e) => setQuestion({ ...question, year: parseInt(e.target.value) || undefined })}
                  />
                </div>

                {/* ✅ NEW: Bloom's Taxonomy Selector */}
                <BloomsTaxonomySelector
                  selectedLevel={question.bloomsLevel}
                  selectedTopicId={selectedTopicIds[0]} // Use first selected topic
                  selectedLearningOutcomes={question.learningOutcomeIds || []}
                  onLevelChange={useCallback((level) => setQuestion(prev => ({ ...prev, bloomsLevel: level })), [])}
                  onLearningOutcomesChange={useCallback((outcomes) => setQuestion(prev => ({ ...prev, learningOutcomeIds: outcomes })), [])}
                  onActionVerbsChange={useCallback((verbs) => setQuestion(prev => ({ ...prev, actionVerbs: verbs })), [])}
                  className="border-t pt-4"
                />
              </div>
            </TabsContent>

            <TabsContent value="content">
              {renderEditor()}
            </TabsContent>

            <TabsContent value="metadata">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sourceReference">Source Reference (Optional)</Label>
                  <Input
                    id="sourceReference"
                    value={question.sourceReference || ''}
                    onChange={(e) => setQuestion({ ...question, sourceReference: e.target.value })}
                    placeholder="e.g., Page 42, Chapter 3"
                  />
                </div>

                {/* Add more metadata fields as needed */}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialQuestion?.id ? 'Update' : 'Create'} Question
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
