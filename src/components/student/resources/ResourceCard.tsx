'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Eye,
  Clock,
  BookOpen
} from 'lucide-react';
import { PlayCircle } from '@/components/ui/icons-fix';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url?: string | null;
  tags: string[];
  settings?: any;
  createdAt: Date;
}

interface ResourceCardProps {
  resource: Resource;
  courseName?: string;
  showCourse?: boolean;
  className?: string;
}

/**
 * ResourceCard Component
 * 
 * Displays a single resource in a card format with:
 * - Resource type icon and badge
 * - Title and description
 * - Tags and metadata
 * - Action buttons
 * - Course information (optional)
 */
export function ResourceCard({ 
  resource, 
  courseName, 
  showCourse = false, 
  className 
}: ResourceCardProps) {
  // Resource type icons
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'FILE':
        return <FileText className="h-4 w-4" />;
      case 'VIDEO':
        return <PlayCircle className="h-4 w-4" />;
      case 'LINK':
        return <ArrowUpRight className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Resource type colors
  const getResourceColor = (type: string) => {
    switch (type) {
      case 'FILE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VIDEO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LINK':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get display name for resource type
  const getResourceTypeName = (type: string) => {
    switch (type) {
      case 'FILE':
        return 'Document';
      case 'VIDEO':
        return 'Video';
      case 'LINK':
        return 'Link';
      default:
        return type;
    }
  };

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getResourceIcon(resource.type)}
            <Badge 
              variant="outline" 
              className={cn("text-xs", getResourceColor(resource.type))}
            >
              {getResourceTypeName(resource.type)}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            {resource.settings?.isRequired && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {resource.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Course Info */}
          {showCourse && courseName && (
            <div className="flex items-center text-sm text-muted-foreground">
              <BookOpen className="h-3 w-3 mr-1" />
              {courseName}
            </div>
          )}

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 4).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{resource.tags.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Resource Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Added {new Date(resource.createdAt).toLocaleDateString()}
            </div>
            {resource.settings?.resourceType && (
              <Badge variant="outline" className="text-xs">
                {resource.settings.resourceType}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            {resource.url && (
              <>
                <Button variant="default" size="sm" className="flex-1" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
