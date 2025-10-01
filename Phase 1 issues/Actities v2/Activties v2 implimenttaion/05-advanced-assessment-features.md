# Advanced Assessment Features Specification

## 🎯 Overview

This document details the implementation of advanced assessment features including Computer Adaptive Testing (CAT), Item Response Theory (IRT), Spaced Repetition, and Paper-Based Testing (PBT) for Activities V2.

## 🧠 Computer Adaptive Testing (CAT) System

### Architecture
```
src/features/activities-v2/assessment/
├── cat/                    # CAT implementation
│   ├── engines/           # IRT algorithms
│   ├── item-selection/    # Question selection strategies
│   └── termination/       # Stopping criteria
├── irt/                   # Item Response Theory
│   ├── models/           # 1PL, 2PL, 3PL models
│   ├── estimation/       # Ability estimation
│   └── calibration/      # Item calibration
└── spaced-repetition/     # Spaced repetition system
    ├── algorithms/       # SM-2, Anki, SuperMemo
    ├── scheduling/       # Review scheduling
    └── forgetting-curve/ # Memory models
```

### CAT Engine Implementation

```typescript
// src/features/activities-v2/assessment/cat/engines/cat-engine.service.ts
export class CATEngine {
  constructor(
    private irtEngine: IRTEngine,
    private itemSelectionService: ItemSelectionService,
    private terminationService: TerminationService
  ) {}

  async initializeSession(
    activity: Activity,
    studentId: string
  ): Promise<CATSession> {
    const content = activity.content as QuizV2Content;
    const catSettings = content.catSettings!;

    // Get student's prior ability estimate
    const priorAbility = await this.getPriorAbilityEstimate(studentId, activity.subjectId);
    
    // Initialize IRT parameters
    const irtParameters = await this.irtEngine.initializeParameters(
      catSettings.algorithm,
      priorAbility || catSettings.startingDifficulty
    );

    // Select first question
    const firstQuestion = await this.itemSelectionService.selectInitialItem(
      activity.id,
      irtParameters,
      catSettings
    );

    return {
      id: generateSessionId(),
      activityId: activity.id,
      studentId,
      algorithm: catSettings.algorithm,
      currentAbility: irtParameters.ability,
      standardError: irtParameters.standardError,
      questionsAnswered: 0,
      maxQuestions: catSettings.terminationCriteria.maxQuestions,
      minQuestions: catSettings.terminationCriteria.minQuestions,
      currentQuestion: firstQuestion,
      questionHistory: [],
      terminated: false
    };
  }

  async processResponse(
    session: CATSession,
    questionId: string,
    response: any,
    timeSpent: number
  ): Promise<CATResponse> {
    // Grade the response
    const question = await this.getQuestion(questionId);
    const isCorrect = await this.gradeResponse(question, response);

    // Update ability estimate using IRT
    const updatedParameters = await this.irtEngine.updateAbilityEstimate(
      session.currentAbility,
      session.standardError,
      question.difficulty,
      question.discrimination,
      isCorrect
    );

    // Update session
    session.currentAbility = updatedParameters.ability;
    session.standardError = updatedParameters.standardError;
    session.questionsAnswered++;
    session.questionHistory.push({
      questionId,
      response,
      isCorrect,
      timeSpent,
      difficulty: question.difficulty,
      discrimination: question.discrimination
    });

    // Check termination criteria
    const shouldTerminate = await this.terminationService.shouldTerminate(
      session,
      updatedParameters
    );

    if (shouldTerminate) {
      session.terminated = true;
      return {
        action: 'TERMINATE',
        finalAbility: session.currentAbility,
        standardError: session.standardError,
        totalQuestions: session.questionsAnswered
      };
    }

    // Select next question
    const nextQuestion = await this.itemSelectionService.selectNextItem(
      session,
      updatedParameters
    );

    session.currentQuestion = nextQuestion;

    return {
      action: 'CONTINUE',
      nextQuestion,
      currentAbility: session.currentAbility,
      standardError: session.standardError,
      progress: session.questionsAnswered / session.maxQuestions
    };
  }
}
```

