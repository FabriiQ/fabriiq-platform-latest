'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/trpc/react';
import { QuestionType, DifficultyLevel, BloomsTaxonomyLevel } from '@prisma/client';
import { Question } from '@/features/question-bank/models/types';
import { getDifficultyColor } from '@/features/question-bank/utils/question-utils';
import { Search, Filter, Eye, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Bloom's level metadata for display
const BLOOMS_METADATA = {
  [BloomsTaxonomyLevel.REMEMBER]: { name: 'Remember', color: '#ef4444', icon: '🧠' },
  [BloomsTaxonomyLevel.UNDERSTAND]: { name: 'Understand', color: '#f97316', icon: '💡' },
  [BloomsTaxonomyLevel.APPLY]: { name: 'Apply', color: '#eab308', icon: '⚡' },
  [BloomsTaxonomyLevel.ANALYZE]: { name: 'Analyze', color: '#22c55e', icon: '🔍' },
  [BloomsTaxonomyLevel.EVALUATE]: { name: 'Evaluate', color: '#3b82f6', icon: '⚖️' },
  [BloomsTaxonomyLevel.CREATE]: { name: 'Create', color: '#8b5cf6', icon: '🎨' }
};

interface QuestionSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectQuestions: (questions: Question[]) => void;
  subjectId: string;
  topicId?: string;
  selectedQuestions?: Question[];
  multiSelect?: boolean;
  maxSelections?: number;
  title?: string;
  description?: string;
}

