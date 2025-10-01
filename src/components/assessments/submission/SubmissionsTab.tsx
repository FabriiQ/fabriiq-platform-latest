'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Upload, 
  Eye, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { SubmissionStatus } from '@/server/api/constants';
import { toast } from 'sonner';
import { SubmissionViewDialog } from './SubmissionViewDialog';
import { SubmissionFileUpload } from './SubmissionFileUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SubmissionsTabProps {
  assessmentId: string;
  assessment: {
    id: string;
    title: string;
    maxScore?: number | null;
  };
  className?: string;
}

const ITEMS_PER_PAGE = 20;

export function SubmissionsTab({
  assessmentId,
  assessment,
  className,
}: SubmissionsTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('ALL');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Fetch submissions with pagination
  const { data: submissionsData, isLoading, refetch } = api.assessment.listSubmissions.useQuery({
    assessmentId,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  }, {
    enabled: !!assessmentId,
  });

  const submissions = submissionsData?.items || [];
  const totalSubmissions = submissionsData?.total || 0;
  const totalPages = Math.ceil(totalSubmissions / ITEMS_PER_PAGE);

  // Filter submissions by search query (client-side for current page)
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery) return submissions;
    
    return submissions.filter((submission: any) => 
      submission.student?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.student?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [submissions, searchQuery]);

  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.GRADED:
        return 'bg-green-100 text-green-800';
      case SubmissionStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case SubmissionStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case SubmissionStatus.LATE:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusFilterChange = (status: SubmissionStatus | 'ALL') => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleUploadSubmission = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setUploadDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Submissions</h2>
          <p className="text-muted-foreground">
            {totalSubmissions} total submissions for {assessment.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Handle bulk upload workflow
              console.log('Bulk upload submissions');
              toast.info('Bulk upload feature coming soon');
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(['ALL', SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED, SubmissionStatus.LATE] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusFilterChange(status)}
                  >
                    {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Student Submissions ({filteredSubmissions.length} of {totalSubmissions})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="font-medium">
                            {submission.student?.user?.name || 'Unknown Student'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.student?.user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleDateString()
                            : 'Not submitted'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.score !== null
                            ? `${submission.score}/${assessment.maxScore || 100}`
                            : 'Not graded'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <SubmissionViewDialog
                              submission={submission}
                              assessment={assessment}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUploadSubmission(submission.id)}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalSubmissions)} of{' '}
                    {totalSubmissions} submissions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-muted-foreground">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No submissions found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No submissions match your current filters.'
                  : 'No students have submitted this assessment yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Submission Files</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedSubmissionId ? (
              <SubmissionFileUpload
                submissionId={selectedSubmissionId}
                maxFiles={10}
                maxFileSize={50}
                onFilesChange={(files) => {
                  console.log('Files changed:', files);
                  // Optionally refresh submissions data
                  refetch();
                }}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Please select a submission to upload files.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
