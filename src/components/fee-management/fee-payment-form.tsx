'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodSelect } from '@/components/ui/payment-method-select';
import { PaymentMethod } from '@/types/payment-methods';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import { Loader2, FileText, Banknote } from 'lucide-react';

const feePaymentSchema = z.object({
  enrollmentFeeId: z.string().min(1, 'Enrollment fee ID is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FeePaymentFormData = z.infer<typeof feePaymentSchema>;

interface FeePaymentFormProps {
  enrollmentFeeId: string;
  studentName: string;
  pendingAmount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeePaymentForm({
  enrollmentFeeId,
  studentName,
  pendingAmount,
  onSuccess,
  onCancel,
}: FeePaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeePaymentFormData>({
    resolver: zodResolver(feePaymentSchema),
    defaultValues: {
      enrollmentFeeId,
      amount: pendingAmount,
      method: PaymentMethod.ON_CAMPUS_COUNTER,
      reference: '',
      notes: '',
      receiptUrl: '',
    },
  });

  const addTransactionMutation = api.enrollmentFee.addTransaction.useMutation({
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to record payment');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: FeePaymentFormData) => {
    setIsSubmitting(true);
    addTransactionMutation.mutate({
      ...data,
      date: new Date(),
      createdById: 'current-user', // This should be replaced with actual user ID from session
    });
  };

  const selectedMethod = form.watch('method');
  const enteredAmount = form.watch('amount');

  // Payment method specific fields
  const requiresReference = [
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.JAZZ_CASH,
    PaymentMethod.EASY_PAISA,
    PaymentMethod.CHEQUE,
    PaymentMethod.ONLINE_BANKING,
  ].includes(selectedMethod);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Record Fee Payment
        </CardTitle>
        <CardDescription>
          Recording payment for <strong>{studentName}</strong>
          <br />
          Pending Amount: <strong>Rs. {pendingAmount.toLocaleString()}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={pendingAmount}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum: Rs. {pendingAmount.toLocaleString()}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <FormControl>
                      <PaymentMethodSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select payment method..."
                        showPopularFirst={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {requiresReference && (
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Reference Number *
                      {selectedMethod === PaymentMethod.BANK_TRANSFER && ' (Transaction ID)'}
                      {selectedMethod === PaymentMethod.JAZZ_CASH && ' (Transaction ID)'}
                      {selectedMethod === PaymentMethod.EASY_PAISA && ' (Transaction ID)'}
                      {selectedMethod === PaymentMethod.CHEQUE && ' (Cheque Number)'}
                      {selectedMethod === PaymentMethod.ONLINE_BANKING && ' (Reference Number)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter reference number..."
                        {...field}
                        required={requiresReference}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedMethod === PaymentMethod.BANK_TRANSFER && 'Bank transaction reference number'}
                      {selectedMethod === PaymentMethod.JAZZ_CASH && 'JazzCash transaction ID'}
                      {selectedMethod === PaymentMethod.EASY_PAISA && 'EasyPaisa transaction ID'}
                      {selectedMethod === PaymentMethod.CHEQUE && 'Bank cheque number'}
                      {selectedMethod === PaymentMethod.ONLINE_BANKING && 'Online banking reference'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="receiptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/receipt.pdf"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to digital receipt or proof of payment
                  </FormDescription>
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
                      placeholder="Additional notes about this payment..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Any additional information about this payment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Payment Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Student:</div>
                <div className="font-medium">{studentName}</div>
                <div>Payment Amount:</div>
                <div className="font-medium">Rs. {enteredAmount?.toLocaleString() || '0'}</div>
                <div>Remaining Balance:</div>
                <div className="font-medium">
                  Rs. {Math.max(0, pendingAmount - (enteredAmount || 0)).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
