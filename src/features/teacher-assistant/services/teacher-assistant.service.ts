/**
 * Teacher Assistant Service
 * 
 * Provides server-side functionality for the Teacher Assistant
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { TeacherContext } from '../types';

export interface TeacherAssistantServiceOptions {
  message: string;
  context: TeacherContext;
  classId?: string;
  courseId?: string;
}

export class TeacherAssistantService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google Generative AI API key not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate a response using Google Generative AI
   */
  async generateResponse(options: TeacherAssistantServiceOptions): Promise<string> {
    try {
      const { message, context, classId, courseId } = options;

      // Create enhanced prompt with teacher and class context
      const enhancedPrompt = this.createEnhancedPrompt(message, context, classId, courseId);

      // Use Gemini 2.0 Flash model with concise output
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300, // Reduced for concise responses
        }
      });
      
      // Generate content
      const result = await model.generateContent(enhancedPrompt);
      const response = result.response.text();
      
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error(`Failed to generate AI response: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a streaming response using Google Generative AI
   */
  async generateStreamingResponse(options: TeacherAssistantServiceOptions) {
    try {
      const { message, context, classId, courseId } = options;

      // Create enhanced prompt with teacher and class context
      const enhancedPrompt = this.createEnhancedPrompt(message, context, classId, courseId);

      // Use Gemini 2.0 Flash model with concise output
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300, // Reduced for concise responses
        }
      });

      // Generate streaming content
      const result = await model.generateContentStream(enhancedPrompt);

      return result.stream;
    } catch (error) {
      console.error('Error generating streaming AI response:', error);
      throw new Error(`Failed to generate streaming AI response: ${(error as Error).message}`);
    }
  }

  /**
   * Create an enhanced prompt with context
   */
  private createEnhancedPrompt(
    message: string,
    context: TeacherContext,
    classId?: string,
    courseId?: string
  ): string {
    const teacherName = context.teacher?.name || 'the teacher';
    const subjects = context.teacher?.subjects?.map(s => s.name).join(', ') || 'various subjects';
    const currentClass = context.currentClass?.name || 'their class';
    const currentSubject = context.currentClass?.subject?.name || 'the subject';
    const currentPage = context.currentPage?.title || 'the platform';

    let prompt = `You are AIVY, a curriculum-aligned AI Teaching Assistant helping ${teacherName}.

CONTEXT:
- Teacher: ${teacherName}
- Current Class: ${currentClass} (${currentSubject})
- Grade Level: ${context.currentClass?.gradeLevel || 'Not specified'}
- Teaching Subjects: ${subjects}`;

    // Add curriculum alignment information
    if (context.currentClass?.subject?.learningOutcomes?.length) {
      prompt += '\n\nLEARNING OUTCOMES:';
      context.currentClass.subject.learningOutcomes.slice(0, 3).forEach((outcome, index) => {
        prompt += `\n${index + 1}. ${outcome.statement}`;
        if (outcome.bloomsLevel) {
          prompt += ` (${outcome.bloomsLevel})`;
        }
      });
    }

    if (context.currentClass?.subject?.topics?.length) {
      prompt += '\n\nRELEVANT TOPICS:';
      context.currentClass.subject.topics.slice(0, 3).forEach((topic, index) => {
        prompt += `\n${index + 1}. ${topic.title}`;
        if (topic.keywords?.length) {
          prompt += ` (${topic.keywords.slice(0, 2).join(', ')})`;
        }
      });
    }

    if (context.assessmentCriteria?.length) {
      prompt += '\n\nASSESSMENT CRITERIA:';
      context.assessmentCriteria.slice(0, 3).forEach((criteria, index) => {
        prompt += `\n${index + 1}. ${criteria.name}`;
        if (criteria.bloomsLevel) {
          prompt += ` (${criteria.bloomsLevel})`;
        }
      });
    }

    prompt += `

RESPONSE REQUIREMENTS:
- Keep responses under 200 words for clarity
- Use clear, professional language
- Provide 2-3 specific, actionable suggestions
- Reference relevant learning outcomes when applicable
- Align with grade level and curriculum standards
- Use bullet points for clarity
- Be direct and helpful

CURRICULUM ALIGNMENT:
- Explicitly connect advice to learning outcomes
- Use appropriate Bloom's taxonomy levels
- Include success criteria when relevant
- Consider grade-appropriate strategies

TEACHER'S QUESTION: ${message}

Provide a curriculum-aligned, practical response with specific actionable advice.`;

    return prompt;
  }

  /**
   * Classify the intent of a message
   */
  classifyIntent(message: string): string {
    const normalizedMessage = message.toLowerCase();
    
    // Define intent keywords
    const intentKeywords = {
      'lesson_planning': ['lesson plan', 'curriculum', 'unit plan', 'teaching plan', 'learning objectives', 'lesson', 'plan'],
      'assessment': ['assessment', 'test', 'quiz', 'exam', 'grade', 'rubric', 'evaluation', 'grading'],
      'student_management': ['student', 'progress', 'intervention', 'behavior', 'performance', 'differentiation', 'classroom management'],
      'teaching_strategy': ['strategy', 'method', 'approach', 'technique', 'pedagogy', 'instruction', 'teaching'],
      'administrative': ['schedule', 'deadline', 'paperwork', 'documentation', 'report', 'form', 'admin'],
      'content_creation': ['create', 'generate', 'make', 'develop', 'design', 'build'],
      'help': ['help', 'assist', 'support', 'guide', 'advice']
    };

    // Check for intent matches
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      for (const keyword of keywords) {
        if (normalizedMessage.includes(keyword)) {
          return intent;
        }
      }
    }

    return 'general';
  }

  /**
   * Generate content suggestions based on teacher context
   */
  generateContentSuggestions(context: TeacherContext): string[] {
    const suggestions: string[] = [];
    
    if (context.currentClass) {
      suggestions.push(`Create a lesson plan for ${context.currentClass.subject?.name || 'your subject'}`);
      suggestions.push(`Design an assessment for ${context.currentClass.name}`);
      suggestions.push(`Suggest activities for engaging students in ${context.currentClass.subject?.name || 'this subject'}`);
    }

    if (context.teacher?.subjects && context.teacher.subjects.length > 0) {
      const subject = context.teacher.subjects[0].name;
      suggestions.push(`Help with ${subject} teaching strategies`);
      suggestions.push(`Create differentiated activities for ${subject}`);
    }

    // Add general suggestions
    suggestions.push('Help me improve student engagement');
    suggestions.push('Suggest classroom management techniques');
    suggestions.push('Create a rubric for project-based assessment');
    suggestions.push('Help with parent communication strategies');

    return suggestions.slice(0, 6); // Return top 6 suggestions
  }

  /**
   * Get professional development recommendations
   */
  getProfessionalDevelopmentRecommendations(context: TeacherContext): string[] {
    const recommendations: string[] = [];
    
    // Based on subjects taught
    if (context.teacher?.subjects) {
      for (const subject of context.teacher.subjects) {
        recommendations.push(`Advanced ${subject.name} Teaching Strategies`);
        recommendations.push(`Technology Integration in ${subject.name}`);
      }
    }

    // General professional development
    recommendations.push('Differentiated Instruction Techniques');
    recommendations.push('Assessment and Feedback Best Practices');
    recommendations.push('Classroom Management Excellence');
    recommendations.push('Student Engagement Strategies');
    recommendations.push('Data-Driven Instruction');
    recommendations.push('Social-Emotional Learning Integration');

    return recommendations.slice(0, 8); // Return top 8 recommendations
  }
}
