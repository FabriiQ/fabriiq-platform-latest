'use client';

/**
 * Quiz Editor Component for Activities V2
 * 
 * Minimal, efficient quiz creation interface
 * Integrates with existing Question Bank
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionBankIntegration } from '@/features/question-bank/components/integration/QuestionBankIntegration';
import { Question } from '@/features/question-bank/models/types';
import { QuizV2Content, QuizV2Question, AchievementConfiguration, CATSettings } from '../../types';
import { DEFAULT_CAT_SETTINGS, mergeCATSettings } from '../../utils/cat-config-defaults';
import { Save, Eye, Settings, Award as Trophy, Shield, Info, HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CATSettingsGuide } from './CATSettingsGuide';
import { ActivityV2Viewer } from '../ActivityV2Viewer';
import { ActivityStatusManager } from '../status/ActivityStatusManager';
import { ActivityV2Status } from '../../types';
import { ContentLockManager } from '../content-lock/ContentLockManager';
import { useContentLock } from '../../hooks/useContentLock';
import { EnhancedRichTextEditor } from '@/features/teacher-assistant-v2/components/enhanced-rich-text-editor';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';

interface QuizEditorProps {
  initialContent?: QuizV2Content;
  subjectId: string;
  topicId?: string;
  activityId?: string; // For content lock checking
  onSave: (content: QuizV2Content) => void;
  onCancel: () => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  initialContent,
  subjectId,
  topicId,
  activityId,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<QuizV2Content>(
    initialContent || getDefaultQuizContent()
  );
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'questions' | 'settings' | 'grading' | 'achievements' | 'status' | 'protection'>('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(initialContent?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialContent?.endDate);

  // Content lock management
  const contentLock = useContentLock(activityId || '');

  // Check if content can be modified
  const canModifyContent = !contentLock.hasStudentAttempts && !contentLock.isContentLocked;

  // Helper function to get default CAT settings - now uses imported defaults
  const getDefaultCATSettings = (): CATSettings => ({
    ...DEFAULT_CAT_SETTINGS,
    enabled: true // Ensure enabled is set for new CAT activities
  });

  // Handle assessment mode change with proper CAT settings initialization
  const handleAssessmentModeChange = (mode: 'standard' | 'cat' | 'spaced_repetition') => {
    const updatedContent = { ...content, assessmentMode: mode };

    if (mode === 'cat') {
      // Initialize CAT settings if not present or incomplete
      if (!content.settings?.catSettings || !content.settings.catSettings.algorithm) {
        updatedContent.settings = {
          ...updatedContent.settings,
          catSettings: getDefaultCATSettings()
        };
      }
    }

    setContent(updatedContent);
  };

  // Information tooltip component
  const InfoTooltip: React.FC<{ title: string; content: string; children: React.ReactNode }> = ({ title, content, children }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            {children}
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-blue-600" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-medium">{title}</div>
            <div className="text-sm">{content}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const handleSave = async () => {
    if (isSaving) return; // Prevent multiple clicks

    // Validate required fields
    if (!content.title.trim()) {
      toast.error('Please enter a title for the quiz');
      return;
    }

    if (content.assessmentMode !== 'cat' && selectedQuestions.length === 0) {
      toast.error('Please select at least one question for the quiz');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Convert selected questions to quiz questions
      const quizQuestions: QuizV2Question[] = selectedQuestions.map((q, index) => ({
        id: q.id,
        order: index + 1,
        points: content.questions.find(cq => cq.id === q.id)?.points || 1,
        shuffleOptions: false
      }));

      const finalContent: QuizV2Content = {
        ...content,
        questions: quizQuestions,
        startDate,
        endDate
      };

      console.log('Saving quiz with content:', finalContent);
      await onSave(finalContent);

      // Show success state
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

    } catch (error) {
      console.error('Error saving quiz:', error);
      // Show error to user
      alert('Failed to save quiz: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = (status: ActivityV2Status) => {
    setContent(prev => ({
      ...prev,
      status
    }));
  };

  const handleQuestionPointsChange = (questionId: string, points: number) => {
    // Ensure we handle both existing questions and new ones
    const existingQuestion = content.questions.find(q => q.id === questionId);
    const updatedQuestions = existingQuestion
      ? content.questions.map(q => q.id === questionId ? { ...q, points } : q)
      : [...content.questions, { id: questionId, order: content.questions.length + 1, points, shuffleOptions: false }];
    
    setContent({ ...content, questions: updatedQuestions });
  };

  return (
    <div className="quiz-editor space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quiz Configuration</h2>
        <div className="flex gap-2">
          {/* Content Lock Warning */}
          {!canModifyContent && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-md">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">Content Locked</span>
            </div>
          )}
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>

          {/* Preview Button */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={content.assessmentMode !== 'cat' && selectedQuestions.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Activity Preview - {content.title || 'Untitled Quiz'}</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Preview Mode:</strong> This shows exactly how students will see and interact with your quiz.
                    All functionality is simulated including timing, scoring, and feedback.
                  </p>
                </div>
                <PreviewActivityViewer content={content} questions={selectedQuestions} />
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSave}
            disabled={isSaving || (content.assessmentMode !== 'cat' && selectedQuestions.length === 0) || !canModifyContent}
            className={saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
            title={!canModifyContent ? 'Content is locked and cannot be modified' : ''}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <div className="h-4 w-4 mr-2">✓</div>
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Quiz
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'basic', label: 'Basic Info', icon: null },
          { id: 'grading', label: 'Assessment & Grading', icon: null },
          { id: 'questions', label: 'Questions', icon: null },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'status', label: 'Status', icon: Eye },
          { id: 'protection', label: 'Protection', icon: Shield }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                value={content.title}
                onChange={(e) => setContent({ ...content, title: e.target.value })}
                placeholder="Enter quiz title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <div className="border rounded-md">
                <EnhancedRichTextEditor
                  content={content.description || ''}
                  onChange={(value) => setContent({ ...content, description: value })}
                  placeholder="Enter quiz description..."
                  minHeight="120px"
                  className="min-h-[120px]"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={content.estimatedTimeMinutes || ''}
                onChange={(e) => setContent({ 
                  ...content, 
                  estimatedTimeMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="e.g., 30"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  helperText="When students can start this activity"
                  disabled={!canModifyContent}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  helperText="When this activity is no longer available"
                  fromDate={startDate}
                  disabled={!canModifyContent}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'questions' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {content.assessmentMode === 'cat' ? (
              <div className="text-center py-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="text-blue-600 text-4xl mb-4">🤖</div>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Computer Adaptive Testing (CAT) Mode
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Questions are automatically selected by the CAT algorithm based on student ability and item characteristics.
                  </p>
                  <div className="text-sm text-blue-600 space-y-1">
                    <p>• Questions are selected using Maximum Fisher Information</p>
                    <p>• Difficulty adapts to student performance in real-time</p>
                    <p>• No manual question selection required</p>
                  </div>
                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-sm text-gray-600">
                      <strong>Available Questions:</strong> All questions from {subjectId ? 'selected subject' : 'question bank'}
                      {topicId && ' and topic'} will be available for the CAT algorithm.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <QuestionBankIntegration
                  selectedQuestions={selectedQuestions}
                  onSelectQuestions={setSelectedQuestions}
                  onRemoveQuestion={(questionId) => {
                    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
                  }}
                  subjectId={subjectId}
                  topicId={topicId}
                  multiSelect={true}
                  title="Quiz Questions"
                  description="Select questions from the Question Bank for your quiz"
                />

                {/* Question Points Configuration */}
                {selectedQuestions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Question Points</h3>
                    <div className="space-y-3">
                      {selectedQuestions.map((question, index) => (
                        <div key={question.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex-1">
                            <div className="font-medium">{question.title}</div>
                            <div className="text-sm text-gray-500">
                              {question.questionType} • {question.difficulty}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`points-${question.id}`}>Points:</Label>
                            <Input
                              id={`points-${question.id}`}
                              type="number"
                              min="1"
                              max="10"
                              value={content.questions.find(q => q.id === question.id)?.points || 1}
                              onChange={(e) => handleQuestionPointsChange(question.id, parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Behavior */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Question Behavior</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.settings.shuffleQuestions}
                  onCheckedChange={(checked) => 
                    setContent({
                      ...content, 
                      settings: { ...content.settings, shuffleQuestions: checked }
                    })
                  }
                />
                <Label>Shuffle Questions</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.settings.showFeedbackImmediately}
                  onCheckedChange={(checked) => 
                    setContent({
                      ...content, 
                      settings: { ...content.settings, showFeedbackImmediately: checked }
                    })
                  }
                />
                <Label>Show Feedback Immediately</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.settings.showCorrectAnswers}
                  onCheckedChange={(checked) => 
                    setContent({
                      ...content, 
                      settings: { ...content.settings, showCorrectAnswers: checked }
                    })
                  }
                />
                <Label>Show Correct Answers</Label>
              </div>
            </div>

            {/* Time and Attempts */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Time and Attempts</h3>
              
              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={content.settings.timeLimitMinutes || ''}
                  onChange={(e) => setContent({
                    ...content, 
                    settings: { 
                      ...content.settings, 
                      timeLimitMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                    }
                  })}
                  placeholder="No time limit"
                />
              </div>

              <div>
                <Label htmlFor="attempts">Attempts Allowed</Label>
                <Select
                  value={content.settings.attemptsAllowed.toString()}
                  onValueChange={(value) => setContent({
                    ...content, 
                    settings: { ...content.settings, attemptsAllowed: parseInt(value) }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 attempt</SelectItem>
                    <SelectItem value="2">2 attempts</SelectItem>
                    <SelectItem value="3">3 attempts</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={content.settings.passingScore || ''}
                  onChange={(e) => setContent({
                    ...content, 
                    settings: { 
                      ...content.settings, 
                      passingScore: e.target.value ? parseInt(e.target.value) : undefined 
                    }
                  })}
                  placeholder="No passing score required"
                />
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Display Options</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.settings.allowReview}
                  onCheckedChange={(checked) => 
                    setContent({
                      ...content, 
                      settings: { ...content.settings, allowReview: checked }
                    })
                  }
                />
                <Label>Allow Review Before Submit</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={content.settings.showProgressBar}
                  onCheckedChange={(checked) => 
                    setContent({
                      ...content, 
                      settings: { ...content.settings, showProgressBar: checked }
                    })
                  }
                />
                <Label>Show Progress Bar</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'grading' && (
        <Card>
          <CardHeader>
            <CardTitle>Grading & Assessment Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assessment Mode */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Assessment Mode</h3>

              <div>
                <Label>Assessment Type</Label>
                <Select
                  value={content.assessmentMode}
                  onValueChange={handleAssessmentModeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Quiz (CBT)</SelectItem>
                    <SelectItem value="cat">Computer Adaptive Test (CAT)</SelectItem>
                    <SelectItem value="spaced_repetition">Spaced Repetition</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {content.assessmentMode === 'standard' && 'Traditional computer-based test with fixed questions'}
                  {content.assessmentMode === 'cat' && 'Adaptive test that adjusts difficulty based on student performance'}
                  {content.assessmentMode === 'spaced_repetition' && 'Questions repeat at optimal intervals for long-term retention'}
                </p>
              </div>

              {/* CAT Settings */}
              {content.assessmentMode === 'cat' && (
                <div className="space-y-4 p-4 border rounded-md bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">CAT Configuration (Item Response Theory)</h4>
                      <InfoTooltip
                        title="Computer Adaptive Testing (CAT)"
                        content="CAT uses Item Response Theory to dynamically select questions based on student ability. Each question provides information about the student's ability level (θ theta), and the algorithm selects the most informative question for the current ability estimate."
                      >
                        <span></span>
                      </InfoTooltip>
                    </div>
                    <CATSettingsGuide>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Info className="h-3 w-3 mr-1" />
                        Complete Guide
                      </Button>
                    </CATSettingsGuide>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Questions are automatically selected using Maximum Fisher Information criterion to optimize measurement precision.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Starting Ability Level */}
                    <div>
                      <InfoTooltip
                        title="Starting Ability Level (θ₀)"
                        content="Initial ability estimate before any questions are answered. 0 = average ability, negative values = below average, positive values = above average. Range: -3 to +3."
                      >
                        <Label>Starting Ability Level (θ₀)</Label>
                      </InfoTooltip>
                      <Select
                        value={content.settings?.catSettings?.startingDifficulty?.toString() || "0"}
                        onValueChange={(value) => {
                          const catSettings = content.settings?.catSettings || getDefaultCATSettings();
                          setContent({
                            ...content,
                            settings: {
                              ...content.settings,
                              catSettings: {
                                ...catSettings,
                                startingDifficulty: parseFloat(value)
                              }
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-2">Low (-2.0)</SelectItem>
                          <SelectItem value="-1">Below Average (-1.0)</SelectItem>
                          <SelectItem value="0">Average (0.0)</SelectItem>
                          <SelectItem value="1">Above Average (1.0)</SelectItem>
                          <SelectItem value="2">High (2.0)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Initial theta estimate before first question</p>
                    </div>

                    {/* Item Selection Method */}
                    <div>
                      <InfoTooltip
                        title="Item Selection Method"
                        content="Algorithm used to select the next question. Maximum Fisher Information provides the most precise ability estimates by selecting questions that provide the most information at the current ability level."
                      >
                        <Label>Item Selection Method</Label>
                      </InfoTooltip>
                      <Select
                        value={content.settings?.catSettings?.itemSelectionMethod === 'maximum_information' ? 'mfi' :
                               content.settings?.catSettings?.itemSelectionMethod === 'bayesian' ? 'mpi' : 'mfi'}
                        onValueChange={(value) => {
                          const catSettings = content.settings?.catSettings || getDefaultCATSettings();
                          const method = value === 'mfi' ? 'maximum_information' :
                                        value === 'mpi' ? 'bayesian' : 'maximum_information';
                          setContent({
                            ...content,
                            settings: {
                              ...content.settings,
                              catSettings: {
                                ...catSettings,
                                itemSelectionMethod: method
                              }
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mfi">Maximum Fisher Information (MFI)</SelectItem>
                          <SelectItem value="mpi">Maximum Posterior Information (MPI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stopping Rules */}
                    <div>
                      <Label>Primary Stopping Rule</Label>
                      <Select defaultValue="se">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="se">Standard Error (SE)</SelectItem>
                          <SelectItem value="fixed">Fixed Length</SelectItem>
                          <SelectItem value="confidence">Confidence Interval</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <InfoTooltip
                        title="Standard Error Threshold"
                        content="CAT stops when measurement precision reaches this threshold. Lower values = higher precision but more questions. 0.3 is standard for most educational assessments. SE represents the uncertainty in ability estimation."
                      >
                        <Label>SE Threshold</Label>
                      </InfoTooltip>
                      <Input
                        type="number"
                        value={content.settings?.catSettings?.terminationCriteria?.standardErrorThreshold || 0.3}
                        onChange={(e) => {
                          const catSettings = content.settings?.catSettings || getDefaultCATSettings();
                          setContent({
                            ...content,
                            settings: {
                              ...content.settings,
                              catSettings: {
                                ...catSettings,
                                terminationCriteria: {
                                  ...catSettings.terminationCriteria,
                                  standardErrorThreshold: parseFloat(e.target.value) || 0.3
                                }
                              }
                            }
                          });
                        }}
                        min="0.1"
                        max="1.0"
                        step="0.05"
                      />
                    </div>

                    <div>
                      <InfoTooltip
                        title="Minimum Questions"
                        content="Minimum number of questions that must be administered before the CAT can terminate. Ensures sufficient data for reliable ability estimation. Recommended: 5-10 questions."
                      >
                        <Label>Minimum Questions</Label>
                      </InfoTooltip>
                      <Input
                        type="number"
                        value={content.settings?.catSettings?.terminationCriteria?.minQuestions || 5}
                        onChange={(e) => {
                          const catSettings = content.settings?.catSettings || getDefaultCATSettings();
                          setContent({
                            ...content,
                            settings: {
                              ...content.settings,
                              catSettings: {
                                ...catSettings,
                                terminationCriteria: {
                                  ...catSettings.terminationCriteria,
                                  minQuestions: parseInt(e.target.value) || 5
                                }
                              }
                            }
                          });
                        }}
                        min="3"
                        max="20"
                      />
                    </div>

                    <div>
                      <InfoTooltip
                        title="Maximum Questions"
                        content="Maximum number of questions that can be administered. Prevents excessively long tests while ensuring coverage. Recommended: 15-25 questions for most assessments."
                      >
                        <Label>Maximum Questions</Label>
                      </InfoTooltip>
                      <Input
                        type="number"
                        value={content.settings?.catSettings?.terminationCriteria?.maxQuestions || 20}
                        onChange={(e) => {
                          const catSettings = content.settings?.catSettings || getDefaultCATSettings();
                          setContent({
                            ...content,
                            settings: {
                              ...content.settings,
                              catSettings: {
                                ...catSettings,
                                terminationCriteria: {
                                  ...catSettings.terminationCriteria,
                                  maxQuestions: parseInt(e.target.value) || 20
                                }
                              }
                            }
                          });
                        }}
                        min="5"
                        max="50"
                      />
                    </div>

                    {/* Ability Estimation Method */}
                    <div>
                      <Label>Ability Estimation</Label>
                      <Select defaultValue="eap">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mle">Maximum Likelihood (MLE)</SelectItem>
                          <SelectItem value="eap">Expected A Posteriori (EAP)</SelectItem>
                          <SelectItem value="map">Maximum A Posteriori (MAP)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Method for estimating θ</p>
                    </div>

                    {/* Content Balancing */}
                    <div>
                      <Label>Content Balancing</Label>
                      <Select defaultValue="none">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="proportional">Proportional</SelectItem>
                          <SelectItem value="constrained">Constrained</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Balance across topics/skills</p>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm mb-2">Advanced IRT Parameters</h5>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <Label className="text-xs">Prior Mean (μ)</Label>
                        <Input type="number" defaultValue="0" step="0.1" className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">Prior SD (σ)</Label>
                        <Input type="number" defaultValue="1" step="0.1" className="h-8" />
                      </div>
                      <div>
                        <Label className="text-xs">D Scaling Factor</Label>
                        <Input type="number" defaultValue="1.7" step="0.1" className="h-8" />
                      </div>
                    </div>
                  </div>

                  {/* Information Display */}
                  <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <div className="flex items-start gap-2">
                      <div className="text-yellow-600 mt-0.5">ℹ️</div>
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">CAT Algorithm Flow:</p>
                        <ol className="list-decimal list-inside mt-1 text-yellow-700 space-y-1">
                          <li>Start with initial θ₀ estimate</li>
                          <li>Select item with maximum information at current θ</li>
                          <li>Present item to student and record response</li>
                          <li>Update θ estimate using response pattern</li>
                          <li>Check stopping rules (SE threshold, min/max items)</li>
                          <li>If not stopped, return to step 2</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Spaced Repetition Settings */}
              {content.assessmentMode === 'spaced_repetition' && (
                <div className="space-y-4 p-4 border rounded-md bg-green-50">
                  <h4 className="font-medium">Spaced Repetition Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Initial Interval (days)</Label>
                      <Input type="number" defaultValue="1" min="1" max="7" />
                    </div>
                    <div>
                      <Label>Ease Factor</Label>
                      <Input type="number" defaultValue="2.5" min="1.3" max="4.0" step="0.1" />
                    </div>
                    <div>
                      <Label>Interval Modifier</Label>
                      <Input type="number" defaultValue="1.0" min="0.5" max="2.0" step="0.1" />
                    </div>
                    <div>
                      <Label>Maximum Interval (days)</Label>
                      <Input type="number" defaultValue="365" min="30" max="1000" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grading Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Grading Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Grading Method</Label>
                  <Select defaultValue="automatic">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade Scale</Label>
                  <Select defaultValue="percentage">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="letter">Letter Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch defaultChecked />
                <Label>Enable Partial Credit</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch defaultChecked />
                <Label>Round Scores to Nearest Integer</Label>
              </div>
            </div>

            {/* Test Format */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Format</h3>

              <div>
                <Label>Delivery Mode</Label>
                <Select defaultValue="cbt">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cbt">Computer-Based Test (CBT)</SelectItem>
                    <SelectItem value="pbt">Paper-Based Test (PBT)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (CBT + PBT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch />
                <Label>Enable Offline Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch defaultChecked />
                <Label>Auto-save Progress</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'achievements' && (
        <Card>
          <CardHeader>
            <CardTitle>Achievement Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                checked={content.achievementConfig.enabled}
                onCheckedChange={(enabled) => 
                  setContent({
                    ...content, 
                    achievementConfig: { ...content.achievementConfig, enabled }
                  })
                }
              />
              <Label>Enable Achievements</Label>
            </div>

            {content.achievementConfig.enabled && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={content.achievementConfig.pointsAnimation}
                    onCheckedChange={(pointsAnimation) => 
                      setContent({
                        ...content, 
                        achievementConfig: { ...content.achievementConfig, pointsAnimation }
                      })
                    }
                  />
                  <Label>Points Animation</Label>
                </div>

                <div>
                  <Label>Celebration Level</Label>
                  <Select
                    value={content.achievementConfig.celebrationLevel}
                    onValueChange={(celebrationLevel: 'minimal' | 'standard' | 'enthusiastic') => 
                      setContent({
                        ...content, 
                        achievementConfig: { ...content.achievementConfig, celebrationLevel }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Base Points</Label>
                  <Input
                    type="number"
                    value={content.achievementConfig.points.base}
                    onChange={(e) => setContent({
                      ...content, 
                      achievementConfig: { 
                        ...content.achievementConfig, 
                        points: { 
                          ...content.achievementConfig.points, 
                          base: parseInt(e.target.value) || 0 
                        }
                      }
                    })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Management Tab */}
      {activeTab === 'status' && (
        <ActivityStatusManager
          currentStatus={content.status || ActivityV2Status.DRAFT}
          onStatusChange={handleStatusChange}
          hasStudentAttempts={contentLock.hasStudentAttempts}
          studentCount={contentLock.studentAttemptCount}
          className="max-w-2xl"
        />
      )}

      {/* Content Protection Tab */}
      {activeTab === 'protection' && activityId && (
        <ContentLockManager
          hasStudentAttempts={contentLock.hasStudentAttempts}
          studentAttemptCount={contentLock.studentAttemptCount}
          firstAttemptDate={contentLock.firstAttemptDate}
          lastAttemptDate={contentLock.lastAttemptDate}
          isContentLocked={contentLock.isContentLocked}
          onLockToggle={contentLock.toggleLock}
          canOverrideLock={false} // TODO: Check user role
          className="max-w-2xl"
        />
      )}
    </div>
  );
};

// Preview Activity Viewer Component
interface PreviewActivityViewerProps {
  content: QuizV2Content;
  questions: Question[];
}

const PreviewActivityViewer: React.FC<PreviewActivityViewerProps> = ({ content, questions }) => {
  // Create a mock activity object for preview
  const mockActivity = {
    id: 'preview-activity',
    title: content.title || 'Preview Quiz',
    content: {
      ...content,
      questions: questions.map((q, index) => ({
        id: q.id,
        questionBankId: q.id,
        points: 1, // Default points
        order: index + 1
      }))
    },
    gradingConfig: {
      version: '2.0'
    }
  };

  return (
    <div className="preview-wrapper border rounded-lg p-4 bg-gray-50">
      <div className="bg-white rounded-md p-4">
        <ActivityV2Viewer
          activityId={mockActivity.id}
          studentId="preview-student"
          onComplete={(result) => {
            console.log('Preview completed:', result);
          }}
        />
      </div>
    </div>
  );
};

function getDefaultQuizContent(): QuizV2Content {
  return {
    version: '2.0',
    type: 'quiz',
    title: 'New Quiz Activity',
    description: '',
    estimatedTimeMinutes: 30,
    status: ActivityV2Status.DRAFT,
    startDate: undefined,
    endDate: undefined,
    questions: [],
    settings: {
      shuffleQuestions: false,
      showFeedbackImmediately: false,
      showCorrectAnswers: true,
      attemptsAllowed: 1,
      allowReview: true,
      showProgressBar: true,
      catSettings: {
        ...DEFAULT_CAT_SETTINGS,
        enabled: false // Default to disabled for new quizzes
      }
    },
    assessmentMode: 'standard',
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: {
        base: 20
      },
      triggers: {
        completion: true,
        perfectScore: true,
        speedBonus: false,
        firstAttempt: true,
        improvement: false
      }
    }
  };
}