### IRT Engine Implementation

```typescript
// src/features/activities-v2/assessment/irt/engines/irt-engine.service.ts
export class IRTEngine {
  async initializeParameters(
    algorithm: IRTAlgorithm,
    startingAbility: number
  ): Promise<IRTParameters> {
    return {
      ability: startingAbility,
      standardError: 1.0, // Initial uncertainty
      algorithm,
      priorMean: 0,
      priorVariance: 1
    };
  }

  async updateAbilityEstimate(
    currentAbility: number,
    currentSE: number,
    itemDifficulty: number,
    itemDiscrimination: number,
    isCorrect: boolean
  ): Promise<IRTParameters> {
    switch (this.algorithm) {
      case 'irt_2pl':
        return this.update2PL(currentAbility, currentSE, itemDifficulty, itemDiscrimination, isCorrect);
      case 'irt_3pl':
        return this.update3PL(currentAbility, currentSE, itemDifficulty, itemDiscrimination, isCorrect);
      case 'rasch':
        return this.updateRasch(currentAbility, currentSE, itemDifficulty, isCorrect);
      default:
        throw new Error(`Unsupported IRT algorithm: ${this.algorithm}`);
    }
  }

  private async update2PL(
    ability: number,
    se: number,
    difficulty: number,
    discrimination: number,
    isCorrect: boolean
  ): Promise<IRTParameters> {
    // 2-Parameter Logistic Model
    const probability = this.calculate2PLProbability(ability, difficulty, discrimination);
    
    // Fisher Information
    const information = discrimination * discrimination * probability * (1 - probability);
    
    // Update ability using Maximum Likelihood Estimation
    const derivative = discrimination * (isCorrect ? 1 : 0 - probability);
    const newAbility = ability + derivative / information;
    
    // Update standard error
    const newSE = 1 / Math.sqrt(1 / (se * se) + information);

    return {
      ability: newAbility,
      standardError: newSE,
      algorithm: 'irt_2pl',
      priorMean: 0,
      priorVariance: 1
    };
  }

  private calculate2PLProbability(
    ability: number,
    difficulty: number,
    discrimination: number
  ): number {
    const exponent = discrimination * (ability - difficulty);
    return Math.exp(exponent) / (1 + Math.exp(exponent));
  }

  private async update3PL(
    ability: number,
    se: number,
    difficulty: number,
    discrimination: number,
    isCorrect: boolean,
    guessing: number = 0.25
  ): Promise<IRTParameters> {
    // 3-Parameter Logistic Model (includes guessing parameter)
    const probability = guessing + (1 - guessing) * this.calculate2PLProbability(ability, difficulty, discrimination);
    
    // More complex information calculation for 3PL
    const p2pl = this.calculate2PLProbability(ability, difficulty, discrimination);
    const information = (discrimination * discrimination * (1 - guessing) * (1 - guessing) * p2pl * (1 - p2pl)) / 
                       (probability * (1 - probability));
    
    const derivative = (discrimination * (1 - guessing) * (isCorrect ? 1 : 0 - probability)) / probability;
    const newAbility = ability + derivative / information;
    
    const newSE = 1 / Math.sqrt(1 / (se * se) + information);

    return {
      ability: newAbility,
      standardError: newSE,
      algorithm: 'irt_3pl',
      priorMean: 0,
      priorVariance: 1
    };
  }
}
```

### Item Selection Service