export const QuestionSelector: React.FC<QuestionSelectorProps> = ({
  open,
  onOpenChange,
  onSelectQuestions,
  subjectId,
  topicId,
  selectedQuestions = [],
  multiSelect = true,
  maxSelections = 0,
  title = 'Select Questions',
  description = 'Select questions for your quiz activity.',
}) => {
  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<{
    questionType?: QuestionType;
    difficulty?: DifficultyLevel;
    bloomsLevel?: BloomsTaxonomyLevel;
    search?: string;
    usageFilter?: 'all' | 'used' | 'unused';
  }>({
    usageFilter: 'all'
  });

  const [sorting, setSorting] = useState<{
    field: 'title' | 'createdAt' | 'updatedAt' | 'difficulty';
    direction: 'asc' | 'desc';
  }>({
    field: 'createdAt',
    direction: 'desc',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
  });

  // State for selected questions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    selectedQuestions.map(q => q.id)
  );

  const [showFilters, setShowFilters] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch questions with the new query
  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    error: questionsError,
  } = api.questionBank.getQuestionsBySubjectAndTopic.useQuery(
    {
      subjectId,
      topicId,
      filters,
      pagination,
      sorting,
    },
    {
      enabled: !!subjectId && open,
      keepPreviousData: true,
    }
  );

  // Handle filter changes
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  // Handle search
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on search
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Handle question selection
  const handleQuestionToggle = (question: Question) => {
    if (!multiSelect) {
      setSelectedQuestionIds([question.id]);
      return;
    }

    const isSelected = selectedQuestionIds.includes(question.id);
    if (isSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => id !== question.id));
    } else {
      if (maxSelections > 0 && selectedQuestionIds.length >= maxSelections) {
        return; // Don't add if max selections reached
      }
      setSelectedQuestionIds(prev => [...prev, question.id]);
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const availableQuestions = questionsData?.items || [];
      const newSelections = availableQuestions
        .filter(q => !selectedQuestionIds.includes(q.id))
        .slice(0, maxSelections > 0 ? maxSelections - selectedQuestionIds.length : availableQuestions.length)
        .map(q => q.id);
      setSelectedQuestionIds(prev => [...prev, ...newSelections]);
    } else {
      const currentPageIds = (questionsData?.items || []).map(q => q.id);
      setSelectedQuestionIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  // Handle confirm selection
  const handleConfirmSelection = () => {
    const allQuestions = questionsData?.items || [];
    const selectedQuestionsData = allQuestions.filter(q => selectedQuestionIds.includes(q.id));
    // Convert to Question type manually to avoid type issues
    const convertedQuestions: Question[] = selectedQuestionsData.map(q => ({
      id: q.id,
      title: q.title,
      content: q.content as any, // Type assertion for JsonValue to QuestionContent
      questionType: q.questionType,
      difficulty: q.difficulty,
      bloomsLevel: q.bloomsLevel || undefined, // Convert null to undefined
      subjectId: q.subjectId,
      topicId: q.topicId || undefined,
      courseId: q.course?.id,
      questionBankId: q.questionBank?.id,
      status: q.status as any,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      createdById: q.createdById,
      partitionKey: q.partitionKey || `${q.subjectId}_${q.questionBank?.id || 'default'}` // Add required partitionKey
    }));
    onSelectQuestions(convertedQuestions);
    onOpenChange(false);
  };

  // Get question type display name
  const getQuestionTypeDisplayName = (type: QuestionType): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          {/* Left Panel - Questions List */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search questions..."
                      value={filters.search || ''}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Question Type</Label>
                      <Select
                        value={filters.questionType || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange({
                            ...filters,
                            questionType: value === 'all' ? undefined : value as QuestionType
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                          <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                          <SelectItem value="FILL_IN_THE_BLANKS">Fill in the Blanks</SelectItem>
                          <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                          <SelectItem value="ESSAY">Essay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Difficulty</Label>
                      <Select
                        value={filters.difficulty || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange({
                            ...filters,
                            difficulty: value === 'all' ? undefined : value as DifficultyLevel
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All difficulties" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All difficulties</SelectItem>
                          <SelectItem value="VERY_EASY">Very Easy</SelectItem>
                          <SelectItem value="EASY">Easy</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HARD">Hard</SelectItem>
                          <SelectItem value="VERY_HARD">Very Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Bloom's Level</Label>
                      <Select
                        value={filters.bloomsLevel || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange({
                            ...filters,
                            bloomsLevel: value === 'all' ? undefined : value as BloomsTaxonomyLevel
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All levels</SelectItem>
                          <SelectItem value="REMEMBER">Remember</SelectItem>
                          <SelectItem value="UNDERSTAND">Understand</SelectItem>
                          <SelectItem value="APPLY">Apply</SelectItem>
                          <SelectItem value="ANALYZE">Analyze</SelectItem>
                          <SelectItem value="EVALUATE">Evaluate</SelectItem>
                          <SelectItem value="CREATE">Create</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Usage Status</Label>
                      <Select
                        value={filters.usageFilter || 'all'}
                        onValueChange={(value) =>
                          handleFilterChange({
                            ...filters,
                            usageFilter: value as 'all' | 'used' | 'unused'
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All questions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Questions</SelectItem>
                          <SelectItem value="used">Used Questions</SelectItem>
                          <SelectItem value="unused">Unused Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Select All Checkbox */}
              {multiSelect && questionsData?.items && questionsData.items.length > 0 && (
                <div className="flex items-center mb-4 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="selectAll"
                    checked={questionsData.items.length > 0 &&
                      questionsData.items.every(q => selectedQuestionIds.includes(q.id))}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="selectAll" className="ml-2">
                    Select All on Page ({questionsData.items.length} questions)
                  </Label>
                  {maxSelections > 0 && (
                    <span className="ml-auto text-sm text-muted-foreground">
                      {selectedQuestionIds.length} / {maxSelections} selected
                    </span>
                  )}
                </div>
              )}

              {/* Error State */}
              {questionsError && (
                <div className="text-center py-8 text-red-500">
                  <p>Error loading questions: {questionsError.message}</p>
                </div>
              )}

              {/* Loading State */}
              {isLoadingQuestions && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading questions...</p>
                </div>
              )}

              {/* Questions List with Improved Scrolling */}
              {!isLoadingQuestions && !questionsError && (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {questionsData?.items?.map((question) => (
                      <Card
                        key={question.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedQuestionIds.includes(question.id)
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {multiSelect && (
                                <Checkbox
                                  checked={selectedQuestionIds.includes(question.id)}
                                  onCheckedChange={() => handleQuestionToggle({
                                    ...question,
                                    content: question.content as any,
                                    status: question.status as any,
                                    partitionKey: question.partitionKey || `${question.subjectId}_${question.questionBank?.id || 'default'}`
                                  } as Question)}
                                  className="mt-1"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getQuestionTypeDisplayName(question.questionType)}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${getDifficultyColor(question.difficulty)}`}
                                  >
                                    {question.difficulty.replace('_', ' ')}
                                  </Badge>
                                  {question.bloomsLevel && (
                                    <Badge variant="outline" className="text-xs">
                                      {BLOOMS_METADATA[question.bloomsLevel]?.name || question.bloomsLevel}
                                    </Badge>
                                  )}
                                  {(question as any).usageStats && (
                                    <Badge
                                      variant="outline"
                                      className={cn("text-xs", {
                                        "bg-green-50 text-green-700 border-green-200": (question as any).usageStats.usageCount > 0,
                                        "bg-gray-50 text-gray-600 border-gray-200": (question as any).usageStats.usageCount === 0
                                      })}
                                    >
                                      {(question as any).usageStats.usageCount > 0
                                        ? `Used ${(question as any).usageStats.usageCount} times`
                                        : 'Unused'
                                      }
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-1 line-clamp-2">
                                  {question.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {typeof question.content === 'object' && question.content && 'text' in question.content
                                    ? (question.content as any).text
                                    : 'Question content'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewQuestion(question);
                                  setShowPreview(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!multiSelect && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuestionToggle({
                                    ...question,
                                    content: question.content as any,
                                    status: question.status as any,
                                    partitionKey: question.partitionKey || `${question.subjectId}_${question.questionBank?.id || 'default'}`
                                  } as Question)}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Right Panel - Selection Analytics */}
          {selectedQuestionIds.length > 0 && (
            <div className="w-80 flex-shrink-0">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Selection Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Selected:</span>
                      <span className="font-medium">{selectedQuestionIds.length}</span>
                    </div>
                    {maxSelections > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Remaining:</span>
                        <span className="font-medium">{maxSelections - selectedQuestionIds.length}</span>
                      </div>
                    )}

                    {/* Question Type Distribution */}
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Question Types</h4>
                      <div className="space-y-1">
                        {Object.entries(
                          questionsData?.items
                            ?.filter(q => selectedQuestionIds.includes(q.id))
                            ?.reduce((acc, q) => {
                              acc[q.questionType] = (acc[q.questionType] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>) || {}
                        ).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span>{getQuestionTypeDisplayName(type as QuestionType)}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Difficulty Levels</h4>
                      <div className="space-y-1">
                        {Object.entries(
                          questionsData?.items
                            ?.filter(q => selectedQuestionIds.includes(q.id))
                            ?.reduce((acc, q) => {
                              acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>) || {}
                        ).map(([difficulty, count]) => (
                          <div key={difficulty} className="flex justify-between text-xs">
                            <span>{difficulty.replace('_', ' ')}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Question Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Question Preview</DialogTitle>
            </DialogHeader>

            {previewQuestion && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getQuestionTypeDisplayName(previewQuestion.questionType)}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={getDifficultyColor(previewQuestion.difficulty)}
                    >
                      {previewQuestion.difficulty.replace('_', ' ')}
                    </Badge>
                    {previewQuestion.bloomsLevel && (
                      <Badge variant="outline">
                        {BLOOMS_METADATA[previewQuestion.bloomsLevel]?.name || previewQuestion.bloomsLevel}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{previewQuestion.title}</h4>
                    <div className="prose prose-sm max-w-none">
                      {typeof previewQuestion.content === 'object' && previewQuestion.content && 'text' in previewQuestion.content && (
                        <p>{(previewQuestion.content as any).text}</p>
                      )}

                      {/* Show options for multiple choice */}
                      {previewQuestion.questionType === 'MULTIPLE_CHOICE' &&
                       previewQuestion.content &&
                       typeof previewQuestion.content === 'object' &&
                       'options' in previewQuestion.content && (
                        <div className="mt-3">
                          <p className="font-medium mb-2">Options:</p>
                          <ul className="space-y-1">
                            {((previewQuestion.content as any).options || []).map((option: any, index: number) => (
                              <li key={index} className={`p-2 rounded ${option.isCorrect ? 'bg-green-100 text-green-800' : 'bg-gray-50'}`}>
                                {String.fromCharCode(65 + index)}. {option.text}
                                {option.isCorrect && <span className="ml-2 text-xs">(Correct)</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Show correct answer for True/False */}
                      {previewQuestion.questionType === 'TRUE_FALSE' &&
                       previewQuestion.content &&
                       typeof previewQuestion.content === 'object' &&
                       'isTrue' in previewQuestion.content && (
                        <div className="mt-3">
                          <p className="font-medium">Correct Answer:
                            <span className="ml-2 text-green-600">
                              {(previewQuestion.content as any).isTrue ? 'True' : 'False'}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (previewQuestion) {
                    handleQuestionToggle({
                      ...previewQuestion,
                      content: previewQuestion.content as any,
                      status: previewQuestion.status as any,
                      partitionKey: previewQuestion.partitionKey || `${previewQuestion.subjectId}_${previewQuestion.questionBank?.id || 'default'}`
                    } as Question);
                    setShowPreview(false);
                  }
                }}
                disabled={!multiSelect && selectedQuestionIds.length >= 1}
              >
                {selectedQuestionIds.includes(previewQuestion?.id || '') ? 'Remove' : 'Select'} Question
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {/* Pagination */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1 || isLoadingQuestions}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.ceil((questionsData?.total || 0) / pagination.pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!questionsData?.hasMore || isLoadingQuestions}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedQuestionIds.length === 0 || (maxSelections > 0 && selectedQuestionIds.length > maxSelections)}
              >
                Select {selectedQuestionIds.length} Question{selectedQuestionIds.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionSelector;
