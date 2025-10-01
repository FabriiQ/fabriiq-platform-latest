"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscountBadge, DiscountType } from "@/components/core/fee/discount-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";

const discountFormSchema = z.object({
  discountTypeId: z.string().min(1, "Discount type is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  reason: z.string().optional(),
});

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

interface DiscountTypeOption {
  id: string;
  name: string;
  type: DiscountType;
  discountValue: number;
  isPercentage: boolean;
  maxAmount?: number;
}

interface DiscountFormProps {
  enrollmentFeeId: string;
  discountTypes: DiscountTypeOption[];
  initialData?: Partial<DiscountFormValues>;
  onSubmit: (values: DiscountFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

export function DiscountForm({
  enrollmentFeeId,
  discountTypes,
  initialData,
  onSubmit,
  isLoading = false,
  className,
}: DiscountFormProps) {
  const { formatCurrency } = useCurrency();
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      discountTypeId: initialData?.discountTypeId || "",
      amount: initialData?.amount || 1,
      reason: initialData?.reason || "",
    },
  });

  const selectedDiscountTypeId = form.watch("discountTypeId");
  const selectedDiscountType = discountTypes.find(dt => dt.id === selectedDiscountTypeId);



  const handleSubmit = (values: DiscountFormValues) => {
    onSubmit(values);
  };

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Add Discount
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply discounts to reduce the fee amount for this enrollment</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="discountTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Discount Type <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the type of discount to apply. Each type has different rules and amounts.</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const discountType = discountTypes.find(dt => dt.id === value);
                      if (discountType) {
                        // Auto-set amount based on discount type
                        if (discountType.isPercentage) {
                          // For percentage discounts, set a reasonable default (the percentage value)
                          form.setValue("amount", discountType.discountValue);
                        } else {
                          // For fixed amount discounts, set the amount from the discount type
                          form.setValue("amount", discountType.discountValue);
                        }
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {discountTypes.map((discountType) => (
                        <SelectItem key={discountType.id} value={discountType.id}>
                          <div className="flex items-center">
                            <span className="mr-2">{discountType.name}</span>
                            <DiscountBadge
                              type={discountType.type}
                              value={discountType.discountValue}
                              isPercentage={discountType.isPercentage}
                            />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDiscountType && (
              <div className="rounded-md border p-3 bg-muted/50">
                <h3 className="text-sm font-medium mb-1">Discount Details</h3>
                <p className="text-sm">
                  {selectedDiscountType.isPercentage
                    ? `${selectedDiscountType.discountValue}% discount`
                    : `${formatCurrency(selectedDiscountType.discountValue)} fixed discount`}
                  {selectedDiscountType.maxAmount && selectedDiscountType.isPercentage
                    ? ` (Maximum: ${formatCurrency(selectedDiscountType.maxAmount)})`
                    : ""}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Amount <span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter the discount amount. For percentage discounts, this should be the calculated amount.</p>
                      </TooltipContent>
                    </Tooltip>
                  </FormLabel>
                  {selectedDiscountType?.isPercentage && (
                    <FormDescription>
                      Enter the calculated discount amount based on the percentage
                    </FormDescription>
                  )}
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for applying this discount"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Discount"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
    </TooltipProvider>
  );
}
