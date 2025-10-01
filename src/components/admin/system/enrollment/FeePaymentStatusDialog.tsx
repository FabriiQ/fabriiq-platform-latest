'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// Form schema
const feePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'WAIVED', 'OVERDUE']),
  paymentMethod: z.string().optional(),
  transactionReference: z.string().optional(),
  paidAmount: z.number().min(0).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
});

type FeePaymentStatusFormData = z.infer<typeof feePaymentStatusSchema>;

interface FeePaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentFee: {
    id: string;
    baseAmount: number;
    discountedAmount: number;
    finalAmount: number;
    paymentStatus: string;
    dueDate?: Date;
    paidAmount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
    transactions?: Array<{
      id: string;
      amount: number;
      date: Date;
      method: string;
      reference?: string;
    }>;
  };
  studentName: string;
  onUpdate: (data: FeePaymentStatusFormData & { enrollmentFeeId: string }) => void;
  isLoading?: boolean;
}

export function FeePaymentStatusDialog({
  open,
  onOpenChange,
  enrollmentFee,
  studentName,
  onUpdate,
  isLoading = false,
}: FeePaymentStatusDialogProps) {
  // Calculate paid amount from transactions
  const calculatedPaidAmount = enrollmentFee.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  const form = useForm<FeePaymentStatusFormData>({
    resolver: zodResolver(feePaymentStatusSchema),
    defaultValues: {
      paymentStatus: enrollmentFee.paymentStatus as any,
      paymentMethod: enrollmentFee.paymentMethod || '',
      transactionReference: enrollmentFee.transactionReference || '',
      paidAmount: calculatedPaidAmount,
      paymentDate: enrollmentFee.dueDate ? format(enrollmentFee.dueDate, 'yyyy-MM-dd') : '',
      notes: enrollmentFee.notes || '',
    },
  });

  const watchedPaymentStatus = form.watch('paymentStatus');
  const watchedPaidAmount = form.watch('paidAmount');

  const handleSubmit = (data: FeePaymentStatusFormData) => {
    onUpdate({
      ...data,
      enrollmentFeeId: enrollmentFee.id,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-blue-100 text-blue-800';
      case 'WAIVED': return 'bg-purple-100 text-purple-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRemainingAmount = () => {
    const paidAmount = watchedPaidAmount || 0;
    return Math.max(0, enrollmentFee.finalAmount - paidAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Update Fee Payment Status
          </DialogTitle>
          <DialogDescription>
            Update payment status and details for {studentName}'s enrollment fee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Fee Information */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h3 className="font-medium mb-3">Fee Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Base Amount</div>
                <div className="font-medium">Rs. {enrollmentFee.baseAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Discount</div>
                <div className="font-medium">Rs. {enrollmentFee.discountedAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Final Amount</div>
                <div className="font-medium">Rs. {enrollmentFee.finalAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Current Status</div>
                <Badge className={getStatusColor(enrollmentFee.paymentStatus)}>
                  {enrollmentFee.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Payment Status */}
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PARTIAL">Partial Payment</SelectItem>
                        <SelectItem value="PAID">Fully Paid</SelectItem>
                        <SelectItem value="WAIVED">Waived</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Amount */}
              {(watchedPaymentStatus === 'PARTIAL' || watchedPaymentStatus === 'PAID') && (
                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={enrollmentFee.finalAmount}
                          placeholder="Enter paid amount"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Remaining: Rs. {getRemainingAmount().toLocaleString()}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Payment Method */}
              {(watchedPaymentStatus === 'PARTIAL' || watchedPaymentStatus === 'PAID') && (
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                          <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="ONLINE_PAYMENT">Online Payment</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Transaction Reference */}
              {(watchedPaymentStatus === 'PARTIAL' || watchedPaymentStatus === 'PAID') && (
                <FormField
                  control={form.control}
                  name="transactionReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Reference</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter transaction reference or receipt number"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional: Receipt number, transaction ID, or reference
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about the payment..."
                        className="min-h-[80px]"
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Payment Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
