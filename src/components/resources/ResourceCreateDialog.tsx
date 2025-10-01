"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/feedback/dialog";
import { Button } from "@/components/ui/atoms/button";
import { Input } from "@/components/ui/atoms/input";
import { Textarea } from "@/components/ui/forms/textarea";
import { FileUpload } from "@/components/ui/forms/file-upload";
import { ResourceAccess, ResourceType } from "@/server/api/types/resource";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Upload } from "@/components/ui/icons/custom-icons";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export type SimpleSubject = { id: string; name: string; code?: string };

interface ResourceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string; // for cache invalidation
  subjects?: SimpleSubject[]; // if provided, allow associating with a subject; otherwise create personal
  defaultSubjectId?: string;
  onCreated?: () => void; // caller can refetch
  showAccessControl?: boolean; // allow choosing PRIVATE/SHARED
}

// Enhanced file type support
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ResourceCreateDialog({
  open,
  onOpenChange,
  courseId,
  subjects = [],
  defaultSubjectId,
  onCreated,
  showAccessControl = false,
}: ResourceCreateDialogProps) {
  const { data: session } = useSession();
  const utils = api.useContext();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>(ResourceType.LINK);
  const [resourceType, setResourceType] = useState("TEXTBOOK");
  const [subjectId, setSubjectId] = useState<string | "">(defaultSubjectId || "");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [access, setAccess] = useState<ResourceAccess>(ResourceAccess.PRIVATE);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset form when dialog is opened/closed
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setType(ResourceType.LINK);
      setResourceType("TEXTBOOK");
      setSubjectId(defaultSubjectId || "");
      setUrl("");
      setFiles([]);
      setIsUploading(false);
      setUploadProgress(0);
      setAccess(ResourceAccess.PRIVATE);
      setUploadError(null);
    }
  }, [open, defaultSubjectId]);

  // Upload mutation for resources (uses documents bucket)
  const uploadMutation = api.resource.uploadFile.useMutation();

  // Resource create
  const createResource = api.resource.create.useMutation({
    onSuccess: async () => {
      // Invalidate relevant queries
      try {
        if (courseId) {
          await utils.subject.getSubjectsByCourse.invalidate({ courseId, includeResourceCount: true });
        }
        // Invalidate both teacher and student resource queries
        await utils.resource.getTeacherResourcesGrouped.invalidate();
        await utils.resource.getStudentResourcesGrouped.invalidate();
      } catch {}

      toast({
        title: "Success",
        description: "Resource created successfully",
        variant: "default",
      });

      onCreated?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create resource",
        variant: "destructive",
      });
    },
  });

  // Handle file selection with validation
  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setUploadError(null);
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" exceeds 50MB limit`);
        continue;
      }

      // Check file type
      const isValidType = Object.keys(ALLOWED_FILE_TYPES).some(mimeType =>
        file.type === mimeType || file.type.startsWith(mimeType.split('/')[0] + '/')
      );

      if (!isValidType) {
        setUploadError(`File type "${file.type}" is not supported`);
        continue;
      }

      validFiles.push(file);
    }

    setFiles(validFiles);
  }, []);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !session?.user?.id || isUploading) return false;
    if (type === ResourceType.FILE) {
      return files.length > 0 || !!url.trim();
    }
    return !!url.trim();
  }, [title, type, files, url, session?.user?.id, isUploading]);

  const handleSubmit = async () => {
    if (!session?.user?.id || !canSubmit) return;

    let finalUrl = url;
    setUploadError(null);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // If file type selected and a file is provided, upload to storage to get URL
      if (type === ResourceType.FILE && files.length > 0) {
        const file = files[0];

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");

          const result = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            mimeType: file.type || "application/octet-stream",
            folder: "resources",
          });

          finalUrl = result.url;
          clearInterval(progressInterval);
          setUploadProgress(100);
        } catch (uploadError) {
          clearInterval(progressInterval);
          throw uploadError;
        }
      }

      await createResource.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type: type as any,
        url: finalUrl,
        access: access,
        ownerId: session.user.id,
        subjectId: subjectId || undefined,
        tags: subjectId ? [subjectId, resourceType] : [resourceType],
        settings: {
          ...(finalUrl && files[0] ? {
            fileName: files[0].name,
            pathHint: "resources",
            fileSize: files[0].size,
            mimeType: files[0].type,
          } : {}),
          resourceType: resourceType,
        },
      });
    } catch (error) {
      console.error('Resource creation error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to create resource');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const showSubjectSelect = subjects.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            {showSubjectSelect ? "Create a resource under a subject or as personal." : "Create a personal resource."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">{/* Scrollable content area */}

          <div className="space-y-6 py-2">
            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Error Display */}
            {uploadError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{uploadError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadError(null)}
                  className="ml-auto h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {showSubjectSelect && (
              <div>
                <label className="block text-sm font-medium mb-2">Subject (optional)</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isUploading}
                >
                  <option value="">Personal Resource</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 Notes"
                disabled={isUploading}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the resource"
                disabled={isUploading}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Resource Type *</label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isUploading}
                >
                  <option value="TEXTBOOK">📚 Textbook</option>
                  <option value="EBOOK">📖 E-Book</option>
                  <option value="VIDEO">🎥 Video</option>
                  <option value="ARTICLE">📄 Article</option>
                  <option value="WEBSITE">🌐 Website</option>
                  <option value="SOFTWARE">💻 Software</option>
                  <option value="EQUIPMENT">🔧 Equipment</option>
                  <option value="OTHER">📋 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Format *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ResourceType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isUploading}
                >
                  <option value={ResourceType.FILE}>📁 File Upload</option>
                  <option value={ResourceType.LINK}>🔗 URL/Link</option>
                </select>
              </div>
            </div>

            {type !== ResourceType.FILE && (
              <div>
                <label className="block text-sm font-medium mb-2">URL *</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/resource"
                  disabled={isUploading}
                  className="w-full"
                />
              </div>
            )}

            {type === ResourceType.FILE && (
              <div>
                <label className="block text-sm font-medium mb-2">Upload File *</label>
                <FileUpload
                  multiple={false}
                  onFilesSelected={handleFilesSelected}
                  helperText="Max 50MB. Supported: Images, Videos, Documents, Audio, Archives"
                  accept={ALLOWED_FILE_TYPES}
                  maxSize={MAX_FILE_SIZE}
                  disabled={isUploading}
                  showProgress={isUploading}
                  progress={uploadProgress}
                  isUploading={isUploading}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors"
                />
                {files.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{files[0].name}</span>
                      <span className="text-xs text-gray-500">
                        ({(files[0].size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {showAccessControl && (
                <div>
                  <label className="block text-sm font-medium mb-2">Sharing</label>
                  <select
                    value={access}
                    onChange={(e) => setAccess(e.target.value as ResourceAccess)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isUploading}
                  >
                    <option value={ResourceAccess.PRIVATE}>🔒 Private (only me)</option>
                    <option value={ResourceAccess.SHARED}>👥 Shared (visible to class)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t bg-gray-50 -mx-6 px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || createResource.isLoading}
            className="w-full sm:w-auto min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isUploading || createResource.isLoading}
            className="w-full sm:w-auto min-w-[140px] bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 animate-pulse" />
                Uploading...
              </div>
            ) : createResource.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              "Create Resource"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

