/**
 * Jina Search Service for Teacher Assistant
 * Provides educational content search with text and image support
 */

import axios, { AxiosInstance } from 'axios';
import { SearchResult, SearchFilters } from '../types';

export interface JinaSearchOptions {
  query: string;
  limit?: number;
  filter?: Record<string, any>;
  modality?: 'text' | 'image' | 'video' | 'multimodal';
}

export interface JinaSearchResult {
  id: string;
  score: number;
  content: any;
  metadata: {
    title?: string;
    snippet?: string;
    url?: string;
    source?: string;
    imageUrl?: string;
    contentType?: string;
    [key: string]: any;
  };
}

// Import SearchResult and SearchFilters from types instead of defining them here

export class JinaSearchService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.JINA_API_KEY || '';
    this.baseUrl = 'https://api.jina.ai/v1';

    if (!this.apiKey) {
      console.warn('JINA_API_KEY not found. Search functionality will be limited.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Search for educational content using Jina AI
   */
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.apiKey) {
      // Return fallback results if no API key
      return this.getFallbackResults(query, filters);
    }

    try {
      // Enhance query with educational context
      const enhancedQuery = this.enhanceQueryForEducation(query, filters);

      // Prepare search options
      const searchOptions: JinaSearchOptions = {
        query: enhancedQuery,
        limit: filters?.limit || 10,
        modality: filters?.modality || 'text',
        filter: this.buildEducationalFilter(filters),
      };

      // Execute search
      const response = await this.client.post('/search', searchOptions);

      if (response.status === 200 && response.data?.results) {
        return this.processResults(response.data.results, query);
      }

      // Return empty results if no data
      return [];

    } catch (error) {
      console.error('Jina search error:', error);
      
      // Return fallback results on error
      return this.getFallbackResults(query, filters);
    }
  }

  /**
   * Enhance query with educational context and safety filters
   */
  private enhanceQueryForEducation(query: string, filters?: SearchFilters): string {
    let enhancedQuery = query;

    // Add educational context
    if (!query.toLowerCase().includes('education') && !query.toLowerCase().includes('teaching')) {
      enhancedQuery = `educational ${query}`;
    }

    // Add subject context if provided
    if (filters?.subject) {
      enhancedQuery = `${filters.subject} ${enhancedQuery}`;
    }

    // Add grade level context if provided
    if (filters?.gradeLevel) {
      enhancedQuery = `${filters.gradeLevel} ${enhancedQuery}`;
    }

    // Add safety and appropriateness filters
    enhancedQuery += ' safe educational appropriate classroom';

    return enhancedQuery;
  }

  /**
   * Build educational content filter
   */
  private buildEducationalFilter(filters?: SearchFilters): Record<string, any> {
    const filter: Record<string, any> = {
      // Educational content filters
      safe: true,
      educational: true,
      appropriate: true,
    };

    // Content type filter
    if (filters?.contentType) {
      filter.contentType = filters.contentType;
    }

    // Modality-specific filters
    if (filters?.modality === 'image') {
      filter.safeSearch = 'strict';
      filter.imageType = 'educational';
      filter.license = 'creative_commons';
    }

    // Date range filter
    if (filters?.dateRange) {
      filter.dateRange = filters.dateRange;
    }

    return filter;
  }

  /**
   * Process and format search results
   */
  private processResults(results: JinaSearchResult[], originalQuery: string): SearchResult[] {
    return results
      .filter(result => this.isEducationallyAppropriate(result))
      .map(result => ({
        id: result.id || this.generateId(),
        title: result.metadata?.title || this.extractTitle(result.content) || `Resource for "${originalQuery}"`,
        snippet: result.metadata?.snippet || this.extractSnippet(result.content) || 'Educational resource content...',
        url: result.metadata?.url || '#',
        source: result.metadata?.source || 'Educational Database',
        relevanceScore: result.score || 0.5,
        imageUrl: result.metadata?.imageUrl,
        contentType: (result.metadata?.contentType as 'text' | 'image' | 'video' | 'multimodal') || 'text',
        metadata: result.metadata || {},
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Check if content is educationally appropriate
   */
  private isEducationallyAppropriate(result: JinaSearchResult): boolean {
    const content = JSON.stringify(result).toLowerCase();
    
    // Block inappropriate content
    const blockedTerms = ['adult', 'explicit', 'violence', 'inappropriate'];
    if (blockedTerms.some(term => content.includes(term))) {
      return false;
    }

    // Prefer educational content
    const educationalTerms = ['education', 'teaching', 'learning', 'academic', 'curriculum', 'lesson'];
    return educationalTerms.some(term => content.includes(term));
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: any): string | null {
    if (typeof content === 'string') {
      const lines = content.split('\n');
      return lines[0]?.substring(0, 100) || null;
    }
    return null;
  }

  /**
   * Extract snippet from content
   */
  private extractSnippet(content: any): string | null {
    if (typeof content === 'string') {
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }
    return null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `jina_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Fallback results when Jina API is not available
   */
  private getFallbackResults(query: string, filters?: SearchFilters): SearchResult[] {
    const modality = filters?.modality || 'text';

    const baseResults: SearchResult[] = [
      {
        id: `fallback_${Date.now()}_1`,
        title: `Educational Resources: ${query}`,
        snippet: 'Comprehensive educational materials and teaching strategies for effective learning outcomes.',
        url: 'https://example.com/educational-resources',
        source: 'Educational Database',
        relevanceScore: 0.95,
        contentType: 'text',
      },
      {
        id: `fallback_${Date.now()}_2`,
        title: `Teaching Guide: ${query}`,
        snippet: 'Research-based methodologies and best practices for classroom implementation.',
        url: 'https://example.com/teaching-guide',
        source: 'Teaching Excellence',
        relevanceScore: 0.87,
        contentType: 'text',
      },
    ];

    // Add image results for image searches
    if (modality === 'image' || modality === 'multimodal') {
      baseResults.push({
        id: `fallback_${Date.now()}_3`,
        title: `Visual Resources: ${query}`,
        snippet: 'Educational images and visual aids to enhance learning experience.',
        url: 'https://example.com/visual-resources',
        source: 'Visual Learning Hub',
        relevanceScore: 0.82,
        contentType: 'text',
        imageUrl: 'https://via.placeholder.com/300x200?text=Educational+Image',
      } as SearchResult);
    }

    return baseResults.slice(0, filters?.limit || 5);
  }
}
