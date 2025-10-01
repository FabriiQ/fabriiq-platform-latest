import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserType } from '@prisma/client';
import { geminiModel, educationalSystemPrompt, searchTools } from '../lib/ai/providers';
import { generateUUID } from '../lib/utils';

// Helper function to determine if a message is requesting content generation
function isContentGenerationRequest(message: string): boolean {
  const contentKeywords = [
    'create', 'generate', 'make', 'build', 'design', 'develop',
    'worksheet', 'lesson plan', 'assessment', 'quiz', 'test',
    'handout', 'activity', 'exercise', 'assignment', 'rubric',
    'curriculum', 'syllabus', 'outline', 'template', 'format'
  ];

  // Exclude story/narrative requests from content generation
  const narrativeKeywords = [
    'story', 'tale', 'narrative', 'fiction', 'novel', 'chapter',
    'character', 'plot', 'adventure', 'fairy tale', 'fable'
  ];

  const lowerMessage = message.toLowerCase();

  // If it's a narrative request, don't treat as content generation
  if (narrativeKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return false;
  }

  return contentKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Helper function to extract document title from message
function extractDocumentTitle(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('worksheet')) return 'Educational Worksheet';
  if (lowerMessage.includes('lesson plan')) return 'Lesson Plan';
  if (lowerMessage.includes('assessment')) return 'Assessment';
  if (lowerMessage.includes('quiz')) return 'Quiz';
  if (lowerMessage.includes('test')) return 'Test';
  if (lowerMessage.includes('activity')) return 'Learning Activity';
  if (lowerMessage.includes('exercise')) return 'Exercise';
  if (lowerMessage.includes('assignment')) return 'Assignment';
  if (lowerMessage.includes('handout')) return 'Handout';
  if (lowerMessage.includes('rubric')) return 'Rubric';

  return 'Educational Document';
}

// Helper function to replace image placeholders with actual search results
async function replaceImagePlaceholders(content: string, images: any[]): Promise<string> {
  console.log('[Image Replacement] Processing content with', images?.length || 0, 'images');

  // Find all image placeholders with search: prefix
  const searchPlaceholderRegex = /!\[([^\]]*)\]\(search:([^)]+)\)/g;
  let processedContent = content;
  let imageIndex = 0;

  // Also handle regular image placeholders that might need replacement
  const regularPlaceholderRegex = /!\[([^\]]*)\]\(https:\/\/via\.placeholder\.com[^)]*\)/g;

  // Replace search: placeholders first
  processedContent = processedContent.replace(searchPlaceholderRegex, (_, altText, searchQuery) => {
    console.log('[Image Replacement] Found search placeholder:', searchQuery);
    if (images && imageIndex < images.length) {
      const image = images[imageIndex];
      imageIndex++;
      console.log('[Image Replacement] Replacing with:', image.imageUrl || image.url);
      return `![${altText || image.title || 'Educational Image'}](${image.imageUrl || image.url})`;
    }
    // If no search results available, use a fallback image
    const fallbackUrl = `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`;
    console.log('[Image Replacement] Using fallback:', fallbackUrl);
    return `![${altText || 'Educational Image'}](${fallbackUrl})`;
  });

  // Replace any remaining placeholder.com images
  processedContent = processedContent.replace(regularPlaceholderRegex, (_, altText) => {
    const fallbackUrl = `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`;
    console.log('[Image Replacement] Replacing placeholder.com with:', fallbackUrl);
    return `![${altText || 'Educational Image'}](${fallbackUrl})`;
  });

  console.log('[Image Replacement] Completed processing');
  return processedContent;
}

