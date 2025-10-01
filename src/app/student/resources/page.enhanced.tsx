"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResourceCreateDialog } from "@/components/resources/ResourceCreateDialog";
import { FileText, Folder, ChevronDown, ChevronRight, Play, Link as LinkIcon } from "@/components/ui/icons";

export default function StudentResourcesPageEnhanced() {
  const { data: session } = useSession();
  const studentId = session?.user?.id;

  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: grouped, isLoading } = api.resource.getStudentResourcesGrouped.useQuery(
    { studentId: studentId || "" },
    { enabled: !!studentId }
  );

  if (!studentId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to view your resources</p>
        </div>
      </div>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "FILE":
        return <FileText className="h-4 w-4" />;
      case "VIDEO":
        return <Play className="h-4 w-4" />;
      case "LINK":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Filter personal by search and tab
  const personalFiltered = (grouped?.personal || []).filter((r: any) => {
    const matchesSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || (activeTab === "private" && r.access === "PRIVATE");
    return matchesSearch && matchesTab;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Resources</h1>
          <p className="text-muted-foreground">Personal uploads and course materials</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add Personal Resource</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input placeholder="Search personal resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="private">Private</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Personal Resources */}
      <Card className="overflow-hidden">
        <CardHeader className="cursor-pointer" onClick={() => toggle("personal")}>
          <div className="flex items-center gap-2">
            {expanded.has("personal") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Folder className="h-5 w-5 text-purple-600" />
            <CardTitle>Personal Resources</CardTitle>
            <Badge variant="secondary">{personalFiltered.length}</Badge>
          </div>
        </CardHeader>
        {expanded.has("personal") && (
          <CardContent className="pl-8 space-y-2">
            {personalFiltered.map((r: any) => (
              <div key={r.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                {getIcon(r.type)}
                <span className="text-sm">{r.title}</span>
                <Badge variant="outline" className="ml-auto text-xs">{r.type}</Badge>
              </div>
            ))}
            {personalFiltered.length === 0 && (
              <div className="text-sm text-muted-foreground p-2">No personal resources yet</div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Course Resources (view only) */}
      {(grouped?.courses || []).map((course: any) => (
        <Card key={course.id} className="overflow-hidden">
          <CardHeader className="cursor-pointer" onClick={() => toggle(course.id)}>
            <div className="flex items-center gap-2">
              {expanded.has(course.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Folder className="h-5 w-5 text-blue-600" />
              <CardTitle>{course.name}</CardTitle>
              <Badge variant="outline">{course.code}</Badge>
            </div>
          </CardHeader>
          {expanded.has(course.id) && (
            <CardContent className="pl-8 space-y-3">
              {course.subjects.map((subject: any) => (
                <Card key={subject.id} className="overflow-hidden">
                  <CardHeader className="cursor-pointer" onClick={() => toggle(subject.id)}>
                    <div className="flex items-center gap-2">
                      {expanded.has(subject.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Folder className="h-5 w-5 text-green-600" />
                      <CardTitle>{subject.name}</CardTitle>
                      <Badge variant="outline">{subject.code}</Badge>
                    </div>
                  </CardHeader>
                  {expanded.has(subject.id) && (
                    <CardContent className="pl-6 space-y-2">
                      {subject.resources.map((r: any) => (
                        <div key={r.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                          {getIcon(r.type)}
                          <span className="text-sm">{r.title}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{r.type}</Badge>
                        </div>
                      ))}
                      {subject.resources.length === 0 && (
                        <div className="text-sm text-muted-foreground p-2">No resources for this subject yet.</div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </CardContent>
          )}
        </Card>
      ))}

      {/* Create personal resource dialog only */}
      <ResourceCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        subjects={[]}
        showAccessControl={false}
      />
    </div>
  );
}

