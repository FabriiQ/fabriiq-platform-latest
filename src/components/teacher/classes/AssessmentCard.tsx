'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardList,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash,
  Clock,
  Users,
  BookOpen,
  BarChart,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssessmentCardProps {
  assessment: {
    id: string;
    title: string;
    description?: string;
    assessmentType: string;
    subject?: string;
    topic?: string;
    createdAt: string;
    dueDate?: string;
    status: 'draft' | 'published' | 'completed' | 'grading';
    completionRate?: number;
    averageScore?: number;
    maxScore?: number;
    passingScore?: number;
    gradingType?: string;
    rubricId?: string;
    term?: {
      id: string;
      name: string;
    };
  };
  className?: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onGrade?: (id: string) => void;
}

/**
 * AssessmentCard component for displaying assessment information
 *
 * Features:
 * - Consistent card design
 * - Status badge
 * - Completion and score metrics
 * - Action buttons
 * - Dropdown menu for additional actions
 */
export function AssessmentCard({
  assessment,
  className,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onGrade
}: AssessmentCardProps) {
  const router = useRouter();

  // Determine card size and title class based on content
  const getTitleClass = () => {
    const titleLength = assessment.title.length;
    if (titleLength <= 30) return 'assessment-title short-title';
    if (titleLength <= 60) return 'assessment-title medium-title';
    return 'assessment-title long-title';
  };

  const getCardSizeClass = () => {
    const titleLength = assessment.title.length;
    const hasDescription = assessment.description && assessment.description.length > 0;
    const hasMetrics = assessment.completionRate !== undefined || assessment.averageScore !== undefined;

    // Compact: Short title, no description, minimal metrics
    if (titleLength <= 30 && !hasDescription && !hasMetrics) {
      return 'assessment-card-compact';
    }

    // Expanded: Long title, description, or multiple metrics
    if (titleLength > 60 || (hasDescription && hasMetrics)) {
      return 'assessment-card-expanded';
    }

    // Standard: Everything else
    return 'assessment-card-standard';
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get assessment type icon
  const getAssessmentTypeIcon = () => {
    switch (assessment.assessmentType.toLowerCase()) {
      case 'quiz':
        return <CheckCircle className="h-4 w-4" />;
      case 'exam':
        return <ClipboardList className="h-4 w-4" />;
      case 'test':
        return <ClipboardList className="h-4 w-4" />;
      case 'assignment':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  // Get grading method display
  const getGradingMethod = () => {
    if (assessment.rubricId) {
      return {
        label: 'Rubric',
        variant: 'secondary' as const,
        icon: <ClipboardList className="h-3 w-3" />
      };
    }
    return {
      label: 'Score',
      variant: 'outline' as const,
      icon: <BarChart className="h-3 w-3" />
    };
  };

  // Get status color
  const getStatusColor = () => {
    switch (assessment.status) {
      case 'published':
        return 'warning';
      case 'completed':
        return 'success';
      case 'grading':
        return 'secondary';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  // Check if assessment is past due
  const isPastDue = () => {
    if (!assessment.dueDate) return false;
    return new Date(assessment.dueDate) < new Date();
  };

  // Get time remaining until due date
  const getTimeRemaining = () => {
    if (!assessment.dueDate) return null;

    const dueDate = new Date(assessment.dueDate);
    const now = new Date();

    if (dueDate < now) return 'Past due';

    const diffTime = Math.abs(dueDate.getTime() - now.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    }

    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    }

    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`;
  };

  return (
    <Card className={cn("overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-lg", getCardSizeClass(), className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusColor()}>
                {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
              </Badge>
              {isPastDue() && assessment.status !== 'completed' && (
                <Badge variant="destructive">
                  Past Due
                </Badge>
              )}
              <Badge variant={getGradingMethod().variant} className="text-xs">
                {getGradingMethod().icon}
                <span className="ml-1">{getGradingMethod().label}</span>
              </Badge>
            </div>
            <CardTitle className={getTitleClass()} title={assessment.title}>
              {assessment.title}
            </CardTitle>
            {assessment.description && (
              <CardDescription className="line-clamp-2 text-sm">
                {assessment.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(assessment.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Assessment
                </DropdownMenuItem>
              )}
              {onEdit && assessment.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onEdit(assessment.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Assessment
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(assessment.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onGrade && (assessment.status === 'completed' || assessment.status === 'grading') && (
                <DropdownMenuItem onClick={() => onGrade(assessment.id)}>
                  <BarChart className="mr-2 h-4 w-4" />
                  Grade Submissions
                </DropdownMenuItem>
              )}
              {onDelete && assessment.status !== 'completed' && (
                <DropdownMenuItem
                  onClick={() => onDelete(assessment.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              {getAssessmentTypeIcon()}
              <span className="truncate">{assessment.assessmentType}</span>
            </div>

            {assessment.subject && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{assessment.subject}</span>
              </div>
            )}

            {assessment.dueDate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{formatDate(assessment.dueDate)}</span>
              </div>
            )}
          </div>

          {assessment.dueDate && assessment.status !== 'completed' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className={cn(
                "h-4 w-4",
                isPastDue() ? "text-destructive" : "text-muted-foreground"
              )} />
              <span className={cn(
                isPastDue() ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                {getTimeRemaining()}
              </span>
            </div>
          )}

          {assessment.completionRate !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span className="font-medium">{assessment.completionRate}%</span>
              </div>
              <Progress value={assessment.completionRate} className="h-2" />
            </div>
          )}

          {assessment.averageScore !== undefined && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Average Score</span>
                <span className="font-medium">{assessment.averageScore}%</span>
              </div>
              <Progress value={assessment.averageScore} className="h-2" />
            </div>
          )}

          {assessment.term && (
            <div className="text-sm">
              <span className="text-muted-foreground">Term: </span>
              <span className="font-medium">{assessment.term.name}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 flex-shrink-0 mt-auto">
        {onView && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(assessment.id)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        )}

        {onGrade && (assessment.status === 'completed' || assessment.status === 'grading') ? (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onGrade(assessment.id)}
          >
            <BarChart className="mr-2 h-4 w-4" />
            Grade
          </Button>
        ) : onEdit && assessment.status !== 'completed' && (
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(assessment.id)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