```typescript
// src/features/activities-v2/assessment/cat/item-selection/item-selection.service.ts
export class ItemSelectionService {
  constructor(
    private questionBankService: QuestionBankService,
    private irtEngine: IRTEngine
  ) {}

  async selectInitialItem(
    activityId: string,
    irtParameters: IRTParameters,
    catSettings: CATSettings
  ): Promise<Question> {
    // Get available questions for this activity
    const availableQuestions = await this.getAvailableQuestions(activityId);
    
    // For initial item, select one close to starting difficulty
    const targetDifficulty = catSettings.startingDifficulty;
    
    return this.selectByDifficulty(availableQuestions, targetDifficulty);
  }

  async selectNextItem(
    session: CATSession,
    irtParameters: IRTParameters
  ): Promise<Question> {
    const availableQuestions = await this.getUnusedQuestions(
      session.activityId,
      session.questionHistory.map(q => q.questionId)
    );

    switch (session.itemSelectionMethod || 'maximum_information') {
      case 'maximum_information':
        return this.selectByMaximumInformation(availableQuestions, irtParameters);
      case 'bayesian':
        return this.selectByBayesian(availableQuestions, irtParameters);
      case 'weighted':
        return this.selectByWeighted(availableQuestions, irtParameters);
      default:
        return this.selectByMaximumInformation(availableQuestions, irtParameters);
    }
  }

  private async selectByMaximumInformation(
    questions: Question[],
    irtParameters: IRTParameters
  ): Promise<Question> {
    let maxInformation = 0;
    let bestQuestion = questions[0];

    for (const question of questions) {
      const information = await this.calculateInformation(question, irtParameters);
      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  private async calculateInformation(
    question: Question,
    irtParameters: IRTParameters
  ): Promise<number> {
    const difficulty = question.metadata?.difficulty || 0;
    const discrimination = question.metadata?.discrimination || 1;
    
    // Calculate Fisher Information
    const probability = this.irtEngine.calculate2PLProbability(
      irtParameters.ability,
      difficulty,
      discrimination
    );
    
    return discrimination * discrimination * probability * (1 - probability);
  }
}
```

## 🔄 Spaced Repetition System

### Spaced Repetition Engine

```typescript
// src/features/activities-v2/assessment/spaced-repetition/engines/spaced-repetition.service.ts
export class SpacedRepetitionEngine {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  async selectQuestions(
    activity: Activity,
    studentId: string
  ): Promise<Question[]> {
    const content = activity.content as QuizV2Content;
    const settings = content.spacedRepetitionSettings!;

    // Get student's learning history
    const learningHistory = await this.getLearningHistory(studentId, activity.subjectId);
    
    // Get questions due for review
    const dueQuestions = await this.getQuestionsForReview(studentId, learningHistory);
    
    // If not enough due questions, add new ones
    if (dueQuestions.length < content.questions.length) {
      const newQuestions = await this.selectNewQuestions(
        activity,
        studentId,
        content.questions.length - dueQuestions.length
      );
      dueQuestions.push(...newQuestions);
    }

    return dueQuestions.slice(0, content.questions.length);
  }

  async processResponse(
    studentId: string,
    questionId: string,
    isCorrect: boolean,
    responseTime: number,
    difficulty: number
  ): Promise<SpacedRepetitionUpdate> {
    const learningRecord = await this.getLearningRecord(studentId, questionId);
    
    // Apply SM-2 algorithm (or selected algorithm)
    const update = await this.applySM2Algorithm(
      learningRecord,
      isCorrect,
      responseTime,
      difficulty
    );

    // Save updated learning record
    await this.updateLearningRecord(studentId, questionId, update);

    return update;
  }

  private async applySM2Algorithm(
    record: LearningRecord,
    isCorrect: boolean,
    responseTime: number,
    difficulty: number
  ): Promise<SpacedRepetitionUpdate> {
    let easeFactor = record.easeFactor || 2.5;
    let interval = record.interval || 1;
    let repetitions = record.repetitions || 0;

    if (isCorrect) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    // Adjust ease factor based on performance
    const quality = this.calculateQuality(isCorrect, responseTime, difficulty);
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      easeFactor,
      interval,
      repetitions,
      nextReviewDate,
      lastReviewDate: new Date(),
      quality
    };
  }

  private calculateQuality(
    isCorrect: boolean,
    responseTime: number,
    difficulty: number
  ): number {
    // Quality scale: 0-5
    // 5: perfect response, 4: correct with hesitation, 3: correct with difficulty
    // 2: incorrect but remembered, 1: incorrect but familiar, 0: complete blackout
    
    if (!isCorrect) {
      return responseTime > 30 ? 0 : 1; // Quick wrong vs slow wrong
    }

    // For correct responses, factor in response time and difficulty
    const expectedTime = difficulty * 10; // Expected time based on difficulty
    const timeRatio = responseTime / expectedTime;

    if (timeRatio < 0.5) return 5; // Very quick
    if (timeRatio < 1.0) return 4; // Normal speed
    if (timeRatio < 2.0) return 3; // Slow but correct
    return 2; // Very slow but correct
  }
}
```

