# Activities V2 Advanced Features

This document describes the advanced features implemented in Activities V2, including Computer Adaptive Testing (CAT), Spaced Repetition, and Paper-based Testing support.

## Overview

Activities V2 now includes three major advanced features that enhance the assessment and learning experience:

1. **Computer Adaptive Testing (CAT) with Item Response Theory (IRT)** - Personalized assessments that adapt to student ability
2. **Spaced Repetition System** - Optimized review scheduling for long-term retention
3. **Paper-based Testing Support** - Export digital activities to printable tests with manual grading integration

## 1. Computer Adaptive Testing (CAT/IRT)

### What is CAT?

Computer Adaptive Testing uses Item Response Theory to dynamically adjust question difficulty based on student performance, providing more accurate ability measurements with fewer questions.

### Features

- **IRT Models**: Supports Rasch (1PL), 2-Parameter Logistic (2PL), and 3-Parameter Logistic (3PL) models
- **Adaptive Question Selection**: Multiple algorithms including Maximum Information, Bayesian, and Weighted selection
- **Termination Criteria**: Configurable minimum/maximum questions and standard error thresholds
- **Real-time Ability Estimation**: Continuous updates to student ability estimates

### Configuration

```typescript
const catSettings: CATSettings = {
  algorithm: 'irt_2pl',
  startingDifficulty: 0.0,
  terminationCriteria: {
    maxQuestions: 20,
    minQuestions: 5,
    standardErrorThreshold: 0.3
  },
  itemSelectionMethod: 'maximum_information'
};
```

### Usage

```typescript
// Start CAT session
const session = await activityV2Service.startAdvancedAssessment(activityId, studentId);

// Get next question
const nextQuestion = await activityV2Service.getNextAdvancedQuestion(session.id);

// Process answer
const result = await activityV2Service.processAdvancedAnswer(
  session.id, 
  questionId, 
  answer, 
  responseTime
);
```

### Benefits

- **Efficient Assessment**: Fewer questions needed for accurate measurement
- **Personalized Experience**: Questions matched to student ability level
- **Reduced Test Anxiety**: Appropriate difficulty reduces frustration
- **Precise Measurement**: Better ability estimates than traditional tests

## 2. Spaced Repetition System

### What is Spaced Repetition?

Spaced Repetition optimizes learning retention by scheduling review activities based on forgetting curves and individual performance patterns.

### Features

- **Multiple Algorithms**: SM-2 (SuperMemo 2), Anki Algorithm, and SuperMemo
- **Personalized Scheduling**: Individual intervals based on performance
- **Learning States**: New, Learning, Review, Relearning, Graduated
- **Performance Tracking**: Retention rates, ease factors, and learning velocity

### Configuration

```typescript
const spacedRepetitionSettings: SpacedRepetitionSettings = {
  algorithm: 'sm2',
  initialInterval: 1,
  maxInterval: 365,
  easeFactor: 2.5
};
```

### Usage

```typescript
// Get cards due for review
const cards = await spacedRepetitionService.getCardsForReview(studentId, subjectId);

// Process review result
const updatedCard = await spacedRepetitionService.processReviewResult(cardId, {
  isCorrect: true,
  responseTime: 5000,
  difficulty: 'good',
  confidence: 4
});

// Get learning statistics
const stats = await activityV2Service.getSpacedRepetitionStats(studentId, subjectId);
```

### Benefits

- **Optimized Retention**: Reviews scheduled at optimal intervals
- **Long-term Learning**: Focus on knowledge that sticks
- **Efficient Study Time**: Review only what needs reinforcement
- **Personalized Pacing**: Adapts to individual learning patterns

## 3. Paper-based Testing Support

### What is Paper-based Testing?

Converts digital Activities V2 quizzes into printable test papers with support for manual grading and integration back into the digital system.

### Features

- **PDF Generation**: Professional test papers, answer sheets, and answer keys
- **Multiple Versions**: Generate different versions with shuffled questions/options
- **Flexible Layout**: Single/two-column, various font sizes and spacing
- **Answer Sheet Types**: Inline, separate, or bubble sheet (OMR) formats
- **Manual Grading**: Digital interface for grading paper submissions
- **Grade Integration**: Seamless integration with digital gradebook

### Configuration

```typescript
const paperTestConfig: PaperTestConfiguration = {
  title: 'Mathematics Quiz - Chapter 5',
  layout: 'single_column',
  fontSize: 'medium',
  spacing: 'normal',
  includeHeader: true,
  includeStudentInfo: true,
  answerSheetType: 'separate',
  includeAnswerKey: true,
  generateMultipleVersions: true,
  numberOfVersions: 3,
  shuffleQuestions: true,
  shuffleOptions: true
};
```

### Usage

