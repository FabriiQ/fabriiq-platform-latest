'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { ChevronLeft } from '@/components/ui/icons/custom-icons';
import { FeeStructureForm, FeeStructureFormValues } from '@/components/shared/entities/fee/fee-structure-form';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';

export default function NewFeeStructurePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data from API
  const { data: programCampusesData, isLoading: programCampusesLoading, error: programCampusesError } = api.programCampus.getAll.useQuery();

  // Use a default institution ID if user doesn't have one (for system admin)
  const institutionId = user?.institutionId || 'default';

  const { data: academicCyclesData, isLoading: academicCyclesLoading, error: academicCyclesError } = api.academicCycle.list.useQuery(
    { institutionId },
    { enabled: !!institutionId }
  );
  const { data: termsData, isLoading: termsLoading, error: termsError } = api.term.list.useQuery({
    page: 1,
    pageSize: 100, // Get all terms
    status: 'ACTIVE'
  });

  // Process data
  const programCampuses = programCampusesData?.map(pc => ({
    id: pc.id,
    name: `${pc.campus.name} - ${pc.program.name}`
  })) || [];

  const academicCycles = academicCyclesData?.items?.map(ac => ({
    id: ac.id,
    name: ac.name
  })) || [];
  const terms = termsData?.terms?.map(term => ({
    id: term.id,
    name: term.name
  })) || [];

  // Loading and error states
  const isLoading = programCampusesLoading || academicCyclesLoading || termsLoading;
  const hasError = programCampusesError || academicCyclesError || termsError;

  // Debug logging
  console.log('Fee Structure New Page Data:', {
    user,
    institutionId,
    programCampusesData,
    academicCyclesData,
    termsData,
    programCampuses,
    academicCycles,
    terms,
    isLoading,
    hasError,
    errors: {
      programCampusesError: programCampusesError?.message,
      academicCyclesError: academicCyclesError?.message,
      termsError: termsError?.message
    }
  });

  // Create fee structure mutation
  const utils = api.useUtils();
  const createFeeStructureMutation = api.feeStructure.create.useMutation({
    onSuccess: async (data) => {
      // Invalidate and refetch fee structure queries
      await utils.feeStructure.getAll.invalidate();
      await utils.feeStructure.getById.invalidate({ id: data.id });

      toast({
        title: 'Fee structure created',
        description: 'The fee structure has been created successfully.',
      });
      router.push(`/admin/system/fee-management/structures/${data.id}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error creating fee structure',
        description: error.message || 'Failed to create fee structure. Please try again.',
        variant: 'destructive' as const,
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const handleSubmit = (values: FeeStructureFormValues) => {
    setIsSubmitting(true);
    // createdById is set on the server from the session
    createFeeStructureMutation.mutate({
      name: values.name,
      description: values.description,
      programCampusId: values.programCampusId,
      academicCycleId: values.academicCycleId,
      termId: values.termId,
      feeComponents: values.components,
      isRecurring: values.isRecurring,
      recurringInterval: values.recurringInterval,
    } as any);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Fee Structure</h1>
          <p className="text-muted-foreground">
            Create a new fee structure for a program campus
          </p>
        </div>
      </div>

      <Separator />

      {hasError ? (
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>There was an error loading the required data for the form</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {programCampusesError && (
                <p className="text-red-600">Program Campuses: {programCampusesError.message}</p>
              )}
              {academicCyclesError && (
                <p className="text-red-600">Academic Cycles: {academicCyclesError.message}</p>
              )}
              {termsError && (
                <p className="text-red-600">Terms: {termsError.message}</p>
              )}
            </div>
            <div className="mt-4">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fee Structure Form</CardTitle>
            <CardDescription>Fill in the fee structure details below</CardDescription>
          </CardHeader>
          <CardContent>
            <FeeStructureForm
              programCampuses={programCampuses}
              academicCycles={academicCycles}
              terms={terms}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
