/**
 * Paper-based Testing Service
 * 
 * Generates printable test papers and supports manual grading integration
 * with the digital Activities V2 system.
 */

import { PrismaClient, QuestionType, DifficultyLevel } from '@prisma/client';
import { QuizV2Content, QuizV2Question } from '../types';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';

export interface PaperTestConfiguration {
  activityId: string;
  title: string;
  instructions?: string;
  
  // Layout options
  layout: 'single_column' | 'two_column';
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'normal' | 'wide';
  
  // Header/Footer
  includeHeader: boolean;
  includeFooter: boolean;
  includeStudentInfo: boolean;
  includeAnswerSheet: boolean;
  
  // Question options
  showQuestionNumbers: boolean;
  showPointValues: boolean;
  showInstructions: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  
  // Answer options
  answerSheetType: 'inline' | 'separate' | 'bubble_sheet';
  includeAnswerKey: boolean;
  
  // Versions
  generateMultipleVersions: boolean;
  numberOfVersions: number;
  
  // Metadata
  examDate?: Date;
  duration?: number;
  totalMarks?: number;
  passingMarks?: number;
}

export interface PaperTestDocument {
  id: string;
  activityId: string;
  version: number;
  configuration: PaperTestConfiguration;
  
  // Content
  questions: PaperTestQuestion[];
  answerKey: PaperTestAnswerKey[];
  
  // Generated files
  testPaperPdf?: string;
  answerSheetPdf?: string;
  answerKeyPdf?: string;
  
  // Metadata
  generatedAt: Date;
  generatedBy: string;
  questionOrder: string[]; // For tracking shuffled order
}

export interface PaperTestQuestion {
  id: string;
  questionBankId: string;
  order: number;
  points: number;
  
  // Content
  questionType: QuestionType;
  title: string;
  content: any;
  options?: PaperTestOption[];
  
  // Layout
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  spaceForAnswer?: number; // Lines or cm
}

export interface PaperTestOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface PaperTestAnswerKey {
  questionId: string;
  questionNumber: number;
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
  bloomsLevel?: string;
  difficulty?: DifficultyLevel;
}

export interface ManualGradingSession {
  id: string;
  activityId: string;
  paperTestId: string;
  teacherId: string;
  
  // Student submissions
  submissions: PaperTestSubmission[];
  
  // Progress
  totalSubmissions: number;
  gradedSubmissions: number;
  
  // Metadata
  startedAt: Date;
  completedAt?: Date;
}

export interface PaperTestSubmission {
  id: string;
  studentId: string;
  paperTestId: string;
  
  // Answers
  answers: PaperTestAnswer[];
  
  // Grading
  isGraded: boolean;
  totalScore?: number;
  maxScore: number;
  percentage?: number;
  
  // Manual grading data
  gradedBy?: string;
  gradedAt?: Date;
  feedback?: string;
  
  // Metadata
  submittedAt: Date;
  scanData?: any; // For OMR/OCR integration
}

export interface PaperTestAnswer {
  questionId: string;
  questionNumber: number;
  
  // Student response
  response: string | string[];
  isCorrect?: boolean;
  pointsAwarded?: number;
  maxPoints: number;
  
  // Manual grading
  manualOverride?: boolean;
  graderComments?: string;
}

