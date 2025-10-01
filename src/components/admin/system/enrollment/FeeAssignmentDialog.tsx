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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const feeAssignmentSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee structure is required'),
  dueDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type FeeAssignmentFormData = z.infer<typeof feeAssignmentSchema>;

interface FeeStructure {
  id: string;
  name: string;
  description?: string;
  components: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  baseAmount: number;
}

interface FeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  studentName: string;
  className: string;
  feeStructures: FeeStructure[];
  onAssign: (data: FeeAssignmentFormData) => void;
  isLoading?: boolean;
}

export function FeeAssignmentDialog({
  open,
  onOpenChange,
  enrollmentId,
  studentName,
  className,
  feeStructures,
  onAssign,
  isLoading = false,
}: FeeAssignmentDialogProps) {
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);

  // Debug logging for fee structures
  console.log('FeeAssignmentDialog debug:', {
    enrollmentId,
    studentName,
    className,
    feeStructuresCount: feeStructures.length,
    feeStructures: feeStructures.map(fs => ({
      id: fs.id,
      name: fs.name,
      baseAmount: fs.baseAmount,
      componentsCount: fs.components?.length || 0
    })),
    isLoading
  });

  const form = useForm<FeeAssignmentFormData>({
    resolver: zodResolver(feeAssignmentSchema),
    defaultValues: {
      feeStructureId: '',
      paymentMethod: 'CASH',
      notes: '',
    },
  });

  const handleSubmit = (data: FeeAssignmentFormData) => {
    console.log('Fee Assignment Form Data:', data);
    onAssign(data);
  };

  const handleStructureChange = (structureId: string) => {
    const structure = feeStructures.find(fs => fs.id === structureId);
    setSelectedStructure(structure || null);
    form.setValue('feeStructureId', structureId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Assign Fee Structure</DialogTitle>
          <DialogDescription>
            Assign a fee structure to {studentName} for {className}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="feeStructureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Structure</FormLabel>
                  <Select onValueChange={handleStructureChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fee structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {feeStructures.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <p>No fee structures available</p>
                          <p className="text-xs mt-1">Please create fee structures for this program first</p>
                        </div>
                      ) : (
                        feeStructures.map((structure) => (
                          <SelectItem key={structure.id} value={structure.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{structure.name}</span>
                              <span className="text-sm text-muted-foreground">
                                Rs. {structure.baseAmount.toLocaleString()}
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

            {selectedStructure && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Fee Structure Details</h4>
                <div className="space-y-2">
                  {selectedStructure.components.map((component, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{component.name}</span>
                      <span>Rs. {component.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Amount</span>
                    <span>Rs. {selectedStructure.baseAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
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
                        onSelect={(date) => {
                          field.onChange(date);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        autoFocus
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
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                      <SelectItem value="ONLINE">Online Payment</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about this fee assignment..."
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

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Fee Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
