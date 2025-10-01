'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/data-display/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import {
  ArrowUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
  X,
  Users,
} from 'lucide-react';
import { DollarSign } from "@/components/ui/icons/lucide-icons";

// Types
type ImportStep = "upload" | "preview" | "validation" | "import";
type ImportType = "fee-assignments" | "fee-payments";

interface FeeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Sample data structures
interface FeeAssignmentImportData {
  studentEmail: string;
  studentEnrollmentNumber?: string;
  feeStructureName: string;
  academicCycle?: string;
  term?: string;
  dueDate: string;
  notes?: string;
  [key: string]: any;
}

interface FeePaymentImportData {
  studentEmail: string;
  studentEnrollmentNumber?: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentDate: string;
  transactionReference?: string;
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
  total: number;
  errors: string[];
  details: Array<{
    row: number;
    status: 'success' | 'error';
    message: string;
  }>;
}

export function FeeImportDialog({ open, onOpenChange, onSuccess }: FeeImportDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [importType, setImportType] = useState<ImportType>("fee-assignments");
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  const handleClose = () => {
    setCurrentStep("upload");
    setFile(null);
    setImportData([]);
    setValidationErrors([]);
    setIsProcessing(false);
    setProgress(0);
    setImportResults(null);
    onOpenChange(false);
  };

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
      const data: any[] = [];

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
      setIsProcessing(false);
      setProgress(100);

      toast({
        title: 'File parsed successfully',
        description: `Found ${data.length} records to import.`,
      });
    } catch (error) {
      setIsProcessing(false);
      setProgress(0);
      toast({
        title: 'Error parsing file',
        description: (error as Error).message,
      });
    }
  };

  const validateData = () => {
    const errors: ValidationError[] = [];
    
    importData.forEach((row, index) => {
      const rowNumber = index + 1;
      
      if (importType === "fee-assignments") {
        // Validate fee assignment data
        if (!row.studentEmail || !row.studentEmail.includes('@')) {
          errors.push({ row: rowNumber, field: 'studentEmail', message: 'Valid email is required' });
        }
        if (!row.feeStructureName) {
          errors.push({ row: rowNumber, field: 'feeStructureName', message: 'Fee structure name is required' });
        }
        if (!row.dueDate) {
          errors.push({ row: rowNumber, field: 'dueDate', message: 'Due date is required' });
        }
      } else {
        // Validate fee payment data
        if (!row.studentEmail || !row.studentEmail.includes('@')) {
          errors.push({ row: rowNumber, field: 'studentEmail', message: 'Valid email is required' });
        }
        if (!row.paymentAmount || isNaN(parseFloat(row.paymentAmount))) {
          errors.push({ row: rowNumber, field: 'paymentAmount', message: 'Valid payment amount is required' });
        }
        if (!row.paymentMethod) {
          errors.push({ row: rowNumber, field: 'paymentMethod', message: 'Payment method is required' });
        }
        if (!row.paymentDate) {
          errors.push({ row: rowNumber, field: 'paymentDate', message: 'Payment date is required' });
        }
      }
    });

    setValidationErrors(errors);
    setCurrentStep("validation");

    if (errors.length === 0) {
      toast({
        title: 'Validation successful',
        description: 'All data is valid and ready for import.',
      });
    } else {
      toast({
        title: 'Validation errors found',
        description: `Found ${errors.length} validation errors. Please review and fix them.`,
      });
    }
  };

  // Import mutations
  const importFeeAssignmentsMutation = api.feeStructure.bulkImportFeeAssignments.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      setProgress(100);
      setImportResults({
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
        total: result.total,
        details: result.details,
      });

      const successMessage = `Successfully processed ${result.total} records. ${result.successful} assigned.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`;

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
      toast({
        title: 'Import failed',
        description: error.message,
      });
    }
  });

  const importFeePaymentsMutation = api.feeStructure.bulkImportFeePayments.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      setProgress(100);
      setImportResults({
        successful: result.successful,
        failed: result.failed,
        errors: result.errors,
        total: result.total,
        details: result.details,
      });

      const successMessage = `Successfully processed ${result.total} records. ${result.successful} payments recorded.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`;

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
      toast({
        title: 'Import failed',
        description: error.message,
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
          return 90;
        }
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      if (importType === "fee-assignments") {
        importFeeAssignmentsMutation.mutate({
          assignments: importData.map(row => ({
            studentEmail: row.studentEmail,
            studentEnrollmentNumber: row.studentEnrollmentNumber,
            feeStructureName: row.feeStructureName,
            academicCycle: row.academicCycle,
            term: row.term,
            dueDate: row.dueDate,
            notes: row.notes,
          }))
        });
      } else {
        importFeePaymentsMutation.mutate({
          payments: importData.map(row => ({
            studentEmail: row.studentEmail,
            studentEnrollmentNumber: row.studentEnrollmentNumber,
            paymentAmount: parseFloat(row.paymentAmount),
            paymentMethod: row.paymentMethod,
            paymentDate: row.paymentDate,
            transactionReference: row.transactionReference,
            notes: row.notes,
          }))
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      toast({
        title: 'Import failed',
        description: 'An error occurred during import.',
      });
    }
  };

  const downloadSampleFile = () => {
    let csvContent = '';

    if (importType === "fee-assignments") {
      csvContent = [
        'studentEmail,studentEnrollmentNumber,feeStructureName,academicCycle,term,dueDate,notes',
        'student1@example.com,ENR001,Standard Fee Structure,2024-2025,Term 1,2024-12-31,Sample assignment',
        'student2@example.com,ENR002,Premium Fee Structure,2024-2025,Term 1,2024-12-31,Another assignment'
      ].join('\n');
    } else {
      csvContent = [
        'studentEmail,studentEnrollmentNumber,paymentAmount,paymentMethod,paymentDate,transactionReference,notes',
        'student1@example.com,ENR001,50000,BANK_TRANSFER,2024-01-15,TXN123456,Payment for term 1',
        'student2@example.com,ENR002,75000,JAZZ_CASH,2024-01-16,JC789012,Partial payment'
      ].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `sample-${importType}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Bulk Fee Import
          </DialogTitle>
          <DialogDescription>
            Import fee assignments or payments in bulk using CSV or Excel files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Import Type Selection */}
          <Tabs value={importType} onValueChange={(value) => setImportType(value as ImportType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fee-assignments" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Fee Assignments
              </TabsTrigger>
              <TabsTrigger value="fee-payments" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fee-assignments" className="mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import fee assignments to assign fee structures to students. This will create new fee records for students.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="fee-payments" className="mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import fee payments to record payments made by students. This will update existing fee records with payment information.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Step Content */}
          {currentStep === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <ArrowUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Upload your file</h3>
                  <p className="text-muted-foreground">
                    Select a CSV or Excel file containing {importType === "fee-assignments" ? "fee assignment" : "fee payment"} data
                  </p>
                </div>
                <div className="mt-4">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadSampleFile} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Sample File
                </Button>
              </div>
            </div>
          )}

          {currentStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Data Preview</h3>
                <Badge>{importData.length} records</Badge>
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <div className="p-4">
                  <div className="grid gap-2 text-sm">
                    {importData.slice(0, 10).map((row, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 p-2 border-b">
                        <div className="font-medium">Row {index + 1}</div>
                        <div>{row.studentEmail}</div>
                        <div>{importType === "fee-assignments" ? row.feeStructureName : `Rs. ${row.paymentAmount}`}</div>
                        <div>{importType === "fee-assignments" ? row.dueDate : row.paymentDate}</div>
                      </div>
                    ))}
                    {importData.length > 10 && (
                      <div className="text-center text-muted-foreground py-2">
                        ... and {importData.length - 10} more records
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {currentStep === "validation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Validation Results</h3>
                <div className="flex gap-2">
                  <Badge>
                    {validationErrors.length === 0 ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> All Valid</>
                    ) : (
                      <><AlertCircle className="h-3 w-3 mr-1" /> {validationErrors.length} Errors</>
                    )}
                  </Badge>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <ScrollArea className="h-48 border rounded-md">
                  <div className="p-4 space-y-2">
                    {validationErrors.map((error, index) => (
                      <Alert key={index}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Row {error.row}, Field {error.field}:</strong> {error.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {validationErrors.length === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All data has been validated successfully. Ready to import {importData.length} records.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {currentStep === "import" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Import Progress</h3>
                <Badge>{progress.toFixed(0)}%</Badge>
              </div>

              <Progress value={progress} className="w-full" />

              {importResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{importResults.successful}</div>
                      <div className="text-sm text-green-700">Successful</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{importResults.failed}</div>
                      <div className="text-sm text-red-700">Failed</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
                      <div className="text-sm text-blue-700">Total</div>
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <ScrollArea className="h-32 border rounded-md">
                      <div className="p-4 space-y-1">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600">{error}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          )}

          {isProcessing && currentStep !== "import" && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">Processing file...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {currentStep === "import" && importResults ? "Close" : "Cancel"}
          </Button>
          {currentStep === "preview" && (
            <Button onClick={validateData}>
              Next: Validate Data
            </Button>
          )}
          {currentStep === "validation" && validationErrors.length === 0 && (
            <Button onClick={startImport}>
              Start Import
            </Button>
          )}
          {currentStep === "validation" && validationErrors.length > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep("preview")}>
              Back to Preview
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
