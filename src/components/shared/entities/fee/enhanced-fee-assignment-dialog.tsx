"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, AlertTriangle, Plus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

const feeAssignmentSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee structure is required'),
  dueDate: z.date().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  assignmentType: z.enum(['new', 'additional']).default('new'),
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

interface EnhancedFeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  studentName: string;
  className?: string;
  feeStructures: FeeStructure[];
  existingFeeStructures?: string[]; // IDs of already assigned fee structures
  onSuccess?: () => void;
}

interface DuplicateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeStructureName: string;
  onConfirm: (action: 'update' | 'additional' | 'cancel') => void;
}

function DuplicateConfirmationDialog({
  open,
  onOpenChange,
  feeStructureName,
  onConfirm,
}: DuplicateConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fee Structure Already Assigned
          </DialogTitle>
          <DialogDescription>
            The fee structure "{feeStructureName}" is already assigned to this enrollment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              What would you like to do?
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onConfirm('update')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Update Existing Fee Assignment
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onConfirm('additional')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add as Additional Charge
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onConfirm('cancel')}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EnhancedFeeAssignmentDialog({
  open,
  onOpenChange,
  enrollmentId,
  studentName,
  className,
  feeStructures,
  existingFeeStructures = [],
  onSuccess,
}: EnhancedFeeAssignmentDialogProps) {
  const [selectedStructure, setSelectedStructure] = useState<FeeStructure | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<FeeAssignmentFormData | null>(null);

  const form = useForm<FeeAssignmentFormData>({
    resolver: zodResolver(feeAssignmentSchema),
    defaultValues: {
      feeStructureId: '',
      paymentMethod: 'CASH',
      notes: '',
      assignmentType: 'new',
    },
  });

  // Create enrollment fee mutation
  const createEnrollmentFeeMutation = api.enrollmentFee.create.useMutation({
    onSuccess: () => {
      toast.success('Fee assigned successfully', {
        description: `Fee structure has been assigned to ${studentName}`,
      });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
      setSelectedStructure(null);
    },
    onError: (error) => {
      // Check if this is a duplicate fee structure error
      if (error.message.includes('already assigned')) {
        const formData = form.getValues();
        setPendingAssignment(formData);
        setShowDuplicateDialog(true);
      } else {
        toast.error('Error assigning fee', {
          description: error.message,
        });
      }
    },
  });

  // Assign additional fee mutation
  const assignAdditionalFeeMutation = api.enrollmentFee.assignAdditionalFee.useMutation({
    onSuccess: () => {
      toast.success('Additional fee assigned successfully', {
        description: `Additional fee has been assigned to ${studentName}`,
      });
      onSuccess?.();
      onOpenChange(false);
      form.reset();
      setSelectedStructure(null);
    },
    onError: (error) => {
      toast.error('Error assigning additional fee', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (data: FeeAssignmentFormData) => {
    if (data.assignmentType === 'additional') {
      assignAdditionalFeeMutation.mutate({
        enrollmentId,
        ...data,
      });
    } else {
      createEnrollmentFeeMutation.mutate({
        enrollmentId,
        ...data,
      });
    }
  };

  const handleStructureChange = (structureId: string) => {
    const structure = feeStructures.find(fs => fs.id === structureId);
    setSelectedStructure(structure || null);
    form.setValue('feeStructureId', structureId);
    
    // Check if this fee structure is already assigned
    if (existingFeeStructures.includes(structureId)) {
      form.setValue('assignmentType', 'additional');
    } else {
      form.setValue('assignmentType', 'new');
    }
  };

  const handleDuplicateConfirmation = (action: 'update' | 'additional' | 'cancel') => {
    setShowDuplicateDialog(false);
    
    if (action === 'cancel') {
      setPendingAssignment(null);
      return;
    }
    
    if (action === 'additional' && pendingAssignment) {
      // Assign as additional fee
      assignAdditionalFeeMutation.mutate({
        enrollmentId,
        ...pendingAssignment,
      });
    } else if (action === 'update') {
      // Navigate to update existing fee (you can implement this based on your needs)
      toast.info('Update Feature', {
        description: 'Please navigate to the fee details to update the existing assignment.',
      });
    }
    
    setPendingAssignment(null);
  };

  const isLoading = createEnrollmentFeeMutation.isPending || assignAdditionalFeeMutation.isPending;
  const assignmentType = form.watch('assignmentType');
  const isAdditionalFee = assignmentType === 'additional';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAdditionalFee ? 'Assign Additional Fee' : 'Assign Fee Structure'}
            </DialogTitle>
            <DialogDescription>
              {isAdditionalFee 
                ? `Assign an additional fee structure to ${studentName} for ${className || 'this enrollment'}`
                : `Assign a fee structure to ${studentName} for ${className || 'this enrollment'}`
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {isAdditionalFee && (
                <Alert>
                  <Plus className="h-4 w-4" />
                  <AlertDescription>
                    This fee structure is already assigned. It will be added as an additional charge.
                  </AlertDescription>
                </Alert>
              )}

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
                              <div className="flex items-center justify-between w-full">
                                <span>{structure.name}</span>
                                <div className="flex items-center gap-2 ml-2">
                                  {existingFeeStructures.includes(structure.id) && (
                                    <Badge variant="secondary" className="text-xs">
                                      Already Assigned
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    ${structure.baseAmount.toLocaleString()}
                                  </Badge>
                                </div>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedStructure.name}</CardTitle>
                    {selectedStructure.description && (
                      <CardDescription>{selectedStructure.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <Badge variant="outline" className="text-lg font-semibold">
                          ${selectedStructure.baseAmount.toLocaleString()}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Fee Components:</h4>
                        {selectedStructure.components.map((component, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{component.name}</span>
                            <span>${component.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
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
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="ONLINE">Online Payment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !selectedStructure}>
                  {isLoading ? 'Assigning...' : isAdditionalFee ? 'Assign Additional Fee' : 'Assign Fee'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DuplicateConfirmationDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        feeStructureName={selectedStructure?.name || ''}
        onConfirm={handleDuplicateConfirmation}
      />
    </>
  );
}
