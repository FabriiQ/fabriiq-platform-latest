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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Loader2, FileText, Printer, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const challanGenerationSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  dueDate: z.date(),
  bankDetails: z.string().optional(),
  instructions: z.string().optional(),
  copies: z.number().min(1).max(5).default(2),
});

type ChallanGenerationFormData = z.infer<typeof challanGenerationSchema>;

interface ChallanTemplate {
  id: string;
  name: string;
  description?: string;
  copies: number;
}

interface FeeBreakdown {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  components: Array<{
    name: string;
    amount: number;
  }>;
  discounts: Array<{
    name: string;
    amount: number;
  }>;
}

interface ChallanGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentFeeId: string;
  studentName: string;
  studentId: string;
  className: string;
  feeBreakdown: FeeBreakdown;
  challanTemplates: ChallanTemplate[];
  onGenerate: (data: ChallanGenerationFormData) => void;
  onPrint?: (challanId: string) => void;
  onEmail?: (challanId: string, email: string) => void;
  isLoading?: boolean;
}

export function ChallanGenerationDialog({
  open,
  onOpenChange,
  enrollmentFeeId,
  studentName,
  studentId,
  className,
  feeBreakdown,
  challanTemplates,
  onGenerate,
  onPrint,
  onEmail,
  isLoading = false,
}: ChallanGenerationDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ChallanTemplate | null>(null);
  const [generatedChallanId, setGeneratedChallanId] = useState<string | null>(null);

  const form = useForm<ChallanGenerationFormData>({
    resolver: zodResolver(challanGenerationSchema),
    defaultValues: {
      templateId: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      copies: 2,
      bankDetails: 'Bank: ABC Bank\nAccount: 1234567890\nBranch: Main Branch',
      instructions: 'Please pay before the due date to avoid late fees.',
    },
  });

  const handleSubmit = (data: ChallanGenerationFormData) => {
    onGenerate(data);
    // In a real implementation, this would be set from the API response
    setGeneratedChallanId('mock-challan-id');
  };

  const handleTemplateChange = (templateId: string) => {
    const template = challanTemplates.find(ct => ct.id === templateId);
    setSelectedTemplate(template || null);
    form.setValue('templateId', templateId);
    if (template) {
      form.setValue('copies', template.copies);
    }
  };

  const handlePrint = () => {
    if (generatedChallanId && onPrint) {
      onPrint(generatedChallanId);
    }
  };

  const handleEmail = () => {
    if (generatedChallanId && onEmail) {
      const email = prompt('Enter email address:');
      if (email) {
        onEmail(generatedChallanId, email);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Fee Challan</DialogTitle>
          <DialogDescription>
            Generate a fee challan for {studentName} ({className})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Summary */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-3">Fee Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Student:</span>
                <span>{studentName} ({studentId})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Class:</span>
                <span>{className}</span>
              </div>
              <Separator className="my-2" />
              
              {/* Fee Components */}
              <div className="space-y-1">
                <span className="font-medium text-sm">Fee Components:</span>
                {feeBreakdown.components.map((component, index) => (
                  <div key={index} className="flex justify-between text-sm pl-4">
                    <span>{component.name}</span>
                    <span>Rs. {component.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between font-medium">
                <span>Subtotal:</span>
                <span>Rs. {feeBreakdown.baseAmount.toLocaleString()}</span>
              </div>

              {/* Discounts */}
              {feeBreakdown.discounts.length > 0 && (
                <>
                  <div className="space-y-1">
                    <span className="font-medium text-sm text-green-600">Discounts:</span>
                    {feeBreakdown.discounts.map((discount, index) => (
                      <div key={index} className="flex justify-between text-sm pl-4 text-green-600">
                        <span>{discount.name}</span>
                        <span>- Rs. {discount.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Total Discount:</span>
                    <span>- Rs. {feeBreakdown.discountAmount.toLocaleString()}</span>
                  </div>
                </>
              )}

              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount:</span>
                <span>Rs. {feeBreakdown.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challan Template</FormLabel>
                    <Select onValueChange={handleTemplateChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a challan template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {challanTemplates.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No challan templates available</p>
                            <p className="text-xs mt-1">Create templates in Challan Designer first</p>
                          </div>
                        ) : (
                          challanTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{template.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {template.description} • {template.copies} copies
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a due date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When should this fee be paid by?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Copies</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many copies of the challan to generate (1-5)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter bank details for payment..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Bank account details where the fee should be paid
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter payment instructions..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional instructions for the student/parent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Challan
                  </Button>
                </div>
                
                {generatedChallanId && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePrint}
                      disabled={isLoading}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleEmail}
                      disabled={isLoading}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
