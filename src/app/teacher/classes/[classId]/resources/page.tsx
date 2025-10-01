"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  MoreHorizontal,
  Share2,
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowUpRight,
  Play,
  Link,
  LayoutGrid,
  LayoutList
} from "@/components/ui/icons-fix";
import { Upload } from "@/components/ui/icons/custom-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ResourceCreateDialog } from "@/components/resources/ResourceCreateDialog";
import { ResourceViewer, type ResourceFile } from "@/components/resources/ResourceViewer";
import { ResourceTileView } from "@/components/resources/ResourceTileView";

/**
 * Teacher Resources Management Page
 *
 * Comprehensive interface for teachers to manage class resources:
 * - Upload and organize resources
 * - Share resources with students
 * - Track resource usage and engagement
 * - Manage resource permissions and access
 */
export default function TeacherResourcesPage() {
  const params = useParams();
  const classId = params?.classId as string;
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/api/auth/signin");
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedSubjectForResource, setSelectedSubjectForResource] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<ResourceFile | null>(null);
  const [showResourceViewer, setShowResourceViewer] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>('tiles');

  const teacherId = session?.user?.id;

  // Get class information
  const { data: classData } = api.class.getById.useQuery(
    { classId },
    { enabled: !!classId }
  );

  // Get class subjects
  const { data: subjectsData } = api.subject.getSubjectsByCourse.useQuery(
    { courseId: classData?.courseCampus?.courseId || "", includeResourceCount: true },
    { enabled: !!classData?.courseCampus?.courseId }
  );

  // Get teacher's resources grouped by subject for this class
  const { data: resourcesData, isLoading: resourcesLoading, refetch: refetchResources } = api.resource.getTeacherResourcesGrouped.useQuery(
    { teacherId: teacherId || "" },
    { enabled: !!teacherId }
  );

  // Filter resources for current class
  const classResources = resourcesData?.courses.find(course =>
    course.id === classData?.courseCampus?.courseId
  ) || { subjects: [] as any[] };

  const personalResources = resourcesData?.personal || [];

  // Filter resources based on search and type
  const filteredSubjects = classResources.subjects.map(subject => ({
    ...subject,
    resources: subject.resources.filter(resource => {
      const matchesSearch = !searchTerm ||
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || resource.type === selectedType;

      const matchesTab = activeTab === 'all' ||
        (activeTab === 'shared' && resource.access !== 'PRIVATE') ||
        (activeTab === 'private' && resource.access === 'PRIVATE');

      return matchesSearch && matchesType && matchesTab;
    })
  })).filter(subject => subject.resources.length > 0 || !searchTerm);

  const filteredPersonalResources = personalResources.filter(resource => {
    const matchesSearch = !searchTerm ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || resource.type === selectedType;

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'shared' && resource.access !== 'PRIVATE') ||
      (activeTab === 'private' && resource.access === 'PRIVATE');

    return matchesSearch && matchesType && matchesTab;
  });

  // Prepare all resources for tile view
  const allFilteredResources = [
    ...filteredSubjects.flatMap(subject =>
      subject.resources.map(resource => ({
        ...resource,
        subjectName: subject.name,
        subjectCode: subject.code,
        subjectId: subject.id,
        owner: { name: session?.user?.name }
      }))
    ),
    ...filteredPersonalResources.map(resource => ({
      ...resource,
      subjectName: 'Personal',
      subjectCode: 'PERSONAL',
      subjectId: null,
      owner: { name: session?.user?.name }
    }))
  ];

  // Calculate total resources for stats (fix typing issues)
  const totalResources = filteredSubjects.reduce((acc: number, subject: any) => {
    return acc + (subject.resources?.length || 0);
  }, 0) + (filteredPersonalResources?.length || 0);

  const sharedResources = filteredSubjects.reduce((acc: number, subject: any) => {
    return acc + (subject.resources?.filter((r: any) => r.access !== 'PRIVATE')?.length || 0);
  }, 0) + (filteredPersonalResources?.filter((r: any) => r.access !== 'PRIVATE')?.length || 0);

  const documentResources = filteredSubjects.reduce((acc: number, subject: any) => {
    return acc + (subject.resources?.filter((r: any) => r.type === 'FILE')?.length || 0);
  }, 0) + (filteredPersonalResources?.filter((r: any) => r.type === 'FILE')?.length || 0);

  const linkResources = filteredSubjects.reduce((acc: number, subject: any) => {
    return acc + (subject.resources?.filter((r: any) => r.type === 'LINK')?.length || 0);
  }, 0) + (filteredPersonalResources?.filter((r: any) => r.type === 'LINK')?.length || 0);

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

  // Handle resource click - open in viewer instead of new tab
  const handleResourceClick = (resource: any) => {
    if (resource.url) {
      const resourceFile: ResourceFile = {
        id: resource.id,
        title: resource.title,
        url: resource.url,
        type: resource.type,
        mimeType: resource.settings?.mimeType || getResourceMimeType(resource.type, resource.url),
        size: resource.settings?.fileSize,
        description: resource.description,
        settings: resource.settings,
      };
      setSelectedResource(resourceFile);
      setShowResourceViewer(true);
    }
  };

  // Helper function to determine MIME type from resource type and URL
  const getResourceMimeType = (type: string, url: string): string => {
    if (type === 'FILE') {
      const extension = url.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
      };
      return mimeTypes[extension || ''] || 'application/octet-stream';
    }
    return 'text/html'; // For LINK type resources
  };

  // Resource type colors
  const getResourceColor = (type: string) => {
    switch (type) {
      case 'FILE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VIDEO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LINK':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!teacherId) {
    return null;
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Resources</h1>
          <p className="text-muted-foreground">
            Manage and share resources for {classData?.name || 'your class'}
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

          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Resources</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedResources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentResources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Links</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkResources}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm min-w-[120px]"
            >
              <option value="all">All Types</option>
              <option value="FILE">Documents</option>
              <option value="VIDEO">Videos</option>
              <option value="LINK">Links</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Resources</TabsTrigger>
          <TabsTrigger value="shared">Shared with Students</TabsTrigger>
          <TabsTrigger value="private">Private</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Resources Content */}
          {viewMode === 'tiles' ? (
            <ResourceTileView
              resources={allFilteredResources}
              isLoading={resourcesLoading}
              emptyMessage="No resources found"
              emptyDescription={
                searchTerm || selectedType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first resource to this class'
              }
              showOwner={false}
              onResourceClick={handleResourceClick}
            />
          ) : (
            // List View (Folder Structure)
            resourcesLoading ? (
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
            ) : filteredSubjects.length === 0 && filteredPersonalResources.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedType !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Start by adding your first resource to this class'}
                    </p>
                    <Button onClick={() => setShowUploadModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
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
                    <div className="flex items-center justify-between">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubjectForResource(subject.id);
                          setShowUploadModal(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>

                  {expandedFolders.has(subject.id) && (
                    <CardContent className="pl-8 space-y-2">
                      {subject.resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded transition-colors group"
                        >
                          <div
                            className="flex items-center space-x-2 flex-1 cursor-pointer"
                            onClick={() => handleResourceClick(resource)}
                          >
                            {getResourceIcon(resource.type)}
                            <span className="text-sm flex-1">{resource.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            <Badge
                              variant={resource.access === 'PRIVATE' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {resource.access === 'PRIVATE' ? 'Private' : 'Shared'}
                            </Badge>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResourceClick(resource);
                              }}
                              title="View file"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Edit resource">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Delete resource">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {subject.resources.length === 0 && (
                        <div className="text-sm text-gray-500 p-3">
                          No resources yet. Click "Add" to create your first resource for this subject.
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}

              {/* Personal Resources Folder */}
              {(filteredPersonalResources.length > 0 || activeTab === 'all') && (
                <Card className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleFolder('personal')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {expandedFolders.has('personal') ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Folder className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-lg">Personal Resources</CardTitle>
                        <Badge variant="secondary">
                          {filteredPersonalResources.length}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubjectForResource('');
                          setShowUploadModal(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>

                  {expandedFolders.has('personal') && (
                    <CardContent className="pl-8 space-y-2">
                      {filteredPersonalResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded transition-colors group"
                        >
                          <div
                            className="flex items-center space-x-2 flex-1 cursor-pointer"
                            onClick={() => handleResourceClick(resource)}
                          >
                            {getResourceIcon(resource.type)}
                            <span className="text-sm flex-1">{resource.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            <Badge
                              variant={resource.access === 'PRIVATE' ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {resource.access === 'PRIVATE' ? 'Private' : 'Shared'}
                            </Badge>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResourceClick(resource);
                              }}
                              title="View file"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Edit resource">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Delete resource">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredPersonalResources.length === 0 && (
                        <div className="text-sm text-gray-500 p-3">
                          No personal resources yet. Click "Add" to create your first personal resource.
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
            )
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <ResourceCreateDialog
        open={showUploadModal}
        onOpenChange={(open) => {
          setShowUploadModal(open);
          if (!open) setSelectedSubjectForResource("");
        }}
        courseId={classData?.courseCampus?.courseId}
        subjects={subjectsData || []}
        defaultSubjectId={selectedSubjectForResource || undefined}
        showAccessControl
        onCreated={() => {
          // Trigger refetch of resources data
          refetchResources();
        }}
      />

      {/* Resource Viewer */}
      <ResourceViewer
        isOpen={showResourceViewer}
        onClose={() => {
          setShowResourceViewer(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
        showDownload={true}
        showExternalLink={true}
      />
    </div>
  );
}