# Step-by-Step Implementation Guide

## 🎯 **Quick Overview**
Simple 2-week implementation to add subject organization to resources with folder structure UI.

## 📝 **Step 1: Database Schema Update (Day 1)**

### **Add Subject ID Column**
```sql
-- Add the column
ALTER TABLE "Resource" ADD COLUMN "subjectId" VARCHAR(255) NULL;

-- Add foreign key constraint
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" 
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX "Resource_subjectId_idx" ON "Resource"("subjectId");
```

### **Update Prisma Schema**
**File**: `prisma/schema.prisma`

```prisma
model Resource {
  id          String               @id @default(cuid())
  title       String
  description String?
  type        ResourceType
  url         String?
  tags        String[]
  access      ResourceAccess       @default(PRIVATE)
  settings    Json?
  ownerId     String
  parentId    String?
  subjectId   String?              // ADD THIS LINE
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  deletedAt   DateTime?
  status      SystemStatus         @default(ACTIVE)
  permissions ResourcePermission[]
  owner       User                 @relation("OwnedResources", fields: [ownerId], references: [id])
  parent      Resource?            @relation("ResourceHierarchy", fields: [parentId], references: [id])
  children    Resource[]           @relation("ResourceHierarchy")
  subject     Subject?             @relation(fields: [subjectId], references: [id]) // ADD THIS LINE

  @@map("resources")
}

model Subject {
  id                        String                        @id @default(cuid())
  code                      String                        @unique
  name                      String
  credits                   Float                         @default(1.0)
  status                    SystemStatus                  @default(ACTIVE)
  courseId                  String
  syllabus                  Json?
  bloomsDistribution        Json?
  createdAt                 DateTime                      @default(now())
  updatedAt                 DateTime                      @updatedAt
  // ... existing relations ...
  resources                 Resource[]                    // ADD THIS LINE
  course                    Course                        @relation(fields: [courseId], references: [id])
  // ... rest of existing relations ...
}
```

## 📝 **Step 2: Update Resource Creation APIs (Day 2-3)**

### **Update Resource Router**
**File**: `src/server/api/routers/resource.ts`

```typescript
// Update existing create endpoint to handle subjectId
create: protectedProcedure
  .input(createResourceSchema.extend({
    subjectId: z.string().optional(), // ADD THIS LINE
  }))
  .mutation(async ({ ctx, input }) => {
    const service = new ResourceService({ prisma: ctx.prisma });
    return service.createResource(input);
  }),

// Add new endpoint for grouped resources
getStudentResourcesGrouped: protectedProcedure
  .input(z.object({
    studentId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    // Get student enrollments with course/subject structure
    const enrollments = await ctx.prisma.studentEnrollment.findMany({
      where: {
        studentId: input.studentId,
        status: 'ACTIVE',
      },
      include: {
        class: {
          include: {
            courseCampus: {
              include: {
                course: {
                  include: {
                    subjects: {
                      where: { status: 'ACTIVE' },
                      include: {
                        resources: {
                          where: { 
                            status: 'ACTIVE',
                            OR: [
                              { access: 'PUBLIC' },
                              { access: 'SHARED' },
                              { ownerId: input.studentId }
                            ]
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get personal resources (no subject association)
    const personalResources = await ctx.prisma.resource.findMany({
      where: {
        ownerId: input.studentId,
        subjectId: null,
        status: 'ACTIVE',
      },
    });

    // Structure the response
    const result = {
      courses: enrollments.map(enrollment => ({
        id: enrollment.class.courseCampus.course.id,
        name: enrollment.class.courseCampus.course.name,
        code: enrollment.class.courseCampus.course.code,
        subjects: enrollment.class.courseCampus.course.subjects.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          resources: subject.resources,
        })),
      })),
      personal: personalResources,
    };

    return result;
  }),

// Add similar endpoint for teachers
getTeacherResourcesGrouped: protectedProcedure
  .input(z.object({
    teacherId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    // Get teacher's assigned subjects
    const assignments = await ctx.prisma.teacherSubjectAssignment.findMany({
      where: {
        qualification: {
          teacherId: input.teacherId,
        },
        status: 'ACTIVE',
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: {
                  where: { status: 'ACTIVE' },
                  include: {
                    resources: {
                      where: { status: 'ACTIVE' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get personal resources
    const personalResources = await ctx.prisma.resource.findMany({
      where: {
        ownerId: input.teacherId,
        subjectId: null,
        status: 'ACTIVE',
      },
    });

    // Structure response similar to student
    const result = {
      courses: assignments.map(assignment => ({
        id: assignment.courseCampus.course.id,
        name: assignment.courseCampus.course.name,
        code: assignment.courseCampus.course.code,
        subjects: assignment.courseCampus.course.subjects.map(subject => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          resources: subject.resources,
        })),
      })),
      personal: personalResources,
    };

    return result;
  }),
```

## 📝 **Step 3: Update System Admin Forms (Day 4)**

### **Update Course Resource Form**
**File**: `src/components/admin/courses/CourseForm.tsx`

Find the resource creation section and add subject selection:

