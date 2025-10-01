"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/atoms/button";
import { Badge } from "@/components/ui/atoms/badge";
import {
  Download,
  ArrowUpRight,
  X,
  FileText,
  Archive,
  Volume2,
  Play,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";

export interface ResourceFile {
  id: string;
  title: string;
  url: string;
  type: string;
  mimeType?: string;
  size?: number;
  description?: string;
  settings?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
}

interface ResourceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceFile | null;
  showDownload?: boolean;
  showExternalLink?: boolean;
}

export function ResourceViewer({
  isOpen,
  onClose,
  resource,
  showDownload = true,
  showExternalLink = true,
}: ResourceViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // Use tRPC to get file content - only when dialog is open and resource is a file
  const { data: fileData, isLoading: isLoadingFile, error: fileError } = api.resource.getFileContent.useQuery(
    { resourceId: resource?.id || '', download: false },
    {
      enabled: isOpen && !!resource?.id && resource?.type === 'FILE',
      retry: false,
    }
  );

  // Always call useCallback hooks in the same order
  const handleDownload = useCallback(async () => {
    if (!resource) return;

    if (resource.type === 'FILE') {
      try {
        if (fileContent) {
          const link = document.createElement('a');
          link.href = fileContent;
          link.download = resource.settings?.fileName || resource.title;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Download failed:', error);
        setError('Failed to download file');
      }
    } else {
      window.open(resource.url, '_blank');
    }
  }, [resource, fileContent]);

  const handleExternalLink = useCallback(() => {
    if (!resource) return;

    if (resource.type === 'FILE' && fileContent) {
      window.open(fileContent, '_blank', 'noopener,noreferrer');
    } else {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  }, [resource, fileContent]);

  const getSecureUrl = useCallback((): string => {
    if (!resource) return '';
    if (resource.type === 'FILE' && fileContent) {
      return fileContent;
    }
    return resource.url;
  }, [resource, fileContent]);

  // Memoize file processing to prevent re-processing
  const processedFileContent = useMemo(() => {
    if (!fileData || fileData.type !== 'file' || !fileData.content) return null;

    try {
      const binaryString = atob(fileData.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: fileData.mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to process file content:', error);
      return null;
    }
  }, [fileData]);

  // Update states based on loading/error status
  useEffect(() => {
    if (!isOpen || !resource) {
      setLoading(false);
      setError(null);
      setFileContent(null);
      return;
    }

    if (resource.type === 'FILE') {
      setLoading(isLoadingFile);
      if (fileError) {
        setError(fileError.message || 'Failed to load file');
        setLoading(false);
      } else if (processedFileContent) {
        setFileContent(processedFileContent);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [isOpen, resource, isLoadingFile, fileError, processedFileContent]);

  // Cleanup blob URLs when component unmounts or file content changes
  useEffect(() => {
    return () => {
      if (fileContent?.startsWith('blob:')) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [fileContent]);

  // Do not render anything when closed to avoid presence thrash
  // Don't render if not open or no resource
  if (!isOpen || !resource) return null;

  const mimeType = resource.settings?.mimeType || resource.mimeType || '';
  const fileSize = resource.settings?.fileSize || resource.size || 0;
  const fileName = resource.settings?.fileName || resource.title;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileText className="h-5 w-5" />;
    if (mimeType.startsWith('video/')) return <Play className="h-5 w-5" />;
    if (mimeType.startsWith('audio/')) return <Volume2 className="h-5 w-5" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-green-100 text-green-800 border-green-200';
    if (mimeType.startsWith('video/')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (mimeType.startsWith('audio/')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (mimeType === 'application/pdf') return 'bg-red-100 text-red-800 border-red-200';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'bg-green-100 text-green-800 border-green-200';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };





  const renderFileContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Loading file...</p>
          <Progress value={75} className="w-48" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4">
          <div className="text-red-500">
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          </div>
          <p className="text-red-600 font-medium">Failed to load file</p>
          <p className="text-sm text-gray-500">{error}</p>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleExternalLink}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    // Image files
    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-4 overflow-auto">
          <img
            src={getSecureUrl()}
            alt={resource.title}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // PDF files
    if (mimeType === 'application/pdf') {
      return (
        <div className="h-[80vh]">
          <iframe
            src={`${getSecureUrl()}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
            className="w-full h-full border-0 rounded-lg"
            title={resource.title}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Audio files
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center p-12 space-y-6">
          <div className="text-blue-500">
            <Volume2 className="h-24 w-24 mx-auto" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
            <p className="text-sm text-gray-500 mb-4">Audio File</p>
          </div>
          <div className="w-full max-w-md">
            <audio
              controls
              className="w-full"
              onError={() => setError('Failed to load audio')}
            >
              <source src={getSecureUrl()} type={mimeType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    }

    // Video files
    if (mimeType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <video
            controls
            className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            onError={() => setError('Failed to load video')}
          >
            <source src={getSecureUrl()} type={mimeType} />
            Your browser does not support the video element.
          </video>
        </div>
      );
    }

    // Text files
    if (mimeType.startsWith('text/') || mimeType.includes('document') || mimeType.includes('word')) {
      return (
        <div className="h-[70vh]">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(getSecureUrl())}&embedded=true`}
            className="w-full h-full border-0 rounded-lg"
            title={resource.title}
            onError={() => setError('Failed to load document')}
          />
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-gray-400">
          {getFileIcon(mimeType)}
        </div>
        <h3 className="text-lg font-semibold">{resource.title}</h3>
        <p className="text-sm text-gray-500 text-center">
          This file type cannot be previewed in the browser.
          <br />
          You can download it to view on your device.
        </p>
        <div className="flex space-x-2">
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
          {showExternalLink && (
            <Button variant="outline" onClick={handleExternalLink}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Open in new tab
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getFileIcon(mimeType)}
                <DialogTitle className="text-lg font-semibold truncate max-w-md">
                  {resource?.title}
                </DialogTitle>
              </div>
              <Badge variant="outline" className={cn("text-xs", getFileTypeColor(mimeType))}>
                {mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
              </Badge>
              {fileSize > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(fileSize)}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {showDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {showExternalLink && (
                <Button variant="outline" size="sm" onClick={handleExternalLink}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Open External
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {resource?.description && (
            <p className="text-sm text-gray-600 mt-2">{resource.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderFileContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
