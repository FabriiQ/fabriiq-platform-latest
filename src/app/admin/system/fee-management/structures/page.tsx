'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Input } from '@/components/ui/forms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/forms/select';
import { DataTable } from '@/components/ui/data-display/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/trpc/react';
import {
  Search,
  Plus,
  Copy,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeeErrorBoundary, FeeLoadingSpinner, FeeEmptyState } from '@/components/shared/entities/fee/fee-error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/feedback/alert';

// Define the fee structure data type to match API response
type FeeStructure = {
  id: string;
  name: string;
  description?: string | null;
  programCampus: {
    program: {
      id: string;
      name: string;
    };
    campus: {
      id: string;
      name: string;
    };
  };
  academicCycleId?: string | null;
  termId?: string | null;
  feeComponents: any[];
  isRecurring: boolean;
  recurringInterval?: string | null;
  status: string;
  createdAt: Date;
};

export default function FeeStructuresPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedAcademicCycle, setSelectedAcademicCycle] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Ensure filter values are never empty strings
  const safeCampusValue = selectedCampus || 'all';
  const safeProgramValue = selectedProgram || 'all';
  const safeAcademicCycleValue = selectedAcademicCycle || 'all';
  const safeStatusValue = selectedStatus || 'all';

  // Fetch fee structures from API with caching
  const {
    data: feeStructuresData,
    isLoading: feeStructuresLoading,
    error: feeStructuresError,
    refetch: refetchFeeStructures
  } = api.feeStructure.getAll.useQuery({
    campusId: safeCampusValue === 'all' ? undefined : safeCampusValue,
    programId: safeProgramValue === 'all' ? undefined : safeProgramValue,
    academicCycleId: safeAcademicCycleValue === 'all' ? undefined : safeAcademicCycleValue,
    status: safeStatusValue === 'all' ? undefined : safeStatusValue,
  }, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch filter options from API (use real endpoints)
  const { data: campusesData, error: campusesError } = api.campus.getAllCampuses.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
  const { data: programsData, error: programsError } = api.program.getAllPrograms.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Get current user to determine institution for academic cycles
  const { data: currentUser } = api.user.getCurrent.useQuery();
  const institutionId = currentUser?.institutionId;
  const { data: academicCyclesRes, error: academicCyclesError } = api.academicCycle.list.useQuery(
    institutionId ? { institutionId } : undefined,
    { enabled: !!institutionId }
  );



  const campuses = campusesData || [];
  const programs = programsData || [];
  const academicCycles = academicCyclesRes?.items || [];

  // Process fee structures data
  const feeStructures: FeeStructure[] = (feeStructuresData || []) as FeeStructure[];

  // Define table columns
  const columns: ColumnDef<FeeStructure>[] = [
    {
      accessorKey: 'name',
      header: 'Fee Structure',
    },
    {
      accessorKey: 'programCampus.program.name',
      header: 'Program',
      cell: ({ row }) => row.original.programCampus.program.name,
    },
    {
      accessorKey: 'programCampus.campus.name',
      header: 'Campus',
      cell: ({ row }) => row.original.programCampus.campus.name,
    },
    {
      accessorKey: 'academicCycleId',
      header: 'Academic Cycle',
      cell: ({ row }) => row.original.academicCycleId || 'N/A',
    },
    {
      accessorKey: 'feeComponents',
      header: 'Base Amount',
      cell: ({ row }) => {
        const components = row.original.feeComponents;
        const total = Array.isArray(components) ? (components as any[]).reduce((sum: number, component: any) => sum + component.amount, 0) : 0;
        return `$${total.toLocaleString()}`;
      },
    },
    {
      accessorKey: 'isRecurring',
      header: 'Recurring',
      cell: ({ row }) => (
        <div>
          {row.original.isRecurring ? (
            <Badge variant="outline">{row.original.recurringInterval}</Badge>
          ) : (
            <span>One-time</span>
          )}
        </div>
      ),
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
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/structures/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/structures/${row.original.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Structure
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/system/fee-management/structures/${row.original.id}/clone`)}>
              <Copy className="mr-2 h-4 w-4" />
              Clone Structure
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Structure
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Show error state if there are critical errors
  if (feeStructuresError) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Fee Structures</AlertTitle>
          <AlertDescription>
            {feeStructuresError.message || 'Failed to load fee structures. Please try again.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => refetchFeeStructures()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FeeErrorBoundary>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <PageHeader
            title="Fee Structures"
            description="Manage fee structures across all campuses"
          />
          <div className="flex gap-2">
            <Button onClick={() => router.push('/admin/system/fee-management/structures/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Fee Structure
            </Button>
          </div>
        </div>

        {/* Show warnings for filter data errors */}
        {(campusesError || programsError) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Filter Data Warning</AlertTitle>
            <AlertDescription>
              Some filter options may not be available due to loading errors.
              {campusesError && ` Campus data: ${campusesError.message}`}
              {programsError && ` Program data: ${programsError.message}`}
            </AlertDescription>
          </Alert>
        )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter fee structures by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={safeCampusValue} onValueChange={(value) => setSelectedCampus(value || 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Campus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campuses</SelectItem>
                {(campuses || [])
                  .filter((campus) =>
                    campus &&
                    typeof campus.id === 'string' &&
                    campus.id.trim() !== '' &&
                    campus.id !== 'undefined' &&
                    campus.id !== 'null'
                  )
                  .map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name || 'Unnamed Campus'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={safeProgramValue} onValueChange={(value) => setSelectedProgram(value || 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {(programs || [])
                  .filter((program) =>
                    program &&
                    typeof program.id === 'string' &&
                    program.id.trim() !== '' &&
                    program.id !== 'undefined' &&
                    program.id !== 'null'
                  )
                  .map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name || 'Unnamed Program'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={safeAcademicCycleValue} onValueChange={(value) => setSelectedAcademicCycle(value || 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Academic Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Academic Cycles</SelectItem>
                {(academicCycles || [])
                  .filter((cycle) =>
                    cycle &&
                    typeof cycle.id === 'string' &&
                    cycle.id.trim() !== '' &&
                    cycle.id !== 'undefined' &&
                    cycle.id !== 'null'
                  )
                  .map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name || 'Unnamed Cycle'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={safeStatusValue} onValueChange={(value) => setSelectedStatus(value || 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
          <CardDescription>
            {feeStructuresLoading
              ? 'Loading fee structures...'
              : `Showing ${feeStructures.length} fee structures`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feeStructuresLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={feeStructures}
              searchColumn="name"
            />
          )}
        </CardContent>
      </Card>
    </div>
    </FeeErrorBoundary>
  );
}
