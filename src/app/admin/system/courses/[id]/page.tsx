"use client";

import { useParams, useRouter } from "next/navigation";
import { use, useState } from "react";
import { Button } from "@/components/ui/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/atoms/card";
import { PageHeader } from "@/components/ui/atoms/page-header";
import { Badge } from "@/components/ui/atoms/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from '@/trpc/react';
import { PrerequisiteConfig } from "@/components/admin/courses/PrerequisiteConfig";
import { ResourceCreateDialog } from "@/components/resources/ResourceCreateDialog";
import { ResourceTileView } from "@/components/resources/ResourceTileView";
import {
  Plus,
  FileText,
  ArrowUpRight,
  FolderOpen,
  Play,
  Eye,
  Trash2,
  Edit,
  LayoutGrid,
  LayoutList
} from "lucide-react";

export default function ViewCoursePage() {
  const params = useParams();
  const router = useRouter();
  // Unwrap params properly using React.use() for future compatibility
  const unwrappedParams = params instanceof Promise ? use(params) : params;
  const courseId = unwrappedParams.id as string;

  const [activeTab, setActiveTab] = useState("details");

  const { data, isLoading } = api.course.get.useQuery({ id: courseId });

  // Get course subjects with resources
  const { data: subjectsData } = api.subject.getSubjectsByCourse.useQuery(
    { courseId, includeResourceCount: true },
    { enabled: !!courseId }
  );

  if (isLoading) return <div>Loading...</div>;
  if (!data?.course) return <div>Course not found</div>;

  const course = data.course;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title={course.name}
          description={`Course Code: ${course.code}`}
        />
        <Button onClick={() => router.push(`/admin/system/courses/${courseId}/edit`)}>
          Edit Course
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="resources">Resources Management</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Course Details</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Credits</dt>
                  <dd className="mt-1">{course.credits}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Level</dt>
                  <dd className="mt-1">{course.level}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1">{course.description}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Program</dt>
                  <dd className="mt-1">{course.program.name}</dd>
                </div>
              </dl>
            </Card>

            <PrerequisiteConfig
              courseId={courseId}
              initialPrerequisites={course.prerequisites?.map(p => p.prerequisiteId)}
            />
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <ResourcesManagement courseId={courseId} subjects={subjectsData || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Resources Management Component
interface ResourcesManagementProps {
  courseId: string;
  subjects: any[];
}

function ResourcesManagement({ courseId, subjects }: ResourcesManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>('tiles');

  // Get resource icon based on type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'FILE':
        return <FileText className="h-4 w-4" />;
      case 'VIDEO':
        return <Play className="h-4 w-4" />;
      case 'LINK':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'FOLDER':
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get resource type badge color
  const getResourceColor = (type: string) => {
    switch (type) {
      case 'FILE':
        return 'bg-blue-100 text-blue-800';
      case 'VIDEO':
        return 'bg-purple-100 text-purple-800';
      case 'LINK':
        return 'bg-green-100 text-green-800';
      case 'FOLDER':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare all resources for tile view
  const allResources = subjects.flatMap(subject =>
    (subject.resources || []).map((resource: any) => ({
      ...resource,
      subjectName: subject.name,
      subjectCode: subject.code,
      subjectId: subject.id,
      owner: { name: 'System Admin' }
    }))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Course Resources</h2>
          <p className="text-muted-foreground">
            Manage resources for this course organized by subjects
          </p>
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

          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>

        <ResourceCreateDialog
          open={showAddModal}
          onOpenChange={setShowAddModal}
          courseId={courseId}
          subjects={subjects}
        />
      </div>

      {/* Resources Content */}
      {viewMode === 'tiles' ? (
        <ResourceTileView
          resources={allResources}
          isLoading={false}
          emptyMessage="No resources found"
          emptyDescription="Add subjects and resources to this course to get started"
          showOwner={false}
        />
      ) : (
        // List View (Subject Folders)
        <div className="space-y-4">
          {subjects.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
                  <p className="text-muted-foreground mb-4">
                    Add subjects to this course to organize resources
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
          subjects.map((subject) => (
            <Card key={subject.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {subject.code} • {subject.resources?.length || 0} resources
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Subject
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {subject.resources && subject.resources.length > 0 ? (
                  <div className="space-y-2">
                    {subject.resources.map((resource: any) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {getResourceIcon(resource.type)}
                          <div>
                            <p className="font-medium">{resource.title}</p>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={getResourceColor(resource.type)}
                          >
                            {resource.type}
                          </Badge>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => resource.url && window.open(resource.url, '_blank')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No resources in this subject yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        </div>
      )}
    </div>
  );
}