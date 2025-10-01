'use client';

import { useState } from 'react';
import { Globe, Search, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';

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

interface SearchResultsProps {
  webResults?: SearchResult[];
  imageResults?: ImageResult[];
  query?: string;
  className?: string;
}

export function SearchResults({ webResults = [], imageResults = [], query, className }: SearchResultsProps) {
  const [showAllWeb, setShowAllWeb] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  const displayedWebResults = showAllWeb ? webResults : webResults.slice(0, 3);
  const displayedImageResults = showAllImages ? imageResults : imageResults.slice(0, 4);

  if (webResults.length === 0 && imageResults.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {query && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>Search results for: "{query}"</span>
        </div>
      )}

      {/* Web Results */}
      {webResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web Sources ({webResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayedWebResults.map((result, index) => (
              <div key={index} className="border-l-2 border-primary/20 pl-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm text-primary hover:underline line-clamp-2"
                  >
                    {result.title}
                  </a>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {index + 1}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {result.snippet || result.content}
                </p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground truncate block"
                >
                  {result.url}
                </a>
              </div>
            ))}
            
            {webResults.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllWeb(!showAllWeb)}
                className="w-full text-xs"
              >
                {showAllWeb ? 'Show Less' : `Show ${webResults.length - 3} More Results`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Results */}
      {imageResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Educational Images ({imageResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {displayedImageResults.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://via.placeholder.com/300x200/1E40AF/FFFFFF?text=${encodeURIComponent('Educational Image')}`;
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium line-clamp-2">{image.title}</p>
                    <p className="text-xs text-muted-foreground">{image.source}</p>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block truncate"
                    >
                      View Source
                    </a>
                  </div>
                </div>
              ))}
            </div>
            
            {imageResults.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllImages(!showAllImages)}
                className="w-full text-xs mt-3"
              >
                {showAllImages ? 'Show Less' : `Show ${imageResults.length - 4} More Images`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
