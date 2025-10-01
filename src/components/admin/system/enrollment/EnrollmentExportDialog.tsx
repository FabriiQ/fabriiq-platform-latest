'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/data-display/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/forms/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/forms/form';
import { Checkbox } from '@/components/ui/forms/checkbox';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { DatePicker } from '@/components/ui/date-picker';

// Form schema
const exportFormSchema = z.object({
  format: z.enum(['CSV', 'EXCEL']),
  campusId: z.string().optional(),
  programId: z.string().optional(),
  status: z.string().optional(),
  includeInactive: z.boolean().default(false),
  includeDetails: z.boolean().default(true),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  fileName: z.string().min(1, 'File name is required'),
});

type ExportFormValues = z.infer<typeof exportFormSchema>;

interface EnrollmentExportDialogProps {
  onSuccess?: () => void;
}

export function EnrollmentExportDialog({ onSuccess }: EnrollmentExportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  // Get filter options
  const { data: filterOptions } = api.systemAnalytics.getFilterOptions.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false
  });

  // Form setup
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      format: 'CSV',
      includeInactive: false,
      includeDetails: true,
      fileName: `enrollment_export_${new Date().toISOString().split('T')[0]}`,
    },
  });

  const onSubmit = async (data: ExportFormValues) => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Here you would call your API to generate the export
      // For now, we'll simulate the export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate export data
      const exportData = generateSampleExportData(data);
      downloadFile(exportData, data.fileName, data.format);

      clearInterval(progressInterval);
      setExportProgress(100);
      setExportComplete(true);

      toast({
        title: 'Export completed',
        description: 'Your enrollment export has been downloaded successfully.',
      });

      if (onSuccess) {
        onSuccess();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating your export. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateSampleExportData = (exportConfig: ExportFormValues): string => {
    const headers = [
      'Student Name',
      'Student Email',
      'Enrollment Number',
      'Campus',
      'Program',
      'Course',
      'Class',
      'Start Date',
      'End Date',
      'Status',
      'Created Date'
    ];

    if (exportConfig.includeDetails) {
      headers.push('Notes', 'Payment Status', 'Created By');
    }

    const sampleData = [
      [
        'John Doe',
        'john.doe@example.com',
        'STU001',
        'Main Campus',
        'Computer Science',
        'CS101',
        'Introduction to Programming',
        '2024-01-15',
        '2024-06-15',
        'ACTIVE',
        '2024-01-10'
      ],
      [
        'Jane Smith',
        'jane.smith@example.com',
        'STU002',
        'Branch Campus',
        'Engineering',
        'ENG101',
        'Engineering Fundamentals',
        '2024-01-15',
        '',
        'PENDING',
        '2024-01-12'
      ]
    ];

    if (exportConfig.includeDetails) {
      sampleData[0].push('Transfer student', 'PAID', 'Admin User');
      sampleData[1].push('New enrollment', 'PENDING', 'Admin User');
    }

    if (exportConfig.format === 'CSV') {
      // Generate CSV format
      const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
      return csvContent;
    } else {
      // Generate Excel format (HTML table that Excel can read)
      let excelContent = '<table>';

      // Add headers
      excelContent += '<tr>';
      headers.forEach(header => {
        excelContent += `<th>${header}</th>`;
      });
      excelContent += '</tr>';

      // Add data rows
      sampleData.forEach(row => {
        excelContent += '<tr>';
        row.forEach(cell => {
          excelContent += `<td>${cell}</td>`;
        });
        excelContent += '</tr>';
      });

      excelContent += '</table>';
      return excelContent;
    }
  };

  const downloadFile = (content: string, fileName: string, format: string) => {
    const blob = new Blob([content], {
      type: format === 'CSV' ? 'text/csv' : 'application/vnd.ms-excel'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use proper file extensions
    const extension = format === 'CSV' ? 'csv' : 'xls';
    a.download = `${fileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Enrollments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Enrollments</DialogTitle>
          <DialogDescription>
            Export enrollment data with customizable filters and format options
          </DialogDescription>
        </DialogHeader>

        {!isExporting && !exportComplete && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Export Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CSV">CSV</SelectItem>
                          <SelectItem value="EXCEL">Excel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fileName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Name</FormLabel>
                      <FormControl>
                        <Input placeholder="enrollment_export" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All campuses" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Campuses</SelectItem>
                          {filterOptions?.campuses?.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id}>
                              {campus.name}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="includeInactive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include inactive enrollments</FormLabel>
                        <FormDescription>
                          Include enrollments with inactive status in the export
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="includeDetails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Include detailed information</FormLabel>
                        <FormDescription>
                          Include additional fields like notes, payment status, and audit information
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <FileText className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </form>
          </Form>
        )}

        {isExporting && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting Data
              </CardTitle>
              <CardDescription>
                Please wait while we prepare your export file...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {exportComplete && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Download className="h-4 w-4" />
                Export Complete
              </CardTitle>
              <CardDescription>
                Your enrollment export has been downloaded successfully.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
