"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/atoms/button";
import { Badge } from "@/components/ui/atoms/badge";
import {
  Download,
  ArrowUpRight,
  FileText,
  Archive,
  Volume2,
  Play,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResourceViewer } from "./ResourceViewer";

export interface ResourceFile {
  id: string;
  title: string;
  description?: string;
  type: string;
  url: string;
  mimeType?: string;
  size?: number;
  createdAt?: Date;
  owner?: {
    name?: string;
  };
  settings?: {
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
  };
}

interface ResourceTileViewProps {
  resources: ResourceFile[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  showOwner?: boolean;
  onResourceClick?: (resource: ResourceFile) => void;
}

export function ResourceTileView({
  resources,
  isLoading = false,
  emptyMessage = "No resources found",
  emptyDescription = "Resources will appear here when available",
  showOwner = false,
  onResourceClick,
}: ResourceTileViewProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceFile | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return <FileText className="h-5 w-5 text-green-600" />;
    if (mimeType?.startsWith('video/')) return <Play className="h-5 w-5 text-purple-600" />;
    if (mimeType?.startsWith('audio/')) return <Volume2 className="h-5 w-5 text-blue-600" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />;
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return <Archive className="h-5 w-5 text-orange-600" />;
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return 'bg-green-100 text-green-800 border-green-200';
    if (mimeType?.startsWith('video/')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (mimeType?.startsWith('audio/')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (mimeType === 'application/pdf') return 'bg-red-100 text-red-800 border-red-200';
    if (mimeType?.includes('document') || mimeType?.includes('word')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'bg-green-100 text-green-800 border-green-200';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleResourceClick = (resource: ResourceFile) => {
    if (onResourceClick) {
      onResourceClick(resource);
    } else {
      setSelectedResource(resource);
      setShowViewer(true);
    }
  };

  const handleDownload = (resource: ResourceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (resource.type === 'FILE' && resource.url) {
      const link = document.createElement('a');
      link.href = resource.url;
      link.download = resource.settings?.fileName || resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(resource.url, '_blank');
    }
  };

  const handleExternalLink = (resource: ResourceFile, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="p-4 space-y-3">
              <div className="aspect-video bg-gray-200 rounded-md"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
            <p className="text-muted-foreground">{emptyDescription}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map((resource) => {
          const mimeType = resource.settings?.mimeType || resource.mimeType || '';
          const fileSize = resource.settings?.fileSize || resource.size || 0;
          
          return (
            <Card 
              key={resource.id} 
              className="group hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleResourceClick(resource)}
            >
              <CardContent className="p-4 space-y-3">
                {/* File preview thumbnail */}
                <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-gray-300 transition-colors overflow-hidden">
                  {/* Image Preview */}
                  {mimeType.startsWith('image/') && resource.url ? (
                    <img
                      src={resource.url}
                      alt={resource.title}
                      className="w-full h-full object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : /* PDF Preview */
                  mimeType === 'application/pdf' && resource.url ? (
                    <div className="relative w-full h-full">
                      <iframe
                        src={`${resource.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`}
                        className="w-full h-full rounded-md pointer-events-none"
                        title={`${resource.title} preview`}
                        onError={(e) => {
                          const target = e.target as HTMLIFrameElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="absolute inset-0 bg-transparent pointer-events-none" />
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        PDF
                      </div>
                    </div>
                  ) : /* URL/Link Preview */
                  resource.type === 'LINK' && resource.url ? (
                    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
                      <div className="text-blue-600 mb-2">
                        <ArrowUpRight className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-blue-800 mb-1">External Link</div>
                        <div className="text-xs text-blue-600 truncate max-w-full">
                          {new URL(resource.url).hostname}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        LINK
                      </div>
                    </div>
                  ) : null}

                  {/* Fallback Icon Display */}
                  <div className={cn(
                    "flex flex-col items-center justify-center text-gray-400",
                    (mimeType.startsWith('image/') && resource.url) ||
                    (mimeType === 'application/pdf' && resource.url) ||
                    (resource.type === 'LINK' && resource.url) ? "hidden" : ""
                  )}>
                    {getFileIcon(mimeType)}
                    <span className="text-xs mt-1 font-medium">
                      {mimeType.split('/')[1]?.toUpperCase() || resource.type}
                    </span>
                  </div>
                </div>

                {/* File info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                      {resource.title}
                    </h3>
                    <Badge variant="outline" className={cn("text-xs shrink-0", getFileTypeColor(mimeType))}>
                      {mimeType.split('/')[1]?.toUpperCase() || resource.type}
                    </Badge>
                  </div>
                  
                  {resource.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      {fileSize > 0 && (
                        <span>{formatFileSize(fileSize)}</span>
                      )}
                      {resource.createdAt && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    {showOwner && resource.owner?.name && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-20">{resource.owner.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResourceClick(resource);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => handleDownload(resource, e)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => handleExternalLink(resource, e)}
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resource Viewer Dialog */}
      <ResourceViewer
        isOpen={showViewer}
        onClose={() => setShowViewer(false)}
        resource={selectedResource}
        showDownload={true}
        showExternalLink={true}
      />
    </>
  );
}
