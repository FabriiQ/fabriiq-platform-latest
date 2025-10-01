'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActivityV2Creator } from "@/features/activities-v2/components/ActivityV2Creator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface CreateActivityV2ClientProps {
  activityType: 'quiz' | 'reading' | 'video';
  classId: string;
  subjects: Subject[];
}

export function CreateActivityV2Client({ 
  activityType, 
  classId, 
  subjects 
}: CreateActivityV2ClientProps) {
  const router = useRouter();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsReady(true);
  };

  const handleSuccess = (activity: any) => {
    toast.success('Activity created successfully!');
    // Navigate back to activities list
    router.push(`/teacher/classes/${classId}/activities`);
  };

  const handleCancel = () => {
    // Navigate back to activity creation page
    router.push(`/teacher/classes/${classId}/activities/create`);
  };

  const getActivityTypeInfo = () => {
    switch (activityType) {
      case 'quiz':
        return {
          title: 'Quiz V2',
          description: 'Create an advanced quiz with Question Bank integration, auto-grading, and achievement system.',
          icon: '🧠',
          features: ['Question Bank Integration', 'Auto-grading', 'Achievement System', 'Analytics', 'Time Tracking']
        };
      case 'reading':
        return {
          title: 'Reading V2',
          description: 'Create interactive reading activities with progress tracking and engagement features.',
          icon: '📖',
          features: ['Progress Tracking', 'Bookmarks & Highlights', 'Completion Criteria', 'Engagement Analytics']
        };
      case 'video':
        return {
          title: 'Video V2',
          description: 'Create video activities with watch tracking and interactive elements.',
          icon: '🎥',
          features: ['Watch Progress Tracking', 'Interaction Points', 'Multi-provider Support', 'Engagement Analytics']
        };
      default:
        return {
          title: 'Activity V2',
          description: 'Create an advanced activity.',
          icon: '📝',
          features: []
        };
    }
  };

  const activityInfo = getActivityTypeInfo();

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleCancel}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activity Types
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {activityInfo.icon} {activityInfo.title}
            </h2>
            <p className="text-muted-foreground">{activityInfo.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select onValueChange={handleSubjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject for this activity" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the subject this activity belongs to
              </p>
            </div>

            {subjects.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No subjects found for this class. Please add subjects to the class before creating activities.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h4 className="font-medium">Features included:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activityInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={() => setIsReady(true)} 
                disabled={!selectedSubjectId || subjects.length === 0}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setIsReady(false)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Configuration
        </Button>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {activityInfo.icon} {activityInfo.title}
          </h2>
          <p className="text-muted-foreground">
            Subject: {subjects.find(s => s.id === selectedSubjectId)?.name}
          </p>
        </div>
      </div>

      <ActivityV2Creator
        classId={classId}
        subjectId={selectedSubjectId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
