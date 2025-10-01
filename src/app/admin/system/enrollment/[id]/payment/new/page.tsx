"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { ChevronLeft, Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading";
import { EnrollmentPaymentForm, PaymentFormValues } from "@/components/shared/entities/enrollment";

export default function NewPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const enrollmentId = params?.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch enrollment data
  const { data: enrollment, isLoading: enrollmentLoading } = api.enrollment.getEnrollment.useQuery(
    { id: enrollmentId },
    { enabled: !!enrollmentId }
  );

  const handleSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      // In a real implementation, you would create a payment record
      console.log("Creating payment:", values);
      
      toast({
        title: "Payment Information Added",
        description: "Payment information has been successfully added.",
      });
      
      router.push(`/admin/system/enrollment/${enrollmentId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add payment information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/system/enrollment/${enrollmentId}`);
  };

  if (enrollmentLoading) {
    return (
      <div className="container mx-auto py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!enrollment?.success || !enrollment?.enrollment) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enrollment Not Found</h1>
            <p className="text-muted-foreground">The requested enrollment could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const enrollmentData = enrollment.enrollment;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={handleCancel}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Payment Information</h1>
          <p className="text-muted-foreground">
            Add payment information for {enrollmentData.student?.user?.name || 'Student'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentPaymentForm
            enrollmentId={enrollmentId}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" form="payment-form" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Payment Information"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
