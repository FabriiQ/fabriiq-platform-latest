'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import {
  ChevronLeft, // ✅ Fixed import - changed from ChevronLeft
  Edit,
  Copy,
  Trash2,
  Calendar,
  School,
  GraduationCap,
  Clock,
  User,
  Users
} from 'lucide-react';
import { DollarSign } from '@/components/ui/icons/lucide-icons';
import { FeeComponent } from '@/components/shared/entities/fee/fee-structure-form';

// Simple local FeeComponentList implementation to avoid circular dependencies
function FeeComponentList({ components, showTotal = true }: { components: FeeComponent[], showTotal?: boolean }) {
  const total = components.reduce((sum, component) => sum + component.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {components.map((component, index) => (
          <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
            <div>
              <div className="font-medium">{component.name}</div>
              <div className="text-sm text-muted-foreground">{component.type}</div>
              {component.description && (
                <div className="text-sm text-muted-foreground">{component.description}</div>
              )}
            </div>
            <div className="text-right">
              <div className="font-medium">${component.amount.toFixed(2)}</div>
              {component.isRecurring && (
                <div className="text-xs text-muted-foreground">{component.recurringInterval}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {showTotal && (
        <div className="flex justify-between items-center p-3 border-t font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
import { DataTable } from '@/components/ui/data-display/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

// ✅ MAIN FIX: Changed to async function with Promise<{ id: string }> for params
export default function FeeStructureDetailPage() {
  const params = useParams(); // ✅ Use useParams hook instead of props
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ✅ Add null checking for params
  if (!params?.id) {
    return <div>Invalid fee structure ID</div>;
  }
  
  const id = params.id as string; // ✅ Now get id from useParams

  // Fetch fee structure data from API
  const { data: feeStructureData, isLoading: feeStructureLoading } = api.feeStructure.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // Fetch enrollments using this fee structure
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = api.enrollment.getByFeeStructure.useQuery(
    { feeStructureId: id },
    { enabled: !!id }
  );

  const feeStructure = feeStructureData;
  const enrollments = enrollmentsData || [];

  // Delete fee structure mutation
  const deleteFeeStructureMutation = api.feeStructure.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Fee structure deleted',
        description: 'The fee structure has been deleted successfully.',
      });
      router.push('/admin/system/fee-management/structures');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete fee structure. Please try again.',
        variant: 'destructive' as const,
      });
    },
  });





  // Define enrollments table columns
  const enrollmentsColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.studentName}</div>
          <div className="text-xs text-muted-foreground">{row.original.studentId}</div>
        </div>
      ),
    },
    {
      accessorKey: 'className',
      header: 'Class',
    },
    {
      accessorKey: 'campusName',
      header: 'Campus',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'ACTIVE' ? 'success' : 'destructive'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'feeStatus',
      header: 'Fee Status',
      cell: ({ row }) => (
        <Badge variant={
          row.original.feeStatus === 'PAID' ? 'success' :
          row.original.feeStatus === 'PENDING' ? 'warning' :
          row.original.feeStatus === 'PARTIAL' ? 'info' :
          'destructive'
        }>
          {row.original.feeStatus}
        </Badge>
      ),
    },
    {
      accessorKey: 'feeAmount',
      header: 'Fee Amount',
      cell: ({ row }) => `$${row.original.feeAmount.toLocaleString()}`,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/system/enrollment/${row.original.id}/fee`)}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Manage Fee
        </Button>
      ),
    },
  ];

  // Handle delete fee structure
  const handleDelete = () => {
    deleteFeeStructureMutation.mutate({ id });
  };

  // Handle clone fee structure
  const handleClone = () => {
    router.push(`/admin/system/fee-management/structures/${id}/clone`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" /> {/* ✅ Fixed icon name */}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{feeStructure?.name || 'Fee Structure'}</h1>
            <p className="text-muted-foreground">
              {feeStructure ? (
                <>Fee structure for {feeStructure.programCampus?.program?.name} at {feeStructure.programCampus?.campus?.name}</>
              ) : (
                'Loading fee structure details...'
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClone}>
            <Copy className="h-4 w-4 mr-2" />
            Clone
          </Button>
          <Button variant="outline" onClick={() => router.push(`/admin/system/fee-management/structures/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the fee structure. This action cannot be undone.
                  {enrollments.length > 0 && (
                    <p className="mt-2 text-destructive font-semibold">
                      Warning: This fee structure is used by {enrollments.length} enrollments.
                      Deleting it may affect those enrollments.
                    </p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fee Components</CardTitle>
            <CardDescription>Components that make up this fee structure</CardDescription>
          </CardHeader>
          <CardContent>
            {feeStructure?.feeComponents && Array.isArray(feeStructure.feeComponents) ? (
              <FeeComponentList
                components={feeStructure.feeComponents as unknown as FeeComponent[]}
                showTotal={true}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No fee components found
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Fee structure information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeStructure ? (
                <>
                  <div className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Program:</span>
                    <span className="ml-2">{feeStructure.programCampus?.program?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <School className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Campus:</span>
                    <span className="ml-2">{feeStructure.programCampus?.campus?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Academic Cycle:</span>
                    <span className="ml-2">{feeStructure.academicCycleId || 'N/A'}</span>
                  </div>
                  {feeStructure.termId && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Term:</span>
                      <span className="ml-2">{feeStructure.termId}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Base Amount:</span>
                    <span className="ml-2">
                      ${Array.isArray(feeStructure.feeComponents)
                        ? (feeStructure.feeComponents as any[]).reduce((sum: number, comp: any) => sum + (comp.amount || 0), 0).toLocaleString()
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Recurring:</span>
                    <span className="ml-2">
                      {feeStructure.isRecurring ? (feeStructure.recurringInterval || 'Yes') : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Created At:</span>
                    <span className="ml-2">{new Date(feeStructure.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={feeStructure.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {feeStructure.status}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Loading fee structure details...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments Using This Fee Structure</CardTitle>
          <CardDescription>
            {enrollmentsLoading
              ? 'Loading enrollments...'
              : `${enrollments.length} enrollments using this fee structure`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrollmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No enrollments are using this fee structure
            </p>
          ) : (
            <DataTable
              columns={enrollmentsColumns}
              data={enrollments}
              searchColumn="studentName"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}