## 📄 Paper-Based Testing (PBT) System

### Paper Generation Service

```typescript
// src/features/activities-v2/assessment/pbt/paper-generation.service.ts
export class PaperGenerationService {
  constructor(
    private questionBankService: QuestionBankService,
    private templateService: PaperTemplateService
  ) {}

  async generatePaper(activityId: string): Promise<PaperDocument> {
    const activity = await this.getActivity(activityId);
    const content = activity.content as QuizV2Content;
    
    // Get questions for the paper
    const questions = await this.getQuestionsForPaper(content.questions);
    
    // Generate paper sections
    const paper: PaperDocument = {
      id: generateId(),
      activityId,
      title: content.title,
      instructions: this.generateInstructions(content),
      header: this.generateHeader(activity),
      sections: await this.generateSections(questions),
      answerSheet: this.generateAnswerSheet(questions),
      gradingRubric: this.generateGradingRubric(questions),
      metadata: {
        generatedAt: new Date(),
        totalQuestions: questions.length,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        estimatedTime: content.settings.timeLimitMinutes,
        version: '1.0'
      }
    };

    return paper;
  }

  private async generateSections(questions: Question[]): Promise<PaperSection[]> {
    const sections: PaperSection[] = [];
    
    // Group questions by type for better paper organization
    const questionsByType = this.groupQuestionsByType(questions);
    
    for (const [type, typeQuestions] of Object.entries(questionsByType)) {
      const section: PaperSection = {
        id: generateId(),
        title: this.getSectionTitle(type),
        instructions: this.getSectionInstructions(type),
        questions: await this.formatQuestionsForPaper(typeQuestions),
        totalPoints: typeQuestions.reduce((sum, q) => sum + (q.points || 1), 0)
      };
      
      sections.push(section);
    }

    return sections;
  }

  private async formatQuestionsForPaper(questions: Question[]): Promise<PaperQuestion[]> {
    return Promise.all(questions.map(async (question, index) => {
      const paperQuestion: PaperQuestion = {
        number: index + 1,
        id: question.id,
        type: question.questionType,
        content: await this.convertToPaperFormat(question),
        points: question.points || 1,
        answerSpace: this.calculateAnswerSpace(question),
        bloomsLevel: question.bloomsLevel,
        difficulty: question.difficulty
      };

      return paperQuestion;
    }));
  }

  private async convertToPaperFormat(question: Question): Promise<PaperQuestionContent> {
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        return this.formatMultipleChoice(question);
      case 'TRUE_FALSE':
        return this.formatTrueFalse(question);
      case 'FILL_IN_THE_BLANKS':
        return this.formatFillInTheBlanks(question);
      case 'SHORT_ANSWER':
        return this.formatShortAnswer(question);
      case 'ESSAY':
        return this.formatEssay(question);
      default:
        return this.formatGeneric(question);
    }
  }

  private formatMultipleChoice(question: Question): PaperQuestionContent {
    return {
      text: question.content.text,
      options: question.content.options.map((opt: any, idx: number) => ({
        label: String.fromCharCode(65 + idx), // A, B, C, D
        text: opt.text
      })),
      instructions: 'Choose the best answer and mark it on the answer sheet.',
      answerFormat: 'multiple_choice'
    };
  }

  private generateAnswerSheet(questions: Question[]): AnswerSheet {
    const answerSheet: AnswerSheet = {
      id: generateId(),
      title: 'Answer Sheet',
      instructions: 'Mark your answers clearly. Use a pencil and fill in the circles completely.',
      sections: []
    };

    // Group questions by type for answer sheet organization
    const questionsByType = this.groupQuestionsByType(questions);
    
    for (const [type, typeQuestions] of Object.entries(questionsByType)) {
      const section: AnswerSheetSection = {
        title: this.getSectionTitle(type),
        questions: typeQuestions.map((q, idx) => ({
          number: idx + 1,
          type: q.questionType,
          answerFormat: this.getAnswerFormat(q.questionType),
          options: this.getAnswerOptions(q)
        }))
      };
      
      answerSheet.sections.push(section);
    }

    return answerSheet;
  }

  private generateGradingRubric(questions: Question[]): GradingRubric {
    return {
      id: generateId(),
      title: 'Grading Rubric',
      totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
      sections: questions.map((q, idx) => ({
        questionNumber: idx + 1,
        questionId: q.id,
        points: q.points || 1,
        correctAnswer: this.extractCorrectAnswer(q),
        gradingCriteria: this.getGradingCriteria(q),
        partialCreditRules: this.getPartialCreditRules(q)
      }))
    };
  }
}
```

