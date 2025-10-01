"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, File, X } from "lucide-react";
import { StudentWithSubmission } from "./StudentList";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/feedback/toast";

// Define the schema for grading form
const gradingSchema = z.object({
  score: z.coerce.number().min(0, "Score must be at least 0"),
  feedback: z.string().optional(),
});

export type GradingFormValues = z.infer<typeof gradingSchema>;

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface GradingFormProps {
  selectedStudentId: string | null;
  students: StudentWithSubmission[];
  maxScore: number;
  onSubmit: (data: GradingFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultValues?: GradingFormValues;
  assessmentId: string;
  onSubmissionCreated?: () => void; // Callback to refresh parent data
}

export function GradingForm({
  selectedStudentId,
  students,
  maxScore,
  onSubmit,
  onCancel,
  isSubmitting,
  defaultValues = { score: 0, feedback: "" },
  assessmentId,
  onSubmissionCreated,
}: GradingFormProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);

  const form = useForm<GradingFormValues>({
    resolver: zodResolver(gradingSchema),
    defaultValues,
  });

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Check if the student has a submission
  const hasSubmission = selectedStudent?.submission !== undefined;

  console.log('GradingForm - Selected student:', selectedStudent);
  console.log('GradingForm - Has submission:', hasSubmission);

  // API mutations
  const createSubmissionMutation = api.assessment.createSubmission.useMutation();
  const uploadFileMutation = api.assessment.uploadSubmissionFile.useMutation();

  // File upload configuration
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_FILE_TYPES = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/mp4': ['.m4a'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  };

  // Handle file upload with automatic submission creation
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!selectedStudentId || !selectedStudent) return;

    let submissionId = selectedStudent.submission?.id;

    // If no submission exists, create one first
    if (!submissionId) {
      setIsCreatingSubmission(true);
      try {
        const newSubmission = await createSubmissionMutation.mutateAsync({
          studentId: selectedStudentId,
          assessmentId,
          answers: [], // Empty answers for file-based submission
        });
        submissionId = newSubmission.id;
        toast({
          title: "Success",
          description: "Submission created successfully",
          variant: "success",
        });

        // Notify parent to refresh data
        onSubmissionCreated?.();
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to create submission: ${error.message}`,
          variant: "error",
        });
        setIsCreatingSubmission(false);
        return;
      }
      setIsCreatingSubmission(false);
    }

    // Upload each file
    for (const file of files) {
      const fileId = Math.random().toString(36).substr(2, 9);
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        status: 'uploading',
      };

      setUploadedFiles(prev => [...prev, newFile]);

      try {
        // Convert file to base64
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:mime/type;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload file
        const result = await uploadFileMutation.mutateAsync({
          submissionId: submissionId!,
          fileName: file.name,
          fileData,
          fileSize: file.size,
          mimeType: file.type,
        });

        // Update file status
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                id: result.id,
                url: result.url,
                status: 'completed' as const,
                uploadProgress: 100,
              }
            : f
        ));

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
          variant: "success",
        });

        // Trigger parent refresh
        onSubmissionCreated?.();

      } catch (error: any) {
        setUploadedFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error' as const }
            : f
        ));
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: "error",
        });
      }
    }
  }, [selectedStudentId, selectedStudent, assessmentId, createSubmissionMutation, uploadFileMutation, toast]);

  // Handle file removal
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      toast({
        title: "Some files were rejected",
        description: "Please check file size and type requirements",
        variant: "error",
      });
    }
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles);
    }
  }, [handleFileUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!selectedStudentId || !selectedStudent) {
    return (
      <div className="flex flex-col items-center justify-center h-full border rounded-md p-8">
        <p className="text-gray-500 mb-4">
          Select a student from the list to grade their submission
        </p>
      </div>
    );
  }

  // Render the grading form with file upload capability
  const renderGradingForm = () => (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Student Submission</h3>
            {!hasSubmission && (
              <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                No submission yet
              </span>
            )}
          </div>

          {/* File Upload Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${isCreatingSubmission ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-primary">Drop files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Images, Audio, Video, Documents up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Uploaded Files:</h4>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {file.status === 'completed' && (
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    )}
                    {file.status === 'error' && (
                      <div className="h-2 w-2 bg-red-500 rounded-full" />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isCreatingSubmission && (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
              <span className="text-sm text-blue-700">Creating submission...</span>
            </div>
          )}
        </div>

        {/* Grading Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Grading</h3>

          <FormField
            control={form.control}
            name="score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Score</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={maxScore}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Maximum score: {maxScore}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="feedback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feedback</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide feedback to the student"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isCreatingSubmission}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isCreatingSubmission}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Grade...
              </>
            ) : hasSubmission ? (
              "Update Grade"
            ) : (
              "Create Submission & Grade"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Grade Student: {selectedStudent.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderGradingForm()}
      </CardContent>
    </Card>
  );
}
