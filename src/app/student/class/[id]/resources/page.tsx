'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Play,
} from 'lucide-react';
import { LayoutGrid, LayoutList, Folder, Link, Plus } from '@/components/ui/icons-fix';
import { cn } from '@/lib/utils';
import { ResourceFilters } from '@/components/student/resources/ResourceFilters';
import { ResourceGrid } from '@/components/student/resources/ResourceGrid';
import { ResourceCreateDialog } from '@/components/resources/ResourceCreateDialog';
import { ResourceTileView } from '@/components/resources/ResourceTileView';
import { Button } from '@/components/ui/button';

/**
 * Class Resources Page
 * 
 * Displays all resources for a specific class within the student class portal.
 * Features:
 * - Class context and navigation
 * - Resource search and filtering
 * - Resource type indicators
 * - Direct resource access
 * - Mobile-responsive design
 */
export default function ClassResourcesPage() {
  const params = useParams();
  const { data: session } = useSession();
  const classId = params?.id as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>('tiles');

  // Get class information
  const { data: classData, isLoading: classLoading } = api.class.getById.useQuery(
    { classId: classId },
    { enabled: !!classId }
  );

  // Get student's grouped resources
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = api.resource.getStudentResourcesGrouped.useQuery(
    { studentId: session?.user?.id || '' },
    { enabled: !!session?.user?.id }
  );

  // Filter resources for current class and include personal resources
  const classResources = resourcesData?.courses.find(course =>
    course.id === classData?.courseCampus?.courseId
  ) || { subjects: [] as any[] };

  // Get all resources (subject-specific + personal)
  const allClassResources = [
    ...classResources.subjects.flatMap(subject =>
      subject.resources.map(resource => ({
        ...resource,
        subjectName: subject.name,
        subjectCode: subject.code,
        subjectId: subject.id
      }))
    ),
    ...(resourcesData?.personal || []).map(resource => ({
      ...resource,
      subjectName: 'Personal',
      subjectCode: 'PERSONAL',
      subjectId: null
    }))
  ];

  // Filter all resources based on search and type
  const filteredResources = allClassResources.filter(resource => {
    const matchesSearch = !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || resource.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Filter subjects based on search and type (for list view)
  const filteredSubjects = classResources.subjects.map(subject => ({
    ...subject,
    resources: subject.resources.filter(resource => {
      const matchesSearch = !searchTerm ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || resource.type === selectedType;

      return matchesSearch && matchesType;
    })
  })).filter(subject => subject.resources.length > 0 || !searchTerm);

  // Add personal resources as a separate "subject" for list view
  const personalResourcesFiltered = (resourcesData?.personal || []).filter(resource => {
    const matchesSearch = !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || resource.type === selectedType;

    return matchesSearch && matchesType;
  });

  if (personalResourcesFiltered.length > 0) {
    filteredSubjects.push({
      id: 'personal',
      name: 'Personal Resources',
      code: 'PERSONAL',
      resources: personalResourcesFiltered
    });
  }

  const totalResources = allClassResources.length;
  const classInfo = classData;

  // Folder toggle function
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Resource type icons
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'FILE':
        return <FileText className="h-4 w-4" />;
      case 'VIDEO':
        return <Play className="h-4 w-4" />;
      case 'LINK':
        return <Link className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Handle resource click
  const handleResourceClick = (resource: any) => {
    if (resource.url) {
      window.open(resource.url, '_blank');
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header with Class Context */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Class Resources</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {classInfo?.name || 'Class Resources'}
              </h1>
              <div className="flex items-center space-x-4 text-muted-foreground">
                <span>{classInfo?.code}</span>
                {classInfo?.courseCampus?.course && <span>• {classInfo.courseCampus.course.name}</span>}
                <span>• {totalResources} resources</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'tiles' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tiles')}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Resource
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <ResourceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCourse="all"
        onCourseChange={() => {}}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        courses={[]}
        showCourseFilter={false}
      />

      {/* Resources Content */}
      {viewMode === 'tiles' ? (
        <ResourceTileView
          resources={filteredResources}
          isLoading={classLoading || resourcesLoading}
          emptyMessage="No resources found"
          emptyDescription={
            searchTerm || selectedType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Your teacher hasn\'t added any resources to this class yet'
          }
          showOwner={false}
        />
      ) : (
        // List View (Folder Structure)
        classLoading || resourcesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Your teacher hasn\'t added any resources to this class yet'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Subject Folders */}
            {filteredSubjects.map((subject) => (
              <Card key={subject.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFolder(subject.id)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedFolders.has(subject.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Folder className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <Badge variant="outline">{subject.code}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      {subject.resources.length} resources
                    </Badge>
                  </div>
                </CardHeader>

                {expandedFolders.has(subject.id) && (
                  <CardContent className="pl-8 space-y-2">
                    {subject.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        onClick={() => handleResourceClick(resource)}
                      >
                        {getResourceIcon(resource.type)}
                        <span className="text-sm flex-1">{resource.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                        {resource.description && (
                          <span className="text-xs text-muted-foreground max-w-xs truncate">
                            {resource.description}
                          </span>
                        )}
                      </div>
                    ))}
                    {subject.resources.length === 0 && (
                      <div className="text-sm text-gray-500 p-3">
                        No resources available for this subject yet.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )
      )}



      {/* Class Information Card */}
      {classInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Class Name</h4>
                <p>{classInfo.name}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Class Code</h4>
                <p>{classInfo.code}</p>
              </div>
              {classInfo.courseCampus?.course && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Course</h4>
                  <p>{classInfo.courseCampus.course.name}</p>
                </div>
              )}
              {classInfo.term && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Term</h4>
                  <p>{classInfo.term.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Creation Dialog */}
      <ResourceCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={() => {
          refetchResources();
          setShowCreateDialog(false);
        }}
        subjects={[]} // Empty array means all resources will be personal
        defaultSubjectId={undefined}
        showAccessControl={false} // Students can't control access - all personal
      />
    </div>
  );
}
