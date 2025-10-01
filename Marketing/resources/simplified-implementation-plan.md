# Simplified Resource Management Enhancement Plan

## 🎯 **Objective**
Add subject-based organization to existing resource system with minimal changes and folder structure UI for better organization.

## 📋 **Core Requirements**
1. **Add `subjectId` to existing Resource table** (minimal schema change)
2. **Update resource creation forms** in System Admin and Teacher Portal
3. **Implement folder structure UI** for Students and Teachers
4. **Maintain existing functionality** without breaking changes

## 🔧 **Implementation Approach**

### **Phase 1: Database Schema Update (Minimal Change)**

#### **Add Single Column to Resource Table**
```sql
-- Simple schema addition
ALTER TABLE "Resource" ADD COLUMN "subjectId" VARCHAR(255) NULL;

-- Add foreign key constraint
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" 
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX "Resource_subjectId_idx" ON "Resource"("subjectId");
```

#### **Update Prisma Schema**
```prisma
model Resource {
  // ... existing fields ...
  subjectId   String?  // Add this field
  subject     Subject? @relation(fields: [subjectId], references: [id])
  // ... rest remains same ...
}

model Subject {
  // ... existing fields ...
  resources   Resource[] // Add this relation
  // ... rest remains same ...
}
```

### **Phase 2: Update Resource Creation Forms**

#### **System Admin - Course Management**
**File to Update**: `src/components/admin/courses/CourseForm.tsx`

**Changes Needed**:
1. Add subject dropdown when adding resources to course
2. Update resource creation to include `subjectId`
3. Show subject association in resource list

```typescript
// Add to existing CourseForm component
const [selectedSubject, setSelectedSubject] = useState<string>('');

// Update resource creation handler
const handleAddResource = async (resourceData) => {
  const newResource = {
    ...resourceData,
    subjectId: selectedSubject, // Add subject association
    // ... existing fields
  };
  
  // Use existing resource creation logic
  await createResource(newResource);
};
```

#### **Teacher Portal - Resource Management**
**File to Update**: `src/components/teacher/resources/ResourceForm.tsx`

**Changes Needed**:
1. Add subject selection to existing form
2. Filter subjects by teacher's assigned subjects
3. Update form validation to include subject

```typescript
// Fetch teacher's assigned subjects
const { data: teacherSubjects } = api.teacher.getAssignedSubjects.useQuery();

// Add subject selection to existing form
<FormField
  control={form.control}
  name="subjectId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subject</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="Select subject" />
        </SelectTrigger>
        <SelectContent>
          {teacherSubjects?.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              {subject.name} ({subject.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### **Phase 3: Folder Structure UI Implementation**

#### **Student Portal - Folder View**
**New Component**: `src/components/student/resources/ResourceFolderView.tsx`

```typescript
interface ResourceFolderViewProps {
  studentId: string;
}

export function ResourceFolderView({ studentId }: ResourceFolderViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Fetch student's enrolled courses and subjects
  const { data: enrollmentData } = api.student.getEnrollments.useQuery({ studentId });
  
  // Fetch resources organized by course/subject
  const { data: resourcesData } = api.resource.getStudentResourcesGrouped.useQuery({ studentId });

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Course Folders */}
      {enrollmentData?.map((enrollment) => (
        <Card key={enrollment.course.id} className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleFolder(enrollment.course.id)}
          >
            <div className="flex items-center space-x-2">
              {expandedFolders.has(enrollment.course.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{enrollment.course.name}</CardTitle>
              <Badge variant="outline">{enrollment.course.code}</Badge>
            </div>
          </CardHeader>
          
          {expandedFolders.has(enrollment.course.id) && (
            <CardContent className="pl-8">
              {/* Subject Folders */}
              {enrollment.course.subjects?.map((subject) => (
                <div key={subject.id} className="mb-4">
                  <div 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
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
                      {resourcesData?.[subject.id]?.length || 0} resources
                    </Badge>
                  </div>
                  
                  {expandedFolders.has(subject.id) && (
                    <div className="ml-6 mt-2 space-y-2">
                      {resourcesData?.[subject.id]?.map((resource) => (
                        <div key={resource.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          {getResourceIcon(resource.type)}
                          <span className="text-sm">{resource.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
      
      {/* Personal Resources Folder */}
      <Card className="overflow-hidden">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50"
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
          </div>
        </CardHeader>
        
        {expandedFolders.has('personal') && (
          <CardContent className="pl-8">
            {/* Personal resources list */}
            {resourcesData?.personal?.map((resource) => (
              <div key={resource.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                {getResourceIcon(resource.type)}
                <span className="text-sm">{resource.title}</span>
                <Badge variant="outline" className="text-xs">
                  {resource.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
```

#### **Teacher Portal - Folder View**
**New Component**: `src/components/teacher/resources/TeacherResourceFolderView.tsx`

Similar structure to student view but with:
- Only subjects assigned to the teacher
- Ability to create/edit resources
- Resource management actions

### **Phase 4: Update Existing TROC APIs (Minimal Changes)**

#### **Add Subject Grouping to Existing Endpoints**

**Update**: `src/server/api/routers/resource.ts`

```typescript
// Add new endpoint for grouped resources
getStudentResourcesGrouped: protectedProcedure
  .input(z.object({
    studentId: z.string(),
  }))
  .query(async ({ ctx, input }) => {
    const service = new ResourceService({ prisma: ctx.prisma });
    
    // Get student's enrollments with courses and subjects
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
                          where: { status: 'ACTIVE' },
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

    // Get personal resources
    const personalResources = await ctx.prisma.resource.findMany({
      where: {
        ownerId: input.studentId,
        subjectId: null, // Personal resources have no subject
        status: 'ACTIVE',
      },
    });

    // Group resources by subject
    const groupedResources: Record<string, any[]> = {};
    
    enrollments.forEach(enrollment => {
      enrollment.class.courseCampus.course.subjects.forEach(subject => {
        groupedResources[subject.id] = subject.resources;
      });
    });
    
    groupedResources['personal'] = personalResources;
    
    return groupedResources;
  }),
```

## 📅 **Implementation Timeline (2 Weeks)**

### **Week 1: Backend Updates**
- **Day 1-2**: Add `subjectId` column to Resource table
- **Day 3-4**: Update resource creation APIs to handle subject association
- **Day 5**: Add grouped resource retrieval endpoint
- **Day 6-7**: Testing and validation

### **Week 2: Frontend Updates**
- **Day 1-2**: Update System Admin course resource forms
- **Day 3-4**: Update Teacher Portal resource forms
- **Day 5-6**: Implement folder structure UI components
- **Day 7**: Integration testing and deployment

## ✅ **Benefits of This Approach**

1. **Minimal Database Changes** - Only one new column
2. **No Breaking Changes** - Existing functionality preserved
3. **Enhanced Organization** - Folder structure improves UX
4. **Simple Implementation** - Reuses existing components and APIs
5. **Quick Delivery** - 2-week timeline vs 6-week complex approach

## 🔄 **Migration Strategy**

### **Existing Resources**
- Resources without `subjectId` remain accessible
- Can be gradually associated with subjects
- No data loss or system downtime

### **Backward Compatibility**
- All existing APIs continue to work
- UI gracefully handles resources without subjects
- Progressive enhancement approach

This simplified approach achieves your goals with minimal risk and maximum efficiency while maintaining system stability.
