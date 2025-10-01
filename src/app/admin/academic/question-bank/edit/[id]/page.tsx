'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionEditor } from '@/features/question-bank/components/editor/QuestionEditor';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';

/**
 * Question Edit Page
 * 
 * This page handles question editing for a specific question.
 * It extracts the question ID from the URL parameters and uses the QuestionEditor component.
 */
export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const questionId = params?.id as string;

  // Fetch question to edit
  const { data: question, isLoading: isLoadingQuestion, error: questionError } = api.questionBank.getQuestion.useQuery(
    { id: questionId },
    {
      enabled: !!questionId,
      retry: 1,
      onError: (error) => {
        console.error('Error fetching question:', error);
        toast({
          title: 'Error',
          description: `Question not found: ${error.message}`,
          variant: 'error',
        });
        // Redirect to question bank list after a short delay
        setTimeout(() => {
          router.push('/admin/academic/question-bank');
        }, 2000);
      }
    }
  );

  // Handle successful save
  const handleSave = (savedQuestion: any) => {
    toast({
      title: 'Success',
      description: 'Question updated successfully!',
    });
    // Navigate back to the question bank detail page
    router.push(`/admin/academic/question-bank/${savedQuestion.questionBankId}`);
  };

  // Handle cancel
  const handleCancel = () => {
    if (question?.questionBankId) {
      router.push(`/admin/academic/question-bank/${question.questionBankId}`);
    } else {
      router.push('/admin/academic/question-bank');
    }
  };

  // Show loading state
  if (isLoadingQuestion) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <p className="mt-2 text-gray-600">Fetching question details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (questionError || !question) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">
            {questionError?.message || 'Question not found'}
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/academic/question-bank">
              Back to Question Banks
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Question</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
          <CardDescription>
            Edit the question details and content below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionEditor
            initialQuestion={{
              ...question,
              content: question.content as any, // Type assertion for JsonValue to QuestionContent
              metadata: question.metadata as Record<string, any> | undefined, // Type assertion for JsonValue to metadata
              courseId: question.courseId || undefined, // Convert null to undefined
              topicId: question.topicId || undefined, // Convert null to undefined
              sourceReference: question.sourceReference || undefined, // Convert null to undefined
              gradeLevel: question.gradeLevel ?? undefined // Convert null to undefined
            }}
            questionBankId={question.questionBankId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
