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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const discountApplicationSchema = z.object({
  discountTypeId: z.string().min(1, 'Discount type is required'),
  customAmount: z.number().optional(),
  reason: z.string().min(1, 'Reason is required'),
  isRecurring: z.boolean().default(false),
  recurringMonths: z.number().optional(),
});

type DiscountApplicationFormData = z.infer<typeof discountApplicationSchema>;

interface DiscountType {
  id: string;
  name: string;
  description?: string;
  discountValue: number;
  isPercentage: boolean;
  maxAmount?: number;
  type: 'MERIT' | 'NEED_BASED' | 'SIBLING' | 'EMPLOYEE' | 'SPECIAL';
}

interface DiscountApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentFeeId: string;
  studentName: string;
  currentFeeAmount: number;
  discountTypes: DiscountType[];
  onApply: (data: DiscountApplicationFormData & { amount: number }) => void;
  isLoading?: boolean;
}

export function DiscountApplicationDialog({
  open,
  onOpenChange,
  enrollmentFeeId,
  studentName,
  currentFeeAmount,
  discountTypes,
  onApply,
  isLoading = false,
}: DiscountApplicationDialogProps) {
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountType | null>(null);
  const [calculatedDiscount, setCalculatedDiscount] = useState<number>(0);

  const form = useForm<DiscountApplicationFormData>({
    resolver: zodResolver(discountApplicationSchema),
    defaultValues: {
      discountTypeId: '',
      reason: '',
      isRecurring: false,
    },
  });

  const watchIsRecurring = form.watch('isRecurring');
  const watchCustomAmount = form.watch('customAmount');

  const handleSubmit = (data: DiscountApplicationFormData) => {
    // Calculate the final discount amount
    let finalAmount = calculatedDiscount;

    // If custom amount is provided, use it
    if (data.customAmount && data.customAmount > 0) {
      finalAmount = Math.min(data.customAmount, currentFeeAmount);
    }

    // If no amount calculated yet, calculate it from selected discount
    if (finalAmount === 0 && selectedDiscount) {
      if (selectedDiscount.isPercentage) {
        finalAmount = (currentFeeAmount * selectedDiscount.discountValue) / 100;
        if (selectedDiscount.maxAmount && finalAmount > selectedDiscount.maxAmount) {
          finalAmount = selectedDiscount.maxAmount;
        }
      } else {
        finalAmount = selectedDiscount.discountValue;
      }
      finalAmount = Math.min(finalAmount, currentFeeAmount);
    }

    // Ensure we have a valid amount
    if (finalAmount <= 0) {
      console.error('Invalid discount amount:', finalAmount);
      // Show error to user instead of silently failing
      alert('Please select a discount type or enter a valid custom amount.');
      return;
    }

    // Validate required fields
    if (!data.discountTypeId) {
      alert('Please select a discount type.');
      return;
    }

    if (!data.reason || data.reason.trim() === '') {
      alert('Please provide a reason for the discount.');
      return;
    }

    console.log('Submitting discount with amount:', finalAmount);

    // Include the calculated amount in the submission
    onApply({
      ...data,
      amount: finalAmount,
    });
  };

  const handleDiscountChange = (discountTypeId: string) => {
    const discount = discountTypes.find(dt => dt.id === discountTypeId);
    setSelectedDiscount(discount || null);
    form.setValue('discountTypeId', discountTypeId);

    if (discount) {
      // Always calculate discount, even without custom amount
      calculateDiscount(discount, watchCustomAmount || 0);
    } else {
      setCalculatedDiscount(0);
    }
  };

  const calculateDiscount = (discount: DiscountType, customAmount?: number) => {
    let discountAmount = 0;

    // Use custom amount if provided and greater than 0
    if (customAmount && customAmount > 0) {
      discountAmount = customAmount;
    } else {
      // Calculate based on discount type
      if (discount.isPercentage) {
        discountAmount = (currentFeeAmount * discount.discountValue) / 100;
        if (discount.maxAmount && discountAmount > discount.maxAmount) {
          discountAmount = discount.maxAmount;
        }
      } else {
        discountAmount = discount.discountValue;
      }
    }

    const finalAmount = Math.min(discountAmount, currentFeeAmount);
    setCalculatedDiscount(finalAmount);
    console.log('Calculated discount:', finalAmount, 'for discount type:', discount.name);
  };

  const handleCustomAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    form.setValue('customAmount', amount);
    if (selectedDiscount) {
      calculateDiscount(selectedDiscount, amount);
    }
  };

  const getDiscountTypeColor = (type: string) => {
    switch (type) {
      case 'MERIT': return 'bg-blue-100 text-blue-800';
      case 'NEED_BASED': return 'bg-green-100 text-green-800';
      case 'SIBLING': return 'bg-purple-100 text-purple-800';
      case 'EMPLOYEE': return 'bg-orange-100 text-orange-800';
      case 'SPECIAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Apply a discount to {studentName}'s fee
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Fee Amount</span>
                <span className="text-lg font-bold">Rs. {currentFeeAmount.toLocaleString()}</span>
              </div>
              {calculatedDiscount > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center text-green-600">
                    <span>Discount Amount</span>
                    <span className="font-bold">- Rs. {calculatedDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Final Amount</span>
                    <span>Rs. {(currentFeeAmount - calculatedDiscount).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <FormField
              control={form.control}
              name="discountTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Type</FormLabel>
                  <Select onValueChange={handleDiscountChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a discount type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {discountTypes.map((discount) => (
                        <SelectItem key={discount.id} value={discount.id}>
                          <div className="flex items-center gap-2">
                            <Badge className={getDiscountTypeColor(discount.type)}>
                              {discount.type.replace('_', ' ')}
                            </Badge>
                            <div className="flex flex-col">
                              <span className="font-medium">{discount.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {discount.isPercentage ? (
                                  `${discount.discountValue}%`
                                ) : (
                                  `Rs. ${discount.discountValue}`
                                )}
                                {discount.maxAmount && (
                                  <span>(Max: Rs. {discount.maxAmount})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDiscount && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Discount Details</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedDiscount.description}
                </p>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Default Value:</span>
                    <span>
                      {selectedDiscount.isPercentage 
                        ? `${selectedDiscount.discountValue}%` 
                        : `Rs. ${selectedDiscount.discountValue}`}
                    </span>
                  </div>
                  {selectedDiscount.maxAmount && (
                    <div className="flex justify-between">
                      <span>Maximum Amount:</span>
                      <span>Rs. {selectedDiscount.maxAmount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="customAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Discount Amount (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter custom amount"
                      value={field.value || ''}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty to use the default discount value
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Discount</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this discount is being applied..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Recurring Discount</FormLabel>
                    <FormDescription>
                      Apply this discount for multiple months
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchIsRecurring && (
              <FormField
                control={form.control}
                name="recurringMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Months</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder="Enter number of months"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many months should this discount be applied?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            </form>
          </Form>
        </div>

        <DialogFooter className="mt-4">
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
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