export async function handleStreamingChat(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);

    // Ensure user is authenticated and is a teacher
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Note: The session user type structure may vary, so we'll check both possible formats
    const userType = (session.user as any)?.userType || (session.user as any)?.type;
    if (userType !== UserType.CAMPUS_TEACHER && userType !== UserType.TEACHER) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { message, teacherContext, searchEnabled } = body;

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // Determine if this is content generation
    const isContentGeneration = isContentGenerationRequest(message);

    // Build enhanced system prompt with teacher context
    const contextualPrompt = isContentGeneration
      ? `${educationalSystemPrompt}

You are creating educational content. Focus on generating ONLY the document content without any conversational elements.

**CRITICAL INSTRUCTIONS:**
- Generate ONLY the educational document content
- DO NOT include conversational responses like "Here is a worksheet..." or "I hope this helps..."
- DO NOT address the teacher by name in the document
- Start directly with the document title and content
- The document should be standalone and professional

**CONTENT CREATION GUIDELINES:**
- Create comprehensive, well-formatted educational content
- Use proper markdown formatting with clear headings (# ## ###)
- Include structured sections with clear organization
- Make content age-appropriate and engaging for the target grade level
- Ensure content is curriculum-aligned and ready for classroom use
- Use bullet points, numbered lists, and tables where appropriate
- Include clear instructions and answer keys for assessments
- Format content professionally with consistent styling
- Create complete, usable educational materials

**IMAGE INTEGRATION REQUIREMENTS:**
- ALWAYS include relevant educational images in your content
- Use the imageSearch tool to find appropriate images for the topic
- Place images strategically throughout the document to enhance learning
- Include at least 2-3 images per document section where relevant
- Use descriptive alt text for all images

**FORMATTING REQUIREMENTS:**
- Start with a clear title using # heading
- Use ## for major sections
- Use ### for subsections
- Include proper spacing between sections
- Use markdown tables for structured data
- Use bullet points for lists
- Bold important terms with **text**
- Italicize instructions with *text*

Teacher Context:
- Name: ${teacherContext?.teacher?.name || 'Teacher'}
- Subjects: ${teacherContext?.teacher?.subjects?.join(', ') || 'Not specified'}
- Current Class: ${teacherContext?.currentClass?.name || 'Not specified'}
- Current Page: ${teacherContext?.currentPage || 'Teacher Assistant'}

Generate ONLY the educational document content without any conversational wrapper.`
      : `${educationalSystemPrompt}

Teacher Context:
- Name: ${teacherContext?.teacher?.name || 'Teacher'}
- Subjects: ${teacherContext?.teacher?.subjects?.join(', ') || 'Not specified'}
- Current Class: ${teacherContext?.currentClass?.name || 'Not specified'}
- Current Page: ${teacherContext?.currentPage || 'Teacher Assistant'}

Please provide helpful, educational responses tailored to this teacher's context.`;

    // Always enable search for content generation to get relevant images
    const needsSearch = searchEnabled && (
      isContentGeneration || // Always search for content generation
      message.toLowerCase().includes('search') ||
      message.toLowerCase().includes('find') ||
      message.toLowerCase().includes('image') ||
      message.toLowerCase().includes('picture') ||
      message.toLowerCase().includes('photo') ||
      message.toLowerCase().includes('visual') ||
      message.toLowerCase().includes('diagram') ||
      message.toLowerCase().includes('illustration') ||
      message.toLowerCase().includes('current') ||
      message.toLowerCase().includes('recent') ||
      message.toLowerCase().includes('latest') ||
      message.toLowerCase().includes('story') ||
      message.toLowerCase().includes('tale') ||
      message.toLowerCase().includes('narrative')
    );

    console.log('[Streaming] Content generation:', isContentGeneration, 'Search enabled:', needsSearch);

    // Create streaming response using the correct AI SDK method
    const result = streamText({
      model: geminiModel,
      system: contextualPrompt,
      prompt: isContentGeneration ? `${message}\n\nIMPORTANT: Use the imageSearch tool to find relevant educational images for this content.` : message,
      temperature: 0.7,
      maxOutputTokens: isContentGeneration ? 2000 : 800, // Higher token limit for content generation
      tools: needsSearch ? searchTools : undefined,
    });

    // Create a custom streaming response that matches the client's expected format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          let searchResults: any = null;

          if (isContentGeneration) {
            // For content generation, stream to artifact
            console.log('[Content Generation] Starting streaming...');

            try {
              for await (const chunk of result.textStream) {
                fullContent += chunk;
                const data = JSON.stringify({
                  type: 'data-textDelta',
                  data: chunk
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              console.log('[Content Generation] Streaming completed, content length:', fullContent.length);
            } catch (streamError) {
              console.error('[Content Generation] Streaming error:', streamError);
              // Continue with whatever content we have
            }

            // Process tool results for search data and replace image placeholders
            console.log('[Content Generation] Processing tool results...');
            try {
              const toolResults = await result.toolResults;
              console.log('[Content Generation] Tool results available:', toolResults?.length || 0);

              for (const toolResult of toolResults) {
                if (toolResult.toolName === 'webSearch' || toolResult.toolName === 'imageSearch' || toolResult.toolName === 'comprehensiveSearch') {
                  searchResults = (toolResult as any).result;
                  console.log('[Content Generation] Found search results:', !!searchResults);

                  // If we have image results, replace search placeholders in content
                  if (searchResults?.imageResults || searchResults?.images) {
                    const images = searchResults.imageResults || searchResults.images || [];
                    console.log('[Content Generation] Replacing image placeholders with', images.length, 'images');
                    fullContent = await replaceImagePlaceholders(fullContent, images);
                  }
                }
              }
            } catch (error) {
              console.error('[Content Generation] Tool results error:', error);
              // Continue without search results
            }

            // Ensure we have content to send
            if (!fullContent || fullContent.trim().length === 0) {
              console.error('[Content Generation] No content generated, using fallback');
              fullContent = `# ${extractDocumentTitle(message)}\n\nContent generation encountered an issue. Please try again.`;
            }

            // Send artifact completion
            const documentTitle = extractDocumentTitle(message);
            console.log('[Content Generation] Sending artifact completion with content length:', fullContent.length);

            const artifactData = JSON.stringify({
              type: 'data-artifactComplete',
              data: {
                title: documentTitle,
                content: fullContent,
                kind: 'text' as const,
                documentId: generateUUID(),
                shouldCreateArtifact: true,
                conversationalResponse: `I've created a comprehensive "${documentTitle}" for you. The document is ready in the editor panel with structured sections, age-appropriate content, and complete formatting for classroom use. You can edit, customize, or download it as needed.`,
                searchResults,
              },
            });
            controller.enqueue(encoder.encode(`data: ${artifactData}\n\n`));

            // Send final completion signal
            controller.enqueue(encoder.encode(`data: {"type":"stream-complete"}\n\n`));
            console.log('[Content Generation] Streaming completed successfully');
          } else {
            // For regular conversation, stream to chat
            console.log('[Regular Chat] Starting streaming...');

            try {
              for await (const chunk of result.textStream) {
                fullContent += chunk;
                const data = JSON.stringify({
                  type: 'text-delta',
                  textDelta: chunk
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
              console.log('[Regular Chat] Streaming completed, content length:', fullContent.length);
            } catch (streamError) {
              console.error('[Regular Chat] Streaming error:', streamError);
              // Continue with whatever content we have
            }

            // Process tool results for search data
            console.log('[Regular Chat] Processing tool results...');
            try {
              const toolResults = await result.toolResults;
              for (const toolResult of toolResults) {
                if (toolResult.toolName === 'webSearch' || toolResult.toolName === 'imageSearch' || toolResult.toolName === 'comprehensiveSearch') {
                  searchResults = (toolResult as any).result;
                }
              }
            } catch (error) {
              console.error('[Regular Chat] Tool results error:', error);
            }

            // Send completion signal
            const completionData = JSON.stringify({
              type: 'data-textComplete',
              data: {
                searchResults: searchResults || []
              }
            });
            controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));

            // Send final completion signal
            controller.enqueue(encoder.encode(`data: {"type":"stream-complete"}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);

          // Try to send a completion signal even if there was an error
          try {
            if (isContentGeneration) {
              // Send a minimal artifact if content generation failed
              const fallbackTitle = extractDocumentTitle(message);
              const fallbackContent = `# ${fallbackTitle}\n\nContent generation encountered an issue. Please try again.`;

              const artifactData = JSON.stringify({
                type: 'data-artifactComplete',
                data: {
                  title: fallbackTitle,
                  content: fallbackContent,
                  kind: 'text' as const,
                  documentId: generateUUID(),
                  shouldCreateArtifact: true,
                  conversationalResponse: `I encountered an issue while generating the "${fallbackTitle}". Please try again.`,
                  searchResults: null,
                },
              });
              controller.enqueue(encoder.encode(`data: ${artifactData}\n\n`));
            }

            // Always send completion signal
            controller.enqueue(encoder.encode(`data: {"type":"stream-complete"}\n\n`));
            controller.close();
          } catch (finalError) {
            console.error('Error sending fallback completion:', finalError);
            controller.error(error);
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Teacher Assistant V2 streaming error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
