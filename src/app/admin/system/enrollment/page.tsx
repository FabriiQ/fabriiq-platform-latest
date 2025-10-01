'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { EnrollmentImportDialog } from '@/components/admin/system/enrollment/EnrollmentImportDialog';
import { EnrollmentExportDialog } from '@/components/admin/system/enrollment/EnrollmentExportDialog';
import { Input } from '@/components/ui/forms/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/forms/select';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-display/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination/pagination';
import { api } from '@/trpc/react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  FileText,
  Download,
  Eye,
  Edit,
  ArrowRight
} from 'lucide-react';
import { DollarSign } from '@/components/ui/icons/lucide-icons';
import { StudentTransferDialog } from '@/components/shared/entities/students/StudentTransferDialog';

// Define EnrollmentStatus enum locally since it's not properly exported from Prisma client
enum EnrollmentStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  WITHDRAWN = "WITHDRAWN",
  INACTIVE = "INACTIVE"
}

// Define the enrollment data type to match what the API returns
type Enrollment = {
  id: string;
  studentName: string | null;
  studentId: string;
  campusName: string;
  campusId: string;
  className: string;
  classId: string;
  programName: string;
  programId: string;
  startDate: Date;
  endDate: Date | null;
  status: string; // API returns string, we'll handle conversion in the UI
  hasFee: boolean;
};

export default function SystemEnrollmentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  // Handle tab change to update status filter
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedStatus(value);
    setCurrentPage(1);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [transferDialogOpen, setTransferDialogOpen] = useState<{ open: boolean; enrollment?: any }>({ open: false });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCampus, selectedProgram, selectedStatus, searchTerm]);

  // Fetch campuses for filter
  const { data: campuses, isLoading: campusesLoading } = api.campus.getAllCampuses.useQuery();

  // Fetch programs for filter
  const { data: programs, isLoading: programsLoading } = api.program.getAllPrograms.useQuery();

  // Fetch enrollments with filters and pagination
  const { data: enrollmentResponse, isLoading: enrollmentsLoading } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: selectedStatus,
    search: searchTerm,
    page: currentPage,
    pageSize: pageSize,
  });

  const enrollments = enrollmentResponse?.data || [];
  const pagination = enrollmentResponse?.pagination;

  // Fetch enrollment statistics for the cards
  const { data: allEnrollmentsStats } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: 'all',
    search: '',
    page: 1,
    pageSize: 1, // We only need the count
  });

  const { data: activeEnrollmentsStats } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: 'ACTIVE',
    search: '',
    page: 1,
    pageSize: 1,
  });

  const { data: pendingEnrollmentsStats } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: 'PENDING',
    search: '',
    page: 1,
    pageSize: 1,
  });

  const { data: completedEnrollmentsStats } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: 'COMPLETED',
    search: '',
    page: 1,
    pageSize: 1,
  });

  const { data: withdrawnEnrollmentsStats } = api.enrollment.getAllEnrollments.useQuery({
    campusId: selectedCampus,
    programId: selectedProgram,
    status: 'WITHDRAWN',
    search: '',
    page: 1,
    pageSize: 1,
  });

  // Calculate statistics from the responses
  const totalEnrollments = allEnrollmentsStats?.pagination?.totalCount || 0;
  const activeEnrollments = activeEnrollmentsStats?.pagination?.totalCount || 0;
  const pendingEnrollments = pendingEnrollmentsStats?.pagination?.totalCount || 0;
  const completedEnrollments = completedEnrollmentsStats?.pagination?.totalCount || 0;
  const withdrawnEnrollments = withdrawnEnrollmentsStats?.pagination?.totalCount || 0;

  // Fetch data for transfer dialog when needed
  const { data: availableClasses } = api.class.getAllClasses.useQuery(
    undefined,
    { enabled: transferDialogOpen.open }
  );

  const { data: availableCampuses } = api.campus.getAll.useQuery(
    undefined,
    { enabled: transferDialogOpen.open }
  );

  // Define table columns
  const columns: ColumnDef<Enrollment>[] = [
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
      accessorKey: 'programName',
      header: 'Program',
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={
          row.original.status === 'ACTIVE' ? 'success' :
          row.original.status === 'PENDING' ? 'warning' :
          row.original.status === 'COMPLETED' ? 'default' :
          'destructive'
        }>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'payment',
      header: 'Payment',
      cell: ({ row }) => (
        <Badge variant={row.original.hasFee ? 'warning' : 'outline'}>
          {row.original.hasFee ? 'Pending' : 'Not Set'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/system/enrollment/${row.original.id}`)}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/system/enrollment/${row.original.id}/edit`)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Enrollment Management</h1>
        <Button onClick={() => router.push('/admin/system/enrollment/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Enrollment
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawn Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawnEnrollments}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search enrollments..."
                className="w-full md:w-[200px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <EnrollmentImportDialog onSuccess={() => window.location.reload()} />
            <EnrollmentExportDialog onSuccess={() => window.location.reload()} />
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter enrollments by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {campuses?.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Programs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs</SelectItem>
                    {programs?.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollments</CardTitle>
              <CardDescription>Manage student enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={enrollments || []}
                    searchColumn="studentName"
                    pagination={false}
                  />
                  {pagination && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      totalCount={pagination.totalCount}
                      pageSize={pagination.pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setCurrentPage(1);
                      }}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardContent className="pt-6">
              {enrollmentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={enrollments || []}
                    searchColumn="studentName"
                    pagination={false}
                  />
                  {pagination && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      totalCount={pagination.totalCount}
                      pageSize={pagination.pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setCurrentPage(1);
                      }}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {enrollmentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={enrollments || []}
                    searchColumn="studentName"
                    pagination={false}
                  />
                  {pagination && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      totalCount={pagination.totalCount}
                      pageSize={pagination.pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setCurrentPage(1);
                      }}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="pt-6">
              {enrollmentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={enrollments || []}
                    searchColumn="studentName"
                    pagination={false}
                  />
                  {pagination && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      totalCount={pagination.totalCount}
                      pageSize={pagination.pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(newPageSize) => {
                        setPageSize(newPageSize);
                        setCurrentPage(1);
                      }}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Student Dialog */}
      {transferDialogOpen.open && transferDialogOpen.enrollment && (
        <StudentTransferDialog
          studentId={transferDialogOpen.enrollment.studentId}
          studentName={transferDialogOpen.enrollment.studentName || 'Unknown Student'}
          currentClasses={[{
            id: transferDialogOpen.enrollment.classId,
            name: transferDialogOpen.enrollment.className,
            code: transferDialogOpen.enrollment.className,
            campusId: transferDialogOpen.enrollment.campusId,
            campusName: transferDialogOpen.enrollment.campusName
          }]}
          availableClasses={availableClasses?.items?.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code || '',
            campusId: c.campusId,
            campusName: c.campus?.name || ''
          })) || []}
          currentCampusId={transferDialogOpen.enrollment.campusId}
          availableCampuses={availableCampuses?.map(c => ({
            id: c.id,
            name: c.name,
            code: c.name // Using name as code since code property doesn't exist
          })) || []}
          userId={transferDialogOpen.enrollment.studentId}
          trigger={<div />} // Hidden trigger since we're controlling the dialog state
          onSuccess={() => {
            setTransferDialogOpen({ open: false });
            // Refresh the enrollments data
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
