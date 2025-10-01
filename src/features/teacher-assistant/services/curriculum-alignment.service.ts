/**
 * Curriculum Alignment Service for Teacher Assistant
 * Fetches learning outcomes, topics, and assessment criteria for curriculum-aligned content generation
 */

import { prisma } from '@/server/db';
import { LearningOutcome, SubjectTopic, AssessmentCriteria } from '../types';

export class CurriculumAlignmentService {
  /**
   * Get learning outcomes for a subject and optional topic
   */
  async getLearningOutcomes(subjectId: string, topicId?: string): Promise<LearningOutcome[]> {
    try {
      const outcomes = await prisma.learningOutcome.findMany({
        where: {
          subjectId,
          ...(topicId && { topicId }),
          // Only get active outcomes
          subject: {
            status: 'ACTIVE'
          }
        },
        select: {
          id: true,
          statement: true,
          description: true,
          bloomsLevel: true,
          actionVerbs: true,
          subjectId: true,
          topicId: true
        },
        orderBy: [
          { bloomsLevel: 'asc' },
          { statement: 'asc' }
        ]
      });

      return outcomes.map(outcome => ({
        id: outcome.id,
        statement: outcome.statement,
        description: outcome.description || undefined,
        bloomsLevel: outcome.bloomsLevel,
        actionVerbs: outcome.actionVerbs,
        subjectId: outcome.subjectId,
        topicId: outcome.topicId || undefined
      }));
    } catch (error) {
      console.error('Error fetching learning outcomes:', error);
      return [];
    }
  }

  /**
   * Get subject topics with their learning outcomes
   */
  async getSubjectTopics(subjectId: string): Promise<SubjectTopic[]> {
    try {
      const topics = await prisma.subjectTopic.findMany({
        where: {
          subjectId,
          status: 'ACTIVE'
        },
        include: {
          learningOutcomes: {
            select: {
              id: true,
              statement: true,
              description: true,
              bloomsLevel: true,
              actionVerbs: true,
              subjectId: true,
              topicId: true
            }
          }
        },
        orderBy: [
          { orderIndex: 'asc' },
          { title: 'asc' }
        ]
      });

      return topics.map(topic => ({
        id: topic.id,
        code: topic.code,
        title: topic.title,
        description: topic.description || undefined,
        learningOutcomesText: topic.learningOutcomesText || undefined,
        competencyLevel: topic.competencyLevel || undefined,
        keywords: topic.keywords,
        learningOutcomes: topic.learningOutcomes.map(outcome => ({
          id: outcome.id,
          statement: outcome.statement,
          description: outcome.description || undefined,
          bloomsLevel: outcome.bloomsLevel,
          actionVerbs: outcome.actionVerbs,
          subjectId: outcome.subjectId,
          topicId: outcome.topicId || undefined
        }))
      }));
    } catch (error) {
      console.error('Error fetching subject topics:', error);
      return [];
    }
  }

  /**
   * Get assessment criteria for a subject
   */
  async getAssessmentCriteria(subjectId: string): Promise<AssessmentCriteria[]> {
    try {
      const criteria = await prisma.rubricCriteria.findMany({
        where: {
          subjectId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          description: true,
          bloomsLevel: true,
          weight: true,
          maxScore: true
        },
        orderBy: [
          { bloomsLevel: 'asc' },
          { name: 'asc' }
        ]
      });

      return criteria.map(criterion => ({
        id: criterion.id,
        name: criterion.name,
        description: criterion.description || undefined,
        bloomsLevel: criterion.bloomsLevel || undefined,
        weight: criterion.weight,
        maxScore: criterion.maxScore
      }));
    } catch (error) {
      console.error('Error fetching assessment criteria:', error);
      return [];
    }
  }

