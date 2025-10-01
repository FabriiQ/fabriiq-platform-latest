'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flag, Shield, X } from 'lucide-react';
import { api } from '@/utils/api';
import { toast } from 'sonner';

interface ReportMessageDialogProps {
  messageId: string;
  messageContent: string;
  messageAuthor: string;
  isOpen: boolean;
  onClose: () => void;
  onReported?: () => void;
}

const REPORT_REASONS = [
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content', description: 'Content that violates community guidelines' },
  { value: 'HARASSMENT', label: 'Harassment', description: 'Bullying, threats, or targeted harassment' },
  { value: 'SPAM', label: 'Spam', description: 'Unwanted or repetitive messages' },
  { value: 'VIOLENCE', label: 'Violence', description: 'Threats or promotion of violence' },
  { value: 'HATE_SPEECH', label: 'Hate Speech', description: 'Discriminatory or hateful language' },
  { value: 'PRIVACY_VIOLATION', label: 'Privacy Violation', description: 'Sharing personal information without consent' },
  { value: 'OTHER', label: 'Other', description: 'Other policy violations' }
] as const;

const PRIORITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' }
] as const;

export function ReportMessageDialog({
  messageId,
  messageContent,
  messageAuthor,
  isOpen,
  onClose,
  onReported
}: ReportMessageDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportMessageMutation = api.messaging.reportMessage.useMutation({
    onSuccess: () => {
      toast.success('Message reported successfully. Moderators will review it shortly.');
      onReported?.();
      handleClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to report message. Please try again.');
    }
  });

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason for reporting this message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await reportMessageMutation.mutateAsync({
        messageId,
        reason: reason as any,
        description: description.trim() || undefined,
        priority: priority as any
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setPriority('MEDIUM');
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  const selectedReason = REPORT_REASONS.find(r => r.value === reason);
  const selectedPriority = PRIORITY_LEVELS.find(p => p.value === priority);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Message
          </DialogTitle>
          <DialogDescription>
            Report this message to moderators for review. All reports are taken seriously and reviewed promptly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Message from {messageAuthor}</span>
              <Badge variant="outline" className="text-xs">
                Reporting
              </Badge>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {messageContent}
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for reporting *</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    <div>
                      <div className="font-medium">{reasonOption.label}</div>
                      <div className="text-xs text-muted-foreground">{reasonOption.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="text-xs text-muted-foreground">
                {selectedReason.description}
              </p>
            )}
          </div>

          {/* Priority Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority Level</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_LEVELS.map((priorityOption) => (
                  <SelectItem key={priorityOption.value} value={priorityOption.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityOption.color}>
                        {priorityOption.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Details (Optional)</label>
            <Textarea
              placeholder="Provide any additional context or details about why you're reporting this message..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Important Notice</p>
                <p className="text-amber-700 mt-1">
                  False reports may result in restrictions on your account. Only report messages that genuinely violate our community guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>
                <Shield className="h-4 w-4 mr-2 animate-spin" />
                Reporting...
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                Report Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
