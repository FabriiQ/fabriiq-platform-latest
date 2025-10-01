"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CreditCard, Receipt } from "@/components/ui/icons/lucide-icons";

const paymentStatusUpdateSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'WAIVED', 'OVERDUE']),
  paidAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentStatusUpdateFormData = z.infer<typeof paymentStatusUpdateSchema>;

interface EnrollmentFee {
  id: string;
  finalAmount: number;
  paymentStatus: string;
  dueDate?: Date;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  transactions?: Array<{
    id: string;
    amount: number;
    date: Date;
    method: string;
    reference?: string;
  }>;
}

interface PaymentStatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentFee: EnrollmentFee;
  studentName: string;
  onUpdate: (data: PaymentStatusUpdateFormData & { enrollmentFeeId: string }) => void;
  isLoading?: boolean;
}

export function PaymentStatusUpdateDialog({
  open,
  onOpenChange,
  enrollmentFee,
  studentName,
  onUpdate,
  isLoading = false,
}: PaymentStatusUpdateDialogProps) {
  // Calculate paid amount from transactions
  const calculatedPaidAmount = enrollmentFee.transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

  const form = useForm<PaymentStatusUpdateFormData>({
    resolver: zodResolver(paymentStatusUpdateSchema),
    defaultValues: {
      paymentStatus: enrollmentFee.paymentStatus as any,
      paidAmount: calculatedPaidAmount,
      paymentMethod: enrollmentFee.paymentMethod || '',
      transactionReference: '',
      notes: enrollmentFee.notes || '',
    },
  });

  const watchedPaymentStatus = form.watch('paymentStatus');
  const watchedPaidAmount = form.watch('paidAmount');

  const handleSubmit = (data: PaymentStatusUpdateFormData) => {
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
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Update Payment Status
          </DialogTitle>
          <DialogDescription>
            Update payment status for {studentName}'s enrollment fee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fee Summary */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Fee Summary</h4>
              <Badge className={getStatusColor(enrollmentFee.paymentStatus)}>
                {enrollmentFee.paymentStatus}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <p className="font-medium">${enrollmentFee.finalAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Paid Amount:</span>
                <p className="font-medium">${calculatedPaidAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining:</span>
                <p className="font-medium text-orange-600">
                  ${Math.max(0, enrollmentFee.finalAmount - (enrollmentFee.paidAmount || 0)).toFixed(2)}
                </p>
              </div>
              {enrollmentFee.dueDate && (
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <p className="font-medium">
                    {new Date(enrollmentFee.dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

              {/* Paid Amount */}
              {(watchedPaymentStatus === 'PARTIAL' || watchedPaymentStatus === 'PAID') && (
                <FormField
                  control={form.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Remaining amount: ${getRemainingAmount().toFixed(2)}
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
                          <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                          <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="CHECK">Check</SelectItem>
                          <SelectItem value="ONLINE">Online Payment</SelectItem>
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
                        <div className="relative">
                          <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter transaction reference or receipt number"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Optional: Receipt number, transaction ID, or reference
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this payment..."
                        className="resize-none"
                        rows={3}
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
                  {isLoading ? "Updating..." : "Update Payment Status"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
