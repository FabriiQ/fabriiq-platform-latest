'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { QuestionType, DifficultyLevel, SystemStatus } from '../../models/types';
import { parseCSV, generateSampleCSV } from '../../utils/csv-parser';
import { parseExcel, generateSampleExcel } from '../../utils/excel-parser';
import { parseJSON, generateSampleJSON } from '../../utils/json-parser';
import { Download, FileText, AlertCircle, CheckCircle, X, CloudUpload } from 'lucide-react';

interface BulkUploadFormProps {
  questionBankId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

type FileFormat = 'csv' | 'excel' | 'json';

interface ValidationError {
  row: number;
  errors: string[];
  field?: string; // The specific field that caused the error
  value?: string; // The invalid value
  suggestion?: string; // Suggestion for fixing the error
}

/**
 * Bulk Upload Form Component
 *
 * This component provides a form for uploading questions in bulk to a question bank.
 * It supports CSV, Excel, and JSON file formats.
 */
export const BulkUploadForm: React.FC<BulkUploadFormProps> = ({
  questionBankId,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for form
  const [fileFormat, setFileFormat] = useState<FileFormat>('csv');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validateOnly, setValidateOnly] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    totalRows: number;
    successfulRows: number;
    errorRows: number;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string>('');

  // Get question bank details with associated subject information
  const { data: questionBank } = api.questionBank.getQuestionBank.useQuery(
    { id: questionBankId },
    { enabled: !!questionBankId }
  );

  // Extract subject information from the question bank's questions
  const questionBankSubject = questionBank?.questions?.[0]?.subject;
  const selectedSubjectId = questionBankSubject?.id || '';
  const selectedSubject = questionBankSubject;

  // Verify questions in database after upload
  const { data: verificationData, refetch: refetchVerification } = api.questionBank.verifyQuestionsInDatabase.useQuery(
    { questionBankId, limit: 10 },
    {
      enabled: false, // Only fetch when explicitly requested
      refetchOnWindowFocus: false
    }
  );



  // Bulk upload mutation
  const bulkUploadMutation = api.questionBank.bulkUploadQuestions.useMutation({
    onSuccess: (data) => {
      setUploadStatus('Upload completed successfully!');
      setCurrentlyProcessing('');

      toast({
        title: 'Success',
        description: `Successfully uploaded ${data.successful} out of ${data.total} questions.${data.failed > 0 ? ` ${data.failed} questions failed.` : ''}`,
      });

      setUploadProgress(100);
      setUploadStats({
        totalRows: data.total,
        successfulRows: data.successful,
        errorRows: data.failed
      });
      setIsUploading(false);

      // Show detailed results
      if (data.errors && data.errors.length > 0) {
        console.log('Upload errors:', data.errors);
      }

      // Verify questions were saved to database
      setTimeout(() => {
        refetchVerification();
      }, 1000);

      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      setUploadStatus('Upload failed');
      setCurrentlyProcessing('');

      toast({
        title: 'Error',
        description: `Failed to upload questions: ${error.message}`,
        variant: 'error',
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationErrors([]);
      setValidationSuccess(false);
      setUploadStats(null);
    }
  };

  // Handle file format change
  const handleFileFormatChange = (value: string) => {
    setFileFormat(value as FileFormat);
    setSelectedFile(null);
    setValidationErrors([]);
    setValidationSuccess(false);
    setUploadStats(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle question type change
  const handleQuestionTypeChange = (value: string) => {
    setQuestionType(value as QuestionType);
  };



  // Handle validate only change
  const handleValidateOnlyChange = (checked: boolean) => {
    setValidateOnly(checked);
  };

  // Handle download sample
  const handleDownloadSample = () => {
    let sampleData: string | Blob;
    let fileName: string;
    let mimeType: string;

    switch (fileFormat) {
      case 'csv':
        sampleData = generateSampleCSV(questionType);
        fileName = `sample_${questionType.toLowerCase()}_questions.csv`;
        mimeType = 'text/csv';
        break;
      case 'excel':
        sampleData = generateSampleExcel(questionType);
        fileName = `sample_${questionType.toLowerCase()}_questions.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'json':
        sampleData = generateSampleJSON(questionType);
        fileName = `sample_${questionType.toLowerCase()}_questions.json`;
        mimeType = 'application/json';
        break;
      default:
        return;
    }

    // Create download link
    const blob = sampleData instanceof Blob ? sampleData : new Blob([sampleData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle validate
  const handleValidate = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to validate.',
        variant: 'error',
      });
      return;
    }

    // Validate subject information
    if (!selectedSubjectId) {
      toast({
        title: 'Subject Information Missing',
        description: 'This question bank has no existing questions to determine the target subject. Please add at least one question manually first.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setValidationErrors([]);
    setValidationSuccess(false);
    setUploadStats(null);
    setUploadStatus('Validating file...');
    setCurrentlyProcessing('Reading file contents');

    try {
      let parseResult;

      switch (fileFormat) {
        case 'csv':
          parseResult = await parseCSV(selectedFile, questionBankId, selectedSubjectId);
          break;
        case 'excel':
          parseResult = await parseExcel(selectedFile, questionBankId, selectedSubjectId);
          break;
        case 'json':
          parseResult = await parseJSON(selectedFile, questionBankId, selectedSubjectId);
          break;
        default:
          throw new Error('Unsupported file format');
      }

      // Additional validation for subject consistency
      if (parseResult.questions.length > 0) {
        const subjectValidationErrors: ValidationError[] = [];

        parseResult.questions.forEach((question, index) => {
          if (question.subjectId && question.subjectId !== selectedSubjectId) {
            subjectValidationErrors.push({
              row: index + 1,
              errors: [`Subject mismatch: CSV contains subjectId "${question.subjectId}" but selected subject is "${selectedSubject?.name}" (${selectedSubjectId}). Please ensure all questions belong to the selected subject.`],
              field: 'subjectId',
              value: question.subjectId,
              suggestion: `Remove the subjectId column from CSV or change it to "${selectedSubjectId}" to match the selected subject.`
            });
          }
        });

        // Add subject validation errors to existing errors
        parseResult.errors.push(...subjectValidationErrors);
      }

      setUploadProgress(50);

      if (parseResult.errors.length > 0) {
        setValidationErrors(parseResult.errors);
        setValidationSuccess(false);

        // Count unique error types for better feedback
        const errorTypes = new Set(parseResult.errors.flatMap(e => e.errors.map(err => err.split(':')[0])));
        const uniqueErrorCount = errorTypes.size;

        toast({
          title: 'Validation Failed',
          description: `Found ${parseResult.errors.length} errors across ${uniqueErrorCount} different issue types. Check the details below for specific fixes.`,
          variant: 'error',
        });
      } else {
        setValidationSuccess(true);
        toast({
          title: 'Validation Successful',
          description: `Successfully validated ${parseResult.successfulRows} questions for ${selectedSubject?.name}. Ready to upload!`,
        });
      }

      setUploadStats({
        totalRows: parseResult.totalRows,
        successfulRows: parseResult.successfulRows,
        errorRows: parseResult.errors.length
      });

      setUploadProgress(100);
      setIsUploading(false);

      // If not validate only and no errors, proceed with upload
      if (!validateOnly && parseResult.errors.length === 0) {
        handleUpload(parseResult.questions);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to validate file: ${(error as Error).message}`,
        variant: 'error',
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle export validation errors
  const handleExportErrors = () => {
    if (validationErrors.length === 0) return;

    const csvContent = [
      ['Row', 'Field', 'Invalid Value', 'Error', 'Suggestion'].join(','),
      ...validationErrors.map(error => [
        error.row,
        error.field || '',
        error.value || '',
        error.errors.join('; '),
        error.suggestion || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-errors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle upload
  const handleUpload = (questions: any[]) => {
    if (questions.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid questions to upload.',
        variant: 'error',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');
    setCurrentlyProcessing('Preparing questions for upload');

    // Reset stats
    setUploadStats({
      totalRows: questions.length,
      successfulRows: 0,
      errorRows: 0
    });

    console.log(`Starting upload of ${questions.length} questions to question bank ${questionBankId}`);

    bulkUploadMutation.mutate({
      questionBankId,
      questions: questions.map(q => ({
        ...q,
        subjectId: selectedSubjectId // Ensure all questions use the selected subject
      })),
      validateOnly: false
    });
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload.',
        variant: 'error',
      });
      return;
    }

    await handleValidate();
  };

  // Get file input accept attribute based on file format
  const getAcceptAttribute = () => {
    switch (fileFormat) {
      case 'csv':
        return '.csv';
      case 'excel':
        return '.xlsx,.xls';
      case 'json':
        return '.json';
      default:
        return '';
    }
  };

  // Get file format icon
  const getFileFormatIcon = () => {
    switch (fileFormat) {
      case 'csv':
        return <FileText className="h-5 w-5" />;
      case 'excel':
        return <FileText className="h-5 w-5" />;
      case 'json':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bulk Upload Questions</CardTitle>
        <CardDescription>
          Upload multiple questions to {questionBank?.questions?.[0]?.title || 'the question bank'} at once.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="results" disabled={!uploadStats}>Results</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              {/* Subject Information Display */}
              {selectedSubject && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm">
                    <span className="font-medium text-blue-700 dark:text-blue-300">Target Subject:</span>
                    <span className="ml-2 font-semibold">{selectedSubject.name}</span>
                    <span className="ml-2 text-muted-foreground">({selectedSubject.code})</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    All questions will be uploaded to this subject
                  </div>
                </div>
              )}

              {!selectedSubject && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    ⚠️ No subject information found for this question bank. Please ensure the question bank has existing questions to determine the target subject.
                  </div>
                </div>
              )}

              {/* File Format Selection */}
              <div className="space-y-2">
                <Label htmlFor="fileFormat">File Format</Label>
                <Select
                  value={fileFormat}
                  onValueChange={handleFileFormatChange}
                  disabled={isUploading}
                >
                  <SelectTrigger id="fileFormat">
                    <SelectValue placeholder="Select file format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Type Selection (for sample download) */}
              <div className="space-y-2">
                <Label htmlFor="questionType">Question Type (for sample download)</Label>
                <Select
                  value={questionType}
                  onValueChange={handleQuestionTypeChange}
                  disabled={isUploading}
                >
                  <SelectTrigger id="questionType">
                    <SelectValue placeholder="Select question type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(QuestionType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Download Sample Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadSample}
                disabled={isUploading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sample {fileFormat.toUpperCase()} File
              </Button>

              <Separator />

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Upload File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept={getAcceptAttribute()}
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="flex-1"
                  />
                </div>
                {selectedFile && (
                  <div className="text-sm text-muted-foreground flex items-center mt-1">
                    {getFileFormatIcon()}
                    <span className="ml-1">{selectedFile.name}</span>
                    <span className="ml-2 text-xs">({Math.round(selectedFile.size / 1024)} KB)</span>
                    {selectedSubject && (
                      <span className="ml-4 text-blue-600 dark:text-blue-400">
                        → {selectedSubject.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Validate Only Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validateOnly"
                  checked={validateOnly}
                  onCheckedChange={handleValidateOnlyChange}
                  disabled={isUploading}
                />
                <Label htmlFor="validateOnly" className="text-sm font-normal">
                  Validate only (don't upload to question bank)
                </Label>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />

                  {/* Upload Status */}
                  {uploadStatus && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {uploadStatus}
                      {selectedSubject && (
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          → {selectedSubject.name}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Currently Processing */}
                  {currentlyProcessing && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {currentlyProcessing}
                    </div>
                  )}

                  {/* Real-time Stats */}
                  {uploadStats && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="font-medium">{uploadStats.totalRows}</div>
                        <div className="text-gray-600 dark:text-gray-400">Total</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="font-medium text-green-600 dark:text-green-400">{uploadStats.successfulRows}</div>
                        <div className="text-green-600 dark:text-green-400">Uploaded</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div className="font-medium text-red-600 dark:text-red-400">{uploadStats.errorRows}</div>
                        <div className="text-red-600 dark:text-red-400">Failed</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Success */}
              {validationSuccess && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Validation Successful</AlertTitle>
                  <AlertDescription>
                    All {uploadStats?.successfulRows} questions are valid and ready to be uploaded.
                  </AlertDescription>
                </Alert>
              )}

              {/* Database Verification */}
              {verificationData && uploadStats && uploadStats.successfulRows > 0 && (
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle>Database Verification</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div>
                        ✅ Confirmed: <strong>{verificationData.totalCount}</strong> questions are now saved in the database
                      </div>
                      {verificationData.questions.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium mb-2">Recently uploaded questions:</div>
                          <div className="space-y-1 text-xs">
                            {verificationData.questions.slice(0, 5).map((q, index) => (
                              <div key={q.id} className="flex justify-between items-center p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                                <span className="truncate">{q.title}</span>
                                <span className="text-blue-600 dark:text-blue-400 ml-2">{q.questionType}</span>
                              </div>
                            ))}
                            {verificationData.questions.length > 5 && (
                              <div className="text-gray-500 text-center">
                                ... and {verificationData.questions.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation Errors Summary */}
              {validationErrors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Failed</AlertTitle>
                  <AlertDescription>
                    Found {validationErrors.length} errors in the file.
                    {uploadStats && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="font-medium text-lg">{uploadStats.totalRows}</div>
                            <div className="text-gray-600 dark:text-gray-400">Total Rows</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="font-medium text-lg text-green-600 dark:text-green-400">{uploadStats.successfulRows}</div>
                            <div className="text-green-600 dark:text-green-400">Valid Rows</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <div className="font-medium text-lg text-red-600 dark:text-red-400">{uploadStats.errorRows}</div>
                            <div className="text-red-600 dark:text-red-400">Error Rows</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Please fix the errors below and re-upload the file.
                        </div>

                        {/* Common Error Patterns Summary */}
                        {(() => {
                          const errorPatterns = validationErrors.reduce((acc, error) => {
                            error.errors.forEach(err => {
                              const pattern = err.split(':')[0];
                              acc[pattern] = (acc[pattern] || 0) + 1;
                            });
                            return acc;
                          }, {} as Record<string, number>);

                          const topErrors = Object.entries(errorPatterns)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 3);

                          return topErrors.length > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                Most Common Issues:
                              </div>
                              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                {topErrors.map(([pattern, count]) => (
                                  <li key={pattern}>
                                    • {pattern} ({count} occurrence{count > 1 ? 's' : ''})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {/* Upload Stats */}
              {uploadStats && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{uploadStats.totalRows}</div>
                        <div className="text-sm text-muted-foreground">Total Rows</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{uploadStats.successfulRows}</div>
                        <div className="text-sm text-muted-foreground">Successful</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{uploadStats.errorRows}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Validation Errors Detail */}
              {validationErrors.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Validation Errors</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportErrors}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Errors
                    </Button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <table className="w-full">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Row</th>
                          <th className="px-4 py-2 text-left">Field</th>
                          <th className="px-4 py-2 text-left">Invalid Value</th>
                          <th className="px-4 py-2 text-left">Error</th>
                          <th className="px-4 py-2 text-left">Suggestion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationErrors.map((error, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2 text-center font-medium">{error.row}</td>
                            <td className="px-4 py-2">
                              {error.field ? (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono">
                                  {error.field}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {error.value ? (
                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-mono max-w-[150px] inline-block truncate">
                                  {error.value}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <ul className="list-disc list-inside">
                                {error.errors.map((err, i) => (
                                  <li key={i} className="text-sm text-red-600 dark:text-red-400">{err}</li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-4 py-2">
                              {error.suggestion ? (
                                <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                  {error.suggestion}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {uploadStats && uploadStats.errorRows === 0 && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Upload Successful</AlertTitle>
                  <AlertDescription>
                    Successfully uploaded {uploadStats.successfulRows} questions to the question bank.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </form>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <div className="flex gap-2">
          {!validateOnly && validationSuccess && (
            <Button
              type="button"
              onClick={() => handleUpload([])}
              disabled={isUploading || !selectedFile || validationErrors.length > 0}
            >
              <CloudUpload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}
          <Button
            type="button"
            onClick={handleValidate}
            disabled={isUploading || !selectedFile}
          >
            {validateOnly ? 'Validate' : 'Validate & Upload'}
          </Button>

          {uploadStats && uploadStats.successfulRows > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => refetchVerification()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Verify Database
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default BulkUploadForm;
