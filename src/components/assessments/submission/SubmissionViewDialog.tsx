'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye } from 'lucide-react';
import { SubmissionViewer } from './SubmissionViewer';
import { SubmissionStatus } from '@/server/api/constants';

interface SubmissionViewDialogProps {
  submission: {
    id: string;
    status: SubmissionStatus;
    submittedAt: Date | null;
    score: number | null;
    feedback?: any;
    content?: any;
    attachments?: any;
    student?: {
      id: string;
      user: {
        name: string | null;
        email?: string;
      };
    };
  };
  assessment: {
    id: string;
    title: string;
    maxScore?: number | null;
  };
  className?: string;
}

export function SubmissionViewDialog({
  submission,
  assessment,
  className,
}: SubmissionViewDialogProps) {
  const [open, setOpen] = useState(false);

  // Ensure student data is properly formatted
  const submissionWithAssessment = {
    ...submission,
    assessment: {
      ...assessment,
      maxScore: assessment.maxScore ?? null,
    },
    student: submission.student ? {
      ...submission.student,
      user: {
        ...submission.student.user,
        email: submission.student.user.email || '',
      }
    } : {
      id: '',
      user: { name: 'Unknown Student', email: '' }
    },
  };

  const studentName = submission.student?.user?.name || submission.student?.user?.email || 'Unknown Student';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Submission - {studentName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="pr-4">
            <SubmissionViewer
              submission={submissionWithAssessment}
              showGradingInfo={true}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
