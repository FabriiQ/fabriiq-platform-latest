'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter
} from '@/components/ui/data-display/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  X,
  ArrowUp
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/feedback/alert';
import { Stepper } from '@/components/ui/stepper';

// Types
type ImportStep = "upload" | "preview" | "mapping" | "validation" | "import";

interface EnrollmentImportDialogProps {
  onSuccess?: () => void;
}

// Sample data structure for enrollment import
interface EnrollmentImportData {
  studentEmail: string;
  studentFirstName?: string;
  studentLastName?: string;
  studentEnrollmentNumber?: string;
  studentPhone?: string;
  campusCode: string;
  programCode?: string;
  courseCode?: string;
  className: string;
  startDate: string;
  endDate?: string;
  status?: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'WITHDRAWN' | 'INACTIVE';
  notes?: string;
  [key: string]: any;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResults {
  successful: number;
  failed: number;
  errors: string[];
  total?: number;
  existingStudents?: number;
  newStudents?: number;
  details?: Array<{
    row: number;
    email: string;
    status: 'success' | 'failed' | 'warning';
    message: string;
    isNewStudent?: boolean;
  }>;
}

export function EnrollmentImportDialog({ onSuccess }: EnrollmentImportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<EnrollmentImportData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  // Get filter options for validation
  const { data: filterOptions } = api.systemAnalytics.getFilterOptions.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false
  });

  const steps = [
    { id: "upload", label: "Upload File", description: "Select CSV or Excel file" },
    { id: "preview", label: "Preview Data", description: "Review imported data" },
    { id: "mapping", label: "Map Fields", description: "Map columns to fields" },
    { id: "validation", label: "Validate", description: "Check for errors" },
    { id: "import", label: "Import", description: "Import enrollments" }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV or Excel file.',
      });
      return;
    }

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB.',
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      // Parse CSV (simple implementation)
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data: EnrollmentImportData[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
        setProgress((i / lines.length) * 100);
      }

      setImportData(data);
      setCurrentStep("preview");
    } catch (error) {
      toast({
        title: 'Error parsing file',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateData = () => {
    const errors: ValidationError[] = [];
    
    importData.forEach((row, index) => {
      // Required field validation
      if (!row.studentEmail) {
        errors.push({
          row: index + 1,
          field: 'studentEmail',
          message: 'Student email is required'
        });
      }
      
      if (!row.campusCode) {
        errors.push({
          row: index + 1,
          field: 'campusCode',
          message: 'Campus code is required'
        });
      }
      
      if (!row.className) {
        errors.push({
          row: index + 1,
          field: 'className',
          message: 'Class name is required'
        });
      }

      // Email format validation
      if (row.studentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.studentEmail)) {
        errors.push({
          row: index + 1,
          field: 'studentEmail',
          message: 'Invalid email format'
        });
      }

      // Date format validation
      if (row.startDate && isNaN(Date.parse(row.startDate))) {
        errors.push({
          row: index + 1,
          field: 'startDate',
          message: 'Invalid date format'
        });
      }
    });

    setValidationErrors(errors);
    setCurrentStep("validation");
  };

  // Import mutation with better error handling
  const importMutation = api.enrollment.bulkImportEnrollments.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      setProgress(100);
      setImportResults({
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
        total: result.total,
        existingStudents: result.existingStudents,
        newStudents: result.newStudents,
        details: result.details,
      });

      const successMessage = `Successfully processed ${result.total} records. ${result.successful} enrolled (${result.newStudents} new students, ${result.existingStudents} existing students).${result.failed > 0 ? ` ${result.failed} failed.` : ''}`;

      toast({
        title: 'Import completed',
        description: successMessage,
      });

      if (onSuccess && result.successful > 0) {
        onSuccess();
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      setProgress(0);

      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'The import request timed out or failed. This may be due to a large dataset. Please try with smaller batches or check your network connection.';
      } else if (error.message.includes('UNAUTHORIZED')) {
        errorMessage = 'You do not have permission to import enrollments. Please contact your administrator.';
      }

      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'error',
      });
    }
  });

  const startImport = async () => {
    if (importData.length === 0) {
      toast({
        title: 'No data to import',
        description: 'Please upload and validate data first.',
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: 'Validation errors found',
        description: 'Please fix all validation errors before importing.',
      });
      return;
    }

    setCurrentStep("import");
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Don't go to 100% until actually complete
        }
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      // Call the import mutation
      await importMutation.mutateAsync({
        enrollments: importData,
      });
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      // Error handling is done in the mutation's onError callback
      console.error('Import error:', error);
    }
  };

  const downloadTemplate = () => {
    const template = `Student Name,Student Email,Enrollment Number,Campus,Program,Course,Class,Start Date,End Date,Status,Created Date,Notes,Payment Status,Created By
John Doe,john.doe@example.com,STU001,Main Campus,Computer Science,CS101,Introduction to Programming,2024-01-15,2024-06-15,ACTIVE,2024-01-10,Transfer student,PAID,Admin User
Jane Smith,jane.smith@example.com,STU002,Branch Campus,Engineering,ENG101,Engineering Fundamentals,2024-01-15,,PENDING,2024-01-12,New enrollment,PENDING,Admin User`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrollment_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetDialog = () => {
    setCurrentStep("upload");
    setFile(null);
    setImportData([]);
    setValidationErrors([]);
    setIsProcessing(false);
    setProgress(0);
    setImportResults(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowUp className="h-4 w-4 mr-2" />
          Import Enrollments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Enrollments</DialogTitle>
          <DialogDescription>
            Import multiple enrollments from a CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            className="mb-6"
          />

          {currentStep === "upload" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                      <ArrowUp className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Drop files here or click to upload
                          </span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                          CSV or Excel files up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "preview" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Data Preview</div>
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Student Email</th>
                          <th className="text-left p-2">Campus</th>
                          <th className="text-left p-2">Program</th>
                          <th className="text-left p-2">Class</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{row.studentEmail}</td>
                            <td className="p-2">{row.campusCode}</td>
                            <td className="p-2">{row.programCode}</td>
                            <td className="p-2">{row.className}</td>
                            <td className="p-2">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 5 && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Showing first 5 of {importData.length} records
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "validation" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Validation Results</div>
                  {validationErrors.length === 0 ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Validation Passed</AlertTitle>
                      <AlertDescription>
                        All {importData.length} records are valid and ready to import.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Errors Found</AlertTitle>
                      <AlertDescription>
                        {validationErrors.length} errors found. Please fix these issues before importing.
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationErrors.length > 0 && (
                    <div className="max-h-48 overflow-auto">
                      <div className="space-y-2">
                        {validationErrors.map((error, index) => (
                          <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                            <span className="font-medium">Row {error.row}:</span> {error.message} ({error.field})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "import" && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Import Results</div>
                  {importResults ? (
                    <div className="space-y-4">
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Import Completed</AlertTitle>
                        <AlertDescription>
                          Successfully processed {importResults.total || importResults.successful + importResults.failed} records.
                          {importResults.successful > 0 && ` ${importResults.successful} enrolled successfully.`}
                          {importResults.newStudents && ` (${importResults.newStudents} new students, ${importResults.existingStudents} existing students)`}
                          {importResults.failed > 0 && ` ${importResults.failed} failed.`}
                        </AlertDescription>
                      </Alert>

                      {importResults.details && importResults.details.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Detailed Results:</div>
                          <div className="max-h-48 overflow-auto border rounded-md p-2">
                            <div className="space-y-1">
                              {importResults.details.map((detail, index) => (
                                <div key={index} className={`text-xs p-2 rounded ${
                                  detail.status === 'success' ? 'bg-green-50 text-green-700' :
                                  detail.status === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                                  'bg-red-50 text-red-700'
                                }`}>
                                  <div className="font-medium">Row {detail.row}: {detail.email}</div>
                                  <div>{detail.message}</div>
                                  {detail.isNewStudent !== undefined && (
                                    <div className="text-xs opacity-75">
                                      {detail.isNewStudent ? 'New student created' : 'Existing student'}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {importResults.errors.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-red-600">Errors:</div>
                          <div className="max-h-32 overflow-auto border rounded-md p-2 bg-red-50">
                            <div className="space-y-1">
                              {importResults.errors.map((error, index) => (
                                <div key={index} className="text-sm text-red-600">
                                  {error}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-sm font-medium">Enrolling students...</div>
                      <Progress value={progress} className="w-full mt-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-sm font-medium">Processing file...</div>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {currentStep === "preview" && (
            <Button onClick={validateData}>
              Next: Validate Data
            </Button>
          )}
          {currentStep === "validation" && validationErrors.length === 0 && (
            <Button onClick={startImport}>
              Enroll Students
            </Button>
          )}
          {currentStep === "validation" && validationErrors.length > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep("preview")}>
              Back to Preview
            </Button>
          )}
          {currentStep === "import" && importResults && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
