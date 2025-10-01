'use client';

import { useState } from 'react';
import {  useRouter , useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import {
  Edit,
  Trash2,
  Calendar,
  User
} from 'lucide-react';
import { ChevronLeft, Percent, DollarSign, Tag } from '@/components/ui/icons/custom-icons';
import { DataTable } from '@/components/ui/data-display/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

export default function DiscountTypeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch discount type data
  const { data: discountType, isLoading: discountTypeLoading } = api.discountType.getById.useQuery(
    { id },
    { enabled: !!id }
  );

  // TODO: Implement API to fetch enrollments using this discount type
  const enrollmentsLoading = false;
  const enrollments: any[] = [];

  // Delete discount type mutation
  const deleteDiscountTypeMutation = api.discountType.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Discount type deleted',
        description: 'The discount type has been deleted successfully.',
      });
      router.push('/admin/system/fee-management/discount-types');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete discount type. Please try again.',
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
      accessorKey: 'discountAmount',
      header: 'Discount Amount',
      cell: ({ row }) => `$${row.original.discountAmount.toLocaleString()}`,
    },
    {
      accessorKey: 'appliedDate',
      header: 'Applied Date',
      cell: ({ row }) => new Date(row.original.appliedDate).toLocaleDateString(),
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
          View Fee
        </Button>
      ),
    },
  ];

  // Handle delete discount type
  const handleDelete = () => {
    deleteDiscountTypeMutation.mutate({ id });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{discountType?.name || 'Discount Type'}</h1>
            <p className="text-muted-foreground">
              {discountType?.description || 'Loading discount type details...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/system/fee-management/discount-types/${id}/edit`)}>
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
                  This will permanently delete the discount type. This action cannot be undone.
                  {enrollments.length > 0 && (
                    <p className="mt-2 text-destructive font-semibold">
                      Warning: This discount type is used by {enrollments.length} enrollments.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discount Details</CardTitle>
            <CardDescription>Discount type information</CardDescription>
          </CardHeader>
          <CardContent>
            {discountType ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  {discountType.isPercentage ? (
                    <>
                      <Percent className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Discount Value:</span>
                      <span className="ml-2">{discountType.discountValue}%</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Discount Value:</span>
                      <span className="ml-2">${discountType.discountValue.toLocaleString()}</span>
                    </>
                  )}
                </div>
                {discountType.maxAmount && (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Maximum Amount:</span>
                    <span className="ml-2">${discountType.maxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Applicable For:</span>
                  <div className="ml-2 flex flex-wrap gap-1">
                    {discountType.applicableFor.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Created At:</span>
                  <span className="ml-2">{new Date(discountType.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <Badge variant={discountType.status === 'ACTIVE' ? 'success' : 'destructive'}>
                    {discountType.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading discount type details...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>How this discount type is being used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Enrollments:</span>
                <span>{enrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Discount Amount:</span>
                <span>${enrollments.reduce((sum, e) => sum + (e.discountAmount || 0), 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Average Discount:</span>
                <span>
                  ${enrollments.length > 0
                    ? (enrollments.reduce((sum, e) => sum + (e.discountAmount || 0), 0) / enrollments.length).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments Using This Discount Type</CardTitle>
          <CardDescription>
            {enrollmentsLoading
              ? 'Loading enrollments...'
              : `${enrollments.length} enrollments using this discount type`}
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
              No enrollments are using this discount type
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
