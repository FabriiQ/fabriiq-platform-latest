'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  X,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { api } from '@/trpc/react';

const documentUploadSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
});

type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

const DOCUMENT_TYPES = [
  { value: 'ADMISSION_FORM', label: 'Admission Form', required: true },
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', required: true },
  { value: 'PREVIOUS_MARKSHEET', label: 'Previous Marksheet', required: false },
  { value: 'TRANSFER_CERTIFICATE', label: 'Transfer Certificate', required: false },
  { value: 'PASSPORT_PHOTO', label: 'Passport Photo', required: true },
  { value: 'PARENT_ID_COPY', label: 'Parent ID Copy', required: true },
  { value: 'ADDRESS_PROOF', label: 'Address Proof', required: false },
  { value: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate', required: false },
  { value: 'FEE_RECEIPT', label: 'Fee Receipt', required: false },
  { value: 'OTHER', label: 'Other Document', required: false },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = {
  'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
};

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  studentName: string;
  onUploadComplete: () => void;
  isLoading?: boolean;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  enrollmentId,
  studentName,
  onUploadComplete,
  isLoading = false,
}: DocumentUploadDialogProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const form = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: '',
      title: '',
      description: '',
      isRequired: false,
    },
  });

  const watchDocumentType = form.watch('documentType');

  // Update form when document type changes
  const handleDocumentTypeChange = (value: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.value === value);
    if (docType) {
      form.setValue('title', docType.label);
      form.setValue('isRequired', docType.required);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          console.error(`${file.name}: ${error.message}`);
        });
      });
    },
  });

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileText className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadToSupabase = async (file: File, fileId: string): Promise<string> => {
    const fileName = `${enrollmentId}/${Date.now()}-${file.name}`;

    try {
      setUploadFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, progress: 0, status: 'uploading' }
          : f
      ));

      const { data, error } = await supabase.storage
        .from('enrollment-documents')
        .upload(fileName, file);

      if (error) {
        setUploadFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error', error: error.message }
            : f
        ));
        throw error;
      } else {
        const publicUrl = supabase.storage
          .from('enrollment-documents')
          .getPublicUrl(fileName).data.publicUrl;

        setUploadFiles(prev => prev.map(f =>
          f.id === fileId
            ? { ...f, progress: 100, status: 'completed', url: publicUrl }
            : f
        ));
        return publicUrl;
      }
    } catch (error) {
      setUploadFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'error', error: 'Upload failed' }
          : f
      ));
      throw error;
    }
  };

  const uploadDocumentMutation = api.document.uploadDocument.useMutation({
    onSuccess: () => {
      onUploadComplete();
      // Reset form and files
      form.reset();
      setUploadFiles([]);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Upload failed:', error.message);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleSubmit = async (data: DocumentUploadFormData) => {
    if (uploadFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      // Upload files to Supabase first
      const uploadPromises = uploadFiles
        .filter(f => f.status === 'pending')
        .map(uploadFile => uploadToSupabase(uploadFile.file, uploadFile.id));

      await Promise.all(uploadPromises);

      // Get completed uploads
      const completedFiles = uploadFiles
        .filter(f => f.status === 'completed')
        .map(f => ({
          name: f.file.name,
          url: f.url!,
          size: f.file.size,
          type: f.file.type,
        }));

      if (completedFiles.length > 0) {
        // Save document metadata to database
        await uploadDocumentMutation.mutateAsync({
          enrollmentId,
          documentType: data.documentType,
          title: data.title,
          description: data.description,
          isRequired: data.isRequired,
          files: completedFiles,
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleDocumentTypeChange(value);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((docType) => (
                            <SelectItem key={docType.value} value={docType.value}>
                              <div className="flex items-center gap-2">
                                <span>{docType.label}</span>
                                {docType.required && (
                                  <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter document title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                "hover:border-primary hover:bg-primary/5"
              )}
            >
              <input {...getInputProps()} />
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              {isDragActive ? (
                <p>Drop the files here...</p>
              ) : (
                <div>
                  <p className="mb-2">Drag & drop files here, or click to select</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                  </p>
                </div>
              )}
            </div>

            {/* File List */}
            {uploadFiles.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="font-medium">Selected Files ({uploadFiles.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((uploadFile) => (
                    <div key={uploadFile.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <div className="flex-shrink-0">
                        {getFileIcon(uploadFile.file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        {uploadFile.status === 'uploading' && (
                          <Progress value={uploadFile.progress} className="mt-1" />
                        )}
                        {uploadFile.error && (
                          <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {uploadFile.status === 'completed' && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {uploadFile.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {uploadFile.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploadFile.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={isUploading || uploadFiles.length === 0}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Documents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
