'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  BookOpen,
  ClipboardList,
  Edit,
  Star,
  Eye,
  Calculator,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuickActionsProps {
  onActionClick: (action: string, prompt: string) => void;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

export function QuickActions({ onActionClick, className }: QuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'worksheet',
      label: 'Generate Worksheet',
      description: 'Create a structured worksheet with questions and activities',
      icon: <FileText className="h-4 w-4" />,
      prompt: 'Create a comprehensive worksheet with clear instructions, varied question types, and an answer key. IMPORTANT: Search for and include relevant educational images, diagrams, and visual aids throughout the worksheet to enhance learning and engagement. Use the imageSearch tool to find appropriate visuals for the topic.',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      id: 'lesson-plan',
      label: 'Lesson Plan',
      description: 'Generate a detailed lesson plan with objectives and activities',
      icon: <BookOpen className="h-4 w-4" />,
      prompt: 'Create a detailed lesson plan with learning objectives, activities, assessment methods, and required materials. Include visual aids and interactive elements.',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      id: 'assessment',
      label: 'Assessment',
      description: 'Create quizzes, tests, or evaluation rubrics',
      icon: <ClipboardList className="h-4 w-4" />,
      prompt: 'Design a comprehensive assessment with varied question types, clear rubrics, and answer keys. Include images and diagrams where helpful.',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      id: 'activity',
      label: 'Learning Activity',
      description: 'Design engaging classroom activities and exercises',
      icon: <Edit className="h-4 w-4" />,
      prompt: 'Create an engaging learning activity with clear instructions, materials list, and learning outcomes. Include visual elements and interactive components.',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      id: 'visual-content',
      label: 'Visual Content',
      description: 'Create content with diagrams, charts, and images',
      icon: <Eye className="h-4 w-4" />,
      prompt: 'Create educational content that heavily incorporates visual elements like diagrams, charts, infographics, and relevant images to enhance understanding.',
      color: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    },
    {
      id: 'math-problems',
      label: 'Math Problems',
      description: 'Generate math problems and step-by-step solutions',
      icon: <Calculator className="h-4 w-4" />,
      prompt: 'Create a set of math problems with varying difficulty levels, step-by-step solutions, and visual representations where helpful.',
      color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    onActionClick(action.id, action.prompt);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={cn(
          "grid gap-3 transition-all duration-300",
          isExpanded ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
        )}>
          {(isExpanded ? quickActions : quickActions.slice(0, 4)).map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className={cn(
                "h-auto p-4 flex flex-col items-start gap-2 text-left transition-all duration-200",
                action.color
              )}
              onClick={() => handleActionClick(action)}
            >
              <div className="flex items-center gap-2 w-full">
                {action.icon}
                <span className="font-medium text-sm">{action.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {action.description}
              </p>
            </Button>
          ))}
        </div>
        
        {!isExpanded && quickActions.length > 4 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground"
            >
              +{quickActions.length - 4} more actions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
