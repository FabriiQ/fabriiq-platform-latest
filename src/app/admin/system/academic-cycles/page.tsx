'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-display/data-table';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/forms/select';
import { Input } from '@/components/ui/input';
import { api } from '@/trpc/react';
import { formatDate } from '@/lib/utils';
import { Plus, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/core/alert';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Card } from '@/components/ui/card';
import { SystemStatus } from '@/server/api/constants';
import { AcademicCycleType } from '@/server/api/types/academic-calendar';
import { useInstitution } from '@/providers/institution-provider';

// Define the filter type
interface AcademicCycleFilters {
  type: string | undefined;
  status: string | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  searchQuery: string;
}

type AcademicCycle = {
  id: string;
  code: string;
  name: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: string;
};

const AcademicCyclesPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { institutionId } = useInstitution();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fetch current user to reliably get institutionId from backend session
  const { data: currentUser } = api.user.getCurrent.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const effectiveInstitutionId = currentUser?.institutionId || institutionId;

  // Define filters state with proper typing (must be called unconditionally)
  const [filters, setFilters] = useState<AcademicCycleFilters>({
    type: undefined,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
    searchQuery: '',
  });

  // Fetch academic cycles (call hook unconditionally; gate with enabled and safe input)
  const { data, isLoading, error } = api.academicCycle.list.useQuery(
    effectiveInstitutionId ? { institutionId: effectiveInstitutionId } : undefined,
    {
      enabled: !!effectiveInstitutionId,
      onSuccess: (data) => {
        console.log("Academic cycles loaded:", data);
        setDebugInfo({
          cyclesCount: data?.items?.length || 0,
          institutionId: effectiveInstitutionId,
          userId: user?.id,
        });
      },
      onError: (err) => {
        console.error("Error loading academic cycles:", err);
        setDebugInfo({
          error: err.message,
          institutionId: effectiveInstitutionId,
          userId: user?.id,
        });
      },
    }
  );

  // Show a loading state if we're still loading the user
  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Academic Cycles"
          description="Loading user information..."
        />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Check user permissions
  if (user.userType !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Extract academic cycles from the paginated response
  const academicCycles = data?.items ?? [];

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<AcademicCycleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Apply filters to academic cycles
  const filteredData = academicCycles.filter((cycle: AcademicCycle) => {
    // Type filter
    if (filters.type && cycle.type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status && cycle.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.startDate && new Date(cycle.startDate) < filters.startDate) {
      return false;
    }

    if (filters.endDate && new Date(cycle.endDate) > filters.endDate) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        cycle.name.toLowerCase().includes(query) ||
        cycle.code.toLowerCase().includes(query) ||
        cycle.type.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Define columns for the data table
  const columns = [
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }: { row: { original: AcademicCycle } }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: 'endDate',
      header: 'End Date',
      cell: ({ row }: { row: { original: AcademicCycle } }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: AcademicCycle } }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.original.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          row.original.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: { row: { original: AcademicCycle } }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/system/academic-cycles/${row.original.id}/edit`);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Academic Cycles"
          description="Error loading academic cycles"
        />
        <div className="flex min-h-screen items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message}
              {debugInfo && (
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Academic Cycles"
          description="Manage your institution's academic cycles"
        />
        <Button onClick={() => router.push('/admin/system/academic-cycles/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Academic Cycle
        </Button>
      </div>

      <Card className="p-6">
        {/* Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-40">
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) => handleFilterChange({ type: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={AcademicCycleType.ANNUAL}>Annual</SelectItem>
                  <SelectItem value={AcademicCycleType.SEMESTER}>Semester</SelectItem>
                  <SelectItem value={AcademicCycleType.TRIMESTER}>Trimester</SelectItem>
                  <SelectItem value={AcademicCycleType.QUARTER}>Quarter</SelectItem>
                  <SelectItem value={AcademicCycleType.CUSTOM}>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-40">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange({ status: value === 'all' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={SystemStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={SystemStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={SystemStatus.DELETED}>Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-40">
              <DatePicker
                date={filters.startDate}
                setDate={(date: Date | undefined) => handleFilterChange({ startDate: date })}
                placeholder="Select start date"
              />
            </div>

            <div className="w-40">
              <DatePicker
                date={filters.endDate}
                setDate={(date: Date | undefined) => handleFilterChange({ endDate: date })}
                placeholder="Select end date"
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search academic cycles..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <details>
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <pre className="mt-2 overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        {/* Data table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No academic cycles found</h3>
            <p className="text-gray-500 mb-4">
              {filters.searchQuery || filters.type || filters.status || filters.startDate || filters.endDate
                ? 'Try adjusting your filters'
                : 'Get started by creating your first academic cycle'}
            </p>
            <Button onClick={() => router.push('/admin/system/academic-cycles/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Academic Cycle
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
            emptyMessage="No academic cycles found"
            onRowClick={(row) => router.push(`/admin/system/academic-cycles/${row.id}/edit`)}
          />
        )}
      </Card>
    </div>
  );
};

export default AcademicCyclesPage;

