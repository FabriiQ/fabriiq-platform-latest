/**
 * Message Templates Component
 * Pre-defined templates by role with context filters for assignments/grades
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  BookOpen, 
  GraduationCap, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'academic' | 'administrative' | 'social' | 'emergency' | 'general';
  userTypes: string[];
  context: {
    requiresClass?: boolean;
    requiresActivity?: boolean;
    requiresGrade?: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  };
  variables: string[]; // Variables that can be replaced like {studentName}, {className}
  icon: React.ReactNode;
}

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  classId?: string;
  activityId?: string;
  currentContent?: string;
}

export function MessageTemplates({ 
  onSelectTemplate, 
  classId, 
  activityId, 
  currentContent 
}: MessageTemplatesProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  // Define templates based on user roles and contexts
  const allTemplates: MessageTemplate[] = useMemo(() => [
    // Teacher Templates
    {
      id: 'assignment-reminder',
      title: 'Assignment Reminder',
      content: 'Hi {studentName},\n\nThis is a friendly reminder that your {assignmentName} assignment is due on {dueDate}. Please make sure to submit it on time.\n\nIf you have any questions, feel free to ask!\n\nBest regards,\n{teacherName}',
      category: 'academic',
      userTypes: ['TEACHER'],
      context: { requiresClass: true, requiresActivity: true, priority: 'medium' },
      variables: ['studentName', 'assignmentName', 'dueDate', 'teacherName'],
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: 'grade-notification',
      title: 'Grade Notification',
      content: 'Dear {recipientName},\n\n{studentName} has received a grade of {grade} for {assignmentName}.\n\nFeedback: {feedback}\n\nPlease let me know if you have any questions.\n\nBest regards,\n{teacherName}',
      category: 'academic',
      userTypes: ['TEACHER'],
      context: { requiresClass: true, requiresGrade: true, priority: 'high' },
      variables: ['recipientName', 'studentName', 'grade', 'assignmentName', 'feedback', 'teacherName'],
      icon: <GraduationCap className="h-4 w-4" />
    },
    {
      id: 'class-announcement',
      title: 'Class Announcement',
      content: 'Dear {className} students,\n\n{announcementContent}\n\nPlease make note of this information and let me know if you have any questions.\n\nBest regards,\n{teacherName}',
      category: 'administrative',
      userTypes: ['TEACHER'],
      context: { requiresClass: true, priority: 'medium' },
      variables: ['className', 'announcementContent', 'teacherName'],
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'parent-meeting-request',
      title: 'Parent Meeting Request',
      content: 'Dear {parentName},\n\nI would like to schedule a meeting to discuss {studentName}\'s progress in {className}.\n\nPlease let me know your availability for the following times:\n- {timeOption1}\n- {timeOption2}\n- {timeOption3}\n\nThank you,\n{teacherName}',
      category: 'administrative',
      userTypes: ['TEACHER'],
      context: { requiresClass: true, priority: 'high' },
      variables: ['parentName', 'studentName', 'className', 'timeOption1', 'timeOption2', 'timeOption3', 'teacherName'],
      icon: <Calendar className="h-4 w-4" />
    },

    // Student Templates
    {
      id: 'question-teacher',
      title: 'Question for Teacher',
      content: 'Dear {teacherName},\n\nI have a question about {subject}:\n\n{questionContent}\n\nCould you please help me understand this better?\n\nThank you,\n{studentName}',
      category: 'academic',
      userTypes: ['STUDENT'],
      context: { requiresClass: true, priority: 'medium' },
      variables: ['teacherName', 'subject', 'questionContent', 'studentName'],
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: 'absence-notification',
      title: 'Absence Notification',
      content: 'Dear {teacherName},\n\nI will be absent from {className} on {date} due to {reason}.\n\nCould you please let me know if I will miss any important assignments or announcements?\n\nThank you,\n{studentName}',
      category: 'administrative',
      userTypes: ['STUDENT'],
      context: { requiresClass: true, priority: 'high' },
      variables: ['teacherName', 'className', 'date', 'reason', 'studentName'],
      icon: <AlertCircle className="h-4 w-4" />
    },

    // Parent Templates
    {
      id: 'progress-inquiry',
      title: 'Progress Inquiry',
      content: 'Dear {teacherName},\n\nI hope this message finds you well. I wanted to check on {studentName}\'s progress in {className}.\n\nCould you please provide an update on:\n- Current grades\n- Areas of strength\n- Areas needing improvement\n- Any concerns\n\nThank you for your time,\n{parentName}',
      category: 'academic',
      userTypes: ['PARENT'],
      context: { requiresClass: true, priority: 'medium' },
      variables: ['teacherName', 'studentName', 'className', 'parentName'],
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 'schedule-meeting',
      title: 'Schedule Meeting',
      content: 'Dear {teacherName},\n\nI would like to schedule a meeting to discuss {studentName}. \n\nI am available:\n{availability}\n\nPlease let me know what works best for you.\n\nBest regards,\n{parentName}',
      category: 'administrative',
      userTypes: ['PARENT'],
      context: { priority: 'high' },
      variables: ['teacherName', 'studentName', 'availability', 'parentName'],
      icon: <Calendar className="h-4 w-4" />
    },

    // Admin Templates
    {
      id: 'system-announcement',
      title: 'System Announcement',
      content: 'Dear {campusName} Community,\n\n{announcementTitle}\n\n{announcementContent}\n\nEffective Date: {effectiveDate}\n\nIf you have any questions, please contact the administration office.\n\nBest regards,\n{adminName}\n{adminTitle}',
      category: 'administrative',
      userTypes: ['CAMPUS_ADMIN', 'SYSTEM_ADMIN'],
      context: { priority: 'high' },
      variables: ['campusName', 'announcementTitle', 'announcementContent', 'effectiveDate', 'adminName', 'adminTitle'],
      icon: <Users className="h-4 w-4" />
    },
    {
      id: 'emergency-alert',
      title: 'Emergency Alert',
      content: 'URGENT: {alertTitle}\n\n{alertContent}\n\nImmediate Action Required: {actionRequired}\n\nFor more information, contact: {contactInfo}\n\nThis is an automated emergency notification.',
      category: 'emergency',
      userTypes: ['CAMPUS_ADMIN', 'SYSTEM_ADMIN'],
      context: { priority: 'urgent' },
      variables: ['alertTitle', 'alertContent', 'actionRequired', 'contactInfo'],
      icon: <AlertCircle className="h-4 w-4" />
    },

    // General Templates
    {
      id: 'thank-you',
      title: 'Thank You Message',
      content: 'Dear {recipientName},\n\nThank you for {reasonForThanks}. Your {contribution} is greatly appreciated.\n\nBest regards,\n{senderName}',
      category: 'social',
      userTypes: ['TEACHER', 'STUDENT', 'PARENT', 'CAMPUS_ADMIN'],
      context: { priority: 'low' },
      variables: ['recipientName', 'reasonForThanks', 'contribution', 'senderName'],
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 'follow-up',
      title: 'Follow-up Message',
      content: 'Dear {recipientName},\n\nI wanted to follow up on our previous conversation about {topic}.\n\n{followUpContent}\n\nPlease let me know if you need any additional information.\n\nBest regards,\n{senderName}',
      category: 'general',
      userTypes: ['TEACHER', 'PARENT', 'CAMPUS_ADMIN'],
      context: { priority: 'medium' },
      variables: ['recipientName', 'topic', 'followUpContent', 'senderName'],
      icon: <Clock className="h-4 w-4" />
    }
  ], []);

  // Filter templates based on user role, search, and category
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filter by user role
    if (session?.user?.userType) {
      templates = templates.filter(template => 
        template.userTypes.includes(session.user.userType)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      templates = templates.filter(template => template.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      templates = templates.filter(template =>
        template.title.toLowerCase().includes(searchLower) ||
        template.content.toLowerCase().includes(searchLower)
      );
    }

    // Filter by context requirements
    templates = templates.filter(template => {
      if (template.context.requiresClass && !classId) return false;
      if (template.context.requiresActivity && !activityId) return false;
      return true;
    });

    return templates;
  }, [allTemplates, session?.user?.userType, categoryFilter, searchTerm, classId, activityId]);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      setSelectedTemplate(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic': return 'bg-blue-100 text-blue-800';
      case 'administrative': return 'bg-purple-100 text-purple-800';
      case 'social': return 'bg-green-100 text-green-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'general': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Message Templates</h3>
        <Badge variant="outline">
          {filteredTemplates.length} templates
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="administrative">Administrative</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {template.icon}
                  <div>
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.content.substring(0, 100)}...
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge className={getCategoryColor(template.category)} variant="outline">
                    {template.category}
                  </Badge>
                  <Badge className={getPriorityColor(template.context.priority)} variant="outline">
                    {template.context.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTemplate.icon}
                {selectedTemplate.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getCategoryColor(selectedTemplate.category)} variant="outline">
                  {selectedTemplate.category}
                </Badge>
                <Badge className={getPriorityColor(selectedTemplate.context.priority)} variant="outline">
                  {selectedTemplate.context.priority}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Template Content:</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">
                    {selectedTemplate.content}
                  </pre>
                </div>
              </div>

              {selectedTemplate.variables.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Available Variables:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="bg-blue-50">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUseTemplate}>
                  Use Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
