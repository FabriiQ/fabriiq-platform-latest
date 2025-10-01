'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Calendar,
  Clock,
  FileText,
  Download,
  Eye,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmissionStatus } from '@/server/api/constants';
import { FileViewer } from '@/components/ui/file-viewer/FileViewer';

interface SubmissionAttachment {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  uploadedAt?: string;
}

interface SubmissionViewerProps {
  submission: {
    id: string;
    status: SubmissionStatus;
    submittedAt: Date | null;
    score: number | null;
    feedback?: any;
    content?: any;
    attachments?: any;
    student: {
      id: string;
      user: {
        name: string | null;
        email: string;
      };
    };
    assessment: {
      id: string;
      title: string;
      maxScore: number | null;
    };
  };
  showGradingInfo?: boolean;
  className?: string;
}

const getStatusColor = (status: SubmissionStatus) => {
  switch (status) {
    case SubmissionStatus.DRAFT:
      return 'bg-gray-100 text-gray-800';
    case SubmissionStatus.SUBMITTED:
      return 'bg-blue-100 text-blue-800';
    case SubmissionStatus.UNDER_REVIEW:
      return 'bg-yellow-100 text-yellow-800';
    case SubmissionStatus.GRADED:
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};



const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: Date | null): string => {
  if (!date) return 'Not submitted';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const hasAnswers = (content: any): boolean => {
  if (!content || !content.answers) return false;

  if (Array.isArray(content.answers)) {
    return content.answers.length > 0;
  }

  if (typeof content.answers === 'object') {
    return Object.keys(content.answers).length > 0;
  }

  return false;
};

export function SubmissionViewer({
  submission,
  showGradingInfo = true,
  className,
}: SubmissionViewerProps) {
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SubmissionAttachment | null>(null);

  const attachments: SubmissionAttachment[] = React.useMemo(() => {
    if (!submission.attachments) return [];

    try {
      const parsed = typeof submission.attachments === 'string'
        ? JSON.parse(submission.attachments)
        : submission.attachments;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [submission.attachments]);

  const content = React.useMemo(() => {
    if (!submission.content) return null;

    try {
      const parsed = typeof submission.content === 'string'
        ? JSON.parse(submission.content)
        : submission.content;

      // Debug logging to understand the structure
      console.log('Submission content:', parsed);

      return parsed;
    } catch {
      return null;
    }
  }, [submission.content]);

  const feedback = React.useMemo(() => {
    if (!submission.feedback) return null;
    
    try {
      return typeof submission.feedback === 'string' 
        ? JSON.parse(submission.feedback) 
        : submission.feedback;
    } catch {
      return submission.feedback;
    }
  }, [submission.feedback]);

  const handleFilePreview = (attachment: SubmissionAttachment) => {
    setSelectedFile(attachment);
    setFileViewerOpen(true);
  };

  const handleFileDownload = (attachment: SubmissionAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else if (contentType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (contentType.startsWith('audio/')) {
      return <FileText className="h-4 w-4 text-green-500" />;
    } else if (contentType.startsWith('video/')) {
      return <FileText className="h-4 w-4 text-purple-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Submission Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">
                {submission.assessment.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {submission.student.user.name || submission.student.user.email}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(submission.submittedAt)}
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(submission.status)}>
              {submission.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Grading Information */}
      {showGradingInfo && submission.status === SubmissionStatus.GRADED && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grading Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold">
                {submission.score ?? 0}/{submission.assessment.maxScore ?? 100}
              </div>
              <div className="text-lg text-muted-foreground">
                {Math.round(((submission.score ?? 0) / (submission.assessment.maxScore ?? 100)) * 100)}%
              </div>
            </div>
            
            {feedback && (
              <div>
                <h4 className="text-sm font-medium mb-2">Feedback</h4>
                <div className="text-sm bg-muted p-3 rounded-md">
                  {typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission Content */}
      {(hasAnswers(content) || content) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submission Content</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAnswers(content) && Array.isArray(content.answers) ? (
              <div className="space-y-4">
                {content.answers.map((answer: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Question {index + 1}
                    </h4>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      {answer.value || answer.text || answer.content || 'No answer provided'}
                    </div>
                  </div>
                ))}
              </div>
            ) : content.answers && typeof content.answers === 'object' && Object.keys(content.answers).length > 0 ? (
              // Handle object-based answers (like essay submissions)
              <div className="space-y-4">
                {Object.entries(content.answers).map(([questionId, answer]: [string, any], index: number) => (
                  <div key={questionId} className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Question {index + 1}
                    </h4>
                    <div className="text-sm bg-muted p-3 rounded-md">
                      {typeof answer === 'object' ?
                        (answer.content || answer.value || answer.text || 'No answer provided') :
                        (answer || 'No answer provided')
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Empty state for submission content
              <div className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No answers submitted</h3>
                <p className="text-muted-foreground">
                  This submission doesn't contain any question answers.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              File Attachments ({attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(attachment.contentType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(attachment.size)}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {attachment.contentType.split('/')[0]} File
                      </span>
                      <span>•</span>
                      <span className="uppercase text-blue-600 font-medium">
                        {attachment.name.split('.').pop()?.toUpperCase() || 'FILE'}
                      </span>
                      {attachment.uploadedAt && (
                        <>
                          <span>•</span>
                          <span>{formatDate(new Date(attachment.uploadedAt))}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFilePreview(attachment)}
                      title="Preview file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDownload(attachment)}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(attachment.url, '_blank')}
                      title="Open in new tab"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!hasAnswers(content) && attachments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No submission content</h3>
            <p className="text-muted-foreground">
              This submission doesn't contain any answers or attachments.
            </p>
          </CardContent>
        </Card>
      )}

      {/* File Viewer Dialog */}
      {selectedFile && (
        <FileViewer
          isOpen={fileViewerOpen}
          onClose={() => {
            setFileViewerOpen(false);
            setSelectedFile(null);
          }}
          file={{
            name: selectedFile.name,
            url: selectedFile.url,
            contentType: selectedFile.contentType,
            size: selectedFile.size,
          }}
        />
      )}
    </div>
  );
}
