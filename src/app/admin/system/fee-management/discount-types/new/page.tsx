'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { ChevronLeft } from 'lucide-react';
import { DiscountTypeForm, DiscountTypeFormValues } from '@/components/shared/entities/fee';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function NewDiscountTypePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create discount type mutation
  const utils = api.useUtils();
  const createDiscountTypeMutation = api.discountType.create.useMutation({
    onSuccess: async (data) => {
      // Invalidate and refetch discount type queries
      await utils.discountType.getAll.invalidate();
      await utils.discountType.getById.invalidate({ id: data.id });

      toast({
        title: 'Discount type created',
        description: 'The discount type has been created successfully.',
      });
      // Navigate to the created discount type details
      router.push(`/admin/system/fee-management/discount-types/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error creating discount type',
        description: error.message || 'Failed to create discount type. Please try again.',
        variant: 'destructive' as const,
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const handleSubmit = (values: DiscountTypeFormValues) => {
    setIsSubmitting(true);
    // createdById is set on the server from the session
    createDiscountTypeMutation.mutate({
      ...values,
    } as any);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Discount Type</h1>
          <p className="text-muted-foreground">
            Create a new discount type for fee structures
          </p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Discount Type Form</CardTitle>
          <CardDescription>Fill in the discount type details below</CardDescription>
        </CardHeader>
        <CardContent>
          <DiscountTypeForm
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
