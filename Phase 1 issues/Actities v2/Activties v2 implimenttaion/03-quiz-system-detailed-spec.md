# Quiz System Detailed Specification

## 🎯 Overview

The Quiz system is the most complex component of Activities V2, supporting all Question Bank question types, advanced assessment modes (CAT/IRT, Spaced Repetition), and comprehensive achievement configurations.

## 📊 Quiz Architecture

### Core Components
```
src/features/activities-v2/quiz/
├── types/                   # Quiz-specific types
├── services/               # Quiz business logic
│   ├── quiz-v2.service.ts
│   ├── cat-engine.service.ts
│   └── spaced-repetition.service.ts
├── components/             # Quiz UI components
│   ├── editor/            # Teacher quiz creation
│   ├── viewer/            # Student quiz taking
│   └── analytics/         # Quiz analytics
├── grading/               # Grading integration
└── achievements/          # Achievement system
```

## 🔧 Quiz Creation Flow

### 1. Quiz Editor Component

```typescript
// src/features/activities-v2/quiz/components/editor/QuizEditor.tsx
export const QuizEditor: React.FC<QuizEditorProps> = ({
  activity,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState<QuizV2Content>(
    activity?.content || getDefaultQuizContent()
  );
  
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [achievementConfig, setAchievementConfig] = useState<AchievementConfiguration>(
    content.achievementConfig
  );

  return (
    <div className="quiz-editor">
      {/* Basic Information */}
      <QuizBasicInfo
        content={content}
        onChange={setContent}
      />

      {/* Question Selection */}
      <QuestionBankIntegration
        selectedQuestions={selectedQuestions}
        onSelectQuestions={setSelectedQuestions}
        subjectId={activity?.subjectId}
        topicId={activity?.topicId}
        multiSelect={true}
        title="Select Questions for Quiz"
        description="Choose questions from the Question Bank"
      />

      {/* Quiz Settings */}
      <QuizSettings
        settings={content.settings}
        onChange={(settings) => setContent({...content, settings})}
      />

      {/* Assessment Mode Configuration */}
      <AssessmentModeConfig
        mode={content.assessmentMode}
        catSettings={content.catSettings}
        spacedRepetitionSettings={content.spacedRepetitionSettings}
        onChange={(config) => setContent({...content, ...config})}
      />

      {/* Achievement Configuration */}
      <AchievementConfigPanel
        config={achievementConfig}
        onChange={setAchievementConfig}
        activityType="quiz"
      />

      {/* Preview and Save */}
      <QuizPreview content={content} />
      <EditorActions onSave={handleSave} onCancel={onCancel} />
    </div>
  );
};
```

### 2. Question Selection Integration

```typescript
// Enhanced Question Bank Integration for Quiz
export const QuizQuestionSelector: React.FC<QuizQuestionSelectorProps> = ({
  selectedQuestions,
  onSelectQuestions,
  subjectId,
  topicId
}) => {
  const [filters, setFilters] = useState<QuestionFilters>({
    subjectId,
    topicId,
    bloomsLevels: [],
    difficulties: [],
    questionTypes: []
  });

  const { data: questions, isLoading } = api.questionBank.getQuestions.useQuery({
    filters,
    pagination: { page: 1, pageSize: 50 }
  });

  return (
    <div className="quiz-question-selector">
      {/* Advanced Filters */}
      <QuestionFilters
        filters={filters}
        onChange={setFilters}
        showBloomsDistribution={true}
        showDifficultyDistribution={true}
      />

      {/* Question List with Selection */}
      <VirtualizedQuestionList
        questions={questions?.items || []}
        selectedQuestions={selectedQuestions}
        onToggleSelection={handleQuestionToggle}
        onReorder={handleQuestionReorder}
        showSelectionControls={true}
        showPointsConfig={true}
      />

      {/* Bloom's Distribution Preview */}
      <BloomsDistributionPreview
        questions={selectedQuestions}
        showRecommendations={true}
      />

      {/* Selection Summary */}
      <QuestionSelectionSummary
        selectedQuestions={selectedQuestions}
        estimatedTime={calculateEstimatedTime(selectedQuestions)}
        totalPoints={calculateTotalPoints(selectedQuestions)}
      />
    </div>
  );
};
```

### 3. Quiz Settings Configuration

