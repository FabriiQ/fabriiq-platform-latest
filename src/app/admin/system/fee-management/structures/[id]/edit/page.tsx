'use client';

import { useState } from 'react';
import {  useRouter , useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/trpc/react';
import { ChevronLeft } from '@/components/ui/icons/custom-icons';
import { FeeStructureForm, FeeStructureFormValues, FeeComponent } from '@/components/shared/entities/fee';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/hooks/useAuth';

export default function EditFeeStructurePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch fee structure data
  const { data: feeStructure, isLoading: feeStructureLoading } = api.feeStructure.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Fetch related data
  const { data: programCampuses, isLoading: programCampusesLoading } = api.programCampus.getAll.useQuery();
  const { data: academicCycles, isLoading: academicCyclesLoading } = api.academicCycle.list.useQuery(
    user?.institutionId ? { institutionId: user.institutionId } : undefined,
    { enabled: !!user?.institutionId }
  );
  const { data: terms, isLoading: termsLoading } = api.term.list.useQuery({});

  // Mock data for development
  const mockFeeStructure = {
    id,
    name: 'Primary Program Annual Fee 2024-2025',
    description: 'Annual fee structure for Primary Years Program',
    programCampusId: 'pc-1',
    academicCycleId: 'ac-1',
    termId: 'term-1',
    components: [
      {
        id: 'comp-1',
        name: 'Tuition Fee',
        type: 'TUITION',
        amount: 5000,
        description: 'Basic tuition fee'
      },
      {
        id: 'comp-2',
        name: 'Library Fee',
        type: 'LIBRARY',
        amount: 500,
        description: 'Access to library resources'
      },
      {
        id: 'comp-3',
        name: 'Laboratory Fee',
        type: 'LABORATORY',
        amount: 1000,
        description: 'Access to laboratory facilities'
      },
      {
        id: 'comp-4',
        name: 'Sports Fee',
        type: 'SPORTS',
        amount: 200,
        description: 'Access to sports facilities'
      },
      {
        id: 'comp-5',
        name: 'Examination Fee',
        type: 'EXAMINATION',
        amount: 300,
        description: 'Examination and assessment costs'
      }
    ],
    isRecurring: false,
    recurringInterval: null,
    status: 'ACTIVE'
  };

  // Process data for form
  const processedProgramCampuses = programCampuses?.map(pc => ({
    id: pc.id,
    name: `${pc.campus.name} - ${pc.program.name}`
  })) || [];

  const processedAcademicCycles = academicCycles?.items?.map(ac => ({
    id: ac.id,
    name: ac.name
  })) || [];

  const processedTerms = terms?.terms?.map(term => ({
    id: term.id,
    name: term.name
  })) || [];

  // Update fee structure mutation
  const updateFeeStructureMutation = api.feeStructure.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Fee structure updated',
        description: 'The fee structure has been updated successfully.',
      });
      router.push(`/admin/system/fee-management/structures/${id}`);
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error updating fee structure',
        description: error.message,
        variant: 'destructive' as const,
      });
    },
  });

  // Handle form submission
  const handleSubmit = (values: FeeStructureFormValues) => {
    updateFeeStructureMutation.mutate({
      id,
      ...values,
    });
  };

  // Loading state
  const isLoading = feeStructureLoading || programCampusesLoading || academicCyclesLoading || termsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Fee Structure</h1>
          <p className="text-muted-foreground">
            Update the fee structure details and components
          </p>
        </div>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fee Structure Form</CardTitle>
            <CardDescription>Edit the fee structure details below</CardDescription>
          </CardHeader>
          <CardContent>
            {feeStructure ? (
              <FeeStructureForm
                programCampuses={processedProgramCampuses}
                academicCycles={processedAcademicCycles}
                terms={processedTerms}
                initialData={{
                  name: feeStructure.name,
                  description: feeStructure.description || '',
                  programCampusId: feeStructure.programCampusId,
                  academicCycleId: feeStructure.academicCycleId || '',
                  termId: feeStructure.termId || '',
                  components: (feeStructure.feeComponents as unknown as FeeComponent[]) || [],
                  isRecurring: feeStructure.isRecurring,
                  recurringInterval: feeStructure.recurringInterval || undefined,
                }}
                onSubmit={handleSubmit}
                isLoading={updateFeeStructureMutation.isLoading}
              />
            ) : isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading fee structure details...
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Fee structure not found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
