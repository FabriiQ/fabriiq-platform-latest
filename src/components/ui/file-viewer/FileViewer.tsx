'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  ExternalLink, 
  X, 
  FileText, 
  Image as ImageIcon,
  Volume2,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    url: string;
    contentType: string;
    size: number;
  };
}

export function FileViewer({ isOpen, onClose, file }: FileViewerProps) {
  const [imageError, setImageError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    window.open(file.url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.contentType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (file.contentType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (file.contentType.startsWith('audio/')) {
      return <Volume2 className="h-5 w-5 text-green-500" />;
    } else if (file.contentType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  const renderFileContent = () => {
    // Image files
    if (file.contentType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-4">
          {!imageError ? (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center p-8">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Failed to load image</p>
              <Button variant="outline" onClick={handleOpenExternal} className="mt-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in new tab
              </Button>
            </div>
          )}
        </div>
      );
    }

    // PDF files
    if (file.contentType === 'application/pdf') {
      return (
        <div className="h-[70vh] w-full">
          <iframe
            src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0 rounded-lg"
            title={file.name}
          />
        </div>
      );
    }

    // Audio files
    if (file.contentType.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Volume2 className="h-16 w-16 mb-4 text-green-500" />
          <audio controls className="w-full max-w-md">
            <source src={file.url} type={file.contentType} />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    // Video files
    if (file.contentType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <video
            controls
            className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
          >
            <source src={file.url} type={file.contentType} />
            Your browser does not support the video element.
          </video>
        </div>
      );
    }

    // Text files
    if (file.contentType.startsWith('text/')) {
      return (
        <div className="p-4">
          <iframe
            src={file.url}
            className="w-full h-[60vh] border rounded-lg"
            title={file.name}
          />
        </div>
      );
    }

    // Unsupported file types
    return (
      <div className="text-center p-8">
        {getFileIcon()}
        <h3 className="text-lg font-medium mt-4 mb-2">Preview not available</h3>
        <p className="text-muted-foreground mb-4">
          This file type cannot be previewed in the browser.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <DialogTitle className="text-left">{file.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {file.contentType} • {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenExternal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          {renderFileContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
