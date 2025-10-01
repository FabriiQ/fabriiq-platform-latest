"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
// Define types locally to avoid circular dependencies
export type FeeComponentType =
  | "TUITION"
  | "ADMISSION"
  | "REGISTRATION"
  | "LIBRARY"
  | "LABORATORY"
  | "SPORTS"
  | "TRANSPORT"
  | "HOSTEL"
  | "EXAMINATION"
  | "MISCELLANEOUS";

export interface FeeComponent {
  id?: string;
  name: string;
  type: FeeComponentType;
  amount: number;
  description?: string;
  isRecurring?: boolean;
  recurringInterval?: string;
}

// Simple local FeeComponentList implementation
function FeeComponentList({ components, showTotal = true, compact = false }: {
  components: FeeComponent[],
  showTotal?: boolean,
  compact?: boolean
}) {
  const total = components.reduce((sum, component) => sum + component.amount, 0);

  return (
    <div className={`space-y-${compact ? '2' : '4'}`}>
      <div className="grid gap-2">
        {components.map((component, index) => (
          <div key={index} className={`flex justify-between items-center ${compact ? 'p-2' : 'p-3'} border rounded-lg`}>
            <div>
              <div className={`font-medium ${compact ? 'text-sm' : ''}`}>{component.name}</div>
              <div className={`text-${compact ? 'xs' : 'sm'} text-muted-foreground`}>{component.type}</div>
              {component.description && (
                <div className={`text-${compact ? 'xs' : 'sm'} text-muted-foreground`}>{component.description}</div>
              )}
            </div>
            <div className="text-right">
              <div className={`font-medium ${compact ? 'text-sm' : ''}`}>${component.amount.toFixed(2)}</div>
              {component.isRecurring && (
                <div className="text-xs text-muted-foreground">{component.recurringInterval}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showTotal && (
        <div className={`flex justify-between items-center ${compact ? 'p-2' : 'p-3'} border-t font-semibold`}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
// Payment method constants
export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online Payment" },
];

export type PaymentStatus = "PAID" | "PENDING" | "PARTIAL" | "WAIVED";

// Simple PaymentMethodSelector component
function PaymentMethodSelector({ form, name, label, placeholder }: {
  form: any,
  name: string,
  label: string,
  placeholder: string
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const enrollmentFeeSchema = z.object({
  feeStructureId: z.string().min(1, "Fee structure is required"),
  dueDate: z.date().optional(),
  paymentStatus: z.enum(["PAID", "PENDING", "PARTIAL", "WAIVED"] as const),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  discounts: z.array(z.object({
    discountTypeId: z.string(),
    amount: z.number().min(0),
    reason: z.string().optional(),
  })).optional(),
});

export type EnrollmentFeeFormValues = z.infer<typeof enrollmentFeeSchema>;

// Discount type interface
interface DiscountType {
  id: string;
  name: string;
  discountValue: number;
  isPercentage: boolean;
  maxAmount?: number | null;
  applicableFor: string[];
}

interface FeeStructure {
  id: string;
  name: string;
  components: FeeComponent[];
  baseAmount: number;
}

interface EnrollmentFeeFormProps {
  enrollmentId: string;
  feeStructures: FeeStructure[];
  discountTypes?: DiscountType[];
  initialData?: Partial<EnrollmentFeeFormValues>;
  onSubmit: (values: EnrollmentFeeFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

export function EnrollmentFeeForm({
  enrollmentId,
  feeStructures,
  discountTypes = [],
  initialData,
  onSubmit,
  isLoading = false,
  className,
}: EnrollmentFeeFormProps) {
  const [selectedFeeStructure, setSelectedFeeStructure] = useState<FeeStructure | null>(
    initialData?.feeStructureId
      ? feeStructures.find(fs => fs.id === initialData.feeStructureId) || null
      : null
  );
  const [selectedDiscounts, setSelectedDiscounts] = useState<Array<{
    discountTypeId: string;
    amount: number;
    reason?: string;
  }>>(initialData?.discounts || []);

  const form = useForm<EnrollmentFeeFormValues>({
    resolver: zodResolver(enrollmentFeeSchema),
    defaultValues: {
      feeStructureId: initialData?.feeStructureId || "",
      dueDate: initialData?.dueDate,
      paymentStatus: (initialData?.paymentStatus as PaymentStatus) || "PENDING",
      paymentMethod: initialData?.paymentMethod || undefined,
      notes: initialData?.notes || undefined,
      discounts: initialData?.discounts || [],
    },
  });

  // Debug logging for fee structures
  console.log('EnrollmentFeeForm debug:', {
    enrollmentId,
    feeStructuresCount: feeStructures.length,
    feeStructures: feeStructures.map(fs => ({ id: fs.id, name: fs.name, baseAmount: fs.baseAmount })),
    discountTypesCount: discountTypes.length
  });

  const handleSubmit = (values: EnrollmentFeeFormValues) => {
    onSubmit(values);
  };

  const handleFeeStructureChange = (feeStructureId: string) => {
    const feeStructure = feeStructures.find(fs => fs.id === feeStructureId) || null;
    setSelectedFeeStructure(feeStructure);
  };

  const addDiscount = (discountTypeId: string) => {
    const discountType = discountTypes.find(dt => dt.id === discountTypeId);
    if (!discountType || !selectedFeeStructure) return;

    const baseAmount = selectedFeeStructure.baseAmount;
    let discountAmount = 0;

    if (discountType.isPercentage) {
      discountAmount = (baseAmount * discountType.discountValue) / 100;
      if (discountType.maxAmount && discountAmount > discountType.maxAmount) {
        discountAmount = discountType.maxAmount;
      }
    } else {
      discountAmount = discountType.discountValue;
    }

    const newDiscount = {
      discountTypeId,
      amount: discountAmount,
      reason: `${discountType.name} applied`,
    };

    const updatedDiscounts = [...selectedDiscounts, newDiscount];
    setSelectedDiscounts(updatedDiscounts);
    form.setValue("discounts", updatedDiscounts);
  };

  const removeDiscount = (index: number) => {
    const updatedDiscounts = selectedDiscounts.filter((_, i) => i !== index);
    setSelectedDiscounts(updatedDiscounts);
    form.setValue("discounts", updatedDiscounts);
  };

  const calculateTotalDiscount = () => {
    return selectedDiscounts.reduce((total, discount) => total + discount.amount, 0);
  };

  const calculateFinalAmount = () => {
    if (!selectedFeeStructure) return 0;
    return selectedFeeStructure.baseAmount - calculateTotalDiscount();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Enrollment Fee</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="feeStructureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Structure <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFeeStructureChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {feeStructures.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No fee structures available for this program
                        </div>
                      ) : (
                        feeStructures.map((feeStructure) => (
                          <SelectItem key={feeStructure.id} value={feeStructure.id}>
                            {feeStructure.name} (Rs. {feeStructure.baseAmount.toLocaleString()})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFeeStructure && (
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-2">Fee Structure Details</h3>
                <FeeComponentList
                  components={selectedFeeStructure.components}
                  showTotal={true}
                  compact={true}
                />
              </div>
            )}

            {/* Discount Section */}
            {selectedFeeStructure && discountTypes.length > 0 && (
              <div className="rounded-md border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Discounts</h3>
                  <Select onValueChange={addDiscount}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add discount" />
                    </SelectTrigger>
                    <SelectContent>
                      {discountTypes
                        .filter(dt => !selectedDiscounts.some(sd => sd.discountTypeId === dt.id))
                        .map((discountType) => (
                          <SelectItem key={discountType.id} value={discountType.id}>
                            {discountType.name} ({discountType.isPercentage ? `${discountType.discountValue}%` : `$${discountType.discountValue}`})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDiscounts.length > 0 && (
                  <div className="space-y-2">
                    {selectedDiscounts.map((discount, index) => {
                      const discountType = discountTypes.find(dt => dt.id === discount.discountTypeId);
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{discountType?.name}</Badge>
                            <span className="text-sm text-muted-foreground">
                              -${discount.amount.toFixed(2)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDiscount(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Total Discount:</span>
                      <span className="text-sm font-medium text-green-600">
                        -${calculateTotalDiscount().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Final Amount:</span>
                      <span className="text-sm font-medium">
                        ${calculateFinalAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

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
                          variant={"outline"}
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
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="WAIVED">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <PaymentMethodSelector
              form={form}
              name="paymentMethod"
              label="Payment Method"
              placeholder="Select payment method"
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this fee"
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
              {isLoading ? "Saving..." : "Assign Fee"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
