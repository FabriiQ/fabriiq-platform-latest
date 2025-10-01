'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  X,
  FileText,
  Eye,
  Mic,
  Play,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';

interface SubmissionFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface SubmissionFileUploadProps {
  submissionId: string;
  existingFiles?: Array<{
    id: string;
    name: string;
    url: string;
    contentType: string;
    size: number;
  }>;
  onFilesChange?: (files: SubmissionFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function SubmissionFileUpload({
  submissionId,
  existingFiles = [],
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 50,
  disabled = false,
  className,
}: SubmissionFileUploadProps) {
  const [files, setFiles] = useState<SubmissionFile[]>(() => 
    existingFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.contentType,
      url: file.url,
      status: 'completed' as const,
    }))
  );

  const uploadFileMutation = api.assessment.uploadSubmissionFile.useMutation();
  const deleteFileMutation = api.assessment.deleteSubmissionFile.useMutation();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Eye className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Mic className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Play className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File): Promise<void> => {
    const fileId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add file to state with pending status
    const newFile: SubmissionFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      uploadProgress: 0,
    };

    setFiles(prev => [...prev, newFile]);

    try {
      // Convert file to base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:mime/type;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload file
      const result = await uploadFileMutation.mutateAsync({
        submissionId,
        fileName: file.name,
        fileData,
        fileSize: file.size,
        mimeType: file.type,
      });

      // Update file status
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? {
              ...f,
              id: result.id,
              url: result.url,
              status: 'completed' as const,
              uploadProgress: 100,
            }
          : f
      ));

    } catch (error) {
      // Update file with error status
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? {
              ...f,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Upload failed',
            }
          : f
      ));
    }
  };

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    if (file.status === 'completed' && file.url) {
      try {
        await deleteFileMutation.mutateAsync({
          submissionId,
          fileId,
        });
      } catch (error) {
        console.error('Failed to delete file:', error);
        return;
      }
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (disabled) return;

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.warn('Some files were rejected:', rejectedFiles);
    }

    // Check file limits
    const remainingSlots = maxFiles - files.length;
    const filesToUpload = acceptedFiles.slice(0, remainingSlots);

    // Upload each file
    filesToUpload.forEach(uploadFile);
  }, [disabled, files.length, maxFiles, submissionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: disabled || files.length >= maxFiles,
  });

  // Notify parent of file changes
  React.useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  const canUploadMore = files.length < maxFiles && !disabled;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      {canUploadMore && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              <ArrowUp className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive ? "Drop files here" : "Upload submission files"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to select files
                </p>
                <p className="text-xs text-muted-foreground">
                  Max {maxFileSize}MB per file • {maxFiles - files.length} slots remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Uploaded Files ({files.length}/{maxFiles})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {file.status === 'uploading' && file.uploadProgress !== undefined && (
                    <Progress value={file.uploadProgress} className="mt-1 h-1" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error Messages */}
      {files.some(f => f.status === 'error') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some files failed to upload. Please try again or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}

      {/* File Type Info */}
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Supported file types:</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">Images (JPG, PNG, GIF, WebP)</Badge>
          <Badge variant="outline">Documents (PDF, DOC, DOCX, TXT)</Badge>
          <Badge variant="outline">Audio (MP3, WAV, OGG, M4A)</Badge>
          <Badge variant="outline">Video (MP4, WebM)</Badge>
        </div>
      </div>
    </div>
  );
}
