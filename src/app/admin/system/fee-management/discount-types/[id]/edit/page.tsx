'use client';

import { useState } from 'react';
import {  useRouter , useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { ChevronLeft } from '@/components/ui/icons/lucide-icons';
import { DiscountTypeForm, DiscountTypeFormValues } from '@/components/shared/entities/fee';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading';

export default function EditDiscountTypePage() {
  const params = useParams();
  const id = params?.id as string;

  if (!id) {
    return <div>Invalid discount type ID</div>;
  }
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch discount type data
  const { data: discountType, isLoading: discountTypeLoading } = api.discountType.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Update discount type mutation
  const updateDiscountTypeMutation = api.discountType.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Discount type updated',
        description: 'The discount type has been updated successfully.',
      });
      router.push(`/admin/system/fee-management/discount-types/${id}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error updating discount type',
        description: error.message,
        variant: 'error',
      });
    },
  });

  // Handle form submission
  const handleSubmit = (values: DiscountTypeFormValues) => {
    updateDiscountTypeMutation.mutate({
      id,
      ...values,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Discount Type</h1>
          <p className="text-muted-foreground">
            Update the discount type details
          </p>
        </div>
      </div>

      <Separator />

      {discountTypeLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Discount Type Form</CardTitle>
            <CardDescription>Edit the discount type details below</CardDescription>
          </CardHeader>
          <CardContent>
            {discountType ? (
              <DiscountTypeForm
                initialData={{
                  name: discountType.name,
                  description: discountType.description || '',
                  discountValue: discountType.discountValue,
                  isPercentage: discountType.isPercentage,
                  maxAmount: discountType.maxAmount || undefined,
                  applicableFor: discountType.applicableFor,
                }}
                onSubmit={handleSubmit}
                isLoading={updateDiscountTypeMutation.isLoading}
              />
            ) : discountTypeLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading discount type details...
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Discount type not found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
