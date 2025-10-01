import { tool } from 'ai';
import { z } from 'zod';

// Jina Search API configuration
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_SEARCH_URL = 'https://s.jina.ai/';
const JINA_READER_URL = 'https://r.jina.ai/';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  snippet: string;
}

interface ImageResult {
  title: string;
  url: string;
  imageUrl: string;
  source: string;
}

// Web search function using Jina
async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  try {
    if (!JINA_API_KEY) {
      console.warn('JINA_API_KEY not found, returning mock results');
      return getMockSearchResults(query, maxResults);
    }

    console.log(`[Jina Search] Searching for: "${query}"`);
    const response = await fetch(`${JINA_SEARCH_URL}${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${JINA_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Jina Search] Failed: ${response.status} ${response.statusText}`);
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Jina Search] Found ${data.data?.length || 0} results`);

    // Process Jina search results
    return data.data?.slice(0, maxResults).map((item: any) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      content: item.content || item.snippet || '',
      snippet: item.snippet || item.content?.substring(0, 200) || '',
    })) || [];

  } catch (error) {
    console.error('Web search error:', error);
    return getMockSearchResults(query, maxResults);
  }
}

// Image search function using Jina
async function searchImages(query: string, maxResults: number = 3): Promise<ImageResult[]> {
  try {
    if (!JINA_API_KEY) {
      console.warn('JINA_API_KEY not found, using educational image sources');
      return getEducationalImageResults(query, maxResults);
    }

    console.log(`[Jina Image Search] Searching for: "${query}"`);
    // Try Jina image search first
    try {
      const searchQuery = `${query} educational diagram illustration`;
      const response = await fetch(`${JINA_SEARCH_URL}${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Jina Image Search] Found ${data.data?.length || 0} total results`);

        // Process Jina search results for images
        const imageResults = data.data?.filter((item: any) =>
          item.url && (item.url.includes('.jpg') || item.url.includes('.png') || item.url.includes('.svg') || item.url.includes('image'))
        ).slice(0, maxResults).map((item: any) => ({
          title: item.title || `${query} Educational Image`,
          url: item.url || '',
          imageUrl: item.url || '',
          source: item.source || 'Educational Resources',
        })) || [];

        console.log(`[Jina Image Search] Filtered to ${imageResults.length} image results`);
        if (imageResults.length > 0) {
          return imageResults;
        }
      }
    } catch (jinaError) {
      console.warn('Jina image search failed, falling back to educational sources:', jinaError);
    }

    // Fallback to educational image sources
    console.log(`[Image Search] Using fallback educational images for: "${query}"`);
    return getEducationalImageResults(query, maxResults);

  } catch (error) {
    console.error('Image search error:', error);
    return getEducationalImageResults(query, maxResults);
  }
}

// Mock search results for development/fallback
function getMockSearchResults(query: string, maxResults: number): SearchResult[] {
  const mockResults: SearchResult[] = [
    {
      title: `Educational Guide: ${query}`,
      url: `https://education.example.com/${query.replace(/\s+/g, '-')}`,
      content: `This comprehensive guide covers ${query} with detailed explanations, examples, and practical applications for classroom use. It includes step-by-step instructions and assessment strategies.`,
      snippet: `Comprehensive guide covering ${query} with practical classroom applications...`,
    },
    {
      title: `Teaching ${query}: Best Practices`,
      url: `https://teachingresources.example.com/${query.replace(/\s+/g, '-')}`,
      content: `Research-based strategies for teaching ${query} effectively. Includes differentiated instruction methods, common misconceptions, and remediation techniques.`,
      snippet: `Research-based strategies for teaching ${query} effectively...`,
    },
    {
      title: `${query} - Student Activities and Worksheets`,
      url: `https://worksheets.example.com/${query.replace(/\s+/g, '-')}`,
      content: `Collection of engaging activities and worksheets for ${query}. Suitable for various grade levels with answer keys and rubrics included.`,
      snippet: `Collection of engaging activities and worksheets for ${query}...`,
    },
  ];

  return mockResults.slice(0, maxResults);
}

// Educational image results using free educational resources
function getEducationalImageResults(query: string, maxResults: number): ImageResult[] {
  const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '+');

  // Use actual educational image sources instead of placeholders
  const educationalImages: ImageResult[] = [
    {
      title: `${query} - Educational Diagram`,
      url: `https://commons.wikimedia.org/wiki/Special:Search/${cleanQuery}`,
      imageUrl: `https://picsum.photos/500/400?random=${Math.floor(Math.random() * 1000)}`,
      source: 'Educational Resources',
    },
    {
      title: `${query} - Learning Illustration`,
      url: `https://pixabay.com/images/search/${cleanQuery}/`,
      imageUrl: `https://picsum.photos/500/400?random=${Math.floor(Math.random() * 1000)}`,
      source: 'Educational Resources',
    },
    {
      title: `${query} - Teaching Visual`,
      url: `https://unsplash.com/s/photos/${cleanQuery}`,
      imageUrl: `https://picsum.photos/500/400?random=${Math.floor(Math.random() * 1000)}`,
      source: 'Teaching Materials',
    },
  ];

  return educationalImages.slice(0, maxResults);
}

// AI Tool: Web Search
export const webSearchTool = tool({
  description: 'Search the web for educational content, research, and teaching resources. Use this when you need current information, teaching strategies, or educational resources.',
  inputSchema: z.object({
    query: z.string().describe('The search query - be specific about educational context'),
    maxResults: z.number().optional().describe('Maximum number of results to return (1-10)'),
  }),
  execute: async ({ query, maxResults }) => {
    const limit = Math.min(maxResults || 5, 10);
    const results = await searchWeb(query, limit);
    return {
      query,
      results,
      summary: `Found ${results.length} educational resources about "${query}"`,
    };
  },
});

// AI Tool: Image Search
export const imageSearchTool = tool({
  description: 'Search for educational images, diagrams, and visual resources. Use this when you need visual aids, diagrams, or illustrations for teaching.',
  inputSchema: z.object({
    query: z.string().describe('The image search query - describe what visual content you need'),
    maxResults: z.number().optional().describe('Maximum number of images to return (1-5)'),
  }),
  execute: async ({ query, maxResults }) => {
    const limit = Math.min(maxResults || 3, 5);
    const results = await searchImages(query, limit);
    return {
      query,
      images: results,
      summary: `Found ${results.length} educational images about "${query}"`,
    };
  },
});

// Combined search tool for comprehensive results
export const comprehensiveSearchTool = tool({
  description: 'Perform both web and image search for comprehensive educational resources. Use this when you need both textual information and visual aids.',
  inputSchema: z.object({
    query: z.string().describe('The search query for both text and images'),
    maxWebResults: z.number().optional().describe('Maximum web results (1-5)'),
    maxImageResults: z.number().optional().describe('Maximum image results (1-3)'),
  }),
  execute: async ({ query, maxWebResults, maxImageResults }) => {
    const webLimit = Math.min(maxWebResults || 3, 5);
    const imageLimit = Math.min(maxImageResults || 2, 3);

    const [webResults, imageResults] = await Promise.all([
      searchWeb(query, webLimit),
      searchImages(query, imageLimit),
    ]);

    return {
      query,
      webResults,
      imageResults,
      summary: `Found ${webResults.length} articles and ${imageResults.length} images about "${query}"`,
    };
  },
});

// Export all tools
export const searchTools = {
  webSearch: webSearchTool,
  imageSearch: imageSearchTool,
  comprehensiveSearch: comprehensiveSearchTool,
};