  /**
   * Get comprehensive curriculum context for a class
   */
  async getCurriculumContext(classId: string, subjectId?: string) {
    try {
      // Get class information
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          courseCampus: {
            include: {
              course: {
                include: {
                  subjects: {
                    where: subjectId ? { id: subjectId } : undefined,
                    include: {
                      learningOutcomes: {
                        select: {
                          id: true,
                          statement: true,
                          description: true,
                          bloomsLevel: true,
                          actionVerbs: true,
                          subjectId: true,
                          topicId: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!classInfo || !classInfo.courseCampus?.course?.subjects?.length) {
        return null;
      }

      const subject = classInfo.courseCampus.course.subjects[0];
      
      // Get topics and assessment criteria
      const [topics, assessmentCriteria] = await Promise.all([
        this.getSubjectTopics(subject.id),
        this.getAssessmentCriteria(subject.id)
      ]);

      return {
        classId: classInfo.id,
        className: classInfo.name,
        gradeLevel: classInfo.gradeLevel || undefined,
        subject: {
          id: subject.id,
          name: subject.name,
          topics,
          learningOutcomes: subject.learningOutcomes.map(outcome => ({
            id: outcome.id,
            statement: outcome.statement,
            description: outcome.description || undefined,
            bloomsLevel: outcome.bloomsLevel,
            actionVerbs: outcome.actionVerbs,
            subjectId: outcome.subjectId,
            topicId: outcome.topicId || undefined
          }))
        },
        assessmentCriteria
      };
    } catch (error) {
      console.error('Error fetching curriculum context:', error);
      return null;
    }
  }

  /**
   * Generate curriculum-aligned prompt enhancement
   */
  generateCurriculumPrompt(
    originalMessage: string,
    learningOutcomes: LearningOutcome[],
    topics: SubjectTopic[],
    assessmentCriteria: AssessmentCriteria[],
    gradeLevel?: string
  ): string {
    let enhancement = '';

    // Add curriculum context
    if (gradeLevel) {
      enhancement += `\nGRADE LEVEL: ${gradeLevel}`;
    }

    // Add learning outcomes
    if (learningOutcomes.length > 0) {
      enhancement += '\n\nRELEVANT LEARNING OUTCOMES:';
      learningOutcomes.forEach((outcome, index) => {
        enhancement += `\n${index + 1}. ${outcome.statement}`;
        if (outcome.bloomsLevel) {
          enhancement += ` (${outcome.bloomsLevel})`;
        }
        if (outcome.actionVerbs.length > 0) {
          enhancement += ` - Action verbs: ${outcome.actionVerbs.join(', ')}`;
        }
      });
    }

    // Add topic context
    if (topics.length > 0) {
      enhancement += '\n\nRELEVANT TOPICS:';
      topics.forEach((topic, index) => {
        enhancement += `\n${index + 1}. ${topic.title}`;
        if (topic.description) {
          enhancement += ` - ${topic.description}`;
        }
        if (topic.keywords.length > 0) {
          enhancement += ` (Keywords: ${topic.keywords.join(', ')})`;
        }
      });
    }

    // Add assessment criteria
    if (assessmentCriteria.length > 0) {
      enhancement += '\n\nASSESSMENT CRITERIA:';
      assessmentCriteria.forEach((criteria, index) => {
        enhancement += `\n${index + 1}. ${criteria.name}`;
        if (criteria.description) {
          enhancement += ` - ${criteria.description}`;
        }
        if (criteria.bloomsLevel) {
          enhancement += ` (${criteria.bloomsLevel})`;
        }
        enhancement += ` [Weight: ${criteria.weight}, Max Score: ${criteria.maxScore}]`;
      });
    }

    // Add alignment instructions
    if (enhancement) {
      enhancement += '\n\nCURRICULUM ALIGNMENT REQUIREMENTS:';
      enhancement += '\n- Explicitly reference relevant learning outcomes in your response';
      enhancement += '\n- Align content with the specified grade level and competency expectations';
      enhancement += '\n- Include success criteria that map to the assessment criteria';
      enhancement += '\n- Use appropriate action verbs from the learning outcomes';
      enhancement += '\n- Ensure content supports the Bloom\'s taxonomy levels indicated';
    }

    return enhancement;
  }

  /**
   * Validate if content aligns with learning outcomes
   */
  validateCurriculumAlignment(
    content: string,
    learningOutcomes: LearningOutcome[]
  ): {
    alignedOutcomes: string[];
    missingOutcomes: string[];
    suggestions: string[];
  } {
    const contentLower = content.toLowerCase();
    const alignedOutcomes: string[] = [];
    const missingOutcomes: string[] = [];
    const suggestions: string[] = [];

    learningOutcomes.forEach(outcome => {
      const outcomeWords = outcome.statement.toLowerCase().split(' ');
      const actionVerbs = outcome.actionVerbs.map(verb => verb.toLowerCase());
      
      // Check if outcome is addressed
      const hasOutcomeWords = outcomeWords.some(word => 
        word.length > 3 && contentLower.includes(word)
      );
      const hasActionVerbs = actionVerbs.some(verb => 
        contentLower.includes(verb)
      );

      if (hasOutcomeWords || hasActionVerbs) {
        alignedOutcomes.push(outcome.statement);
      } else {
        missingOutcomes.push(outcome.statement);
        suggestions.push(
          `Consider adding content that addresses: "${outcome.statement}" using verbs like: ${outcome.actionVerbs.join(', ')}`
        );
      }
    });

    return {
      alignedOutcomes,
      missingOutcomes,
      suggestions
    };
  }
}