export class PaperBasedTestingService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  /**
   * Generate a paper test from an Activities V2 quiz
   */
  async generatePaperTest(
    activityId: string,
    configuration: PaperTestConfiguration,
    teacherId: string
  ): Promise<PaperTestDocument> {
    // Get the activity
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        subject: true,
        topic: true,
        class: true
      }
    });

    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    // Type-safe content parsing
    const content = activity.content as unknown as QuizV2Content;
    if (!content || typeof content !== 'object' || content.type !== 'quiz') {
      throw new Error('Only quiz activities can be converted to paper tests');
    }

    // Get questions from Question Bank
    const questions = await this.getQuestionsForPaperTest(content.questions, configuration);
    
    // Generate answer key
    const answerKey = this.generateAnswerKey(questions);
    
    // Create paper test document
    const paperTest: PaperTestDocument = {
      id: `paper_${activityId}_${Date.now()}`,
      activityId,
      version: 1,
      configuration,
      questions,
      answerKey,
      generatedAt: new Date(),
      generatedBy: teacherId,
      questionOrder: questions.map(q => q.id)
    };

    // Generate PDF files
    if (configuration.includeAnswerSheet) {
      paperTest.testPaperPdf = await this.generateTestPaperPDF(paperTest);
      paperTest.answerSheetPdf = await this.generateAnswerSheetPDF(paperTest);
    }
    
    if (configuration.includeAnswerKey) {
      paperTest.answerKeyPdf = await this.generateAnswerKeyPDF(paperTest);
    }

    // Save to database
    await this.savePaperTest(paperTest);

    return paperTest;
  }

  /**
   * Generate multiple versions of a paper test
   */
  async generateMultipleVersions(
    activityId: string,
    configuration: PaperTestConfiguration,
    teacherId: string
  ): Promise<PaperTestDocument[]> {
    const versions: PaperTestDocument[] = [];
    
    for (let i = 1; i <= configuration.numberOfVersions; i++) {
      const versionConfig = { ...configuration };
      versionConfig.shuffleQuestions = true;
      versionConfig.shuffleOptions = true;
      
      const paperTest = await this.generatePaperTest(activityId, versionConfig, teacherId);
      paperTest.version = i;
      
      versions.push(paperTest);
    }

    return versions;
  }

  /**
   * Create a manual grading session
   */
  async createManualGradingSession(
    activityId: string,
    paperTestId: string,
    teacherId: string,
    studentIds: string[]
  ): Promise<ManualGradingSession> {
    const paperTest = await this.getPaperTest(paperTestId);
    if (!paperTest) {
      throw new Error(`Paper test ${paperTestId} not found`);
    }

    // Create submissions for each student
    const submissions: PaperTestSubmission[] = studentIds.map(studentId => ({
      id: `submission_${studentId}_${paperTestId}`,
      studentId,
      paperTestId,
      answers: paperTest.questions.map(q => ({
        questionId: q.id,
        questionNumber: q.order,
        response: '',
        maxPoints: q.points
      })),
      isGraded: false,
      maxScore: paperTest.questions.reduce((sum, q) => sum + q.points, 0),
      submittedAt: new Date()
    }));

    const session: ManualGradingSession = {
      id: `grading_${activityId}_${Date.now()}`,
      activityId,
      paperTestId,
      teacherId,
      submissions,
      totalSubmissions: submissions.length,
      gradedSubmissions: 0,
      startedAt: new Date()
    };

    await this.saveGradingSession(session);
    return session;
  }

  /**
   * Grade a student's paper test submission
   */
  async gradeSubmission(
    submissionId: string,
    answers: PaperTestAnswer[],
    teacherId: string,
    feedback?: string
  ): Promise<PaperTestSubmission> {
    const submission = await this.getSubmission(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    const paperTest = await this.getPaperTest(submission.paperTestId);
    if (!paperTest) {
      throw new Error(`Paper test ${submission.paperTestId} not found`);
    }

    // Grade each answer
    let totalScore = 0;
    const gradedAnswers: PaperTestAnswer[] = [];

    for (const answer of answers) {
      const question = paperTest.questions.find(q => q.id === answer.questionId);
      const answerKey = paperTest.answerKey.find(ak => ak.questionId === answer.questionId);
      
      if (!question || !answerKey) continue;

      const gradedAnswer = await this.gradeAnswer(answer, question, answerKey);
      gradedAnswers.push(gradedAnswer);
      totalScore += gradedAnswer.pointsAwarded || 0;
    }

    // Update submission
    submission.answers = gradedAnswers;
    submission.totalScore = totalScore;
    submission.percentage = (totalScore / submission.maxScore) * 100;
    submission.isGraded = true;
    submission.gradedBy = teacherId;
    submission.gradedAt = new Date();
    submission.feedback = feedback;

    await this.saveSubmission(submission);

    // Create corresponding digital grade
    await this.createDigitalGrade(submission);

    return submission;
  }

  /**
   * Import grades from OMR/OCR scanning
   */
  async importScannedGrades(
    paperTestId: string,
    scanData: any[],
    teacherId: string
  ): Promise<PaperTestSubmission[]> {
    const submissions: PaperTestSubmission[] = [];

    for (const scan of scanData) {
      const submission = await this.processScannedSubmission(scan, paperTestId, teacherId);
      submissions.push(submission);
    }

    return submissions;
  }

  /**
   * Generate analytics for paper test performance
   */
  async generatePaperTestAnalytics(paperTestId: string): Promise<{
    totalSubmissions: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    questionAnalytics: Array<{
      questionId: string;
      questionNumber: number;
      correctAnswers: number;
      incorrectAnswers: number;
      averageScore: number;
      difficulty: number;
    }>;
  }> {
    const submissions = await this.getSubmissionsByPaperTest(paperTestId);
    const gradedSubmissions = submissions.filter(s => s.isGraded);

    if (gradedSubmissions.length === 0) {
      throw new Error('No graded submissions found');
    }

    const scores = gradedSubmissions.map(s => s.totalScore || 0);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    const paperTest = await this.getPaperTest(paperTestId);
    const passingScore = paperTest?.configuration.passingMarks || (paperTest?.configuration.totalMarks || 0) * 0.6;
    const passRate = (scores.filter(score => score >= passingScore).length / scores.length) * 100;

    // Question-level analytics
    const questionAnalytics = paperTest?.questions.map(question => {
      const questionAnswers = gradedSubmissions.flatMap(s => 
        s.answers.filter(a => a.questionId === question.id)
      );

      const correctAnswers = questionAnswers.filter(a => a.isCorrect).length;
      const incorrectAnswers = questionAnswers.length - correctAnswers;
      const averageQuestionScore = questionAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0) / questionAnswers.length;
      const difficulty = 1 - (correctAnswers / questionAnswers.length); // 0 = easy, 1 = hard

      return {
        questionId: question.id,
        questionNumber: question.order,
        correctAnswers,
        incorrectAnswers,
        averageScore: averageQuestionScore,
        difficulty
      };
    }) || [];

    return {
      totalSubmissions: submissions.length,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      questionAnalytics
    };
  }

  // Private helper methods

  private async getQuestionsForPaperTest(
    quizQuestions: QuizV2Question[],
    configuration: PaperTestConfiguration
  ): Promise<PaperTestQuestion[]> {
    const questions: PaperTestQuestion[] = [];

    for (const quizQuestion of quizQuestions) {
      const question = await this.questionBankService.getQuestion(quizQuestion.id);
      if (!question) continue;

      const paperQuestion: PaperTestQuestion = {
        id: question.id,
        questionBankId: question.questionBankId,
        order: quizQuestion.order,
        points: quizQuestion.points,
        questionType: question.questionType,
        title: question.title,
        content: question.content,
        options: this.extractOptions(question),
        spaceForAnswer: this.calculateAnswerSpace(question.questionType)
      };

      questions.push(paperQuestion);
    }

    // Shuffle if requested
    if (configuration.shuffleQuestions) {
      this.shuffleArray(questions);
      // Update order numbers
      questions.forEach((q, index) => q.order = index + 1);
    }

    return questions;
  }

  private extractOptions(question: any): PaperTestOption[] | undefined {
    if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE') {
      const options = question.content?.options || [];
      return options.map((option: any, index: number) => ({
        id: option.id || `option_${index}`,
        text: option.text || option.label,
        isCorrect: option.isCorrect || false,
        order: index + 1
      }));
    }
    return undefined;
  }

  private calculateAnswerSpace(questionType: QuestionType): number {
    switch (questionType) {
      case 'SHORT_ANSWER':
        return 2; // 2 lines
      case 'ESSAY':
        return 10; // 10 lines
      case 'FILL_IN_THE_BLANKS':
        return 1; // 1 line
      default:
        return 0; // No extra space needed
    }
  }

  private generateAnswerKey(questions: PaperTestQuestion[]): PaperTestAnswerKey[] {
    return questions.map(question => {
      let correctAnswer: string | string[] = '';
      
      if (question.options) {
        const correctOptions = question.options.filter(opt => opt.isCorrect);
        correctAnswer = correctOptions.length === 1 
          ? correctOptions[0].text 
          : correctOptions.map(opt => opt.text);
      } else if (question.content?.correctAnswer) {
        correctAnswer = question.content.correctAnswer;
      }

      return {
        questionId: question.id,
        questionNumber: question.order,
        correctAnswer,
        points: question.points,
        explanation: question.content?.explanation
      };
    });
  }

  private async gradeAnswer(
    answer: PaperTestAnswer,
    question: PaperTestQuestion,
    answerKey: PaperTestAnswerKey
  ): Promise<PaperTestAnswer> {
    let isCorrect = false;
    let pointsAwarded = 0;

    // Auto-grade based on question type
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
      case 'TRUE_FALSE':
        isCorrect = this.compareAnswers(answer.response, answerKey.correctAnswer);
        pointsAwarded = isCorrect ? answer.maxPoints : 0;
        break;
      
      case 'FILL_IN_THE_BLANKS':
        isCorrect = this.compareFillInTheBlank(answer.response, answerKey.correctAnswer);
        pointsAwarded = isCorrect ? answer.maxPoints : 0;
        break;
      
      default:
        // Manual grading required for essay, short answer, etc.
        pointsAwarded = answer.pointsAwarded || 0;
        isCorrect = pointsAwarded > 0;
    }

    return {
      ...answer,
      isCorrect,
      pointsAwarded
    };
  }

  private compareAnswers(studentAnswer: string | string[], correctAnswer: string | string[]): boolean {
    if (Array.isArray(correctAnswer)) {
      if (Array.isArray(studentAnswer)) {
        return studentAnswer.sort().join(',') === correctAnswer.sort().join(',');
      }
      return correctAnswer.includes(studentAnswer as string);
    }
    
    return (studentAnswer as string)?.toLowerCase().trim() === (correctAnswer as string)?.toLowerCase().trim();
  }

  private compareFillInTheBlank(studentAnswer: string | string[], correctAnswer: string | string[]): boolean {
    // More flexible comparison for fill-in-the-blank
    const normalize = (text: string) => text.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some(answer => 
        normalize(studentAnswer as string) === normalize(answer)
      );
    }
    
    return normalize(studentAnswer as string) === normalize(correctAnswer as string);
  }

  private async generateTestPaperPDF(paperTest: PaperTestDocument): Promise<string> {
    // Implementation would use a PDF generation library like PDFKit or Puppeteer
    // This is a placeholder that would generate the actual PDF
    return `test_paper_${paperTest.id}.pdf`;
  }

  private async generateAnswerSheetPDF(paperTest: PaperTestDocument): Promise<string> {
    // Generate answer sheet based on configuration
    return `answer_sheet_${paperTest.id}.pdf`;
  }

  private async generateAnswerKeyPDF(paperTest: PaperTestDocument): Promise<string> {
    // Generate answer key PDF
    return `answer_key_${paperTest.id}.pdf`;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private async createDigitalGrade(submission: PaperTestSubmission): Promise<void> {
    // Create corresponding ActivityGrade record for integration with digital system
    await this.prisma.activityGrade.create({
      data: {
        activityId: submission.paperTestId, // Link to paper test
        studentId: submission.studentId,
        score: submission.totalScore || 0,
        // Note: maxScore is stored in Activity model, not ActivityGrade
        feedback: submission.feedback,
        status: 'GRADED',
        gradedAt: submission.gradedAt,
        gradedById: submission.gradedBy || '',
        content: {
          source: 'paper_test',
          paperTestId: submission.paperTestId,
          submissionId: submission.id,
          percentage: submission.percentage || 0
        }
      }
    });
  }

  private async processScannedSubmission(
    scanData: any,
    paperTestId: string,
    teacherId: string
  ): Promise<PaperTestSubmission> {
    // Process OMR/OCR scan data and create submission
    // This would integrate with scanning software/hardware
    
    const submission: PaperTestSubmission = {
      id: `scan_${scanData.studentId}_${paperTestId}`,
      studentId: scanData.studentId,
      paperTestId,
      answers: scanData.answers || [],
      isGraded: false,
      maxScore: scanData.maxScore || 0,
      submittedAt: new Date(),
      scanData
    };

    // Auto-grade if possible
    const gradedSubmission = await this.gradeSubmission(submission.id, submission.answers, teacherId);
    
    return gradedSubmission;
  }

  // Database operations (simplified - would use actual Prisma operations)
  private async savePaperTest(_paperTest: PaperTestDocument): Promise<void> {
    // Save to database
  }

  private async getPaperTest(_paperTestId: string): Promise<PaperTestDocument | null> {
    // Get from database
    return null;
  }

  private async saveGradingSession(_session: ManualGradingSession): Promise<void> {
    // Save to database
  }

  private async getSubmission(_submissionId: string): Promise<PaperTestSubmission | null> {
    // Get from database
    return null;
  }

  private async saveSubmission(_submission: PaperTestSubmission): Promise<void> {
    // Save to database
  }

  private async getSubmissionsByPaperTest(paperTestId: string): Promise<PaperTestSubmission[]> {
    // Get from database
    return [];
  }
}