### Paper Template Service

```typescript
// src/features/activities-v2/assessment/pbt/paper-template.service.ts
export class PaperTemplateService {
  async generatePDF(paper: PaperDocument): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Add header
    this.addHeader(doc, paper.header);
    
    // Add instructions
    this.addInstructions(doc, paper.instructions);
    
    // Add sections
    for (const section of paper.sections) {
      this.addSection(doc, section);
    }

    // Generate answer sheet as separate pages
    this.addAnswerSheet(doc, paper.answerSheet);

    return doc;
  }

  private addHeader(doc: PDFDocument, header: PaperHeader): void {
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(header.title, { align: 'center' });
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`Subject: ${header.subject}`, 50, doc.y + 10);
    doc.text(`Class: ${header.class}`, 50, doc.y + 5);
    doc.text(`Date: ${header.date}`, 50, doc.y + 5);
    doc.text(`Time Limit: ${header.timeLimit} minutes`, 50, doc.y + 5);
    doc.text(`Total Points: ${header.totalPoints}`, 50, doc.y + 5);
    
    // Add student info section
    doc.text('Name: ________________________', 300, doc.y - 40);
    doc.text('Student ID: ___________________', 300, doc.y + 5);
    
    doc.moveTo(50, doc.y + 20).lineTo(550, doc.y + 20).stroke();
  }

  private addSection(doc: PDFDocument, section: PaperSection): void {
    doc.addPage();
    
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(section.title);
    
    doc.fontSize(10).font('Helvetica');
    doc.text(section.instructions, { width: 500 });
    
    doc.moveDown();
    
    for (const question of section.questions) {
      this.addQuestion(doc, question);
    }
  }

  private addQuestion(doc: PDFDocument, question: PaperQuestion): void {
    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage();
    }

    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(`${question.number}. (${question.points} ${question.points === 1 ? 'point' : 'points'})`);
    
    doc.fontSize(10).font('Helvetica');
    doc.text(question.content.text, { width: 500 });
    
    // Add question-specific formatting
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
        this.addMultipleChoiceOptions(doc, question.content.options);
        break;
      case 'TRUE_FALSE':
        this.addTrueFalseOptions(doc);
        break;
      case 'FILL_IN_THE_BLANKS':
        this.addFillInTheBlanksSpace(doc, question.content);
        break;
      case 'SHORT_ANSWER':
        this.addShortAnswerSpace(doc, question.answerSpace);
        break;
      case 'ESSAY':
        this.addEssaySpace(doc, question.answerSpace);
        break;
    }
    
    doc.moveDown();
  }
}
```

This specification provides comprehensive advanced assessment features that enable sophisticated educational testing capabilities while maintaining integration with the existing Question Bank and analytics systems.