```typescript
// Export to paper test
const paperTest = await activityV2Service.exportToPaperTest(
  activityId, 
  paperTestConfig, 
  teacherId
);

// Create grading session
const gradingSession = await paperBasedTestingService.createManualGradingSession(
  activityId,
  paperTest.id,
  teacherId,
  studentIds
);

// Grade submission
const gradedSubmission = await paperBasedTestingService.gradeSubmission(
  submissionId,
  answers,
  teacherId,
  feedback
);
```

### Benefits

- **Hybrid Assessment**: Combine digital and paper-based testing
- **Accessibility**: Support for students without digital access
- **Exam Conditions**: Traditional paper-based exam environment
- **Backup Option**: Alternative when technology fails

## Integration with Activities V2

### Quiz Settings Enhancement

The `AdvancedQuizSettings` component allows teachers to configure advanced features:

```tsx
<AdvancedQuizSettings
  assessmentMode={assessmentMode}
  catSettings={catSettings}
  spacedRepetitionSettings={spacedRepetitionSettings}
  onAssessmentModeChange={setAssessmentMode}
  onCATSettingsChange={setCATSettings}
  onSpacedRepetitionSettingsChange={setSpacedRepetitionSettings}
/>
```

### Paper Test Export

The `PaperTestExport` component provides a comprehensive interface for exporting activities:

```tsx
<PaperTestExport
  activityId={activityId}
  activityTitle={activityTitle}
  totalQuestions={totalQuestions}
  totalMarks={totalMarks}
  onExport={handlePaperTestExport}
  isExporting={isExporting}
/>
```

## Database Schema

The advanced features require additional database tables:

- `SpacedRepetitionCard` - Individual learning cards for spaced repetition
- `CATSession` - CAT assessment sessions
- `CATResponse` - Individual responses in CAT sessions
- `PaperTest` - Generated paper test documents
- `PaperTestSubmission` - Student submissions for paper tests
- `ManualGradingSession` - Grading sessions for paper tests
- `QuestionUsageEvent` - Enhanced question usage tracking for IRT
- `LearningAnalytics` - Comprehensive learning analytics

## API Endpoints

### tRPC Endpoints

- `activityV2.startAdvancedAssessment` - Start CAT or spaced repetition session
- `activityV2.getNextAdvancedQuestion` - Get next question in adaptive assessment
- `activityV2.processAdvancedAnswer` - Process answer and update algorithms
- `activityV2.generateAdvancedAnalytics` - Generate comprehensive analytics
- `activityV2.exportToPaperTest` - Export activity to paper test
- `activityV2.getSpacedRepetitionStats` - Get spaced repetition statistics
- `activityV2.generateReviewSchedule` - Generate personalized review schedule

## Analytics and Reporting

### CAT Analytics

- Ability distribution across students
- Question difficulty calibration
- Termination reason analysis
- Assessment efficiency metrics

### Spaced Repetition Analytics

- Retention rate trends
- Learning velocity measurements
- Ease factor distributions
- Review schedule optimization

### Paper Test Analytics

- Comparative performance (digital vs paper)
- Question difficulty analysis
- Grading consistency metrics
- Time-to-completion analysis

## Best Practices

### CAT Implementation

1. **Question Pool Size**: Ensure sufficient questions across difficulty levels
2. **IRT Calibration**: Allow time for question parameter calibration
3. **Starting Difficulty**: Use neutral starting point unless prior data available
4. **Termination Criteria**: Balance precision with assessment time

### Spaced Repetition

1. **Consistent Practice**: Encourage daily review sessions
2. **Algorithm Selection**: SM-2 is most tested and reliable
3. **Initial Intervals**: Start conservative, adjust based on performance
4. **Subject Separation**: Maintain separate schedules per subject

### Paper-based Testing

1. **Version Control**: Use multiple versions for large groups
2. **Clear Instructions**: Provide comprehensive test instructions
3. **Answer Key Security**: Secure distribution of answer keys
4. **Digital Integration**: Ensure smooth grade transfer process

## Future Enhancements

- **Machine Learning Integration**: Advanced predictive models for question selection
- **Biometric Integration**: Eye-tracking and response time analysis
- **Collaborative Filtering**: Peer-based question recommendations
- **Advanced Visualizations**: Interactive learning progress dashboards
- **Mobile Optimization**: Native mobile apps for spaced repetition
- **OCR Integration**: Automated paper test scanning and grading

## Conclusion

The advanced features in Activities V2 represent a significant enhancement to the assessment and learning capabilities of the platform. By implementing CAT/IRT, Spaced Repetition, and Paper-based Testing support, the system now provides:

- More accurate and efficient assessments
- Optimized learning retention
- Flexible delivery options
- Comprehensive analytics
- Seamless integration between digital and traditional methods

These features position Activities V2 as a comprehensive, research-backed assessment platform suitable for modern educational environments.