```typescript
// Add state for subject selection
const [selectedSubjectForResource, setSelectedSubjectForResource] = useState<string>('');

// Update the resource form section
<div className="space-y-4">
  <h4 className="font-medium">Add Resource</h4>
  
  {/* Add Subject Selection */}
  <div>
    <Label htmlFor="resource-subject">Subject (Optional)</Label>
    <Select 
      value={selectedSubjectForResource} 
      onValueChange={setSelectedSubjectForResource}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select subject (leave empty for course-wide)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Course-wide resource</SelectItem>
        {courseSubjects?.map((subject) => (
          <SelectItem key={subject.id} value={subject.id}>
            {subject.name} ({subject.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Existing resource form fields */}
  <div>
    <Label htmlFor="resource-name">Resource Name</Label>
    <Input
      id="resource-name"
      value={newResource.name}
      onChange={(e) => setNewResource({...newResource, name: e.target.value})}
    />
  </div>
  
  {/* ... other existing fields ... */}

  <Button 
    type="button" 
    onClick={() => {
      const resourceToAdd = {
        ...newResource,
        subjectId: selectedSubjectForResource || null, // ADD THIS LINE
      };
      handleAddResource(resourceToAdd);
    }}
  >
    Add Resource
  </Button>
</div>
```

## 📝 **Step 4: Update Teacher Resource Forms (Day 5)**

### **Update Teacher Resource Creation**
**File**: `src/components/teacher/resources/ResourceForm.tsx`

Add subject selection to existing form:

```typescript
// Add to existing form
<FormField
  control={form.control}
  name="subjectId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subject</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="">Personal Resource</SelectItem>
          {teacherSubjects?.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              {subject.name} ({subject.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        Choose a subject to share with students, or leave empty for personal use
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## 📝 **Step 5: Create Folder Structure UI (Day 6-7)**

### **Student Resource Folder View**
**File**: `src/components/student/resources/ResourceFolderView.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Folder, FileText, Link, PlayCircle } from 'lucide-react';
import { api } from '@/trpc/react';

interface ResourceFolderViewProps {
  studentId: string;
}

export function ResourceFolderView({ studentId }: ResourceFolderViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const { data: resourcesData, isLoading } = api.resource.getStudentResourcesGrouped.useQuery({
    studentId,
  });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'FILE': return <FileText className="h-4 w-4" />;
      case 'LINK': return <Link className="h-4 w-4" />;
      case 'VIDEO': return <PlayCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <div>Loading resources...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Course Folders */}
      {resourcesData?.courses.map((course) => (
        <Card key={course.id} className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleFolder(course.id)}
          >
            <div className="flex items-center space-x-2">
              {expandedFolders.has(course.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{course.name}</CardTitle>
              <Badge variant="outline">{course.code}</Badge>
            </div>
          </CardHeader>
          
          {expandedFolders.has(course.id) && (
            <CardContent className="pl-8 space-y-3">
              {course.subjects.map((subject) => (
                <div key={subject.id}>
                  <div 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    onClick={() => toggleFolder(subject.id)}
                  >
                    {expandedFolders.has(subject.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Folder className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{subject.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {subject.resources.length} resources
                    </Badge>
                  </div>
                  
                  {expandedFolders.has(subject.id) && (
                    <div className="ml-6 mt-2 space-y-1">
                      {subject.resources.map((resource) => (
                        <div 
                          key={resource.id} 
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                          onClick={() => window.open(resource.url, '_blank')}
                        >
                          {getResourceIcon(resource.type)}
                          <span className="text-sm flex-1">{resource.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                      ))}
                      {subject.resources.length === 0 && (
                        <div className="text-sm text-gray-500 p-2">
                          No resources available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
      
      {/* Personal Resources Folder */}
      {resourcesData?.personal && resourcesData.personal.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleFolder('personal')}
          >
            <div className="flex items-center space-x-2">
              {expandedFolders.has('personal') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">My Personal Resources</CardTitle>
              <Badge variant="secondary">{resourcesData.personal.length}</Badge>
            </div>
          </CardHeader>
          
          {expandedFolders.has('personal') && (
            <CardContent className="pl-8 space-y-1">
              {resourcesData.personal.map((resource) => (
                <div 
                  key={resource.id} 
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                  onClick={() => window.open(resource.url, '_blank')}
                >
                  {getResourceIcon(resource.type)}
                  <span className="text-sm flex-1">{resource.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {resource.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
```

## 📝 **Step 6: Update Existing Pages (Day 8-9)**

### **Update Student Resources Page**
**File**: `src/app/(dashboard)/student/resources/page.tsx`

Replace existing resource list with folder view:

```typescript
import { ResourceFolderView } from '@/components/student/resources/ResourceFolderView';

export default function StudentResourcesPage() {
  const { data: session } = useSession();
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Resources</h1>
        <p className="text-muted-foreground">
          Access course materials and your personal resources
        </p>
      </div>
      
      <ResourceFolderView studentId={session?.user?.id || ''} />
    </div>
  );
}
```

### **Update Teacher Resources Page**
**File**: `src/app/(dashboard)/teacher/resources/page.tsx`

Similar update for teacher portal with folder view.

## ✅ **Testing Checklist**

- [ ] Database migration runs successfully
- [ ] Existing resources still accessible
- [ ] New resources can be created with subject association
- [ ] Folder structure displays correctly
- [ ] Student can access course and personal resources
- [ ] Teacher can manage subject-specific resources
- [ ] System admin can assign resources to subjects

This simplified approach achieves your folder structure goals with minimal changes and maximum compatibility!