```typescript
// src/features/activities-v2/quiz/components/editor/QuizSettings.tsx
export const QuizSettings: React.FC<QuizSettingsProps> = ({
  settings,
  onChange
}) => {
  return (
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
              checked={settings.shuffleQuestions}
              onCheckedChange={(checked) => 
                onChange({...settings, shuffleQuestions: checked})
              }
            />
            <Label>Shuffle Questions</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.showFeedbackImmediately}
              onCheckedChange={(checked) => 
                onChange({...settings, showFeedbackImmediately: checked})
              }
            />
            <Label>Show Feedback Immediately</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.showCorrectAnswers}
              onCheckedChange={(checked) => 
                onChange({...settings, showCorrectAnswers: checked})
              }
            />
            <Label>Show Correct Answers</Label>
          </div>
        </div>

        {/* Time and Attempts */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Time and Attempts</h3>
          
          <div className="space-y-2">
            <Label>Time Limit (minutes)</Label>
            <Input
              type="number"
              value={settings.timeLimitMinutes || ''}
              onChange={(e) => onChange({
                ...settings, 
                timeLimitMinutes: e.target.value ? parseInt(e.target.value) : undefined
              })}
              placeholder="No time limit"
            />
          </div>

          <div className="space-y-2">
            <Label>Attempts Allowed</Label>
            <Select
              value={settings.attemptsAllowed.toString()}
              onValueChange={(value) => onChange({
                ...settings, 
                attemptsAllowed: parseInt(value)
              })}
            >
              <SelectItem value="1">1 attempt</SelectItem>
              <SelectItem value="2">2 attempts</SelectItem>
              <SelectItem value="3">3 attempts</SelectItem>
              <SelectItem value="-1">Unlimited</SelectItem>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Passing Score (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={settings.passingScore || ''}
              onChange={(e) => onChange({
                ...settings, 
                passingScore: e.target.value ? parseInt(e.target.value) : undefined
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
              checked={settings.allowReview}
              onCheckedChange={(checked) => 
                onChange({...settings, allowReview: checked})
              }
            />
            <Label>Allow Review Before Submit</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.showProgressBar}
              onCheckedChange={(checked) => 
                onChange({...settings, showProgressBar: checked})
              }
            />
            <Label>Show Progress Bar</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

## 🎮 Student Quiz Experience

### 1. Quiz Viewer Component

```typescript
// src/features/activities-v2/quiz/components/viewer/QuizViewer.tsx
export const QuizViewer: React.FC<QuizViewerProps> = ({
  activity,
  studentId,
  onComplete
}) => {
  const content = activity.content as QuizV2Content;
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Initialize quiz session
  useEffect(() => {
    initializeQuizSession();
  }, []);

  // Time tracking integration
  const { startTracking, stopTracking } = useTimeTracking();
  useEffect(() => {
    startTracking(activity.id);
    return () => stopTracking(activity.id);
  }, [activity.id]);

  const initializeQuizSession = async () => {
    try {
      const newSession = await api.quiz.startSession.mutate({
        activityId: activity.id,
        studentId
      });
      setSession(newSession);
      
      // Set up timer if time limit exists
      if (content.settings.timeLimitMinutes) {
        setTimeRemaining(content.settings.timeLimitMinutes * 60);
      }
    } catch (error) {
      console.error('Failed to start quiz session:', error);
    }
  };

  const handleAnswerChange = async (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // For immediate feedback mode
    if (content.settings.showFeedbackImmediately) {
      const result = await api.quiz.submitAnswer.mutate({
        sessionId: session!.id,
        questionId,
        answer,
        timeSpent: calculateQuestionTime(questionId)
      });

      // Show immediate feedback
      showQuestionFeedback(result);
    }
  };

  const handleQuizSubmit = async () => {
    try {
      const result = await api.quiz.complete.mutate({
        sessionId: session!.id,
        answers
      });

      // Show achievement animation if enabled
      if (content.achievementConfig.pointsAnimation) {
        showAchievementAnimation(result.achievements);
      }

      onComplete(result);
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
  };

  if (!session) {
    return <QuizLoadingState />;
  }

  const currentQuestion = session.questions[currentQuestionIndex];

  return (
    <div className="quiz-viewer">
      {/* Quiz Header */}
      <QuizHeader
        title={content.title}
        currentQuestion={currentQuestionIndex + 1}
        totalQuestions={session.questions.length}
        timeRemaining={timeRemaining}
        showProgressBar={content.settings.showProgressBar}
      />

      {/* Question Display */}
      <QuestionRenderer
        question={currentQuestion}
        answer={answers[currentQuestion.id]}
        onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
        showFeedback={content.settings.showFeedbackImmediately}
        shuffleOptions={content.questions.find(q => q.id === currentQuestion.id)?.shuffleOptions}
      />

      {/* Navigation Controls */}
      <QuizNavigation
        currentIndex={currentQuestionIndex}
        totalQuestions={session.questions.length}
        answers={answers}
        onNavigate={setCurrentQuestionIndex}
        onSubmit={handleQuizSubmit}
        allowReview={content.settings.allowReview}
      />

      {/* Achievement Animation Overlay */}
      <AchievementAnimationOverlay
        celebrationLevel={content.achievementConfig.celebrationLevel}
      />
    </div>
  );
};
```

### 2. Question Renderer Integration

```typescript
// src/features/activities-v2/quiz/components/viewer/QuestionRenderer.tsx
export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  answer,
  onAnswerChange,
  showFeedback,
  shuffleOptions
}) => {
  // Get the appropriate question component from Question Bank
  const QuestionComponent = getQuestionBankViewer(question.questionType);
  
  // Prepare question data with shuffle options if enabled
  const questionData = useMemo(() => {
    if (shuffleOptions && question.questionType === 'MULTIPLE_CHOICE') {
      return {
        ...question,
        content: {
          ...question.content,
          options: shuffleArray(question.content.options)
        }
      };
    }
    return question;
  }, [question, shuffleOptions]);

  return (
    <Card className="question-card">
      <CardContent className="p-6">
        {/* Question Number and Points */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">
            Question {question.order + 1}
          </span>
          <span className="text-sm font-medium">
            {question.points} {question.points === 1 ? 'point' : 'points'}
          </span>
        </div>

        {/* Question Content */}
        <QuestionComponent
          question={questionData}
          answer={answer}
          onAnswerChange={onAnswerChange}
          mode="student"
          showFeedback={showFeedback}
        />

        {/* Question Analytics Tracking */}
        <QuestionAnalyticsTracker
          questionId={question.id}
          onInteraction={(event) => trackQuestionInteraction(question.id, event)}
        />
      </CardContent>
    </Card>
  );
};
```

## 🏆 Achievement System Integration

### Achievement Configuration Panel

```typescript
// src/features/activities-v2/quiz/components/editor/AchievementConfigPanel.tsx
export const AchievementConfigPanel: React.FC<AchievementConfigPanelProps> = ({
  config,
  onChange,
  activityType
}) => {
  const [pointsPreview, setPointsPreview] = useState<PointsPreview | null>(null);

  useEffect(() => {
    setPointsPreview(calculatePointsPreview(config));
  }, [config]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Configuration</CardTitle>
        <CardDescription>
          Customize points and achievements for this {activityType} activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onChange({...config, enabled})}
            />
            <Label>Enable Achievements</Label>
            <p className="text-sm text-gray-500">
              Students will earn achievements and points for completing this activity
            </p>
          </div>

          {config.enabled && (
            <>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.pointsAnimation}
                  onCheckedChange={(pointsAnimation) => 
                    onChange({...config, pointsAnimation})
                  }
                />
                <Label>Points Animation</Label>
                <p className="text-sm text-gray-500">
                  Show animated points when students earn them
                </p>
              </div>

              <div className="space-y-2">
                <Label>Celebration Level</Label>
                <Select
                  value={config.celebrationLevel}
                  onValueChange={(celebrationLevel: CelebrationLevel) => 
                    onChange({...config, celebrationLevel})
                  }
                >
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </Select>
              </div>
            </>
          )}
        </div>

        {config.enabled && (
          <>
            {/* Points Configuration */}
            <PointsConfiguration
              points={config.points}
              onChange={(points) => onChange({...config, points})}
            />

            {/* Achievement Triggers */}
            <AchievementTriggers
              triggers={config.triggers}
              speedThreshold={config.speedBonusThresholdSeconds}
              onChange={(triggers, speedThreshold) => 
                onChange({
                  ...config, 
                  triggers,
                  speedBonusThresholdSeconds: speedThreshold
                })
              }
            />

            {/* Points Preview */}
            {pointsPreview && (
              <PointsPreviewCard preview={pointsPreview} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

This detailed specification provides the foundation for implementing a comprehensive quiz system that integrates seamlessly with the Question Bank, supports all question types, and provides rich achievement and analytics capabilities.
