/**
 * Academic Year Planning View Component
 * 
 * Long-term academic planning interface for managing academic years,
 * terms, milestones, and institutional calendar templates.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { 
  Calendar,
  GraduationCap,
  Clock,
  Target,
  BookOpen,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  Edit,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  UnifiedCalendarEvent,
  CalendarEventType,
  EventSource
} from '@/types/calendar/unified-events';
import {
  format,
  isWithinInterval,
  addMonths
} from 'date-fns';

// Academic year interface
interface AcademicYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  terms: AcademicTerm[];
  milestones: AcademicMilestone[];
  totalWorkingDays: number;
  completionPercentage: number;
}

// Academic term interface
interface AcademicTerm {
  id: string;
  name: string;
  type: 'SEMESTER' | 'TRIMESTER' | 'QUARTER';
  startDate: Date;
  endDate: Date;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  workingDays: number;
  holidays: number;
  events: UnifiedCalendarEvent[];
}

// Academic milestone interface
interface AcademicMilestone {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'REGISTRATION' | 'ORIENTATION' | 'EXAM_PERIOD' | 'GRADUATION' | 'BREAK' | 'DEADLINE' | 'CUSTOM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  associatedTerms: string[];
  campusIds?: string[];
  programIds?: string[];
}

// Calendar template interface
interface AcademicCalendarTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'SEMESTER' | 'TRIMESTER' | 'QUARTER' | 'CUSTOM';
  duration: number; // in weeks
  milestones: Omit<AcademicMilestone, 'id' | 'date'>[];
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
}

interface AcademicYearPlanningViewProps {
  initialYear?: number;
  onYearChange?: (year: number) => void;
  onMilestoneAdd?: (milestone: Omit<AcademicMilestone, 'id'>) => void;
  onTemplateApply?: (templateId: string, termId: string) => void;
  onTermCreate?: (term: Omit<AcademicTerm, 'id' | 'events'>) => void;
  allowTemplateManagement?: boolean;
  className?: string;
}

export const AcademicYearPlanningView: React.FC<AcademicYearPlanningViewProps> = ({
  initialYear = new Date().getFullYear(),
  onYearChange,
  onMilestoneAdd,
  onTemplateApply,
  onTermCreate,
  allowTemplateManagement = false,
  className
}) => {
  const { toast } = useToast();

  // Helper functions for missing date-fns functions
  const startOfYear = (date: Date): Date => {
    return new Date(date.getFullYear(), 0, 1);
  };

  const endOfYear = (date: Date): Date => {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  };

  const addYears = (date: Date, amount: number): Date => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + amount);
    return newDate;
  };

  const subYears = (date: Date, amount: number): Date => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() - amount);
    return newDate;
  };

  const differenceInDays = (dateLeft: Date, dateRight: Date): number => {
    const diffTime = Math.abs(dateLeft.getTime() - dateRight.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const startOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  };
  
  // State management
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [activeTab, setActiveTab] = useState<'overview' | 'terms' | 'milestones' | 'templates'>('overview');
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Calculate year range
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 0, 1));

  // Fetch academic cycles for the year
  const { data: academicCyclesData, isLoading: cyclesLoading } = api.academicCycle.list.useQuery({
    page: 1,
    pageSize: 10,
    status: 'ACTIVE'
  });

  const academicCycles = academicCyclesData?.items || [];

  // Fetch terms for the year
  const { data: termsData, isLoading: termsLoading } = api.term.list.useQuery({
    page: 1,
    pageSize: 50,
    status: 'ACTIVE'
  }, {
    enabled: academicCycles.length > 0
  });

  const terms = termsData?.terms || [];

  // Fetch academic events for the year
  const { data: academicEvents = [], isLoading: eventsLoading } = api.unifiedCalendar.getEvents.useQuery({
    startDate: yearStart,
    endDate: yearEnd,
    includeTimetables: false,
    includeAcademic: true,
    includeHolidays: true,
    includePersonal: false
  });

  // Mock holidays data since holiday API might not be available
  const holidays: any[] = [];

  // Mock data for templates (would come from API)
  const mockTemplates: AcademicCalendarTemplate[] = [
    {
      id: '1',
      name: 'Standard Semester Template',
      description: 'Traditional 16-week semester with mid-term and final exams',
      type: 'SEMESTER',
      duration: 16,
      milestones: [
        {
          title: 'Registration Opens',
          type: 'REGISTRATION',
          priority: 'HIGH',
          status: 'PLANNED',
          associatedTerms: []
        },
        {
          title: 'Classes Begin',
          type: 'CUSTOM',
          priority: 'CRITICAL',
          status: 'PLANNED',
          associatedTerms: []
        },
        {
          title: 'Mid-term Exams',
          type: 'EXAM_PERIOD',
          priority: 'HIGH',
          status: 'PLANNED',
          associatedTerms: []
        },
        {
          title: 'Final Exams',
          type: 'EXAM_PERIOD',
          priority: 'CRITICAL',
          status: 'PLANNED',
          associatedTerms: []
        }
      ],
      isPublic: true,
      usageCount: 15,
      createdBy: 'system'
    },
    {
      id: '2',
      name: 'Trimester Template',
      description: '12-week trimester system with continuous assessment',
      type: 'TRIMESTER',
      duration: 12,
      milestones: [
        {
          title: 'Trimester Begins',
          type: 'CUSTOM',
          priority: 'CRITICAL',
          status: 'PLANNED',
          associatedTerms: []
        },
        {
          title: 'Assessment Period',
          type: 'EXAM_PERIOD',
          priority: 'HIGH',
          status: 'PLANNED',
          associatedTerms: []
        }
      ],
      isPublic: true,
      usageCount: 8,
      createdBy: 'system'
    }
  ];

  // Transform data into academic year structure
  const academicYear: AcademicYear = useMemo(() => {
    const academicTerms: AcademicTerm[] = (terms || []).map((term: any) => ({
      id: term.id,
      name: term.name,
      type: 'SEMESTER' as any, // Default type since termType might not exist
      startDate: term.startDate,
      endDate: term.endDate,
      status: term.status === 'ACTIVE' ? 'ACTIVE' : 'PLANNED',
      workingDays: differenceInDays(term.endDate, term.startDate),
      holidays: holidays.filter((holiday: any) =>
        isWithinInterval(holiday.startDate || holiday.date, { start: term.startDate, end: term.endDate })
      ).length,
      events: academicEvents.filter(event =>
        isWithinInterval(event.startDate, { start: term.startDate, end: term.endDate })
      )
    }));

    const milestones: AcademicMilestone[] = academicEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.startDate,
      type: event.eventType as any || 'CUSTOM',
      priority: 'MEDIUM',
      status: 'PLANNED',
      associatedTerms: academicTerms
        .filter(term => isWithinInterval(event.startDate, { start: term.startDate, end: term.endDate }))
        .map(term => term.id),
      campusIds: event.campusId ? [event.campusId] : undefined
    }));

    const totalWorkingDays = academicTerms.reduce((sum, term) => sum + term.workingDays, 0);
    const completedDays = academicTerms
      .filter(term => term.status === 'COMPLETED')
      .reduce((sum, term) => sum + term.workingDays, 0);

    return {
      id: academicCycles[0]?.id || 'current-year',
      name: `Academic Year ${selectedYear}-${selectedYear + 1}`,
      startDate: yearStart,
      endDate: yearEnd,
      status: 'ACTIVE',
      terms: academicTerms,
      milestones,
      totalWorkingDays,
      completionPercentage: totalWorkingDays > 0 ? (completedDays / totalWorkingDays) * 100 : 0
    };
  }, [academicCycles, terms, academicEvents, holidays, selectedYear, yearStart, yearEnd]);

  // Navigation handlers
  const handlePreviousYear = () => {
    const newYear = selectedYear - 1;
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  const handleNextYear = () => {
    const newYear = selectedYear + 1;
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  const handleCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    setSelectedYear(currentYear);
    onYearChange?.(currentYear);
  };

  // Event handlers
  const handleTemplateApply = (templateId: string) => {
    if (selectedTermId) {
      onTemplateApply?.(templateId, selectedTermId);
      toast({
        title: "Template Applied",
        description: "Academic calendar template has been applied to the selected term.",
      });
    } else {
      toast({
        title: "No Term Selected",
        description: "Please select a term before applying a template.",
        variant: "destructive"
      });
    }
  };

  const handleAddMilestone = () => {
    // This would open a dialog for milestone creation
    toast({
      title: "Add Milestone",
      description: "Milestone creation dialog would open here.",
    });
  };

  const handleCreateTerm = () => {
    // This would open a dialog for term creation
    toast({
      title: "Create Term",
      description: "Term creation dialog would open here.",
    });
  };

  // Get milestone type color
  const getMilestoneTypeColor = (type: AcademicMilestone['type']) => {
    const colors = {
      'REGISTRATION': 'bg-blue-100 text-blue-800',
      'ORIENTATION': 'bg-green-100 text-green-800',
      'EXAM_PERIOD': 'bg-red-100 text-red-800',
      'GRADUATION': 'bg-purple-100 text-purple-800',
      'BREAK': 'bg-yellow-100 text-yellow-800',
      'DEADLINE': 'bg-orange-100 text-orange-800',
      'CUSTOM': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.CUSTOM;
  };

  const getPriorityColor = (priority: AcademicMilestone['priority']) => {
    const colors = {
      'LOW': 'text-green-600',
      'MEDIUM': 'text-yellow-600',
      'HIGH': 'text-orange-600',
      'CRITICAL': 'text-red-600'
    };
    return colors[priority];
  };

  if (cyclesLoading || termsLoading || eventsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
          <span className="ml-2">Loading academic year planning...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Academic Year Planning
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* Year Navigation */}
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={handlePreviousYear}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleCurrentYear}>
                Current Year
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextYear}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export Plan
            </Button>
          </div>
        </div>

        {/* Academic Year Title */}
        <div className="text-lg font-medium">
          {academicYear.name}
        </div>

        {/* Year Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{academicYear.terms.length}</div>
            <div className="text-sm text-gray-600">Terms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{academicYear.milestones.length}</div>
            <div className="text-sm text-gray-600">Milestones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{academicYear.totalWorkingDays}</div>
            <div className="text-sm text-gray-600">Working Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{academicYear.completionPercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Academic Year Progress</span>
            <span>{academicYear.completionPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={academicYear.completionPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Academic Year Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Academic Year Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {academicYear.terms.map((term, index) => (
                      <div key={term.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            term.status === 'COMPLETED' ? 'bg-green-500' :
                            term.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{term.name}</h4>
                            <Badge variant="outline">{term.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {format(term.startDate, 'MMM d, yyyy')} - {format(term.endDate, 'MMM d, yyyy')}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{term.workingDays} working days</span>
                            <span>{term.holidays} holidays</span>
                            <span>{term.events.length} events</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className={
                            term.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            term.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }>
                            {term.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Milestones */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {academicYear.milestones
                      .filter(milestone => milestone.date >= new Date())
                      .slice(0, 5)
                      .map(milestone => (
                        <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Target className={`h-4 w-4 ${getPriorityColor(milestone.priority)}`} />
                            <div>
                              <h5 className="font-medium">{milestone.title}</h5>
                              <p className="text-sm text-gray-600">{format(milestone.date, 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getMilestoneTypeColor(milestone.type)}>
                              {milestone.type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(milestone.priority)}>
                              {milestone.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="terms">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Academic Terms</h3>
                <Button onClick={handleCreateTerm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Term
                </Button>
              </div>

              <div className="grid gap-4">
                {academicYear.terms.map(term => (
                  <Card key={term.id} className={`cursor-pointer transition-all ${
                    selectedTermId === term.id ? 'ring-2 ring-blue-500' : ''
                  }`} onClick={() => setSelectedTermId(term.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{term.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{term.type}</Badge>
                          <Badge className={
                            term.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            term.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }>
                            {term.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <p>{format(term.startDate, 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <p>{format(term.endDate, 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Working Days:</span>
                          <p>{term.workingDays}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Events:</span>
                          <p>{term.events.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milestones">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Academic Milestones</h3>
                <Button onClick={handleAddMilestone}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>

              <div className="space-y-3">
                {academicYear.milestones.map(milestone => (
                  <Card key={milestone.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Target className={`h-5 w-5 ${getPriorityColor(milestone.priority)}`} />
                          <div>
                            <h4 className="font-medium">{milestone.title}</h4>
                            <p className="text-sm text-gray-600">{format(milestone.date, 'EEEE, MMM d, yyyy')}</p>
                            {milestone.description && (
                              <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getMilestoneTypeColor(milestone.type)}>
                            {milestone.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(milestone.priority)}>
                            {milestone.priority}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Calendar Templates</h3>
                {allowTemplateManagement && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                )}
              </div>

              {selectedTermId && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected term: <strong>{academicYear.terms.find(t => t.id === selectedTermId)?.name}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Click "Apply" on any template below to apply it to this term.
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {mockTemplates.map(template => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{template.type}</Badge>
                          <Badge variant="outline">{template.duration} weeks</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{template.milestones.length} milestones</span>
                          <span>Used {template.usageCount} times</span>
                          {template.isPublic && <Badge variant="outline" className="text-xs">Public</Badge>}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Copy className="h-3 w-3 mr-1" />
                            Duplicate
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleTemplateApply(template.id)}
                            disabled={!selectedTermId}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
