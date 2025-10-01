'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Play, HelpCircle, ChevronLeft, ArrowRight } from "lucide-react";
import { ActivityV2Creator } from "@/features/activities-v2/components/ActivityV2Creator";
import { SubjectTopicSelector } from "@/features/activities-v2/components/creation/SubjectTopicSelector";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface CreateActivityClientProps {
  classId: string;
}

export function CreateActivityClient({ classId }: CreateActivityClientProps) {
  const router = useRouter();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedActivityType, setSelectedActivityType] = useState<'quiz' | 'reading' | 'video' | null>(null);
  const [step, setStep] = useState<'subject' | 'topic' | 'activity-type' | 'create'>('subject');

  // Always call hooks at the top level - never conditionally
  // Fetch topics for the selected subject
  const { data: topicHierarchy, isLoading: isLoadingTopics } = api.subjectTopic.getHierarchy.useQuery(
    { subjectId: selectedSubjectId },
    { enabled: !!selectedSubjectId }
  );

  // Also fetch topics using the subject.getTopics query for consistency
  const { data: topics } = api.subject.getTopics.useQuery(
    { subjectId: selectedSubjectId },
    { enabled: !!selectedSubjectId }
  );

  // Fetch subjects for this specific class
  const { data: classSubjects } = api.class.getSubjects.useQuery({ classId });

  // Activity types (V2 is now the default and only option)
  const activityTypes = [
    {
      id: 'quiz',
      name: 'Quiz',
      description: 'Advanced quiz with Question Bank integration, achievements, and analytics',
      icon: HelpCircle,
      features: ['Question Bank', 'Auto-grading', 'Achievements', 'Analytics', 'Time tracking'],
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'reading',
      name: 'Reading',
      description: 'Interactive reading activities with progress tracking and engagement features',
      icon: BookOpen,
      features: ['Progress tracking', 'Bookmarks', 'Highlights', 'Completion criteria'],
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'video',
      name: 'Video',
      description: 'Video activities with watch tracking and interactive elements',
      icon: Play,
      features: ['Watch tracking', 'Interaction points', 'Multi-provider support'],
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setStep('topic');
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopicId(topicId);
    setStep('activity-type');
  };

  const handleSkipTopic = () => {
    setSelectedTopicId('');
    setStep('activity-type');
  };

  const handleActivityTypeSelect = (activityType: 'quiz' | 'reading' | 'video') => {
    setSelectedActivityType(activityType);
    setStep('create');
  };

  const handleSuccess = (activity: any) => {
    toast.success('Activity created successfully!');
    router.push(`/teacher/classes/${classId}/activities`);
  };

  const handleCancel = () => {
    router.push(`/teacher/classes/${classId}/activities`);
  };

  const handleBack = () => {
    if (step === 'topic') {
      setStep('subject');
      setSelectedSubjectId('');
      setSelectedTopicId('');
    } else if (step === 'activity-type') {
      setStep('topic');
      setSelectedTopicId('');
    } else if (step === 'create') {
      setStep('activity-type');
      setSelectedActivityType(null);
    }
  };

  // Subject and topic selection step
  if (step === 'subject' || step === 'topic') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create Activity</h1>
          <p className="text-muted-foreground">Select subject and topic for your activity</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <SubjectTopicSelector
            selectedSubjectId={selectedSubjectId}
            selectedTopicId={selectedTopicId}
            onSubjectChange={handleSubjectSelect}
            onTopicChange={(topicId) => {
              setSelectedTopicId(topicId || '');
              if (selectedSubjectId) {
                setStep('activity-type');
              }
            }}
            showTopicSelection={true}
            allowSkipTopic={true}
            classId={classId}
          />

          {selectedSubjectId && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setStep('activity-type')}
                className="gap-2"
              >
                Continue to Activity Type
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }



  // Activity type selection step
  if (step === 'activity-type') {
    // Use the class subjects
    const selectedSubject = classSubjects?.find(s => s.id === selectedSubjectId);
    const selectedTopic = topics?.find(t => t.id === selectedTopicId);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Subject Selection
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Select Activity Type</h2>
            <p className="text-muted-foreground">
              Subject: {selectedSubject?.name} ({selectedSubject?.code})
              {selectedTopic && ` • Topic: ${selectedTopic.title}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activityTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all duration-200 ${type.color}`}
                onClick={() => handleActivityTypeSelect(type.id as 'quiz' | 'reading' | 'video')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {type.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Activity creation step
  if (step === 'create' && selectedActivityType) {
    // Use the class subjects
    const selectedSubject = classSubjects?.find(s => s.id === selectedSubjectId);
    const selectedTopic = topics?.find(t => t.id === selectedTopicId);
    const selectedType = activityTypes.find(t => t.id === selectedActivityType);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Activity Types
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {selectedType?.icon && <selectedType.icon className="h-5 w-5" />}
              Create {selectedType?.name}
            </h2>
            <p className="text-muted-foreground">
              Subject: {selectedSubject?.name} ({selectedSubject?.code})
              {selectedTopic && ` • Topic: ${selectedTopic.title}`}
            </p>
          </div>
        </div>

        <ActivityV2Creator
          classId={classId}
          subjectId={selectedSubjectId}
          topicId={selectedTopicId}
          activityType={selectedActivityType}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // This should not happen, but fallback to subject selection
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create Activity</h1>
        <p className="text-muted-foreground">Select a subject for your activity</p>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
