'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Users, BookOpen, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const feeAssignmentSchema = z.object({
  selectedFeeStructures: z.array(z.object({
    feeStructureId: z.string(),
    dueDate: z.date().optional(),
    notes: z.string().optional(),
    discounts: z.array(z.object({
      discountTypeId: z.string(),
      amount: z.number().positive()
    })).optional()
  })).min(1, 'Please select at least one fee structure')
});

type FeeAssignmentFormValues = z.infer<typeof feeAssignmentSchema>;

interface MultipleFeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  studentName: string;
  onSuccess?: () => void;
}

export function MultipleFeeAssignmentDialog({
  open,
  onOpenChange,
  enrollmentId,
  studentName,
  onSuccess
}: MultipleFeeAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedStructures, setSelectedStructures] = useState<string[]>([]);

  const form = useForm<FeeAssignmentFormValues>({
    resolver: zodResolver(feeAssignmentSchema),
    defaultValues: {
      selectedFeeStructures: []
    }
  });

  // Fetch available fee structures
  const { data: availableStructures, isLoading: structuresLoading } = 
    api.enrollmentFee.getAvailableFeeStructures.useQuery(
      { enrollmentId },
      { enabled: open }
    );

  // Fetch discount types
  const { data: discountTypes } = api.discountType.getAll.useQuery(
    undefined,
    { enabled: open }
  );

  // Assign multiple fees mutation
  const assignFeesMutation = api.enrollmentFee.assignMultipleFees.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Fee Assignment Successful',
        description: `Successfully assigned ${data.successfulAssignments} out of ${data.totalAssignments} fee structures to ${data.studentName}`,
      });
      
      if (data.errors.length > 0) {
        toast({
          title: 'Some Assignments Failed',
          description: `${data.errors.length} assignments failed. Please check the details.`,
          variant: 'destructive'
        });
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
      setSelectedStructures([]);
    },
    onError: (error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStructureToggle = (structureId: string, checked: boolean) => {
    if (checked) {
      setSelectedStructures(prev => [...prev, structureId]);
      const currentAssignments = form.getValues('selectedFeeStructures');
      form.setValue('selectedFeeStructures', [
        ...currentAssignments,
        {
          feeStructureId: structureId,
          dueDate: undefined,
          notes: '',
          discounts: []
        }
      ]);
    } else {
      setSelectedStructures(prev => prev.filter(id => id !== structureId));
      const currentAssignments = form.getValues('selectedFeeStructures');
      form.setValue('selectedFeeStructures', 
        currentAssignments.filter(assignment => assignment.feeStructureId !== structureId)
      );
    }
  };

  const onSubmit = (data: FeeAssignmentFormValues) => {
    assignFeesMutation.mutate({
      enrollmentId,
      feeAssignments: data.selectedFeeStructures
    });
  };

  const selectedAssignments = form.watch('selectedFeeStructures');
  const totalAmount = selectedAssignments.reduce((sum, assignment) => {
    const structure = availableStructures?.find(s => s.id === assignment.feeStructureId);
    return sum + (structure?.baseAmount || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Multiple Fee Structures
          </DialogTitle>
          <DialogDescription>
            Assign multiple fee structures to <strong>{studentName}</strong>. 
            You can set individual due dates and apply discounts for each fee structure.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Available Fee Structures */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Available Fee Structures</h3>
                <Badge variant="outline">
                  {selectedStructures.length} selected
                </Badge>
              </div>

              {structuresLoading ? (
                <div className="text-center py-8">Loading available fee structures...</div>
              ) : availableStructures && availableStructures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableStructures.map((structure) => (
                    <Card key={structure.id} className={cn(
                      "cursor-pointer transition-colors",
                      selectedStructures.includes(structure.id) && "ring-2 ring-primary"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedStructures.includes(structure.id)}
                              onCheckedChange={(checked) => 
                                handleStructureToggle(structure.id, checked as boolean)
                              }
                            />
                            <div>
                              <CardTitle className="text-base">{structure.name}</CardTitle>
                              {structure.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {structure.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            ${structure.baseAmount.toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{structure.programName}</span>
                          <span>{structure.campusName}</span>
                        </div>
                        {structure.isRecurring && (
                          <Badge variant="outline" className="mt-2">
                            Recurring: {structure.recurringInterval}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional fee structures available for this enrollment.</p>
                  <p className="text-sm">All applicable fee structures may already be assigned.</p>
                </div>
              )}
            </div>

            {/* Selected Fee Structures Configuration */}
            {selectedStructures.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Configure Selected Fee Structures</h3>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Total: ${totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedAssignments.map((assignment, index) => {
                      const structure = availableStructures?.find(s => s.id === assignment.feeStructureId);
                      if (!structure) return null;

                      return (
                        <Card key={assignment.feeStructureId}>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>{structure.name}</span>
                              <Badge>${structure.baseAmount.toLocaleString()}</Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Due Date */}
                              <FormField
                                control={form.control}
                                name={`selectedFeeStructures.${index}.dueDate`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Due Date</FormLabel>
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
                                            date < new Date()
                                          }
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Notes */}
                              <FormField
                                control={form.control}
                                name={`selectedFeeStructures.${index}.notes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Optional notes for this fee assignment..."
                                        className="resize-none"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                  setSelectedStructures([]);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignFeesMutation.isLoading || selectedStructures.length === 0}
              >
                {assignFeesMutation.isLoading ? 'Assigning...' : `Assign ${selectedStructures.length} Fee Structure${selectedStructures.length !== 1 ? 's' : ''}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
