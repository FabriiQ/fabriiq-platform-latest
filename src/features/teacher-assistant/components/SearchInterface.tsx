'use client';

import { useState } from 'react';
import { useTeacherAssistant } from '../hooks/use-teacher-assistant';
import { Button } from '@/components/ui/core/button';
import { Input } from '@/components/ui/core/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/core/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { SearchFilters, SearchResult } from '../types';
import { Search, Loader2, SlidersHorizontal, ChevronDown, ArrowUpRight, FileText, Play, LayoutGrid, Star, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResultCardProps {
  result: SearchResult;
}

/**
 * Component to display a single search result with enhanced UI
 */
function SearchResultCard({ result }: SearchResultCardProps) {
  const isImage = result.contentType === 'image' || result.imageUrl;
  const isVideo = result.contentType === 'video';
  const relevanceScore = Math.round(result.relevanceScore * 100);

  const getContentIcon = () => {
    if (isImage) return <FileText className="h-4 w-4 text-blue-600" />;
    if (isVideo) return <Play className="h-4 w-4 text-red-600" />;
    return <FileText className="h-4 w-4 text-green-600" />;
  };

  const getRelevanceBadgeColor = () => {
    if (relevanceScore >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (relevanceScore >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="group border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 bg-card">
      {/* Image Preview */}
      {isImage && result.imageUrl && (
        <div className="mb-3 relative overflow-hidden rounded-lg">
          <img
            src={result.imageUrl}
            alt={result.title}
            className="w-full h-32 object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute top-2 right-2">
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Image
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 flex-1">
          {getContentIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {result.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {result.source}
              </span>
              <div className={cn("text-xs px-2 py-0.5 rounded-full border", getRelevanceBadgeColor())}>
                <Star className="h-3 w-3 inline mr-1" />
                {relevanceScore}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
        {result.snippet}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Educational Resource</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            <Search className="h-3 w-3 mr-1" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * Search interface component for the teacher assistant
 *
 * Features:
 * - Search input with filters
 * - Search results display
 * - Mobile-first responsive design
 */
export function SearchInterface() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    executeSearch
  } = useTeacherAssistant();

  const [filters, setFilters] = useState<SearchFilters>({
    contentType: 'all',
    subject: '',
    gradeLevel: '',
    modality: 'text',
    dateRange: undefined,
    limit: 5
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery, filters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Enhanced Search Header */}
      <div className="p-4 border-b bg-background/80 backdrop-blur-sm">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search for educational resources, images, and materials..."
              className="pl-10 pr-12 h-12 text-base border-2 focus:border-primary/50 rounded-xl"
            />
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              size="sm"
              className="absolute right-2 top-2 h-8 px-3 rounded-lg"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-xs font-medium">Go</span>
              )}
            </Button>
          </div>

          {/* Search Stats */}
          {searchResults.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>Found {searchResults.length} educational resources</span>
              {filters.modality !== 'text' && (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                  {filters.modality} search
                </span>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Modality Selector */}
        <div className="grid grid-cols-4 gap-2 p-1 bg-muted/50 rounded-xl">
          <Button
            variant={filters.modality === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilters({...filters, modality: 'text'})}
            className={cn(
              "flex flex-col items-center gap-1 h-16 rounded-lg transition-all",
              filters.modality === 'text'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-background/80"
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Text</span>
          </Button>
          <Button
            variant={filters.modality === 'image' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilters({...filters, modality: 'image'})}
            className={cn(
              "flex flex-col items-center gap-1 h-16 rounded-lg transition-all",
              filters.modality === 'image'
                ? "bg-blue-600 text-white shadow-sm"
                : "hover:bg-background/80"
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">Images</span>
          </Button>
          <Button
            variant={filters.modality === 'video' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilters({...filters, modality: 'video'})}
            className={cn(
              "flex flex-col items-center gap-1 h-16 rounded-lg transition-all",
              filters.modality === 'video'
                ? "bg-red-600 text-white shadow-sm"
                : "hover:bg-background/80"
            )}
          >
            <Play className="h-4 w-4" />
            <span className="text-xs font-medium">Videos</span>
          </Button>
          <Button
            variant={filters.modality === 'multimodal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilters({...filters, modality: 'multimodal'})}
            className={cn(
              "flex flex-col items-center gap-1 h-16 rounded-lg transition-all",
              filters.modality === 'multimodal'
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                : "hover:bg-background/80"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="text-xs font-medium">All</span>
          </Button>
        </div>

        <Collapsible className="mt-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Advanced Filters
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Select
                value={filters.contentType}
                onValueChange={(value) => setFilters({...filters, contentType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lesson_plan">Lesson Plans</SelectItem>
                  <SelectItem value="activity">Activities</SelectItem>
                  <SelectItem value="assessment">Assessments</SelectItem>
                  <SelectItem value="research">Research Papers</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.subject}
                onValueChange={(value) => setFilters({...filters, subject: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Enhanced Results Area */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="flex flex-col justify-center items-center h-full p-8">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-primary/20 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 animate-pulse">
              Searching educational resources...
            </p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="p-4">
            <div className="grid gap-4 animate-in fade-in-50 duration-500">
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className="animate-in slide-in-from-bottom-4 duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <SearchResultCard result={result} />
                </div>
              ))}
            </div>

            {/* Load More Hint */}
            {searchResults.length >= 5 && (
              <div className="text-center py-6 border-t mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {searchResults.length} results. Refine your search for more specific results.
                </p>
              </div>
            )}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              We couldn't find any educational resources matching "{searchQuery}".
              Try adjusting your search terms or filters.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-xs bg-muted px-3 py-1 rounded-full">Try: "math worksheets"</span>
              <span className="text-xs bg-muted px-3 py-1 rounded-full">Try: "science experiments"</span>
              <span className="text-xs bg-muted px-3 py-1 rounded-full">Try: "reading comprehension"</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-6">
              <Search className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">Discover Educational Resources</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Search for teaching materials, lesson plans, worksheets, images, and videos
              to enhance your classroom experience.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="text-left p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-green-600 mb-2" />
                <div className="text-sm font-medium">Text Resources</div>
                <div className="text-xs text-muted-foreground">Lesson plans, worksheets</div>
              </div>
              <div className="text-left p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 mb-2" />
                <div className="text-sm font-medium">Visual Content</div>
                <div className="text-xs text-muted-foreground">Educational images</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
